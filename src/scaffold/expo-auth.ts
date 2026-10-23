import { expoUiSource } from './anhedral-ui.js';
import { STACK_DEPENDENCIES } from '../dependencies.js';
import { jsString } from '../render.js';
import { json, patchPackage, put as writeSource, readJson } from './files.js';

export function expoAuthScheme(root: string): string {
  const config = readJson(root, 'apps/mobile/app.json');
  const scheme = (config.expo as { scheme?: unknown } | undefined)?.scheme;
  if (typeof scheme !== 'string' || !/^[a-z][a-z0-9+.-]*$/i.test(scheme))
    throw new Error('Expo authentication requires one explicit valid app.json URL scheme.');
  return scheme;
}

/** Platform resolution keeps SecureStore and the native plugin out of the browser bundle. */
export function scaffoldExpoAuth(root: string, scheme: string): void {
  const directory = 'apps/mobile';
  patchPackage(root, `${directory}/package.json`, {
    dependencies: {
      'better-auth': STACK_DEPENDENCIES['better-auth'],
      '@better-auth/expo': STACK_DEPENDENCIES['@better-auth/expo'],
      'expo-secure-store': STACK_DEPENDENCIES['expo-secure-store'],
      'expo-network': STACK_DEPENDENCIES['expo-network'],
    },
  });
  const config = readJson(root, `${directory}/app.json`);
  const expo = config.expo as { plugins?: (string | unknown[])[] };
  const plugins = expo.plugins ?? [];
  if (
    !plugins.some((plugin) => (Array.isArray(plugin) ? plugin[0] : plugin) === 'expo-secure-store')
  )
    expo.plugins = [...plugins, 'expo-secure-store'];
  json(root, `${directory}/app.json`, config);
  put(
    root,
    `${directory}/lib/auth-client.ts`,
    `import { createAuthClient } from 'better-auth/react';

let client: ReturnType<typeof createAuthClient> | undefined;
export function getAuthClient() { return client ??= createAuthClient(); }
export function authConfigurationError(): string | null { return null; }
`,
  );
  put(
    root,
    `${directory}/lib/auth-client.native.ts`,
    `import { createAuthClient } from 'better-auth/react';
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
    plugins: [expoClient({ scheme: ${jsString(scheme)}, storagePrefix: ${jsString(scheme)}, storage: SecureStore })],
  });
}
let client: ReturnType<typeof createNativeClient> | undefined;
export function getAuthClient() { return client ??= createNativeClient(); }
`,
  );
  put(
    root,
    `${directory}/lib/session-api.ts`,
    `import { createApplicationApiClient } from './api-client';
export const sessionApi = createApplicationApiClient();
`,
  );
  put(
    root,
    `${directory}/lib/session-api.native.ts`,
    `import { createApplicationApiClient } from './api-client';
import { getAuthClient } from './auth-client.native';

export const sessionApi = createApplicationApiClient({ headers: async () => {
  const cookie = await getAuthClient().getCookie();
  const headers = new Headers();
  if (cookie) headers.set('cookie', cookie);
  return headers;
} });
`,
  );
  put(
    root,
    `${directory}/components/auth-configuration.tsx`,
    `import { Screen } from '@workspace/ui/components/layout';
import { Text } from '@workspace/ui/components/text';
import { authConfigurationError } from '@/lib/auth-client';

export function AuthConfiguration({ children }: { children: React.ReactNode }) {
  const error = authConfigurationError();
  if (error) return <Screen><Text variant="heading" accessibilityRole="header">Configure the product API</Text><Text selectable>{error}</Text></Screen>;
  return <>{children}</>;
}
`,
  );
  put(
    root,
    `${directory}/app/sign-in.tsx`,
    `import { useState } from 'react';
import { router } from 'expo-router';
import { Screen, Stack } from '@workspace/ui/components/layout';
import { Text } from '@workspace/ui/components/text';
import { Input } from '@workspace/ui/components/input';
import { Button } from '@/components/ui/button';
import { AuthConfiguration } from '@/components/auth-configuration';
import { getAuthClient } from '@/lib/auth-client';
import { sessionApi } from '@/lib/session-api';

export default function SignInRoute() { return <AuthConfiguration><SignIn /></AuthConfiguration>; }

function modeLabel(create: boolean): string { return create ? 'Create account' : 'Sign in'; }
function submitLabel(pending: boolean, create: boolean): string { return pending ? 'Working…' : modeLabel(create); }
function switchLabel(create: boolean): string { return create ? 'Use an existing account' : 'Create an account'; }
function authenticationError(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to verify the session. Check the connection and try again.';
}
async function authenticate(values: { create: boolean; name: string; email: string; password: string }) {
  const auth = getAuthClient();
  const result = values.create ? await auth.signUp.email(values) : await auth.signIn.email(values);
  if (result.error) throw new Error(result.error.message ?? 'Authentication failed.');
}

function SignIn() {
  const [create, setCreate] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit() {
    setPending(true); setMessage('');
    try {
      await authenticate({ create, name, email, password });
      await sessionApi.session();
      setPassword('');
      router.replace('/account');
    } catch (error) { setMessage(authenticationError(error)); }
    finally { setPending(false); }
  }
  return <Screen><Stack>
    <Text variant="heading" accessibilityRole="header">{modeLabel(create)}</Text>
    {create && <Text variant="label">Name</Text>}
    {create && <Input accessibilityLabel="Name" placeholder="Name" value={name} onChangeText={setName} autoComplete="name" />}
    <Text variant="label">Email</Text>
    <Input accessibilityLabel="Email" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <Text variant="label">Password</Text>
    <Input accessibilityLabel="Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={create ? 'new-password' : 'current-password'} />
    <Button disabled={pending} onPress={() => void submit()}>{submitLabel(pending, create)}</Button>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Button disabled={pending} onPress={() => { setCreate(!create); setMessage(''); }}>{switchLabel(create)}</Button>
  </Stack></Screen>;
}
`,
  );
  put(
    root,
    `${directory}/app/account.tsx`,
    `import { useEffect, useState } from 'react';
import { Redirect, router } from 'expo-router';
import { AppLink as Link } from '@/components/app-link';
import { Screen, Stack } from '@workspace/ui/components/layout';
import { Text } from '@workspace/ui/components/text';
import type { Session } from '@workspace/contracts';
import { Button } from '@/components/ui/button';
import { AuthConfiguration } from '@/components/auth-configuration';
import { getAuthClient } from '@/lib/auth-client';
import { sessionApi } from '@/lib/session-api';

export default function AccountRoute() { return <AuthConfiguration><Account /></AuthConfiguration>; }

function Account() {
  const { data: session, isPending, refetch } = getAuthClient().useSession();
  const userId = session?.user.id;
  const [verified, setVerified] = useState<Session['user'] | null>(null);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  useEffect(() => {
    let active = true;
    if (userId) void sessionApi.session().then(
      (current) => { if (active) { setVerified(current.user); setMessage(''); } },
      () => { if (active) { setVerified(null); setMessage('The server could not verify this session. Sign in again or retry when connected.'); } },
    );
    return () => { active = false; };
  }, [userId]);
  async function signOut() {
    setVerified(null); setPending(true); setMessage('');
    try {
      const result = await getAuthClient().signOut();
      if (result.error) { setMessage(result.error.message ?? 'Sign out failed.'); return; }
      await refetch(); router.replace('/sign-in');
    } catch { setMessage('Unable to sign out. Check the connection and retry.'); }
    finally { setPending(false); }
  }
  if (isPending) return <Screen><Text>Restoring session…</Text></Screen>;
  if (!session) return <Redirect href="/sign-in" />;
  return <AccountContent userId={session.user.id} verified={verified} message={message} pending={pending} signOut={signOut} />;
}

function accountMessage(userId: string, verified: Session['user'] | null, message: string): string {
  if (verified?.id === userId) return verified.email;
  return message || 'Verifying with the API…';
}
function AccountContent({ userId, verified, message, pending, signOut }: {
  userId: string; verified: Session['user'] | null; message: string; pending: boolean; signOut: () => Promise<void>;
}) {
  return <Screen><Stack>
    <Text variant="heading" accessibilityRole="header">Account</Text>
    <Text>{accountMessage(userId, verified, message)}</Text>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Button disabled={pending} onPress={() => void signOut()}>{pending ? 'Signing out…' : 'Sign out'}</Button>
    <Link href="/sign-in">Sign in again</Link>
    <Link href="/">Home</Link>
  </Stack></Screen>;
}
`,
  );
}

function put(root: string, file: string, source: string): void {
  writeSource(root, file, file.startsWith('apps/mobile/') ? expoUiSource(root, source) : source);
}
