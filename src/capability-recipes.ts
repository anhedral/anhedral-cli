import { readFileSync } from 'node:fs';
import { parseDocument } from 'yaml';
import { CapabilityEditor, fingerprint } from './capability-editor.js';
import { CAPABILITY_DEPENDENCIES as P } from './dependencies.js';
import { STACK_DEPENDENCIES as D } from './dependencies.js';
import { resourceName } from './render.js';
import { WEB_API_PROXY } from './platforms/web.js';
import type { Capability } from './capability-catalog.js';

const template = (name: string) =>
  readFileSync(new URL(`../assets/stack/${name}`, import.meta.url), 'utf8');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
function dependency(e: CapabilityEditor, app: string, dependencies: Record<string, string>) {
  e.merge(`${app}/package.json`, 'dependencies', dependencies);
}
function project(
  e: CapabilityEditor,
  directory: string,
  name: string,
  scripts: Record<string, string>,
  dependencies: Record<string, string>,
  dev: Record<string, string> = {},
) {
  e.create(
    `${directory}/package.json`,
    json({
      name,
      private: true,
      version: '0.1.0',
      type: 'module',
      scripts,
      dependencies,
      devDependencies: { typescript: D.typescript, ...dev },
    }),
  );
}
function apiConfig(e: CapabilityEditor, key: string, value: unknown) {
  const file = 'apps/api/wrangler.jsonc';
  const current = e.json(file)[key];
  if (Array.isArray(current) && Array.isArray(value)) {
    for (const entry of value) {
      const previous = current.find((item) => item.binding === entry.binding);
      if (previous && JSON.stringify(previous) !== JSON.stringify(entry))
        throw Error(`Preserve existing ${entry.binding} in ${file}; reconcile it first.`);
      if (!previous) e.set(file, [key, -1], entry);
    }
    return;
  }
  if (current !== undefined && JSON.stringify(current) !== JSON.stringify(value))
    throw Error(`Preserve existing ${key} in ${file}; reconcile it before adding this capability.`);
  e.set(file, [key], value);
}
function schemaExport(e: CapabilityEditor, module: string) {
  const file = 'packages/db/src/schema.ts';
  const source = e.read(file);
  if (source === null) throw Error('Database schema is missing.');
  // Appending an export preserves all consumer-owned schema declarations.
  e.writes.set(file, source + `\nexport * from './${module}';\n`);
}
export function addCapabilityRecipe(e: CapabilityEditor, id: Capability, name: string) {
  switch (id) {
    case 'hono': {
      project(
        e,
        'apps/api',
        '@workspace/api',
        {
          dev: 'wrangler dev --port 8787 --inspector-port 9231',
          build: 'wrangler deploy --dry-run --outdir dist',
          deploy: 'wrangler deploy',
          typecheck: 'wrangler types && tsc --noEmit',
          lint: 'eslint . --max-warnings 0',
        },
        { hono: D.hono },
        {
          wrangler: D.wrangler,
          '@types/node': D['@types/node'],
          eslint: D.eslint,
          '@workspace/eslint-config': 'workspace:*',
        },
      );
      e.create(
        'apps/api/wrangler.jsonc',
        json({
          $schema: 'node_modules/wrangler/config-schema.json',
          name: resourceName(name, 'api'),
          main: 'src/index.ts',
          compatibility_date: '2026-10-05',
          compatibility_flags: ['nodejs_compat'],
          observability: { enabled: true },
        }),
      );
      e.create(
        'apps/api/tsconfig.json',
        json({
          compilerOptions: {
            target: 'ES2022',
            lib: ['ES2022'],
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: ['node'],
          },
          include: ['src/**/*.ts', 'worker-configuration.d.ts'],
        }),
      );
      e.create(
        'apps/api/eslint.config.mjs',
        "import { config } from '@workspace/eslint-config/base';\nexport default [...config, {ignores:['dist/**','.wrangler/**','worker-configuration.d.ts']}];\n",
      );
      e.create('apps/api/src/index.ts', template('api-index.ts.txt'));
      e.create(
        'apps/api/src/custom-environment.ts',
        'export type CustomBindings = Record<never, never>;\nexport type CustomVariables = Record<never, never>;\n',
      );
      const web = 'apps/web/wrangler.jsonc';
      const services = e.json(web).services ?? [];
      if (!Array.isArray(services) || services.some((s) => s.binding === 'ANHEDRAL_API'))
        throw Error('Existing ANHEDRAL_API binding must be reconciled first.');
      if (e.json(web).services)
        e.set(web, ['services', -1], {
          binding: 'ANHEDRAL_API',
          service: resourceName(name, 'api'),
        });
      else
        e.set(web, ['services'], [{ binding: 'ANHEDRAL_API', service: resourceName(name, 'api') }]);
      e.create(
        'apps/web/lib/api-proxy.ts',
        WEB_API_PROXY.replace(
          "'idempotency-key'",
          "'idempotency-key', 'stripe-signature', 'last-event-id'",
        ).replace(
          'AbortSignal.timeout(15000)',
          "AbortSignal.timeout(request.headers.get('accept')?.includes('text/event-stream') ? 35000 : 15000)",
        ),
      );
      e.create(
        'apps/web/lib/server-api.ts',
        `import 'server-only';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { proxyApi,type ApiBinding } from './api-proxy';
function apiBinding(candidate:unknown):ApiBinding|undefined {
 if(typeof candidate !== 'object' || candidate===null)return undefined;
 if(typeof Reflect.get(candidate,'fetch') !== 'function')return undefined;
 return candidate as ApiBinding;
}
export async function apiRequest(request:Request):Promise<Response>{
 if(process.env.NODE_ENV==='development')return proxyApi(request,{development:true,devOrigin:process.env.API_INTERNAL_URL});
 const {env}=await getCloudflareContext({async:true});
 return proxyApi(request,{development:false,binding:apiBinding(Reflect.get(env,'ANHEDRAL_API'))});
}
`,
      );
      e.create(
        'apps/web/app/api/[[...path]]/route.ts',
        "import { apiRequest } from '@/lib/server-api';\nexport const dynamic = 'force-dynamic';\nexport const GET = apiRequest;\nexport const POST = apiRequest;\nexport const PUT = apiRequest;\nexport const PATCH = apiRequest;\nexport const DELETE = apiRequest;\nexport const HEAD = apiRequest;\nexport const OPTIONS = apiRequest;\n",
      );
      e.create(
        'apps/web/README.hono.md',
        '# Hono development\n\nSet this in apps/web/.env.local for local development:\n\n```dotenv\nAPI_INTERNAL_URL=http://127.0.0.1:8787\n```\n\nProduction uses the ANHEDRAL_API service binding.\n',
      );
      break;
    }
    case 'database-auth': {
      project(
        e,
        'packages/db',
        '@workspace/db',
        {
          typecheck: 'tsc --noEmit',
          lint: 'eslint . --max-warnings 0',
          'db:generate': 'drizzle-kit generate',
          'db:migrate': 'node src/migrate.mjs',
        },
        { 'drizzle-orm': D['drizzle-orm'] },
        {
          'drizzle-kit': D['drizzle-kit'],
          '@types/node': D['@types/node'],
          eslint: D.eslint,
          '@workspace/eslint-config': 'workspace:*',
        },
      );
      e.set('packages/db/package.json', ['exports'], {
        '.': './src/index.ts',
        './schema': './src/schema.ts',
      });
      e.create(
        'packages/db/tsconfig.json',
        json({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext',
            moduleResolution: 'Bundler',
            strict: true,
            skipLibCheck: true,
            noEmit: true,
            types: ['node'],
          },
          include: ['src/**/*.ts'],
        }),
      );
      e.create(
        'packages/db/eslint.config.mjs',
        "import { config } from '@workspace/eslint-config/base';\nexport default config;\n",
      );
      e.create(
        'packages/db/src/index.ts',
        "import { drizzle } from 'drizzle-orm/d1';\nimport * as schema from './schema';\nexport function createDatabase(binding: Parameters<typeof drizzle>[0]) { return drizzle(binding, { schema }); }\n",
      );
      e.create('packages/db/src/schema.ts', template('auth-schema.ts.txt'));
      e.create('packages/db/drizzle/0000_better_auth.sql', template('auth-migration.sql.txt'));
      e.create('packages/db/drizzle/meta/0000_snapshot.json', template('auth-snapshot.json.txt'));
      e.create('packages/db/drizzle/meta/_journal.json', template('auth-journal.json.txt'));
      e.create(
        'packages/db/drizzle.config.ts',
        "import { defineConfig } from 'drizzle-kit';\nexport default defineConfig({dialect:'sqlite', schema:'./src/schema.ts', out:'./drizzle'});\n",
      );
      e.create(
        'packages/db/src/migrate.mjs',
        "import { spawnSync } from 'node:child_process';\nimport { fileURLToPath } from 'node:url';\nconst args = process.argv.slice(2);\nif(args.length > 1 || args.some((v)=> !['--local','--remote'].includes(v))) throw Error('Use --local or explicitly --remote.');\nif(!process.env.npm_execpath) throw Error('Run through pnpm db:migrate.');\nconst cwd=fileURLToPath(new URL('../../../apps/api/',import.meta.url));\nconst result=spawnSync(process.execPath,[process.env.npm_execpath,'exec','wrangler','d1','migrations','apply','DB',args[0] ?? '--local'],{cwd,stdio:'inherit',shell:false});\nif(result.error)throw result.error;\nprocess.exitCode=result.status ?? 1;\n",
      );
      apiConfig(e, 'd1_databases', [
        {
          binding: 'DB',
          database_name: resourceName(name, 'db'),
          database_id: '00000000-0000-0000-0000-000000000000',
          migrations_dir: '../../packages/db/drizzle',
        },
      ]);
      dependency(e, 'apps/api', {
        '@workspace/db': 'workspace:*',
        zod: D.zod,
        'better-auth': P['better-auth'],
        '@better-auth/drizzle-adapter': P['@better-auth/drizzle-adapter'],
      });
      dependency(e, 'apps/web', { 'better-auth': P['better-auth'] });
      e.create('apps/api/src/auth.ts', template('auth.ts.txt'));
      e.create('apps/api/src/auth-features.ts', template('auth-features.ts.txt'));
      e.create('apps/api/src/security.ts', template('security.ts.txt'));
      e.create('apps/api/src/features/auth.ts', template('auth-routes.ts.txt'));
      e.create('apps/web/app/sign-in/page.tsx', template('web-sign-in.tsx.txt'));
      e.create(
        'apps/web/lib/auth-client.ts',
        "'use client';\nimport { createAuthClient } from 'better-auth/react';\nexport const authClient = createAuthClient();\n",
      );
      e.merge('package.json', 'scripts', {
        'db:generate': 'pnpm --dir packages/db db:generate',
        'db:migrate': 'pnpm --dir packages/db db:migrate',
      });
      e.merge('turbo.json', 'tasks', {
        'db:generate': { cache: false },
        'db:migrate': { cache: false },
      });
      break;
    }
    case 'r2':
      apiConfig(e, 'r2_buckets', [{ binding: 'FILES', bucket_name: resourceName(name, 'files') }]);
      e.create('apps/api/src/features/storage.ts', template('storage.ts.txt'));
      break;
    case 'stripe':
      dependency(e, 'apps/api', { stripe: P.stripe });
      e.create('apps/api/src/features/stripe.ts', template('stripe.ts.txt'));
      e.create('apps/api/src/billing-mode.ts', template('billing-mode.ts.txt'));
      e.create('apps/api/src/features/entitlements.ts', template('entitlements.ts.txt'));
      e.create('apps/api/src/entitlement-guard.ts', template('entitlement-guard.ts.txt'));
      e.create('packages/db/src/billing-schema.ts', template('billing-schema.ts.txt'));
      schemaExport(e, 'billing-schema');
      break;
    case 'revenuecat':
      dependency(e, 'apps/mobile', { 'react-native-purchases': P['react-native-purchases'] });
      e.create('apps/api/src/features/revenuecat.ts', template('revenuecat.ts.txt'));
      e.create('apps/mobile/lib/purchases.ts', template('purchases.ts.txt'));
      appendExample(e, 'apps/mobile/.env.example', [
        'EXPO_PUBLIC_REVENUECAT_IOS_KEY',
        'EXPO_PUBLIC_REVENUECAT_ANDROID_KEY',
      ]);
      e.create('apps/mobile/components/billing-controls.tsx', template('mobile-billing.tsx.txt'));
      break;
    case 'realtime':
      e.create('packages/db/src/events-schema.ts', template('events-schema.ts.txt'));
      schemaExport(e, 'events-schema');
      e.create('apps/api/src/features/events.ts', template('events.ts.txt'));
      break;
    case 'rtc':
      e.create('apps/api/src/features/rtc.ts', template('rtc.ts.txt'));
      e.create('packages/db/src/rtc-schema.ts', template('rtc-schema.ts.txt'));
      schemaExport(e, 'rtc-schema');
      break;
    case 'ai':
      apiConfig(e, 'ai', { binding: 'AI', remote: true });
      e.create('apps/api/src/features/ai.ts', template('ai.ts.txt'));
      e.create('packages/db/src/ai-schema.ts', template('ai-schema.ts.txt'));
      schemaExport(e, 'ai-schema');
      break;
    case 'expo':
      addExpo(e, name);
      break;
    case 'native-ui':
      addNativeUi(e);
      break;
    case 'wxt':
      addExtension(e);
      break;
    case 'side-panel':
      e.create(
        'apps/extension/entrypoints/sidepanel/index.html',
        '<!doctype html><html><head><meta charset="UTF-8"><title>Side panel</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>\n',
      );
      e.create(
        'apps/extension/entrypoints/sidepanel/main.tsx',
        "import { createRoot } from 'react-dom/client';\nimport { App } from '../../components/App';\ncreateRoot(document.getElementById('root')!).render(<App />);\n",
      );

      break;
    case 'gpui':
      addDesktop(e);
      break;
  }
}

