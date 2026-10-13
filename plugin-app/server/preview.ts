import { createServer, type IncomingMessage } from 'node:http';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import type { ProjectStore } from './store.ts';
import { scriptContents } from '../shared/html.mjs';
const requestSchema = z
  .object({
    name: z.enum(['list_projects', 'get_project', 'rename_project', 'forget_project', 'set_view']),
    args: z
      .object({
        id: z.string().uuid().optional(),
        name: z.string().trim().min(1).max(80).optional(),
        view: z.enum(['list', 'grid']).optional(),
      })
      .strict(),
  })
  .strict();
async function body(request: IncomingMessage) {
  let size = 0;
  const parts: Buffer[] = [];
  for await (const part of request) {
    const bytes = Buffer.from(part);
    size += bytes.length;
    if (size > 16384) throw new Error('Request too large.');
    parts.push(bytes);
  }
  return requestSchema.parse(JSON.parse(Buffer.concat(parts).toString('utf8')));
}
export function createPreviewServer(store: ProjectStore, html: string) {
  const scriptHashes = scriptContents(html)
    .map((contents) => `'sha256-${createHash('sha256').update(contents).digest('base64')}'`)
    .join(' ');
  return createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Cache-Control', 'no-store');
    const address = request.socket.localAddress === '127.0.0.1';
    const authority = `127.0.0.1:${request.socket.localPort}`;
    if (
      !address ||
      request.headers.host !== authority ||
      (request.headers.origin && request.headers.origin !== `http://${authority}`)
    ) {
      response.writeHead(403).end();
      return;
    }
    if (request.method === 'GET' && request.url === '/') {
      response.setHeader(
        'Content-Security-Policy',
        `default-src 'none'; script-src ${scriptHashes}; style-src 'unsafe-inline'; connect-src 'self'; img-src data:; base-uri 'none'; frame-ancestors 'none'; form-action 'none'`,
      );
      response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }).end(html);
      return;
    }
    if (request.method !== 'POST' || request.url !== '/api/tool') {
      response.writeHead(404).end();
      return;
    }
    response.setHeader('Content-Type', 'application/json');
    if (request.headers['content-type'] !== 'application/json') {
      response.writeHead(415).end(JSON.stringify({ error: 'Use a JSON request.' }));
      return;
    }
    try {
      const { name, args } = await body(request);
      response.end(JSON.stringify(store.call(name, args)));
    } catch {
      response.writeHead(400).end(
        JSON.stringify({
          error: 'The change could not be saved. Check the project and input, then retry.',
        }),
      );
    }
  });
}
