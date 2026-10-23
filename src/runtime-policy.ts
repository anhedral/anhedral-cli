/** Runtime policy shared by generation, setup guidance, and diagnostics. */
export function supportsWorkspaceRuntime(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor] = match.slice(1).map(Number);
  return (major === 22 && minor >= 13) || major >= 24;
}
