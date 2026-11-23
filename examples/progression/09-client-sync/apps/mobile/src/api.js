import { createClient } from '@workspace/api-client';
export function apiClient(origin = process.env.EXPO_PUBLIC_API_ORIGIN, getToken) {
  if (!origin) throw Error('Configure the application API origin');
  return createClient(origin, getToken);
}
