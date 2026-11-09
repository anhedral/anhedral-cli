import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const scripts = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).scripts;

// Follow only repository script calls; generated applications own their own builds.
function commands(name, ancestors = []) {
  assert.ok(!ancestors.includes(name), `Script cycle: ${[...ancestors, name].join(' -> ')}`);
  assert.equal(typeof scripts[name], 'string', `Missing script ${name}`);
  const result = [];
  const before = scripts[`pre${name}`];
  if (before) result.push(...commands(`pre${name}`, [...ancestors, name]));
  for (const command of scripts[name].split(' && ')) {
    const nested = command.match(/^pnpm ([\w:-]+)$/)?.[1];
    if (nested && scripts[nested]) result.push(...commands(nested, [...ancestors, name]));
    else result.push(command);
  }
  return result;
}

test('ordinary tests and release validation compile and type-check the CLI once', () => {
  for (const name of ['test', 'test:all', 'release:check', 'release:pack']) {
    const expanded = commands(name);
    assert.equal(expanded.filter((command) => command === 'tsc').length, 1, name);
    assert.equal(expanded.filter((command) => command === 'tsc --noEmit').length, 0, name);
    assert.ok(
      expanded.indexOf('tsc') < expanded.indexOf('node scripts/build/prepare-cli.mjs'),
      name,
    );
  }
  assert.deepEqual(commands('typecheck'), ['tsc --noEmit']);
  assert.ok(commands('lint').includes('tsc --noEmit'));
});

test('release validation retains every standalone lint and release check', () => {
  const expanded = commands('release:check');
  for (const command of commands('lint').filter((command) => command !== 'tsc --noEmit'))
    assert.ok(expanded.includes(command), `Release validation omitted ${command}`);
  for (const command of [
    'node scripts/security/check-security-policy.mjs',
    'node scripts/security/audit-osv.mjs',
    scripts['test:unit'],
    'node tests/test-braces-install.mjs',
    'node tests/test-forge-install.mjs',
    'node tests/test-packed-cli.js',
    'node tests/test-packlist.js',
  ])
    assert.ok(expanded.includes(command), `Release validation omitted ${command}`);
});

test('package checks and artifact creation cannot trigger another lifecycle build', () => {
  for (const relative of [
    'tests/test-packed-cli.js',
    'tests/test-packlist.js',
    'scripts/release/create-release-artifact.mjs',
  ]) {
    const source = readFileSync(new URL(`../${relative}`, import.meta.url), 'utf8');
    assert.match(source, /'pack',[\s\S]{0,100}'--ignore-scripts'/, relative);
  }
});
