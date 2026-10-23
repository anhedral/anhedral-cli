import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, readFileSync, rmSync, readdirSync, existsSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import ts from 'typescript';
import { parseStandardOptions, scaffoldStandardProject } from '../dist/standard.js';
import { bootstrapUniversalWorkspace } from '../dist/scaffold/bootstrap.js';
import { composeStack } from '../dist/scaffold/compose.js';
import { resolveStackRegistry } from '../dist/registry/resolve.js';

const defaults = ['anhedral-ui', 'better-auth', 'd1', 'expo', 'hono', 'r2'];
test('connected default, minimal opt-out and explicit alternatives remain deliberate', () => {
  assert.deepEqual(parseStandardOptions(['app']).products, defaults);
  assert.deepEqual(
    resolveStackRegistry(parseStandardOptions(['app'])).items.find(
      (item) => item.name === 'anhedral-ui',
    ).targets,
    ['packages/ui', 'apps/mobile'],
  );
  assert.deepEqual(parseStandardOptions(['app', '--expo', '--hono']).products, defaults);
  assert.deepEqual(parseStandardOptions(['app', '--preset=minimal']).products, [
    'anhedral-ui',
    'expo',
  ]);
  assert.deepEqual(parseStandardOptions(['app', '--next']).products, ['next']);
  assert.deepEqual(parseStandardOptions(['app', '--hono']).products, ['hono']);
  const alternative = parseStandardOptions(['app', '--expo', '--neon', '--clerk']).products;
  assert.ok(
    alternative.includes('neon') && alternative.includes('clerk') && alternative.includes('r2'),
  );
  assert.ok(!alternative.includes('d1') && !alternative.includes('better-auth'));
});

test('default initialization never invokes the Next bootstrap and emits licensed platform-specific UI', async () => {
  const parent = mkdtempSync(path.join(tmpdir(), 'anhedral-client-ui-test-'));
  const root = path.join(parent, 'app');
  const calls = [];
  try {
    const options = parseStandardOptions([root, '--skip-install', '--no-git']);
    await scaffoldStandardProject(
      options,
      (command, args, cwd) => {
        calls.push({ command, args });
        if (args.includes('--lockfile-only'))
          writeFileSync(path.join(cwd, 'pnpm-lock.yaml'), 'lockfileVersion: "9.0"\n');
      },
      { json: true },
    );
    assert.ok(!calls.some(({ args }) => args.includes('dlx')));
    assert.ok(!existsSync(path.join(root, 'apps/web')));
    assert.deepEqual(readdirSync(path.join(root, 'apps')).sort(), ['api', 'mobile']);
    const read = (file) => readFileSync(path.join(root, file), 'utf8');
    const pkg = JSON.parse(read('packages/ui/package.json'));
    assert.deepEqual(pkg.exports['./components/*'], {
      'react-native': './src/components/*.tsx',
      default: './src/components/*.web.tsx',
    });
    assert.match(read('packages/ui/src/web/button.tsx'), /@base-ui\/react\/button/);
    assert.match(read('packages/ui/LICENSE.shadcn'), /MIT License/);
    const upstream = JSON.parse(read('packages/ui/UPSTREAM.json'));
    for (const [name, record] of Object.entries(upstream.files))
      assert.equal(
        createHash('sha256')
          .update(read(`packages/ui/src/web/${name}.tsx`))
          .digest('hex'),
        record.sha256,
      );
    assert.match(
      read('apps/mobile/components/app-providers.tsx'),
      /ThemeProvider as NavigationThemeProvider } from 'expo-router'/,
    );
    assert.match(
      read('apps/mobile/components/app-providers.tsx'),
      /<ThemeProvider><NavigationTheme>/,
    );
    assert.doesNotMatch(read('apps/mobile/app/index.tsx'), /vars\(|useColorScheme|NativeWind/);
    assert.match(read('apps/mobile/app/sign-in.tsx'), /@workspace\/ui\/components\/input/);
    assert.ok(JSON.parse(read('apps/mobile/package.json')).dependencies['expo-system-ui']);
    const nativeColors = read('packages/styling/src/themes.ts');
    assert.match(nativeColors, /#ffffff/);
    assert.match(nativeColors, /rgba\(255,255,255,0.1\)/);
    for (const file of readdirSync(root, { recursive: true }).filter((name) =>
      /\.(ts|tsx)$/.test(name),
    )) {
      const parsed = ts.createSourceFile(file, read(file), ts.ScriptTarget.Latest, true);
      assert.deepEqual(
        parsed.parseDiagnostics.map((d) => d.messageText),
        [],
        file,
      );
    }
  } finally {
    rmSync(parent, { recursive: true, force: true });
  }
});

test('web theme persistence survives blocked storage and synchronizes other tabs', async () => {
  const source = readFileSync(
    new URL('../assets/ui/theme-storage.web.ts', import.meta.url),
    'utf8',
  );
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const values = new Map();
  const events = new Map();
  const classes = new Map();
  const style = {};
  let meta;
  const environment = {
    exports,
    localStorage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => values.set(key, value),
    },
    document: {
      documentElement: { classList: { toggle: (key, value) => classes.set(key, value) }, style },
      querySelector: () => ({
        setAttribute: (_key, value) => {
          meta = value;
        },
      }),
    },
    window: {
      addEventListener: (key, fn) => events.set(key, fn),
      removeEventListener: (key) => events.delete(key),
    },
  };
  vm.runInNewContext(compiled, environment);
  await exports.savePreference('dark');
  assert.equal(await exports.readPreference(), 'dark');
  exports.applyTheme('dark', '#0a0a0a');
  assert.equal(classes.get('dark'), true);
  assert.equal(style.colorScheme, 'dark');
  assert.equal(meta, '#0a0a0a');
  let received;
  const stop = exports.subscribePreference((value) => {
    received = value;
  });
  events.get('storage')({ key: 'anhedral-theme', newValue: 'light' });
  assert.equal(received, 'light');
  events.get('storage')({ key: 'anhedral-theme', newValue: null });
  assert.equal(received, 'system');
  stop();
  assert.equal(events.size, 0);
  environment.localStorage.getItem = () => {
    throw new Error('Blocked');
  };
  environment.localStorage.setItem = () => {
    throw new Error('Blocked');
  };
  assert.equal(await exports.readPreference(), null);
  await exports.savePreference('light');
});

