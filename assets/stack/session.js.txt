// Callers supply platform-appropriate token storage. Use the signed-in user's origin throughout.
export async function signIn(request, email, password, saveToken) {
  const response = await request('/api/auth/sign-in/email', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw Error('Sign-in failed');
  const token = response.headers.get('set-auth-token');
  if (!token) throw Error('Session token unavailable');
  await saveToken(token);
}
export async function signOut(request, clearToken) {
  const response = await request('/api/auth/sign-out', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{}',
  });
  if (!response.ok) throw Error('Sign-out failed');
  await clearToken();
}
export async function currentUser(request) {
  const response = await request('/api/session');
  if (response.status === 401) return null;
  if (!response.ok) throw Error('Session unavailable');
  return (await response.json()).userId;
}
