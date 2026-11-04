import assert from 'node:assert/strict';

/** Claude Code reads `.claude-plugin/plugin.json`; both manifests must describe one release. */
export function validateClaudePluginManifest(manifest, codexManifest) {
  const { keywords, ...identity } = manifest;
  assert.deepEqual(
    identity,
    {
      name: 'anhedral',
      displayName: 'Anhedral',
      version: codexManifest.version,
      description: codexManifest.description,
      author: codexManifest.author,
      homepage: `${codexManifest.repository}#readme`,
      repository: codexManifest.repository,
      license: codexManifest.license,
    },
    'Claude plugin manifest must mirror the reviewed plugin identity and version.',
  );
  assert.ok(
    Array.isArray(keywords) && keywords.length && keywords.every((k) => typeof k === 'string'),
    'Claude plugin manifest must list string keywords.',
  );
}

/** The plugin is instructions only: no connection, app or executable hook declarations. */
export function validateCliPluginManifest(manifest) {
  assert.deepEqual(
    Object.keys(manifest).sort(),
    [
      '$schema',
      'name',
      'version',
      'description',
      'author',
      'repository',
      'license',
      'extensions',
    ].sort(),
    'CLI plugin manifest cannot declare connections or executable extensions.',
  );
  assert.deepEqual(Object.keys(manifest.extensions), ['com.openai']);
  const openai = manifest.extensions['com.openai'];
  assert.deepEqual(
    Object.keys(openai),
    ['interface'],
    'CLI plugin supports interface metadata only, without remote apps or hooks.',
  );
  assert.deepEqual(
    Object.keys(openai.interface).sort(),
    [
      'displayName',
      'shortDescription',
      'longDescription',
      'developerName',
      'category',
      'composerIcon',
      'composerIconDark',
      'logo',
      'logoDark',
      'defaultPrompt',
      'capabilities',
    ].sort(),
    'CLI plugin interface must match reviewed source guidance metadata.',
  );
}
