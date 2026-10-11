import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
function writeManifest(root, directory, manifest) {
  mkdirSync(path.join(root, directory), { recursive: true });
  writeFileSync(path.join(root, directory, 'package.json'), JSON.stringify(manifest));
}
export function bootstrap(root, broken = false) {
  writeManifest(root, '.', {
    name: 'fixture',
    packageManager: 'pnpm@10.34.5',
    scripts: {},
    devDependencies: { turbo: '^2' },
  });
  writeManifest(root, 'apps/web', {
    name: 'web',
    scripts: { build: 'next build' },
    dependencies: { next: '16.3.6', ...(broken ? { '@workspace/missing': 'workspace:*' } : {}) },
  });
  writeManifest(root, 'packages/ui', { name: '@workspace/ui' });
  writeManifest(root, 'packages/eslint-config', { name: '@workspace/eslint-config' });
  writeManifest(root, 'packages/typescript-config', { name: '@workspace/typescript-config' });
  writeFileSync(path.join(root, 'apps/web/next.config.ts'), 'export default {};\n');
  mkdirSync(path.join(root, 'apps/web/app'), { recursive: true });
  writeFileSync(
    path.join(root, 'apps/web/app/layout.tsx'),
    'export default function Layout({ children }) { return <html><body>{children}</body></html>; }\n',
  );
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    'packages:\n  - "apps/*"\n  - "packages/*"\n',
  );
  writeFileSync(path.join(root, 'turbo.json'), JSON.stringify({ tasks: { build: {} } }));
  writeFileSync(path.join(root, '.gitignore'), 'node_modules/\n');
}
