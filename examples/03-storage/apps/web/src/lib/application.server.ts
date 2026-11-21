import type { ApplicationContext } from './request-context';

export async function readApplicationStatus(context: ApplicationContext): Promise<{ api: boolean | null; authentication: boolean }> {
  try {
    if (!context.api) return { api: false, authentication: true };
    const response = await context.api.fetch(new Request('https://api.internal/api/health', { signal: AbortSignal.timeout(5000) }));
    if (!response.ok) return { api: false, authentication: true };
    const result: unknown = await response.json();
    return { api: typeof result === 'object' && result !== null && Reflect.get(result, 'ok') === true, authentication: true };
  } catch {
    return { api: false, authentication: true };
  }
}
