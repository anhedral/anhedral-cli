import { Hono } from 'hono';
import type { AppEnv } from '../environment';
import { requireSession } from '../security';

function channel(env: AppEnv['Bindings'], userId: string) {
  return env.CLIENT_SYNC.get(env.CLIENT_SYNC.idFromName(userId));
}
// Call after committing the mutation. Only send identifiers for invalidating caches.
export async function publishChange(
  env: AppEnv['Bindings'],
  userId: string,
  event: { type: string; id?: string } = { type: 'changed' },
) {
  const result = await channel(env, userId).fetch('https://sync.internal/publish', {
    method: 'POST',
    body: JSON.stringify({ type: event.type, id: event.id }),
  });
  if (!result.ok) throw Error('Could not publish change');
}
export const syncRoutes = new Hono<AppEnv>();
syncRoutes.post('/sync/ticket', requireSession, async (c) => {
  const url = URL.parse(c.env.SYNC_API_ORIGIN ?? '');
  if (
    !url ||
    url.pathname !== '/' ||
    url.search ||
    url.hash ||
    url.username ||
    url.password ||
    !(
      url.protocol === 'https:' ||
      (url.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
    )
  )
    return c.json({ error: 'Configure the public SYNC_API_ORIGIN' }, 503);
  const stub = channel(c.env, c.get('userId'));
  const issued = await stub.fetch('https://sync.internal/tickets', { method: 'POST' });
  if (!issued.ok) return c.json({ error: 'Sync unavailable' }, 429);
  const { ticket } = await issued.json<{ ticket: string }>();
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.pathname = '/api/sync/socket/' + stub.id.toString();
  return c.json({ url: url.href, ticket });
});
