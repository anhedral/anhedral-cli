import {
  CLIENT_DEPENDENCIES,
  ELECTRON_NODE_TYPES,
  WEB_DEPENDENCIES,
  STACK_DEPENDENCIES,
  ANHEDRAL_STACK_DEPENDENCIES,
} from '../dependencies.js';
import { packageNameFromText, resourceName } from '../render.js';
import { stackTemplate } from '../scaffold/files.js';
import { usesD1, type Capability } from './catalog.js';
import { fingerprint, type CapabilityEditor } from './editor.js';

const clients = ['web', 'mobile', 'desktop', 'web-extension', 'cli'] as const;
type Client = (typeof clients)[number];
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
export function addClient(e: CapabilityEditor, id: Exclude<Client, 'web'>, projectName: string) {
  const root = 'apps/' + id;
  const write = (path: string, value: string) => e.create(root + '/' + path, value);
  const name = packageNameFromText(projectName);
  const manifest = { name: '@workspace/' + id, private: true, version: '0.1.0', type: 'module' };
  const ts = STACK_DEPENDENCIES.typescript;
  const html =
    '<!doctype html>\n<html lang="en"><meta charset="utf-8"><title>' +
    name +
    '</title><main>' +
    name +
    '</main></html>\n';
  switch (id) {
    case 'cli':
      write(
        'package.json',
        json({
          ...manifest,
          bin: { [name]: 'dist/index.js' },
          files: ['dist'],
          scripts: {
            build: 'tsc',
            typecheck: 'tsc --noEmit',
            dev: 'tsc && node dist/index.js',
          },
          dependencies: { commander: CLIENT_DEPENDENCIES['commander'] },
          devDependencies: { typescript: ts, '@types/node': CLIENT_DEPENDENCIES['@types/node'] },
        }),
      );
      write(
        'tsconfig.json',
        json({
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            rootDir: 'src',
            outDir: 'dist',
            strict: true,
            skipLibCheck: true,
          },
          include: ['src'],
        }),
      );
      write('src/index.ts', stackTemplate('commander.ts.txt'));
      break;
    case 'mobile':
      write(
        'package.json',
        json({
          ...manifest,
          main: 'index.js',
          scripts: {
            dev: 'expo start',
            build: 'expo export --platform ios --platform android',
            typecheck: 'tsc --noEmit',
          },
          dependencies: {
            expo: CLIENT_DEPENDENCIES['expo'],
            react: CLIENT_DEPENDENCIES['react'],
            'react-native': CLIENT_DEPENDENCIES['react-native'],
          },
          devDependencies: { typescript: ts, '@types/react': CLIENT_DEPENDENCIES['@types/react'] },
        }),
      );
      write(
        'app.json',
        json({ expo: { name, slug: name, scheme: resourceName(name, 'app'), plugins: [] } }),
      );
      write(
        'tsconfig.json',
        json({ extends: 'expo/tsconfig.base', compilerOptions: { strict: true } }),
      );
      write(
        'index.js',
        "import { registerRootComponent } from 'expo';\nimport App from './App';\nregisterRootComponent(App);\n",
      );
      write('App.tsx', stackTemplate('mobile-app.tsx.txt').replace('__APP_NAME__', name));
      write('.gitignore', '.expo/\nios/\nandroid/\n');
      break;
    case 'desktop':
      write(
        'package.json',
        json({
          ...manifest,
          productName: name,
          main: 'out/main/index.js',
          scripts: {
            dev: 'install-electron && electron-vite dev --ignoreConfigWarning',
            typecheck: 'tsc --noEmit',
            build: 'electron-vite build --ignoreConfigWarning && node package.mjs',
          },
          dependencies: {
            react: WEB_DEPENDENCIES.dependencies!.react,
            'react-dom': WEB_DEPENDENCIES.dependencies!['react-dom'],
          },
          devDependencies: {
            electron: CLIENT_DEPENDENCIES.electron,
            'electron-vite': CLIENT_DEPENDENCIES['electron-vite'],
            '@electron/packager': CLIENT_DEPENDENCIES['@electron/packager'],
            vite: ANHEDRAL_STACK_DEPENDENCIES.vite,
            typescript: ts,
            '@types/node': ELECTRON_NODE_TYPES,
            '@types/react': WEB_DEPENDENCIES.devDependencies!['@types/react'],
            '@types/react-dom': WEB_DEPENDENCIES.devDependencies!['@types/react-dom'],
          },
        }),
      );
      write(
        'tsconfig.json',
        json({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            jsx: 'react-jsx',
            allowJs: true,
            types: ['node', 'vite/client'],
            strict: true,
            skipLibCheck: true,
            noEmit: true,
          },
          include: ['src', 'ui'],
        }),
      );
      write('electron.vite.config.mjs', stackTemplate('electron-vite.js.txt'));
      write(
        'src/main/index.ts',
        stackTemplate('electron-main.ts.txt').replaceAll(
          '__DESKTOP_HOST__',
          resourceName(name, 'desktop'),
        ),
      );
      write(
        'ui/index.html',
        stackTemplate('electron-renderer.html.txt').replaceAll('__APP_NAME__', name),
      );
      write('ui/main.tsx', stackTemplate('electron-renderer.tsx.txt'));
      write('package.mjs', stackTemplate('electron-package.js.txt'));
      write('turbo.json', json({ extends: ['//'], tasks: { build: { cache: false } } }));
      write('.gitignore', 'out/\nrelease/\n');
      break;
    case 'web-extension':
      write(
        'package.json',
        json({
          ...manifest,
          scripts: { dev: 'wxt', build: 'wxt build', zip: 'wxt zip' },
          devDependencies: { wxt: CLIENT_DEPENDENCIES['wxt'] },
        }),
      );
      write('turbo.json', json({ extends: ['//'], tasks: { build: { outputs: ['.output/**'] } } }));
      write('entrypoints/popup/index.html', html);
      write('.gitignore', '.wxt/\n.output/\n');
      break;
  }
  e.merge('package.json', 'scripts', { ['dev:' + id]: 'pnpm --dir ' + root + ' dev' });
}

