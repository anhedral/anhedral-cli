// Exercise the actual transitive Expo consumers after installing a generated workspace.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';

assert.ok(process.argv[2], 'Specify an installed generated workspace');
const root = path.resolve(process.argv[2]);
const mobile = createRequire(path.join(root, 'apps/mobile/package.json'));
const expo = createRequire(mobile.resolve('expo/package.json'));
const cli = createRequire(expo.resolve('@expo/cli/package.json'));
const base = path.dirname(expo.resolve('@expo/cli/package.json'));
assert.equal(cli('zod/package.json').version, '4.6.6');
const { PluginSchema, DevToolsPluginOutputSchema } = cli(
  path.join(base, 'build/src/start/server/DevToolsPlugin.schema.js'),
);
const { createMCPDevToolsExtensionSchema } = cli(
  path.join(base, 'build/src/start/server/createMCPDevToolsExtensionSchema.js'),
);
const plugin = PluginSchema.parse({
  packageName: 'synthetic-plugin',
  packageRoot: '/synthetic',
  cliExtensions: {
    description: 'Synthetic',
    entryPoint: './commands.js',
    commands: [
      {
        name: 'inspect',
        title: 'Inspect',
        environments: ['cli', 'mcp'],
        parameters: [
          { name: 'count', type: 'number' },
          { name: 'approved', type: 'confirm' },
          { name: 'label', type: 'text' },
        ],
      },
    ],
  },
});
const schema = createMCPDevToolsExtensionSchema(plugin);
assert.equal(
  schema.safeParse({ command: 'inspect', count: 1, approved: true, label: 'synthetic' }).success,
  true,
);
for (const value of [
  { command: 'foreign' },
  { command: 'inspect', count: 'bad' },
  { command: 'inspect', extra: true },
])
  assert.equal(schema.safeParse(value).success, false);
assert.equal(PluginSchema.safeParse({ ...plugin, packageName: '' }).success, false);
assert.equal(
  DevToolsPluginOutputSchema.safeParse([{ type: 'text', text: 'synthetic', level: 'info' }])
    .success,
  true,
);
assert.equal(
  DevToolsPluginOutputSchema.safeParse([{ type: 'image', url: 'invalid' }]).success,
  false,
);
console.log('PASS actual Expo plugin/MCP schema validation with scoped Zod 4.6.6.');
