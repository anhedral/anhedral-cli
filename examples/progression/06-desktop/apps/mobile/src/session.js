import * as storage from 'expo-secure-store';
import { signIn, signOut } from '@workspace/api-client/session';
import { apiClient } from './api';

// Each API origin has its own credentials, even across development and production builds.
function session() {
  const origin = new URL(process.env.EXPO_PUBLIC_API_ORIGIN).origin;
  const key =
    'app-session.' +
    Array.from(origin, (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('');
  return {
    request: apiClient(origin, () => storage.getItemAsync(key)),
    save: (token) => storage.setItemAsync(key, token),
    clear: () => storage.deleteItemAsync(key),
  };
}
export const request = (path, options) => session().request(path, options);
export function login(email, password) {
  const { request, save } = session();
  return signIn(request, email, password, save);
}
export function logout() {
  const { request, clear } = session();
  return signOut(request, clear);
}
