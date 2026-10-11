import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { writeManagementOverview } from './management.js';
import { reconcileAccess, validatePrivateAudience } from './access.js';
import { inspectApplicationResources } from './provision.js';
import { cloudflareRequest, type CloudflareRequest } from './cloudflare.js';

import {
  atomicJson,
  authenticate,
  defaultRunner,
  environment,
  readApplication,
  readConfig,
  targetDirectory,
  withApplicationLock,
  type ApplicationProject,
} from './project-state.js';
export {
  registerApplication,
  readApplication,
  defaultRunner,
  environment,
  targetDirectory,
} from './project-state.js';
export type { ApplicationProject, DeploymentTarget, DeliveryRunner } from './project-state.js';
import type { DeploymentTarget } from './project-state.js';

interface TargetRelease {
  target: string;
  versionId: string;
  urls: string[];
  providerConfirmed: boolean;
}
interface Release {
  id: string;
  commit: string;
  startedAt: string;
  finishedAt?: string;
  state: 'running' | 'checked' | 'deployed' | 'failed';
  targets: TargetRelease[];
  failure?: string;
  operation?: 'ship' | 'rollback';
  restoredReleaseId?: string;
  verification?: { state: 'passed' | 'failed'; checkedAt: string; command: 'pnpm run test:live' };
}
interface ReleaseHistory {
  schemaVersion: 1;
  projectId: string;
  releases: Release[];
}
const manifestName = 'anhedral.project.json';
const stateDirectory = '.anhedral';
const accountPattern = /^[a-f0-9]{32}$/i;

