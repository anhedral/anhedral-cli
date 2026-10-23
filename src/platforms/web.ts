import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resourceName, childPackageName, jsString } from '../render.js';
import { WEB_DEPENDENCIES } from '../dependencies.js';
import type { RecipeContext } from '../registry/types.js';
import { json, put, workerConfig } from '../scaffold/files.js';

export function scaffoldWeb({ root, options }: RecipeContext): void {
  const app = 'apps/web';
  json(root, `${app}/package.json`, {
    name: childPackageName(options.name, 'web'),
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'next dev --turbopack --hostname 0.0.0.0 --port 3000',
      'build:next': 'next build --webpack',
      build: 'opennextjs-cloudflare build && pnpm build:worker',
      'build:worker': 'wrangler deploy --dry-run --outdir dist',
      preview: 'wrangler dev --port 3000 --inspector-port 9230',
      deploy: 'wrangler deploy',
      start: 'next start --hostname 0.0.0.0 --port 3000',
      typecheck: 'next typegen && tsc --noEmit',
      lint: 'eslint . --max-warnings 0',
    },
    dependencies: {
      ...WEB_DEPENDENCIES.dependencies,
      '@workspace/contracts': 'workspace:*',
      '@workspace/styling': 'workspace:*',
    },
    devDependencies: {
      ...WEB_DEPENDENCIES.devDependencies,
      '@workspace/eslint-config': 'workspace:*',
    },
  });
  json(root, `${app}/wrangler.jsonc`, {
    ...workerConfig(resourceName(options.name, 'web')),
    main: '.open-next/worker.js',
    compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
    assets: { directory: '.open-next/assets', binding: 'ASSETS' },
    services: [
      { binding: 'ANHEDRAL_API', service: resourceName(options.name, 'api') },
      { binding: 'WORKER_SELF_REFERENCE', service: resourceName(options.name, 'web') },
    ],
  });
  put(
    root,
    `${app}/next.config.ts`,
    `import type { NextConfig } from 'next';
const previewOrigin = process.env.NODE_ENV === 'development' ? process.env.ANHEDRAL_PREVIEW_ORIGIN : undefined;
let allowedDevOrigins: string[] = [];
if (previewOrigin) {
  const url = new URL(previewOrigin);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('ANHEDRAL_PREVIEW_ORIGIN must be an HTTP(S) origin.');
  allowedDevOrigins = [url.hostname];
}
const config: NextConfig = { allowedDevOrigins, transpilePackages: ['@workspace/contracts', '@workspace/styling'], images: { unoptimized: true } };
export default config;
`,
  );
  put(
    root,
    `${app}/open-next.config.ts`,
    `import { defineCloudflareConfig } from '@opennextjs/cloudflare';
const config = { ...defineCloudflareConfig(), buildCommand: 'pnpm build:next' };
export default config;
`,
  );
  json(root, `${app}/tsconfig.json`, {
    compilerOptions: {
      target: 'ES2022',
      lib: ['DOM', 'DOM.Iterable', 'ES2022'],
      allowJs: true,
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'react-jsx',
      incremental: true,
      plugins: [{ name: 'next' }],
      paths: { '@/*': ['./*'] },
    },
    include: [
      'next-env.d.ts',
      '**/*.ts',
      '**/*.tsx',
      '.next/types/**/*.ts',
      '.next/dev/types/**/*.ts',
    ],
    exclude: ['node_modules', '.open-next', 'dist'],
  });
  put(
    root,
    `${app}/next-env.d.ts`,
    '/// <reference types="next" />\n/// <reference types="next/image-types/global" />\n',
  );
  put(
    root,
    `${app}/eslint.config.mjs`,
    `import { defineConfig, globalIgnores } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';
import ts from 'eslint-config-next/typescript';
export default defineConfig([...next, ...ts, globalIgnores(['.next/**', '.open-next/**', 'dist/**', 'next-env.d.ts', 'worker-configuration.d.ts'])]);
`,
  );
  json(root, `${app}/components.json`, {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'base-nova',
    rsc: true,
    tsx: true,
    tailwind: { config: '', css: 'app/globals.css', baseColor: 'neutral', cssVariables: true },
    aliases: {
      components: '@/components',
      ui: '@/components/ui',
      utils: '@/lib/utils',
      lib: '@/lib',
      hooks: '@/hooks',
    },
    iconLibrary: 'lucide',
  });
  put(
    root,
    `${app}/lib/utils.ts`,
    `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...values: ClassValue[]) { return twMerge(clsx(values)); }
`,
  );
  put(
    root,
    `${app}/components/ui/button.tsx`,
    readFileSync(fileURLToPath(new URL('../../assets/ui/web/button.tsx', import.meta.url)), 'utf8'),
  );
  for (const file of ['LICENSE.shadcn', 'UPSTREAM.json'])
    put(
      root,
      `${app}/${file}`,
      readFileSync(fileURLToPath(new URL(`../../assets/ui/${file}`, import.meta.url)), 'utf8'),
    );
  put(
    root,
    `${app}/postcss.config.mjs`,
    "const config = { plugins: { '@tailwindcss/postcss': {} } };\nexport default config;\n",
  );
  put(
    root,
    `${app}/app/globals.css`,
    `@import 'tailwindcss';
@import '@workspace/styling/globals.css';
@theme inline {
  --color-background: hsl(var(--background)); --color-foreground: hsl(var(--foreground));
  --color-primary: hsl(var(--primary)); --color-primary-foreground: hsl(var(--primary-foreground));
  --color-secondary: hsl(var(--secondary)); --color-secondary-foreground: hsl(var(--secondary-foreground));
  --color-muted: hsl(var(--muted)); --color-muted-foreground: hsl(var(--muted-foreground));
  --color-border: hsl(var(--border)); --color-input: hsl(var(--input)); --color-ring: hsl(var(--ring));
  --color-destructive: hsl(var(--destructive)); --radius-md: var(--radius); --radius-lg: calc(var(--radius) + 2px);
}

* { box-sizing: border-box; } body { margin: 0; background: hsl(var(--background)); color: hsl(var(--foreground)); font-family: Arial, Helvetica, sans-serif; }
h1 { font-size: 2rem; font-weight: 600; line-height: 1.2; letter-spacing: -.025em; } h2 { font-size: 1.25rem; font-weight: 600; line-height: 1.4; }
main { max-width: 64rem; margin: 0 auto; padding: 4rem 1.5rem; } nav, form, .stack { display: flex; gap: 1rem; } form, .stack { flex-direction: column; } form { max-width: 26rem; } label { display: grid; gap: .5rem; }
a { color: inherit; } .button, input { min-height: 2.75rem; padding: .65rem 1rem; border: 1px solid hsl(var(--border)); border-radius: var(--radius); font: inherit; }
.button { cursor: pointer; background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); } .button:disabled { opacity: .5; cursor: default; } input { background: hsl(var(--background)); color: inherit; }
:focus-visible { outline: 2px solid hsl(var(--ring)); outline-offset: 3px; } .muted { color: hsl(var(--muted-foreground)); }
`,
  );
  put(
    root,
    `${app}/app/layout.tsx`,
    `import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';
export const metadata: Metadata = { title: ${jsString(options.name)}, description: 'Anhedral application' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><main><nav aria-label="Main"><Link href="/">Home</Link><Link href="/account">Account</Link></nav>{children}</main></body></html>; }
`,
  );
  put(
    root,
    `${app}/app/page.tsx`,
    `import { headers } from 'next/headers';
export default async function Home() {
  const request = await headers();
  return <section className="stack"><h1>${escapeJsx(options.name)}</h1><p>Next.js on Cloudflare, with a shared Hono API.</p><p className="muted" data-rendering="server">Rendered on the server for {request.get('host') ?? 'this request'}.</p></section>;
}
`,
  );
  put(
    root,
    `${app}/app/loading.tsx`,
    `export default function Loading() { return <p role="status">Loading…</p>; }\n`,
  );
  put(
    root,
    `${app}/app/error.tsx`,
    `'use client';\nexport default function ErrorPage({ reset }: { reset: () => void }) { return <section><h1>Unable to load this page</h1><button onClick={reset}>Try again</button></section>; }\n`,
  );
  put(root, `${app}/lib/api-proxy.ts`, WEB_API_PROXY);
  put(
    root,
    `${app}/lib/server-api.ts`,
    `import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { proxyApi, type ApiBinding } from './api-proxy';
function isApiBinding(value: unknown): value is ApiBinding {
  return typeof value === 'object' && value !== null && typeof Reflect.get(value, 'fetch') === 'function';
}
async function productionBinding(): Promise<ApiBinding | undefined> {
  const { env } = await getCloudflareContext({ async: true });
  const candidate: unknown = Reflect.get(env, 'ANHEDRAL_API');
  return isApiBinding(candidate) ? candidate : undefined;
}
export async function apiRequest(request: Request): Promise<Response> {
  const development = process.env.NODE_ENV === 'development';
  const binding = development ? undefined : await productionBinding();
  return proxyApi(request, { binding, development, devOrigin: process.env.API_INTERNAL_URL });
}
`,
  );
  put(
    root,
    `${app}/app/api/[[...path]]/route.ts`,
    `import { apiRequest } from '@/lib/server-api';
export const dynamic = 'force-dynamic';
export const GET = apiRequest;
export const POST = apiRequest;
export const PUT = apiRequest;
export const PATCH = apiRequest;
export const DELETE = apiRequest;
export const HEAD = apiRequest;
export const OPTIONS = apiRequest;
`,
  );
  put(
    root,
    `${app}/lib/auth-client.ts`,
    `import { createAuthClient } from 'better-auth/react';\nexport const authClient = createAuthClient();\n`,
  );
  put(root, `${app}/app/sign-in/page.tsx`, WEB_SIGN_IN);
  put(
    root,
    `${app}/components/sign-out.tsx`,
    `'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
export function SignOut() { const [error, setError] = useState(''); const [pending, setPending] = useState(false); const router = useRouter();
  async function logout() { setPending(true); setError(''); try { const result = await authClient.signOut(); if (result.error) throw Error('Unable to sign out.'); router.replace('/sign-in'); router.refresh(); } catch { setError('Unable to sign out. Please retry.'); } finally { setPending(false); } }
  return <><Button disabled={pending} onClick={() => void logout()}>{pending ? 'Signing out…' : 'Sign out'}</Button><p role="status">{error}</p></>; }
`,
  );
  put(
    root,
    `${app}/app/account/page.tsx`,
    `import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { sessionSchema } from '@workspace/contracts';
import { apiRequest } from '@/lib/server-api';
import { SignOut } from '@/components/sign-out';
export default async function Account() {
  const incoming = await headers();
  const response = await apiRequest(new Request('https://app.internal/api/session', { headers: { cookie: incoming.get('cookie') ?? '' } }));
  if (response.status === 401) redirect('/sign-in');
  if (!response.ok) throw Error('Session verification is unavailable.');
  const { user } = sessionSchema.parse(await response.json());
  return <section className="stack"><h1>Account</h1><p>{user.email}</p><SignOut /></section>;
}
`,
  );
  put(
    root,
    `${app}/.env.example`,
    '# Development only. Production uses the ANHEDRAL_API service binding.\nAPI_INTERNAL_URL=http://127.0.0.1:8787\n',
  );
}
function escapeJsx(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('{', '&#123;')
    .replaceAll('}', '&#125;');
}

