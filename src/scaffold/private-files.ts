/** Generated server code: the caller never selects the owner's R2 namespace. */
export const PRIVATE_FILES_SOURCE = `import { Hono } from 'hono';
import { createAuth } from '@workspace/auth';
import { createDatabase } from '@workspace/db';

const MAX_FILE_BYTES = 1024 * 1024;
type Identity = (request: Request, env: Env) => Promise<string | null>;
async function authenticate(request: Request, env: Env): Promise<string | null> {
  const session = await createAuth(createDatabase(env.DB), env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}
async function readFileBody(request: Request): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  return readFileStream(request.body);
}
async function readFileStream(body: ReadableStream<Uint8Array>): Promise<Uint8Array | null> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_FILE_BYTES) { await reader.cancel(); return null; }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return combineChunks(chunks, size);
}
function combineChunks(chunks: Uint8Array[], size: number): Uint8Array {
  const result = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
function trustedMutation(request: Request, baseURL: string): boolean {
  if (request.headers.get('sec-fetch-site') === 'cross-site') return false;
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(baseURL).origin;
}
function createPrivateFileRoutes(identity: Identity = authenticate) {
  const routes = new Hono<{ Bindings: Env; Variables: { fileOwner: string } }>();
  routes.use('*', async (c, next) => {
    c.header('cache-control', 'private, no-store');
    const userId = await identity(c.req.raw, c.env);
    if (!userId) return c.json({ error: 'Unauthorized' }, 401);
    c.set('fileOwner', encodeURIComponent(userId));
    const mutation = !['GET', 'HEAD'].includes(c.req.method);
    if (mutation && !trustedMutation(c.req.raw, c.env.BETTER_AUTH_URL)) return c.json({ error: 'Unexpected request origin' }, 403);
    await next();
  });
  routes.post('/', async (c) => {
    // Raw bytes keep upload memory bounded. Only the server creates keys.
    const bytes = await readFileBody(c.req.raw);
    if (!bytes) return c.json({ error: 'File exceeds 1 MiB' }, 413);
    if (!bytes.byteLength) return c.json({ error: 'An empty file is not allowed' }, 400);
    const id = crypto.randomUUID();
    await c.env.FILES.put(c.get('fileOwner') + '/' + id, bytes, { httpMetadata: { contentType: 'application/octet-stream' } });
    return c.json({ id, size: bytes.byteLength }, 201);
  });
  routes.use('/:id', async (c, next) => {
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(c.req.param('id') ?? '')) return c.json({ error: 'Not found' }, 404);
    await next();
  });
  routes.get('/:id', async (c) => {
    const object = await c.env.FILES.get(c.get('fileOwner') + '/' + c.req.param('id'));
    if (!object) return c.json({ error: 'Not found' }, 404);
    return new Response(object.body, { headers: { 'content-type': 'application/octet-stream', 'content-disposition': 'attachment; filename="download"', 'x-content-type-options': 'nosniff', 'cache-control': 'private, no-store' } });
  });
  routes.delete('/:id', async (c) => {
    await c.env.FILES.delete(c.get('fileOwner') + '/' + c.req.param('id'));
    return c.body(null, 204);
  });
  return routes;
}
export const privateFileRoutes = createPrivateFileRoutes();
`;
