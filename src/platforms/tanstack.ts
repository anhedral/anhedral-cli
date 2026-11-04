import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ANHEDRAL_STACK_DEPENDENCIES, WEB_DEPENDENCIES } from '../dependencies.js';
import { CapabilityEditor } from '../capability-editor.js';
import type { Capability } from '../capability-catalog.js';
import { resourceName } from '../render.js';
import { json, put, workerConfig } from '../scaffold/files.js';
import { initializeUiMetadata } from '../ui-project.js';

const template = (name: string) =>
  readFileSync(new URL(`../../assets/launch/${name}`, import.meta.url), 'utf8');

/** The launch foundation is a web service; Hono owns application services and data. */
export function scaffoldTanstack(root: string, name: string): void {
  for (const [destination, asset] of Object.entries({
    'scripts/oj.mjs': 'oj/run.mjs',
    'scripts/oj-runtime.json': 'oj/runtime.json',
    'scripts/OJ.LICENSE': 'oj/OJ.LICENSE',
  }))
    put(root, destination, template(asset));
  const app = 'apps/web';
  const web = WEB_DEPENDENCIES.dependencies!;
  const dev = WEB_DEPENDENCIES.devDependencies!;
  json(root, `${app}/package.json`, {
    name: '@workspace/web',
    private: true,
    version: '0.1.0',
    type: 'module',
    scripts: {
      dev: 'node ../../scripts/oj.mjs dev . --host 0.0.0.0 --port 3000',
      build: 'node ../../scripts/oj.mjs build .',
      preview: 'wrangler dev --config dist/ssr/wrangler.json --port 3000',
      typecheck: 'wrangler types && tsr generate && tsc --noEmit',
      lint: 'eslint . --max-warnings 0',
    },
    dependencies: {
      '@tanstack/react-start': ANHEDRAL_STACK_DEPENDENCIES['@tanstack/react-start'],
      '@tanstack/react-router': ANHEDRAL_STACK_DEPENDENCIES['@tanstack/react-router'],
      react: web.react,
      'react-dom': web['react-dom'],
      '@base-ui/react': web['@base-ui/react'],
      'class-variance-authority': web['class-variance-authority'],
      clsx: web.clsx,
      'tailwind-merge': web['tailwind-merge'],
      '@workspace/styling': 'workspace:*',
    },
    devDependencies: {
      '@cloudflare/vite-plugin': ANHEDRAL_STACK_DEPENDENCIES['@cloudflare/vite-plugin'],
      '@tanstack/router-cli': ANHEDRAL_STACK_DEPENDENCIES['@tanstack/router-cli'],
      '@vitejs/plugin-react': ANHEDRAL_STACK_DEPENDENCIES['@vitejs/plugin-react'],
      vite: ANHEDRAL_STACK_DEPENDENCIES.vite,
      wrangler: ANHEDRAL_STACK_DEPENDENCIES.wrangler,
      typescript: dev.typescript,
      '@types/node': dev['@types/node'],
      '@types/react': dev['@types/react'],
      '@types/react-dom': dev['@types/react-dom'],
      tailwindcss: dev.tailwindcss,
      '@tailwindcss/postcss': dev['@tailwindcss/postcss'],
      eslint: dev.eslint,
      '@workspace/eslint-config': 'workspace:*',
    },
  });
  json(root, `${app}/wrangler.jsonc`, {
    ...workerConfig(resourceName(name, 'web')),
    main: 'src/server.ts',
    compatibility_date: '2026-11-02',
    services: [],
  });
  json(root, `${app}/tsconfig.json`, {
    compilerOptions: {
      target: 'ES2022',
      lib: ['DOM', 'DOM.Iterable', 'ES2022'],
      skipLibCheck: true,
      strict: true,
      noEmit: true,
      esModuleInterop: true,
      module: 'ESNext',
      moduleResolution: 'Bundler',
      resolveJsonModule: true,
      isolatedModules: true,
      jsx: 'react-jsx',
      types: ['vite/client'],
      paths: { '@/*': ['./src/*'] },
    },
    include: ['src/**/*.ts', 'src/**/*.tsx', 'vite.config.ts', 'worker-configuration.d.ts'],
    exclude: ['node_modules', 'dist'],
  });
  json(root, `${app}/tsr.config.json`, {
    routesDirectory: './src/routes',
    generatedRouteTree: './src/routeTree.gen.ts',
  });
  put(
    root,
    `${app}/eslint.config.mjs`,
    `import { config } from '@workspace/eslint-config/react-internal';
export default [...config, { ignores: ['dist/**', '.wrangler/**', 'src/routeTree.gen.ts', 'worker-configuration.d.ts'] }];
`,
  );
  json(root, `${app}/components.json`, {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: 'base-nova',
    rsc: false,
    tsx: true,
    tailwind: { config: '', css: 'src/styles.css', baseColor: 'neutral', cssVariables: true },
    aliases: {
      components: '@/components',
      ui: '@/components/ui',
      utils: '@/lib/utils',
      lib: '@/lib',
      hooks: '@/hooks',
    },
    iconLibrary: 'lucide',
  });
  initializeUiMetadata(path.join(root, app), 'web');
  put(
    root,
    `${app}/src/lib/utils.ts`,
    `import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...values: ClassValue[]) { return twMerge(clsx(values)); }
`,
  );
  for (const component of ['button', 'input', 'label'])
    put(
      root,
      `${app}/src/components/ui/${component}.tsx`,
      readFileSync(new URL(`../../assets/ui/web/${component}.tsx`, import.meta.url), 'utf8'),
    );
  for (const file of ['LICENSE.shadcn', 'UPSTREAM.json'])
    put(
      root,
      `${app}/${file}`,
      readFileSync(new URL(`../../assets/ui/${file}`, import.meta.url), 'utf8'),
    );
  put(
    root,
    `${app}/postcss.config.mjs`,
    "export default { plugins: { '@tailwindcss/postcss': {} } };\n",
  );
  put(root, `${app}/src/starter.ts`, `export const starterTitle = ${JSON.stringify(name)};\n`);
  const files = {
    'src/router.tsx': 'router.tsx.txt',
    'src/lib/request-context.ts': 'request-context.ts.txt',
    'src/routes/__root.tsx': 'root.tsx.txt',
    'src/routes/index.tsx': 'home.tsx.txt',
    'src/styles.css': 'styles.css.txt',
  };
  for (const [destination, source] of Object.entries(files))
    put(
      root,
      `${app}/${destination}`,
      template(source).replaceAll('__APPLICATION_NAME__', JSON.stringify(name)),
    );
  put(root, `${app}/public/robots.txt`, 'User-agent: *\nAllow: /\n');
  put(
    root,
    `${app}/public/_headers`,
    '/assets/*\n  Cache-Control: public, max-age=31536000, immutable\n/*\n  X-Content-Type-Options: nosniff\n',
  );
}

