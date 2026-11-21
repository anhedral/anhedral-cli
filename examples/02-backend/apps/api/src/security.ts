import type { MiddlewareHandler } from 'hono';
import { createAuth, authConfiguration } from './auth';
import type { AppEnv } from './environment';
const bearer = (headers: Headers) => (headers.get('authorization') ?? '').startsWith('Bearer ');
function sessionHeaders(request: Request) {
  const headers = new Headers(request.headers);
  if (bearer(headers)) headers.delete('cookie');
  return headers;
}
function nativeOrigin(request: Request, env: AppEnv['Bindings']) {
  const origins = (env.AUTH_TRUSTED_ORIGINS ?? '').split(',').map((value) => value.trim());
  const claimed = request.headers.get('expo-origin') ?? '';
  return claimed.length > 0 && origins.includes(claimed);
}
function trustedMutation(request: Request, env: AppEnv['Bindings']) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return true;
  if (bearer(request.headers)) return true;
  const origin = request.headers.get('origin');
  if (origin !== null) return origin === new URL(env.PUBLIC_APP_URL!).origin;
  // A browser-supplied Origin is never bypassed by an expo-origin header.
  return nativeOrigin(request, env);
}
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!authConfiguration.safeParse(c.env).success)
    return c.json({ error: 'Authentication needs configuration' }, 503);
  const session = await createAuth(c.env).api.getSession({ headers: sessionHeaders(c.req.raw) });
  if (!session) return c.json({ error: 'Unauthorized' }, 401);
  if (!trustedMutation(c.req.raw, c.env)) return c.json({ error: 'Origin rejected' }, 403);
  c.set('userId', session.user.id);
  await next();
};
