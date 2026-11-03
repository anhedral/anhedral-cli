import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { HTTPException } from 'hono/http-exception';
import { capabilities } from './capabilities';
import type { AppEnv } from './environment';

const app = new Hono<AppEnv>();
app.use('/api/*', bodyLimit({ maxSize: 1024 * 1024 }));
app.use('/api/*', async (c, next) => {
  await next();
  c.header('Cache-Control', 'private, no-store');
});
app.get('/api/health', (c) => c.json({ ok: true }));
app.route('/api', capabilities);
app.onError((error, c) =>
  error instanceof HTTPException && error.status < 500
    ? error.getResponse()
    : c.json({ error: 'Application request failed' }, 500),
);
export default app;
