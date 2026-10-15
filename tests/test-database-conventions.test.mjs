import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  rmSync,
  realpathSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { scaffoldDatabase } from '../dist/scaffold/database.js';

function fixture(postgres, runtimeApp = 'api') {
  const root = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-db-convention-')));
  const save = (name, value) => {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value));
  };
  save(`apps/${runtimeApp}/package.json`, { name: `@workspace/${runtimeApp}` });
  save(`apps/${runtimeApp}/tsconfig.json`, { include: ['src/**/*.ts'] });
  scaffoldDatabase({
    root,
    runtimeApp,
    options: { hosting: 'cloudflare' },
    has: (id) => id === (postgres ? 'neon' : 'd1'),
  });
  const read = (name) => readFileSync(path.join(root, name), 'utf8');
  const source = read('packages/db/src/migrate.ts');
  save(
    'packages/db/src/migrate.mjs',
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    }).outputText,
  );
  const run = (args = [], environment = {}) =>
    spawnSync(process.execPath, [path.join(root, 'packages/db/src/migrate.mjs'), ...args], {
      cwd: tmpdir(),
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL_UNPOOLED: '', ...environment },
    });
  return { root, save, read, run, close: () => rmSync(root, { recursive: true, force: true }) };
}

for (const postgres of [false, true]) {
  test(`${postgres ? 'Neon' : 'D1'} remains a reusable server package with one schema and SQL directory`, () => {
    const f = fixture(postgres);
    try {
      const db = JSON.parse(f.read('packages/db/package.json'));
      assert.equal(db.exports['.'], './src/index.ts');
      assert.equal(db.exports['./schema'], './src/schema.ts');
      assert.equal(db.scripts['db:migrate'], 'tsx src/migrate.ts');
      assert.match(f.read('packages/db/drizzle.config.ts'), /\.\/src\/schema\.ts/);
      assert.match(f.read('packages/db/drizzle.config.ts'), /\.\/drizzle\//);
      const evaluatedConfig = ts.transpileModule(
        f
          .read('packages/db/drizzle.config.ts')
          .replace(
            "import { defineConfig } from 'drizzle-kit';",
            'const defineConfig = (value) => value;',
          ),
        { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } },
      ).outputText;
      f.save('packages/db/drizzle.config.mjs', evaluatedConfig);
      f.save(
        'packages/db/evaluate.mjs',
        "import config from './drizzle.config.mjs'; console.log(JSON.stringify(config));",
      );
      for (const cwd of [f.root, path.join(f.root, 'packages/db'), tmpdir()]) {
        const result = spawnSync(
          process.execPath,
          [path.join(f.root, 'packages/db/evaluate.mjs')],
          {
            cwd,
            encoding: 'utf8',
            env: { ...process.env, DATABASE_URL_UNPOOLED: '' },
          },
        );
        assert.equal(result.status, 0, result.stderr);
        const config = JSON.parse(result.stdout);
        assert.equal(path.isAbsolute(config.out), false);
        assert.equal(
          path.resolve(realpathSync(cwd), config.out),
          path.join(f.root, 'packages/db/drizzle'),
        );
        assert.equal(config.schema, path.join(f.root, 'packages/db/src/schema.ts'));
      }

      assert.ok(existsSync(path.join(f.root, 'packages/db/drizzle')));
      assert.equal(existsSync(path.join(f.root, 'packages/db/migrations')), false);
      assert.equal(existsSync(path.join(f.root, 'apps/api/lib/db')), false);
      assert.equal(
        JSON.parse(f.read('apps/api/package.json')).dependencies['@workspace/db'],
        'workspace:*',
      );
      assert.doesNotMatch(f.read('packages/db/src/index.ts'), /process\.env|loadEnvFile|migrate\(/);
    } finally {
      f.close();
    }
  });
}

for (const runtime of ['web', 'api']) {
  test(`D1 migration selects ${runtime}'s binding configuration and defaults to local`, () => {
    const f = fixture(false, runtime);
    try {
      f.save(
        'pnpm.mjs',
        `import { writeFileSync } from 'node:fs'; writeFileSync('invocation.json', JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd() })); process.exit(Number(process.env.FIXTURE_EXIT || 0));`,
      );
      for (const args of [[], ['--local'], ['--remote']]) {
        const result = f.run(args, { npm_execpath: path.join(f.root, 'pnpm.mjs') });
        assert.equal(result.status, 0, result.stderr);
        const actual = JSON.parse(f.read(`apps/${runtime}/invocation.json`));
        assert.deepEqual(actual.args, [
          'exec',
          'wrangler',
          'd1',
          'migrations',
          'apply',
          'DB',
          args[0] ?? '--local',
          '--config',
          path.join(f.root, `apps/${runtime}/wrangler.jsonc`),
        ]);
        assert.equal(actual.cwd, path.join(f.root, `apps/${runtime}`));
      }
      assert.equal(
        f.run([], { npm_execpath: path.join(f.root, 'pnpm.mjs'), FIXTURE_EXIT: '7' }).status,
        7,
      );
      for (const args of [['--unknown'], ['--local', '--remote']]) {
        const result = f.run(args);
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /Usage:/);
      }
    } finally {
      f.close();
    }
  });
}

