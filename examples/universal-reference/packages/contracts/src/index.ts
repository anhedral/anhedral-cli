import { z } from 'zod';

export const healthSchema = z.object({ ok: z.literal(true) });
export const sessionSchema = z.object({ user: z.object({ id: z.string(), name: z.string(), email: z.email() }) });
export type Session = z.infer<typeof sessionSchema>;

export function createApiClient(baseURL = '/api', options: { headers?: () => HeadersInit | Promise<HeadersInit>; credentials?: 'omit' | 'same-origin' | 'include' } = {}) {
  async function read<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(await options.headers?.());
    new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    headers.set('accept', 'application/json');
    // Structural extension also compiles against Worker fetch types, which omit browser credentials.
    const request: RequestInit & { credentials: 'omit' | 'same-origin' | 'include' } = {
      ...init, credentials: options.credentials ?? 'same-origin', headers,
    };
    const response = await fetch((baseURL.replace(/\/$/, '')) + path, request);
    if (!response.ok) throw new Error('API request failed (' + response.status + ').');
    return schema.parse(await response.json());
  }
  return {
    health: (init?: RequestInit) => read('/health', healthSchema, init),
    session: (init?: RequestInit) => read('/session', sessionSchema, init),
  };
}
