import { createAuth } from '@workspace/auth';
import { createDatabase } from '@workspace/db';
import { OpenAPIHono, createRoute, z } from '@hono/zod-openapi';

const app = new OpenAPIHono<{ Bindings: Env }>();
const health = createRoute({
  method: 'get',
  path: '/health',
  responses: {
    200: {
      description: 'Healthy',
      content: { 'application/json': { schema: z.object({ ok: z.literal(true) }) } },
    },
  },
});

app.openapi(health, (c) => c.json({ ok: true as const }, 200));
app.doc('/openapi.json', {
  openapi: '3.0.0',
  info: { title: "full-stack", version: '1.0.0' },
});

app.on(['GET', 'POST'], '/api/auth/*', async (c) => {
  const env = c.env;
  const database = createDatabase(env.DB);
  return await createAuth(database, env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL).handler(c.req.raw);
});
export default app;
