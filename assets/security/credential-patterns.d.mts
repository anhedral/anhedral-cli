export const CREDENTIAL_PATTERNS: ReadonlyArray<{ id: string; pattern: RegExp }>;
export function sourceContainsCredential(bytes: Uint8Array): boolean;
export function isCredentialPlaceholder(id: string, value: string): boolean;
