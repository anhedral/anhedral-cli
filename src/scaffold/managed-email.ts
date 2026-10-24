import { put, sharedPackage } from './files.js';

/** Generated apps receive a scoped capability, never the broker's provider credentials. */
export function scaffoldManagedEmail(root: string): void {
  sharedPackage(root, 'managed-email', MANAGED_EMAIL_SOURCE, {});
  put(
    root,
    'packages/managed-email/README.md',
    `# Managed authentication email

Anhedral provisions the ANHEDRAL_EMAIL service binding, ANHEDRAL_EMAIL_SCOPE and
ANHEDRAL_EMAIL_CAPABILITY in the API Worker only. No provider keys belong in clients.
The broker owns sender/provider configuration, scope/origin checks, quotas and receipts.
Configure the scope with this app's public Better Auth origin and exact native URL scheme.

With no binding or scope/capability, standalone email/password sessions keep their
existing behavior. Any partial configuration fails closed. A complete configuration
requires verified email and enables password reset with session revocation. Do not
remove configuration to bypass verification. Use a local mail sink in tests; never
log token URLs or use a production capability in fixtures. Request acceptance does
not establish inbox delivery. Initialization never provisions the broker or sends mail.
`,
  );
}

export const MANAGED_EMAIL_SOURCE = `export type EmailTemplate = 'verify-email' | 'reset-password';
export interface EmailEnvironment {
  ANHEDRAL_EMAIL?: { fetch(request: Request): Promise<Response> };
  ANHEDRAL_EMAIL_SCOPE?: string;
  ANHEDRAL_EMAIL_CAPABILITY?: string;
}
function validConfiguration(env: EmailEnvironment): boolean {
  return [typeof env.ANHEDRAL_EMAIL?.fetch === 'function', /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(env.ANHEDRAL_EMAIL_SCOPE ?? ''), /^[a-f0-9]{72}$/.test(env.ANHEDRAL_EMAIL_CAPABILITY ?? '')].every(Boolean);
}
export function createManagedEmail(env: EmailEnvironment) {
  const { ANHEDRAL_EMAIL: binding, ANHEDRAL_EMAIL_SCOPE: scope, ANHEDRAL_EMAIL_CAPABILITY: capability } = env;
  if (![binding, scope, capability].some(Boolean)) return undefined;
  if (!validConfiguration(env))
    throw new Error('Managed email configuration is incomplete.');
  return async (template: EmailTemplate, to: string, url: string) => {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([template, to, url])));
    const id = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
    try {
      const response = await binding!.fetch(new Request('https://email.internal/scopes/' + encodeURIComponent(scope!) + '/send', {
        method: 'POST', redirect: 'error',
        headers: { authorization: 'Bearer ' + capability, 'content-type': 'application/json' },
        body: JSON.stringify({ id, template, to, url }), signal: AbortSignal.timeout(15000),
      }));
      if (!response.ok) throw new Error('Email rejected');
    } catch { throw new Error('Application email could not be accepted. Please try again.'); }
  };
}
`;
