import type { StandardProduct } from './stack-registry.js';
import { EAS_CLI_VERSION, STACK_DEPENDENCIES, VERCEL_CLI_VERSION } from './dependencies.js';
import { realpathSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { readProjectSection } from './project-config.js';
import { validateSetupPlan } from './readiness.js';
import { resolveCommand } from './command.js';
import { defaultRunner, type DeliveryRunner } from './project-state.js';
import { providerConfiguration } from './providers/config.js';
import {
  INTEGRATION_PROVIDERS,
  PROVIDER_DEFINITIONS,
  type ProviderDefinition,
} from './providers/definitions.js';

export interface ProviderAuth {
  id: string;
  products: readonly StandardProduct[];
  login?: readonly string[];
  identity?: readonly string[];
  credential?: string;
  endpoint?: string;
  runtime?: { credential: string; endpoint: string };
  regionalEndpoints?: Readonly<Record<string, string>>;
  setup: string;
}

/** Deployment access is separate from application-user authentication. */
export const PROVIDER_AUTH: readonly ProviderAuth[] = [
  {
    id: 'cloudflare',
    products: [
      'expo',
      'analytics-engine',
      'images',
      'realtimekit',
      'video',
      'stream',
      'vinext',
      'hono',
      'd1',
      'r2',
      'kv',
      'realtime',
      'queues',
      'cron',
      'workflows',
      'workers-ai',
      'basin',
    ],
    login: ['pnpm', 'dlx', `wrangler@${STACK_DEPENDENCIES.wrangler}`, 'login'],
    identity: ['pnpm', 'dlx', `wrangler@${STACK_DEPENDENCIES.wrangler}`, 'whoami', '--json'],
    setup: 'Select and connect the intended Cloudflare account before shipping.',
  },
  {
    id: 'vercel',
    products: [],
    login: ['pnpm', 'dlx', `vercel@${VERCEL_CLI_VERSION}`, 'login'],
    identity: ['pnpm', 'dlx', `vercel@${VERCEL_CLI_VERSION}`, 'whoami'],
    setup: 'Connect the intended Vercel team and project before shipping.',
  },
  ...INTEGRATION_PROVIDERS.map((id): ProviderAuth => {
    const definition: ProviderDefinition = PROVIDER_DEFINITIONS[id];
    const { auth } = definition;
    return {
      id,
      products: auth.products ?? [id],
      credential: definition.credential,
      endpoint: `${definition.origin}${auth.path}`,
      ...(auth.runtime
        ? {
            runtime: {
              credential: auth.runtime.credential,
              endpoint: `${definition.origin}${auth.runtime.path}`,
            },
          }
        : {}),
      ...(definition.regionalOrigins
        ? {
            regionalEndpoints: Object.fromEntries(
              Object.entries(definition.regionalOrigins).map(([region, origin]) => [
                region,
                `${origin}${auth.path}`,
              ]),
            ),
          }
        : {}),
      setup: `Supply ${definition.credential} for management access.${auth.runtime ? ` ${auth.runtime.credential} checks runtime access only.` : ''} ${definition.ownerSteps.join(' ')} A successful probe does not establish all write permissions.`,
    };
  }),
  {
    id: 'expo',
    products: ['expo'],
    login: ['pnpm', 'dlx', `eas-cli@${EAS_CLI_VERSION}`, 'login'],
    identity: ['pnpm', 'dlx', `eas-cli@${EAS_CLI_VERSION}`, 'whoami'],
    setup:
      'Authenticate the intended Expo account; store signing and enrollment are separate from EAS access.',
  },
];

export function requiredProviders(root: string): ProviderAuth[] {
  root = realpathSync(root);
  let plan: unknown;
  try {
    plan = readProjectSection(root, 'setup');
    validateSetupPlan(plan);
  } catch {
    throw new Error('A valid Anhedral setup plan is required before authentication.');
  }
  validateSetupPlan(plan);
  const providers = PROVIDER_AUTH.filter(
    (provider) =>
      provider.products.some((product) => plan.products.includes(product)) ||
      (provider.id === 'cloudflare' &&
        plan.products.includes('next') &&
        plan.hosting === 'cloudflare') ||
      (provider.id === 'vercel' && plan.products.includes('next') && plan.hosting === 'vercel'),
  );
  return providers;
}

export type AuthState = 'verified' | 'missing' | 'insufficient-permissions' | 'unverified';
export interface AuthCheck {
  provider: string;
  state: AuthState;
  evidence: 'cli-session' | 'api-access' | 'none';
  access: 'session' | 'management' | 'runtime' | 'none';
  nextAction: string;
}

export interface AuthOptions {
  provider?: string;
  status?: boolean;
  interactive?: boolean;
}

export type LoginRunner = (command: readonly string[], root: string) => Promise<void>;
async function login(command: readonly string[], root: string): Promise<void> {
  const resolved = resolveCommand(command[0], command.slice(1));
  await new Promise<void>((resolve, reject) => {
    const child = spawn(resolved.command, resolved.args, {
      cwd: root,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', () => reject(new Error('Provider login tool is unavailable.')));
    child.once('exit', (code) =>
      code === 0 ? resolve() : reject(new Error('Provider login did not complete.')),
    );
  });
}

/** Never return provider output, tokens, user addresses or response bodies. */
export async function authenticateProviders(
  root: string,
  options: AuthOptions = {},
  run: DeliveryRunner = defaultRunner,
  send: typeof fetch = fetch,
  startLogin: LoginRunner = login,
  environment: NodeJS.ProcessEnv = process.env,
) {
  root = realpathSync(root);
  const required = requiredProviders(root);
  if (options.provider && !required.some((item) => item.id === options.provider))
    throw new Error('Requested provider is not required by this project.');
  const selected = required.filter((item) => !options.provider || item.id === options.provider);
  const configuration = providerConfiguration(root);
  const checks: AuthCheck[] = [];
  for (const provider of selected) {
    let state: AuthState = 'unverified';
    let evidence: AuthCheck['evidence'] = 'none';
    let access: AuthCheck['access'] = 'none';
    if (provider.identity) {
      const inspect = async () => {
        const output = await run(provider.identity![0], [...provider.identity!.slice(1)], root, {
          ...environment,
          CI: '1',
          NO_COLOR: '1',
        });
        if (provider.id === 'cloudflare') {
          const identity = JSON.parse(output);
          return (
            identity.loggedIn === true &&
            Array.isArray(identity.accounts) &&
            identity.accounts.some(
              (account: { id?: unknown }) =>
                typeof account?.id === 'string' && /^[a-f0-9]{32}$/i.test(account.id),
            )
          );
        }
        return (
          output.length <= 1024 &&
          /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,99}$/.test(output.trim()) &&
          !/^(?:unauthenticated|anonymous|null|undefined|error|false)$/i.test(output.trim())
        );
      };
      try {
        if (await inspect()) {
          state = 'verified';
          evidence = 'cli-session';
          access = 'session';
        } else state = 'missing';
      } catch {
        state = 'missing';
      }
      if (state === 'missing' && !options.status && options.interactive && provider.login) {
        try {
          await startLogin(provider.login, root);
          if (await inspect()) {
            state = 'verified';
            evidence = 'cli-session';
            access = 'session';
          }
        } catch {
          state = 'missing';
        }
      }
    } else if (provider.credential) {
      let credential = environment[provider.credential];
      let endpoint = provider.endpoint;
      let credentialAccess: AuthCheck['access'] = 'management';
      if (!credential && provider.runtime) {
        credential = environment[provider.runtime.credential];
        endpoint = provider.runtime.endpoint;
        credentialAccess = 'runtime';
      }
      if (provider.regionalEndpoints) {
        const region = configuration.providers.posthog?.region;
        endpoint = region ? provider.regionalEndpoints[region] : undefined;
      }
      if (!credential) state = 'missing';
      else if (endpoint) {
        try {
          const response = await send(endpoint, {
            headers: { Authorization: `Bearer ${credential}` },
            redirect: 'error',
            signal: AbortSignal.timeout(30_000),
          });
          if (response.ok) {
            state = 'verified';
            evidence = 'api-access';
            access = credentialAccess;
          } else
            state =
              response.status === 403
                ? 'insufficient-permissions'
                : response.status === 401
                  ? 'missing'
                  : 'unverified';
          await response.body?.cancel();
        } catch {
          state = 'unverified';
        }
      }
    }
    checks.push({ provider: provider.id, state, evidence, access, nextAction: provider.setup });
  }
  return {
    schemaVersion: 1,
    checks,
    authenticated: checks.every((check) => check.state === 'verified'),
    provisioningReady: false,
    note: 'Authentication checks do not establish selected account ownership, all provisioning permissions, configured runtime secrets or product readiness.',
  };
}
