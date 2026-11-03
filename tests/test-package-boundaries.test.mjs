import assert from 'node:assert/strict';
import test from 'node:test';
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { buildPluginArchive } from '../scripts/package-plugin.mjs';
import { readStoredArchive } from '../scripts/publish-plugin-source.mjs';
import { scanText } from '../scripts/secret-scanner.mjs';
test('plugin ownership rejects extra files and linked distribution roots while retaining remote MCP', () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-boundary-'));
  try {
    const folder = path.join(root, 'plugins/codex/distribution');
    mkdirSync(path.dirname(folder), { recursive: true });
    cpSync(new URL('../plugins/codex/distribution/', import.meta.url), folder, { recursive: true });
    cpSync(new URL('../package.json', import.meta.url), path.join(root, 'package.json'));
    const good = buildPluginArchive(root);
    const files = readStoredArchive(good.contents);
    assert.ok(files.some((file) => file.name === 'mcp.json'));
    writeFileSync(path.join(folder, 'unreviewed.mjs'), 'export const privateImplementation = 1;');
    assert.throws(() => buildPluginArchive(root), /reviewed public distribution/);
    rmSync(path.join(folder, 'unreviewed.mjs'));
    const other = path.join(root, 'actual');
    cpSync(folder, other, { recursive: true });
    rmSync(folder, { recursive: true });
    symlinkSync(other, folder);
    assert.throws(() => buildPluginArchive(root), /symbolic link/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
test('oversized known text is explicitly unscanned and cannot count as secret-clean', () => {
  const bytes = Buffer.alloc(5 * 1024 * 1024 + 1, 32);
  assert.deepEqual(scanText('large.json', bytes), [
    { path: 'large.json', line: 1, pattern: 'unscanned-oversized-text' },
  ]);
  assert.deepEqual(scanText('binary.png', bytes), []);
  assert.deepEqual(scanText('ordinary.json', Buffer.from('{}')), []);
});
