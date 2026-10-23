import { realpathSync, writeFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import { defaultRunner, type DeliveryRunner } from './project-state.js';
import { withLifecycleOperation, type LifecycleSession } from './lifecycle.js';
import { planDelivery, shipApplication } from './delivery.js';
import { planProvisioning, provisionApplication } from './provision.js';
import type { CloudflareRequest } from './cloudflare.js';
import { planProviderProvisioning, provisionSelectedProviders } from './providers/provision.js';
import {
  applicationRuntime,
  configuredRuntime,
  runtimeTargets,
  RUNTIME_KEYS,
} from './providers/runtime.js';
import { CREDENTIALS } from './providers/api.js';

/** Provisioning can change tracked binding IDs; never silently commit that change. */
async function executeCloudflareApplication(
  root: string,
  dryRun = false,
  run: DeliveryRunner = defaultRunner,
  request?: CloudflareRequest,
  send: typeof fetch = fetch,
  providerEnvironment: NodeJS.ProcessEnv = process.env,
  session?: LifecycleSession,
): Promise<
  | Awaited<ReturnType<typeof shipApplication>>
  | (ReturnType<typeof planDelivery> & {
      provisioning: ReturnType<typeof planProvisioning>;
      mutation: false;
      integrations: ReturnType<typeof planProviderProvisioning>;
    })
  | {
      state: 'configuration-required';
      resources: Awaited<ReturnType<typeof provisionApplication>>;
      deployed: false;
      nextAction: string;
    }
  | {
      state: 'provider-configuration-required';
      deployed: false;
      integrations: Awaited<ReturnType<typeof provisionSelectedProviders>>;
    }
> {
  root = realpathSync(root);
  const deployment = planDelivery(root, true);
  const provisioning = planProvisioning(root);
  const integrations = planProviderProvisioning(root);
  if (dryRun)
    return {
      ...deployment,
      provisioning,
      integrations,
      mutation: false,
    };
  if (deployment.project.audience === 'unconfigured' || !deployment.project.accountId)
    throw new Error('Connect the intended account and audience before shipping.');
  const environment = runtimeEnvironment(providerEnvironment);
  const providerRun: DeliveryRunner = (command, args, cwd, env, input) =>
    run(command, args, cwd, runtimeEnvironment(env), input);
  if (
    realpathSync((await run('git', ['rev-parse', '--show-toplevel'], root, environment)).trim()) !==
      root ||
    (await run('git', ['status', '--porcelain'], root, environment)).trim()
  )
    throw new Error('Shipping requires a clean application repository before provisioning.');
  const commit = (await run('git', ['rev-parse', 'HEAD'], root, environment)).trim();
  const application = await phase(session, 'application-runtime', () =>
    applicationRuntime(root, providerRun),
  );
  await phase(session, 'checks', () => run('pnpm', ['run', 'check'], root, environment));
  if (
    (await run('git', ['status', '--porcelain'], root, environment)).trim() ||
    (await run('git', ['rev-parse', 'HEAD'], root, environment)).trim() !== commit
  )
    throw new Error('Source changed during checks; provisioning was not started.');
  const configured = await phase(session, 'integrations', () =>
    provisionSelectedProviders(root, false, providerRun, send, providerEnvironment),
  );
  if (!configured.ready)
    return { state: 'provider-configuration-required', deployed: false, integrations: configured };
  if (
    (await run('git', ['status', '--porcelain'], root, environment)).trim() ||
    (await run('git', ['rev-parse', 'HEAD'], root, environment)).trim() !== commit
  )
    throw new Error('Source changed during provider configuration; provisioning was stopped.');
  const resources = await phase(session, 'resources', () =>
    provisionApplication(root, false, providerRun, request),
  );
  if ((await run('git', ['status', '--porcelain'], root, environment)).trim()) {
    return {
      state: 'configuration-required',
      resources,
      deployed: false,
      nextAction:
        'Review and commit the resolved resource bindings, then run anhedral ship again. No source commit or deployment was performed automatically.',
    };
  }
  if ((await run('git', ['rev-parse', 'HEAD'], root, environment)).trim() !== commit)
    throw new Error('Source changed during provider configuration; deployment was not started.');
  const runtime = configuredRuntime(root);
  const environments = mergeRuntimeTargets(runtimeTargets(root, runtime), application);
  const buildRunner: DeliveryRunner = async (command, args, cwd, env) => {
    const relative = path.relative(root, cwd).split(path.sep).join('/');
    const values =
      environments[`${relative}/.env`] ??
      environments[`${relative}/.dev.vars`] ??
      environments[`${relative}/.env.local`];
    const environment = runtimeEnvironment(env, values);
    if (
      command !== 'pnpm' ||
      args.join(' ') !== 'run deploy' ||
      !values ||
      !Object.keys(values).length
    )
      return run(command, args, cwd, environment);
    const file = path.join(tmpdir(), `anhedral-secrets-${randomUUID()}.json`);
    try {
      writeFileSync(file, JSON.stringify(values), { mode: 0o600, flag: 'wx' });
      return await run(command, [...args, '--secrets-file', file], cwd, environment);
    } finally {
      rmSync(file, { force: true });
    }
  };
  return phase(session, 'deployment', () => shipApplication(root, buildRunner, request));
}

function phase<T>(
  session: LifecycleSession | undefined,
  name: string,
  action: () => Promise<T>,
): Promise<T> {
  return session ? session.phase(name, action) : action();
}

export async function shipCloudflareApplication(
  root: string,
  dryRun = false,
  run: DeliveryRunner = defaultRunner,
  request?: CloudflareRequest,
  send: typeof fetch = fetch,
  providerEnvironment: NodeJS.ProcessEnv = process.env,
) {
  if (dryRun)
    return executeCloudflareApplication(
      root,
      true,
      run,
      request,
      send,
      providerEnvironment,
      undefined,
    );
  return withLifecycleOperation(root, 'cloudflare', run, (session) =>
    executeCloudflareApplication(root, false, run, request, send, providerEnvironment, session),
  );
}

function runtimeEnvironment(
  base: NodeJS.ProcessEnv,
  values: Record<string, string> = {},
): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = { ...base, CI: '1', NO_COLOR: '1' };
  for (const name of Object.values(CREDENTIALS)) delete environment[name];
  for (const name of RUNTIME_KEYS)
    if (!name.startsWith('NEXT_PUBLIC_') && !name.startsWith('EXPO_PUBLIC_'))
      delete environment[name];
  for (const name of Object.keys(environment))
    if (
      !name.startsWith('EXPO_PUBLIC_') &&
      /SECRET|PASSWORD|ADMIN_KEY|API_KEY|DATABASE_URL|AUTHORIZATION/.test(name)
    )
      delete environment[name];
  return { ...environment, ...values };
}

function mergeRuntimeTargets(
  providers: Record<string, Record<string, string>>,
  application: Record<string, Record<string, string>>,
): Record<string, Record<string, string>> {
  const targets = { ...providers };
  for (const [file, values] of Object.entries(application))
    targets[file] = { ...targets[file], ...values };
  return targets;
}

export const shipSelectedStack = shipCloudflareApplication;
