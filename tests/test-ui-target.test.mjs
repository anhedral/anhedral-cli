import assert from 'node:assert/strict';
import { test } from 'node:test';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createSetupPlan, resolveUiConsumer } from '../dist/index.js';

function fixture(profiles, shared = true, extraProducts = []) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-target-'));
  const put = (file, data) => {
    mkdirSync(path.dirname(path.join(root, file)), { recursive: true });
    writeFileSync(path.join(root, file), typeof data === 'string' ? data : JSON.stringify(data));
  };
  const hosting = profiles.includes('next') ? 'vercel' : 'cloudflare';
  const products = profiles.length ? [...profiles, ...extraProducts] : ['hono'];
  const setup = createSetupPlan({
    root,
    name: 'fixture',
    products,
    hosting,
    skipInstall: true,
    dryRun: true,
    json: false,
    initializeGit: false,
  });
  const config = {
    schemaVersion: 1,
    standard: {
      schemaVersion: 1,
      products: setup.products,
      hosting: profiles.length ? hosting : null,
    },
    setup,
    registry: {
      ...setup.registry,
      status: 'scaffolded',
      workspaces: [],
      resourcesProvisioned: false,
    },
  };
  put('anhedral.json', config);
  for (const profile of profiles) {
    const app = profile === 'expo' ? 'mobile' : 'web';
    const ui = profile === 'expo' && profiles.length > 1 ? 'expo-ui' : 'ui';
    put(`apps/${app}/package.json`, {
      name: `@fixture/${app}`,
      dependencies: {
        [profile]: '1.0.0',
        ...(profile === 'vinext' ? { next: '16.0.0' } : {}),
        ...(shared ? { [`@fixture/${ui}`]: 'workspace:*' } : {}),
      },
    });
    if (shared) {
      put(`packages/${ui}/package.json`, {
        name: `@fixture/${ui}`,
        exports: { './components/*': './src/components/*.tsx' },
      });
      put(`packages/${ui}/src/components/button.tsx`, 'export const Button = 1;');
    }
  }
  return { root, put, config, close: () => rmSync(root, { recursive: true, force: true }) };
}

test('consumer identity and eligibility stay separate across supported profiles', () => {
  for (const profile of ['expo', 'next', 'vinext']) {
    const f = fixture([profile]);
    try {
      const before = readFileSync(path.join(f.root, 'anhedral.json'), 'utf8');
      const result = resolveUiConsumer(f.root, { platform: 'web' });
      assert.equal(result.state, 'migration-required', result.reason);
      assert.equal(result.consumer.profile, profile);
      assert.equal(result.consumer.uiPackage.importNamespace, '@fixture/ui');
      assert.equal(result.eligibility, 'unavailable');
      assert.equal(readFileSync(path.join(f.root, 'anhedral.json'), 'utf8'), before);
      if (profile !== 'expo')
        assert.equal(resolveUiConsumer(f.root, { platform: 'ios' }).state, 'unsupported');
    } finally {
      f.close();
    }
  }
});

test('mixed consumers require app selection and preserve separate namespaces', () => {
  const f = fixture(['expo', 'vinext']);
  try {
    assert.equal(resolveUiConsumer(f.root).state, 'ambiguous');
    const result = resolveUiConsumer(f.root, { app: 'apps/mobile', platform: 'web' });
    assert.equal(result.consumer.profile, 'expo');
    assert.equal(result.consumer.uiPackage.root, 'packages/expo-ui');
    assert.equal(
      resolveUiConsumer(f.root, { app: 'apps/web' }).consumer.uiPackage.importNamespace,
      '@fixture/ui',
    );
  } finally {
    f.close();
  }
});

test('missing shared UI is reported without manufacturing a package', () => {
  const f = fixture(['expo'], false);
  try {
    const result = resolveUiConsumer(f.root);
    assert.equal(result.state, 'migration-required', result.reason);
    assert.equal(result.consumer.uiPackage, null);
  } finally {
    f.close();
  }
});

