import {
  cli,
  readWeb,
  env,
  context,
  api,
  paginated,
  validateProvider,
  matchesRepository,
  inspect,
  history,
  source,
  https,
  validBranch,
  deployment,
  validateRelease,
  committedManifest,
  remoteBranch,
  type WebProject,
  type WebRelease,
  type ProviderProject,
  type ProviderDeployment,
} from './vercel-project.js';
export { registerVercelApplication } from './vercel-project.js';
export type { WebProject, WebRelease } from './vercel-project.js';
import { hasProjectSection, writeProjectSection } from './project-config.js';
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
import {
  atomicJson,
  defaultRunner,
  withApplicationLock,
  type DeliveryRunner,
} from './project-state.js';

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
    writeProjectSection(root, 'vercel', connected);
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
    writeProjectSection(root, 'vercel', connected);
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
    writeProjectSection(root, 'vercel', connected);
    return { project: connected, plan, planActivated: false };
  });
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
    cloudflareServices: hasProjectSection(root, 'cloudflare')
      ? 'Default ship deploys Cloudflare services first. Explicit --provider vercel ships only the web app; verify its service dependencies separately.'
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
export async function configureVercelEnvironment(
  root: string,
  values: Record<string, string>,
  run = defaultRunner,
): Promise<void> {
  const project = readWeb(root);
  if (!project.projectId || !project.teamId)
    throw new Error('Connect Vercel before configuring environment variables.');
  context(root, project);
  await inspect(root, project, run);
  if (!Object.keys(values).length) return;
  const response = await api(
    root,
    run,
    `/v10/projects/${project.projectId}/env?upsert=true`,
    project.teamId,
    Object.entries(values).map(([key, value]) => ({
      key,
      value,
      type: 'encrypted',
      target: ['production'],
    })),
  );
  const created = Array.isArray(response.created)
    ? response.created
    : response.created
      ? [response.created]
      : [];
  if (
    !Array.isArray(response.failed) ||
    response.failed.length ||
    Object.keys(values).some(
      (key) =>
        !created.some(
          (entry: { key?: unknown; target?: unknown }) =>
            entry.key === key &&
            (entry.target === 'production' ||
              (Array.isArray(entry.target) && entry.target.includes('production'))),
        ),
    )
  )
    throw new Error(
      'Vercel did not confirm all selected production environment variables; deployment was not started.',
    );
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

/** Read-only Web Analytics query for the exact connected project/team. */
export async function vercelServiceMetrics(
  root: string,
  hours = 24,
  run = defaultRunner,
): Promise<import('./service-model.js').ServiceMetrics> {
  if (![24, 168].includes(hours)) throw new Error('Vercel analytics uses complete UTC days.');
  const project = readWeb(root);
  await inspect(root, project, run);
  if (!project.projectId || !project.teamId)
    throw new Error('Connect the exact Vercel project and team before reading analytics.');
  const end = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z').toISOString();
  const start = new Date(Date.parse(end) - hours * 3600000).toISOString();
  const query = new URLSearchParams({
    teamId: project.teamId,
    projectId: project.projectId,
    since: start.slice(0, 10),
    until: new Date(Date.parse(end) - 1).toISOString().slice(0, 10),
    by: 'day',
    limit: '100',
  });
  const value = await api(
    root,
    run,
    `/v1/query/web-analytics/visits/aggregate?${query}`,
    project.teamId,
  );
  if (
    value.version !== 1 ||
    !Array.isArray(value.data) ||
    value.data.length >= 100 ||
    value.query?.since !== start.slice(0, 10)
  )
    throw new Error('Unsupported or truncated Vercel analytics output.');
  const points = value.data.map((row: unknown) => {
    if (!row || typeof row !== 'object') throw new Error('Invalid analytics row.');
    const value = row as Record<string, unknown>;
    if (
      typeof value.timestamp !== 'string' ||
      !Number.isFinite(Date.parse(value.timestamp)) ||
      Date.parse(value.timestamp) < Date.parse(start) ||
      Date.parse(value.timestamp) >= Date.parse(end) ||
      [value.pageviews, value.visitors].some(
        (count) => typeof count !== 'number' || !Number.isFinite(count) || count < 0,
      )
    )
      throw new Error('Invalid Vercel analytics values.');
    return {
      time: value.timestamp,
      values: { pageviews: Number(value.pageviews), visitors: Number(value.visitors) },
    };
  });
  return {
    fetchedAt: new Date().toISOString(),
    start,
    end,
    timezone: 'UTC',
    source: 'Vercel Web Analytics (daily buckets)',
    sampled: false,
    points,
    units: { pageviews: 'count', visitors: 'daily bucket count' },
  };
}
