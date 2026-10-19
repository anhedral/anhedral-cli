import { z } from 'zod';
import { createHttpClient, type HttpOptions } from './http';

export const healthSchema = z.object({ ok: z.literal(true) });
export const sessionSchema = z.object({ user: z.object({ id: z.string(), name: z.string(), email: z.email() }) });
export type Session = z.infer<typeof sessionSchema>;

export function createApiClient(baseURL = '/api', options: HttpOptions = {}) {
  const request = createHttpClient(baseURL, options);
  return {
    health: (init?: RequestInit) => request('/health', healthSchema, init),
    session: (init?: RequestInit) => request('/session', sessionSchema, init),
  };
}

export * from './billing';
