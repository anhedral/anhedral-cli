import { githubRepository } from './repository.js';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import {
  atomicJson,
  defaultRunner,
  withApplicationLock,
  type DeliveryRunner,
} from './project-state.js';

// Keep provider commands reproducible independently of globally installed tooling.
const cli = ['dlx', 'vercel@62.7.0'];
const manifest = 'anhedral.web.json';
interface WebProject {
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
interface WebRelease {
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
interface ProviderProject {
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
interface ProviderDeployment {
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
  if (existsSync(path.join(root, manifest))) return readWeb(root);
  const setup = JSON.parse(readFileSync(path.join(root, 'anhedral.setup.json'), 'utf8'));
  if (setup.hosting !== 'vercel')
    throw new Error('This application did not select Vercel web hosting.');
  const name = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).name;
  if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(name))
    throw new Error('Invalid Vercel project name.');
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
  atomicJson(path.join(root, manifest), project);
  return project;
}
function readWeb(root: string): WebProject {
  webDirectory(root);
  const project = JSON.parse(readFileSync(path.join(root, manifest), 'utf8')) as WebProject;
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
function env(project?: WebProject): NodeJS.ProcessEnv {
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
function context(root: string, project: WebProject): void {
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
async function api(
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
async function paginated(
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
function validateProvider(project: WebProject, value: ProviderProject): void {
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
function matchesRepository(
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
async function inspect(
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
export async function connectVercelApplication(
  root: string,
  options: {
    scope?: string;
    audience: 'public' | 'private';
    use: 'personal' | 'commercial';
    create?: boolean;
    git?: boolean;
  },
  run = defaultRunner,
) {
  root = realpathSync(root);
  return withApplicationLock(root, async () => {
    const project = readWeb(root);
    const repository = options.git ? await githubRepository(root, run) : undefined;
    if (
      project.repository &&
      repository &&
      (project.repository.repoId !== repository.repoId ||
        project.repository.nameWithOwner.toLowerCase() !== repository.nameWithOwner.toLowerCase())
    )
      throw new Error(
        'GitHub origin differs from the recorded source repository. Reconcile it explicitly.',
      );
    if (existsSync(path.join(root, '.vercel/repo.json')))
      throw new Error('Existing repository links require explicit reconciliation.');
    if (existsSync(path.join(root, '.vercel/project.json')) && !project.projectId)
      throw new Error('Reconcile an existing Vercel project link before automatic connection.');
    if (
      project.audience !== 'unconfigured' &&
      (project.audience !== options.audience || project.use !== options.use)
    )
      throw new Error('Reconcile an established Vercel audience/use explicitly.');
    const teams = await paginated(root, run, '/v2/teams', 'teams');
    const matches = options.scope
      ? teams.filter((team) => team.id === options.scope || team.slug === options.scope)
      : teams;
    if (matches.length !== 1 || !/^team_[a-zA-Z0-9]+$/.test(matches[0].id))
      throw new Error(
        'Select one authorized Vercel team with --scope; account selection is ambiguous or unavailable.',
      );
    const team = await api(root, run, `/v2/teams/${matches[0].id}`, matches[0].id);
    if (team.id !== matches[0].id || typeof team.slug !== 'string')
      throw new Error('Invalid Vercel account identity.');
    const plan = team.billing?.plan;
    if (!['hobby', 'pro', 'enterprise'].includes(plan))
      throw new Error('Cannot verify the selected Vercel plan.');
    if (options.use === 'commercial' && plan === 'hobby')
      throw new Error(
        'Vercel Hobby is for personal non-commercial use. Select an existing suitable Pro/Enterprise account; no paid upgrade was activated.',
      );
    if (project.teamId && project.teamId !== team.id)
      throw new Error('Cannot silently rebind a Vercel application to another account.');
    const projects = await paginated(
      root,
      run,
      `/v9/projects?teamId=${team.id}`,
      'projects',
      team.id,
    );
    const candidates = projects.filter((item) =>
      project.projectId ? item.id === project.projectId : item.name === project.name,
    );
    if (candidates.length > 1) throw new Error('Ambiguous Vercel project identity.');
    let provider = candidates[0];
    if (!provider) {
      if (project.projectId || !options.create)
        throw new Error(
          'Selected Vercel project is missing; use --create only for an authorized new project.',
        );
      // First-class project creation does not expose monorepo root/framework settings.
      provider = await api(root, run, `/v11/projects?teamId=${team.id}`, team.id, {
        name: project.name,
        framework: 'nextjs',
        rootDirectory: 'apps/web',
      });
      if (!/^prj_[a-zA-Z0-9]+$/.test(provider.id))
        throw new Error('Provider did not return a Vercel project identity.');
      atomicJson(path.join(root, '.anhedral/vercel-creation.json'), {
        projectId: provider.id,
        teamId: team.id,
        name: project.name,
      });
      provider = await api(
        root,
        run,
        `/v9/projects/${provider.id}?teamId=${team.id}`,
        team.id,
        {
          sourceFilesOutsideRootDirectory: true,
          ...(options.audience === 'private' ? { ssoProtection: { deploymentType: 'all' } } : {}),
        },
        'PATCH',
      );
    }
    const connected: WebProject = {
      ...project,
      projectId: provider.id,
      teamId: team.id,
      scope: team.slug,
      audience: options.audience,
      use: options.use,
    };
    validateProvider(connected, provider);
    if (existsSync(path.join(root, '.vercel/project.json'))) context(root, connected);
    if (existsSync(path.join(root, '.vercel/repo.json')))
      throw new Error('Existing repository links require explicit reconciliation.');
    // Environment pins make Vercel skip writing its local link. Use explicit CLI targets during link, then pin subsequent commands.
    const linkingEnv = env(connected);
    delete linkingEnv.VERCEL_PROJECT_ID;
    delete linkingEnv.VERCEL_ORG_ID;
    atomicJson(path.join(root, manifest), connected);
    await run(
      'pnpm',
      [
        ...cli,
        'link',
        '--yes',
        '--project',
        connected.projectId!,
        '--scope',
        connected.teamId!,
        '--non-interactive',
      ],
      root,
      linkingEnv,
    );
    const inspected = await inspect(root, connected, run);
    atomicJson(path.join(root, manifest), connected);
    if (repository) {
      const matches = (link: ProviderProject['link']) => matchesRepository(link, repository);
      if (inspected.link && !matches(inspected.link))
        throw new Error(
          'Vercel already connects a different Git repository; reconcile it explicitly.',
        );
      if (!inspected.link) {
        try {
          await run(
            'pnpm',
            [
              ...cli,
              'git',
              'connect',
              repository.url,
              '--yes',
              '--project',
              connected.projectId!,
              '--scope',
              connected.teamId!,
              '--non-interactive',
            ],
            root,
            env(connected),
          );
        } catch {
          throw new Error(
            'Vercel could not connect the GitHub repository. Authorize the Vercel GitHub installation for this repository and retry connect --git; the verified project connection was retained.',
          );
        }
      }
      if (!matches((await inspect(root, connected, run)).link))
        throw new Error(
          'Vercel did not confirm the selected GitHub repository connection. Check the Vercel GitHub installation access.',
        );
      const linked = (await inspect(root, connected, run)).link;
      if (linked?.productionBranch !== undefined && !validBranch(linked.productionBranch))
        throw new Error('Invalid provider production branch.');
      connected.repository = {
        repoId: repository.repoId,
        nameWithOwner: repository.nameWithOwner,
        ...(linked?.productionBranch ? { productionBranch: linked.productionBranch } : {}),
      };
    }
    atomicJson(path.join(root, manifest), connected);
    return { project: connected, plan, planActivated: false };
  });
}
function history(
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
async function source(root: string, run: DeliveryRunner): Promise<string> {
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
function https(value: string): string {
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
function validBranch(branch: string): boolean {
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
function deployment(
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
function validateRelease(
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
async function committedManifest(
  root: string,
  project: WebProject,
  run: DeliveryRunner,
): Promise<string> {
  const commit = await source(root, run);
  let recorded;
  try {
    recorded = JSON.parse(await run('git', ['show', `HEAD:${manifest}`], root, env(project)));
  } catch {
    throw new Error('Commit the Vercel identity manifest before adoption or recovery.');
  }
  if (JSON.stringify(recorded) !== JSON.stringify(project))
    throw new Error('Committed Vercel identity differs from the application manifest.');
  return commit;
}
async function remoteBranch(
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
async function adoptActive(
  root: string,
  project: WebProject,
  run: DeliveryRunner,
  operation: 'adopt' | 'recover',
) {
  const commit = await committedManifest(root, project, run);
  const original = JSON.stringify(project);
  const provider = await inspect(root, project, run);
  const id = provider.targets?.production?.id;
  if (!id || !/^dpl_[a-zA-Z0-9]+$/.test(id))
    throw new Error('No active production deployment is available to recover.');
  const value: ProviderDeployment = await api(
    root,
    run,
    `/v13/deployments/${id}?teamId=${project.teamId}`,
    project.teamId!,
  );
  if (value.id !== id) throw new Error('Provider returned a different active deployment identity.');
  const provenance = value.gitSource?.type === 'github' ? 'git' : 'cli';
  const branch = project.repository?.productionBranch;
  if (operation === 'adopt' && provenance !== 'git')
    throw new Error('Adoption requires a Git-driven deployment. Use recovery for CLI provenance.');
  deployment(project, value, commit, provenance, branch);
  if (provenance === 'git') await remoteBranch(root, branch!, commit, run);
  const records = history(root, project);
  const latest = records.releases.at(-1);
  if (latest?.state === 'deployed' && latest.deploymentId === id && latest.commit === commit) {
    validateRelease(project, value, latest);
    if (
      (await committedManifest(root, project, run)) !== commit ||
      JSON.stringify(readWeb(root)) !== original ||
      (await inspect(root, project, run)).targets?.production?.id !== id
    )
      throw new Error('Source or production changed during adoption/recovery refresh.');
    const refreshed: ProviderDeployment = await api(
      root,
      run,
      `/v13/deployments/${id}?teamId=${project.teamId}`,
      project.teamId!,
    );
    validateRelease(project, refreshed, latest);
    if (provenance === 'git') await remoteBranch(root, branch!, commit, run);
    return {
      projectId: project.id,
      release: latest,
      adopted: false,
      productVerification: latest.verification?.state ?? 'required',
    };
  }
  await run('pnpm', ['run', 'check'], root, env(project));
  if (
    (await committedManifest(root, project, run)) !== commit ||
    JSON.stringify(readWeb(root)) !== original ||
    (await inspect(root, project, run)).targets?.production?.id !== id
  )
    throw new Error('Source or production changed during adoption/recovery checks.');
  const confirmed: ProviderDeployment = await api(
    root,
    run,
    `/v13/deployments/${id}?teamId=${project.teamId}`,
    project.teamId!,
  );
  if (confirmed.id !== id)
    throw new Error('Provider returned a different deployment during adoption/recovery.');
  deployment(project, confirmed, commit, provenance, branch);
  if (provenance === 'git') await remoteBranch(root, branch!, commit, run);
  const url = https(confirmed.url);
  const release: WebRelease = {
    id: randomUUID(),
    commit,
    operation,
    provenance,
    ...(provenance === 'git' ? { branch } : {}),
    state: 'deployed',
    startedAt: new Date().toISOString(),
    deploymentId: id,
    deploymentUrl: url,
    url,
  };
  records.releases.push(release);
  atomicJson(path.join(root, '.anhedral/web-releases.json'), records);
  return { projectId: project.id, release, adopted: true, productVerification: 'required' };
}
export async function adoptVercelApplication(root: string, run = defaultRunner) {
  root = realpathSync(root);
  const result = await withApplicationLock(root, async () =>
    adoptActive(root, readWeb(root), run, 'adopt'),
  );
  writeVercelOverview(root, await vercelApplicationStatus(root));
  return result;
}
export async function recoverVercelApplication(root: string, run = defaultRunner) {
  root = realpathSync(root);
  const result = await withApplicationLock(root, async () => {
    const project = readWeb(root);
    if (
      !project.projectId ||
      !project.teamId ||
      !project.scope ||
      project.audience === 'unconfigured' ||
      project.use === 'unconfigured'
    )
      throw new Error(
        'Recovery requires a committed connected Vercel manifest. Retry connect for interrupted initial setup.',
      );
    await committedManifest(root, project, run);
    env(project);
    // Validate ownership/configuration from explicit API targets before repairing only the ignored local link.
    const team = await api(root, run, `/v2/teams/${project.teamId}`, project.teamId);
    if (
      team.id !== project.teamId ||
      team.slug !== project.scope ||
      !['hobby', 'pro', 'enterprise'].includes(team.billing?.plan) ||
      (project.use === 'commercial' && team.billing.plan === 'hobby')
    )
      throw new Error('Recovery account identity or plan differs from committed intent.');
    const provider = await api(
      root,
      run,
      `/v9/projects/${project.projectId}?teamId=${project.teamId}`,
      project.teamId,
    );
    validateProvider(project, provider);
    if (!existsSync(path.join(root, '.vercel/project.json'))) {
      if (existsSync(path.join(root, '.vercel/repo.json')))
        throw new Error('Reconcile existing Vercel repository links explicitly before recovery.');
      const linkingEnv = env(project);
      delete linkingEnv.VERCEL_PROJECT_ID;
      delete linkingEnv.VERCEL_ORG_ID;
      await run(
        'pnpm',
        [
          ...cli,
          'link',
          '--yes',
          '--project',
          project.projectId,
          '--scope',
          project.teamId,
          '--non-interactive',
        ],
        root,
        linkingEnv,
      );
    }
    return adoptActive(root, project, run, 'recover');
  });
  writeVercelOverview(root, await vercelApplicationStatus(root));
  return result;
}
export function planVercelDelivery(root: string) {
  const project = readWeb(root);
  return {
    project,
    checks: ['pnpm run check'],
    deployment: ['pnpm', ...cli, 'deploy', '--prod', '--yes'],
    cloudflareServices: existsSync(path.join(root, 'anhedral.project.json'))
      ? 'Deploy and verify separately with --provider cloudflare before shipping the web app.'
      : 'none',
    mutation: false,
  };
}
export async function vercelApplicationStatus(root: string, refresh = false, run = defaultRunner) {
  const project = readWeb(root);
  const records = history(root, project);
  const latest = records.releases.at(-1);
  let activeRecordedVersion: boolean | undefined;
  if (refresh) {
    const provider = await inspect(root, project, run);
    if (latest?.deploymentId) {
      const value = await api(
        root,
        run,
        `/v13/deployments/${latest.deploymentId}?teamId=${project.teamId}`,
        project.teamId!,
      );
      validateRelease(project, value, latest);
      activeRecordedVersion = provider.targets?.production?.id === latest.deploymentId;
    } else activeRecordedVersion = false;
  }
  return {
    project,
    releases: records.releases,
    activeRecordedVersion,
    evidence: refresh ? 'provider-refresh' : 'local-history',
    productVerification:
      activeRecordedVersion === false && latest?.verification
        ? 'stale'
        : (latest?.verification?.state ?? 'unverified'),
    management: project.scope ? `https://vercel.com/${project.scope}/${project.name}` : null,
  };
}
export async function shipVercelApplication(root: string, run = defaultRunner) {
  root = realpathSync(root);
  const result = await withApplicationLock(root, async () => {
    const project = readWeb(root);
    if (!project.projectId || !project.teamId || project.audience === 'unconfigured')
      throw new Error('Connect the intended Vercel account, plan and audience before shipping.');
    await inspect(root, project, run);
    const commit = await source(root, run);
    const original = JSON.stringify(project);
    const records = history(root, project);
    const release: WebRelease = {
      id: randomUUID(),
      commit,
      operation: 'ship',
      provenance: 'cli',
      state: 'running',
      startedAt: new Date().toISOString(),
    };
    records.releases.push(release);
    const save = () => atomicJson(path.join(root, '.anhedral/web-releases.json'), records);
    save();
    try {
      await run('pnpm', ['run', 'check'], root, env(project));
      if ((await source(root, run)) !== commit || JSON.stringify(readWeb(root)) !== original)
        throw new Error('Source changed during Vercel checks.');
      await inspect(root, project, run);
      const output = await run(
        'pnpm',
        [
          ...cli,
          'deploy',
          '--prod',
          '--yes',
          '--json',
          '--non-interactive',
          '--scope',
          project.teamId,
          '--meta',
          `anhedralProject=${project.id}`,
          '--meta',
          `anhedralCommit=${commit}`,
        ],
        root,
        env(project),
      );
      let receipt;
      try {
        receipt = JSON.parse(output);
      } catch {
        throw new Error('Vercel CLI did not return a structured deployment receipt.');
      }
      if (
        receipt.status !== 'ok' ||
        !receipt.deployment ||
        receipt.deployment.readyState !== 'READY' ||
        receipt.deployment.target !== 'production' ||
        typeof receipt.deployment.url !== 'string'
      )
        throw new Error('Vercel CLI did not confirm a ready production deployment.');
      const url = https(receipt.deployment.url);
      if (!new URL(url).hostname.endsWith('.vercel.app'))
        throw new Error('Vercel CLI did not return a deployment URL.');
      const value = await api(
        root,
        run,
        `/v13/deployments/${encodeURIComponent(new URL(url).hostname)}?teamId=${project.teamId}`,
        project.teamId,
      );
      deployment(project, value, commit);
      if (value.id !== receipt.deployment.id || https(value.url) !== url)
        throw new Error('Deployment URL differs from the provider receipt.');
      const productionUrl =
        typeof receipt.deployment.productionUrl === 'string'
          ? https(receipt.deployment.productionUrl)
          : undefined;
      if (productionUrl && !value.alias?.some((alias: string) => https(alias) === productionUrl))
        throw new Error('Production URL differs from the provider aliases.');
      release.deploymentId = value.id;
      release.deploymentUrl = url;
      release.url = productionUrl ?? (value.alias?.length ? https(value.alias[0]) : url);
      save();
      const provider = await inspect(root, project, run);
      if (
        provider.targets?.production?.id !== value.id ||
        (await source(root, run)) !== commit ||
        JSON.stringify(readWeb(root)) !== original
      )
        throw new Error('Source or active Vercel production deployment changed during delivery.');
      release.state = 'deployed';
      save();
      return { projectId: project.id, release, productVerification: 'required' };
    } catch (error) {
      release.state = 'failed';
      save();
      throw error;
    }
  });
  writeVercelOverview(root, await vercelApplicationStatus(root));
  return result;
}
export async function verifyVercelApplication(root: string, run = defaultRunner) {
  root = realpathSync(root);
  const result = await withApplicationLock(root, async () => {
    const snapshot = await vercelApplicationStatus(root, true, run);
    const latest = snapshot.releases.at(-1);
    if (
      !latest ||
      latest.state !== 'deployed' ||
      !snapshot.activeRecordedVersion ||
      !latest.url ||
      (await source(root, run)) !== latest.commit
    )
      throw new Error(
        'Live verification needs the clean source of the active recorded Vercel release.',
      );
    const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (typeof pkg.scripts?.['test:live'] !== 'string')
      throw new Error('Implement meaningful application test:live checks before verification.');
    const records = history(root, snapshot.project);
    const release = records.releases.at(-1)!;
    try {
      await run('pnpm', ['run', 'test:live'], root, {
        ...env(snapshot.project),
        ANHEDRAL_APP_URL: latest.url,
        ANHEDRAL_RELEASE_ID: latest.id,
      });
      if (
        !(await vercelApplicationStatus(root, true, run)).activeRecordedVersion ||
        (await source(root, run)) !== latest.commit
      )
        throw new Error('Source or production changed during live verification.');
      release.verification = { state: 'passed', checkedAt: new Date().toISOString() };
    } catch (error) {
      release.verification = { state: 'failed', checkedAt: new Date().toISOString() };
      atomicJson(path.join(root, '.anhedral/web-releases.json'), records);
      throw error;
    }
    atomicJson(path.join(root, '.anhedral/web-releases.json'), records);
    return {
      projectId: snapshot.project.id,
      releaseId: latest.id,
      verification: release.verification,
    };
  });
  writeVercelOverview(root, await vercelApplicationStatus(root));
  return result;
}
export async function rollbackVercelApplication(
  root: string,
  releaseId: string,
  dataCompatible: boolean,
  run = defaultRunner,
) {
  root = realpathSync(root);
  if (!dataCompatible)
    throw new Error(
      'Review schema/resource compatibility and pass --data-compatible. Vercel rollback restores code, not data.',
    );
  const result = await withApplicationLock(root, async () => {
    const project = readWeb(root);
    await inspect(root, project, run);
    const records = history(root, project);
    const desired = records.releases.find((item) => item.id === releaseId);
    if (
      !desired ||
      desired.state !== 'deployed' ||
      !desired.deploymentId ||
      !desired.deploymentUrl ||
      !desired.url
    )
      throw new Error('Choose a complete recorded Vercel release.');
    validateRelease(
      project,
      await api(
        root,
        run,
        `/v13/deployments/${desired.deploymentId}?teamId=${project.teamId}`,
        project.teamId!,
      ),
      desired,
    );
    const release: WebRelease = {
      id: randomUUID(),
      commit: desired.commit,
      operation: 'rollback',
      provenance: desired.provenance ?? 'cli',
      ...(desired.branch ? { branch: desired.branch } : {}),
      state: 'running',
      startedAt: new Date().toISOString(),
      restoredReleaseId: desired.id,
      deploymentId: desired.deploymentId,
      url: desired.url,
      deploymentUrl: desired.deploymentUrl,
    };
    records.releases.push(release);
    const save = () => atomicJson(path.join(root, '.anhedral/web-releases.json'), records);
    save();
    try {
      await run(
        'pnpm',
        [
          ...cli,
          'rollback',
          desired.deploymentUrl,
          '--yes',
          '--non-interactive',
          '--scope',
          project.teamId!,
        ],
        root,
        env(project),
      );
      if ((await inspect(root, project, run)).targets?.production?.id !== desired.deploymentId)
        throw new Error('Vercel did not confirm the restored production version.');
      release.state = 'deployed';
      save();
      return {
        projectId: project.id,
        release,
        dataRestored: false,
        productVerification: 'required',
        automaticProductionUpdates: 'paused-by-provider-rollback',
        nextAction:
          'Review and promote a different deployment explicitly to resume automatic production domain assignment.',
      };
    } catch (error) {
      release.state = 'failed';
      save();
      throw error;
    }
  });
  writeVercelOverview(root, await vercelApplicationStatus(root));
  return result;
}
export function writeVercelOverview(
  root: string,
  snapshot: Awaited<ReturnType<typeof vercelApplicationStatus>>,
): string {
  root = realpathSync(root);
  const directory = path.join(root, '.anhedral');
  mkdirSync(directory, { recursive: true });
  if (realpathSync(directory) !== directory)
    throw new Error('Management directory must not be a symbolic link.');
  const escape = (value: unknown) =>
    String(value ?? '').replace(
      /[&<>"']/g,
      (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!,
    );
  const rows = [...snapshot.releases]
    .reverse()
    .map(
      (release) =>
        `<tr><td>${escape(release.state)} · ${escape(release.operation)} · ${escape(release.provenance ?? 'cli')}</td><td>${escape(release.commit)}</td><td>${release.url ? `<a href="${escape(https(release.url))}" rel="noreferrer">Open app</a>` : 'No confirmed URL'}</td></tr>`,
    )
    .join('');
  const file = path.join(directory, 'web-overview.html');
  const temporary = `${file}.${randomUUID()}.tmp`;
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'"><title>${escape(snapshot.project.name)} · Anhedral</title><style>body{font:16px system-ui;max-width:1000px;margin:3rem auto;padding:1rem}td{padding:1rem;overflow-wrap:anywhere}</style><h1>${escape(snapshot.project.name)}</h1><p>Customer-owned Vercel · ${escape(snapshot.project.audience)} · ${escape(snapshot.evidence)} · ${escape(new Date().toISOString())}</p><p>Active recorded production: ${escape(snapshot.activeRecordedVersion ?? 'Not refreshed')}. Product checks: ${escape(snapshot.productVerification)}.</p><p>Native Next.js web app. Cloudflare services, if selected, have separate provider release records.</p><table><tr><th>State</th><th>Source</th><th>App</th></tr>${rows}</table></html>`;
  try {
    writeFileSync(temporary, html, { mode: 0o600, flag: 'wx' });
    return renameOverview(temporary, file);
  } finally {
    rmSync(temporary, { force: true });
  }
}
function renameOverview(temporary: string, file: string): string {
  renameSync(temporary, file);
  return file;
}
