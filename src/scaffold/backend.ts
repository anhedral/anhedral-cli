import { existsSync } from 'node:fs';
import path from 'node:path';
import { resourceName } from '../render.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { json, patchPackage, put, readJson, sharedPackage } from './files.js';
import { writeEnvironmentFile } from './environment.js';

/** Public contracts never import a framework, database or auth server. */
export function scaffoldContracts(root: string): void {
  sharedPackage(
    root,
    'contracts',
    `import { z } from 'zod';
import { createHttpClient, type HttpOptions } from './http';

export const healthSchema = z.object({ ok: z.literal(true) });
export const sessionSchema = z.object({ user: z.object({ id: z.string(), name: z.string(), email: z.email() }) });
export type Session = z.infer<typeof sessionSchema>;

export function createApiClient(baseURL = '/api', options: HttpOptions = {}) {
  const request = createHttpClient(baseURL, options);
  return {
    health: (init?: RequestInit) => request('/health', healthSchema, init),
    session: (init?: RequestInit) => request('/session', sessionSchema, init),
  };
}
`,
    { zod: STACK_DEPENDENCIES.zod },
  );
  put(
    root,
    'packages/contracts/src/http.ts',
    `import type { z } from 'zod';

export interface HttpOptions {
  headers?: () => HeadersInit | Promise<HeadersInit>;
  credentials?: 'omit' | 'same-origin' | 'include';
}
export function createHttpClient(baseURL: string, options: HttpOptions = {}) {
  return async function request<T>(route: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(await options.headers?.());
    new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    headers.set('accept', 'application/json');
    // Worker fetch types omit the browser credentials member.
    const settings: RequestInit & { credentials: 'omit' | 'same-origin' | 'include' } = { ...init, credentials: options.credentials ?? 'same-origin', headers };
    const response = await fetch(baseURL.replace(/\\/$/, '') + route, settings);
    if (!response.ok) throw new Error('API request failed (' + response.status + ').');
    return schema.parse(await response.json());
  };
}
`,
  );
}

/** A single trusted upstream; never forward provider/edge identity headers from browsers. */
export function scaffoldWebBackend({ root, options, has }: RecipeContext): void {
  if (!has('hono')) return;
  if (has('better-auth')) {
    patchPackage(root, 'apps/web/package.json', {
      dependencies: { '@workspace/contracts': 'workspace:*' },
    });
    put(
      root,
      'apps/web/lib/api-client.ts',
      `import { createApiClient } from '@workspace/contracts';
export const api = createApiClient();
`,
    );
  }
  put(
    root,
    'apps/web/lib/api-proxy.ts',
    `type Transport = (request: Request) => Promise<Response>;
const forwardedHeaders = ['accept', 'content-type', 'cookie', 'origin', 'authorization', 'expo-origin', 'sec-fetch-site', 'idempotency-key'];
const removedHeaders = ['connection', 'transfer-encoding', 'access-control-allow-origin', 'access-control-allow-credentials'];
function isLocal(url: URL) {
  return url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
}
function trustedOrigin(origin: string) {
  const url = new URL(origin);
  if (url.protocol !== 'https:' && !isLocal(url)) throw new Error('Configure a trusted HTTPS API origin (HTTP is local-only).');
  if ([url.username, url.password, url.pathname.replace('/', ''), url.search, url.hash].some(Boolean)) {
    throw new Error('Configure a trusted HTTPS API origin without credentials or a path.');
  }
  return url;
}
function requestHeaders(request: Request) {
  const headers = new Headers();
  for (const name of forwardedHeaders) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}
function privateResponse(response: Response) {
  const headers = new Headers(response.headers);
  for (const name of removedHeaders) headers.delete(name);
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, headers });
}
export function createApiProxy(send: Transport, origin: string) {
  const upstream = trustedOrigin(origin);
  return async function proxy(request: Request): Promise<Response> {
    const path = new URL(request.url);
    if (!path.pathname.startsWith('/api/')) return new Response(null, { status: 404 });
    const target = new URL(upstream);
    target.pathname = path.pathname;
    target.search = path.search;
    try {
      const forwarded = new Request(new Request(target, request), {
        headers: requestHeaders(request), redirect: 'manual',
        signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
      });
      return privateResponse(await send(forwarded));
    } catch {
      return Response.json({ error: 'API unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store' } });
    }
  };
}
`,
  );
  const cloudflare = options.hosting === 'cloudflare';
  const binding = has('vinext')
    ? "import { env } from 'cloudflare:workers';"
    : "import { getCloudflareContext } from '@opennextjs/cloudflare';";
  const transport = cloudflare
    ? `${binding}
import { createApiProxy } from '@/lib/api-proxy';
async function handler(request: Request) {
  const bindings = ${has('vinext') ? 'env' : '(await getCloudflareContext({ async: true })).env'} as unknown as { API: { fetch(request: Request): Promise<Response> } };
  return createApiProxy((upstream) => bindings.API.fetch(upstream), 'https://localhost')(request);
}`
    : `import { apiTransport } from '@/lib/api-transport';
import { createApiProxy } from '@/lib/api-proxy';
async function handler(request: Request) {
  const origin = process.env.API_URL;
  if (!origin) return Response.json({ error: 'Configure API_URL' }, { status: 503 });
  return createApiProxy(apiTransport, origin)(request);
}`;
  put(
    root,
    'apps/web/app/api/[...path]/route.ts',
    `${transport}
export { handler as GET, handler as POST, handler as PUT, handler as PATCH, handler as DELETE, handler as OPTIONS, handler as HEAD };
`,
  );
  if (cloudflare) {
    const configFile = existsSync(path.join(root, 'apps/web/wrangler.jsonc'))
      ? 'apps/web/wrangler.jsonc'
      : 'apps/web/anhedral.cloudflare.json';
    const config = readJson(root, configFile);
    const services = (config.services ?? []) as { binding: string; service: string }[];
    json(root, configFile, {
      ...config,
      services: [
        ...services.filter((service) => service.binding !== 'API'),
        { binding: 'API', service: resourceName(options.name, 'api') },
      ],
    });
  } else {
    put(
      root,
      'apps/web/lib/api-transport.ts',
      `// Service credentials are server-only; never forward browser-supplied Access identity.
export function apiTransport(request: Request) {
  const id = process.env.API_ACCESS_CLIENT_ID;
  const secret = process.env.API_ACCESS_CLIENT_SECRET;
  if (Boolean(id) !== Boolean(secret)) throw new Error('Configure both API Access credentials.');
  const headers = new Headers(request.headers);
  if (id && secret) {
    headers.set('CF-Access-Client-Id', id);
    headers.set('CF-Access-Client-Secret', secret);
  }
  return fetch(request, { headers, redirect: 'manual' });
}
`,
    );
    writeEnvironmentFile(root, 'apps/web/.env.example', {
      API_URL: 'http://127.0.0.1:8787',
      API_ACCESS_CLIENT_ID: '',
      API_ACCESS_CLIENT_SECRET: '',
    });
  }
}

