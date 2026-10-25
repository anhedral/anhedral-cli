import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
  cpSync,
  symlinkSync,
  openSync,
  closeSync,
} from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
const root = fileURLToPath(new URL('../', import.meta.url));
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
      `{id:${JSON.stringify(recipe.style + '/' + recipe.name)},Component:Story${index}.${exported}}`,
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
        ].join(',\n') +
        '];',
    );
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const harness = path.join(root, 'tests/native-ui'),
    qa = path.join(root, '.artifacts/native-ui-ios/app'),
    require = createRequire(path.join(harness, 'package.json'));
  const run = (command, args, cwd = qa) => {
    const result = spawnSync(command, args, {
      cwd,
      stdio: 'inherit',
      env: { ...process.env, CI: '1', EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' },
    });
    if (result.error) throw result.error;
    if (result.status !== 0) throw Error(command + ' exited ' + result.status);
  };
  await import('../tests/native-ui/prepare.mjs');
  mkdirSync(qa, { recursive: true });
  const marker = path.join(qa, 'QA-OWNER.json');
  if (
    existsSync(path.join(qa, 'package.json')) &&
    (!existsSync(marker) || JSON.parse(readFileSync(marker)).root !== root)
  )
    throw Error('Refusing to overwrite an unrelated QA application.');
  writeFileSync(marker, JSON.stringify({ root, kind: 'native-registry-qa', schemaVersion: 1 }));
  cpSync(path.join(harness, '.generated'), path.join(qa, '.generated'), { recursive: true });
  for (const name of ['babel.config.cjs', 'metro.config.cjs', 'index.js'])
    cpSync(path.join(harness, name), path.join(qa, name));
  if (!existsSync(path.join(qa, 'node_modules')))
    symlinkSync(path.join(harness, 'node_modules'), path.join(qa, 'node_modules'), 'dir');
  const packageJson = JSON.parse(readFileSync(path.join(harness, 'package.json')));
  packageJson.name = 'anhedral-native-registry-qa';
  writeFileSync(path.join(qa, 'package.json'), JSON.stringify(packageJson, null, 2));
  const config = JSON.parse(readFileSync(path.join(harness, 'tsconfig.json')));
  config.compilerOptions.types = ['react'];
  config.include = ['App.tsx', '.generated/**/*.ts', '.generated/**/*.tsx'];
  writeFileSync(path.join(qa, 'tsconfig.json'), JSON.stringify(config, null, 2));
  const catalog = JSON.parse(readFileSync(path.join(qa, '.generated/NATIVE_RECIPES.json')));
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
          ios: { bundleIdentifier: 'dev.anhedral.registryqa' },
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
  console.log(
    'Prepared and typechecked ' +
      catalog.recipes.filter((r) => r.kind !== 'support').length +
      ' authored native QA stories plus native interaction fixtures at ' +
      qa,
  );
  if (process.argv.includes('--prepare-only')) process.exit(0);
  const deviceIndex = process.argv.indexOf('--device'),
    device = process.argv[deviceIndex + 1];
  if (deviceIndex < 0 || !device || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(device))
    throw Error(
      'Pass --device <dedicated simulator UUID>. Expo 57 requires a supported runtime; iOS 27 scene lifecycle remains unresolved.',
    );
  run(process.execPath, [
    require.resolve('expo/bin/cli'),
    'prebuild',
    '--no-install',
    '--platform',
    'ios',
    qa,
  ]);
  run('pod', ['install'], path.join(qa, 'ios'));
  const source = readFileSync(
    path.join(root, 'tests/native-ui/device/RegistryUITests.swift'),
    'utf8',
  );
  mkdirSync(path.join(qa, 'ios/RegistryUITests'), { recursive: true });
  writeFileSync(path.join(qa, 'ios/RegistryUITests/RegistryUITests.swift'), source);
  const ruby = `require 'xcodeproj'
p=ARGV[0];project=Xcodeproj::Project.open(p)
t=project.targets.find{|x|x.name=='RegistryUITests'}||project.new_target(:ui_test_bundle,'RegistryUITests',:ios,'16.4')
group=project.main_group.find_subpath('RegistryUITests',true)
file=group.files.find{|x|x.path=='RegistryUITests/RegistryUITests.swift'}||group.new_file('RegistryUITests/RegistryUITests.swift')
t.source_build_phase.add_file_reference(file) unless t.source_build_phase.files_references.include?(file)
app=project.targets.find{|x|x.name=='AnhedralRegistryQA'};t.add_dependency(app) unless t.dependencies.any?{|x|x.target==app}
t.build_configurations.each{|c|c.build_settings.merge!({'TEST_TARGET_NAME'=>'AnhedralRegistryQA','PRODUCT_NAME'=>'$(TARGET_NAME)','PRODUCT_MODULE_NAME'=>'RegistryUITests','PRODUCT_BUNDLE_IDENTIFIER'=>'dev.anhedral.registryqa.tests','GENERATE_INFOPLIST_FILE'=>'YES','SWIFT_VERSION'=>'5.0','CODE_SIGNING_ALLOWED'=>'NO','TARGETED_DEVICE_FAMILY'=>'1,2'})}
project.save
scheme=Xcodeproj::XCScheme.new(p+'/xcshareddata/xcschemes/AnhedralRegistryQA.xcscheme')
scheme.add_test_target(t) unless scheme.test_action.testables.any?{|x|x.buildable_references.any?{|r|r.xml_element.attributes['BlueprintIdentifier']==t.uuid}}
scheme.test_action.build_configuration='Release';scheme.save_as(p,'AnhedralRegistryQA',true)
`;
  run('ruby', ['-rxcodeproj', '-e', ruby, path.join(qa, 'ios/AnhedralRegistryQA.xcodeproj')]);
  const evidence = path.join(
    root,
    '.artifacts/native-ui-ios',
    new Date().toISOString().replace(/[:.]/g, '-'),
  );
  mkdirSync(evidence, { recursive: true });
  const log = openSync(path.join(evidence, 'xcode.log'), 'w');
  const result = spawnSync(
    'xcodebuild',
    [
      '-workspace',
      path.join(qa, 'ios/AnhedralRegistryQA.xcworkspace'),
      '-scheme',
      'AnhedralRegistryQA',
      '-configuration',
      'Release',
      '-sdk',
      'iphonesimulator',
      '-destination',
      'id=' + device,
      '-derivedDataPath',
      path.join(root, '.artifacts/native-ui-ios/derived'),
      '-resultBundlePath',
      path.join(evidence, 'results.xcresult'),
      'ONLY_ACTIVE_ARCH=YES',
      'CODE_SIGNING_ALLOWED=NO',
      'test',
    ],
    {
      cwd: qa,
      stdio: ['ignore', log, log],
      env: { ...process.env, EXPO_NO_TELEMETRY: '1', EXPO_NO_DOTENV: '1' },
    },
  );
  closeSync(log);
  console.log('Native XCTest evidence: ' + evidence);
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error('Native XCTest failed; inspect retained evidence.');
}
