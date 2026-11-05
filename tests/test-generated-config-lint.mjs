import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { spawnSyncPortable } from '../scripts/spawn-command.mjs';

if (!process.argv[2]) throw Error('Pass an installed generated Anhedral Stack workspace.');
const root = path.resolve(process.argv[2]);
const metadata = JSON.parse(readFileSync(path.join(root, 'anhedral.json'), 'utf8'));
assert.equal(metadata.composition.foundation, 'tanstack-start');
const web = path.join(root, 'apps/web');
const eslint = path.join(web, 'node_modules/eslint/bin/eslint.js');
assert.ok(
  existsSync(eslint),
  'Install the generated workspace with its pinned dependencies first.',
);
const result = spawnSyncPortable(process.execPath, [eslint, '.', '--max-warnings', '0'], {
  cwd: web,
  encoding: 'utf8',
  timeout: 120000,
  env: { ...process.env, CI: 'true' },
});
assert.equal(result.status, 0, `Generated web ESLint failed:\n${result.stdout}\n${result.stderr}`);
console.log('Generated Anhedral Stack web ESLint passed.');