test('minimal profile still owns its design system without auth or storage', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-minimal-ui-test-'));
  try {
    const options = parseStandardOptions([root, '--preset=minimal']);
    bootstrapUniversalWorkspace(root, options.name);
    await composeStack(root, options, resolveStackRegistry(options));
    assert.ok(existsSync(path.join(root, 'packages/ui/src/components/button.tsx')));
    assert.ok(!existsSync(path.join(root, 'apps/api')));
    assert.ok(!existsSync(path.join(root, 'apps/mobile/app/account.tsx')));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('native appearance overrides follow the app choice and System restores device ownership', async () => {
  const source = readFileSync(new URL('../assets/ui/theme-storage.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  const exports = {};
  const modes = [];
  const surfaces = [];
  const storage = new Map();
  vm.runInNewContext(compiled, {
    exports,
    require: (name) => {
      if (name === 'react-native')
        return { Appearance: { setColorScheme: (mode) => modes.push(mode) } };
      if (name === 'expo-system-ui')
        return { setBackgroundColorAsync: async (value) => surfaces.push(value) };
      if (name === '@react-native-async-storage/async-storage')
        return {
          default: {
            getItem: async (key) => storage.get(key) ?? null,
            setItem: async (key, value) => storage.set(key, value),
          },
        };
      throw new Error('Unexpected native dependency: ' + name);
    },
  });
  exports.applyTheme('dark', '#0a0a0a', 'dark');
  exports.applyTheme('light', '#ffffff', 'system');
  assert.deepEqual(modes, ['dark', 'unspecified']);
  assert.deepEqual(surfaces, ['#0a0a0a', '#ffffff']);
  await exports.savePreference('system');
  assert.equal(await exports.readPreference(), 'system');
});