test('stale receipts, escaped paths, symlinks and export mismatch fail closed', () => {
  for (const mutation of [
    (f) => {
      f.config.registry.cliVersion = 'stale';
      f.put('anhedral.json', f.config);
    },
    (f) =>
      f.put('packages/ui/package.json', {
        name: '@fixture/ui',
        exports: { './button': '../outside.ts' },
      }),
    (f) =>
      f.put('packages/ui/package.json', {
        name: '@fixture/ui',
        exports: { './button': './missing.ts' },
      }),
    (f) => {
      rmSync(path.join(f.root, 'packages/ui/src'), { recursive: true });
      symlinkSync(tmpdir(), path.join(f.root, 'packages/ui/src'));
    },
  ]) {
    const f = fixture(['expo']);
    try {
      mutation(f);
      assert.equal(resolveUiConsumer(f.root).state, 'invalid');
    } finally {
      f.close();
    }
  }
  const f = fixture(['expo']);
  try {
    assert.equal(resolveUiConsumer(f.root, { app: '../outside' }).state, 'invalid');
    assert.equal(resolveUiConsumer(f.root, { platform: 'native' }).state, 'invalid');
  } finally {
    f.close();
  }
});

test('legacy metadata remains identifiable with unavailable eligibility', () => {
  const f = fixture(['expo']);
  try {
    f.config.setup.cliVersion = '0.1.0';
    f.config.setup.registry.cliVersion = '0.1.0';
    f.config.registry.cliVersion = '0.1.0';
    f.put('anhedral.json', f.config);
    const result = resolveUiConsumer(f.root);
    assert.equal(result.state, 'migration-required', result.reason);
    assert.equal(result.consumer.profile, 'expo');
    assert.match(result.reason, /Legacy/);
  } finally {
    f.close();
  }
});

test('connected Expo keeps Expo identity and Hono-only has no UI consumer', () => {
  const connected = fixture(['expo'], true, ['hono', 'd1', 'better-auth', 'r2']);
  const server = fixture([]);
  try {
    assert.equal(resolveUiConsumer(connected.root).consumer.profile, 'expo');
    const result = resolveUiConsumer(server.root);
    assert.equal(result.state, 'unsupported', result.reason);
    assert.equal(result.consumer, null);
  } finally {
    connected.close();
    server.close();
  }
});

test('Vinext compatibility dependency resolves, but a conflicting selected recipe does not', () => {
  const f = fixture(['vinext']);
  try {
    assert.equal(resolveUiConsumer(f.root).consumer.profile, 'vinext');
    f.put('apps/web/package.json', { name: '@fixture/web', dependencies: { next: '16.0.0' } });
    assert.equal(resolveUiConsumer(f.root).state, 'invalid');
  } finally {
    f.close();
  }
});

test('only runtime workspace relationships identify the button provider', () => {
  const f = fixture(['expo']);
  try {
    f.put('packages/dev-helper/package.json', {
      name: '@fixture/dev-helper',
      exports: { './button': './button.ts' },
    });
    f.put('packages/dev-helper/button.ts', 'export const Button = 1;');
    f.put('apps/mobile/package.json', {
      name: '@fixture/mobile',
      dependencies: { expo: '1.0.0', '@fixture/ui': 'workspace:*' },
      devDependencies: { '@fixture/dev-helper': 'workspace:*' },
    });
    assert.equal(resolveUiConsumer(f.root).consumer.uiPackage.importNamespace, '@fixture/ui');
    f.put('apps/mobile/package.json', {
      name: '@fixture/mobile',
      dependencies: { expo: '1.0.0' },
      devDependencies: { '@fixture/ui': 'workspace:*' },
    });
    assert.equal(resolveUiConsumer(f.root).consumer.uiPackage, null);
  } finally {
    f.close();
  }
});

