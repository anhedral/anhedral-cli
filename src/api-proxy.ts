export const WEB_API_PROXY = `export interface ApiBinding { fetch(request: Request): Promise<Response> }
type Options = { binding?: ApiBinding; development: boolean; devOrigin?: string; send?: typeof fetch };
function developmentOrigin(configured?: string): string {
  const url = new URL(configured || 'http://127.0.0.1:8787');
  const loopback = new Set(['127.0.0.1', 'localhost', '[::1]']);
  const invalid = [url.protocol !== 'http:', !loopback.has(url.hostname), url.username, url.password, url.pathname !== '/', url.search, url.hash];
  if (invalid.some(Boolean)) throw Error('API_INTERNAL_URL must be a loopback HTTP origin.');
  return url.origin;
}
function backendOrigin(options: Options): string {
  if (options.development) return developmentOrigin(options.devOrigin);
  if ([!options.binding, options.devOrigin].some(Boolean)) throw Error('Production requires the API service binding.');
  return 'https://api.internal';
}
function apiTarget(request: Request, origin: string): URL {
  const url = new URL(request.url);
  if (!/^\\/api(?:\\/|$)/.test(url.pathname)) throw Error('Unexpected API path.');
  return new URL(url.pathname + url.search, origin);
}
function forwardedHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'origin', 'authorization', 'sec-fetch-site', 'expo-origin', 'idempotency-key']) {
    const value = request.headers.get(name); if (value) headers.set(name, value);
  }
  return headers;
}
function upstreamRequest(request: Request, target: URL): Request {
  const settings: RequestInit & { duplex?: 'half' } = { method: request.method, headers: forwardedHeaders(request), redirect: 'manual', signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]) };
  if (!['GET', 'HEAD'].includes(request.method)) { settings.body = request.body; settings.duplex = 'half'; }
  return new Request(target, settings);
}
function privateResponse(response: Response, development: boolean): Response {
  const headers = new Headers(response.headers);
  for (const name of ['connection', 'transfer-encoding', 'access-control-allow-origin', 'access-control-allow-credentials']) headers.delete(name);
  // Node fetch already decoded the local HTTP response. The server must frame/compress
  // those decoded bytes itself; the sidecar's wire headers no longer describe them.
  if (development) { headers.delete('content-encoding'); headers.delete('content-length'); }
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, headers });
}
export async function proxyApi(request: Request, options: Options): Promise<Response> {
  try {
    const upstream = upstreamRequest(request, apiTarget(request, backendOrigin(options)));
    const response = options.development ? await (options.send ?? fetch)(upstream) : await options.binding!.fetch(upstream);
    return privateResponse(response, options.development);
  } catch { return Response.json({ error: 'API unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store' } }); }
}
`;