function addExpo(e: CapabilityEditor, name: string) {
  project(
    e,
    'apps/mobile',
    '@workspace/mobile',
    {
      dev: 'expo start',
      start: 'expo start',
      android: 'expo run:android',
      ios: 'expo run:ios',
      typecheck: 'tsc --noEmit',
      lint: 'tsc --noEmit',
      build: 'expo export --platform ios --platform android',
    },
    {
      expo: P.expo,
      react: P.react,
      'react-native': P['react-native'],
      'expo-secure-store': P['expo-secure-store'],
      'expo-linking': P['expo-linking'],
      'better-auth': P['better-auth'],
      '@better-auth/expo': P['@better-auth/expo'],
    },
    { '@types/react': P['@types/react'], 'babel-preset-expo': P['babel-preset-expo'] },
  );
  e.set('apps/mobile/package.json', ['type'], 'commonjs');
  e.set('apps/mobile/package.json', ['main'], 'index.ts');
  const workspaceSource = e.read('pnpm-workspace.yaml');
  if (workspaceSource === null) throw Error('Missing pnpm workspace');
  const workspace = parseDocument(workspaceSource);
  if (workspace.errors.length) throw Error('Invalid pnpm workspace configuration');
  const existing = workspace.getIn(['overrides', '@expo/cli>zod']);
  if (existing !== undefined && existing !== D.zod)
    throw Error('Preserve the custom Expo Zod override; reconcile it first.');
  workspace.setIn(['overrides', '@expo/cli>zod'], D.zod);
  e.writes.set('pnpm-workspace.yaml', workspace.toString());
  e.create(
    'apps/mobile/app.json',
    json({
      expo: {
        name,
        slug: resourceName(name, 'mobile'),
        scheme: resourceName(name, 'mobile'),
        version: '1.0.0',
        userInterfaceStyle: 'automatic',
        plugins: ['expo-secure-store'],
      },
    }),
  );
  e.create(
    'apps/mobile/tsconfig.json',
    json({
      extends: 'expo/tsconfig.base',
      compilerOptions: { strict: true, baseUrl: '.', paths: { '@/*': ['./*'] } },
    }),
  );
  e.create(
    'apps/mobile/babel.config.js',
    "module.exports = function(api) {api.cache(true);return {presets:['babel-preset-expo']};};\n",
  );
  e.create('apps/mobile/index.ts', "import './anhedral-entry';\n");
  e.create(
    'apps/mobile/App.tsx',
    "import { View, Text } from 'react-native';\nexport default function App() { return <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><Text>Your Expo application</Text></View>; }\n",
  );
  e.create('apps/mobile/components/session-controls.tsx', template('mobile-session.tsx.txt'));
  e.create(
    'apps/mobile/lib/auth-client.ts',
    template('mobile-auth.ts.txt').replaceAll(
      '__SCHEME__',
      JSON.stringify(resourceName(name, 'mobile')),
    ),
  );
  e.create(
    'apps/mobile/.env.example',
    '# Public application URL only, never a server secret. Use a device-reachable development origin.\nEXPO_PUBLIC_API_URL=https://your-app.example\n',
  );
  dependency(e, 'apps/api', { '@better-auth/expo': P['@better-auth/expo'] });
}
function addNativeUi(e: CapabilityEditor) {
  dependency(e, 'apps/mobile', {
    nativewind: P.nativewind,
    'react-native-css-interop': P['react-native-css-interop'],
    'react-native-reanimated': P['react-native-reanimated'],
    'react-native-worklets': P['react-native-worklets'],
    'react-native-safe-area-context': P['react-native-safe-area-context'],
    'class-variance-authority': P['class-variance-authority'],
    clsx: P.clsx,
    'tailwind-merge': P['tailwind-merge'],
    'tailwindcss-animate': P['tailwindcss-animate'],
    '@rn-primitives/portal': P['@rn-primitives/portal'],
    '@rn-primitives/slot': P['@rn-primitives/slot'],
  });
  e.merge('apps/mobile/package.json', 'devDependencies', { tailwindcss: P.tailwindcss });
  e.create(
    'apps/mobile/components.json',
    json({
      $schema: 'https://ui.shadcn.com/schema.json',
      style: 'new-york',
      rsc: false,
      tsx: true,
      tailwind: {
        config: 'tailwind.config.js',
        css: 'global.css',
        baseColor: 'neutral',
        cssVariables: true,
      },
      aliases: {
        components: '@/components',
        ui: '@/components/ui',
        utils: '@/lib/utils',
        lib: '@/lib',
        hooks: '@/hooks',
      },
    }),
  );
  for (const file of [
    'global.css',
    'tailwind.config.js',
    'metro.config.js',
    'nativewind-env.d.ts',
    'lib/utils.ts',
  ])
    e.create(`apps/mobile/${file}`, template('native-' + file.replaceAll('/', '-') + '.txt'));
  // Dedicated entry: NativeWind/PortalHost integration never replaces the user's App.
  if (e.json('apps/mobile/package.json').main !== 'index.ts')
    throw Error('Preserve the custom Expo entry; reconcile NativeWind/PortalHost setup first.');
  e.set('apps/mobile/package.json', ['main'], 'anhedral-entry.tsx');
  for (const name of ['button', 'text'])
    e.create(`apps/mobile/components/ui/${name}.tsx`, template(`native-${name}.tsx.txt`));
  if (e.read('apps/mobile/App.tsx') === null)
    throw Error('Preserve the custom Expo layout; reconcile the NativeWind root entry first.');
  const babel = 'apps/mobile/babel.config.js';
  const expected =
    "module.exports = function(api) {api.cache(true);return {presets:['babel-preset-expo']};};\n";
  if (e.read(babel) !== expected)
    throw Error('Preserve edited Expo Babel configuration; reconcile NativeWind first.');
  e.writes.set(
    babel,
    "module.exports = function(api) {api.cache(true);return {presets:[['babel-preset-expo',{jsxImportSource:'nativewind'}],'nativewind/babel']};};\n",
  );
  e.create(
    'apps/mobile/.anhedral-ui.json',
    json({
      schemaVersion: 1,
      platform: 'native',
      catalogRevision: '2026-10-26.1',
      nativeStyling: 'nativewind4',
      sourceOwned: true,
      automaticUpdates: false,
    }),
  );
  e.create(
    'apps/mobile/UPSTREAM.json',
    json({
      catalogRevision: '2026-10-26.1',
      source:
        'https://github.com/founded-labs/react-native-reusables/tree/385834c2196f8a303cbc9057d1ac768f3bde0a3b',
      automaticUpdates: false,
      files: Object.fromEntries(
        ['button', 'text'].map((name) => [
          `components/ui/${name}.tsx`,
          { sha256: fingerprint(template(`native-${name}.tsx.txt`)) },
        ]),
      ),
    }),
  );
  for (const name of ['LICENSE.react-native-reusables', 'LICENSE.shadcn'])
    e.create(
      `apps/mobile/ANHEDRAL_UI_LICENSES/${name}`,
      readFileSync(new URL(`../assets/ui/${name}`, import.meta.url), 'utf8'),
    );
}
function addExtension(e: CapabilityEditor) {
  project(
    e,
    'apps/extension',
    '@workspace/extension',
    {
      dev: 'wxt',
      build: 'wxt build',
      zip: 'wxt zip',
      typecheck: 'wxt prepare && tsc --noEmit',
      lint: 'wxt prepare && tsc --noEmit',
      postinstall: 'wxt prepare',
    },
    { react: P.react, 'react-dom': P.react },
    {
      wxt: P.wxt,
      '@wxt-dev/module-react': P['@wxt-dev/module-react'],
      '@types/react': P['@types/react'],
      '@types/react-dom': P['@types/react-dom'],
    },
  );
  e.create(
    'apps/extension/entrypoints/background.ts',
    "import {configureCapabilities} from '../anhedral-background';\nexport default defineBackground(()=>{configureCapabilities();});\n",
  );
  e.create(
    'apps/extension/wxt.config.ts',
    "import {defineConfig} from 'wxt';\nconst origin=process.env.WXT_API_ORIGIN || 'https://your-app.example';\nconst url=new URL(origin);\nif(url.protocol !== 'https:' && !(url.protocol === 'http:' && ['localhost','127.0.0.1'].includes(url.hostname)))throw Error('Choose a secure API origin');\nexport default defineConfig({modules:['@wxt-dev/module-react'], manifest:{name:'Anhedral application extension',permissions:['storage'],host_permissions:[url.origin+'/*']}});\n",
  );
  e.create(
    'apps/extension/tsconfig.json',
    json({ extends: './.wxt/tsconfig.json', compilerOptions: { strict: true, jsx: 'react-jsx' } }),
  );
  e.create(
    'apps/extension/entrypoints/popup/index.html',
    '<!doctype html><html><head><meta charset="UTF-8"><title>Application</title></head><body><div id="root"></div><script type="module" src="./main.tsx"></script></body></html>\n',
  );
  e.create(
    'apps/extension/entrypoints/popup/main.tsx',
    "import {createRoot} from 'react-dom/client';\nimport {App} from '../../components/App';\ncreateRoot(document.getElementById('root')!).render(<App />);\n",
  );
  e.create(
    'apps/extension/components/App.tsx',
    'export function App(){return <main><h1>Your application</h1><p>Configure the API origin and an explicit sign-in flow before accessing private data.</p></main>;}\n',
  );
  e.create('apps/extension/.env.example', 'WXT_API_ORIGIN=https://your-app.example\n');
}
function addDesktop(e: CapabilityEditor) {
  project(
    e,
    'apps/desktop',
    '@workspace/desktop',
    {
      dev: 'cargo run',
      build: 'cargo build',
      typecheck: 'cargo check',
      lint: 'cargo fmt --check',
      test: 'cargo test',
    },
    {},
  );
  e.create(
    'apps/desktop/Cargo.toml',
    '[package]\nname = "anhedral-desktop"\nversion = "0.1.0"\nedition = "2024"\n\n[dependencies]\ngpui = { version = "=0.2.2", features = ["runtime_shaders"] }\n',
  );
  e.create('apps/desktop/src/main.rs', template('desktop.rs.txt'));
  e.create('apps/desktop/.gitignore', '/target/\n');
  e.create(
    'apps/desktop/.env.example',
    '# Desktop binaries run natively, not on Workers.\nANHEDRAL_API_ORIGIN=https://your-app.example\n',
  );
}

