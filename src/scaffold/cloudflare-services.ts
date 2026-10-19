import { STACK_DEPENDENCIES } from '../dependencies.js';
import { rmSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { RecipeContext } from '../registry/types.js';
import { patchPackage, put, sharedPackage } from './files.js';
import { writeEnvironmentFile } from './environment.js';

/** Server-only packages are linked to their owner, never to client manifests. */
function serverPackage(
  context: RecipeContext,
  name: string,
  source: string,
  guide: string,
  secrets: string[] = [],
): void {
  const { root, runtimeApp } = context;
  sharedPackage(root, name, '', {});
  rmSync(path.join(root, `packages/${name}/src/index.ts`));
  patchPackage(root, `packages/${name}/package.json`, {
    exports: { './server': './src/server.ts' },
  });
  put(root, `packages/${name}/src/server.ts`, source);
  put(root, `packages/${name}/README.md`, guide);
  patchPackage(root, `apps/${runtimeApp}/package.json`, {
    dependencies: { [`@workspace/${name}`]: 'workspace:*' },
  });
  if (['video', 'realtimekit'].includes(name))
    patchPackage(root, `packages/${name}/package.json`, {
      dependencies: { '@workspace/cloudflare-api': 'workspace:*', zod: STACK_DEPENDENCIES.zod },
    });
  if (secrets.length) {
    writeEnvironmentFile(
      root,
      `apps/${runtimeApp}/.dev.vars.example`,
      Object.fromEntries(secrets.map((key) => [key, ''])),
    );
    put(
      root,
      `apps/${runtimeApp}/src/${name}-secrets.d.ts`,
      `interface Env { ${secrets.map((key) => `${key}: string;`).join(' ')} }\n`,
    );
  }
}

export function scaffoldAnalyticsEngine(context: RecipeContext): void {
  serverPackage(
    context,
    'analytics-engine',
    `export interface AnalyticsBinding {
  writeDataPoint(point: { indexes: string[]; blobs: string[]; doubles: number[] }): void;
}
// Use a stable, non-sensitive tenant key. Never log credentials or raw user content.
export function recordEvent(binding: AnalyticsBinding, tenantKey: string, event: string, value = 1): void {
  if (!tenantKey || !event || !Number.isFinite(value)) throw new Error('Invalid analytics event.');
  binding.writeDataPoint({ indexes: [tenantKey], blobs: [event], doubles: [value] });
}
`,
    `# Workers Analytics Engine

In Hono product routes, use c.get('services').analytics(tenant, event, value), or import recordEvent from @workspace/analytics-engine/server and pass env.EVENTS, an authorized non-sensitive tenant key, a server-controlled event name and a numeric value. Define consent, retention and event semantics before recording production events. The helper does not create a public ingestion route. writeDataPoint is non-blocking; analytics is not a billing ledger or transactional quota authority. Verify dataset receipt and sampled SQL query semantics with the selected account. Dataset binding is configured on deployment; account activation and analytics read credentials remain explicit.

https://developers.cloudflare.com/analytics/analytics-engine/get-started/
`,
  );
}

export function scaffoldImages(context: RecipeContext): void {
  serverPackage(
    context,
    'images',
    `export interface ImagesBinding {
  input(stream: ReadableStream<Uint8Array>): {
    transform(options: { width: number; fit: 'scale-down' }): {
      output(options: { format: 'image/webp' }): Promise<{ response(): Response }>;
    };
  };
}
// Pass bytes from an already authorized R2 object, not an arbitrary caller URL.
export async function resizeImage(images: ImagesBinding, body: ReadableStream<Uint8Array>, width: number): Promise<Response> {
  if (!Number.isInteger(width) || width < 1 || width > 2048) throw new Error('Invalid image width.');
  const result = await images.input(body).transform({ width, fit: 'scale-down' }).output({ format: 'image/webp' });
  const response = result.response();
  response.headers.set('cache-control', 'private, no-store');
  return response;
}
`,
    `# Cloudflare Images

In Hono product routes, use c.get('services').images(body, width) after authorizing source access, or import resizeImage from @workspace/images/server with env.IMAGES and an R2 object's body. The binding transforms raw bytes; it is not an Images hosted-upload service or an R2 replacement. Public image caching requires a separate reviewed visibility/cache policy; private responses are no-store. Enforce upload size/type, allowed dimensions and usage limits in product routes. No public transform/upload endpoint is generated. Activate the selected account's Images entitlement and verify actual transforms before claiming acceptance.

https://developers.cloudflare.com/images/optimization/binding/
`,
  );
}

// Both services use fixed provider origins and redact provider responses in errors.
export function scaffoldCloudflareTransport({ root }: RecipeContext): void {
  sharedPackage(root, 'cloudflare-api', '', { zod: STACK_DEPENDENCIES.zod });
  rmSync(path.join(root, 'packages/cloudflare-api/src/index.ts'));
  patchPackage(root, 'packages/cloudflare-api/package.json', {
    exports: { './server': './src/server.ts' },
  });
  put(
    root,
    'packages/cloudflare-api/src/server.ts',
    `import { z } from 'zod';
const account = z.string().regex(/^[a-f0-9]{32}$/i);
const payload = z.record(z.string(), z.unknown());
const envelope = z.object({ success: z.literal(true), result: payload.optional(), data: payload.optional() });
function readResult(value: unknown): Record<string, unknown> {
  const parsed = envelope.safeParse(value);
  if (!parsed.success) throw new Error('Invalid Cloudflare service response.');
  const result = parsed.data.result ?? parsed.data.data;
  if (!result) throw new Error('Missing Cloudflare service response.');
  return result;
}
export function cloudflareClient(accountId: string, apiToken: string, service: string) {
  account.parse(accountId);
  z.string().trim().min(1).parse(apiToken);
  const base = 'https://api.cloudflare.com/client/v4/accounts/' + accountId + '/' + service;
  return async (route: string, body: unknown): Promise<Record<string, unknown>> => {
    const response = await fetch(base + route, { method: 'POST', redirect: 'error',
      headers: { authorization: 'Bearer ' + apiToken, 'content-type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error('Cloudflare service request failed (' + response.status + ').');
    const value = await response.json().catch(() => { throw new Error('Invalid Cloudflare JSON response.'); });
    return readResult(value);
  };
}
`,
  );
}
const cloudflareRequest =
  "import { cloudflareClient } from '@workspace/cloudflare-api/server';\nimport { z } from 'zod';\n";

export function scaffoldRealtimeKit(context: RecipeContext): void {
  serverPackage(
    context,
    'realtimekit',
    cloudflareRequest +
      `
export function createRealtimeKit(options: { accountId: string; appId: string; apiToken: string }) {
  z.string().regex(/^[a-zA-Z0-9_-]{1,128}$/).parse(options.appId);
  const request = cloudflareClient(options.accountId, options.apiToken, 'realtime/kit/' + options.appId);
  return {
    // Authorize meeting creation and persist its ID/owner. Reconcile uncertain creates before retrying.
    async createMeeting(title: string): Promise<{ id: string }> {
      z.string().trim().min(1).max(256).parse(title);
      const result = await request('/meetings', { title });
      return z.object({ id: z.string().min(1) }).parse(result);
    },
    // Derive subject and preset on the server after checking membership; never trust a requested role.
    async addParticipant(meetingId: string, subject: string, preset: string): Promise<{ id: string; token: string }> {
      z.uuid().parse(meetingId);
      z.string().min(1).parse(subject);
      z.string().min(1).parse(preset);
      const result = await request('/meetings/' + meetingId + '/participants', { custom_participant_id: subject, preset_name: preset });
      return z.object({ id: z.string().min(1), token: z.string().min(1) }).parse(result);
    },
  };
}
`,
    `# Cloudflare RealtimeKit

In Hono product routes, c.get('services').realtimekit() creates the server client lazily. Alternatively import createRealtimeKit from @workspace/realtimekit/server. Configure REALTIMEKIT_ACCOUNT_ID, REALTIMEKIT_APP_ID and server-only REALTIMEKIT_API_TOKEN (scoped Realtime permission). Activate/select the app and configure participant presets manually. After authenticating and authorizing membership, derive the participant subject/preset server-side, call addParticipant, and return only that participant's token with Cache-Control: no-store. Store meeting IDs with their tenant owner; reconcile uncertain creates before retrying. No public meeting/token endpoint is generated.

Install the platform-supported RealtimeKit client SDK and implement media UI separately. Media travels between clients and Cloudflare RealtimeKit, not through Hono or D1. Verify camera/microphone permissions, tenant isolation, token revocation/expiry, reconnect and track teardown on actual target devices. RealtimeKit conferencing is distinct from Durable Object messaging (--realtime) and Stream one-to-many video (--stream / --video). Source helpers do not activate the provider or establish working calls.

https://developers.cloudflare.com/realtime/realtimekit/quickstart/
`,
    ['REALTIMEKIT_ACCOUNT_ID', 'REALTIMEKIT_APP_ID', 'REALTIMEKIT_API_TOKEN'],
  );
}

export function scaffoldVideo(context: RecipeContext): void {
  serverPackage(
    context,
    'video',
    cloudflareRequest +
      `
export function createVideo(options: { accountId: string; apiToken: string }) {
  const request = cloudflareClient(options.accountId, options.apiToken, 'stream');
  return {
    // Authorize uploads and enforce tenant quotas before reserving Stream capacity.
    async createUpload(maxDurationSeconds: number): Promise<{ uid: string; uploadURL: string }> {
      z.number().int().min(1).max(3600).parse(maxDurationSeconds);
      const result = await request('/direct_upload', { maxDurationSeconds, requireSignedURLs: true,
        expiry: new Date(Date.now() + 15 * 60 * 1000).toISOString() });
      const value = z.object({ uid: z.string().min(1), uploadURL: z.url() }).parse(result);
      const url = new URL(value.uploadURL);
      z.literal('https:').parse(url.protocol);
      z.string().endsWith('.videodelivery.net').parse(url.hostname);
      z.literal('').parse(url.username + url.password);
      return value;
    },
  };
}
`,
    `# Cloudflare Stream video uploads

In Hono product routes, use c.get('services').video() after authorization. Alternatively import createVideo from @workspace/video/server with STREAM_ACCOUNT_ID and STREAM_API_TOKEN (Stream Write). This is on-demand uploaded video, separate from --stream's WHIP/WHEP live input helper. Authenticate/authorize creators, enforce tenant quotas, then issue a one-time direct upload URL; persist uid and ownership and return it only to the authorized creator with no-store. Basic POST uploads are limited to 200 MB; implement TUS separately for larger/unreliable uploads. Processing completion/webhooks, video UI, retention/deletion and private playback token issuance remain product work. Upload completion is not processing readiness. Signed playback is required by this helper; implement and verify short-lived viewer tokens before exposing playback. Do not proxy video bytes through Hono or expose the management token. Stream account activation and stored/delivered video billing are explicit owner setup, not init side effects.

https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/
`,
    ['STREAM_ACCOUNT_ID', 'STREAM_API_TOKEN'],
  );
}

/** Lazy Hono adapters wire selected helpers without exposing generic public routes. */
export function scaffoldCloudflareServiceContext({ root, has }: RecipeContext): void {
  const selected = ['analytics-engine', 'images', 'realtimekit', 'video'].filter(has);
  if (!selected.length) return;
  const imports: string[] = [];
  const adapters: string[] = [];
  if (has('analytics-engine')) {
    imports.push("import { recordEvent } from '@workspace/analytics-engine/server';");
    adapters.push(
      'analytics: (tenant: string, event: string, value = 1) => recordEvent(env.EVENTS, tenant, event, value)',
    );
  }
  if (has('images')) {
    imports.push("import { resizeImage } from '@workspace/images/server';");
    adapters.push(
      'images: (body: ReadableStream<Uint8Array>, width: number) => resizeImage(env.IMAGES, body, width)',
    );
  }
  if (has('realtimekit')) {
    imports.push("import { createRealtimeKit } from '@workspace/realtimekit/server';");
    adapters.push(
      'realtimekit: () => createRealtimeKit({ accountId: env.REALTIMEKIT_ACCOUNT_ID, appId: env.REALTIMEKIT_APP_ID, apiToken: env.REALTIMEKIT_API_TOKEN })',
    );
  }
  if (has('video')) {
    imports.push("import { createVideo } from '@workspace/video/server';");
    adapters.push(
      'video: () => createVideo({ accountId: env.STREAM_ACCOUNT_ID, apiToken: env.STREAM_API_TOKEN })',
    );
  }
  put(
    root,
    'apps/api/src/services.ts',
    imports.join('\n') +
      '\n\n// Call after product authorization and quota checks; no service is activated at startup.\nexport function createServices(env: Env) {\n  return {\n    ' +
      adapters.join(',\n    ') +
      ',\n  };\n}\n',
  );
  const file = 'apps/api/src/index.ts';
  let source = readFileSync(path.join(root, file), 'utf8');
  if (source.includes("import { createServices } from './services';")) return;
  source = "import { createServices } from './services';\n" + source;
  if (source.includes('Variables: {'))
    source = source.replace(
      'Variables: {',
      'Variables: { services: ReturnType<typeof createServices>;',
    );
  else
    source = source.replace(
      'Bindings: Env',
      'Bindings: Env; Variables: { services: ReturnType<typeof createServices> }',
    );
  source = source.replace(
    'const health = createRoute({',
    "// Product routes use c.get('services') after authorization.\napp.use('/api/*', async (c, next) => {\n  c.set('services', createServices(c.env));\n  await next();\n});\nconst health = createRoute({",
  );
  put(root, file, source);
}