test('declared export conditions preserve platform and declaration ordering', () => {
  const f = fixture(['expo']);
  try {
    f.put('packages/ui/src/components/button.web.tsx', 'export const Button = 2;');
    f.put('packages/ui/package.json', {
      name: '@fixture/ui',
      exports: {
        './components/*': {
          'react-native': './src/components/*.tsx',
          default: './src/components/*.web.tsx',
        },
      },
    });
    const web = resolveUiConsumer(f.root, { platform: 'web' });
    assert.equal(web.consumer.uiPackage.buttonTargets.web, 'src/components/button.web.tsx');
    assert.equal(web.consumer.uiPackage.buttonTargets.ios, 'src/components/button.tsx');
    assert.equal(resolveUiConsumer(f.root, { platform: 'ios' }).consumer.platform, 'ios');
    f.put('packages/ui/package.json', {
      name: '@fixture/ui',
      exports: {
        './button': {
          default: './src/components/button.web.tsx',
          'react-native': './src/components/button.tsx',
        },
      },
    });
    assert.equal(
      resolveUiConsumer(f.root).consumer.uiPackage.buttonTargets.ios,
      'src/components/button.web.tsx',
    );
    f.put('packages/ui/package.json', {
      name: '@fixture/ui',
      exports: { './button': { browser: './src/components/button.web.tsx', 'react-native': null } },
    });
    assert.equal(resolveUiConsumer(f.root, { platform: 'ios' }).state, 'unsupported');
    assert.equal(resolveUiConsumer(f.root, { platform: 'web' }).consumer.profile, 'expo');
    f.put('packages/ui/package.json', {
      name: '@fixture/ui',
      exports: { './button': ['./src/components/button.tsx'] },
    });
    assert.equal(resolveUiConsumer(f.root).state, 'invalid');
  } finally {
    f.close();
  }
});

test('bounded reads reject oversized manifests, aggregate declarations and workspace counts', () => {
  for (const mutation of [
    (f) => f.put('apps/mobile/package.json', ' '.repeat(128 * 1024 + 1)),
    (f) => {
      for (let i = 0; i < 34; i++)
        f.put(`packages/p${i}/package.json`, { name: `p${i}`, padding: 'x'.repeat(126 * 1024) });
    },
    (f) => {
      for (let i = 0; i < 129; i++) f.put(`packages/p${i}/package.json`, { name: `p${i}` });
    },
  ]) {
    const f = fixture(['expo']);
    try {
      mutation(f);
      assert.equal(resolveUiConsumer(f.root).state, 'invalid');
    } finally {
      f.close();
    }
  }
});

test('unsafe selection, receipt and manifest forms fail without echoing source content', () => {
  for (const mutation of [
    (f) => f.put('anhedral.json', '{"secret":"do-not-echo",invalid}'),
    (f) => {
      f.config.setup.products = ['hono'];
      f.put('anhedral.json', f.config);
    },
    (f) => {
      f.config.registry.ui = {};
      f.put('anhedral.json', f.config);
    },
    (f) =>
      f.put('apps/mobile/package.json', {
        name: '@fixture/mobile',
        dependencies: { expo: '1', next: '1' },
      }),
    (f) => {
      rmSync(path.join(f.root, 'apps/mobile'), { recursive: true });
      symlinkSync(tmpdir(), path.join(f.root, 'apps/mobile'));
    },
  ]) {
    const f = fixture(['expo']);
    try {
      mutation(f);
      const result = resolveUiConsumer(f.root);
      assert.equal(result.state, 'invalid');
      assert.doesNotMatch(result.reason, /do-not-echo/);
    } finally {
      f.close();
    }
  }
  const f = fixture(['expo']);
  try {
    assert.equal(resolveUiConsumer(f.root, { app: 'apps\\mobile' }).state, 'invalid');
    assert.equal(resolveUiConsumer(f.root, { app: '/apps/mobile' }).state, 'invalid');
    assert.equal(resolveUiConsumer(f.root, { app: 'apps/absent' }).state, 'unsupported');
  } finally {
    f.close();
  }
});

test('overlapping export patterns cannot advertise a blocked or redirected button', () => {
  for (const specific of [null, './src/other.tsx']) {
    const f = fixture(['expo']);
    try {
      f.put('packages/ui/src/other.tsx', 'export const Button = 2;');
      f.put('packages/ui/package.json', {
        name: '@fixture/ui',
        exports: {
          './components/*': './src/components/*.tsx',
          './components/b*': specific,
        },
      });
      const result = resolveUiConsumer(f.root);
      assert.equal(result.state, 'invalid');
      assert.match(result.reason, /Overlapping UI export patterns/);
      assert.equal(result.consumer, null);
    } finally {
      f.close();
    }
  }
});
