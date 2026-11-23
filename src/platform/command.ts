import { homedir } from 'node:os';
import { createHash } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { CliArgumentError, commandArgumentError, commandArguments } from '../cli-arguments.js';
import { CliFailure } from '../cli-errors.js';
import { createReporter, type OutputOptions } from '../cli-output.js';
import { cliLinkSchema, cliLoginSchema } from '../contracts/cli-transport.js';
import { runLogin } from './auth.js';
import { runDeploy } from './deploy.js';
import { stdinBytes, runEnvironmentCommand, validateEnvironmentArguments } from './environment.js';
import { createPlatformRequest } from './http.js';
import {
  runLogsCommand,
  runStagingCommand,
  validateLogsArguments,
  validateStagingArguments,
} from './operations.js';
import { formatPlatformResult } from './output.js';
import { runProductionCommand, validateProductionArguments } from './production.js';
import { runProjects, validateProjects } from './projects.js';
import { packageSource } from './source.js';
import { linkSchema } from './state-schema.js';
import {
  platformFailure as createPlatformFailure,
  platformOrigin,
  readPrivate,
  secretStore,
  withProjectLock,
  writePrivate,
  type PlatformFailureCategory,
  type SecretStore,
} from './state.js';
import { runSourceUpload } from './upload.js';
const credential = cliLoginSchema.extend({ origin: z.string() });
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
interface PlatformDependencies {
  userDirectory?: string;
  store?: SecretStore;
  fetch?: typeof fetch;
  readInput?: () => Promise<Uint8Array>;
  sleep?: (ms: number) => Promise<void>;
}

export async function runPlatformCommand(
  command: string,
  args: string[],
  output: OutputOptions,
  dependencies: PlatformDependencies = {},
): Promise<void> {
  try {
    await runPlatformOperation(command, args, output, dependencies);
  } catch (error) {
    if (error instanceof CliArgumentError || error instanceof CliFailure) throw error;
    if (error instanceof z.ZodError)
      throw createPlatformFailure(
        'Platform data or saved context does not match the supported protocol. Preserve saved state and verify the selected context before retrying.',
        `Run anhedral ${command} --help.`,
        'context',
      );
    if (error instanceof SyntaxError)
      throw createPlatformFailure(
        'Selected local Platform input is not valid JSON. Preserve saved state and review the selected input before retrying.',
        `Run anhedral ${command} --help.`,
        'context',
      );
    if (
      ['ENOENT', 'ENOTDIR', 'EISDIR', 'EACCES', 'EPERM'].includes(
        (error as NodeJS.ErrnoException)?.code ?? '',
      )
    )
      throw createPlatformFailure(
        'A required local Platform file is missing or inaccessible. Review the selected working directory, manifest and credential store.',
        `Run anhedral ${command} --help.`,
        'context',
      );
    throw error;
  }
}

