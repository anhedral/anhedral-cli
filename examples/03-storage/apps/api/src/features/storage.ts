import { Hono } from 'hono';
import { requireSession } from '../security';
import type { AppEnv } from '../environment';
export const storageRoutes = new Hono<AppEnv>();
storageRoutes.use('/files/*', requireSession);
storageRoutes.use('/files/:name', async (c, next) => {
  const name = c.req.param('name');
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]{0,127}$/.test(name))
    return c.json({ error: 'Invalid filename' }, 400);
  c.set('fileKey', encodeURIComponent(c.get('userId')) + '/' + name);
  await next();
});
storageRoutes.get('/files/:name', async (c) => {
  const object = await c.env.FILES.get(c.get('fileKey'));
  if (!object) return c.json({ error: 'Not found' }, 404);
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/octet-stream',
      'Content-Disposition': 'attachment; filename="' + c.req.param('name') + '"',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-store',
    },
  });
});
storageRoutes.put('/files/:name', async (c) => {
  const bytes = await c.req.arrayBuffer();
  if (bytes.byteLength > 1024 * 1024) return c.json({ error: 'File too large' }, 413);
  await c.env.FILES.put(c.get('fileKey'), bytes, {
    httpMetadata: { contentType: 'application/octet-stream' },
  });
  return c.json({ stored: true }, 201);
});
storageRoutes.delete('/files/:name', async (c) => {
  await c.env.FILES.delete(c.get('fileKey'));
  return c.body(null, 204);
});