export function addCloudFeature(
  e: CapabilityEditor,
  id: 'rtc' | 'client-sync' | 'in-app-purchases',
) {
  const feature = (name: string) =>
    e.create('apps/api/src/features/' + name + '.ts', stackTemplate(name + '.ts.txt'));
  if (id === 'client-sync') {
    const file = 'apps/api/wrangler.jsonc';
    const config = e.json(file);
    if (config.main !== 'src/index.ts')
      throw Error('Reconcile the custom API Worker entry before adding client-sync.');
    const bindings = config.durable_objects?.bindings ?? [];
    const migrations = config.migrations ?? [];
    if (
      !Array.isArray(bindings) ||
      !Array.isArray(migrations) ||
      bindings.some((b) => b.name === 'CLIENT_SYNC' || b.class_name === 'ClientSync') ||
      migrations.some(
        (m) => m.tag === 'anhedral-client-sync-v1' || JSON.stringify(m).includes('"ClientSync"'),
      )
    )
      throw Error('Reconcile the existing ClientSync binding or migration.');
    e.set(
      file,
      ['durable_objects', 'bindings'],
      [...bindings, { name: 'CLIENT_SYNC', class_name: 'ClientSync' }],
    );
    e.set(
      file,
      ['migrations'],
      [...migrations, { tag: 'anhedral-client-sync-v1', new_sqlite_classes: ['ClientSync'] }],
    );
    e.set(file, ['main'], 'src/sync-worker.ts');
  } else if (id === 'rtc') {
    feature(id);
    const d1 = usesD1(e);
    e.create(
      'apps/api/src/room-store.ts',
      stackTemplate(d1 ? 'room-store-d1.ts.txt' : 'room-store-pg.ts.txt'),
    );
    e.create(
      'packages/db/src/rtc-schema.ts',
      !d1
        ? stackTemplate('pg-rtc-schema.ts.txt')
        : "import { sqliteTable, text, primaryKey } from 'drizzle-orm/sqlite-core';\nexport const rtcMember=sqliteTable('rtc_member',{roomId:text('room_id').notNull(),userId:text('user_id').notNull()},t=>[primaryKey({columns:[t.roomId,t.userId]})]);\n",
    );
    const schema = 'packages/db/src/schema.ts';
    e.writes.set(schema, e.read(schema) + "\nexport * from './rtc-schema';\n");
  } else {
    e.merge('apps/mobile/package.json', 'dependencies', {
      'react-native-purchases': CLIENT_DEPENDENCIES['react-native-purchases'],
    });
    e.create('apps/mobile/src/purchases.ts', stackTemplate('purchases.ts.txt'));
    feature('revenuecat');
  }
}

function registerCliCommands(e: CapabilityEditor, name: 'api' | 'session') {
  const file = 'apps/cli/src/index.ts';
  const source = e.read(file);
  const anchor = 'if (process.argv.length === 2)';
  if (!source || source.split(anchor).length !== 2)
    throw Error('Reconcile the CLI command registration in ' + file);
  const symbol = name === 'api' ? 'registerApi' : 'registerSession';
  e.create('apps/cli/src/' + name + '-commands.ts', stackTemplate('cli-' + name + '.ts.txt'));
  const newline = source.indexOf('\n');
  const updated =
    source.slice(0, newline + 1) +
    'import { ' +
    symbol +
    " } from './" +
    name +
    "-commands.js';\n" +
    source.slice(newline + 1);
  e.writes.set(file, updated.replace(anchor, symbol + '(program);\n' + anchor));
}

