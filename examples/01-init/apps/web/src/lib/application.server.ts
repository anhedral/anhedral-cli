import type { ApplicationContext } from './request-context';

export async function readApplicationStatus(_context: ApplicationContext) {
  return { api: null, authentication: false, storage: false, payment: false };
}
