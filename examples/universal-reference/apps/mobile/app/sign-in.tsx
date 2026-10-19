import { useState } from 'react';
import { router } from 'expo-router';
import { ScrollView, Text, TextInput } from 'react-native';
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
  return <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }} keyboardShouldPersistTaps="handled">
    <Text accessibilityRole="header">{modeLabel(create)}</Text>
    {create && <TextInput accessibilityLabel="Name" placeholder="Name" value={name} onChangeText={setName} autoComplete="name" />}
    <TextInput accessibilityLabel="Email" placeholder="Email" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
    <TextInput accessibilityLabel="Password" placeholder="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete={create ? 'new-password' : 'current-password'} />
    <Button disabled={pending} onPress={() => void submit()}>{submitLabel(pending, create)}</Button>
    <Text accessibilityLiveRegion="polite">{message}</Text>
    <Button disabled={pending} onPress={() => { setCreate(!create); setMessage(''); }}>{switchLabel(create)}</Button>
  </ScrollView>;
}