export function connectClients(
  e: CapabilityEditor,
  installed: Capability[],
  previous: Capability[],
) {
  if (!installed.includes('hono')) return;
  const active = clients.filter((id) => installed.includes(id));
  if (!active.length) return;
  const first = !previous.includes('hono') || !clients.some((id) => previous.includes(id));
  // Legacy web-only API consumers already use the web Worker service binding.
  const external = active.filter((id) => id !== 'web');
  const shared =
    external.length > 0 || installed.some((id) => id === 'client-sync' || id === 'rtc');
  if (!shared) return;
  const path = 'packages/api-client/';
  const fresh =
    first ||
    (!clients.some((id) => id !== 'web' && previous.includes(id)) &&
      !previous.includes('rtc') &&
      !previous.includes('client-sync'));
  if (fresh || !e.read(path + 'package.json')) {
    e.create(
      path + 'package.json',
      json({
        name: '@workspace/api-client',
        version: '0.1.0',
        private: true,
        type: 'module',
        exports: { '.': { types: './index.d.ts', default: './index.js' } },
      }),
    );
    e.create(path + 'index.js', stackTemplate('api-client.js.txt'));
    e.create(path + 'index.d.ts', stackTemplate('api-index.d.ts.txt'));
  }
  for (const id of active) {
    const root = 'apps/' + id;
    if (fresh || !previous.includes(id)) {
      e.merge(root + '/package.json', id === 'cli' ? 'devDependencies' : 'dependencies', {
        '@workspace/api-client': 'workspace:*',
      });
      if (id === 'cli') {
        const pkg = root + '/package.json';
        const scripts = e.json(pkg).scripts;
        if (scripts.build !== 'tsc' || scripts.dev !== 'tsc && node dist/index.js')
          throw Error('Reconcile customized CLI build scripts before adding the API client');
        e.merge(pkg, 'devDependencies', { esbuild: CLIENT_DEPENDENCIES.esbuild });
        e.set(
          pkg,
          ['scripts', 'build'],
          'tsc --noEmit && esbuild src/index.ts --bundle --platform=node --target=node22 --format=esm --external:commander --outfile=dist/index.js',
        );
        e.set(pkg, ['scripts', 'dev'], 'pnpm run build && node dist/index.js');
      }
      const origin = {
        web: 'location.origin',
        mobile: 'process.env.EXPO_PUBLIC_API_ORIGIN',
        cli: 'process.env.API_ORIGIN',
        desktop: 'import.meta.env.VITE_API_ORIGIN',
        'web-extension': 'import.meta.env.WXT_API_ORIGIN',
      }[id];
      const file = id === 'desktop' ? 'ui/api.js' : id === 'cli' ? 'src/api.ts' : 'src/api.js';
      e.create(
        root + '/' + file,
        "import { createClient } from '@workspace/api-client';\nexport function apiClient(" +
          (id === 'cli'
            ? 'origin = ' + origin + ', getToken = () => process.env.API_TOKEN'
            : 'origin = ' + origin + ', getToken') +
          ") {\n  if (!origin) throw Error('Configure the application API origin');\n  return createClient(origin, getToken);\n}\n",
      );
    }
  }
  if (active.includes('cli')) {
    if (fresh || !previous.includes('cli')) registerCliCommands(e, 'api');
    if (
      installed.includes('database-auth') &&
      (fresh || !previous.includes('database-auth') || !previous.includes('cli'))
    )
      registerCliCommands(e, 'session');
  }
  const joined = (id: Capability) => fresh || !previous.includes(id);
  function addClientModule(name: string) {
    const templates: Record<string, string> = { rtc: 'rtc-client', files: 'files-client' };
    e.create(path + name + '.js', stackTemplate((templates[name] ?? name) + '.js.txt'));
    e.create(path + name + '.d.ts', stackTemplate('api-' + name + '.d.ts.txt'));
    e.merge(path + 'package.json', 'exports', {
      ['./' + name]: { types: './' + name + '.d.ts', default: './' + name + '.js' },
    });
  }
  if (installed.includes('r2') && joined('r2')) addClientModule('files');
  if (
    (installed.includes('stripe') || installed.includes('in-app-purchases')) &&
    (fresh || (!previous.includes('stripe') && !previous.includes('in-app-purchases')))
  )
    addClientModule('access');
  if (external.length && (first || !clients.some((id) => id !== 'web' && previous.includes(id))))
    e.create('apps/api/src/client-origins.ts', stackTemplate('client-origins.ts.txt'));
  if (installed.includes('database-auth') && joined('database-auth')) {
    addClientModule('session');
  }
  if (
    installed.includes('database-auth') &&
    installed.includes('mobile') &&
    (joined('database-auth') || joined('mobile'))
  ) {
    e.merge('apps/mobile/package.json', 'dependencies', {
      'expo-secure-store': CLIENT_DEPENDENCIES['expo-secure-store'],
    });
    e.create('apps/mobile/src/session.js', stackTemplate('mobile-session.js.txt'));
  }
  if (installed.includes('rtc')) {
    if (joined('rtc')) addClientModule('rtc');
    if (active.includes('web') && (joined('rtc') || joined('web'))) {
      e.merge('apps/web/package.json', 'dependencies', {
        // The 2.1 UI declares its meeting type against the 2.0 core.
        '@cloudflare/realtimekit-react': CLIENT_DEPENDENCIES['@cloudflare/realtimekit-react'],
        '@cloudflare/realtimekit-react-ui': CLIENT_DEPENDENCIES['@cloudflare/realtimekit-react-ui'],
      });
      e.create('apps/web/src/components/Call.tsx', stackTemplate('call.tsx.txt'));
    }
    if (active.includes('mobile') && (joined('rtc') || joined('mobile'))) {
      e.merge('apps/mobile/package.json', 'dependencies', {
        '@cloudflare/realtimekit-react-native':
          CLIENT_DEPENDENCIES['@cloudflare/realtimekit-react-native'],
        '@cloudflare/react-native-webrtc': CLIENT_DEPENDENCIES['@cloudflare/react-native-webrtc'],
        '@expo/config-plugins': CLIENT_DEPENDENCIES['@expo/config-plugins'],
      });
      const file = 'apps/mobile/app.json';
      const plugins = e.json(file).expo?.plugins ?? [];
      if (!Array.isArray(plugins)) throw Error('Invalid Expo plugins configuration');
      for (const plugin of [
        '@cloudflare/realtimekit-react-native',
        '@cloudflare/react-native-webrtc',
      ]) {
        if (!plugins.some((item) => (Array.isArray(item) ? item[0] : item) === plugin))
          e.set(file, ['expo', 'plugins', -1], plugin);
      }
      e.create('apps/mobile/src/Call.tsx', stackTemplate('native-call.tsx.txt'));
    }
  }
  if (installed.includes('client-sync') && (fresh || !previous.includes('client-sync'))) {
    e.merge(path + 'package.json', 'exports', {
      './sync': { types: './sync.d.ts', default: './sync.js' },
    });
  }
}

