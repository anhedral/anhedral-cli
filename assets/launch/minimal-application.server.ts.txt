import type { ApplicationContext } from './request-context';

export async function readApplicationStatus(_context: ApplicationContext): Promise<{ api: boolean | null; authentication: boolean }> {
  return { api: null, authentication: false };
}
