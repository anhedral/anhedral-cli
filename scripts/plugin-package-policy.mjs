import assert from 'node:assert/strict';
// Reviewed public distribution: changing this list requires ownership review.
export const pluginPackageFiles = Object.freeze([
  '.claude-plugin/plugin.json',
  '.mcp.json',
  'LICENSE',
  'assets/anhedral-mark-dark.svg',
  'assets/anhedral-mark.svg',
  'mcp.json',
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
