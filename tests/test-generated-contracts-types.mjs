/**
 * Optional offline regression; excluded from the default *.test.mjs unit glob.
 * Run pnpm build first, then:
 * pnpm test:contracts:types --node-types-dir /already/installed/@types/node
 * The supplied package must exactly match the actual emitted Node typing pin.
 * No search, fallback, skip, installation, or generated-source rewriting occurs.
 * --evidence-dir optionally selects a new directory for logs and retained scratch.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const usage =
  'Usage: node tests/test-generated-contracts-types.mjs --node-types-dir <installed @types/node package directory> [--evidence-dir <new directory>]\nRun pnpm build first. Exact emitted dependency versions are required; nothing is installed.';
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const hashFile = (file) => sha(fs.readFileSync(file));

function argumentsFor(args) {
  const result = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (!['--node-types-dir', '--evidence-dir'].includes(flag) || result[flag])
      throw new Error(usage);
    const value = args[++i];
    if (!value || value.startsWith('--')) throw new Error(usage);
    result[flag] = path.resolve(value);
  }
  if (!result['--node-types-dir']) throw new Error(usage);
  return result;
}

function snapshot(root) {
  const files = {};
  function visit(directory, prefix = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      const file = path.join(directory, name);
      const relative = prefix ? `${prefix}/${name}` : name;
      const stat = fs.lstatSync(file);
      if (stat.isSymbolicLink()) files[relative] = { link: fs.readlinkSync(file) };
      else if (stat.isDirectory()) {
        files[relative] = { directory: true };
        visit(file, relative);
      } else {
        assert.ok(stat.isFile(), `Unsupported fixture entry: ${relative}`);
        files[relative] = { sha256: hashFile(file), mode: stat.mode, size: stat.size };
      }
    }
  }
  visit(root);
  return files;
}

function packageInfo(directory, name, version) {
  const realpath = fs.realpathSync(directory);
  const manifestFile = path.join(realpath, 'package.json');
  const manifest = readJson(manifestFile);
  assert.equal(manifest.name, name, `Expected ${name} at the supplied dependency directory`);
  assert.equal(
    manifest.version,
    version,
    `Expected exact emitted ${name}@${version}; found ${manifest.version}. Supply an already-installed matching directory; no fallback or install is available.`,
  );
  return { name, version, realpath, manifestSha256: hashFile(manifestFile) };
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  // Explicit caller input only. Reading this path never searches another checkout.
  const nodeTypes = fs.realpathSync(args['--node-types-dir']);
  const supplied = readJson(path.join(nodeTypes, 'package.json'));
  assert.equal(supplied.name, '@types/node', 'The supplied directory must contain @types/node');
  const emitter = path.join(repo, 'dist/scaffold/backend.js');
  assert.ok(fs.existsSync(emitter), 'Missing compiled emitter. Run pnpm build first.');
  const evidence =
    args['--evidence-dir'] ??
    path.join(repo, '.artifacts/contracts-types', `${Date.now()}-${process.pid}`);
  assert.ok(
    !fs.existsSync(evidence),
    'Evidence directory already exists; preserve it and choose a new directory.',
  );
  fs.mkdirSync(evidence, { recursive: true });
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'anhedral-contracts-types-'));
  const report = { status: 'RUNNING', evidence, scratch, checks: [], node: process.version };
  const save = (name, value) =>
    fs.writeFileSync(path.join(evidence, name), JSON.stringify(value, null, 2) + '\n');
  save('result.json', report);
  try {
    const project = path.join(scratch, 'project');
    fs.mkdirSync(project);
    const { scaffoldContracts } = await import(pathToFileURL(emitter).href);
    scaffoldContracts(project);
    const contracts = path.join(project, 'packages/contracts');
    const manifest = readJson(path.join(contracts, 'package.json'));
    const configFile = path.join(contracts, 'tsconfig.json');
    const emittedConfig = readJson(configFile);
    assert.equal(manifest.name, '@workspace/contracts');
    assert.deepEqual(manifest.exports, { '.': './src/index.ts' });
    assert.ok(
      !('extends' in emittedConfig),
      'Revisit prerequisites if emitted config gains extends',
    );

    const require = createRequire(import.meta.url);
    const compilerRoot = path.dirname(require.resolve('typescript/package.json'));
    const zodRoot = path.dirname(require.resolve('zod/package.json'));
    const dependencies = [
      packageInfo(compilerRoot, 'typescript', manifest.devDependencies.typescript),
      packageInfo(zodRoot, 'zod', manifest.dependencies.zod),
      packageInfo(nodeTypes, '@types/node', manifest.devDependencies['@types/node']),
    ];
    const ts = require('typescript');
    const typesRequire = createRequire(path.join(nodeTypes, 'package.json'));
    const undiciManifest = typesRequire.resolve('undici-types/package.json');
    dependencies.push({
      name: 'undici-types',
      version: readJson(undiciManifest).version,
      realpath: fs.realpathSync(path.dirname(undiciManifest)),
      manifestSha256: hashFile(undiciManifest),
    });
    report.dependencies = dependencies;
    report.emitter = { file: emitter, sha256: hashFile(emitter) };
    const tsc = path.join(compilerRoot, 'bin/tsc');
    report.compiler = { path: fs.realpathSync(tsc), sha256: hashFile(tsc) };
    const nodeModules = path.join(project, 'node_modules');
    fs.mkdirSync(path.join(nodeModules, '@types'), { recursive: true });
    fs.symlinkSync(nodeTypes, path.join(nodeModules, '@types/node'));
    fs.symlinkSync(zodRoot, path.join(nodeModules, 'zod'));

    const consumer = path.join(scratch, 'consumer');
    fs.mkdirSync(path.join(consumer, 'node_modules/@workspace'), { recursive: true });
    fs.symlinkSync(contracts, path.join(consumer, 'node_modules/@workspace/contracts'));
    fs.mkdirSync(path.join(consumer, 'node_modules/@types'), { recursive: true });
    fs.symlinkSync(nodeTypes, path.join(consumer, 'node_modules/@types/node'));
    fs.mkdirSync(path.join(scratch, 'home'));
    fs.mkdirSync(path.join(scratch, 'temp'));
    const env = {
      PATH: path.dirname(process.execPath) + path.delimiter + '/usr/bin:/bin',
      HOME: path.join(scratch, 'home'),
      TMPDIR: path.join(scratch, 'temp'),
      CI: '1',
      NO_COLOR: '1',
      LANG: 'en_US.UTF-8',
    };
    function compile(label, projectFile, negative) {
      const command = [tsc, '--project', projectFile, '--pretty', 'false'];
      const result = spawnSync(process.execPath, command, {
        cwd: consumer,
        env,
        encoding: 'utf8',
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      });
      const log = (result.stdout ?? '') + (result.stderr ?? '');
      fs.writeFileSync(path.join(evidence, `${label}.log`), log);
      assert.ifError(result.error);
      const expected = negative
        ? {
            file: fs.realpathSync(negative.file),
            line: negative.line,
            column: negative.column,
            code: negative.code,
          }
        : null;
      if (negative) {
        assert.equal(
          result.status,
          2,
          `${label}: expected compiler diagnostics, got ${result.status}\n${log}`,
        );
        const diagnostics = log.trim().split(/\r?\n/);
        assert.equal(diagnostics.length, 1, `${label}: unrelated diagnostics\n${log}`);
        const actual = diagnostics[0].match(/^(.+)\((\d+),(\d+)\): error TS(\d+): /);
        assert.ok(actual, `${label}: malformed compiler diagnostic\n${log}`);
        const actualFile = fs.realpathSync(path.resolve(fs.realpathSync(consumer), actual[1]));
        assert.deepEqual(
          {
            file: actualFile,
            line: Number(actual[2]),
            column: Number(actual[3]),
            code: Number(actual[4]),
          },
          expected,
          `${label}: wrong diagnostic file/code/location\n${log}`,
        );
      } else {
        assert.equal(result.status, 0, `${label}\n${log}`);
        assert.equal(log, '', `${label}: unexpected output`);
      }
      report.checks.push({
        label,
        command: [process.execPath, ...command],
        expected,
        status: result.status,
      });
      save('result.json', report);
    }

    const emittedBefore = snapshot(contracts);
    save('emitted-before.json', emittedBefore);
    // First compile the exact emitted config, with no option overrides.
    compile('emitted-package', configFile);

    const prefix = "import { createApiClient } from '@workspace/contracts';\n";
    const positive = `import { createApiClient, healthSchema } from '@workspace/contracts';
const api = createApiClient('/api', { credentials: 'include', headers: async () => ({ 'x-request': 'synthetic' }) });
export const health: Promise<{ ok: true }> = api.health();
export const schemas = [healthSchema];
export async function inferred() {
  const health = await api.health({ cache: 'no-store' });
  const ok: true = health.ok;
  return { ok };
}
`;
    const cases = [
      {
        name: 'credentials',
        code: 2322,
        token: 'badCredentials',
        source:
          prefix +
          "const badCredentials: NonNullable<Parameters<typeof createApiClient>[1]>['credentials'] = 'administrator';\nvoid badCredentials;\n",
      },
      {
        name: 'signal',
        code: 2322,
        token: 'badSignal',
        source:
          prefix +
          "const badSignal: NonNullable<Parameters<ReturnType<typeof createApiClient>['health']>[0]>['signal'] = 'not-a-signal';\nvoid badSignal;\n",
      },
      {
        name: 'headers',
        code: 2322,
        token: 'badHeaders',
        source:
          prefix +
          "const badHeaders: NonNullable<Parameters<ReturnType<typeof createApiClient>['health']>[0]>['headers'] = 42;\nvoid badHeaders;\n",
      },
      {
        name: 'result',
        code: 2322,
        token: 'badResult',
        source: prefix + 'const badResult: number = createApiClient().health();\nvoid badResult;\n',
      },
    ];
    function fixture(name, source) {
      const file = path.join(consumer, `${name}.ts`);
      fs.writeFileSync(file, source);
      const config = { extends: configFile, include: [file] };
      assert.deepEqual(Object.keys(config).sort(), ['extends', 'include']);
      const projectFile = path.join(consumer, `${name}.json`);
      fs.writeFileSync(projectFile, JSON.stringify(config, null, 2) + '\n');
      return { file, projectFile };
    }
    const valid = fixture('positive', positive);
    const parsed = ts.parseJsonConfigFileContent(emittedConfig, ts.sys, contracts);
    assert.deepEqual(parsed.errors, [], 'The actual emitted config must parse unchanged');
    const resolved = ts.resolveModuleName(
      '@workspace/contracts',
      valid.file,
      parsed.options,
      ts.sys,
    ).resolvedModule;
    assert.ok(resolved, 'Compiler could not resolve the emitted public package export');
    assert.equal(
      fs.realpathSync(resolved.resolvedFileName),
      fs.realpathSync(path.join(contracts, 'src/index.ts')),
    );
    report.publicResolution = resolved;
    const negatives = cases.map((item) => {
      const files = fixture(item.name, item.source);
      const start = item.source.indexOf(item.token);
      const preceding = item.source.slice(0, start);
      return {
        ...item,
        ...files,
        line: preceding.split('\n').length,
        column: start - preceding.lastIndexOf('\n'),
      };
    });
    const consumerBefore = snapshot(consumer);
    save('consumer-before.json', consumerBefore);
    compile('positive', valid.projectFile);
    for (const item of negatives) compile(item.name, item.projectFile, item);
    const emittedAfter = snapshot(contracts);
    const consumerAfter = snapshot(consumer);
    save('emitted-after.json', emittedAfter);
    save('consumer-after.json', consumerAfter);
    assert.deepEqual(
      emittedAfter,
      emittedBefore,
      'The emitted package changed during typechecking',
    );
    assert.deepEqual(consumerAfter, consumerBefore, 'The consumer changed during typechecking');
    report.emittedUnchanged = true;
    report.consumerUnchanged = true;
    report.exports = manifest.exports;
    report.config = emittedConfig;
    report.limits =
      'Offline semantic package/consumer checks only; no full install/generation, runtime/browser/native, tenant authorization, or private Platform SDK compatibility claim.';
    report.status = 'PASS';
    save('result.json', report);
    console.log(
      `Generated contracts types PASS: ${report.checks.length} compiler cases. Evidence: ${evidence}`,
    );
  } catch (error) {
    report.status = 'FAIL';
    report.error = error instanceof Error ? error.stack : String(error);
    save('result.json', report);
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
