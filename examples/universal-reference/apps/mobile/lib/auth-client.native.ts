import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';
import { nativeApiOrigin } from './api-client';

export function authConfigurationError(): string | null {
  try { nativeApiOrigin(); return null; }
  catch (error) { return error instanceof Error ? error.message : 'Invalid product API origin.'; }
}

function createNativeClient() {
  return createAuthClient({
    baseURL: nativeApiOrigin(),
    plugins: [expoClient({ scheme: "universal-reference", storagePrefix: "universal-reference", storage: SecureStore })],
  });
}
let client: ReturnType<typeof createNativeClient> | undefined;
export function getAuthClient() { return client ??= createNativeClient(); }
