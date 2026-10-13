import { build as buildUI } from 'vite';
import { build as bundle } from 'esbuild';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { dependencyNotices } from './licenses.mjs';
import { digest, pluginSourceDigest } from './source-integrity.mjs';
rmSync('dist', { recursive: true, force: true });
const moduleFiles = new Set();
await buildUI({
  plugins: [
    {
      name: 'dependency-notice-inventory',
      generateBundle() {
        for (const id of this.getModuleIds()) moduleFiles.add(id);
      },
    },
  ],
});
const assets = 'dist/web/assets';
let html = readFileSync('dist/web/index.html', 'utf8');
for (const asset of readdirSync(assets)) {
  const bytes = readFileSync(resolve(assets, asset), 'utf8');
  if (asset.endsWith('.js'))
    html = html.replace(
      /<script[^>]*src="[^"]+"[^>]*><\/script>/,
      () => `<script type="module">${bytes.replace(/<\/script/gi, '<\\/script')}</script>`,
    );
  if (asset.endsWith('.css'))
    html = html.replace(
      /<link[^>]*href="[^"]+\.css"[^>]*>/,
      () =>
        `<style>@layer theme, base, components, utilities;${bytes.replace(/<\/style/gi, '<\\/style')}</style>`,
    );
}
writeFileSync('dist/dashboard.html', html);
const serverBuild = await bundle({
  loader: { '.svg': 'text' },
  metafile: true,
  entryPoints: ['server/main.ts'],
  bundle: true,
  mainFields: ['module', 'main'],
  platform: 'node',
  format: 'esm',
  target: 'node22',
  outfile: 'dist/server.mjs',
  banner: {
    js: "import { createRequire as bundleRequire } from 'node:module'; const require = bundleRequire(import.meta.url);",
  },
  minify: false,
});
for (const file of Object.keys(serverBuild.metafile.inputs)) moduleFiles.add(file);
writeFileSync('dist/THIRD_PARTY_NOTICES.txt', dependencyNotices(moduleFiles));
{
  const target = '../plugins/anhedral/runtime';
  rmSync(target, { recursive: true, force: true });
  mkdirSync(target, { recursive: true });
  for (const name of ['server.mjs', 'dashboard.html', 'THIRD_PARTY_NOTICES.txt'])
    writeFileSync(`${target}/${name}`, readFileSync(`dist/${name}`));
}
const root = resolve('..');
const version = JSON.parse(readFileSync('../package.json', 'utf8')).version;
writeFileSync(
  '../plugins/anhedral/runtime/build.json',
  JSON.stringify(
    {
      version,
      sourceDigest: pluginSourceDigest(root),
      files: Object.fromEntries(
        ['server.mjs', 'dashboard.html', 'THIRD_PARTY_NOTICES.txt'].map((file) => [
          file,
          digest(readFileSync(`dist/${file}`)),
        ]),
      ),
    },
    null,
    2,
  ) + '\n',
);
console.log('Built the optional project inspector and headless MCP runtime.');
