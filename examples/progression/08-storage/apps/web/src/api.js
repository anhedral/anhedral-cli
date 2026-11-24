import { createClient } from '@workspace/api-client';
export function apiClient(origin = location.origin, getToken) {
  if (!origin) throw Error('Configure the application API origin');
  return createClient(origin, getToken);
}
