import { readFileSync } from 'node:fs';
import path from 'node:path';
import { put } from './files.js';

export function scaffoldPasswordReset(root: string): void {
  put(root, 'packages/contracts/src/password-reset.ts', PASSWORD_RESET_CLIENT);
  const contracts = readFileSync(path.join(root, 'packages/contracts/src/index.ts'), 'utf8');
  put(
    root,
    'packages/contracts/src/index.ts',
    contracts + "\nexport { submitPasswordReset, passwordResetLabel } from './password-reset';\n",
  );
  put(
    root,
    'apps/web/app/reset-password/page.tsx',
    `import { PasswordReset } from '@/components/password-reset';
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  return <PasswordReset token={typeof params.token === 'string' ? params.token : undefined} invalid={Boolean(params.error)} />;
}
`,
  );
  put(root, 'apps/web/components/password-reset.tsx', WEB_PASSWORD_RESET);
  put(root, 'apps/mobile/app/reset-password.tsx', NATIVE_PASSWORD_RESET);
}

const WEB_PASSWORD_RESET = `'use client';
import { useState, type FormEvent } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { submitPasswordReset, passwordResetLabel } from '@workspace/contracts';
function ResetFields({ token }: { token?: string }) {
  return token ? <Label>New password<Input name="password" type="password" autoComplete="new-password" minLength={8} required /></Label> : <Label>Email<Input name="email" type="email" autoComplete="email" required /></Label>;
}
export function PasswordReset({ token, invalid }: { token?: string; invalid: boolean }) {
  const [pending, setPending] = useState(false);
  const [complete, setComplete] = useState(false);
  const [message, setMessage] = useState(invalid ? 'This link is invalid or expired. Request a new one.' : '');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (pending) return;
    const form = event.currentTarget; const data = new FormData(form);
    setPending(true); setMessage('');
    try {
      const message = await submitPasswordReset(authClient, { token, email: String(data.get('email')), password: String(data.get('password')) }, new URL('/reset-password', window.location.origin).href);
      form.reset(); setComplete(Boolean(token)); setMessage(message);
    } catch { setMessage('Unable to complete this request. Try again or request a new link.'); }
    finally { setPending(false); }
  }
  return <section className="stack"><h1>Reset password</h1>{!complete && <form onSubmit={submit}>
    <ResetFields token={token} />
    <Button disabled={pending} type="submit">{passwordResetLabel(pending, token)}</Button>
  </form>}<p role="status">{message}</p><Link href="/reset-password">Request a new link</Link><Link href="/sign-in">Back to sign in</Link></section>;
}
`;

const NATIVE_PASSWORD_RESET = `import { useState } from 'react';
import { Link, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import { Screen, Text, Input } from '@workspace/native-ui';
import { Button } from '@/components/ui/button';
import { getAuthClient } from '@/lib/auth-client';
import { AuthConfiguration } from '@/components/auth-configuration';
import { submitPasswordReset, passwordResetLabel } from '@workspace/contracts';
function disabled(pending: boolean, token: string | undefined, password: string, email: string): boolean { return pending || (token ? password.length < 8 : !email); }
function ResetFields({ token, password, setPassword, email, setEmail }: { token?: string; password: string; setPassword: (value: string) => void; email: string; setEmail: (value: string) => void }) {
  return token ? <Input accessibilityLabel="New password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" /> : <Input accessibilityLabel="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />;
}
export default function ResetPasswordRoute() { return <AuthConfiguration><ResetPassword /></AuthConfiguration>; }
function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const token = typeof params.token === 'string' ? params.token : undefined;
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [message, setMessage] = useState(params.error ? 'This link is invalid or expired. Request a new one.' : '');
  const [complete, setComplete] = useState(false); const [pending, setPending] = useState(false);
  async function submit() {
    if (pending) return; setPending(true); setMessage('');
    try {
      const message = await submitPasswordReset(getAuthClient(), { token, email, password }, Linking.createURL('reset-password'));
      setPassword(''); setComplete(Boolean(token)); setMessage(message);
    } catch { setMessage('Unable to complete this request. Try again or request a new link.'); }
    finally { setPending(false); }
  }
  return <Screen><Text accessibilityRole="header">Reset password</Text>{!complete && <>
    <ResetFields token={token} password={password} setPassword={setPassword} email={email} setEmail={setEmail} />
    <Button disabled={disabled(pending, token, password, email)} onPress={() => void submit()}>{passwordResetLabel(pending, token)}</Button>
  </>}<Text accessibilityLiveRegion="polite">{message}</Text><Link href="/reset-password">Request a new link</Link><Link href="/sign-in">Back to sign in</Link></Screen>;
}
`;

const PASSWORD_RESET_CLIENT = `interface PasswordResetClient {
  resetPassword(input: { token: string; newPassword: string }): Promise<{ error: unknown }>;
  requestPasswordReset(input: { email: string; redirectTo: string }): Promise<{ error: unknown }>;
}
export async function submitPasswordReset(client: PasswordResetClient, values: { token?: string; email: string; password: string }, redirectTo: string): Promise<string> {
  const result = values.token
    ? await client.resetPassword({ token: values.token, newPassword: values.password })
    : await client.requestPasswordReset({ email: values.email, redirectTo });
  if (result.error) throw Error('Reset unavailable');
  return values.token ? 'Password updated. Sign in again.' : 'If an account exists, check your email for the reset link.';
}
export function passwordResetLabel(pending: boolean, token?: string): string {
  if (pending) return 'Working…';
  return token ? 'Update password' : 'Send reset link';
}
`;
