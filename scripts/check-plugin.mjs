import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildPluginArchive } from './package-plugin.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
if (existsSync(new URL('../plugin/runtime', import.meta.url)))
  throw Error('Plugin must not ship an executable managed runtime.');
const manifest = JSON.parse(readFileSync(new URL('../plugin/plugin.json', import.meta.url)));
if (!manifest.description.includes('Scaffold')) throw Error('Plugin source scope differs.');
const stack = JSON.parse(
  readFileSync(new URL('../plugin/references/stack-registry.json', import.meta.url)),
);
if (
  stack.id !== 'anhedral-stack' ||
  stack.name !== 'Anhedral Stack' ||
  stack.items ||
  Object.keys(stack.additions ?? {})
    .sort()
    .join(',') !== 'backend,r2,stripe'
)
  throw Error('Plugin must describe the single Anhedral Stack and its supported additions.');
buildPluginArchive(root);
// Claude Code's own validator is authoritative for its manifests and skill frontmatter.
// It is optional locally; an unavailable CLI is reported, never treated as a pass.
for (const target of ['plugin', '.']) {
  const result = spawnSync('claude', ['plugin', 'validate', '--strict', target], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error?.code === 'ENOENT') {
    console.warn('Claude Code CLI not found: strict Claude plugin validation was skipped.');
    break;
  }
  if (result.status !== 0)
    throw Error(
      `claude plugin validate --strict ${target} failed:\n${result.stdout}${result.stderr}`,
    );
}
console.log('Source skills and remote Platform MCP plugin validated for Codex and Claude Code.');
