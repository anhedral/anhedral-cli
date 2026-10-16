import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { projectConfigPath } from './project-config.js';
import { cloudflareRequest, type CloudflareRequest } from './cloudflare.js';
import {
  configurationFile,
  usesVoid,
  defaultRunner,
  environment,
  readApplication,
  readConfig,
  targetDirectory,
  type ApplicationProject,
  type DeploymentTarget,
} from './project-state.js';
const stateDirectory = '.anhedral';

export interface TargetRelease {
  target: string;
  versionId: string;
  urls: string[];
  providerConfirmed: boolean;
}
export interface Release {
  id: string;
  commit: string;
  startedAt: string;
  finishedAt?: string;
  state: 'running' | 'checked' | 'deployed' | 'configuration-required' | 'failed';
  targets: TargetRelease[];
  failure?: string;
  configurationChanges?: string[];
  operation?: 'ship' | 'rollback';
  restoredReleaseId?: string;
  verification?: { state: 'passed' | 'failed'; checkedAt: string; command: 'pnpm run test:live' };
}
export interface ReleaseHistory {
  schemaVersion: 1;
  projectId: string;
  releases: Release[];
}
export function history(root: string, project: ApplicationProject): ReleaseHistory {
  const file = path.join(root, stateDirectory, 'releases.json');
  if (!existsSync(file)) return { schemaVersion: 1, projectId: project.id, releases: [] };
  const value = JSON.parse(readFileSync(file, 'utf8')) as ReleaseHistory;
  if (value.schemaVersion !== 1 || value.projectId !== project.id || !Array.isArray(value.releases))
    throw new Error('Release history belongs to a different or unsupported project.');
  return value;
}
export function checkTargets(
  root: string,
  project: ApplicationProject,
  allowResourcePlaceholders = false,
): void {
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
    const pending = structuredClone(config);
    if (allowResourcePlaceholders) {
      for (const [field, id] of [
        ['d1_databases', 'database_id'],
        ['kv_namespaces', 'id'],
        ['pipelines', 'stream'],
      ] as const) {
        const entries = pending[field];
        if (Array.isArray(entries))
          for (const entry of entries) {
            if (entry && typeof entry[id] === 'string' && entry[id].startsWith('REPLACE_WITH_'))
              entry[id] = 'pending-resource';
          }
      }
    }
    if (
      /REPLACE_WITH_|YOUR_[A-Z_]+/.test(
        allowResourcePlaceholders || usesVoid(project)
          ? JSON.stringify(pending)
          : readFileSync(configurationFile(directory), 'utf8'),
      )
    )
      throw new Error('Configure selected resources before shipping; placeholder bindings remain.');
    const pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
    if (typeof pkg.scripts?.deploy !== 'string')
      throw new Error('Deployment target has no deploy script.');
  }
}
export function configurationFingerprint(root: string, project: ApplicationProject): string {
  const hash = createHash('sha256').update(readFileSync(projectConfigPath(root)));
  for (const target of project.targets) {
    const directory = targetDirectory(root, target);
    hash.update(readFileSync(configurationFile(directory)));
    if (usesVoid(project))
      for (const name of ['void.config.ts', 'env.ts']) {
        const file = path.join(directory, name);
        hash.update(name).update(existsSync(file) ? readFileSync(file) : '<absent>');
      }
  }
  return hash.digest('hex');
}
export function planDelivery(root: string, allowResourcePlaceholders = false) {
  const project = readApplication(root);
  checkTargets(root, project, allowResourcePlaceholders);
  if (usesVoid(project)) {
    const owners = project.targets.filter((target) => {
      // Ownership is authored. Void may add a conventional migrations_dir to
      // resolved consumer locks; those consumers must not become migration owners.
      const config = JSON.parse(
        readFileSync(configurationFile(targetDirectory(root, target)), 'utf8'),
      ) as Record<string, unknown>;
      return (
        Array.isArray(config.d1_databases) &&
        config.d1_databases.some((database) => database?.migrations_dir)
      );
    });
    if (owners.length > 1)
      throw new Error(
        'Void delivery requires one D1 migration owner; other server targets must consume the shared database without deployment migrations.',
      );
  }
  return {
    project,
    checks: [['pnpm', 'run', 'check']],
    deployments: project.targets.map((target) => ({
      target: target.id,
      directory: target.directory,
      command: usesVoid(project)
        ? ['pnpm', 'exec', 'void', 'deploy', '--platform', 'cloudflare']
        : ['pnpm', 'run', 'deploy'],
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
export interface ActiveVersion {
  versionId: string;
  percentage: number;
}
export function activeVersions(value: unknown): ActiveVersion[] {
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
export async function providerStatus(
  root: string,
  project: ApplicationProject,
  target: DeploymentTarget,
  run: typeof defaultRunner,
  request?: CloudflareRequest,
): Promise<unknown> {
  if (!usesVoid(project))
    return JSON.parse(
      await run(
        'pnpm',
        ['exec', 'wrangler', 'deployments', 'status', '--json'],
        targetDirectory(root, target),
        environment(project),
      ),
    );
  const api =
    request ??
    (await cloudflareRequest(project, targetDirectory(root, target), run, environment(project)));
  const result = (
    await api('GET', `/workers/scripts/${encodeURIComponent(target.workerName)}/deployments`)
  ).result as { deployments?: unknown[] };
  if (!Array.isArray(result?.deployments) || !result.deployments.length)
    throw new Error('No active Cloudflare deployment evidence.');
  return result.deployments[0];
}
export function fullyActive(versions: ActiveVersion[], versionId: string): boolean {
  return (
    versions.length === 1 && versions[0].versionId === versionId && versions[0].percentage === 100
  );
}
export function describeArchitecture(root: string, project: ApplicationProject) {
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
