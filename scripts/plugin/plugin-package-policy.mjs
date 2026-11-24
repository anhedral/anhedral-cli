import assert from 'node:assert/strict';
// Reviewed public distribution: changing this list requires ownership review.
export const pluginPackageFiles = Object.freeze([
  '.claude-plugin/plugin.json',
  'LICENSE',
  'assets/anhedral-mark-dark.svg',
  'assets/anhedral-mark.svg',
  'plugin.json',
  'references/capabilities.md',
  'references/software-factory.md',
  'references/stack-registry.json',
  'references/stack-standard.md',
  'references/ui.md',
  'skills/anhedral-design/SKILL.md',
  'skills/anhedral-design/agents/openai.yaml',
  'skills/anhedral-init/SKILL.md',
  'skills/anhedral-init/agents/openai.yaml',
]);
export function assertPluginPackageFiles(names) {
  assert.deepEqual(
    [...names].sort(),
    [...pluginPackageFiles].sort(),
    'Plugin files must match the reviewed public distribution',
  );
}

export function validStackCatalog(stack, { legacy = false } = {}) {
  const names = Object.keys(stack.additions ?? {})
    .sort()
    .join(',');
  if (legacy && stack.schemaVersion === 1)
    return stack.foundation?.id === 'tanstack-start' && names === 'backend,payment,storage';
  return (
    stack.schemaVersion === 2 &&
    stack.foundation?.id === 'turborepo' &&
    names ===
      'api,auth,backend,cli,client-sync,db,desktop,in-app-purchases,mobile,payment,rtc,storage,web,web-extension'
  );
}
