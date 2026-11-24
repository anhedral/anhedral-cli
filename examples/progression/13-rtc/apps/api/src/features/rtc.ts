import { storeMembers, findMember } from '../room-store';
import { Hono } from 'hono';
import type { AppEnv } from '../environment';
import { requireSession } from '../security';

export const rtcRoutes = new Hono<AppEnv>();
rtcRoutes.use('/rtc/*', requireSession);
async function realtime(env: AppEnv['Bindings'], path: string, body: unknown) {
  if (!env.RTC_API_TOKEN || !env.RTC_ACCOUNT_ID || !env.RTC_APP_ID || !env.RTC_PRESET)
    throw Error('Configure RealtimeKit');
  const endpoint =
    'https://api.cloudflare.com/client/v4/accounts/' +
    encodeURIComponent(env.RTC_ACCOUNT_ID) +
    '/realtime/kit/' +
    encodeURIComponent(env.RTC_APP_ID) +
    '/meetings' +
    path;
  const response = await fetch(endpoint, {
    method: 'POST',
    redirect: 'error',
    headers: { authorization: 'Bearer ' + env.RTC_API_TOKEN, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw Error('RealtimeKit unavailable');
  const result = (await response.json()) as {
    success: boolean;
    data?: { id: string; token?: string };
  };
  if (!result.success || !result.data?.id) throw Error('Invalid RealtimeKit response');
  return result.data;
}
rtcRoutes.post('/rtc/rooms', async (c) => {
  const { memberIds } = await c.req.json<{ memberIds?: unknown }>();
  if (
    !Array.isArray(memberIds) ||
    memberIds.length > 15 ||
    memberIds.some((id) => typeof id !== 'string' || !id || id.length > 128)
  )
    return c.json({ error: 'Invalid member IDs' }, 400);
  const room = await realtime(c.env, '', { title: 'Private room' });
  const members = [...new Set([c.get('userId'), ...memberIds])];
  await storeMembers(c.env, room.id, members);
  return c.json({ roomId: room.id }, 201);
});
rtcRoutes.post('/rtc/rooms/:roomId/join', async (c) => {
  const roomId = c.req.param('roomId');
  const user = c.get('userId');
  const member = await findMember(c.env, roomId, user);
  if (!member) return c.json({ error: 'Room unavailable' }, 404);
  const participant = await realtime(c.env, '/' + encodeURIComponent(roomId) + '/participants', {
    custom_participant_id: user,
    preset_name: c.env.RTC_PRESET,
    token: { expires_on: new Date(Date.now() + 300000).toISOString() },
  });
  if (!participant.token) throw Error('Missing participant token');
  return c.json({ token: participant.token });
});
