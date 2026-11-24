import { createClient } from '@workspace/api-client';
export function apiClient(origin = process.env.API_ORIGIN, getToken = () => process.env.API_TOKEN) {
  if (!origin) throw Error('Configure the application API origin');
  return createClient(origin, getToken);
}
