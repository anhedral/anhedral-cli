import { hasProjectSection, readProjectSection } from './project-config.js';
import path from 'node:path';
import { inspectProject } from './readiness.js';
import { defaultRunner, type DeliveryRunner } from './project-state.js';
import { vercelApplicationStatus } from './vercel.js';
import { applicationStatus } from './delivery.js';
import { supportsVoidRuntime, VOID_VERSION } from './void.js';
import { supportsWorkspaceRuntime } from './runtime-policy.js';
import { PACKAGE_MANAGER } from './dependencies.js';

/** Explicit opt-in: checks local tools and existing provider context without setup or deployment. */
export async function inspectProviderReadiness(root: string, run: DeliveryRunner = defaultRunner) {
  root = path.resolve(root);
  const local = inspectProject(root);
  const checks: { id: string; ok: boolean; detail: string; nextAction?: string }[] = [];
  const environment = {
    ...process.env,
    CI: '1',
    GH_PROMPT_DISABLED: '1',
    GIT_TERMINAL_PROMPT: '0',
    NO_COLOR: '1',
  };
  const check = async (
    id: string,
    operation: () => Promise<boolean>,
    detail: string,
    nextAction: string,
  ) => {
    try {
      checks.push({ id, ok: await operation(), detail, nextAction });
    } catch {
      checks.push({ id, ok: false, detail, nextAction });
    }
  };
  let voidTargets: { directory: string }[] = [];
  try {
    const manifest = readProjectSection(root, 'cloudflare');
    if (manifest.deliveryEngine === 'void' && Array.isArray(manifest.targets))
      voidTargets = manifest.targets.filter(
        (target: { directory?: unknown }) =>
          typeof target.directory === 'string' && /^apps\/[a-z0-9-]+$/.test(target.directory),
      );
  } catch {
    // Provider readiness below reports invalid or unconfigured manifests.
  }
  checks.push({
    id: 'node',
    ok: voidTargets.length
      ? supportsVoidRuntime(process.versions.node)
      : supportsWorkspaceRuntime(process.versions.node),
    detail: voidTargets.length
      ? 'Void applications require Node.js 24.21.0 or newer.'
      : 'Generated workspaces require Node 22.13+ on 22.x, or Node 24+.',
  });
  for (const target of voidTargets)
    await check(
      `void:${target.directory}`,
      async () =>
        (
          await run(
            'pnpm',
            ['exec', 'void', '--version'],
            path.join(root, target.directory),
            environment,
          )
        ).trim() === VOID_VERSION,
      `Pinned Void ${VOID_VERSION} is available in ${target.directory}`,
      'Install the committed workspace lockfile and the pinned Void version.',
    );
  await check(
    'pnpm',
    async () =>
      (await run('pnpm', ['--version'], root, environment)).trim() ===
      PACKAGE_MANAGER.slice('pnpm@'.length),
    `${PACKAGE_MANAGER} is available`,
    `Install ${PACKAGE_MANAGER} before operating this workspace.`,
  );
  await check(
    'git',
    async () => (await run('git', ['--version'], root, environment)).startsWith('git version '),
    'Git is available',
    'Install Git.',
  );
  await check(
    'git-identity',
    async () => Boolean((await run('git', ['var', 'GIT_AUTHOR_IDENT'], root, environment)).trim()),
    'Git author identity is configured; its value is not recorded',
    'Configure your own Git name and email locally.',
  );
  await check(
    'github',
    async () => {
      if (process.env.GH_HOST && process.env.GH_HOST !== 'github.com') return false;
      const user = JSON.parse(
        await run('gh', ['api', 'user'], root, { ...environment, GH_HOST: 'github.com' }),
      );
      return typeof user.login === 'string' && /^[a-zA-Z0-9-]+$/.test(user.login);
    },
    'GitHub CLI can identify its authenticated account',
    'Complete gh auth login locally for the intended GitHub account.',
  );
  const providers: {
    provider: 'vercel' | 'cloudflare';
    connection: 'verified' | 'blocked';
    deployment: 'active-recorded' | 'unverified';
    nextAction?: string;
  }[] = [];
  for (const provider of ['vercel', 'cloudflare'] as const) {
    try {
      if (!hasProjectSection(root, provider)) continue;
      const manifest = readProjectSection(root, provider);
      const connected =
        provider === 'vercel' ? manifest.projectId && manifest.teamId : manifest.accountId;
      if (!connected || manifest.audience === 'unconfigured') throw new Error('unconfigured');
      const status =
        provider === 'vercel'
          ? await vercelApplicationStatus(root, true, run)
          : await applicationStatus(root, true, run);
      const active =
        'activeRecordedVersion' in status
          ? status.activeRecordedVersion === true
          : status.provider.length > 0 &&
            status.provider.every((target) => target.activeRecordedVersion);
      providers.push({
        provider,
        connection: 'verified',
        deployment: active ? 'active-recorded' : 'unverified',
      });
    } catch {
      providers.push({
        provider,
        connection: 'blocked',
        deployment: 'unverified',
        nextAction: `Inspect the ${provider} section in anhedral.json and sign in to its recorded account. Connect an unconfigured app or run recover for a fresh clone; do not change the audience to bypass access checks.`,
      });
    }
  }
  return {
    ...local,
    prerequisiteChecks: checks,
    prerequisitesReady: checks.every((item) => item.ok),
    providers,
    providerVerification:
      providers.length && providers.every((item) => item.connection === 'verified')
        ? 'verified-existing-context'
        : 'unverified',
    connectionEvidence:
      'Account, configuration and deployment context only; resource IDs and bindings require separate recovery/provisioning checks.',
    externalIntegrations:
      'Require separate actual service setup and product tests; this report does not inspect secrets or certify integrations.',
    productionReady: false,
    mutation: false,
  };
}
