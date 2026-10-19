import { createAuth } from '@workspace/auth';
import { sessionSchema } from '@workspace/contracts';
import { createDatabase } from '@workspace/db';
import { OpenAPIHono, createRoute } from '@hono/zod-openapi';

import { healthSchema } from '@workspace/contracts';
import { bodyLimit } from 'hono/body-limit';

const app = new OpenAPIHono<{ Bindings: Env; Variables: { database: () => ReturnType<typeof createDatabase> } }>();
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));
// Construct the database only when a route needs it: c.get('database')().
app.use('/api/*', async (c, next) => {
  c.set('database', () => createDatabase(c.env.DB));
  await next();
});
const health = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      description: 'Healthy',
      content: { 'application/json': { schema: healthSchema } },
    },
  },
});

app.openapi(health, (c) => c.json({ ok: true as const }, 200));
app.get('/api/health', (c) => c.json(healthSchema.parse({ ok: true })));
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: "universal-reference", version: '1.0.0' },
});

app.get('/api/session', async (c) => {
  const env = c.env;
  const session = await createAuth(createDatabase(env.DB), env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).api.getSession({ headers: c.req.raw.headers });
  c.header('cache-control', 'private, no-store');
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  return c.json(sessionSchema.parse({ user: session.user }));
});
app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const env = c.env;
  const database = createDatabase(env.DB);
  return await createAuth(database, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).handler(c.req.raw);
});
export default app;
