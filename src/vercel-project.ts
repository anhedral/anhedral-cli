import { hasProjectSection, readProjectSection, writeProjectSection } from './project-config.js';
import { githubRepository } from './repository.js';
import { providerProjectName } from './render.js';
import { existsSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import type { DeliveryRunner } from './project-state.js';
import { VERCEL_CLI_VERSION } from './dependencies.js';

// Keep provider commands reproducible independently of globally installed tooling.
export const cli = ['dlx', `vercel@${VERCEL_CLI_VERSION}`];
const manifest = 'anhedral.json';
export interface WebProject {
  schemaVersion: 1;
  id: string;
  name: string;
  ownership: 'customer';
  provider: 'vercel';
  directory: 'apps/web';
  teamId: string | null;
  projectId: string | null;
  scope: string | null;
  audience: 'unconfigured' | 'public' | 'private';
  use: 'unconfigured' | 'personal' | 'commercial';
  repository?: { repoId: number; nameWithOwner: string; productionBranch?: string };
}
export interface WebRelease {
  id: string;
  commit: string;
  operation: 'ship' | 'rollback' | 'adopt' | 'recover';
  provenance?: 'cli' | 'git';
  branch?: string;
  state: 'running' | 'deployed' | 'failed';
  startedAt: string;
  deploymentId?: string;
  url?: string;
  deploymentUrl?: string;
  restoredReleaseId?: string;
  verification?: { state: 'passed' | 'failed'; checkedAt: string };
}
export interface ProviderProject {
  id: string;
  name: string;
  accountId: string;
  framework: string;
  rootDirectory: string;
  sourceFilesOutsideRootDirectory?: boolean;
  link?: { type: string; org?: string; repo?: string; repoId?: number; productionBranch?: string };
  ssoProtection?: { deploymentType?: string };
  passwordProtection?: unknown;
  targets?: { production?: { id?: string } };
}
export interface ProviderDeployment {
  id: string;
  projectId: string;
  ownerId: string;
  readyState: string;
  target: string;
  url: string;
  alias?: string[];
  meta?: Record<string, string>;
  gitSource?: {
    type?: string;
    repoId?: number | string;
    org?: string;
    repo?: string;
    sha?: string;
    ref?: string;
    prId?: number | null;
  };
}
function webDirectory(root: string): string {
  root = realpathSync(root);
  const directory = realpathSync(path.join(root, 'apps/web'));
  if (!directory.startsWith(root + path.sep))
    throw new Error('Web directory escapes the application.');
  return directory;
}
export function registerVercelApplication(root: string): WebProject {
  root = realpathSync(root);
  webDirectory(root);
  if (hasProjectSection(root, 'vercel')) return readWeb(root);
  const setup = readProjectSection(root, 'setup');
  if (setup.hosting !== 'vercel')
    throw new Error('This application did not select Vercel web hosting.');
  const packageName = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name;
  if (typeof packageName !== 'string' || !packageName)
    throw new Error('A package name is required to register the Vercel project.');
  const name = providerProjectName(packageName);
  const project: WebProject = {
    schemaVersion: 1,
    id: randomUUID(),
    name,
    ownership: 'customer',
    provider: 'vercel',
    directory: 'apps/web',
    teamId: null,
    projectId: null,
    scope: null,
    audience: 'unconfigured',
    use: 'unconfigured',
  };
  const ignore = path.join(root, '.gitignore');
  let source = existsSync(ignore) ? readFileSync(ignore, 'utf8') : '';
  for (const entry of ['.anhedral/', '.vercel/'])
    if (!source.split(/\r?\n/).includes(entry))
      source += (source && !source.endsWith('\n') ? '\n' : '') + entry + '\n';
  writeFileSync(ignore, source);
  writeProjectSection(root, 'vercel', project);
  return project;
}
export function readWeb(root: string): WebProject {
  webDirectory(root);
  const project = readProjectSection(root, 'vercel') as WebProject;
  if (
    project.schemaVersion !== 1 ||
    !/^[a-f0-9-]{36}$/.test(project.id) ||
    project.provider !== 'vercel' ||
    project.ownership !== 'customer' ||
    project.directory !== 'apps/web' ||
    !/^[a-z0-9][a-z0-9-]{0,62}$/.test(project.name) ||
    !['unconfigured', 'public', 'private'].includes(project.audience) ||
    !['unconfigured', 'personal', 'commercial'].includes(project.use) ||
    !(project.teamId === null || /^team_[a-zA-Z0-9]+$/.test(project.teamId)) ||
    !(project.projectId === null || /^prj_[a-zA-Z0-9]+$/.test(project.projectId)) ||
    !(project.scope === null || /^[a-zA-Z0-9_-]+$/.test(project.scope)) ||
    (project.repository !== undefined &&
      (!Number.isSafeInteger(project.repository?.repoId) ||
        project.repository.repoId <= 0 ||
        !/^[a-zA-Z0-9-]+\/[a-zA-Z0-9_.-]+$/.test(project.repository.nameWithOwner) ||
        (project.repository.productionBranch !== undefined &&
          !validBranch(project.repository.productionBranch))))
  )
    throw new Error('Invalid Vercel application manifest.');
  return project;
}
export function env(project?: WebProject): NodeJS.ProcessEnv {
  if (
    project &&
    ((process.env.VERCEL_PROJECT_ID && process.env.VERCEL_PROJECT_ID !== project.projectId) ||
      (process.env.VERCEL_ORG_ID && process.env.VERCEL_ORG_ID !== project.teamId))
  )
    throw new Error('Vercel environment selects a different project/account.');
  return {
    ...process.env,
    CI: '1',
    NO_COLOR: '1',
    ...(project?.projectId
      ? { VERCEL_PROJECT_ID: project.projectId, VERCEL_ORG_ID: project.teamId! }
      : {}),
  };
}
export function context(root: string, project: WebProject): void {
  const file = path.join(root, '.vercel/project.json');
  if (existsSync(path.join(root, '.vercel/repo.json')))
    throw new Error(
      'Reconcile existing Vercel repository links explicitly before using automatic delivery.',
    );
  if (!existsSync(file))
    throw new Error('Run anhedral connect to link the selected Vercel project.');
  if (realpathSync(path.dirname(file)) !== path.join(realpathSync(root), '.vercel'))
    throw new Error('Vercel link directory must not be a symbolic link.');
  const link = JSON.parse(readFileSync(file, 'utf8'));
  if (link.orgId !== project.teamId || link.projectId !== project.projectId)
    throw new Error('Local Vercel link differs from the recorded customer account/project.');
}
export async function api(
  root: string,
  run: DeliveryRunner,
  endpoint: string,
  scope?: string,
  body?: unknown,
  method = 'POST',
): Promise<any> {
  if (!/^\/v\d+\//.test(endpoint) || endpoint.includes('..') || endpoint.includes('#'))
    throw new Error('Invalid Vercel API path.');
  const temporary = path.join(tmpdir(), `anhedral-vercel-${randomUUID()}.json`);
  const args = [
    ...cli,
    'api',
    endpoint,
    '--raw',
    '--non-interactive',
    ...(scope ? ['--scope', scope] : []),
  ];
  try {
    if (body) {
      writeFileSync(temporary, JSON.stringify(body), { mode: 0o600, flag: 'wx' });
      args.push('-X', method, '--input', temporary);
    }
    const output = await run('pnpm', args, root, env());
    let value;
    try {
      value = JSON.parse(output);
    } catch {
      throw new Error('Vercel did not return valid provider JSON.');
    }
    if (!value || typeof value !== 'object' || value.error || value.status === 'error')
      throw new Error('Vercel rejected the request; verify login, scope and project permissions.');
    return value;
  } finally {
    rmSync(temporary, { force: true });
  }
}
export async function paginated(
  root: string,
  run: DeliveryRunner,
  endpoint: string,
  key: string,
  scope?: string,
): Promise<any[]> {
  const result: any[] = [];
  let cursor: number | undefined;
  for (let page = 0; page < 1000; page++) {
    const data = await api(
      root,
      run,
      `${endpoint}${endpoint.includes('?') ? '&' : '?'}limit=100${cursor ? `&until=${cursor}` : ''}`,
      scope,
    );
    if (!Array.isArray(data[key])) throw new Error('Invalid Vercel provider listing.');
    result.push(...data[key]);
    if (data[key].length === 0) return result;
    const next = data.pagination?.next;
    if (next === null || next === undefined) return result;
    if (typeof next !== 'number' || !Number.isFinite(next) || next === cursor)
      throw new Error('Invalid Vercel pagination cursor.');
    cursor = next;
  }
  throw new Error('Vercel listing exceeded pagination bounds.');
}
function protection(project: WebProject, provider: ProviderProject): void {
  const all = provider.ssoProtection?.deploymentType === 'all';
  if (project.audience === 'private' && !all)
    throw new Error(
      'Private Vercel hosting requires verified protection for all deployments, including production. Configure Vercel Authentication for every deployment in the selected project; protection was not disabled or purchased.',
    );
  if (project.audience === 'public' && (all || provider.passwordProtection))
    throw new Error(
      'Provider production protection differs from the requested public audience. Reconcile it explicitly.',
    );
}
export function validateProvider(project: WebProject, value: ProviderProject): void {
  if (
    value.id !== project.projectId ||
    value.accountId !== project.teamId ||
    value.name !== project.name ||
    value.framework !== 'nextjs' ||
    value.rootDirectory !== project.directory ||
    value.sourceFilesOutsideRootDirectory !== true
  )
    throw new Error(
      'Vercel provider account, framework or monorepo root differs from the manifest.',
    );
  protection(project, value);
  if (
    project.repository &&
    (!matchesRepository(value.link, project.repository) ||
      (project.repository.productionBranch !== undefined &&
        value.link?.productionBranch !== project.repository.productionBranch))
  )
    throw new Error(
      'Vercel Git repository differs from the recorded source repository. Reconcile it explicitly.',
    );
}
export function matchesRepository(
  link: ProviderProject['link'],
  repository: NonNullable<WebProject['repository']>,
): boolean {
  const [owner, name] = repository.nameWithOwner.split('/');
  return (
    link?.type === 'github' &&
    link.repoId === repository.repoId &&
    link.org?.toLowerCase() === owner.toLowerCase() &&
    link.repo?.toLowerCase() === name.toLowerCase()
  );
}
export async function inspect(
  root: string,
  project: WebProject,
  run: DeliveryRunner,
): Promise<ProviderProject> {
  context(root, project);
  env(project);
  const team = await api(root, run, `/v2/teams/${project.teamId}`, project.teamId!);
  if (
    team.id !== project.teamId ||
    !['hobby', 'pro', 'enterprise'].includes(team.billing?.plan) ||
    (project.use === 'commercial' && team.billing.plan === 'hobby')
  )
    throw new Error(
      'Selected Vercel account plan no longer supports the recorded application use.',
    );
  const linked = JSON.parse(
    await run(
      'pnpm',
      [...cli, 'project', 'inspect', '--json', '--non-interactive', '--scope', project.teamId!],
      root,
      env(project),
    ),
  );
  if (linked.id !== project.projectId || linked.owner?.slug !== project.scope)
    throw new Error('Vercel CLI resolved a different project/account.');
  const provider = await api(
    root,
    run,
    `/v9/projects/${project.projectId}?teamId=${project.teamId}`,
    project.teamId!,
  );
  validateProvider(project, provider);
  if (project.repository) {
    const repository = await githubRepository(root, run);
    if (
      repository.repoId !== project.repository.repoId ||
      repository.nameWithOwner.toLowerCase() !== project.repository.nameWithOwner.toLowerCase()
    )
      throw new Error(
        'GitHub origin differs from the recorded source repository. Reconcile it explicitly.',
      );
  }
  return provider;
}
export function history(
  root: string,
  project: WebProject,
): { schemaVersion: 1; projectId: string; releases: WebRelease[] } {
  const file = path.join(root, '.anhedral/web-releases.json');
  const value = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : { schemaVersion: 1, projectId: project.id, releases: [] };
  if (value.schemaVersion !== 1 || value.projectId !== project.id || !Array.isArray(value.releases))
    throw new Error('Vercel release history differs from project identity.');
  return value;
}
export async function source(root: string, run: DeliveryRunner): Promise<string> {
  if (
    realpathSync((await run('git', ['rev-parse', '--show-toplevel'], root, env())).trim()) !==
      root ||
    (await run('git', ['status', '--porcelain'], root, env())).trim()
  )
    throw new Error(
      'Commit the application and manifest in their own repository before delivery/verification.',
    );
  const commit = (await run('git', ['rev-parse', 'HEAD'], root, env())).trim();
  if (!/^[a-f0-9]{40,64}$/.test(commit)) throw new Error('Invalid source commit.');
  return commit;
}
export function https(value: string): string {
  const url = new URL(value.startsWith('https://') ? value : `https://${value}`);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    url.search ||
    url.hash ||
    url.pathname !== '/'
  )
    throw new Error('Invalid provider deployment URL.');
  return url.origin;
}
export function validBranch(branch: string): boolean {
  return (
    typeof branch === 'string' &&
    branch.length > 0 &&
    branch.length < 256 &&
    !branch.startsWith('-') &&
    !branch.startsWith('/') &&
    !branch.endsWith('/') &&
    !branch.endsWith('.') &&
    !branch.includes('..') &&
    !branch.includes('@{') &&
    !/[\x00-\x20\x7f~^:?*\\[\]]/.test(branch) &&
    !branch.split('/').some((part) => !part || part.startsWith('.') || part.endsWith('.lock'))
  );
}
export function deployment(
  project: WebProject,
  value: ProviderDeployment,
  commit: string,
  provenance: 'cli' | 'git' = 'cli',
  branch?: string,
): void {
  if (
    !/^[a-f0-9]{40,64}$/.test(commit) ||
    !/^dpl_[a-zA-Z0-9]+$/.test(value.id) ||
    value.projectId !== project.projectId ||
    value.ownerId !== project.teamId ||
    value.readyState !== 'READY' ||
    value.target !== 'production'
  )
    throw new Error(
      'Vercel deployment is not ready or differs from account/project/source provenance.',
    );
  if (provenance === 'git') {
    const repository = project.repository;
    const git = value.gitSource;
    const identity = git?.repoId !== undefined && String(git.repoId) === String(repository?.repoId);
    if (
      !repository ||
      !branch ||
      !validBranch(branch) ||
      git?.type !== 'github' ||
      !identity ||
      git.sha !== commit ||
      git.ref !== branch ||
      git.prId != null
    )
      throw new Error(
        'Git deployment differs from the recorded repository, production branch or source commit.',
      );
  } else if (value.meta?.anhedralProject !== project.id || value.meta?.anhedralCommit !== commit)
    throw new Error('Vercel deployment differs from recorded CLI provenance.');
  https(value.url);
}
export function validateRelease(
  project: WebProject,
  value: ProviderDeployment,
  release: WebRelease,
): void {
  deployment(project, value, release.commit, release.provenance ?? 'cli', release.branch);
  if (
    value.id !== release.deploymentId ||
    !release.deploymentUrl ||
    https(value.url) !== https(release.deploymentUrl)
  )
    throw new Error('Recorded deployment identity or URL differs from provider evidence.');
}
export async function committedManifest(
  root: string,
  project: WebProject,
  run: DeliveryRunner,
): Promise<string> {
  const commit = await source(root, run);
  let recorded;
  try {
    const configuration = JSON.parse(
      await run('git', ['show', `HEAD:${manifest}`], root, env(project)),
    );
    if (configuration.schemaVersion !== 1)
      throw new Error('Invalid committed project configuration.');
    recorded = configuration.vercel;
  } catch {
    throw new Error('Commit the Vercel identity manifest before adoption or recovery.');
  }
  if (JSON.stringify(recorded) !== JSON.stringify(project))
    throw new Error('Committed Vercel identity differs from the application manifest.');
  return commit;
}
export async function remoteBranch(
  root: string,
  branch: string,
  commit: string,
  run: DeliveryRunner,
): Promise<void> {
  if (!validBranch(branch))
    throw new Error('Record an explicit valid production branch before Git adoption.');
  const ref = `refs/heads/${branch}`;
  const output = (await run('git', ['ls-remote', '--heads', 'origin', ref], root, env())).trim();
  const rows = output.split(/\r?\n/).filter(Boolean);
  if (rows.length !== 1 || rows[0] !== `${commit}\t${ref}`)
    throw new Error('Remote production branch does not match the exact clean source commit.');
}