export function composeCapabilities(e: CapabilityEditor, installed: Capability[]) {
  if (!installed.includes('hono')) return;
  if (installed.includes('expo')) composeMobile(e, installed);
  if (installed.includes('wxt'))
    e.owned(
      'apps/extension/anhedral-background.ts',
      installed.includes('side-panel')
        ? "import {browser} from 'wxt/browser';\nexport function configureCapabilities(){if(browser.sidePanel)void browser.sidePanel.setPanelBehavior({openPanelOnActionClick:true}).catch(()=>console.error('Side Panel setup failed'));}\n"
        : 'export function configureCapabilities(){}\n',
    );
  const features: [Capability, string, string][] = [
    ['database-auth', 'authRoutes', 'auth'],
    ['r2', 'storageRoutes', 'storage'],
    ['stripe', 'stripeRoutes', 'stripe'],
    ['stripe', 'entitlementRoutes', 'entitlements'],
    ['revenuecat', 'revenuecatRoutes', 'revenuecat'],
    ['realtime', 'eventRoutes', 'events'],
    ['rtc', 'rtcRoutes', 'rtc'],
    ['ai', 'aiRoutes', 'ai'],
  ];
  const chosen = features.filter(([id]) => installed.includes(id));
  e.owned(
    'apps/api/src/capabilities.ts',
    "// CLI-owned composition. Add custom routes in index.ts; edited composition is never overwritten.\nimport { Hono } from 'hono';\nimport type { AppEnv } from './environment';\n" +
      chosen
        .map(([, symbol, file]) => `import { ${symbol} } from './features/${file}';\n`)
        .join('') +
      'export const capabilities = new Hono<AppEnv>();\n' +
      chosen.map(([, symbol]) => `capabilities.route('/', ${symbol});\n`).join(''),
  );
  if (installed.includes('database-auth'))
    e.owned(
      'apps/api/src/auth-platform.ts',
      installed.includes('expo')
        ? "import { expo } from '@better-auth/expo';\nexport const platformAuthPlugins = () => [expo()];\n"
        : 'export const platformAuthPlugins = () => [];\n',
    );
  if (installed.includes('stripe'))
    e.owned(
      'apps/api/src/billing-providers.ts',
      "import type {AppEnv} from './environment';\nimport {stripeEntitled} from './features/stripe';\n" +
        (installed.includes('revenuecat')
          ? "import {revenuecatEntitled} from './features/revenuecat';\n"
          : '') +
        "export const billingProviders:Record<string,(env:AppEnv['Bindings'],userId:string)=>Promise<boolean>>={stripe:stripeEntitled" +
        (installed.includes('revenuecat') ? ',revenuecat:revenuecatEntitled' : '') +
        '};\n',
    );
  const bindings = [
    'PUBLIC_APP_URL?: string',
    'BETTER_AUTH_SECRET?: string',
    'AUTH_TRUSTED_ORIGINS?: string',
  ];
  if (installed.includes('database-auth')) bindings.push('DB: D1Database');
  if (installed.includes('r2')) bindings.push('FILES: R2Bucket');
  if (installed.includes('stripe'))
    bindings.push(
      'STRIPE_SECRET_KEY?: string',
      'STRIPE_WEBHOOK_SECRET?: string',
      'STRIPE_PRICE_ID?: string',
      'BILLING_ENVIRONMENT?: string',
      'BILLING_PROVIDER?: string',
    );
  if (installed.includes('revenuecat'))
    bindings.push(
      'REVENUECAT_SECRET_KEY?: string',
      'REVENUECAT_WEBHOOK_AUTH?: string',
      'REVENUECAT_APP_ID?: string',
      'REVENUECAT_ENTITLEMENT?: string',
    );
  if (installed.includes('rtc')) bindings.push('RTC_APP_ID?: string', 'RTC_APP_SECRET?: string');
  if (installed.includes('ai'))
    bindings.push('AI: Ai', 'AI_MODEL?: string', 'AI_DAILY_LIMIT?: string');
  e.owned(
    'apps/api/src/environment.ts',
    `import type { CustomBindings, CustomVariables } from './custom-environment';\nexport type AppEnv = { Bindings: CustomBindings & {${bindings.join(';\n')}}; Variables: CustomVariables & {userId:string;fileKey:string} };\n`,
  );
  appendExample(
    e,
    'apps/api/.dev.vars.example',
    bindings
      .filter((binding) => binding.includes('string'))
      .map((binding) => binding.split('?')[0]),
  );
}

