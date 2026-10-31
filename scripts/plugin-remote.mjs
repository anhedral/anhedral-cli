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
          extensions: {
            'com.openai': {
              auth: {
                type: 'oauth',
                client: { mode: 'dcr' },
                resource: 'https://platform.anhedral.com/api/mcp',
                baseScopes: ['anhedral:projects:read'],
                defaultScopes: [
                  'anhedral:environment:read',
                  'anhedral:deployments:read',
                  'anhedral:logs:read',
                  'offline_access',
                ],
              },
            },
          },
        },
      },
    },
    'Plugin MCP must use the reviewed remote Platform endpoint without credentials or executable configuration.',
  );
}