export async function connectApplication(
  root: string,
  accountId: string | undefined,
  audience: 'public' | 'private' | undefined,
  run = defaultRunner,
  emails: string[] = [],
): Promise<ApplicationProject> {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const project = readApplication(root);
    if (!project.targets.length)
      throw new Error('This project has no Cloudflare deployment targets.');
    accountId ??= project.accountId ?? process.env.CLOUDFLARE_ACCOUNT_ID;
    if (!accountId) {
      const identity = JSON.parse(
        await run(
          'pnpm',
          ['exec', 'wrangler', 'whoami', '--json'],
          targetDirectory(root, project.targets[0]),
          { ...process.env, CI: 'true', NO_COLOR: '1', FORCE_COLOR: '0' },
        ),
      );
      if (identity.loggedIn !== true || !Array.isArray(identity.accounts))
        throw new Error('Run wrangler login or configure scoped credentials before connecting.');
      const accounts = [
        ...new Set<string>(
          identity.accounts
            .map((item: { id?: unknown }) => item?.id)
            .filter(
              (id: unknown): id is string => typeof id === 'string' && accountPattern.test(id),
            ),
        ),
      ];
      if (accounts.length !== 1)
        throw new Error(
          'Select the intended customer account with --account <id>; automatic selection requires exactly one accessible account.',
        );
      accountId = accounts[0];
    }
    if (!accountPattern.test(accountId))
      throw new Error('Cloudflare account ID must be 32 hexadecimal characters.');
    if (project.accountId && project.accountId !== accountId)
      throw new Error(
        'This project already belongs to another account; register a separate environment instead.',
      );
    if (project.audience !== 'unconfigured' && audience && project.audience !== audience)
      throw new Error(
        'Changing an existing audience requires a deliberate provider policy migration; connect will not remove protections.',
      );
    const connected = {
      ...project,
      accountId,
      audience: audience ?? project.audience,
      ...((audience ?? project.audience) === 'private'
        ? {
            access: {
              emails: emails.length
                ? [...new Set(emails.map((email) => email.toLowerCase()))].sort()
                : (project.access?.emails ?? []),
            },
          }
        : {}),
    };
    if (connected.audience === 'private') validatePrivateAudience(connected, root);
    else if (emails.length) throw new Error('--allow-email applies only to private delivery.');
    await authenticate(root, connected, run);
    atomicJson(path.join(root, manifestName), connected);
    return connected;
  });
}
function history(root: string, project: ApplicationProject): ReleaseHistory {
  const file = path.join(root, stateDirectory, 'releases.json');
  if (!existsSync(file)) return { schemaVersion: 1, projectId: project.id, releases: [] };
  const value = JSON.parse(readFileSync(file, 'utf8')) as ReleaseHistory;
  if (value.schemaVersion !== 1 || value.projectId !== project.id || !Array.isArray(value.releases))
    throw new Error('Release history belongs to a different or unsupported project.');
  return value;
}
function checkTargets(root: string, project: ApplicationProject): void {
  if (!project.targets.length)
    throw new Error(
      'No Cloudflare targets; native applications require their platform delivery tools.',
    );
  for (const target of project.targets) {
    const directory = targetDirectory(root, target);
    const config = readConfig(directory);
    if (
      config.name !== target.workerName ||
      (config.env && Object.keys(config.env as object).length)
    )
      throw new Error(
        'Worker name or environment changed; reconcile the application manifest before shipping.',
      );
    if (config.account_id && config.account_id !== project.accountId)
      throw new Error('Wrangler configuration account conflicts with the registered account.');
    if (
      /REPLACE_WITH_|YOUR_[A-Z_]+/.test(
        readFileSync(path.join(directory, 'wrangler.jsonc'), 'utf8'),
      )
    )
      throw new Error('Configure selected resources before shipping; placeholder bindings remain.');
    const pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (typeof pkg.scripts?.deploy !== 'string')
      throw new Error('Deployment target has no deploy script.');
  }
}
function configurationFingerprint(root: string, project: ApplicationProject): string {
  const hash = createHash('sha256').update(JSON.stringify(project));
  for (const target of project.targets)
    hash.update(readFileSync(path.join(targetDirectory(root, target), 'wrangler.jsonc')));
  return hash.digest('hex');
}
export function planDelivery(root: string) {
  const project = readApplication(root);
  checkTargets(root, project);
  return {
    project,
    checks: [['pnpm', 'run', 'check']],
    deployments: project.targets.map((target) => ({
      target: target.id,
      directory: target.directory,
      command: ['pnpm', 'run', 'deploy'],
    })),
    resourcesProvisioned: false,
    audience: project.audience,
  };
}
export function parseDeploymentOutput(source: string, target: DeploymentTarget): TargetRelease {
  const entries = source
    .split('\n')
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line));
  const deploy = entries.findLast(
    (entry) =>
      entry.type === 'deploy' && entry.version === 1 && entry.worker_name === target.workerName,
  );
  if (!deploy || typeof deploy.version_id !== 'string' || !deploy.version_id)
    throw new Error(
      'No matching structured Wrangler deployment receipt. Deployment may have occurred; inspect provider status before retrying.',
    );
  const urls = Array.isArray(deploy.targets)
    ? deploy.targets.filter((url: unknown): url is string => {
        if (typeof url !== 'string') return false;
        try {
          const value = new URL(url);
          return value.protocol === 'https:' && !value.username && !value.password;
        } catch {
          return false;
        }
      })
    : [];
  return { target: target.id, versionId: deploy.version_id, urls, providerConfirmed: false };
}
interface ActiveVersion {
  versionId: string;
  percentage: number;
}
function activeVersions(value: unknown): ActiveVersion[] {
  if (!value || typeof value !== 'object') return [];
  const record = value as Record<string, unknown>;
  // Read only the active deployment's versions, never arbitrary historical IDs.
  if (!Array.isArray(record.versions))
    throw new Error('Unsupported provider deployment status; active versions are missing.');
  const versions = record.versions
    .map((entry: unknown) => {
      if (!entry || typeof entry !== 'object') throw new Error('Invalid provider version.');
      const item = entry as Record<string, unknown>;
      if (
        typeof item.version_id !== 'string' ||
        !item.version_id ||
        typeof item.percentage !== 'number' ||
        !Number.isFinite(item.percentage) ||
        item.percentage < 0 ||
        item.percentage > 100
      )
        throw new Error('Invalid provider traffic allocation.');
      return { versionId: item.version_id, percentage: item.percentage };
    })
    .filter((entry) => entry.percentage > 0);
  if (
    new Set(versions.map((entry) => entry.versionId)).size !== versions.length ||
    Math.abs(versions.reduce((sum, entry) => sum + entry.percentage, 0) - 100) > 0.001
  )
    throw new Error('Invalid provider traffic allocation.');
  return versions;
}
function fullyActive(versions: ActiveVersion[], versionId: string): boolean {
  return (
    versions.length === 1 && versions[0].versionId === versionId && versions[0].percentage === 100
  );
}
function describeArchitecture(root: string, project: ApplicationProject) {
  return project.targets.map((target) => {
    const config = readConfig(targetDirectory(root, target));
    const bindings: { kind: string; binding: string }[] = [];
    for (const kind of [
      'd1_databases',
      'r2_buckets',
      'kv_namespaces',
      'hyperdrive',
      'services',
      'workflows',
    ]) {
      const entries = config[kind];
      if (Array.isArray(entries))
        for (const entry of entries)
          if (typeof entry?.binding === 'string') bindings.push({ kind, binding: entry.binding });
    }
    return {
      target: target.id,
      workerName: target.workerName,
      directory: target.directory,
      bindings,
      scheduled:
        typeof config.triggers === 'object' &&
        config.triggers !== null &&
        Array.isArray((config.triggers as { crons?: unknown }).crons)
          ? (config.triggers as { crons: unknown[] }).crons.filter(
              (cron): cron is string => typeof cron === 'string',
            )
          : [],
    };
  });
}
export async function shipApplication(
  root: string,
  run = defaultRunner,
  suppliedRequest?: CloudflareRequest,
) {
  root = realpathSync(root);
  const { project } = planDelivery(root);
  if (project.audience === 'unconfigured')
    throw new Error(
      'Select an explicit audience before shipping: public or private with allowed members.',
    );
  const env = environment(project);
  return withApplicationLock(root, async () => {
    const state = path.join(root, stateDirectory);
    const outputDirectory = path.join(tmpdir(), `anhedral-delivery-${randomUUID()}`);
    mkdirSync(outputDirectory, { mode: 0o700 });
    let release: Release | undefined;
    let records: ReleaseHistory | undefined;
    const save = () => atomicJson(path.join(state, 'releases.json'), records);
    try {
      await authenticate(root, project, run);
      const gitRoot = (await run('git', ['rev-parse', '--show-toplevel'], root, env)).trim();
      if (realpathSync(gitRoot) !== root)
        throw new Error('Application must be its own Git repository.');
      if ((await run('git', ['status', '--porcelain'], root, env)).trim())
        throw new Error('Commit the application source and manifest before shipping.');
      const commit = (await run('git', ['rev-parse', 'HEAD'], root, env)).trim();
      if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid source commit.');
      const fingerprint = configurationFingerprint(root, project);
      records = history(root, project);
      release = {
        operation: 'ship',
        id: randomUUID(),
        commit,
        startedAt: new Date().toISOString(),
        state: 'running',
        targets: [],
      };
      records.releases.push(release);
      save();
      await run('pnpm', ['run', 'check'], root, env);
      release.state = 'checked';
      save();
      const accessRequest =
        project.audience === 'private'
          ? (suppliedRequest ??
            (await cloudflareRequest(project, targetDirectory(root, project.targets[0]), run, env)))
          : undefined;
      if (accessRequest) await reconcileAccess(root, project, accessRequest, true);
      for (const target of project.targets) {
        if (
          configurationFingerprint(root, readApplication(root)) !== fingerprint ||
          (await run('git', ['rev-parse', 'HEAD'], root, env)).trim() !== commit ||
          (await run('git', ['status', '--porcelain'], root, env)).trim()
        )
          throw new Error(
            'Source or configuration changed during delivery; preserve the release record and rebuild.',
          );
        const output = path.join(outputDirectory, `${target.id}.ndjson`);
        await run('pnpm', ['run', 'deploy'], targetDirectory(root, target), {
          ...env,
          WRANGLER_OUTPUT_FILE_PATH: output,
        });
        const receipt = parseDeploymentOutput(readFileSync(output, 'utf8'), target);
        release.targets.push(receipt);
        save();
        const provider = JSON.parse(
          await run(
            'pnpm',
            ['exec', 'wrangler', 'deployments', 'status', '--json'],
            targetDirectory(root, target),
            env,
          ),
        );
        if (!fullyActive(activeVersions(provider), receipt.versionId))
          throw new Error('Provider active version differs from the deployment receipt.');
        if (accessRequest) await reconcileAccess(root, project, accessRequest, false);
        receipt.providerConfirmed = true;
        save();
      }
      if (
        configurationFingerprint(root, readApplication(root)) !== fingerprint ||
        (await run('git', ['rev-parse', 'HEAD'], root, env)).trim() !== commit ||
        (await run('git', ['status', '--porcelain'], root, env)).trim()
      )
        throw new Error('Source or configuration changed during deployment.');
      release.state = 'deployed';
      release.finishedAt = new Date().toISOString();
      save();
      const managementFile = writeManagementOverview(root, await applicationStatus(root));
      return {
        projectId: project.id,
        release,
        managementFile,
        productVerification: 'required',
        management: `https://dash.cloudflare.com/${project.accountId}/workers-and-pages`,
      };
    } catch (error) {
      if (release) {
        release.state = 'failed';
        release.finishedAt = new Date().toISOString();
        release.failure =
          'Delivery did not complete. Inspect provider status before retrying; earlier targets may already be deployed.';
        save();
      }
      throw error;
    } finally {
      rmSync(outputDirectory, { recursive: true, force: true });
    }
  });
}
export async function applicationStatus(root: string, refresh = false, run = defaultRunner) {
  const project = readApplication(root);
  const records = history(root, project);
  const current = records.releases.at(-1);
  const provider: { target: string; activeRecordedVersion: boolean; versions: ActiveVersion[] }[] =
    [];
  if (refresh) {
    checkTargets(root, project);
    await authenticate(root, project, run);
    for (const target of project.targets) {
      const data = JSON.parse(
        await run(
          'pnpm',
          ['exec', 'wrangler', 'deployments', 'status', '--json'],
          targetDirectory(root, target),
          environment(project),
        ),
      );
      const receipt = current?.targets.find((item) => item.target === target.id);
      const versions = activeVersions(data);
      provider.push({
        target: target.id,
        activeRecordedVersion: !!receipt && fullyActive(versions, receipt.versionId),
        versions,
      });
    }
  }
  const access =
    refresh && project.audience === 'private'
      ? await reconcileAccess(
          root,
          project,
          await cloudflareRequest(
            project,
            targetDirectory(root, project.targets[0]),
            run,
            environment(project),
          ),
          false,
        )
      : undefined;
  return {
    project,
    access,
    architecture: describeArchitecture(root, project),
    releases: records.releases,
    provider,
    evidence: refresh ? 'provider-refresh' : 'local-history',
    productVerification:
      current?.verification?.state === 'passed'
        ? refresh && provider.some((target) => !target.activeRecordedVersion)
          ? 'stale-live-tests'
          : 'recorded-live-tests-passed'
        : 'unverified',
    management: project.accountId
      ? `https://dash.cloudflare.com/${project.accountId}/workers-and-pages`
      : null,
  };
}

