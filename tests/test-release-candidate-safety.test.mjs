import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createHash } from 'node:crypto';
import { mkdtempSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const integrity = (bytes) => `sha512-${createHash('sha512').update(bytes).digest('base64')}`;
function candidate() {
  const directory = mkdtempSync(path.join(tmpdir(), 'anhedral-reviewed-artifact-'));
  const cli = Buffer.from('CLI bytes whose identity is pinned by the review');
  const plugin = Buffer.from('Plugin bytes whose identity is independently pinned');
  const metadata = {
    schemaVersion: 1,
    name: 'anhedral',
    version: '1.2.3',
    filename: 'anhedral-1.2.3.tgz',
    integrity: integrity(cli),
    shasum: createHash('sha1').update(cli).digest('hex'),
    size: cli.length,
    plugin: {
      schemaVersion: 1,
      version: '1.2.3',
      cliVersion: '1.2.3',
      filename: 'anhedral-plugin-1.2.3.zip',
      integrity: integrity(plugin),
      size: plugin.length,
    },
  };
  const file = path.join(directory, 'metadata.json');
  writeFileSync(path.join(directory, metadata.filename), cli);
  writeFileSync(path.join(directory, metadata.plugin.filename), plugin);
  const save = () => {
    writeFileSync(file, JSON.stringify(metadata));
    writeFileSync(path.join(directory, 'plugin-metadata.json'), JSON.stringify(metadata.plugin));
  };
  save();
  const verify = (environment = {}) =>
    spawnSync(process.execPath, ['scripts/verify-release-artifact.mjs', file], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ANHEDRAL_REQUIRE_PLUGIN: '1',
        ANHEDRAL_EXPECTED_INTEGRITY: metadata.integrity,
        ANHEDRAL_EXPECTED_PLUGIN_INTEGRITY: integrity(plugin),
        ...environment,
      },
    });
  return { directory, file, metadata, save, verify };
}

for (const failure of [
  'none',
  'missing plugin',
  'changed plugin bytes',
  'rewritten plugin declaration',
  'disagreeing metadata',
  'foreign version',
  'symlink metadata',
  'invalid prerelease',
])
  test(`reviewed candidate verification: ${failure}`, () => {
    const fixture = candidate();
    try {
      const plugin = fixture.metadata.plugin;
      if (failure === 'missing plugin') {
        delete fixture.metadata.plugin;
        writeFileSync(fixture.file, JSON.stringify(fixture.metadata));
      }
      if (failure === 'changed plugin bytes')
        writeFileSync(path.join(fixture.directory, plugin.filename), 'changed');
      if (failure === 'rewritten plugin declaration') {
        const bytes = Buffer.from('substituted plugin');
        writeFileSync(path.join(fixture.directory, plugin.filename), bytes);
        plugin.integrity = integrity(bytes);
        plugin.size = bytes.length;
        fixture.save();
      }
      if (failure === 'disagreeing metadata')
        writeFileSync(
          path.join(fixture.directory, 'plugin-metadata.json'),
          JSON.stringify({ ...plugin, cliVersion: '1.2.4' }),
        );
      if (failure === 'invalid prerelease') {
        fixture.metadata.version = '1.2.3-01';
        fixture.save();
      }
      if (failure === 'foreign version') {
        plugin.version = '1.2.4';
        fixture.save();
      }
      if (failure === 'symlink metadata') {
        const target = path.join(fixture.directory, 'original.json');
        writeFileSync(target, JSON.stringify(fixture.metadata));
        rmSync(fixture.file);
        symlinkSync(target, fixture.file);
      }
      const result = fixture.verify();
      assert.equal(result.status === 0, failure === 'none', result.stderr);
    } finally {
      rmSync(fixture.directory, { recursive: true, force: true });
    }
  });

test('CLI-only historical verification remains explicit and cannot satisfy the current release gate', () => {
  const fixture = candidate();
  try {
    delete fixture.metadata.plugin;
    writeFileSync(fixture.file, JSON.stringify(fixture.metadata));
    assert.notEqual(fixture.verify().status, 0);
    assert.equal(
      fixture.verify({ ANHEDRAL_REQUIRE_PLUGIN: '', ANHEDRAL_EXPECTED_PLUGIN_INTEGRITY: '' })
        .status,
      0,
    );
  } finally {
    rmSync(fixture.directory, { recursive: true, force: true });
  }
});
