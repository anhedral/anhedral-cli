import { runEnvironmentCommand } from './platform-environment.js';
import { constants } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { unlink } from 'node:fs/promises';
import { z } from 'zod';
import { CliArgumentError, commandArguments, commandArgumentError } from './cli-arguments.js';
import { CliFailure } from './cli-errors.js';
import { stripVTControlCharacters } from 'node:util';
import { createReporter, type OutputOptions } from './cli-output.js';
import {
  canonicalCliJson,
  cliPlanInputSchema,
  cliPlanSchema,
  cliPreparationSchema,
  cliDeviceSchema,
  cliLinkSchema,
  cliLoginSchema,
  SOURCE_LIMITS,
  sourceUploadInputSchema,
  sourceUploadReceiptSchema,
} from './contracts/cli-transport.js';
import { readSourceBounded } from './contracts/source-bundle.js';
import { packageSource } from './platform-source.js';
import {
  platformFailure as createPlatformFailure,
  platformOrigin,
  readPrivate,
  secretStore,
  writePrivate,
  type SecretStore,
  type PlatformFailureCategory,
} from './platform-state.js';
const credential = cliLoginSchema.extend({ origin: z.string() });
const pending = z
  .object({ origin: z.string(), device: cliDeviceSchema, expiresAt: z.number() })
  .strict();