export async function verifyApplication(root: string, run = defaultRunner) {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const snapshot = await applicationStatus(root, true, run);
    const release = snapshot.releases.at(-1);
    if (
      !release ||
      release.state !== 'deployed' ||
      !snapshot.provider.every((target) => target.activeRecordedVersion)
    )
      throw new Error('Live verification requires a fully active recorded release.');
    const project = snapshot.project;
    const env = environment(project);
    const primary =
      release.targets.find((target) => target.target === 'web') ?? release.targets.at(-1);
    if (!primary?.urls.length)
      throw new Error('No recorded application URL for live verification.');
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (typeof pkg.scripts?.['test:live'] !== 'string')
      throw new Error(
        'Implement acceptance tests in the application test:live script before running verify. ANHEDRAL_APP_URL supplies the deployed primary URL.',
      );
    if (
      (await run('git', ['rev-parse', 'HEAD'], root, env)).trim() !== release.commit ||
      (await run('git', ['status', '--porcelain'], root, env)).trim()
    )
      throw new Error('Live tests must use the clean source commit of the active release.');
    const records = history(root, project);
    const stored = records.releases.at(-1)!;
    try {
      await run('pnpm', ['run', 'test:live'], root, {
        ...env,
        ANHEDRAL_APP_URL: primary.urls[0],
        ANHEDRAL_RELEASE_ID: release.id,
      });
      const after = await applicationStatus(root, true, run);
      if (
        !after.provider.every((target) => target.activeRecordedVersion) ||
        (await run('git', ['rev-parse', 'HEAD'], root, env)).trim() !== release.commit ||
        (await run('git', ['status', '--porcelain'], root, env)).trim()
      )
        throw new Error('Source or active deployment changed during live tests.');
      stored.verification = {
        state: 'passed',
        checkedAt: new Date().toISOString(),
        command: 'pnpm run test:live',
      };
    } catch (error) {
      stored.verification = {
        state: 'failed',
        checkedAt: new Date().toISOString(),
        command: 'pnpm run test:live',
      };
      atomicJson(path.join(root, stateDirectory, 'releases.json'), records);
      writeManagementOverview(root, await applicationStatus(root));
      throw error;
    }
    atomicJson(path.join(root, stateDirectory, 'releases.json'), records);
    const managementFile = writeManagementOverview(root, await applicationStatus(root));
    return {
      projectId: project.id,
      releaseId: release.id,
      verification: stored.verification,
      managementFile,
    };
  });
}
export async function rollbackApplication(
  root: string,
  releaseId: string,
  dataCompatible: boolean,
  run = defaultRunner,
  suppliedRequest?: CloudflareRequest,
) {
  root = realpathSync(root);
  if (!dataCompatible)
    throw new Error(
      'Review resource/schema compatibility and pass --data-compatible. Worker rollback does not restore data or resource migrations.',
    );
  return withApplicationLock(root, async () => {
    const project = readApplication(root);
    checkTargets(root, project);
    await authenticate(root, project, run);
    const records = history(root, project);
    const desired = records.releases.find((item) => item.id === releaseId);
    if (
      !desired ||
      desired.state !== 'deployed' ||
      desired.targets.length !== project.targets.length ||
      project.targets.some(
        (target) =>
          !desired.targets.some((item) => item.target === target.id && item.providerConfirmed),
      )
    )
      throw new Error('Choose a complete recorded release for every current target.');
    const env = environment(project);
    const request =
      project.audience === 'private'
        ? (suppliedRequest ??
          (await cloudflareRequest(project, targetDirectory(root, project.targets[0]), run, env)))
        : undefined;
    if (request) await reconcileAccess(root, project, request, false);
    // Resolve every version before changing the first target; unavailable resources still make provider rollback fail closed.
    for (const target of project.targets) {
      const version = desired.targets.find((item) => item.target === target.id)!;
      const data = JSON.parse(
        await run(
          'pnpm',
          ['exec', 'wrangler', 'versions', 'view', version.versionId, '--json'],
          targetDirectory(root, target),
          env,
        ),
      );
      if (data.id !== version.versionId) throw new Error('Recorded Worker version is unavailable.');
    }
    const release: Release = {
      operation: 'rollback',
      restoredReleaseId: desired.id,
      id: randomUUID(),
      commit: desired.commit,
      startedAt: new Date().toISOString(),
      state: 'running',
      targets: [],
    };
    records.releases.push(release);
    const save = () => atomicJson(path.join(root, stateDirectory, 'releases.json'), records);
    save();
    try {
      for (const target of [...project.targets].reverse()) {
        const receipt = desired.targets.find((item) => item.target === target.id)!;
        await run(
          'pnpm',
          [
            'exec',
            'wrangler',
            'rollback',
            receipt.versionId,
            '--message',
            `Anhedral restore ${desired.id}`,
          ],
          targetDirectory(root, target),
          env,
        );
        const restored = { ...receipt, providerConfirmed: false };
        release.targets.push(restored);
        save();
        const provider = JSON.parse(
          await run(
            'pnpm',
            ['exec', 'wrangler', 'deployments', 'status', '--json'],
            targetDirectory(root, target),
            env,
          ),
        );
        if (!fullyActive(activeVersions(provider), receipt.versionId))
          throw new Error('Rollback version did not become fully active.');
        if (request) await reconcileAccess(root, project, request, false);
        restored.providerConfirmed = true;
        save();
      }
      release.state = 'deployed';
      release.finishedAt = new Date().toISOString();
      save();
    } catch (error) {
      release.state = 'failed';
      release.finishedAt = new Date().toISOString();
      release.failure =
        'Rollback did not complete; some targets may already be restored. Inspect provider status.';
      save();
      throw error;
    }
    return {
      projectId: project.id,
      release,
      managementFile: writeManagementOverview(root, await applicationStatus(root)),
      productVerification: 'required',
      dataRestored: false,
    };
  });
}

