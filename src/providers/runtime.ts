import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { existsSync, lstatSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from '../bounded-file.js';
import { readProjectSection } from '../project-config.js';
import { atomicJson, readConfig, type DeliveryRunner } from '../project-state.js';
import { digest } from './api.js';
import { validateSetupPlan } from '../readiness.js';
import { isIP } from 'node:net';
import { providerConfiguration } from './config.js';

export type RuntimeValues = Record<string, string>;
function serverRuntimeFile(root: string, runtime: string, hosting: string): string {
  const directory = `apps/${runtime}`;
  if (runtime === 'web' && hosting === 'vercel') return `${directory}/.env.local`;
  return `${directory}/${existsSync(path.join(root, directory, 'void.config.ts')) ? '.env' : '.dev.vars'}`;
}
export const RUNTIME_KEYS = [
  'BETTER_AUTH_SECRET',
  'BETTER_AUTH_URL',
  'NEON_REALTIME_SECRET',
  'DATABASE_URL',
  'CLERK_SECRET_KEY',
  'CLERK_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'RESEND_API_KEY',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'BILLING_ORIGIN',
  'BILLING_ENVIRONMENT',
  'BILLING_PLANS_JSON',
  'BILLING_ENTITLEMENTS_JSON',
  'BILLING_PREMIUM_ENTITLEMENT',
  'REVENUECAT_SECRET_KEY',
  'REVENUECAT_WEBHOOK_AUTHORIZATION',
  'REVENUECAT_WEBHOOK_SIGNING_SECRET',
  'REVENUECAT_APP_IDS_JSON',
  'REVENUECAT_PROJECT_ID',
  'SENTRY_DSN',
  'POSTHOG_API_KEY',
  'POSTHOG_HOST',
  'OPENAI_API_KEY',
  'EXPO_PUBLIC_API_URL',
  'EXPO_PUBLIC_REVENUECAT_IOS_API_KEY',
  'EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY',
];

function validateValues(values: RuntimeValues): void {
  if (
    !values ||
    typeof values !== 'object' ||
    Array.isArray(values) ||
    Object.entries(values).some(
      ([key, value]) =>
        !RUNTIME_KEYS.includes(key) ||
        typeof value !== 'string' ||
        !value ||
        value.length > 16384 ||
        /[\r\n\x00]/.test(value),
    )
  )
    throw new Error('Invalid provider runtime configuration.');
}

export function runtimeTargets(root: string, values: RuntimeValues): Record<string, RuntimeValues> {
  validateValues(values);
  const setup: unknown = readProjectSection(root, 'setup');
  validateSetupPlan(setup);
  const targets: Record<string, RuntimeValues> = {};
  const runtime = setup.products.includes('hono') ? 'api' : 'web';
  const server = Object.fromEntries(
    Object.entries(values).filter(([key]) => !key.startsWith('EXPO_PUBLIC_')),
  );
  if (existsSync(path.join(root, `apps/${runtime}`)))
    targets[serverRuntimeFile(root, runtime, setup.hosting)] = server;
  if (
    runtime === 'api' &&
    existsSync(path.join(root, 'apps/web')) &&
    values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  )
    targets[serverRuntimeFile(root, 'web', setup.hosting)] = {
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      ...(values.CLERK_SECRET_KEY ? { CLERK_SECRET_KEY: values.CLERK_SECRET_KEY } : {}),
    };
  if (setup.products.includes('expo')) {
    const mobile = Object.fromEntries(
      Object.entries(values).filter(([key]) => key.startsWith('EXPO_PUBLIC_')),
    );
    if (values.CLERK_PUBLISHABLE_KEY)
      mobile.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY = values.CLERK_PUBLISHABLE_KEY;
    if (Object.keys(mobile).length) targets['apps/mobile/.env.local'] = mobile;
  }
  return targets;
}

/** Preflight every destination before writing any file; preserve unrelated configuration verbatim. */
export async function configureRuntime(
  root: string,
  values: RuntimeValues,
  run: DeliveryRunner,
): Promise<string[]> {
  root = realpathSync(root);
  const writes: { file: string; content: string; relative: string }[] = [];
  for (const [relative, entries] of Object.entries(runtimeTargets(root, values))) {
    if (!Object.keys(entries).length) continue;
    const file = path.join(root, relative);
    if (
      realpathSync(path.dirname(file)) !== path.dirname(file) ||
      (existsSync(file) && lstatSync(file).isSymbolicLink())
    )
      throw new Error('Runtime environment destination must not contain symbolic links.');
    if ((await run('git', ['ls-files', '--', relative], root, process.env)).trim())
      throw new Error('Runtime environment files must not be tracked.');
    if (
      (
        await run('git', ['check-ignore', '--no-index', '--', relative], root, process.env)
      ).trim() !== relative
    )
      throw new Error('Ignore runtime environment files before provisioning.');
    let content = existsSync(file)
      ? readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8')
      : '';
    for (const [key, value] of Object.entries(entries)) {
      const existing = content
        .split(/\r?\n/)
        .filter((line) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line));
      if (existing.length > 1)
        throw new Error(`Duplicate runtime value for ${key}; reconcile before configuring.`);
      if (existing.length) {
        let previous = existing[0].slice(existing[0].indexOf('=') + 1).trim();
        if (previous.startsWith('"')) {
          try {
            previous = JSON.parse(previous);
          } catch {
            /* Conflicting formats require review. */
          }
        } else if (previous.startsWith("'") && previous.endsWith("'"))
          previous = previous.slice(1, -1);
        if (previous !== value)
          throw new Error(
            `Existing runtime value for ${key} differs. Reconcile it before configuring.`,
          );
      } else
        content += `${content && !content.endsWith('\n') ? '\n' : ''}${key}=${JSON.stringify(value)}\n`;
    }
    writes.push({ file, content, relative });
  }
  for (const { file, content } of writes) {
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      writeFileSync(temporary, content, { mode: 0o600, flag: 'wx' });
      renameSync(temporary, file);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
  atomicJson(path.join(root, '.anhedral/runtime.json'), {
    schemaVersion: 1,
    configuration: digest(providerConfiguration(root)),
    values,
  });
  return writes.map((write) => write.relative);
}

export function configuredRuntime(root: string): RuntimeValues {
  const file = path.join(root, '.anhedral/runtime.json');
  if (!existsSync(file)) return {};
  if (realpathSync(path.dirname(file)) !== path.join(realpathSync(root), '.anhedral'))
    throw new Error('Runtime state directory must not be a symbolic link.');
  if (process.platform !== 'win32' && lstatSync(file).mode & 0o077)
    throw new Error('Runtime state permissions must be 0600.');
  const state = JSON.parse(readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8'));
  if (state.schemaVersion !== 1 || state.configuration !== digest(providerConfiguration(root)))
    throw new Error('Runtime configuration does not match the selected provider configuration.');
  validateValues(state.values);
  return state.values;
}

function applicationValue(content: string, key: string): string {
  const matches = content
    .split(/\r?\n/)
    .filter((line) => new RegExp(`^\\s*(?:export\\s+)?${key}\\s*=`).test(line));
  if (matches.length !== 1)
    throw new Error(`Configure exactly one ${key} in the application's private runtime file.`);
  const raw = matches[0].slice(matches[0].indexOf('=') + 1).trim();
  let value: unknown;
  if (raw.startsWith('"')) {
    try {
      value = JSON.parse(raw);
    } catch {
      throw new Error(`Use a valid quoted value for ${key}.`);
    }
  } else if (raw.startsWith("'")) {
    if (!raw.endsWith("'") || raw.length < 2)
      throw new Error(`Use a valid quoted value for ${key}.`);
    value = raw.slice(1, -1);
  } else value = raw.replace(/\s+#.*$/, '').trim();
  if (typeof value !== 'string' || !value || value.length > 16384 || /[\r\n\x00]/.test(value))
    throw new Error(`Configure a valid ${key} in the application's private runtime file.`);
  return value;
}

function publicAuthOrigin(value: string): boolean {
  if (/[\\\s]/.test(value)) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  const hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  // Authentication callbacks must target a public deployment, not local development.
  return (
    url.protocol === 'https:' &&
    !url.username &&
    !url.password &&
    !url.search &&
    !url.hash &&
    url.pathname === '/' &&
    !isIP(hostname.replace(/^\[|\]$/g, '')) &&
    hostname.includes('.') &&
    !['localhost', 'local', 'internal', 'test', 'invalid', 'example'].some(
      (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
    )
  );
}

/** Read application-owned credentials separately from integration receipts. Never write,
 * return unrelated environment keys, or copy server secrets to other targets. */
export async function applicationRuntime(
  root: string,
  run: DeliveryRunner,
): Promise<Record<string, RuntimeValues>> {
  root = realpathSync(root);
  const setup: unknown = readProjectSection(root, 'setup');
  validateSetupPlan(setup);
  const betterAuth = setup.products.includes('better-auth');
  const neonRealtime = setup.products.includes('neon-realtime');
  const keys = [
    ...(betterAuth ? ['BETTER_AUTH_SECRET', 'BETTER_AUTH_URL'] : []),
    ...(neonRealtime ? ['NEON_REALTIME_SECRET'] : []),
  ];
  if (!keys.length) return {};
  const runtime = setup.products.includes('hono') ? 'api' : 'web';
  const relative = serverRuntimeFile(root, runtime, setup.hosting);
  const file = path.join(root, relative);
  if (!existsSync(file))
    throw new Error(`Configure ${keys.join(' and ')} in ignored ${relative} before shipping.`);
  if (
    realpathSync(path.dirname(file)) !== path.dirname(file) ||
    !lstatSync(file).isFile() ||
    lstatSync(file).isSymbolicLink()
  )
    throw new Error('Application runtime files must be regular files without symbolic links.');
  if (process.platform !== 'win32' && lstatSync(file).mode & 0o077)
    throw new Error('Application runtime file permissions must be 0600 before shipping.');
  if ((await run('git', ['ls-files', '--', relative], root, process.env)).trim())
    throw new Error('Application runtime files must not be tracked.');
  if (
    (await run('git', ['check-ignore', '--no-index', '--', relative], root, process.env)).trim() !==
    relative
  )
    throw new Error('Ignore application runtime files before shipping.');
  if (
    !relative.endsWith('/.env.local') &&
    (existsSync(path.join(path.dirname(file), 'wrangler.jsonc')) ||
      existsSync(path.join(path.dirname(file), 'anhedral.cloudflare.json')))
  ) {
    const config = readConfig(path.dirname(file));
    if (
      config.vars &&
      typeof config.vars === 'object' &&
      keys.some((key) => Object.hasOwn(config.vars as object, key))
    )
      throw new Error(
        `Remove ${neonRealtime ? 'application runtime' : 'Better Auth'} values from tracked Wrangler vars, review and commit that change, then configure the private runtime file before shipping.`,
      );
  }
  const content = readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8');
  const values: RuntimeValues = {};
  if (betterAuth) {
    const secret = applicationValue(content, 'BETTER_AUTH_SECRET');
    if (
      secret.length < 32 ||
      /change.?me|replace.?me|placeholder|your.?secret|example|generate.?me/i.test(secret) ||
      new Set(secret).size < 8
    )
      throw new Error(
        'BETTER_AUTH_SECRET requires a generated nonplaceholder secret of at least 32 characters.',
      );
    const origin = applicationValue(content, 'BETTER_AUTH_URL');
    if (!publicAuthOrigin(origin))
      throw new Error(
        'BETTER_AUTH_URL must be an HTTPS public origin without credentials, path, query or fragment.',
      );
    Object.assign(values, { BETTER_AUTH_SECRET: secret, BETTER_AUTH_URL: origin });
  }
  if (neonRealtime) {
    const secret = applicationValue(content, 'NEON_REALTIME_SECRET');
    if (/change.?me|replace.?me|placeholder|your.?secret|example|generate.?me/i.test(secret))
      throw new Error(
        'Configure the nonplaceholder NEON_REALTIME_SECRET from the intended Neon Realtime service.',
      );
    values.NEON_REALTIME_SECRET = secret;
  }
  return { [relative]: values };
}
