import { DurableObject } from 'cloudflare:workers';
import app from './index';
import type { AppEnv } from './environment';

const protocol = 'anhedral.sync.v1';
const route = /^\/api\/sync\/socket\/([a-f0-9]{64})$/;
export default {
  fetch(request: Request, env: AppEnv['Bindings'], ctx: ExecutionContext) {
    const match = route.exec(new URL(request.url).pathname);
    if (!match) return app.fetch(request, env, ctx);
    if (request.method !== 'GET' || request.headers.get('Upgrade')?.toLowerCase() !== 'websocket')
      return new Response(null, { status: 426 });
    let id: DurableObjectId;
    try {
      id = env.CLIENT_SYNC.idFromString(match[1]);
    } catch {
      return new Response(null, { status: 404 });
    }
    return env.CLIENT_SYNC.get(id).fetch(new Request('https://sync.internal/socket', request));
  },
};

export class ClientSync extends DurableObject<AppEnv['Bindings']> {
  constructor(ctx: DurableObjectState, env: AppEnv['Bindings']) {
    super(ctx, env);
    ctx.storage.sql.exec(
      'CREATE TABLE IF NOT EXISTS tickets (nonce TEXT PRIMARY KEY, expires INTEGER NOT NULL)',
    );
  }
  async fetch(request: Request) {
    const path = new URL(request.url).pathname;
    const now = Date.now();
    const sql = this.ctx.storage.sql;
    if (path === '/tickets' && request.method === 'POST') {
      sql.exec('DELETE FROM tickets WHERE expires <= ?', now);
      if (Number(sql.exec('SELECT COUNT(*) AS n FROM tickets').one().n) >= 64)
        return new Response(null, { status: 429 });
      const ticket = crypto.randomUUID();
      sql.exec('INSERT INTO tickets VALUES (?, ?)', ticket, now + 30000);
      return Response.json({ ticket });
    }
    if (path === '/publish' && request.method === 'POST') {
      const payload = await request.text();
      for (const socket of this.ctx.getWebSockets()) {
        try {
          if (socket.deserializeAttachment()?.expires > now) socket.send(payload);
          else socket.close(1008, 'Renew session');
        } catch {
          // A device may have disconnected during fanout.
        }
      }
      return new Response(null, { status: 204 });
    }
    if (
      path !== '/socket' ||
      request.method !== 'GET' ||
      request.headers.get('Upgrade')?.toLowerCase() !== 'websocket'
    )
      return new Response(null, { status: 404 });
    const protocols = (request.headers.get('Sec-WebSocket-Protocol') ?? '')
      .split(',')
      .map((s) => s.trim());
    if (
      protocols.length !== 2 ||
      protocols[0] !== protocol ||
      !sql
        .exec(
          'DELETE FROM tickets WHERE nonce = ? AND expires > ? RETURNING nonce',
          protocols[1],
          now,
        )
        .toArray().length
    )
      return new Response(null, { status: 403 });
    if (this.ctx.getWebSockets().length >= 64) return new Response(null, { status: 429 });
    const [client, server] = Object.values(new WebSocketPair());
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ expires: now + 300000 });
    return new Response(null, {
      status: 101,
      webSocket: client,
      headers: { 'Sec-WebSocket-Protocol': protocol },
    });
  }
  webSocketMessage(socket: WebSocket) {
    socket.close(1008, 'Read-only subscription');
  }
  webSocketClose(socket: WebSocket) {
    socket.close(1000);
  }
  webSocketError(socket: WebSocket) {
    socket.close(1011);
  }
}
