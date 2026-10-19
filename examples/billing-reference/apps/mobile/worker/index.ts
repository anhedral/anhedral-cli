interface Binding { fetch(request: Request): Promise<Response> }
interface Env { ASSETS: Binding; API: Binding; }

// Browser-supplied edge identity headers never cross the API boundary.
function forwardedHeaders(request: Request): Headers {
  const headers = new Headers();
  for (const name of ['accept', 'content-type', 'cookie', 'origin', 'authorization', 'sec-fetch-site', 'expo-origin', 'idempotency-key']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}
function privateResponse(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const name of ['connection', 'transfer-encoding', 'access-control-allow-origin', 'access-control-allow-credentials']) headers.delete(name);
  headers.set('cache-control', 'private, no-store');
  return new Response(response.body, { status: response.status, headers });
}
async function proxyApi(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const target = new URL('https://api.internal');
  target.pathname = url.pathname;
  target.search = url.search;
  try {
    const upstream = new Request(new Request(target, request), {
      headers: forwardedHeaders(request), redirect: 'manual',
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(15000)]),
    });
    return privateResponse(await env.API.fetch(upstream));
  } catch {
    return Response.json({ error: 'API unavailable' }, { status: 503, headers: { 'cache-control': 'private, no-store' } });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const pathname = new URL(request.url).pathname;
    const apiPath = pathname === '/api' || pathname.startsWith('/api/');
    if (!apiPath) return env.ASSETS.fetch(request);
    return proxyApi(request, env);
  },
};
