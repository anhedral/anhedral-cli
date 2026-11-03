import { constants, fstatSync, lstatSync, openSync, readSync, closeSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { commandArguments, commandArgumentError } from './cli-arguments.js';
import { createReporter, type OutputOptions } from './cli-output.js';
import {
  environmentImportSchema,
  environmentImportReceiptSchema,
  environmentMetadataSchema,
  environmentNameSchema,
  projectEnvironmentSchema,
} from './contracts/environment-transport.js';
import { inferredEnvironmentKind, parseEnvironmentFile } from './contracts/environment-file.js';
import { platformFailure, readPrivate, writePrivate } from './platform-state.js';

type Context = { origin: string; principalId: string; projectId: string; teamId: string };
type Request = (path: string, method: string, body?: unknown) => Promise<unknown>;
const planSchema = z
  .object({
    origin: z.string(),
    principalId: z.uuid(),
    projectId: z.uuid(),
    teamId: z.uuid(),
    environment: projectEnvironmentSchema,
    requestId: z.uuid(),
    variables: z
      .array(
        z
          .object({
            name: environmentNameSchema,
            kind: z.enum(['secret', 'config']),
            note: z.string(),
            expectedVersion: z.number().int().nonnegative(),
          })
          .strict(),
      )
      .max(128),
    receipt: environmentImportReceiptSchema.optional(),
  })
  .strict();

export function readEnvironmentSecret(file: string): Uint8Array {
  const path = resolve(file);
  for (let parent = dirname(path); ; parent = dirname(parent)) {
    const info = lstatSync(parent);
    if (!info.isDirectory() || info.isSymbolicLink())
      throw platformFailure('Environment input has a symlinked or invalid directory.');
    if (dirname(parent) === parent) break;
  }
  const descriptor = openSync(
    path,
    constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
  );
  try {
    const info = fstatSync(descriptor);
    if (
      !info.isFile() ||
      info.size > 65536 ||
      (process.platform !== 'win32' &&
        (info.uid !== process.getuid?.() || (info.mode & 0o077) !== 0))
    )
      throw platformFailure(
        'Environment input must be your regular owner-only file (mode 0600), at most 64 KiB.',
      );
    const data = Buffer.alloc(65537);
    let length = 0;
    while (length < data.length) {
      const read = readSync(descriptor, data, length, data.length - length, null);
      if (!read) break;
      length += read;
    }
    if (length > 65536) throw platformFailure('Environment input exceeds 64 KiB.');
    return data.subarray(0, length);
  } finally {
    closeSync(descriptor);
  }
}
async function stdinBytes(): Promise<Uint8Array> {
  if (process.stdin.isTTY)
    throw platformFailure(
      'Pipe a value or dotenv contents to --stdin; interactive secret entry is not supported.',
    );
  const chunks: Buffer[] = [];
  let length = 0;
  const timeout = setTimeout(
    () => process.stdin.destroy(new Error('Environment input timed out.')),
    30000,
  );
  try {
    for await (const item of process.stdin) {
      const bytes = Buffer.from(item);
      length += bytes.length;
      if (length > 65536) throw platformFailure('Environment input exceeds 64 KiB.');
      chunks.push(bytes);
    }
    return Buffer.concat(chunks);
  } finally {
    clearTimeout(timeout);
  }
}
export function validateEnvironmentArguments(args: string[]) {
  const options = commandArguments('env', args);
  const [operation, name] = options.positional;
  if (operation === 'list') {
    if (
      ['--file', '--stdin', '--type', '--replace', '--new', '--dry-run'].some((flag) =>
        options.has(flag),
      )
    )
      throw commandArgumentError('env', 'env list accepts only context and environment options.');
  } else {
    if (!options.value('--environment'))
      throw commandArgumentError(
        'env',
        'An explicit --environment staging|production is required.',
      );
    if (options.has('--file') === options.has('--stdin'))
      throw commandArgumentError(
        'env',
        'Choose exactly one --file <file> or --stdin. Values cannot be supplied in arguments.',
      );
    if (operation === 'set' && !environmentNameSchema.safeParse(name).success)
      throw commandArgumentError('env', 'Use an uppercase variable name.');
  }
  return options;
}

export async function runEnvironmentCommand(
  args: string[],
  output: OutputOptions,
  context?: Context,
  request?: Request,
  readInput = stdinBytes,
) {
  const options = validateEnvironmentArguments(args);
  const [operation, name] = options.positional;
  const reporter = createReporter(
    output,
    (value) => {
      const data = value as {
        status: string;
        environment?: string;
        variables?: { name: string; kind: string; version?: number }[];
        imported?: { name: string; version: number }[];
      };
      return (
        `${data.status} ${data.environment ?? ''}\n` +
        (data.variables ?? data.imported ?? [])
          .map((entry) => `${entry.name}${entry.version ? ` v${entry.version}` : ''}`)
          .join('\n')
      );
    },
    true,
  );
  const environment = options.value('--environment');
  if (environment && !projectEnvironmentSchema.safeParse(environment).success)
    throw commandArgumentError('env', 'Choose staging or production.');
  if (operation === 'list') {
    if (!context || !request)
      throw platformFailure('Link and sign in to the intended project first.');
    const metadata = environmentMetadataSchema.parse(
      await request(`/projects/${context.projectId}/environment`, 'GET'),
    );
    reporter.result({
      status: 'listed',
      projectId: context.projectId,
      environment: environment ?? 'all',
      variables: metadata.variables.filter(
        (entry) => !environment || entry.environment === environment,
      ),
    });
    return;
  }
  const explicitKind = options.value('--type');
  let entries: { name: string; value: string }[];
  try {
    const bytes = options.has('--file')
      ? readEnvironmentSecret(options.value('--file')!)
      : await readInput();
    if (bytes.length > 65536) throw new Error('Environment input exceeds 64 KiB.');
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    entries = operation === 'set' ? [{ name: name!, value: text }] : parseEnvironmentFile(text);
  } catch (error) {
    if (error instanceof Error && error.name === 'CliArgumentError') throw error;
    throw platformFailure(
      error instanceof Error && /^(Line \d+:|Environment (files|file|input))/.test(error.message)
        ? error.message
        : 'Could not read private UTF-8 environment input. No variables were uploaded.',
    );
  }
  const variables = entries
    .map((entry) => ({
      ...entry,
      kind: (explicitKind ?? inferredEnvironmentKind(entry.name)) as 'secret' | 'config',
      note: '',
      expectedVersion: 0,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
  if (
    !environmentImportSchema.safeParse({ requestId: randomUUID(), environment, variables }).success
  )
    throw platformFailure(
      'Check variable names, type and size. Empty values, reserved names and public-prefixed secrets are rejected. No variables were uploaded.',
    );
  if (options.has('--dry-run')) {
    reporter.result({
      status: 'dry_run',
      environment,
      projectId: context?.projectId ?? null,
      projectVerified: false,
      variables: variables.map(({ name, kind }) => ({ name, kind })),
      applied: false,
    });
    return;
  }
  if (!context || !request)
    throw platformFailure('Link and sign in to the intended project first.');
  const statePath = join(process.cwd(), '.anhedral', 'platform', `environment-${environment}.json`);
  const raw = await readPrivate(statePath);
  const parsed = raw === null ? null : planSchema.safeParse(raw);
  if (parsed && !parsed.success)
    throw platformFailure(
      'Saved environment import state is invalid. Preserve it and reconcile the selected context.',
    );
  const previous = parsed?.success ? parsed.data : null;
  if (
    previous &&
    (previous.origin !== context.origin ||
      previous.principalId !== context.principalId ||
      previous.projectId !== context.projectId ||
      previous.teamId !== context.teamId ||
      previous.environment !== environment)
  )
    throw platformFailure(
      'Saved environment import belongs to a different identity or project. Preserve it and select the original context.',
    );
  if (
    previous &&
    !options.has('--new') &&
    JSON.stringify(previous.variables.map(({ name, kind }) => ({ name, kind }))) !==
      JSON.stringify(variables.map(({ name, kind }) => ({ name, kind })))
  )
    throw platformFailure('Saved import names or types changed. Use --new for another import.');
  if (
    previous?.receipt &&
    (previous.receipt.requestId !== previous.requestId ||
      previous.receipt.imported.length !== previous.variables.length ||
      previous.receipt.imported.some(
        (entry, index) =>
          entry.name !== previous.variables[index]?.name ||
          entry.kind !== previous.variables[index]?.kind ||
          entry.environment !== previous.environment ||
          (previous.variables[index]!.expectedVersion > 0 &&
            entry.version !== previous.variables[index]!.expectedVersion + 1),
      ))
  )
    throw platformFailure(
      'Saved environment receipt differs from its import. Preserve state and reconcile before retrying.',
    );
  if (previous?.receipt && !options.has('--new')) {
    reporter.result({
      status: 'already_imported',
      projectId: context.projectId,
      environment,
      ...previous.receipt,
      nextAction:
        'Use --new to start another import. Existing values additionally require --replace.',
    });
    return;
  }
  let state: z.infer<typeof planSchema>;
  if (previous && !options.has('--new')) {
    if (
      JSON.stringify(previous.variables.map(({ name, kind }) => ({ name, kind }))) !==
      JSON.stringify(variables.map(({ name, kind }) => ({ name, kind })))
    )
      throw platformFailure(
        'Pending import names or types changed. Restore its original input or use --new.',
      );
    state = previous;
  } else {
    const metadata = environmentMetadataSchema.parse(
      await request(`/projects/${context.projectId}/environment`, 'GET'),
    );
    const existing = new Map(
      metadata.variables
        .filter((entry) => entry.environment === environment)
        .map((entry) => [entry.name, entry]),
    );
    if (!options.has('--replace') && variables.some((entry) => existing.has(entry.name)))
      throw platformFailure(
        'Some variables already exist. Review their names with env list, then explicitly use --replace.',
      );
    state = {
      ...context,
      environment: projectEnvironmentSchema.parse(environment),
      requestId: randomUUID(),
      variables: variables.map(({ name, kind, note }) => ({
        name,
        kind,
        note,
        expectedVersion: existing.get(name)?.version ?? 0,
      })),
    };
    // Persist only retry identity and versions. No value or value digest is saved.
    await writePrivate(statePath, state);
  }
  const input = environmentImportSchema.parse({
    requestId: state.requestId,
    environment,
    variables: variables.map((entry, index) => ({
      ...entry,
      expectedVersion: state.variables[index]!.expectedVersion,
    })),
  });
  const receipt = environmentImportReceiptSchema.parse(
    await request(`/projects/${context.projectId}/environment/import`, 'POST', input),
  );
  if (
    receipt.requestId !== state.requestId ||
    receipt.imported.length !== variables.length ||
    receipt.imported.some(
      (entry, index) =>
        entry.name !== variables[index]?.name ||
        entry.kind !== variables[index]?.kind ||
        entry.environment !== environment ||
        (state.variables[index]!.expectedVersion > 0 &&
          entry.version !== state.variables[index]!.expectedVersion + 1),
    )
  )
    throw platformFailure(
      'Environment receipt differs from this import. Preserve saved state before retrying.',
    );
  await writePrivate(statePath, { ...state, receipt });
  reporter.result({
    status: 'imported',
    projectId: context.projectId,
    environment,
    ...receipt,
    appliedToRunningDeployments: false,
  });
}
