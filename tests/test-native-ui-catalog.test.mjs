import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import ts from 'typescript';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { NATIVE_UI_DEPENDENCIES, MOBILE_APP_DEPENDENCIES } from '../dist/dependencies.js';
import { loadNativeExampleRecipes } from '../scripts/native-example-recipes.mjs';
import { nativeChecklist } from '../scripts/native-ui-catalog.mjs';
const json = (file) => JSON.parse(readFileSync(file, 'utf8'));
const registry = json('assets/ui/native/registry.json');
const baseline = json('tests/native-ui/upstream-components.json');
test('native catalog covers the independently pinned upstream IDs and every entry has a real export/example/suite', () => {
  assert.equal(registry.schemaVersion, 1);
  assert.equal(registry.baseline.count, baseline.ids.length);
  assert.deepEqual(registry.components.map((item) => item.id).sort(), [...baseline.ids].sort());
  const examples = ts.createSourceFile(
    'examples.tsx',
    readFileSync('tests/native-ui/examples.tsx', 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  let keys = [];
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      node.name.getText(examples) === 'nativeExamples' &&
      ts.isObjectLiteralExpression(node.initializer)
    )
      keys = node.initializer.properties.map((item) => item.name.text);
    ts.forEachChild(node, visit);
  }
  visit(examples);
  assert.deepEqual(
    keys.sort(),
    [...baseline.ids].sort(),
    'A catalog row without a rendered consumer is not parity',
  );
  assert.deepEqual(
    readdirSync('assets/ui/native')
      .filter((name) => /\.tsx?$/.test(name))
      .sort(),
    [...registry.components.map((item) => item.file), ...registry.supportFiles].sort(),
    'Every shipped helper must be explicitly inventoried',
  );
  for (const file of registry.supportFiles) assert.match(file, /^[a-z_][a-z0-9_-]*\.tsx?$/);
  const exported = new Set();
  for (const entry of registry.components) {
    assert.match(entry.id, /^[a-z][a-z-]+$/);
    assert.equal(entry.file, entry.id + '.tsx');
    const source = readFileSync('assets/ui/native/' + entry.file, 'utf8');
    for (const name of entry.exports) {
      assert.equal(exported.has(name), false, 'Public exports must be unambiguous: ' + name);
      exported.add(name);
      assert.ok(source.includes(name), 'Missing component export: ' + name);
    }
    assert.ok(
      existsSync(`tests/native-ui/${entry.suite}.test.tsx`),
      'Missing behavior suite for ' + entry.id,
    );
    assert.match(entry.upstream, /^https:\/\/ui\.shadcn\.com\/docs\/components\/[a-z-]+$/);
    assert.ok(entry.adaptation.length > 20);
    assert.ok(['pending', 'rntl'].includes(entry.automated));
  }
  const checklist = nativeChecklist(registry);
  assert.equal(readFileSync('docs/native-ui.md', 'utf8'), checklist);
  const authored = loadNativeExampleRecipes().recipes;
  assert.ok(checklist.includes(`includes ${authored.length} reviewed source modules`));
  for (const style of ['default', 'new-york'])
    assert.ok(
      checklist.includes(
        `includes ${authored.filter((recipe) => recipe.style === style).length} distinct published`,
      ),
    );
});
test('offline generator ships the entire port, its inventory and public module paths with aligned dependencies', async () => {
  const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-native-catalog-'));
  try {
    const root = path.join(temporary, 'app');
    await scaffoldStandardProject(
      parseStandardOptions([root, '--skip-install', '--no-git']),
      () => {
        throw Error('Native source generation must stay offline.');
      },
      { quiet: true },
    );
    const pkg = path.join(root, 'packages/native-ui');
    for (const file of readdirSync('assets/ui/native').filter((name) => /\.tsx?$/.test(name)))
      assert.equal(
        readFileSync(path.join(pkg, 'src/native', file), 'utf8'),
        readFileSync('assets/ui/native/' + file, 'utf8'),
        'Generated source drift: ' + file,
      );
    assert.deepEqual(json(path.join(pkg, 'NATIVE_COMPONENTS.json')), registry);
    assert.equal(
      readFileSync(path.join(pkg, 'native-registry.md'), 'utf8'),
      readFileSync('docs/native-registry.md', 'utf8'),
    );
    const manifest = json(path.join(pkg, 'package.json'));
    assert.equal(manifest.exports['./components/*'], './src/native/*.tsx');
    const index = readFileSync(path.join(pkg, 'src/index.ts'), 'utf8');
    for (const entry of registry.components)
      assert.ok(
        index.includes(`'./native/${entry.id}'`),
        'Component omitted from public barrel: ' + entry.id,
      );
    for (const [name, version] of Object.entries(NATIVE_UI_DEPENDENCIES.dependencies))
      assert.equal(manifest.dependencies[name], version);
    const harness = json('tests/native-ui/package.json').devDependencies;
    for (const name of ['react', 'react-native', 'expo'])
      assert.equal(
        harness[name],
        MOBILE_APP_DEPENDENCIES.dependencies[name],
        'Tests must run the generated native runtime: ' + name,
      );
    for (const name of ['react-native-svg', 'expo-clipboard'])
      assert.equal(
        harness[name],
        manifest.dependencies[name],
        'Tests must exercise the shipped module pin: ' + name,
      );
    const web = json(path.join(root, 'apps/web/package.json'));
    assert.equal(web.dependencies['react-native-svg'], undefined);
    assert.equal(web.dependencies['expo-clipboard'], undefined);
    for (const file of readdirSync(path.join(pkg, 'src/native')))
      assert.doesNotMatch(
        readFileSync(path.join(pkg, 'src/native', file), 'utf8'),
        /from ['"](?:react-dom|react-native-web|recharts|@base-ui\/react)/,
        'DOM modules cannot enter the native library',
      );
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
});