async function runPlatformOperation(
  command: string,
  args: string[],
  output: OutputOptions,
  dependencies: PlatformDependencies,
) {
  const reporter = createReporter(output, (result) => formatPlatformResult(command, result), true);
  const platformFailure = (
    message: string,
    category: PlatformFailureCategory = 'context',
    retryable = false,
    nextAction = `Run anhedral ${command} --help.`,
  ) => createPlatformFailure(message, nextAction, category, retryable);
  const options = commandArguments(command, args),
    origin = platformOrigin(options.value('--api-url'));
  if (command === 'env') validateEnvironmentArguments(args);
  if (command === 'staging') validateStagingArguments(args);
  if (command === 'production') validateProductionArguments(args);
  if (command === 'logs') validateLogsArguments(args);
  const emit = (result: unknown) => reporter.result(result);
  if (
    ['login', 'logout', 'whoami', 'link', 'unlink'].includes(command) &&
    options.positional.length
  )
    throw commandArgumentError(command, 'Unexpected positional arguments.');
  if (
    command === 'reports' &&
    (options.has('--workspace') || options.has('--workspace-actions')) &&
    options.positional[0] !== 'connect'
  )
    throw commandArgumentError(command, 'Use workspace permission options with reports connect.');
  if (command === 'login' && options.has('--start') && options.has('--resume'))
    throw commandArgumentError(command, 'Choose --start or --resume.');
  if (
    command === 'source' &&
    (options.positional.length !== 1 || !['upload', 'status'].includes(options.positional[0]))
  )
    throw commandArgumentError(command, 'Use source upload or source status.');
  if (
    command === 'deploy' &&
    (options.positional.length !== 1 ||
      !['plan', 'prepare', 'status'].includes(options.positional[0]))
  )
    throw commandArgumentError(command, 'Use deploy plan, deploy prepare or deploy status.');
  if (
    command === 'deploy' &&
    options.positional[0] !== 'plan' &&
    (options.has('--manifest') || options.has('--new'))
  )
    throw commandArgumentError(command, 'Manifest and --new options apply to deploy plan only.');
  if (
    command === 'link' &&
    (!z.uuid().safeParse(options.value('--project')).success ||
      !z.uuid().safeParse(options.value('--team')).success)
  )
    throw commandArgumentError(
      command,
      'Supply existing project and team UUIDs with --project and --team.',
    );
  if (command === 'messages') {
    const [action] = options.positional;
    const allowed =
      action === 'post'
        ? ['--channel', '--thread', '--request-id']
        : action === 'read'
          ? ['--channel', '--thread', '--before']
          : [];
    if (
      !['list', 'read', 'post'].includes(action ?? '') ||
      ['--channel', '--thread', '--before', '--request-id'].some(
        (flag) => options.has(flag) && !allowed.includes(flag),
      )
    )
      throw commandArgumentError(
        command,
        'Choose list, read or post and use options for that operation.',
      );
    const required =
      action === 'post' ? ['--channel', '--request-id'] : action === 'read' ? ['--channel'] : [];
    for (const flag of [
      ...required,
      ...['--thread', '--before'].filter((flag) => options.has(flag)),
    ])
      if (!z.uuid().safeParse(options.value(flag)).success)
        throw commandArgumentError(command, 'Supply a UUID for ' + flag + '.');
  }
  const projectInput = command === 'projects' ? validateProjects(options) : undefined;
  if (command === 'projects' && projectInput && options.has('--dry-run')) {
    emit({
      status: 'dry_run',
      ...projectInput,
      teamId: options.value('--team') ?? null,
      link: options.has('--link'),
      initialization: 'source-upload',
    });
    return;
  }
  const root = process.cwd(),
    stateDir = join(root, '.anhedral', 'platform'),
    linkPath = join(stateDir, 'project.json'),
    uploadPath = join(stateDir, 'upload.json');

  if (command === 'unlink') {
    if ((await readPrivate(linkPath)) === null) {
      emit({ status: 'unlinked' });
      return;
    }
    await withProjectLock(stateDir, async () => {
      await readPrivate(linkPath);
      await unlink(linkPath).catch((e) => {
        if (e.code !== 'ENOENT') throw e;
      });
    });
    emit({ status: 'unlinked' });
    return;
  }
  if (command === 'env' && options.has('--dry-run')) return runEnvironmentCommand(args, output);
  if (command === 'source' && options.has('--dry-run')) {
    if (options.positional[0] !== 'upload')
      throw commandArgumentError(command, 'Use source upload --dry-run.');
    const source = await packageSource(root),
      archiveDigest = hash(source.archive);

    emit({
      status: 'dry_run',
      archiveDigest,
      inventoryDigest: source.inventoryDigest,
      files: source.files,
      includedPaths: source.paths,
      bytes: source.bytes,
      archiveBytes: source.archive.length,
    });
    return;
  }
  const store =
    dependencies.store ??
    secretStore(
      origin,
      options.value('--credential-file') ? resolve(options.value('--credential-file')!) : undefined,
    );
  const readCredential = async () => {
    try {
      return await store.read();
    } catch (error) {
      if (error instanceof SyntaxError)
        throw platformFailure(
          'Saved credential data is not valid JSON. Preserve it and reconcile the selected credential store.',
          'auth',
          false,
          'Run anhedral login --help.',
        );
      throw error;
    }
  };
  const request = createPlatformRequest({
    command,
    operation: options.positional[0],
    origin,
    fetch: dependencies.fetch,
  });
  if (command === 'login')
    return runLogin({
      options,
      origin,
      reporter,
      store,
      readCredential,
      request,
      sleep: dependencies.sleep,
    });
  const saved = credential.safeParse(await readCredential());
  if (!saved.success || saved.data.origin !== origin)
    throw platformFailure(
      'Log in to the selected API origin first.',
      'auth',
      false,
      'Run anhedral login with the same API origin and credential store.',
    );
  const token = saved.data.token;
  if (command === 'logout') {
    await request('/auth/logout', 'POST', {}, token);
    try {
      await store.clear();
    } catch {
      throw platformFailure(
        'Platform access was revoked, but the saved local credential could not be removed.',
        'context',
        false,
        'Remove the saved credential from the selected credential store before signing in again.',
      );
    }
    emit({ status: 'logged_out', origin });
    return;
  }
  const actor = z
    .object({
      protocol: z.literal(1),
      principalId: z.uuid(),
      name: z.string(),
      teamId: z.uuid().nullable(),
    })
    .parse(await request('/actor', 'GET', undefined, token));
  if (command === 'whoami') {
    const identity = { ...actor, origin, expiresAt: saved.data.expiresAt };
    if (!options.has('--context')) {
      emit(identity);
      return;
    }
    const savedLink = await readPrivate(linkPath);
    const localLink = savedLink === null ? null : linkSchema.safeParse(savedLink);
    if (
      localLink &&
      (!localLink.success ||
        localLink.data.origin !== origin ||
        localLink.data.principalId !== actor.principalId)
    )
      throw platformFailure(
        'The saved project link does not match the selected API origin and signed-in identity. Preserve it and explicitly link the intended project.',
        'context',
        false,
        'Run anhedral link --help.',
      );
    const file = options.value('--credential-file');
    emit({
      ...identity,
      context: {
        apiOrigin: { value: origin, source: options.has('--api-url') ? 'flag' : 'default' },
        identityVerification: 'live-platform',
        credential: {
          source: file ? 'flag' : dependencies.store ? 'injected' : 'os-secret-store',
          kind: file
            ? 'owner-only-file'
            : dependencies.store
              ? 'injected'
              : process.platform === 'darwin'
                ? 'macos-keychain'
                : process.platform === 'linux'
                  ? 'linux-secret-service'
                  : 'unsupported',
        },
        project:
          localLink && localLink.success
            ? {
                projectId: localLink.data.projectId,
                teamId: localLink.data.teamId,
                name: localLink.data.name,
                source: '.anhedral/platform/project.json',
                verification: 'saved-local-link',
                access: 'not-verified',
              }
            : null,
      },
    });
    return;
  }

  if (command === 'projects')
    return runProjects({
      options,
      origin,
      actor,
      token,
      stateDir,
      linkPath,
      request,
      emit,
      platformFailure,
      projectInput,
    });
  if (command === 'link') {
    await withProjectLock(stateDir, async () => {
      const input = z
        .object({ projectId: z.uuid(), teamId: z.uuid() })
        .parse({ projectId: options.value('--project'), teamId: options.value('--team') });
      if (options.positional.length)
        throw commandArgumentError(command, 'Use --project and --team.');
      const link = cliLinkSchema.parse(await request('/link', 'POST', input, token, input.teamId));
      if (
        link.principalId !== actor.principalId ||
        link.projectId !== input.projectId ||
        link.teamId !== input.teamId
      )
        throw platformFailure('Project link identity differs.');
      await writePrivate(linkPath, { ...link, origin });
      emit({ ...link, origin });
    });
    return;
  }
  if (command === 'reports' || command === 'workspace') {
    const link = linkSchema.parse(await readPrivate(linkPath));
    if (link.origin !== origin || link.principalId !== actor.principalId)
      throw platformFailure('Link this project to the selected identity and API origin.');
    if (
      process.env.ANHEDRAL_REPORT_CONTEXT &&
      process.env.ANHEDRAL_REPORT_CONTEXT !==
        JSON.stringify([origin, actor.principalId, link.teamId, link.projectId])
    )
      throw platformFailure('Authenticated handoff context changed.');
    if (command === 'workspace') {
      const base = '/projects/' + link.projectId + '/workspace/tools';
      if (options.positional[0] === 'tools')
        emit(await request(base, 'GET', undefined, token, link.teamId));
      else {
        const name = options.positional[1];
        if (!/^[a-z_]{1,64}$/.test(name))
          throw commandArgumentError(command, 'Choose a tool listed by workspace tools.');
        const data = dependencies.readInput
          ? await dependencies.readInput()
          : await stdinBytes(1048576);
        let input: unknown;
        try {
          input = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(data));
        } catch {
          throw commandArgumentError(command, 'Supply tool arguments as a JSON object on stdin.');
        }
        emit(await request(base + '/' + name, 'POST', input, token, link.teamId));
      }
      return;
    }
    const base = '/projects/' + link.projectId + '/reports';
    const [action] = options.positional;
    if (action === 'brief') emit(await request(base, 'GET', undefined, token, link.teamId));
    else if (action === 'connect') {
      const credential = z
        .object({ token: z.string().regex(/^amcp_[a-f0-9]{64}$/), expiresAt: z.string() })
        .parse(
          await request(
            base + '/connect',
            'POST',
            options.has('--workspace-actions')
              ? { workspace: true, actions: true }
              : options.has('--workspace')
                ? { workspace: true }
                : {},
            token,
            link.teamId,
          ),
        );
      const credentialPath = join(
        dependencies.userDirectory ?? homedir(),
        '.anhedral',
        'mcp',
        createHash('sha256')
          .update(
            JSON.stringify(
              options.has('--workspace-actions')
                ? [origin, actor.principalId, link.projectId, 'workspace-actions']
                : options.has('--workspace')
                  ? [origin, actor.principalId, link.projectId, 'workspace']
                  : [origin, actor.principalId, link.projectId],
            ),
          )
          .digest('hex') + '.json',
      );
      const url = origin + '/api/cli/v1/projects/' + link.projectId + '/mcp';
      await writePrivate(credentialPath, {
        url,
        principalId: actor.principalId,
        teamId: link.teamId,
        ...credential,
      });
      emit({ url, credentialPath, expiresAt: credential.expiresAt });
    } else if (action === 'dispatch')
      emit(await request(base + '/dispatch', 'POST', {}, token, link.teamId));
    else if (action === 'submit') {
      const input: unknown = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(
          await (dependencies.readInput ?? stdinBytes)(),
        ),
      );
      emit(await request(base, 'POST', input, token, link.teamId));
    } else throw commandArgumentError(command, 'Choose brief, submit or dispatch.');
    return;
  }
  if (command === 'messages') {
    const link = linkSchema.parse(await readPrivate(linkPath));
    if (link.origin !== origin || link.principalId !== actor.principalId)
      throw platformFailure('Link this project to the selected API origin and signed-in identity.');
    const base = '/projects/' + link.projectId + '/messages';
    const channel = options.value('--channel');
    const thread = options.value('--thread');
    if (options.positional[0] === 'list') {
      emit(
        z
          .object({ channels: z.array(z.object({ id: z.uuid(), name: z.string() })) })
          .parse(await request(base, 'GET', undefined, token, link.teamId)),
      );
    } else if (options.positional[0] === 'read') {
      const query = new URLSearchParams();
      if (thread) query.set('thread', thread);
      if (options.has('--before')) query.set('before', options.value('--before')!);
      emit(
        z
          .object({
            messages: z.array(
              z.object({
                id: z.uuid(),
                authorName: z.string(),
                body: z.string(),
                parentId: z.uuid().nullable(),
              }),
            ),
            before: z.uuid().nullable(),
          })
          .parse(
            await request(base + '/' + channel + '?' + query, 'GET', undefined, token, link.teamId),
          ),
      );
    } else {
      const body = new TextDecoder('utf-8', { fatal: true })
        .decode(await (dependencies.readInput ?? stdinBytes)())
        .trim();
      if (!body || body.length > 10000)
        throw commandArgumentError(command, 'Supply 1–10000 characters on stdin.');
      emit(
        z
          .object({ id: z.uuid() })
          .parse(
            await request(
              base + '/' + channel,
              'POST',
              { body, requestId: options.value('--request-id'), parentId: thread },
              token,
              link.teamId,
            ),
          ),
      );
    }
    return;
  }
  if (['env', 'staging', 'production', 'logs'].includes(command)) {
    const link = linkSchema.parse(await readPrivate(linkPath));
    if (link.origin !== origin || link.principalId !== actor.principalId)
      throw platformFailure('Link this project to the selected API origin and signed-in identity.');
    const operation =
      command === 'env'
        ? runEnvironmentCommand
        : command === 'staging'
          ? runStagingCommand
          : command === 'production'
            ? runProductionCommand
            : runLogsCommand;
    return operation(
      args,
      output,
      { origin, principalId: actor.principalId, projectId: link.projectId, teamId: link.teamId },
      (path, method, body) => request(path, method, body, token, link.teamId),
    );
  }
  if (
    !['source', 'deploy'].includes(command) ||
    options.positional.length !== 1 ||
    !(command === 'deploy' ? ['plan', 'prepare', 'status'] : ['upload', 'status']).includes(
      options.positional[0],
    )
  )
    throw commandArgumentError(command, 'Use source upload/status or deploy plan/prepare/status.');
  const link = linkSchema.parse(await readPrivate(linkPath));
  if (link.origin !== origin || link.principalId !== actor.principalId)
    throw platformFailure('Link this project to the selected API origin and signed-in identity.');
  const sourceOperation = {
    options,
    origin,
    actor,
    token,
    stateDir,
    linkPath,
    link,
    uploadPath,
    root,
    request,
    emit,
    platformFailure,
  };
  if (command === 'deploy') return runDeploy(sourceOperation);
  return runSourceUpload(sourceOperation);
}