/** Recover current provider evidence, never fabricate a historical release or source-to-version mapping. */
export async function recoverApplication(
  root: string,
  run = defaultRunner,
  suppliedRequest?: CloudflareRequest,
) {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const project = readApplication(root);
    checkTargets(root, project);
    if (project.audience === 'unconfigured')
      throw new Error('Recovery requires the committed audience configuration.');
    const env = environment(project);
    const source = async () => {
      if (
        realpathSync((await run('git', ['rev-parse', '--show-toplevel'], root, env)).trim()) !==
        root
      )
        throw new Error('Application must be its own Git repository.');
      if ((await run('git', ['status', '--porcelain'], root, env)).trim())
        throw new Error('Recovery requires clean committed configuration.');
      const commit = (await run('git', ['rev-parse', 'HEAD'], root, env)).trim();
      if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid source commit.');
      return commit;
    };
    const commit = await source();
    const fingerprint = configurationFingerprint(root, project);
    if (
      (await run('git', ['show', `HEAD:${manifestName}`], root, env)) !==
      readFileSync(path.join(root, manifestName), 'utf8')
    )
      throw new Error('Recovery requires the exact committed application manifest.');
    for (const target of project.targets) {
      const file = `${target.directory}/wrangler.jsonc`;
      if (
        (await run('git', ['show', `HEAD:${file}`], root, env)) !==
        readFileSync(path.join(targetDirectory(root, target), 'wrangler.jsonc'), 'utf8')
      )
        throw new Error('Recovery requires exact committed Worker configuration.');
    }
    await authenticate(root, project, run);
    const request =
      suppliedRequest ??
      (await cloudflareRequest(project, targetDirectory(root, project.targets[0]), run, env));
    const resources = await inspectApplicationResources(root, request);
    const provider: { target: string; versions: ActiveVersion[]; bindingsConfirmed: boolean }[] =
      [];
    const unsupportedBindings = new Set<string>(resources.externalIntegrations);
    for (const target of project.targets) {
      const directory = targetDirectory(root, target);
      const config = readConfig(directory);
      const settings = (
        await request('GET', `/workers/scripts/${encodeURIComponent(target.workerName)}/settings`)
      ).result as { bindings?: Record<string, unknown>[] };
      if (!Array.isArray(settings?.bindings))
        throw new Error('Provider Worker settings lack binding evidence.');
      for (const [field, type, localKey, remoteKey] of [
        ['d1_databases', 'd1', 'database_id', 'id'],
        ['r2_buckets', 'r2_bucket', 'bucket_name', 'bucket_name'],
        ['kv_namespaces', 'kv_namespace', 'id', 'namespace_id'],
        ['services', 'service', 'service', 'service'],
      ]) {
        const entries = config[field];
        if (entries === undefined) continue;
        if (!Array.isArray(entries))
          throw new Error('Unsupported committed binding configuration.');
        for (const entry of entries) {
          const matches = settings.bindings.filter((binding) => binding.name === entry.binding);
          if (field === 'services' && (entry.environment || matches[0]?.environment))
            throw new Error(
              'Service environment binding requires independent provider reconciliation.',
            );
          if (
            typeof entry.binding !== 'string' ||
            typeof entry[localKey] !== 'string' ||
            matches.length !== 1 ||
            matches[0].type !== type ||
            matches[0][remoteKey] !== entry[localKey]
          )
            throw new Error('Active Worker binding differs from committed configuration.');
        }
      }
      const expected = new Set(
        ['d1_databases', 'r2_buckets', 'kv_namespaces', 'services'].flatMap((field) =>
          Array.isArray(config[field])
            ? (config[field] as { binding: string }[]).map((entry) => entry.binding)
            : [],
        ),
      );
      if (
        settings.bindings.some(
          (binding) =>
            ['d1', 'r2_bucket', 'kv_namespace', 'service'].includes(String(binding.type)) &&
            !expected.has(String(binding.name)),
        )
      )
        throw new Error('Active Worker contains an undeclared resource binding.');
      for (const field of ['queues', 'durable_objects', 'workflows', 'hyperdrive', 'pipelines'])
        if (config[field]) unsupportedBindings.add(field);
      const versions = activeVersions(
        JSON.parse(
          await run(
            'pnpm',
            ['exec', 'wrangler', 'deployments', 'status', '--json'],
            directory,
            env,
          ),
        ),
      );
      if (!versions.length) throw new Error('No active Worker deployment to recover.');
      provider.push({
        target: target.id,
        versions,
        bindingsConfirmed: unsupportedBindings.size === 0,
      });
    }
    const access =
      project.audience === 'private'
        ? await reconcileAccess(root, project, request, false)
        : undefined;
    if (
      (await source()) !== commit ||
      configurationFingerprint(root, readApplication(root)) !== fingerprint
    )
      throw new Error('Source or configuration changed during recovery.');
    const records = history(root, project);
    for (const target of project.targets) {
      const after = activeVersions(
        JSON.parse(
          await run(
            'pnpm',
            ['exec', 'wrangler', 'deployments', 'status', '--json'],
            targetDirectory(root, target),
            env,
          ),
        ),
      );
      if (
        JSON.stringify(after) !==
        JSON.stringify(provider.find((item) => item.target === target.id)!.versions)
      )
        throw new Error('Active deployment changed during recovery.');
    }
    const replayable = unsupportedBindings.size
      ? undefined
      : [...records.releases]
          .reverse()
          .find(
            (release) =>
              release.state === 'deployed' &&
              release.targets.length === project.targets.length &&
              provider.every((target) =>
                release.targets.some(
                  (receipt) =>
                    receipt.target === target.target &&
                    receipt.providerConfirmed &&
                    fullyActive(target.versions, receipt.versionId),
                ),
              ),
          );
    const result = {
      schemaVersion: 1,
      projectId: project.id,
      accountId: project.accountId,
      checkedAt: new Date().toISOString(),
      evidence: 'current-provider-snapshot',
      localCommit: commit,
      sourceProvenance: replayable ? 'existing-local-release' : 'unavailable',
      replayableReleaseId: replayable?.id ?? null,
      productVerification: 'unverified',
      provider,
      resources: resources.resources,
      access,
      audience: project.audience,
      audienceEvidence: access ? 'exact-private-access-policies' : 'committed-public-declaration',
      limitations: [...unsupportedBindings]
        .sort()
        .map(
          (kind) => `Independent active binding reconciliation requires provider tooling: ${kind}.`,
        )
        .concat(
          project.audience === 'public'
            ? [
                'Public audience is a committed declaration; hostname-level Access and public route reachability require separate live verification.',
              ]
            : [],
        )
        .concat(
          replayable
            ? []
            : [
                'Provider versions do not establish source commit, application URL or prior acceptance tests. Missing release history cannot be reconstructed; ship a checked release before verify or rollback.',
              ],
        ),
    };
    atomicJson(path.join(root, stateDirectory, 'cloudflare-recovery.json'), result);
    return result;
  });
}