function assertTanstack(e: CapabilityEditor) {
  if (!e.json('apps/web/package.json').dependencies?.['@tanstack/react-start'])
    throw Error('Only the Anhedral Stack TanStack Start foundation is supported.');
}

/** Fingerprinted composition adapters; application routes stay source-owned. */
export function composeTanstack(e: CapabilityEditor, installed: readonly Capability[]): void {
  assertTanstack(e);
  const backend = installed.includes('hono');
  const auth = installed.includes('database-auth');
  e.owned('apps/web/src/server.ts', template(backend ? 'server.ts.txt' : 'minimal-server.ts.txt'));
  e.owned(
    'apps/web/src/lib/application.server.ts',
    template(
      backend ? 'application.server.ts.txt' : 'minimal-application.server.ts.txt',
    ).replaceAll('__AUTHENTICATION__', String(auth)),
  );
  e.owned(
    'apps/web/vite.config.ts',
    `import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import { cloudflare } from '@cloudflare/vite-plugin';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';
export default defineConfig(({ command }) => ({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' }, ${backend ? "auxiliaryWorkers: command === 'serve' ? [{ configPath: '../api/wrangler.jsonc' }] : [], persistState: { path: fileURLToPath(new URL('../api/.wrangler/state', import.meta.url)) }, " : ''}remoteBindings: false }),
    tanstackStart({ server: { entry: './server.ts' } }),
    react(),
  ],
}));
`,
  );
}

/** Install account source only when the backend authentication capability is added. */
export function addTanstackAuth(e: CapabilityEditor): void {
  assertTanstack(e);
  e.create('apps/web/src/lib/auth-client.ts', template('auth-client.ts.txt'));
  e.create('apps/web/src/routes/sign-in.tsx', template('sign-in.tsx.txt'));
}