export function composeSync(
  e: CapabilityEditor,
  installed: Capability[],
  operation: 'compose' | 'update',
) {
  // These pre-WebSocket releases created consumer-owned files without recording a baseline.
  const files = [
    [
      'apps/api/src/sync-worker.ts',
      'sync-worker.ts.txt',
      '9714cef25b8a286b5d52d686c46b9b0ebc5fa20e7b015b46da40b6062dc338c6',
    ],
    [
      'apps/api/src/features/client-sync.ts',
      'client-sync.ts.txt',
      'c289f5c56b668145c9b13384833b8065e25919af451d21340c7a73ca34eeb2e7',
    ],
  ];
  if (clients.some((id) => installed.includes(id)))
    files.push(
      [
        'packages/api-client/sync.js',
        'sync-client.js.txt',
        '2e6ba287c483cc13370c4978105d4897bad9068321a2e7f685a6253ca50e22b0',
      ],
      [
        'packages/api-client/sync.d.ts',
        'sync.d.ts.txt',
        'e9c0d72fb347f5a4811aebe11bf2797261bf0a60a1d2f1db6e4a538b302fa275',
      ],
    );
  if (installed.includes('mobile'))
    files.push(['apps/mobile/src/sync.js', 'mobile-sync.js.txt', '']);
  for (const id of ['web', 'desktop', 'web-extension'] as const) {
    if (installed.includes(id))
      files.push([
        'apps/' + id + (id === 'desktop' ? '/ui' : '/src') + '/sync.js',
        'browser-sync.js.txt',
        '',
      ]);
  }
  if (installed.includes('desktop')) {
    const file = 'apps/desktop/ui/index.html';
    const pkg = e.json('apps/desktop/package.json');
    if (pkg.devDependencies?.electron && pkg.productName) {
      const original = stackTemplate('electron-renderer.html.txt').replaceAll(
        '__APP_NAME__',
        pkg.productName,
      );
      if (e.read(file) === original)
        e.writes.set(
          file,
          original.replace('ws://127.0.0.1:1420', 'wss: ws://127.0.0.1:* ws://localhost:*'),
        );
    }
  }
  for (const [file, asset, legacy] of files) {
    const current = e.read(file);
    if (current && !e.managed[file] && fingerprint(current) === legacy) e.managed[file] = legacy;
    // Preserve customized, already-current helpers across unrelated additions.
    if (operation === 'compose' && current && e.managed[file] === fingerprint(stackTemplate(asset)))
      continue;
    e.owned(file, stackTemplate(asset));
  }
}
