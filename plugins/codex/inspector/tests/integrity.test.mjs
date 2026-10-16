import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
  symlinkSync,
  mkdirSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { verifyPluginRuntime } from '../source-integrity.mjs';
import { buildPluginArchive } from '../../../../scripts/package-plugin.mjs';

test('the real plugin archive includes verified UI assets and refuses source or artifact drift', () => {
  const checkout = path.resolve('../../..');
  verifyPluginRuntime(checkout);
  const archive = buildPluginArchive(checkout);
  assert.ok(archive.contents.includes(Buffer.from('runtime/dashboard.html')));
  assert.ok(archive.contents.includes(Buffer.from('runtime/server.mjs')));
  const fixture = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-integrity-'));
  try {
    for (const relative of [
      'package.json',
      'src',
      'plugins/codex/inspector',
      'plugins/codex/distribution',
    ])
      cpSync(path.join(checkout, relative), path.join(fixture, relative), {
        recursive: true,
        filter: (source) => !['node_modules', 'dist'].includes(path.basename(source)),
      });
    verifyPluginRuntime(fixture);
    mkdirSync(path.join(fixture, 'plugins/codex/inspector/.audit-cache'), { recursive: true });
    writeFileSync(
      path.join(fixture, 'plugins/codex/inspector/.audit-cache/report.json'),
      'unrelated analysis output',
    );
    verifyPluginRuntime(fixture);
    const source = path.join(fixture, 'plugins/codex/inspector/web/main.tsx');
    const original = readFileSync(source);
    writeFileSync(source, Buffer.concat([original, Buffer.from('\n// source changed\n')]));
    assert.throws(() => verifyPluginRuntime(fixture), /source changed/);
    writeFileSync(source, original);
    const sharedDomain = path.join(fixture, 'src/lifecycle.ts');
    const domainOriginal = readFileSync(sharedDomain);
    writeFileSync(
      sharedDomain,
      Buffer.concat([domainOriginal, Buffer.from('\n// shared lifecycle changed\n')]),
    );
    assert.throws(() => verifyPluginRuntime(fixture), /source changed/);
    writeFileSync(sharedDomain, domainOriginal);
    const registry = path.join(
      fixture,
      'plugins/codex/distribution/skills/anhedral/references/stack-registry.json',
    );
    const registryOriginal = readFileSync(registry);
    writeFileSync(registry, Buffer.concat([registryOriginal, Buffer.from(' ')]));
    assert.throws(() => verifyPluginRuntime(fixture), /source changed/);
    writeFileSync(registry, registryOriginal);
    const artifact = path.join(fixture, 'plugins/codex/distribution/runtime/dashboard.html');
    writeFileSync(artifact, 'modified dashboard');
    assert.throws(() => verifyPluginRuntime(fixture), /integrity failed/);
    rmSync(artifact);
    symlinkSync(path.join(checkout, 'plugins/codex/distribution/runtime/dashboard.html'), artifact);
    assert.throws(() => verifyPluginRuntime(fixture), /integrity failed/);
    const manifest = JSON.parse(readFileSync(path.join(fixture, 'package.json'), 'utf8'));
    manifest.version = '0.0.0';
    writeFileSync(path.join(fixture, 'package.json'), JSON.stringify(manifest));
    assert.throws(() => verifyPluginRuntime(fixture), /source changed/);
  } finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