function composeMobile(e: CapabilityEditor, installed: Capability[]) {
  const ui = installed.includes('native-ui');
  const billing = installed.includes('revenuecat');
  e.owned(
    'apps/mobile/anhedral-entry.tsx',
    (ui
      ? "import './global.css';\nimport {PortalHost} from '@rn-primitives/portal';\nimport {SafeAreaProvider} from 'react-native-safe-area-context';\n"
      : '') +
      "import {registerRootComponent} from 'expo';\nimport {View} from 'react-native';\nimport App from './App';\nimport {SessionControls} from './components/session-controls';\n" +
      (billing
        ? "import {BillingControls} from './components/billing-controls';\nimport {disconnectPurchases} from './lib/purchases';\n"
        : '') +
      'function Root(){return ' +
      (ui ? '<SafeAreaProvider>' : '') +
      '<View style={{flex:1}}><App /><SessionControls' +
      (billing ? ' onSignOut={disconnectPurchases}' : '') +
      '>' +
      (billing ? '<BillingControls/>' : '') +
      '</SessionControls></View>' +
      (ui ? '<PortalHost/></SafeAreaProvider>' : '') +
      ';}\nregisterRootComponent(Root);\n',
  );
  e.owned(
    'apps/mobile/components/action-button.tsx',
    ui
      ? "import {Button} from './ui/button';\nimport {Text} from './ui/text';\nexport function ActionButton({label,...props}:{label:string;onPress:()=>void;disabled?:boolean}) {return <Button {...props}><Text>{label}</Text></Button>;}\n"
      : "import {Button} from 'react-native';\nexport function ActionButton({label,...props}:{label:string;onPress:()=>void;disabled?:boolean}) {return <Button title={label} {...props}/>;}\n",
  );
  const file = '.fallowrc.json';
  const current = e.json(file).ignoreDependencies ?? [];
  const peers = ui
    ? [
        'babel-preset-expo',
        'react-native-css-interop',
        'react-native-reanimated',
        'react-native-worklets',
      ]
    : ['babel-preset-expo'];
  e.set(file, ['ignoreDependencies'], [...new Set([...current, ...peers])]);
  if (ui) {
    const rules = e.json(file).ignoreExports ?? [];
    const rule = {
      file: 'apps/mobile/components/ui/button.tsx',
      exports: ['buttonVariants', 'buttonTextVariants'],
    };
    if (!rules.some((value: unknown) => JSON.stringify(value) === JSON.stringify(rule)))
      e.set(file, ['ignoreExports'], [...rules, rule]);
  }
}

function appendExample(e: CapabilityEditor, file: string, keys: string[]) {
  const current = e.read(file);
  const source =
    current ?? '# Copy selected values to the local environment. Never commit secrets.\n';
  const existing = new Set([...source.matchAll(/^([A-Z_]+)=/gm)].map((match) => match[1]));
  const additions = keys.filter((key) => !existing.has(key));
  if (!additions.length) return;
  const value = source.trimEnd() + '\n' + additions.map((key) => key + '=').join('\n') + '\n';
  if (current === null) e.create(file, value);
  else e.writes.set(file, value);
}
