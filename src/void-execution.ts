import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { type DeliveryRunner } from './project-state.js';
import { prepareVoidMigrations } from './void-migrations.js';
import { VOID_VERSION, supportsVoidRuntime } from './void.js';

/** Validate the local pin: never download or execute an unpinned fallback during delivery. */
async function assertVoidInstallation(
  directory: string,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
) {
  const version = (await run('node', ['-p', 'process.versions.node'], directory, env)).trim();
  if (!supportsVoidRuntime(version)) throw new Error('Void delivery requires Node >=24.21.0.');
  const pkg = JSON.parse(readFileSync(path.join(directory, 'package.json'), 'utf8'));
  if ((pkg.dependencies?.void ?? pkg.devDependencies?.void) !== VOID_VERSION)
    throw new Error(`Void delivery requires the exact local void@${VOID_VERSION} dependency.`);
  const installed = (await run('pnpm', ['exec', 'void', '--version'], directory, env)).trim();
  if (installed !== VOID_VERSION)
    throw new Error(`Installed Void version differs from required ${VOID_VERSION}.`);
}

/** Bridge the already verified Wrangler identity into Void's separate cf process. */
export async function voidCloudflareEnvironment(
  directory: string,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
): Promise<NodeJS.ProcessEnv> {
  if (env.CLOUDFLARE_API_TOKEN) return env;
  let credentials: unknown;
  try {
    const raw = await run('pnpm', ['exec', 'wrangler', 'auth', 'token', '--json'], directory, env);
    if (Buffer.byteLength(raw) > 64 * 1024) throw new Error();
    credentials = JSON.parse(raw);
  } catch {
    throw new Error('Cannot retrieve structured Cloudflare credentials for Void delivery.');
  }
  if (!credentials || typeof credentials !== 'object' || Array.isArray(credentials))
    throw new Error('Void requires scoped Cloudflare API-token or OAuth access.');
  const credential = credentials as Record<string, unknown>;
  if (
    !['oauth', 'api_token'].includes(String(credential.type)) ||
    typeof credential.token !== 'string' ||
    !/^[\x21-\x7e]{1,16384}$/.test(credential.token)
  )
    throw new Error('Void requires scoped Cloudflare API-token or OAuth access.');
  return { ...env, CLOUDFLARE_API_TOKEN: credential.token };
}

/** Pin direct Cloudflare operations before secrets on a fresh checkout. */
function selectVoidCloudflare(directory: string) {
  const folder = path.join(directory, '.void');
  const file = path.join(folder, 'project.json');
  if (existsSync(file)) {
    const selection = JSON.parse(readFileSync(file, 'utf8'));
    if (selection.platform !== 'cloudflare')
      throw new Error(
        'Void operation target must explicitly select the customer Cloudflare account.',
      );
    return;
  }
  mkdirSync(folder, { recursive: true, mode: 0o700 });
  writeFileSync(file, JSON.stringify({ platform: 'cloudflare' }) + '\n', {
    mode: 0o600,
    flag: 'wx',
  });
}

export function voidServerSecrets(values: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(values).filter(
      ([key]) =>
        !['VITE_', 'NEXT_PUBLIC_', 'EXPO_PUBLIC_'].some((prefix) => key.startsWith(prefix)),
    ),
  );
}

/** Secret put is noninteractive with stdin; sync prompts even in CI in void@0.27. */
export async function syncVoidSecrets(
  directory: string,
  values: Record<string, string>,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
  beforeMutation?: () => Promise<void>,
) {
  for (const [key, value] of Object.entries(values)) {
    if (
      !/^[A-Z][A-Z0-9_]*$/.test(key) ||
      ['VITE_', 'NEXT_PUBLIC_', 'EXPO_PUBLIC_'].some((prefix) => key.startsWith(prefix))
    )
      throw new Error('Void production secrets must be declared server environment keys.');
    if (typeof value !== 'string' || !value.length || value.includes('\0') || value.endsWith('\n'))
      throw new Error(
        'Void secret values must be nonempty strings without NUL bytes or terminal newlines.',
      );
  }
  if (!Object.keys(values).length) return;
  selectVoidCloudflare(directory);
  await assertVoidInstallation(directory, run, env);
  const authenticated = await voidCloudflareEnvironment(directory, run, env);
  for (const [key, value] of Object.entries(values)) {
    selectVoidCloudflare(directory);
    await beforeMutation?.();
    await run('pnpm', ['exec', 'void', 'secret', 'put', key], directory, authenticated, value);
  }
}

export async function deployVoidTarget(
  directory: string,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
) {
  await assertVoidInstallation(directory, run, env);
  if (existsSync(path.join(directory, 'anhedral.cloudflare.json')))
    prepareVoidMigrations(
      path.resolve(directory, '../..'),
      directory,
      JSON.parse(readFileSync(path.join(directory, 'anhedral.cloudflare.json'), 'utf8')),
    );
  const authenticated = await voidCloudflareEnvironment(directory, run, env);
  return run(
    'pnpm',
    ['exec', 'void', 'deploy', '--platform', 'cloudflare'],
    directory,
    authenticated,
  );
}

export async function rollbackVoidTarget(
  directory: string,
  versionId: string,
  run: DeliveryRunner,
  env: NodeJS.ProcessEnv,
) {
  if (!/^[a-f0-9-]{36}$/i.test(versionId))
    throw new Error('Void rollback requires a complete Worker Version ID.');
  selectVoidCloudflare(directory);
  await assertVoidInstallation(directory, run, env);
  const authenticated = await voidCloudflareEnvironment(directory, run, env);
  return run('pnpm', ['exec', 'void', 'project', 'rollback', versionId], directory, authenticated);
}