test('Neon migration requires a direct URL, keeps credentials out of failures and closes its pool', () => {
  const f = fixture(true);
  try {
    f.save('packages/db/node_modules/@neondatabase/serverless/package.json', {
      type: 'module',
      exports: './index.js',
    });
    f.save(
      'packages/db/node_modules/@neondatabase/serverless/index.js',
      `
      import { writeFileSync } from 'node:fs';
      globalThis.WebSocket ??= class {};
      export const neonConfig = {};
      export class Pool { async end() { writeFileSync(new URL('../../../closed', import.meta.url), 'closed'); } }
    `,
    );
    f.save('packages/db/node_modules/drizzle-orm/package.json', {
      type: 'module',
      exports: { './neon-serverless': './index.js', './neon-serverless/migrator': './migrator.js' },
    });
    f.save('packages/db/node_modules/drizzle-orm/index.js', 'export const drizzle = pool => pool;');
    f.save(
      'packages/db/node_modules/drizzle-orm/migrator.js',
      `import { writeFileSync } from 'node:fs'; export async function migrate(db, config) { writeFileSync(new URL('../../migration.json', import.meta.url), JSON.stringify(config)); if (process.env.FIXTURE_FAIL) throw new Error('private-credential'); }`,
    );
    const connection = (host) => {
      const url = new URL(`postgres://${host}/app`);
      url.username = 'role';
      url.password = 'private-credential';
      return url.href;
    };
    for (const url of ['', 'private-credential', connection('ep-fixture-pooler.neon.tech')]) {
      const result = f.run([], { DATABASE_URL_UNPOOLED: url });
      assert.notEqual(result.status, 0);
      assert.doesNotMatch(result.stderr, /private-credential/);
    }
    const environment = {
      DATABASE_URL_UNPOOLED: connection('ep-fixture.neon.tech'),
    };
    const passed = f.run([], environment);
    assert.equal(passed.status, 0, passed.stderr);
    assert.deepEqual(JSON.parse(f.read('packages/db/migration.json')), {
      migrationsFolder: path.join(f.root, 'packages/db/drizzle/'),
    });
    assert.equal(f.read('packages/db/closed'), 'closed');
    const failed = f.run([], { ...environment, FIXTURE_FAIL: '1' });
    assert.notEqual(failed.status, 0);
    assert.match(failed.stderr, /Database migration failed/);
    assert.doesNotMatch(failed.stderr, /private-credential/);
    assert.equal(f.read('packages/db/closed'), 'closed');
  } finally {
    f.close();
  }
});
