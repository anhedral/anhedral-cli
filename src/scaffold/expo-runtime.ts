import { writeEnvironmentFile } from './environment.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import { resourceName } from '../render.js';
import type { RecipeContext } from '../registry/types.js';
import { json, patchPackage, put, workerConfig } from './files.js';

/** Expo remains a static universal client. Its Worker owns only assets and API transport. */
export function scaffoldExpoRuntime({ root, options, has }: RecipeContext): void {
  const directory = 'apps/mobile';
  const api = has('hono');
  const webPort = 3000;
  json(root, `${directory}/wrangler.jsonc`, {
    ...workerConfig(resourceName(options.name, 'mobile')),
    main: 'worker/index.ts',
    assets: {
      directory: './dist',
      binding: 'ASSETS',
      run_worker_first: ['/api', '/api/*'],
      html_handling: 'auto-trailing-slash',
      not_found_handling: '404-page',
    },
    ...(api ? { services: [{ binding: 'API', service: resourceName(options.name, 'api') }] } : {}),
  });
  patchPackage(root, `${directory}/package.json`, {
    scripts: {
      dev: `pnpm build:web && wrangler dev --port ${webPort} --inspector-port 9230`,
      start: 'expo start -c',
      web: 'pnpm dev',
      build: 'pnpm typecheck && pnpm build:web && pnpm build:worker',
      'build:worker': 'wrangler deploy --dry-run --outdir .output/worker',
      preview: `pnpm build:web && wrangler dev --port ${webPort} --inspector-port 9230`,
      deploy: 'pnpm build:web && wrangler deploy',
      typecheck: 'tsc --noEmit && pnpm typecheck:worker',
      'typecheck:worker': 'tsc --project tsconfig.worker.json --noEmit',
      lint: 'eslint app components lib worker --max-warnings 0',
    },
    ...(api ? { dependencies: { '@workspace/contracts': 'workspace:*' } } : {}),
    devDependencies: { wrangler: STACK_DEPENDENCIES.wrangler },
  });
  json(root, `${directory}/tsconfig.worker.json`, {
    compilerOptions: {
      target: 'ES2022',
      lib: ['ES2022', 'DOM', 'DOM.Iterable'],
      module: 'ESNext',
      moduleResolution: 'Bundler',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
      types: [],
    },
    include: ['worker/**/*.ts'],
  });
  put(
    root,
    `${directory}/worker/index.ts`,
    `interface Binding { fetch(request: Request): Promise<Response> }
interface Env { ASSETS: Binding; ${api ? 'API: Binding;' : ''} }

${
  api
    ? `// Browser-supplied edge identity headers never cross the API boundary.
function forwardedHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'content-length', 'cookie', 'origin', 'authorization', 'sec-fetch-site', 'expo-origin', 'idempotency-key']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}
function privateResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const name of ['connection', 'transfer-encoding', 'access-control-allow-origin', 'access-control-allow-credentials']) headers.delete(name);
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, headers });
}
async function proxyApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL('https://api.internal');
  target.pathname = url.pathname;
  target.search = url.search;
  try {
    const upstream = new Request(new Request(target, request), {
      headers: forwardedHeaders(request), redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    });
    return privateResponse(await env.API.fetch(upstream));
  } catch {
    return Response.json({ error: 'API unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store' } });
  }
}
`
    : ''
}
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const apiPath = pathname === '/api' || pathname.startsWith('/api/');
    if (!apiPath) return env.ASSETS.fetch(request);
    ${api ? 'return proxyApi(request, env);' : "return Response.json({ error: 'API not configured' }, { status: 404, headers: { 'cache-control': 'private, no-store' } });"}
  },
};
`,
  );
  if (!api) return;
  put(
    root,
    `${directory}/lib/api-client.ts`,
    `import { Platform } from 'react-native';
import { createApiClient } from '@workspace/contracts';

type Options = NonNullable<Parameters<typeof createApiClient>[1]>;

function validProtocol(url: URL): boolean {
  return url.protocol === 'https:' || (__DEV__ && url.protocol === 'http:');
}
export function nativeApiOrigin(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL;
  if (!configured) throw new Error('Configure EXPO_PUBLIC_API_URL with the product origin reachable from this device.');
  const origin = new URL(configured);
  if (!validProtocol(origin)) throw new Error('EXPO_PUBLIC_API_URL requires HTTPS outside development.');
  if ([origin.username, origin.password, origin.pathname !== '/', origin.search, origin.hash].some(Boolean))
    throw new Error('EXPO_PUBLIC_API_URL must be an origin without credentials, path, query or fragment.');
  return origin.origin;
}
function apiBaseURL(): string {
  if (Platform.OS === 'web') return '/api';
  return nativeApiOrigin() + '/api';
}

// A native auth adapter can provide its own session headers. No server secret belongs here.
export function createApplicationApiClient(options: Options = {}) {
  const client = () => createApiClient(apiBaseURL(), {
    ...options, credentials: Platform.OS === 'web' ? 'same-origin' : 'omit',
  });
  return {
    health: (init?: RequestInit) => client().health(init),
    session: (init?: RequestInit) => client().session(init),
  };
}

export const api = createApplicationApiClient();
`,
  );
  writeEnvironmentFile(root, `${directory}/.env.example`, { EXPO_PUBLIC_API_URL: '' });
}
