import { resourceName } from '../render.js';
import { writeEnvironmentFile } from './environment.js';
import { STACK_DEPENDENCIES, NEXT_VERCEL_VERSION, NEXT_OPENNEXT_VERSION } from '../dependencies.js';
import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { configureVinext } from '../vinext.js';
import type { RecipeContext } from '../registry/types.js';
import { json, put, readJson, patchPackage, workerConfig, type PackageManifest } from './files.js';
function cleanWorkspaceManifest(root: string, directory: string): void {
  const manifestPath = `${directory}/package.json`;
  if (!existsSync(path.join(root, manifestPath))) return;
  const manifest = readJson<PackageManifest>(root, manifestPath);
  const sources: string[] = [];
  const collect = (folder: string): void => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (['node_modules', '.next', '.open-next', '.git'].includes(entry.name)) continue;
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) collect(file);
      else if (/\.(tsx?|m?js|css)$/.test(entry.name)) sources.push(readFileSync(file, 'utf8'));
    }
  };
  collect(path.join(root, directory));
  for (const name of ['lucide-react', 'zod', 'next-themes']) {
    if (!sources.some((source) => source.includes(`"${name}`) || source.includes(`'${name}`)))
      delete manifest.dependencies?.[name];
  }
  if (directory === 'packages/ui') {
    if (
      !sources.some((source) => source.includes('@turbo/gen')) &&
      !Object.values(manifest.scripts ?? {}).some((script) => String(script).includes('turbo gen'))
    )
      delete manifest.devDependencies?.['@turbo/gen'];
    manifest.devDependencies = {
      ...manifest.devDependencies,
      'postcss-load-config': STACK_DEPENDENCIES['postcss-load-config'],
    };
    if (manifest.dependencies?.shadcn) {
      manifest.devDependencies.shadcn = manifest.dependencies.shadcn;
      delete manifest.dependencies.shadcn;
    }
  }
  json(root, manifestPath, manifest);
}

function cleanShadcnStarter(root: string): void {
  for (const directory of ['apps/web', 'packages/ui']) cleanWorkspaceManifest(root, directory);
  const themePath = 'apps/web/components/theme-provider.tsx';
  if (existsSync(path.join(root, themePath))) {
    const source = readFileSync(path.join(root, themePath), 'utf8');
    const updated = source
      .replace(
        /target.tagName === "INPUT" \|\|\s*target.tagName === "TEXTAREA" \|\|\s*target.tagName === "SELECT"/,
        '["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)',
      )
      .replace(
        /if \(event.defaultPrevented \|\| event.repeat\) \{\s*return\s*\}\s*if \(event.metaKey \|\| event.ctrlKey \|\| event.altKey\) \{\s*return\s*\}\s*if \(event.key.toLowerCase\(\) !== "d"\) \{\s*return\s*\}\s*if \(isTypingTarget\(event.target\)\) \{\s*return\s*\}/,
        'if (!isThemeShortcut(event) || isTypingTarget(event.target)) return',
      );
    // Group modifier handling while preserving short-circuiting and avoiding guard arrays.
    const modifierHelper = `function hasShortcutModifier(event: KeyboardEvent) {
  return event.metaKey || event.ctrlKey || event.altKey
}

function isThemeShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.repeat) return false
  return !hasShortcutModifier(event) && event.key.toLowerCase() === "d"
}

`;
    const needsModifierHelper =
      updated.includes('isThemeShortcut(event)') &&
      !updated.includes('function hasShortcutModifier(');
    const content = needsModifierHelper
      ? updated.replace(
          /(?:export )?function ThemeProvider\b/,
          (declaration) => modifierHelper + declaration,
        )
      : updated;
    if (needsModifierHelper && content === updated)
      throw new Error('The upstream theme provider changed; review its shortcut integration.');
    put(root, themePath, content);
  }
}

export function scaffoldWeb({ root, options, bindings, runtimeApp, has }: RecipeContext): void {
  cleanShadcnStarter(root);
  put(
    root,
    'apps/web/eslint.config.js',
    'import { nextJsConfig } from "@workspace/eslint-config/next-js";\nexport default [...nextJsConfig, { ignores: [".open-next/**", ".wrangler/**", "cloudflare-env.d.ts"] }];\n',
  );
  patchPackage(root, 'apps/web/package.json', {
    scripts: { typecheck: 'tsc --noEmit', lint: 'eslint . --max-warnings 0' },
  });
  if (has('vinext')) {
    configureVinext(root, resourceName(options.name, 'web'), runtimeApp === 'web' ? bindings : {});
  } else if (options.hosting === 'cloudflare') {
    patchPackage(root, 'apps/web/package.json', {
      dependencies: {
        '@opennextjs/cloudflare': STACK_DEPENDENCIES['@opennextjs/cloudflare'],
        next: NEXT_OPENNEXT_VERSION,
      },
      devDependencies: { wrangler: STACK_DEPENDENCIES['wrangler'] },
      scripts: {
        preview: 'opennextjs-cloudflare build && opennextjs-cloudflare preview --port 3000',
        deploy: 'opennextjs-cloudflare build && opennextjs-cloudflare deploy',
        'build:worker': 'opennextjs-cloudflare build',
        'cf:typegen': 'wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts',
      },
    });
    json(root, 'apps/web/wrangler.jsonc', {
      ...workerConfig(resourceName(options.name, 'web')),
      compatibility_flags: ['nodejs_compat', 'global_fetch_strictly_public'],
      main: '.open-next/worker.js',
      assets: { directory: '.open-next/assets', binding: 'ASSETS' },
      services: [{ binding: 'WORKER_SELF_REFERENCE', service: resourceName(options.name, 'web') }],
      ...(runtimeApp === 'web' ? bindings : {}),
    });
    const nextConfig = ['next.config.ts', 'next.config.mjs', 'next.config.js'].find((file) =>
      existsSync(path.join(root, 'apps/web', file)),
    );
    if (nextConfig) {
      const source = readFileSync(path.join(root, 'apps/web', nextConfig), 'utf8');
      put(
        root,
        `apps/web/${nextConfig}`,
        `import { initOpenNextCloudflareForDev } from '@opennextjs/cloudflare';\n${source}\ninitOpenNextCloudflareForDev();\n`,
      );
    }
    put(
      root,
      'apps/web/open-next.config.ts',
      'import { defineCloudflareConfig } from "@opennextjs/cloudflare";\nexport default defineCloudflareConfig();\n',
    );
    put(
      root,
      'apps/web/public/_headers',
      '/_next/static/*\n  Cache-Control: public,max-age=31536000,immutable\n',
    );
    writeEnvironmentFile(root, 'apps/web/.dev.vars.example', { NEXTJS_ENV: 'development' });
  } else {
    patchPackage(root, 'apps/web/package.json', { dependencies: { next: NEXT_VERCEL_VERSION } });
    put(
      root,
      'apps/web/next.config.ts',
      'import type { NextConfig } from "next";\nconst config: NextConfig = { transpilePackages: ["@workspace/ui"], cacheComponents: true, partialPrefetching: true };\nexport default config;\n',
    );
    for (const file of ['next.config.js', 'next.config.mjs'])
      rmSync(path.join(root, 'apps/web', file), { force: true });
    json(root, 'apps/web/vercel.json', { framework: 'nextjs' });
  }
}
