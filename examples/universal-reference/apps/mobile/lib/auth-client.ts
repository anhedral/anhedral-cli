import { createAuthClient } from 'better-auth/react';

let client: ReturnType<typeof createAuthClient> | undefined;
export function getAuthClient() { return client ??= createAuthClient(); }
export function authConfigurationError(): string | null { return null; }