const linkSchema = cliLinkSchema.extend({ origin: z.string() }).strict();
const uploadState = z
  .object({
    origin: z.string(),
    principalId: z.uuid(),
    input: sourceUploadInputSchema,
    uploadId: z.uuid().optional(),
  })
  .strict();
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
interface PlatformDependencies {
  store?: SecretStore;
  fetch?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

function visible(value: unknown): string {
  return stripVTControlCharacters(String(value ?? '')).replace(/[\x00-\x1f\x7f]/g, ' ');
}

function formatPlatformResult(command: string, result: unknown): string {
  const data = result as Record<string, unknown>;
  if (data.status === 'authorization_required')
    return `Approve CLI access at ${visible(data.verificationUrl)}\nConfirm code ${visible(data.userCode)}.\nNext: ${visible(data.nextAction)}`;
  if (data.status === 'authenticated')
    return `Signed in to ${visible(data.origin)}.\nExpires: ${visible(data.expiresAt)}.`;
  if (data.status === 'logged_out') return `Logged out of ${visible(data.origin)}.`;
  if (data.status === 'unlinked') return 'Removed the local project link.';
  if (command === 'whoami') {
    const context = data.context as
      | {
          credential?: { kind: string };
          project?: { name: string; projectId: string; teamId: string } | null;
        }
      | undefined;
    return [
      `Signed in as ${visible(data.name)} (${visible(data.principalId)}).`,
      `API origin: ${visible(data.origin)}.`,
      `Expires: ${visible(data.expiresAt)}.`,
      ...(context
        ? [
            `Credential store: ${visible(context.credential?.kind)}.`,
            context.project
              ? `Saved local project: ${visible(context.project.name)} (${visible(context.project.projectId)}), team ${visible(context.project.teamId)}. Project access has not been verified.`
              : 'No local project link is saved.',
          ]
        : []),
    ].join('\n');
  }
  if (command === 'link')
    return `Linked to ${visible(data.name)} (${visible(data.projectId)}).\nTeam: ${visible(data.teamId)}.`;
  if (data.status === 'dry_run')
    return `Source archive preview: ${visible(data.files)} files, ${visible(data.bytes)} source bytes, ${visible(data.archiveBytes)} archive bytes.\nNo source was uploaded. Review the included paths with --json.`;
  if (command === 'source')
    return `Source ${visible(data.state)} (${visible(data.id)}).\nSource revision: ${visible(data.sourceRevision ?? 'not sealed')}.\nUpload does not activate a runtime or deployment.`;
  if (command === 'deploy')
    return [
      data.state
        ? `Candidate ${visible(data.state)} (${visible(data.candidateId)}).`
        : `Deployment plan prepared (${visible(data.id)}).`,
      `Source revision: ${visible(data.sourceRevision)}.`,
      'Server policy controls runtime admission. No preview or deployment was activated.',
    ].join('\n');
  return 'Platform command completed.';
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
  const emit = (result: unknown) => reporter.result(result);
  if (
    ['login', 'logout', 'whoami', 'link', 'unlink'].includes(command) &&
    options.positional.length
  )
    throw commandArgumentError(command, 'Unexpected positional arguments.');
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
  const root = process.cwd(),
    stateDir = join(root, '.anhedral', 'platform'),
    linkPath = join(stateDir, 'project.json'),
    uploadPath = join(stateDir, 'upload.json');

  if (command === 'unlink') {
    await readPrivate(linkPath);
    await unlink(linkPath).catch((e) => {
      if (e.code !== 'ENOENT') throw e;
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
  const request = async (
    path: string,
    method: string,
    body?: unknown,
    token?: string,
    team?: string,
  ) => {
    let response: Response;
    try {
      response = await (dependencies.fetch ?? fetch)(`${origin}/api/cli/v1${path}`, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
          'x-anhedral-cli-protocol': '1',
          ...(body instanceof Uint8Array
            ? { 'content-type': 'application/octet-stream' }
            : { 'content-type': 'application/json' }),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(team ? { 'x-anhedral-team': team } : {}),
        },
        body:
          body === undefined
            ? undefined
            : body instanceof Uint8Array
              ? Uint8Array.from(body)
              : JSON.stringify(body),
      });
    } catch {
      throw platformFailure(
        'Platform request was interrupted. Retry the same command to resume.',
        'network',
        true,
        `Retry anhedral ${command} with the same API origin, working directory and options to resume.`,
      );
    }
    const data: unknown = await readSourceBounded(
      response.body,
      /\/projects\/[^/]+\/environment$/.test(path) ? 1024 * 1024 : 65536,
    )
      .then((b) => JSON.parse(new TextDecoder().decode(b)))
      .catch(() => {
        throw platformFailure('Platform returned an invalid response.', 'network');
      });
    if (!response.ok) {
      if (path === '/auth/token') {
        const error = z
          .object({
            error: z.enum([
              'authorization_pending',
              'slow_down',
              'access_denied',
              'expired_token',
              'invalid_grant',
            ]),
          })
          .safeParse(data);
        if (error.success) return error.data;
      }
      throw platformFailure(
        response.status === 401
          ? 'CLI login expired or was revoked. Run anhedral login.'
          : response.status === 409
            ? command === 'deploy'
              ? 'Deployment plan is stale or inputs conflict. Review deploy plan --new.'
              : 'Upload conflicts with saved source. Restore the original files or use source upload --new.'
            : response.status === 403
              ? 'Current project build access is unavailable.'
              : `Platform request failed (${response.status}).`,
        response.status === 401
          ? 'auth'
          : response.status === 403
            ? 'permission'
            : response.status === 409
              ? 'conflict'
              : 'network',
        response.status === 429 || response.status >= 500,
        response.status === 401
          ? 'Run anhedral login with the same API origin and credential store.'
          : `Run anhedral ${command} --help.`,
      );
    }
    return data;
  };
  if (command === 'login') {
    if (options.positional.length)
      throw commandArgumentError(command, 'Login does not accept positional arguments.');
    let state = pending.safeParse(await readCredential());
    if (
      !options.has('--resume') ||
      !state.success ||
      state.data.origin !== origin ||
      state.data.expiresAt <= Date.now()
    ) {
      const device = cliDeviceSchema.parse(await request('/auth/code', 'POST', {}));
      if (
        new URL(device.verification_uri_complete).origin !== origin ||
        new URL(device.verification_uri_complete).protocol !== new URL(origin).protocol
      )
        throw platformFailure('Platform returned an unexpected verification origin.');
      const saved = { origin, device, expiresAt: Date.now() + device.expires_in * 1000 };
      await store.write(saved);
      state = pending.safeParse(saved);
    }
    if (!state.success) throw platformFailure('Login state is unavailable. Start login again.');
    const saved = state.data;
    if (options.has('--start') || (!reporter.canPrompt && !options.has('--resume'))) {
      emit({
        status: 'authorization_required',
        verificationUrl: saved.device.verification_uri_complete,
        userCode: saved.device.user_code,
        expiresAt: new Date(saved.expiresAt).toISOString(),
        nextAction:
          'Approve in your browser, then run anhedral login --resume with the same API origin and credential store.',
      });
      return;
    }
    reporter.diagnostic(
      `Approve CLI access at ${saved.device.verification_uri_complete}\nConfirm code ${saved.device.user_code}.`,
    );
    let interval = saved.device.interval * 1000;
    while (Date.now() < saved.expiresAt) {
      await (dependencies.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms))))(interval);
      const result = await request('/auth/token', 'POST', {
        device_code: saved.device.device_code,
      });
      const grant = cliLoginSchema.safeParse(result);
      if (grant.success) {
        await store.write({ ...grant.data, origin });
        emit({ status: 'authenticated', origin, expiresAt: grant.data.expiresAt });
        return;
      }
      const error = (result as { error: string }).error;
      if (error === 'slow_down') interval += 5000;
      else if (error !== 'authorization_pending') {
        await store.clear();
        throw platformFailure('Device approval was denied or expired. Start login again.');
      }
    }
    await store.clear();
    throw platformFailure('Device approval expired. Start login again.');
  }
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
    await store.clear();
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

  if (command === 'link') {
    const input = z
      .object({ projectId: z.uuid(), teamId: z.uuid() })
      .parse({ projectId: options.value('--project'), teamId: options.value('--team') });
    if (options.positional.length) throw commandArgumentError(command, 'Use --project and --team.');
    const link = cliLinkSchema.parse(await request('/link', 'POST', input, token, input.teamId));
    if (
      link.principalId !== actor.principalId ||
      link.projectId !== input.projectId ||
      link.teamId !== input.teamId
    )
      throw platformFailure('Project link identity differs.');
    await writePrivate(linkPath, { ...link, origin });
    emit({ ...link, origin });
    return;
  }
  if (command === 'env') {
    const link = linkSchema.parse(await readPrivate(linkPath));
    if (link.origin !== origin || link.principalId !== actor.principalId)
      throw platformFailure('Link this project to the selected API origin and signed-in identity.');
    return runEnvironmentCommand(
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
  if (command === 'deploy') {
    const localPath = join(stateDir, 'deployment.json');
    const stateSchema = z
      .object({
        origin: z.string(),
        principalId: z.uuid(),
        projectId: z.uuid(),
        planInput: cliPlanInputSchema,
        plan: cliPlanSchema.optional(),
        prepareRequestId: z.uuid().optional(),
        candidateId: z.uuid().optional(),
      })
      .strict();
    const stored = stateSchema.safeParse(await readPrivate(localPath));
    const state =
      stored.success &&
      stored.data.origin === origin &&
      stored.data.principalId === actor.principalId &&
      stored.data.projectId === link.projectId
        ? stored.data
        : null;
    const persist = (v: z.infer<typeof stateSchema>) => writePrivate(localPath, v);
    const checkedPlan = (
      plan: z.infer<typeof cliPlanSchema>,
      input: z.infer<typeof cliPlanInputSchema>,
    ) => {
      const { digest, ...unsigned } = plan;
      if (
        hash(new TextEncoder().encode(canonicalCliJson(unsigned))) !== digest ||
        plan.projectId !== link.projectId ||
        plan.uploadId !== input.uploadId ||
        plan.requestId !== input.requestId ||
        canonicalCliJson(plan.manifest) !== canonicalCliJson(input.manifest)
      )
        throw platformFailure('Deployment plan identity or integrity differs.');
      return plan;
    };
    if (state?.plan) checkedPlan(state.plan, state.planInput);

    if (options.positional[0] === 'plan') {
      const upload = uploadState.parse(await readPrivate(uploadPath));
      if (
        upload.origin !== origin ||
        upload.principalId !== actor.principalId ||
        upload.input.projectId !== link.projectId ||
        !upload.uploadId
      )
        throw platformFailure('Choose a sealed upload for this linked identity.');
      const receipt = sourceUploadReceiptSchema.parse(
        await request(`/uploads/${upload.uploadId}`, 'GET', undefined, token, link.teamId),
      );
      if (
        receipt.state !== 'sealed' ||
        receipt.sourceRevision !== upload.input.archiveDigest ||
        receipt.projectId !== link.projectId
      )
        throw platformFailure('The saved source upload is not sealed.');
      const file = options.value('--manifest');
      if (!file) throw commandArgumentError(command, 'Use deploy plan --manifest <file>.');
      const handle = await import('node:fs/promises').then((fs) =>
        fs.open(resolve(file), constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK),
      );
      let manifest: unknown;
      try {
        const info = await handle.stat();
        if (!info.isFile() || info.size > 32768)
          throw platformFailure('Deployment manifest exceeds its limit.');
        try {
          manifest = JSON.parse(await handle.readFile('utf8'));
        } catch {
          throw commandArgumentError(
            command,
            'The deployment manifest is not valid JSON. Review it before retrying.',
          );
        }
      } finally {
        await handle.close();
      }
      const compared = cliPlanInputSchema.parse({
        protocol: 1,
        requestId: state && !options.has('--new') ? state.planInput.requestId : randomUUID(),
        uploadId: upload.uploadId,
        manifest,
      });
      if (
        state &&
        !options.has('--new') &&
        canonicalCliJson(state.planInput) !== canonicalCliJson(compared)
      )
        throw platformFailure(
          'Plan inputs changed. Use deploy plan --new to create a new request.',
        );
      const local = {
        origin,
        principalId: actor.principalId,
        projectId: link.projectId,
        planInput: compared,
      };
      // Persist before POST so lost plan responses can be recovered by the same request identity.
      await persist({
        ...local,
        ...(state?.prepareRequestId && !options.has('--new')
          ? { prepareRequestId: state.prepareRequestId, candidateId: state.candidateId }
          : {}),
      });
      const plan = cliPlanSchema.parse(
        await request('/plans', 'POST', compared, token, link.teamId),
      );
      const { digest, ...unsigned } = plan;
      if (
        hash(new TextEncoder().encode(canonicalCliJson(unsigned))) !== digest ||
        plan.projectId !== link.projectId ||
        plan.uploadId !== compared.uploadId ||
        plan.requestId !== compared.requestId ||
        canonicalCliJson(plan.manifest) !== canonicalCliJson(compared.manifest) ||
        plan.sourceRevision !== receipt.sourceRevision
      )
        throw platformFailure('Deployment plan identity or integrity differs.');
      await persist({
        ...local,
        plan,
        ...(state?.prepareRequestId && !options.has('--new')
          ? { prepareRequestId: state.prepareRequestId, candidateId: state.candidateId }
          : {}),
      });
      emit(plan);
      return;
    }
    if (!state?.plan)
      throw platformFailure('Create a deployment plan for this linked identity first.');
    if (options.positional[0] === 'status') {
      if (state.candidateId) {
        const result = cliPreparationSchema.parse(
          await request(`/candidates/${state.candidateId}`, 'GET', undefined, token, link.teamId),
        );
        if (
          result.planId !== state.plan.id ||
          result.planDigest !== state.plan.digest ||
          result.candidateId !== state.candidateId ||
          result.sourceRevision !== state.plan.sourceRevision
        )
          throw platformFailure('Candidate receipt identity differs.');
        emit(result);
      } else {
        const plan = checkedPlan(
          cliPlanSchema.parse(
            await request(`/plans/${state.plan.id}`, 'GET', undefined, token, link.teamId),
          ),
          state.planInput,
        );
        if (plan.digest !== state.plan.digest || plan.id !== state.plan.id)
          throw platformFailure('Plan receipt identity differs.');
        emit(plan);
      }
      return;
    }
    const requestId = state.prepareRequestId ?? randomUUID();
    await persist({ ...state, prepareRequestId: requestId });
    const prepared = cliPreparationSchema.parse(
      await request(
        '/candidates',
        'POST',
        { protocol: 1, requestId, planId: state.plan.id, planDigest: state.plan.digest },
        token,
        link.teamId,
      ),
    );
    if (
      prepared.planId !== state.plan.id ||
      prepared.planDigest !== state.plan.digest ||
      prepared.sourceRevision !== state.plan.sourceRevision
    )
      throw platformFailure('Candidate receipt identity differs.');
    await persist({ ...state, prepareRequestId: requestId, candidateId: prepared.candidateId });
    emit(prepared);
    return;
  }
  const state = uploadState.safeParse(await readPrivate(uploadPath));
  const checkedState =
    state.success &&
    state.data.origin === origin &&
    state.data.principalId === actor.principalId &&
    state.data.input.projectId === link.projectId &&
    state.data.input.teamId === link.teamId
      ? state.data
      : null;
  if (options.positional[0] === 'status') {
    if (!checkedState?.uploadId)
      throw platformFailure('No resumable upload is saved for this project.');
    emit(
      sourceUploadReceiptSchema.parse(
        await request(`/uploads/${checkedState.uploadId}`, 'GET', undefined, token, link.teamId),
      ),
    );
    return;
  }
  const source = await packageSource(root),
    archiveDigest = hash(source.archive);

  if (checkedState && checkedState.input.archiveDigest !== archiveDigest && !options.has('--new'))
    throw platformFailure(
      'Source changed since the saved upload. Restore those files or explicitly use source upload --new.',
    );
  const chunks = Array.from(
    { length: Math.ceil(source.archive.length / SOURCE_LIMITS.chunkBytes) },
    (_, i) =>
      source.archive.subarray(i * SOURCE_LIMITS.chunkBytes, (i + 1) * SOURCE_LIMITS.chunkBytes),
  );
  const input = sourceUploadInputSchema.parse({
    protocol: 1,
    requestId: checkedState && !options.has('--new') ? checkedState.input.requestId : randomUUID(),
    projectId: link.projectId,
    teamId: link.teamId,
    archiveDigest,
    archiveBytes: source.archive.length,
    inventoryDigest: source.inventoryDigest,
    cliVersion: source.cliVersion,
    chunks: chunks.map(hash),
  });
  // Persist the request identity before the first network mutation, including lost responses.
  const local = { origin, principalId: actor.principalId, input };
  await writePrivate(uploadPath, local);
  const receipt = sourceUploadReceiptSchema.parse(
    await request('/uploads', 'POST', input, token, link.teamId),
  );
  if (
    receipt.projectId !== link.projectId ||
    receipt.requestId !== input.requestId ||
    receipt.archiveDigest !== input.archiveDigest ||
    receipt.inventoryDigest !== input.inventoryDigest
  )
    throw platformFailure('Upload receipt identity differs.');
  await writePrivate(uploadPath, { ...local, uploadId: receipt.id });
  if (receipt.state === 'cancelled')
    throw platformFailure('Upload was cancelled. Start source upload --new.');
  if (receipt.state !== 'sealed') {
    for (let i = 0; i < chunks.length; i++)
      if (!receipt.received.includes(i))
        await request(`/uploads/${receipt.id}/chunks/${i}`, 'PUT', chunks[i], token, link.teamId);
  }
  const complete = sourceUploadReceiptSchema.parse(
    await request(`/uploads/${receipt.id}/complete`, 'POST', {}, token, link.teamId),
  );
  if (
    complete.id !== receipt.id ||
    complete.sourceRevision !== archiveDigest ||
    complete.state !== 'sealed'
  )
    throw platformFailure('Source completion was not sealed. Resume this upload.');
  emit({ ...complete, hostedAdmission: false });
}
