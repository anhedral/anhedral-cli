export async function hasAccess(request) {
  const response = await request('/api/billing/access');
  if (response.status === 403) return false;
  if (!response.ok) throw Error('Could not check access');
  return true;
}
