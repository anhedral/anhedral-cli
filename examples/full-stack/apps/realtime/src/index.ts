import { DurableObject } from 'cloudflare:workers';
export class Room extends DurableObject<Env> {
  async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('WebSocket required', { status: 426 });
    }
    const pair = new WebSocketPair();
    this.ctx.acceptWebSocket(pair[1]);
    return new Response(null, { status: 101, webSocket: pair[0] });
  }
  webSocketMessage(sender: WebSocket, message: string | ArrayBuffer) {
    const size = typeof message === 'string'
      ? new TextEncoder().encode(message).byteLength
      : message.byteLength;
    if (size > 16384) {
      sender.close(1009, 'Message too large');
      return;
    }
    this.#broadcastToPeers(sender, message);
  }

  #broadcastToPeers(sender: WebSocket, message: string | ArrayBuffer) {
    for (const socket of this.ctx.getWebSockets()) {
      if (socket !== sender) socket.send(message);
    }
  }
}
export default {
  async fetch(): Promise<Response> {
    // Authenticate and authorize room membership, then forward to env.ROOMS.getByName(room).fetch(request).
    // Use short-lived single-use tickets for browser WebSockets. Never expose a long-lived service secret.
    return new Response('Configure room authorization before enabling connections', { status: 501 });
  },
};
