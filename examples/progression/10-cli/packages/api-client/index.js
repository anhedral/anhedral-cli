export function createClient(origin, getToken = () => undefined) {
  const base = new URL(origin);
  if (!['https:', 'http:'].includes(base.protocol) || base.username || base.password)
    throw Error('Invalid API origin');
  return async (path, options = {}) => {
    const url = new URL(path, base.origin);
    if (url.origin !== base.origin || !url.pathname.startsWith('/api/'))
      throw Error('Invalid API path');
    const headers = new Headers(options.headers);
    const token = await getToken();
    if (token) headers.set('authorization', 'Bearer ' + token);
    return fetch(url, { ...options, headers, credentials: 'same-origin', redirect: 'error' });
  };
}
