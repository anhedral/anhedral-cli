import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  cpSync,
  symlinkSync,
  lstatSync,
  readdirSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
export const nativeQADocumentName = 'anhedral-native-file-qa.txt';
export const nativeQADocumentContent =
  'Anhedral dedicated native document picker acceptance fixture.\n';
export function seedNativeQADocument(directory) {
  if (lstatSync(directory, { throwIfNoEntry: false })?.isSymbolicLink())
    throw Error('Refusing a symlinked QA document directory.');
  mkdirSync(directory, { recursive: true });
  const target = path.join(directory, nativeQADocumentName);
  const stat = lstatSync(target, { throwIfNoEntry: false });
  if (stat && (!stat.isFile() || readFileSync(target, 'utf8') !== nativeQADocumentContent))
    throw Error('Refusing to overwrite an unrelated document picker fixture.');
  if (!stat) writeFileSync(target, nativeQADocumentContent, { flag: 'wx' });
  return target;
}
export function nativeQAExport(source, requested) {
  const file = ts.createSourceFile(
    'recipe.tsx',
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const names = [];
  for (const node of file.statements) {
    if (ts.isExportAssignment(node) && !node.isExportEquals) names.push('default');
    if (
      ts.isFunctionDeclaration(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (node.modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword))
        names.push('default');
      else if (node.name) names.push(node.name.text);
    }
  }
  if (requested) {
    if (!names.includes(requested)) throw Error('Missing authored QA export ' + requested);
    return requested;
  }
  if (names.includes('default')) return 'default';
  const components = names.filter((name) => /^[A-Z]/.test(name));
  if (components.length !== 1) throw Error('Ambiguous authored QA exports: ' + names.join(', '));
  return components[0];
}
export function nativeQAApp(catalog, sourceFor) {
  const template = readFileSync(path.join(root, 'tests/native-ui/device/App.template.tsx'), 'utf8');
  const recipes = catalog.recipes.filter((recipe) => recipe.kind !== 'support');
  const imports = [],
    stories = [];
  for (const [index, recipe] of recipes.entries()) {
    if (!/^[a-z0-9-]+$/.test(recipe.style) || !/^[a-z0-9-]+$/.test(recipe.name))
      throw Error('Unsafe QA recipe path.');
    const module =
      './.generated/src/' +
      (recipe.kind === 'block' ? 'recipes' : 'examples') +
      '/' +
      recipe.style +
      '/' +
      recipe.name;
    imports.push(`import * as Story${index} from '${module}';`);
    const exported = nativeQAExport(sourceFor(recipe, module), recipe.export);
    stories.push(
      `{id:${JSON.stringify(recipe.style + '/' + recipe.name)},authored:true,Component:Story${index}.${exported}}`,
    );
  }
  return template
    .replace('/* REGISTRY_IMPORTS */', imports.join('\n'))
    .replace(
      '/* REGISTRY_STORIES */',
      'const stories=[' +
        [
          ...stories,
          '{id: "native/button-preset-matrix",Component:NativeButtonPresetMatrix}',
          '{id: "native/navigation-contract",Component:NativeNavigationMatrix}',
          '{id: "native/render-hosts",Component:NativeRenderHostMatrix}',
          '{id: "native/layout-primitives",Component:NativeLayoutMatrix}',
          '{id: "native/card-metrics",Component:NativeCardMatrix}',
          '{id: "native/button-callbacks",Component:NativeButtonCallbackMatrix}',
          '{id: "native/spinner-paint",Component:NativeSpinnerMatrix}',
          '{id: "native/input-metrics",Component:NativeInputMatrix}',
          '{id: "native/file-input",Component:NativeFileMatrix}',
          '{id: "native/temporal-input",Component:NativeTemporalMatrix}',
          '{id: "native/runtime-sweep",Component:NativeRuntimeSweep}',
          '{id: "native/example-layout",Component:NativeExampleLayoutMatrix}',
          '{id: "native/chart-contract",Component:NativeChartMatrix}',
          '{id: "native/input-group-contract",Component:NativeInputGroupMatrix}',
          '{id: "native/select-contract",Component:NativeSelectMatrix}',
          '{id: "native/native-select-contract",Component:NativeSelectControlMatrix}',
          '{id: "native/progress-contract",Component:NativeProgressMatrix}',
        ].join(',\n') +
        '];',
    );
}

export function validateNativeQADirectory(qa, directoryRoot = root) {
  if (lstatSync(qa, { throwIfNoEntry: false })?.isSymbolicLink())
    throw Error('Refusing a symlinked QA application.');
  for (const name of [
    'QA-OWNER.json',
    'QA-SOURCE.json',
    'package.json',
    'tsconfig.json',
    'App.tsx',
    'app.json',
    '.generated',
    'babel.config.cjs',
    'metro.config.cjs',
    'index.js',
  ])
    if (lstatSync(path.join(qa, name), { throwIfNoEntry: false })?.isSymbolicLink())
      throw Error('Refusing a symlinked QA output: ' + name);
  if (existsSync(qa) && readdirSync(qa).length > 0) {
    const marker = path.join(qa, 'QA-OWNER.json');
    const owner = existsSync(marker) ? JSON.parse(readFileSync(marker, 'utf8')) : undefined;
    if (
      owner?.root !== directoryRoot ||
      owner.kind !== 'native-registry-qa' ||
      owner.schemaVersion !== 1
    )
      throw Error('Refusing to overwrite an unrelated QA application.');
  }
}
/** Bind instrumentation to the private copied catalog, never a hardcoded story total. */
export function nativeQAStoryCountSource(source, catalog) {
  const marker = '= 0 // ANHEDRAL_AUTHORED_STORY_COUNT';
  if (source.split(marker).length !== 2) throw Error('Native story count marker requires review.');
  const authored = catalog.recipes.filter((recipe) => recipe.kind !== 'support');
  const count = authored.length;
  const identities = authored.map((recipe) => recipe.style + '/' + recipe.name);
  if (new Set(identities).size !== count) throw Error('Duplicate native authored story identity.');
  if (!Number.isSafeInteger(count) || count <= 0)
    throw Error('Native runtime sweep requires authored stories.');
  return source.replace(marker, '= ' + count + ' // ANHEDRAL_AUTHORED_STORY_COUNT');
}
export function nativeQASourceManifest(qa) {
  const files = {};
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const absolute = path.join(directory, entry.name);
      if (entry.isSymbolicLink()) throw Error('Refusing a symlinked native QA source.');
      if (entry.isDirectory()) visit(absolute);
      else if (entry.isFile())
        files[path.relative(qa, absolute).split(path.sep).join('/')] = createHash('sha256')
          .update(readFileSync(absolute))
          .digest('hex');
    }
  };
  visit(path.join(qa, '.generated'));
  for (const name of ['App.tsx', 'app.json', 'package.json'])
    files[name] = createHash('sha256')
      .update(readFileSync(path.join(qa, name)))
      .digest('hex');
  return { schemaVersion: 1, files };
}
export async function prepareNativeQAApp(qa) {
  validateNativeQADirectory(qa);
  const harness = path.join(root, 'tests/native-ui'),
    require = createRequire(path.join(harness, 'package.json'));
  const run = (command, args, cwd = qa) => {
    const result = spawnSync(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(command + ' exited ' + result.status);
    return result;
  };
  await import('../tests/native-ui/prepare.mjs');
  mkdirSync(qa, { recursive: true });
  writeFileSync(
    path.join(qa, 'QA-OWNER.json'),
    JSON.stringify({ root, kind: 'native-registry-qa', schemaVersion: 1 }),
  );
  cpSync(path.join(harness, '.generated'), path.join(qa, '.generated'), { recursive: true });
  for (const name of ['babel.config.cjs', 'metro.config.cjs', 'index.js'])
    cpSync(path.join(harness, name), path.join(qa, name));
  if (!existsSync(path.join(qa, 'node_modules')))
    symlinkSync(path.join(harness, 'node_modules'), path.join(qa, 'node_modules'), 'dir');
  const packageJson = JSON.parse(readFileSync(path.join(harness, 'package.json'), 'utf8'));
  packageJson.name = 'anhedral-native-registry-qa';
  writeFileSync(path.join(qa, 'package.json'), JSON.stringify(packageJson, null, 2));
  const config = JSON.parse(readFileSync(path.join(harness, 'tsconfig.json'), 'utf8'));
  config.compilerOptions.types = ['react'];
  config.include = ['App.tsx', '.generated/**/*.ts', '.generated/**/*.tsx'];
  writeFileSync(path.join(qa, 'tsconfig.json'), JSON.stringify(config, null, 2));
  const catalog = JSON.parse(readFileSync(path.join(qa, '.generated/NATIVE_RECIPES.json'), 'utf8'));
  writeFileSync(
    path.join(qa, 'App.tsx'),
    nativeQAApp(catalog, (_recipe, module) => readFileSync(path.join(qa, module + '.tsx'), 'utf8')),
  );
  writeFileSync(
    path.join(qa, 'app.json'),
    JSON.stringify(
      {
        expo: {
          name: 'AnhedralRegistryQA',
          slug: 'anhedral-registry-qa',
          scheme: 'anhedral-registry-qa',
          version: '1.0.0',
          ios: {
            bundleIdentifier: 'dev.anhedral.registryqa',
            infoPlist: { UIFileSharingEnabled: true, LSSupportsOpeningDocumentsInPlace: true },
          },
          android: { package: 'dev.anhedral.registryqa' },
        },
      },
      null,
      2,
    ),
  );
  run(process.execPath, [
    require.resolve('typescript/bin/tsc'),
    '--noEmit',
    '--project',
    path.join(qa, 'tsconfig.json'),
  ]);
  writeFileSync(
    path.join(qa, 'QA-SOURCE.json'),
    JSON.stringify(nativeQASourceManifest(qa), null, 2) + '\n',
  );
  console.log(
    'Prepared and typechecked ' +
      catalog.recipes.filter((r) => r.kind !== 'support').length +
      ' authored native QA stories plus native interaction fixtures at ' +
      qa,
  );
  return { qa, harness, catalog, require, run };
}