export const WEB_API_PROXY = `export interface ApiBinding { fetch(request: Request): Promise<Response> }
type Options = { binding?: ApiBinding; development: boolean; devOrigin?: string; send?: typeof fetch };
function developmentOrigin(configured?: string): string {
  const url = new URL(configured || 'http://127.0.0.1:8787');
  const loopback = new Set(['127.0.0.1', 'localhost', '[::1]']);
  const invalid = [url.protocol !== 'http:', !loopback.has(url.hostname), url.username, url.password, url.pathname !== '/', url.search, url.hash];
  if (invalid.some(Boolean)) throw Error('API_INTERNAL_URL must be a loopback HTTP origin.');
  return url.origin;
}
function backendOrigin(options: Options): string {
  if (options.development) return developmentOrigin(options.devOrigin);
  if ([!options.binding, options.devOrigin].some(Boolean)) throw Error('Production requires the API service binding.');
  return 'https://api.internal';
}
function apiTarget(request: Request, origin: string): URL {
  const url = new URL(request.url);
  if (!/^\\/api(?:\\/|$)/.test(url.pathname)) throw Error('Unexpected API path.');
  return new URL(url.pathname + url.search, origin);
}
function forwardedHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'origin', 'authorization', 'sec-fetch-site', 'expo-origin', 'idempotency-key']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  return headers;
}
function upstreamRequest(request: Request, target: URL): Request {
  const settings: RequestInit & { duplex?: 'half' } = { method: request.method, headers: forwardedHeaders(request), redirect: 'manual', signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) };
  if (!['GET', 'HEAD'].includes(request.method)) { settings.body = request.body; settings.duplex = 'half'; }
  return new Request(target, settings);
}
function privateResponse(response: Response, development: boolean): Response {
  const headers = new Headers(response.headers);
  for (const name of ['connection', 'transfer-encoding', 'access-control-allow-origin', 'access-control-allow-credentials']) headers.delete(name);
  // Node fetch already decoded the local HTTP response. Next must frame/compress
  // those decoded bytes itself; the sidecar's wire headers no longer describe them.
  if (development) { headers.delete('content-encoding'); headers.delete('content-length'); }
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, headers });
}
export async function proxyApi(request: Request, options: Options): Promise<Response> {
  try {
    const upstream = upstreamRequest(request, apiTarget(request, backendOrigin(options)));
    const response = options.development ? await (options.send ?? fetch)(upstream) : await options.binding!.fetch(upstream);
    return privateResponse(response, options.development);
  } catch { return Response.json({ error: 'API unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store' } }); }
}
`;
const WEB_SIGN_IN = `'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
async function authenticate(data: FormData, create: boolean) {
  const email = String(data.get('email')); const password = String(data.get('password')); const name = String(data.get('name'));
  const result = create ? await authClient.signUp.email({ email, password, name }) : await authClient.signIn.email({ email, password });
  if (result.error) throw Error('Sign in failed.');
}
export default function SignIn() {
  const router = useRouter(); const [create, setCreate] = useState(false); const [pending, setPending] = useState(false); const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (pending) return; setPending(true); setError('');
    const data = new FormData(event.currentTarget);
    try { await authenticate(data, create); router.replace('/account'); router.refresh(); } catch { setError('Unable to sign in. Check your details and retry.'); } finally { setPending(false); }
  }
  const labels = create ? { title: 'Create account', password: 'new-password', toggle: 'Use an existing account' } : { title: 'Sign in', password: 'current-password', toggle: 'Create an account' };
  return <section className="stack"><h1>{labels.title}</h1><form onSubmit={submit}>{create && <label>Name<input name="name" required autoComplete="name" /></label>}<label>Email<input name="email" type="email" required autoComplete="email" /></label><label>Password<input name="password" type="password" minLength={8} required autoComplete={labels.password} /></label><Button type="submit" disabled={pending}>{pending ? 'Working…' : labels.title}</Button></form><p role="status">{error}</p><Button type="button" onClick={() => setCreate(!create)}>{labels.toggle}</Button></section>;
}
`;
