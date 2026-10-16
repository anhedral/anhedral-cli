import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { mkdirSync } from 'node:fs';
import { digest, pluginSourceDigest } from '../plugins/codex/inspector/source-integrity.mjs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { buildPluginArchive } from '../scripts/package-plugin.mjs';
const checkout = path.resolve(import.meta.dirname, '..');
// Portable package-contract fixture: UI compilation runs separately on its supported Node engines.
const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-package-'));
process.on('exit', () => rmSync(root, { recursive: true, force: true }));
for (const relative of ['plugins/codex/distribution', 'src', 'plugins/codex/inspector']) {
  cpSync(path.join(checkout, relative), path.join(root, relative), {
    recursive: true,
    filter: (source) => !['node_modules', 'dist', 'runtime'].includes(path.basename(source)),
  });
}
cpSync(path.join(checkout, 'package.json'), path.join(root, 'package.json'));
const runtime = path.join(root, 'plugins/codex/distribution/runtime');
mkdirSync(runtime, { recursive: true });
const runtimeFiles = {
  'THIRD_PARTY_NOTICES.txt': 'Fixture notices',
  'server.mjs': 'export {};',
  'dashboard.html': '<!doctype html><title>Fixture</title>',
};
for (const [name, bytes] of Object.entries(runtimeFiles))
  writeFileSync(path.join(runtime, name), bytes);
writeFileSync(
  path.join(runtime, 'build.json'),
  JSON.stringify({
    version: JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version,
    sourceDigest: pluginSourceDigest(root),
    files: Object.fromEntries(
      Object.entries(runtimeFiles).map(([name, bytes]) => [name, digest(bytes)]),
    ),
  }),
);
const result = buildPluginArchive(root);
assert.deepEqual(
  result.contents,
  buildPluginArchive(root).contents,
  'Plugin ZIP must be reproducible',
);
let offset = 0;
const files = new Map();
while (result.contents.readUInt32LE(offset) === 0x04034b50) {
  const size = result.contents.readUInt32LE(offset + 18);
  const nameSize = result.contents.readUInt16LE(offset + 26);
  const name = result.contents.subarray(offset + 30, offset + 30 + nameSize).toString();
  const content = result.contents.subarray(offset + 30 + nameSize, offset + 30 + nameSize + size);
  assert.deepEqual(content, readFileSync(path.join(root, 'plugins/codex/distribution', name)));
  files.set(name, content);
  offset += 30 + nameSize + size;
}
assert.ok(files.has('plugin.json'));
assert.ok(files.has('skills/anhedral/SKILL.md'));
assert.ok(files.has('LICENSE'));
for (const name of [
  'mcp.json',
  'runtime/server.mjs',
  'runtime/dashboard.html',
  'runtime/build.json',
  'runtime/THIRD_PARTY_NOTICES.txt',
])
  assert.ok(files.has(name), `Plugin must bundle ${name}`);
const mcp = JSON.parse(files.get('mcp.json')).mcpServers['anhedral-projects'];
assert.equal(mcp.type, 'stdio');
assert.deepEqual(mcp.args, ['${PLUGIN_ROOT}/runtime/server.mjs', 'serve']);
assert.equal(mcp.env, undefined);
for (const legacy of ['server.mjs', 'assets/control-panel.html'])
  assert.equal(files.has(legacy), false, `Default plugin must exclude ${legacy}`);
const manifest = JSON.parse(files.get('plugin.json'));
assert.deepEqual(manifest.extensions['com.openai'].interface.defaultPrompt, [
  'Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.',
]);
for (const field of ['composerIcon', 'composerIconDark', 'logo', 'logoDark']) {
  assert.deepEqual(
    files.get(manifest.extensions['com.openai'].interface[field].replace(/^\.\//, '')),
    Buffer.from(
      readFileSync(
        path.join(root, 'plugins/codex/distribution/assets/anhedral-mark-dark.svg'),
        'utf8',
      ).replace(/fill="white"/g, field.endsWith('Dark') ? 'fill="white"' : 'fill="black"'),
    ),
  );
}
for (const [name, contents] of files) {
  if (!name.endsWith('.md')) continue;
  for (const match of contents.toString().matchAll(/\]\(([^)]+)\)/g)) {
    if (/^(?:https?:|plugin:|#)/.test(match[1])) continue;
    assert.ok(
      files.has(
        path.posix.normalize(path.posix.join(path.posix.dirname(name), match[1].split('#')[0])),
      ),
      `Missing bundled reference: ${match[1]}`,
    );
  }
}
const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-contract-'));
try {
  cpSync(
    path.join(root, 'plugins/codex/distribution'),
    path.join(temporary, 'plugins/codex/distribution'),
    { recursive: true },
  );
  writeFileSync(path.join(temporary, 'package.json'), JSON.stringify({ version: '0.0.0' }));
  assert.throws(() => buildPluginArchive(temporary), /versions must match/);
  writeFileSync(
    path.join(temporary, 'package.json'),
    readFileSync(path.join(root, 'package.json')),
  );
  const distribution = path.join(temporary, 'plugins/codex/distribution');
  for (const name of [
    'mcp.json',
    'skills/anhedral/SKILL.md',
    'skills/anhedral/references/software-factory.md',
    'runtime/server.mjs',
  ]) {
    const file = path.join(distribution, name);
    const contents = readFileSync(file);
    rmSync(file);
    try {
      assert.throws(() => buildPluginArchive(temporary), /missing required file/);
    } finally {
      writeFileSync(file, contents);
    }
  }
  const mcpFile = path.join(distribution, 'mcp.json');
  const mcpBytes = readFileSync(mcpFile);
  const foreignEntrypoint = JSON.parse(mcpBytes);
  foreignEntrypoint.mcpServers['anhedral-projects'].args = ['outside/server.mjs', 'serve'];
  writeFileSync(mcpFile, JSON.stringify(foreignEntrypoint));
  assert.throws(() => buildPluginArchive(temporary), /bundled projects runtime/);
  writeFileSync(mcpFile, mcpBytes);
  const assetFile = path.join(distribution, 'assets/anhedral-mark-dark.svg');
  rmSync(assetFile);
  assert.throws(() => buildPluginArchive(temporary), /must reference a bundled asset/);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
