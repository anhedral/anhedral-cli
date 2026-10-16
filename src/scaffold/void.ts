import { existsSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { VOID_NODE_ENGINE, VOID_VERSION } from '../void.js';
import { VINEXT_DEPENDENCIES, WORKER_DEV_PORTS } from '../dependencies.js';
import { json, patchPackage, put, readJson } from './files.js';

/** Keep Void's adapter paired with the Wrangler version validated by this stack. */
function pinVoidCloudflareAdapter(root: string): void {
  const pkg = readJson(root, 'package.json');
  const pnpm = (pkg.pnpm ?? {}) as Record<string, unknown>;
  patchPackage(root, 'package.json', {
    pnpm: {
      ...pnpm,
      overrides: {
        ...((pnpm.overrides ?? {}) as Record<string, string>),
        [`void@${VOID_VERSION}>@cloudflare/vite-plugin`]:
          VINEXT_DEPENDENCIES.devDependencies!['@cloudflare/vite-plugin'],
      },
    },
  });
}

/** Fresh-workspace conversion only. Existing applications keep their delivery engine. */
export function configureVoidDelivery(root: string): boolean {
  if (existsSync(path.join(root, 'apps/web/open-next.config.ts'))) return false;
  for (const app of readdirSync(path.join(root, 'apps'))) {
    const file = path.join(root, 'apps', app, 'wrangler.jsonc');
    if (!existsSync(file)) continue;
    const config = readJson(root, `apps/${app}/wrangler.jsonc`);
    if (config.queues || config.pipelines) return false;
  }
  let configured = false;
  for (const app of readdirSync(path.join(root, 'apps'))) {
    const directory = `apps/${app}`;
    const source = path.join(root, directory, 'wrangler.jsonc');
    // OpenNext remains an explicit legacy recipe until its adapter is supported.
    if (!existsSync(source) || existsSync(path.join(root, directory, 'open-next.config.ts')))
      continue;
    const cloudflare = readJson(root, `${directory}/wrangler.jsonc`);
    delete cloudflare.$schema;
    if (app !== 'web') {
      cloudflare.main = 'src/void-entry.ts';
      cloudflare.version_metadata = { binding: '__VOID_VERSION_METADATA' };
    }
    json(root, `${directory}/anhedral.cloudflare.json`, cloudflare);
    rmSync(source);
    put(
      root,
      `${directory}/void.config.ts`,
      `import { defineConfig } from 'void/config';
import declared from './anhedral.cloudflare.json';

// Unassigned placeholders are not provider identities. Void records real IDs
// in its lock, while Anhedral retains the declarative resource names.
const cloudflare = JSON.parse(JSON.stringify(declared, (key, value) =>
  key === 'anhedral_name' || (typeof value === 'string' && value.startsWith('REPLACE_WITH_')) ? undefined : value,
));

// Enable only registry-declared capabilities with their exact binding names.
// Capability additions update this declaration without scanning other packages.
// Shared packages receive bindings through factories.
export default defineConfig({
  target: 'cloudflare',
  inference: {
    appType: '${app === 'web' ? 'framework' : 'void'}',
    scanDirs: ['src', 'app', 'lib'],
    bindings: {
      db: cloudflare.d1_databases?.[0]?.binding ?? false,
      kv: cloudflare.kv_namespaces?.[0]?.binding ?? false,
      storage: cloudflare.r2_buckets?.[0]?.binding ?? false,
      ai: cloudflare.ai?.binding ?? false,
      email: false,
    },
  },
  cloudflare,
});
`,
    );
    const envKeys = new Map<string, string>();
    for (const filename of ['.dev.vars.example', '.env.example']) {
      const file = path.join(root, directory, filename);
      if (!existsSync(file)) continue;
      for (const match of readFileSync(file, 'utf8').matchAll(/^([A-Z][A-Z0-9_]*)=(.*)$/gm))
        envKeys.set(match[1], match[2]);
      rmSync(file);
    }
    put(
      root,
      `${directory}/env.example`,
      '# Copy env.example to .env in this app directory. Void reads one local file per deployable app.\n# Production server values use void secret; VITE_* values must be supplied by the build environment.\n' +
        [...envKeys].map(([key, value]) => `${key}=${value}`).join('\n') +
        '\n',
    );
    const serverKeys = [...envKeys.keys()].filter(
      (key) => !key.startsWith('NEXT_PUBLIC_') && !key.startsWith('VITE_'),
    );
    if (app !== 'web' && serverKeys.length) {
      cloudflare.secrets = { required: serverKeys };
      json(root, `${directory}/anhedral.cloudflare.json`, cloudflare);
    }
    put(
      root,
      `${directory}/env.ts`,
      `import { defineEnv${serverKeys.length ? ', string' : ''} } from 'void/env';\nexport default defineEnv({\n${serverKeys.map((key) => `  ${key}: string(),`).join('\n')}\n});\n`,
    );
    patchPackage(root, `${directory}/package.json`, {
      devDependencies: { void: VOID_VERSION },
      scripts: {
        deploy:
          'node ../../scripts/prepare-void-migrations.mjs && void deploy --platform cloudflare',
        'env:check': 'void env check',
        typecheck: `wrangler types --config anhedral.cloudflare.json${app === 'web' ? ' --env-interface CloudflareEnv cloudflare-env.d.ts' : ''} && tsc --noEmit`,
      },
    });
    if (app === 'web') {
      // Void owns the Cloudflare Vite adapter in this recipe; the legacy
      // Vinext configuration's direct plugin dependency is no longer used.
      const webPackage = readJson(root, `${directory}/package.json`);
      const webDevDependencies = webPackage.devDependencies as Record<string, string>;
      delete webDevDependencies['@cloudflare/vite-plugin'];
      json(root, `${directory}/package.json`, webPackage);
      if (existsSync(path.join(root, directory, 'tsconfig.json'))) {
        const ts = readJson(root, `${directory}/tsconfig.json`);
        (ts.compilerOptions as Record<string, unknown>).resolveJsonModule = true;
        json(root, `${directory}/tsconfig.json`, ts);
      }
      put(
        root,
        `${directory}/vite.config.ts`,
        `import { defineConfig } from 'vite';\nimport vinext from 'vinext';\nimport { voidPlugin } from 'void';\nexport default defineConfig({ plugins: [vinext(), voidPlugin()] });\n`,
      );
      patchPackage(root, `${directory}/package.json`, {
        scripts: { preview: 'vite preview --host 127.0.0.1 --port 3000' },
      });
    } else {
      const ports = WORKER_DEV_PORTS[app as keyof typeof WORKER_DEV_PORTS];
      const schedules = (cloudflare.triggers as { crons?: string[] } | undefined)?.crons;
      if (schedules?.length) {
        put(
          root,
          `${directory}/crons/scheduled.ts`,
          `import application from '../src/index';
// Void validates authored cron triggers against source declarations. The
// standalone Worker entry retains the original scheduled event handler.
export const cron = ${JSON.stringify(schedules)};
export default application.scheduled;
`,
        );
      }

      put(
        root,
        `${directory}/src/void-entry.ts`,
        `import application from './index';
export * from './index';
// Deployment readiness is distinct from product acceptance. Preserve original
// fetch, queue, scheduled and named Durable Object/Workflow exports.
type Worker = { fetch?: (request: Request, env: Env, ctx: ExecutionContext) => Response | Promise<Response> };
const original = application as unknown as Worker;
function readiness(env: Env): Response {
  return Response.json({ ready: true, versionId: env.__VOID_VERSION_METADATA?.id }, { headers: { 'cache-control': 'no-store' } });
}
export default {
  ...application,
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method === 'GET' && new URL(request.url).pathname === '/__void/ready') {
      return readiness(env);
    }
    return original.fetch ? original.fetch.call(application, request, env, ctx) : new Response('Not found', { status: 404 });
  },
};
`,
      );

      put(
        root,
        `${directory}/routes/README.md`,
        '# Standalone Worker delivery\n\nVoid 0.27 requires a backend convention directory to classify a Worker deployment. This reserved directory contains no Void handlers. The Cloudflare Vite plugin builds src/void-entry.ts, which adds deployment readiness and preserves the application handlers and exported classes from src/index.ts. Do not add a second router here without reviewing the application architecture.\n',
      );
      put(
        root,
        `${directory}/vite.config.ts`,
        `import { defineConfig } from 'vite';\nimport { cloudflare } from '@cloudflare/vite-plugin';\n// Void generates the deployment config before its fresh build. Local builds\n// use the same explicit declaration without provisioning remote resources.\nexport default defineConfig({ plugins: [cloudflare({ configPath: process.env.VOID_CLOUDFLARE_DEPLOY_BUILD ? '.void-wrangler.jsonc' : 'anhedral.cloudflare.json', inspectorPort: ${ports.inspector}, viteEnvironment: { name: 'ssr' } })], server: { host: '127.0.0.1', port: ${ports.http}, strictPort: true } });\n`,
      );
      patchPackage(root, `${directory}/package.json`, {
        devDependencies: {
          vite: VINEXT_DEPENDENCIES.devDependencies!.vite,
          '@cloudflare/vite-plugin':
            VINEXT_DEPENDENCIES.devDependencies!['@cloudflare/vite-plugin'],
        },
        scripts: {
          dev: 'vite dev',
          build: 'vite build',
          preview: `vite preview --host 127.0.0.1 --port ${ports.http}`,
        },
      });
      const ts = readJson(root, `${directory}/tsconfig.json`);
      const compiler = ts.compilerOptions as Record<string, unknown>;
      compiler.resolveJsonModule = true;
      ts.include = [
        'src/**/*.ts',
        'worker-configuration.d.ts',
        'vite.config.ts',
        'void.config.ts',
        'env.ts',
      ];
      json(root, `${directory}/tsconfig.json`, ts);
    }
    const migrateFile = path.join(root, 'packages/db/src/migrate.ts');
    if (existsSync(migrateFile)) {
      const migrateSource = readFileSync(migrateFile, 'utf8');
      put(
        root,
        'packages/db/src/migrate.ts',
        migrateSource.replaceAll(
          `apps/${app}/wrangler.jsonc`,
          `apps/${app}/anhedral.cloudflare.json`,
        ),
      );
    }
    configured = true;
  }
  if (configured) {
    pinVoidCloudflareAdapter(root);
    patchPackage(root, 'package.json', { engines: { node: VOID_NODE_ENGINE } });
    // The standalone generated preparation module uses only Node builtins and
    // is byte-identical to the version exercised by Anhedral delivery tests.
    put(
      root,
      'scripts/void-migrations.mjs',
      readFileSync(new URL('../void-migrations.js', import.meta.url), 'utf8'),
    );
    put(
      root,
      'scripts/prepare-void-migrations.mjs',
      `import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { prepareVoidMigrations } from './void-migrations.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const directory = process.cwd();
const config = JSON.parse(readFileSync(path.join(directory, 'anhedral.cloudflare.json'), 'utf8'));
prepareVoidMigrations(root, directory, config);
`,
    );
  }
  return configured;
}

/** Extend server declarations after transactional additions without evaluating config. */
export function refreshVoidEnvironment(root: string): void {
  let configured = false;
  for (const app of readdirSync(path.join(root, 'apps'))) {
    const directory = `apps/${app}`;
    if (!existsSync(path.join(root, directory, 'void.config.ts'))) continue;
    configured = true;
    const schemaFile = path.join(root, directory, 'env.ts');
    if (!existsSync(schemaFile)) continue;
    let schema = readFileSync(schemaFile, 'utf8');
    const local = path.join(root, directory, 'env.example');
    let example = existsSync(local) ? readFileSync(local, 'utf8') : '';
    // Recipe additions use legacy names before this fresh staged conversion.
    for (const filename of ['.env.example', '.dev.vars.example']) {
      const file = path.join(root, directory, filename);
      if (!existsSync(file)) continue;
      for (const line of readFileSync(file, 'utf8').split('\n')) {
        const key = /^([A-Z][A-Z0-9_]*)=/.exec(line)?.[1];
        if (key && !example.split('\n').some((entry) => entry.startsWith(`${key}=`))) {
          example += (example.endsWith('\n') ? '' : '\n') + line + '\n';
        }
      }
      rmSync(file);
    }
    put(root, `${directory}/env.example`, example);
    const keys = [...example.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1]);
    const missing = [...new Set(keys)].filter(
      (key) =>
        !key.startsWith('NEXT_PUBLIC_') &&
        !key.startsWith('VITE_') &&
        !new RegExp(String.raw`\b${key}\s*:`).test(schema),
    );
    if (app !== 'web' && existsSync(path.join(root, directory, 'anhedral.cloudflare.json'))) {
      const configFile = `${directory}/anhedral.cloudflare.json`;
      const config = readJson(root, configFile);
      const serverKeys = [...new Set(keys)].filter(
        (key) => !key.startsWith('NEXT_PUBLIC_') && !key.startsWith('VITE_'),
      );
      const secrets = (config.secrets ?? {}) as { required?: string[] };
      config.secrets = {
        ...secrets,
        required: [...new Set([...(secrets.required ?? []), ...serverKeys])],
      };
      json(root, configFile, config);
    }
    if (!missing.length) continue;
    if (!schema.includes('defineEnv({'))
      throw new Error(`Review ${directory}/env.ts before adding server environment keys.`);
    if (!/import\s*\{[^}]*\bstring\b[^}]*\}\s*from\s*['"]void\/env['"]/.test(schema)) {
      schema = schema.replace(
        /import\s*\{([^}]*)\}\s*from\s*(['"]void\/env['"])/,
        'import { $1, string } from $2',
      );
    }
    schema = schema.replace(
      'defineEnv({',
      `defineEnv({\n${missing.map((key) => `  ${key}: string(),`).join('\n')}`,
    );
    put(root, `${directory}/env.ts`, schema);
  }
  if (configured) {
    pinVoidCloudflareAdapter(root);
    patchPackage(root, 'package.json', { engines: { node: VOID_NODE_ENGINE } });
  }
}
