/** Runtime policy shared by generation, setup guidance, and diagnostics. */
export function supportsWorkspaceRuntime(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor] = match.slice(1).map(Number);
  return (major === 22 && minor >= 13) || major >= 24;
}

export function supportsVoidRuntime(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor] = match.slice(1).map(Number);
  return major > 24 || (major === 24 && minor >= 21);
}

export function usesVoidSelection(products: readonly string[], hosting: string): boolean {
  return (
    !(products.includes('next') && hosting === 'cloudflare') &&
    !products.includes('queues') &&
    !products.includes('basin') &&
    products.some((product) =>
      ['vinext', 'hono', 'realtime', 'cron', 'workflows'].includes(product),
    )
  );
}