export function scaffoldWebAuth(root: string): void {
  patchPackage(root, 'apps/web/package.json', {
    dependencies: { 'better-auth': STACK_DEPENDENCIES['better-auth'] },
  });
  put(
    root,
    'apps/web/lib/auth-client.ts',
    `import { createAuthClient } from 'better-auth/react';
export const authClient = createAuthClient();
`,
  );
  put(
    root,
    'apps/web/app/sign-in/page.tsx',
    `'use client';

import { useState } from 'react';
import { Button } from '@workspace/ui/components/button';
import { api } from '@/lib/api-client';
import { authClient } from '@/lib/auth-client';

const modes = {
  signIn: { title: 'Sign in', password: 'current-password', name: false, next: 'signUp', toggle: 'Create an account' },
  signUp: { title: 'Create account', password: 'new-password', name: true, next: 'signIn', toggle: 'Use an existing account' },
} as const;
type Mode = keyof typeof modes;
function authenticate(mode: Mode, form: FormData) {
  const credentials = { email: String(form.get('email')), password: String(form.get('password')) };
  if (mode === 'signUp') return authClient.signUp.email({ ...credentials, name: String(form.get('name')) });
  return authClient.signIn.email(credentials);
}
function AuthForm({ refresh }: { refresh: () => Promise<unknown> }) {
  const [mode, setMode] = useState<Mode>('signIn');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  const fields = modes[mode];
  async function submit(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setMessage('');
    try {
      const result = await authenticate(mode, form);
      if (result.error) { setMessage(result.error.message ?? 'Sign in failed.'); return; }
      await api.session();
      await refresh();
    } catch { setMessage('Unable to reach the API.'); }
    finally { setPending(false); }
  }
  return <main className="mx-auto grid max-w-sm gap-4 p-6">
    <h1 className="text-xl font-medium">{fields.title}</h1>
    <form onSubmit={submit} className="grid gap-3">
      {fields.name && <label>Name<input className="block w-full rounded border p-2" name="name" autoComplete="name" required /></label>}
      <label>Email<input className="block w-full rounded border p-2" type="email" name="email" autoComplete="email" required /></label>
      <label>Password<input className="block w-full rounded border p-2" type="password" name="password" autoComplete={fields.password} minLength={8} required /></label>
      <Button type="submit" disabled={pending}>{pending ? 'Working…' : fields.title}</Button>
    </form>
    <p role="status">{message}</p>
    <Button variant="ghost" disabled={pending} onClick={() => { setMode(fields.next); setMessage(''); }}>{fields.toggle}</Button>
  </main>;
}
export default function SignInPage() {
  const { data: session, refetch } = authClient.useSession();
  if (!session) return <AuthForm refresh={refetch} />;
  return <main className="mx-auto grid max-w-sm gap-4 p-6">
    <h1 className="text-xl font-medium">Account</h1>
    <p>{session.user.email}</p>
    <Button onClick={async () => { await authClient.signOut(); await refetch(); }}>Sign out</Button>
  </main>;
}
`,
  );
}
