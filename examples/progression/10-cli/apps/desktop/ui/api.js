import { createClient } from '@workspace/api-client';
export function apiClient(origin = import.meta.env.VITE_API_ORIGIN, getToken) {
  if (!origin) throw Error('Configure the application API origin');
  return createClient(origin, getToken);
}
