import assert from 'node:assert/strict';
/** The public plugin may connect to the Platform's OAuth-protected remote MCP.
 * It never packages an executable server, credentials, headers or a command. */
export function validatePluginRemote(config) {
  assert.deepEqual(
    config,
    {
      $schema: 'https://agent-plugins.org/schemas/1.0.0/mcp.schema.json',
      mcpServers: {
        anhedral: {
          type: 'streamable-http',
          url: 'https://platform.anhedral.com/api/mcp',
        },
      },
    },
    'Plugin MCP must use the reviewed remote Platform endpoint without credentials or executable configuration.',
  );
}

/** Claude Code reads `.mcp.json`; it discovers OAuth metadata itself and accepts no scope list. */
export function validateClaudePluginRemote(config) {
  assert.deepEqual(
    config,
    {
      mcpServers: {
        platform: { type: 'http', url: 'https://platform.anhedral.com/api/mcp' },
      },
    },
    'Claude plugin MCP must use the same reviewed remote Platform endpoint without credentials or executable configuration.',
  );
}

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
