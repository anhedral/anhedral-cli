import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { RecipeContext } from '../registry/types.js';
import { patchPackage, put, sharedPackage } from './files.js';
import { writeEnvironmentFile } from './environment.js';

/** Client apps hold only a revocable app/environment capability, never vendor credentials. */
export function scaffoldManagedEmail({ root, has }: RecipeContext): void {
  sharedPackage(
    root,
    'managed-email',
    `export type EmailTemplate = 'verify-email' | 'reset-password';
export interface EmailEnvironment {
  ANHEDRAL_EMAIL: { fetch(input: Request): Promise<Response> };
  ANHEDRAL_EMAIL_SCOPE: string;
  ANHEDRAL_EMAIL_CAPABILITY: string;
}
export function createManagedEmail(env: EmailEnvironment) {
  return async (template: EmailTemplate, to: string, url: string) => {
    if (!env.ANHEDRAL_EMAIL || !env.ANHEDRAL_EMAIL_SCOPE || !env.ANHEDRAL_EMAIL_CAPABILITY)
      throw new Error('Managed email is not provisioned for this environment.');
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(template + '\\n' + to + '\\n' + url)));
    const id = Array.from(digest, (byte) => byte.toString(16).padStart(2, '0')).join('');
    const response = await env.ANHEDRAL_EMAIL.fetch(new Request('https://email.internal/scopes/' + encodeURIComponent(env.ANHEDRAL_EMAIL_SCOPE) + '/send', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + env.ANHEDRAL_EMAIL_CAPABILITY, 'content-type': 'application/json' },
      body: JSON.stringify({ id, template, to, url }),
      signal: AbortSignal.timeout(15000),
    }));
    if (!response.ok) throw new Error('Application email could not be accepted. Please try again.');
  };
}
`,
    {},
  );
  patchPackage(root, 'packages/auth/package.json', {
    dependencies: { '@workspace/managed-email': 'workspace:*' },
  });
  patchPackage(root, 'apps/api/package.json', {
    dependencies: { '@workspace/managed-email': 'workspace:*' },
  });
  const file = 'packages/auth/src/index.ts';
  const source = readFileSync(path.join(root, file), 'utf8');
  const signature = ']) {\n  return betterAuth({';
  if (!source.includes(signature))
    throw new Error('Managed email requires the generated Better Auth factory.');
  put(
    root,
    file,
    "import type { createManagedEmail } from '@workspace/managed-email';\n" +
      source
        .replace(
          signature,
          '] , sendEmail: ReturnType<typeof createManagedEmail>) {\n  return betterAuth({',
        )
        .replace(
          'emailAndPassword: { enabled: true },',
          `emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => { await sendEmail('reset-password', user.email, url); },
    },
    emailVerification: {
      sendOnSignUp: true,
      sendVerificationEmail: async ({ user, url }) => { await sendEmail('verify-email', user.email, url); },
    },`,
        ),
  );
  const api = 'apps/api/src/index.ts';
  put(
    root,
    api,
    "import { createManagedEmail } from '@workspace/managed-email';\n" +
      readFileSync(path.join(root, api), 'utf8').replaceAll(
        'env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL)',
        'env.BETTER_AUTH_SECRET, env.BETTER_AUTH_URL, undefined, createManagedEmail(env))',
      ),
  );
  put(
    root,
    'apps/api/src/managed-email.d.ts',
    `interface Env {
  ANHEDRAL_EMAIL: import('@workspace/managed-email').EmailEnvironment['ANHEDRAL_EMAIL'];
  ANHEDRAL_EMAIL_SCOPE: string;
  ANHEDRAL_EMAIL_CAPABILITY: string;
}
`,
  );
  writeEnvironmentFile(root, 'apps/api/.dev.vars.example', {
    ANHEDRAL_EMAIL_SCOPE: '',
    ANHEDRAL_EMAIL_CAPABILITY: '',
  });
  if (has('expo')) {
    const signIn = 'apps/mobile/app/sign-in.tsx';
    put(
      root,
      signIn,
      readFileSync(path.join(root, signIn), 'utf8')
        .replace(
          "import { router } from 'expo-router';",
          "import { Link, router } from 'expo-router';",
        )
        .replace(
          'await authenticate({ create, name, email, password });',
          `await authenticate({ create, name, email, password });
      if (create) { setPassword(''); setMessage('Check your email to verify your account, then sign in.'); setCreate(false); return; }`,
        )
        .replace(
          '<Text accessibilityLiveRegion="polite">{message}</Text>',
          '<Text accessibilityLiveRegion="polite">{message}</Text>\n    <Link href="/reset-password">Forgot your password?</Link>',
        ),
    );
    put(
      root,
      'apps/mobile/app/reset-password.tsx',
      `import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import { Platform, ScrollView, Text, TextInput } from 'react-native';
import * as Linking from 'expo-linking';
import { Button } from '@/components/ui/button';
import { getAuthClient } from '@/lib/auth-client';
import { AuthConfiguration } from '@/components/auth-configuration';

export default function ResetPasswordRoute() { return <AuthConfiguration><ResetPassword /></AuthConfiguration>; }
function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  async function submit() {
    if (pending) return;
    setPending(true); setMessage('');
    try {
      const auth = getAuthClient();
      const redirectTo = Platform.OS === 'web' ? '/reset-password' : Linking.createURL('reset-password');
      const result = token ? await auth.resetPassword({ token, newPassword: password }) : await auth.requestPasswordReset({ email, redirectTo });
      if (result.error) throw new Error(result.error.message ?? 'Unable to reset password.');
      setPassword(''); setMessage(token ? 'Password updated. Sign in again.' : 'If an account exists, check your email for the reset link.');
    } catch { setMessage('Unable to complete this request. Try again or request a new link.'); }
    finally { setPending(false); }
  }
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header">Reset password</Text>
    {token ? <TextInput accessibilityLabel="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" /> : <TextInput accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />}
    <Button disabled={pending || (token ? password.length < 8 : !email)} onPress={() => void submit()}>{pending ? 'Working…' : token ? 'Update password' : 'Send reset link'}</Button>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Link href="/sign-in">Back to sign in</Link>
  </ScrollView>;
}
`,
    );
  }
  put(
    root,
    'packages/managed-email/README.md',
    `# Managed application email

Anhedral provisions the broker binding, environment scope, scoped capability and sender.
Clients do not create a provider account or supply Resend/Cloudflare keys. Provider
selection and inbound routing belong to Anhedral operations. Verification and reset
callbacks use approved broker templates. Missing setup fails closed; local tests
must supply a mail sink, never a production capability. Do not log token URLs.

The current profile supports verified email/password sign-in and password-reset
delivery. Passwordless magic-link confirmation and native return-link UI require
separate acceptance before they are offered. Provider receipt acceptance does not
prove inbox delivery. Generic private-file authorization is application work.
`,
  );
}
