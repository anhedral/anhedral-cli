import { VINEXT_DEPENDENCIES } from './dependencies.js';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import path from 'node:path';
import { writeFile } from './util.js';

// Vinext externalizes its generated manifests relative to each RSC chunk.
// Keep those chunks beside the real root modules, including Void's wrapper entry.
export const VINEXT_SERVER_OUTPUT_PLUGIN = `{
  name: 'anhedral:vinext-server-modules',
  apply: 'build',
  enforce: 'post',
  outputOptions(output) {
    if (this.environment.name === 'rsc') {
      return { ...output, chunkFileNames: '[name]-[hash].js' };
    }
  },
}`;

// Official Vinext App Router integration using the supported Wrangler/Vite adapter.
// Wrangler's generated dist/server config preserves binding IDs and built assets.
export function configureVinext(
  root: string,
  workerName: string,
  bindings: Record<string, unknown>,
): void {
  const put = (file: string, value: string) => writeFile(path.join(root, 'apps/web', file), value);
  const pkg = JSON.parse(readFileSync(path.join(root, 'apps/web/package.json'), 'utf8'));
  delete pkg.dependencies?.['@opennextjs/cloudflare'];
  pkg.type = 'module';
  pkg.dependencies = { ...pkg.dependencies, ...VINEXT_DEPENDENCIES.dependencies };
  pkg.devDependencies = { ...pkg.devDependencies, ...VINEXT_DEPENDENCIES.devDependencies };
  pkg.scripts = {
    ...pkg.scripts,
    dev: 'vite dev --host 127.0.0.1 --port 3000',
    build: 'vite build',
    start: 'vinext start',
    preview:
      'wrangler dev --config dist/server/wrangler.json --port 3000 --persist-to .wrangler/state',
    deploy: 'vite build && wrangler deploy --config dist/server/wrangler.json',
    'build:worker': 'vite build',
    typecheck: 'wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts && tsc --noEmit',
  };
  put('package.json', JSON.stringify(pkg, null, 2) + '\n');
  put(
    'vite.config.ts',
    `import { defineConfig } from 'vite';
import vinext from 'vinext';
import { cloudflare } from '@cloudflare/vite-plugin';
export default defineConfig({ plugins: [vinext(), cloudflare({ viteEnvironment: { name: 'rsc', childEnvironments: ['ssr'] } }), ${VINEXT_SERVER_OUTPUT_PLUGIN}] });
`,
  );
  put(
    'wrangler.jsonc',
    JSON.stringify(
      {
        $schema: 'node_modules/wrangler/config-schema.json',
        name: workerName,
        main: 'vinext/server/fetch-handler',
        compatibility_date: '2026-10-05',
        compatibility_flags: ['nodejs_compat'],
        assets: { binding: 'ASSETS', not_found_handling: 'none' },
        observability: { enabled: true },
        ...bindings,
      },
      null,
      2,
    ) + '\n',
  );
  put(
    'next.config.ts',
    `import type { NextConfig } from 'next';
const config: NextConfig = { transpilePackages: ['@workspace/ui'] };
export default config;
`,
  );
  for (const file of [
    'next.config.js',
    'next.config.mjs',
    'open-next.config.ts',
    'vercel.json',
    'next-env.d.ts',
  ])
    rmSync(path.join(root, 'apps/web', file), { force: true });
  const tsFile = path.join(root, 'apps/web/tsconfig.json');
  if (existsSync(tsFile)) {
    const ts = JSON.parse(readFileSync(tsFile, 'utf8'));
    delete ts.compilerOptions?.plugins;
    // Respect the UI package exports (globals.css lives in src/styles, not src).
    if (ts.compilerOptions?.paths) delete ts.compilerOptions.paths['@workspace/ui/*'];
    ts.include = ['**/*.ts', '**/*.tsx', '**/*.mts'];
    put('tsconfig.json', JSON.stringify(ts, null, 2) + '\n');
  }
  put(
    'vinext-env.d.ts',
    '/// <reference types="vinext/types" />\n/// <reference types="vite/client" />\n',
  );
  put('.dev.vars.example', '# Worker secrets are local-only and ignored by Git.\n');
  const uiFile = path.join(root, 'packages/ui/package.json');
  if (existsSync(uiFile)) {
    const ui = JSON.parse(readFileSync(uiFile, 'utf8'));
    ui.dependencies = {
      ...ui.dependencies,
      react: VINEXT_DEPENDENCIES.dependencies!.react,
      'react-dom': VINEXT_DEPENDENCIES.dependencies!['react-dom'],
    };
    writeFile(uiFile, JSON.stringify(ui, null, 2) + '\n');
  }
}
