import type { z } from 'zod';

export interface HttpOptions {
  headers?: () => HeadersInit | Promise<HeadersInit>;
  credentials?: 'omit' | 'same-origin' | 'include';
}
export function createHttpClient(baseURL: string, options: HttpOptions = {}) {
  return async function request<T>(route: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(await options.headers?.());
    new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    headers.set('accept', 'application/json');
    // Worker fetch types omit the browser credentials member.
    const settings: RequestInit & { credentials: 'omit' | 'same-origin' | 'include' } = { ...init, credentials: options.credentials ?? 'same-origin', headers };
    const response = await fetch(baseURL.replace(/\/$/, '') + route, settings);
    if (!response.ok) throw new Error('API request failed (' + response.status + ').');
    return schema.parse(await response.json());
  };
}
