import assert from 'node:assert/strict';
import { builtinModules } from 'node:module';
import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { readContractSnapshot } from './deployment-contract-snapshot.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export const policy = JSON.parse(
  readFileSync(new URL('./public-package-policy.json', import.meta.url)),
);
const builtins = new Set(builtinModules.flatMap((name) => [name, `node:${name}`]));
const portable = new Set([
  'cli-transport',
  'deployment',
  'source-bundle',
  'source-profile',
  'environment-transport',
  'environment-file',
  'staging-transport',
  'runtime-logs-transport',
]);
const clientShared = new Set(['cli-arguments', 'cli-output', 'cli-errors', 'command-schema']);
export function moduleReferences(file, source) {
  const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const references = [];
  const add = (value) => references.push(value && ts.isStringLiteral(value) ? value.text : null);
  function visit(node) {
    if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier)
      add(node.moduleSpecifier);
    if (ts.isImportEqualsDeclaration(node))
      add(
        ts.isExternalModuleReference(node.moduleReference)
          ? node.moduleReference.expression
          : undefined,
      );
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    )
      add(node.arguments[0]);
    if (ts.isImportTypeNode(node))
      add(ts.isLiteralTypeNode(node.argument) ? node.argument.literal : undefined);
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  return references;
}
export function sourceViolations(file, source, options = {}) {
  const absolute = path.resolve(root, file);
  const module = path
    .relative(path.join(root, 'src'), absolute)
    .replaceAll(path.sep, '/')
    .replace(/\.(?:ts|js)$/, '');
  const contract = module.startsWith('contracts/');
  const client = policy.platformModules.includes(module);
  const failures = [];
  for (const reference of moduleReferences(file, source)) {
    let allowed = reference !== null;
    if (allowed && reference.startsWith('.')) {
      const target = path.resolve(path.dirname(absolute), reference).replace(/\.(?:ts|js)$/, '');
      const targetModule = path.relative(path.join(root, 'src'), target).replaceAll(path.sep, '/');
      const asset = path.relative(root, target).replaceAll(path.sep, '/');
      if (!contract && policy.runtimeAssets.includes(asset)) {
        const assetPath = path.resolve(root, asset);
        allowed = realpathSync(assetPath) === assetPath;
        if (!allowed) failures.push(`${file}: unsafe runtime asset ${reference}`);
        continue;
      }
      allowed = policy.modules.includes(targetModule);
      const resolved = ts.resolveModuleName(reference, absolute, options, ts.sys).resolvedModule;
      if (resolved)
        allowed &&= realpathSync(resolved.resolvedFileName).startsWith(
          realpathSync(path.join(root, 'src')) + path.sep,
        );
      if (contract)
        allowed &&= targetModule.startsWith('contracts/') && portable.has(targetModule.slice(10));
      if (client)
        allowed &&=
          targetModule.startsWith('contracts/') ||
          policy.platformModules.includes(targetModule) ||
          clientShared.has(targetModule);
      if (!client && module !== 'cli-commands')
        allowed &&= !policy.platformModules.includes(targetModule);
    } else if (allowed) {
      allowed = builtins.has(reference) || policy.runtimeDependencies.includes(reference);
      if (contract) allowed &&= reference === 'zod';
      if (client) allowed &&= builtins.has(reference) || ['zod', 'ignore'].includes(reference);
      // Package aliases cannot resolve to private sibling or parent source.
      const resolved = ts.resolveModuleName(reference, absolute, options, ts.sys).resolvedModule;
      if (resolved)
        allowed &&= realpathSync(resolved.resolvedFileName).includes(
          `${path.sep}node_modules${path.sep}`,
        );
    }
    if (!allowed)
      failures.push(`${file}: forbidden repository/layer import ${reference ?? '<computed>'}`);
  }
  return failures;
}
export function assertPublicContractFiles(files) {
  for (const [target, bytes] of files) {
    if (target.startsWith('src/contracts/'))
      assert.deepEqual(sourceViolations(target, bytes.toString()), []);
    if (target.endsWith('acceptance.mjs')) {
      for (const reference of moduleReferences(target, bytes.toString()))
        assert.ok(
          ['node:assert/strict', 'node:test'].includes(reference),
          'Public acceptance fixtures may import only Node assertion/test modules',
        );
    }
  }
}
export function assertPublishedModules(files) {
  const expected = new Set(
    policy.modules.flatMap((name) => [`dist/${name}.js`, `dist/${name}.d.ts`]),
  );
  assert.deepEqual(
    files.filter((file) => file.startsWith('dist/')).sort(),
    [...expected].sort(),
    'Published dist must match the reviewed public module list',
  );
}
export function checkRepositoryBoundary() {
  const manifest = JSON.parse(readFileSync(path.join(root, 'package.json')));
  assert.equal(manifest.license, 'Apache-2.0');
  assert.deepEqual(
    Object.keys(manifest.dependencies).sort(),
    [...policy.runtimeDependencies].sort(),
    'Review runtime dependency additions',
  );
  for (const group of [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ]) {
    for (const [name, version] of Object.entries(manifest[group] ?? {})) {
      assert.ok(
        !name.startsWith('@anhedral/') && /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(version),
        `${group}.${name}: public CLI cannot depend on private/local repository packages`,
      );
    }
  }
  assert.deepEqual(
    manifest.exports,
    {
      '.': { types: './dist/index.d.ts', import: './dist/index.js' },
      './deployment': {
        types: './dist/contracts/deployment.d.ts',
        import: './dist/contracts/deployment.js',
      },
    },
    'Review public entrypoint changes',
  );
  const config = ts.readConfigFile(path.join(root, 'tsconfig.json'), ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  assert.equal(parsed.errors.length, 0);
  const files = [];
  function collect(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      assert.ok(!entry.isSymbolicLink(), `Public source must not symlink private files: ${file}`);
      if (entry.isDirectory()) collect(file);
      else {
        assert.ok(
          entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts'),
          `Unreviewed source type: ${file}`,
        );
        files.push(file);
      }
    }
  }
  collect(path.join(root, 'src'));
  assert.deepEqual(
    files
      .map((file) =>
        path.relative(path.join(root, 'src'), file).replaceAll(path.sep, '/').slice(0, -3),
      )
      .sort(),
    [...policy.modules].sort(),
    'Review public source module additions/removals',
  );
  for (const file of files)
    assert.deepEqual(
      sourceViolations(path.relative(root, file), readFileSync(file, 'utf8'), parsed.options),
      [],
    );
  assertPublicContractFiles(readContractSnapshot(root, true).files);
  return files.length;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url))
  console.log(`CLI repository boundary passed: ${checkRepositoryBoundary()} reviewed modules.`);
