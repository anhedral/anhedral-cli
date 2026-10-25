import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { loadOfficialRegistry, reviewedInputs } from './shadcn-registry.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function portChartRecipe(source, filename) {
  // The source's month selector controls a custom shape. Expose the same controlled
  // value to native accessibility actions so touch and assistive selection stay in sync.
  if (filename.endsWith('chart-pie-interactive.tsx'))
    source = source.replace(
      '<PieChart>',
      '<PieChart value={activeIndex} onValueChange={(index) => setActiveMonth(desktopData[index].month)}>',
    );
  // Explicit boundary conversions retain the upstream values while satisfying native scalar APIs.
  source = source
    .replace(/payload\?\.\[0\]\.dataKey/g, 'payload?.[0]?.dataKey')
    .replace(/value\.slice\(/g, 'String(value).slice(')
    .replace(/new Date\((value|label)\)/g, 'new Date(String($1))')
    .replace(/((?:props\.)?payload\.fill)/g, 'String($1)')
    .replace(/key=\{payload\.(month|browser)\}/g, 'key={String(payload.$1)}')
    .replace(/\{payload\.visitors\}/g, '{String(payload.visitors)}')
    .replace(
      /(desktopData|mobileData|chartData|radialChartData)\[(activeIndex|index|0)\]/g,
      '$1[$2]!',
    )
    .replace(
      /item\.payload\.running \+ item\.payload\.swimming/g,
      'Number(item.payload?.running ?? 0) + Number(item.payload?.swimming ?? 0)',
    )
    .replace(/\(value: keyof typeof chartConfig\)/g, '(value: unknown)')
    .replace(/chartConfig\[value\]/g, 'chartConfig[String(value) as keyof typeof chartConfig]');
  const f = ts.factory,
    file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = [],
    imports = [],
    hostNames = new Set();
  const hosts = {
    div: 'RegistryView',
    span: 'RegistryText',
    button: 'RegistryButton',
    defs: 'Defs',
    linearGradient: 'LinearGradient',
    stop: 'Stop',
    text: 'ChartText',
    tspan: 'TSpan',
    g: 'G',
    svg: 'Svg',
    path: 'Path',
    clipPath: 'ClipPath',
  };
  const transformer = (context) => {
    const visit = (node) => {
      if (
        (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
        ts.isIdentifier(node.tagName) &&
        /^[a-z]/.test(node.tagName.text) &&
        !hosts[node.tagName.text]
      )
        throw Error('Unreviewed browser host in native chart: ' + node.tagName.text);
      if (ts.isImportDeclaration(node)) {
        const module = node.moduleSpecifier.text;
        if (module === 'react') return node;
        if (module === 'cn' || module === '@/lib/utils') {
          const bindings = node.importClause?.namedBindings;
          if (
            !bindings ||
            !ts.isNamedImports(bindings) ||
            bindings.elements.length !== 1 ||
            (bindings.elements[0].propertyName ?? bindings.elements[0].name).text !== 'cn'
          )
            throw Error('Only reviewed recipe class composition may use the browser utils import.');
          return f.createImportDeclaration(
            undefined,
            f.createImportClause(
              false,
              undefined,
              f.createNamedImports([
                f.createImportSpecifier(
                  false,
                  f.createIdentifier('registryClassNames'),
                  bindings.elements[0].name,
                ),
              ]),
            ),
            f.createStringLiteral('../../native/registry-styles'),
            undefined,
          );
        }
        let target;
        if (module === 'recharts' || module.startsWith('recharts/')) target = '../../native/charts';
        else if (module === 'lucide-react') target = 'lucide-react-native';
        else if (
          /^@\/registry\/(?:default|new-york|new-york-v4|bases\/(?:base|radix|aria))\/ui\//.test(
            module,
          )
        )
          target = '../../native/' + module.split('/').pop();
        else if (
          /^@\/registry\/bases\/(base|radix|aria)\/components\/example$/.test(module) ||
          module === '@/app/(create)/components/icon-placeholder'
        )
          target = '../../native/registry-example';
        else if (module === '@/app/(create)/lib/search-params')
          return f.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            f.createStringLiteral('../../native/registry-example'),
            undefined,
          );
        else throw Error(`Unreviewed chart import ${module} in ${filename}`);
        if (
          !node.importClause?.namedBindings ||
          !ts.isNamedImports(node.importClause.namedBindings)
        )
          throw Error('Chart imports must be named.');
        const elements = node.importClause.namedBindings.elements
          .filter((e) => e.name.text !== 'ChartStyle')
          .map((e) => {
            if (
              node.importClause.isTypeOnly ||
              e.isTypeOnly ||
              module.startsWith('recharts/types/') ||
              e.name.text === 'ChartConfig'
            )
              return f.updateImportSpecifier(e, true, e.propertyName, e.name);
            const alias = f.createIdentifier('Native' + e.name.text);
            declarations.push(
              f.createVariableStatement(
                undefined,
                f.createVariableDeclarationList(
                  [
                    f.createVariableDeclaration(
                      e.name,
                      undefined,
                      undefined,
                      f.createCallExpression(f.createIdentifier('withRegistryStyles'), undefined, [
                        alias,
                        f.createStringLiteral(
                          e.name.text === 'CardTitle' || e.name.text === 'CardDescription'
                            ? 'text'
                            : module === 'lucide-react'
                              ? 'svg'
                              : module.startsWith('recharts')
                                ? 'svg'
                                : 'view',
                        ),
                      ]),
                    ),
                  ],
                  ts.NodeFlags.Const,
                ),
              ),
            );
            return f.updateImportSpecifier(e, false, e.propertyName ?? e.name, alias);
          });
        if (!elements.length) return undefined;
        return f.updateImportDeclaration(
          node,
          node.modifiers,
          f.updateImportClause(node.importClause, false, undefined, f.createNamedImports(elements)),
          f.createStringLiteral(target),
          undefined,
        );
      }
      if (
        ts.isTypeReferenceNode(node) &&
        node.typeName.getText(file) === 'React.ComponentProps' &&
        node.typeArguments?.[0] &&
        ts.isLiteralTypeNode(node.typeArguments[0]) &&
        node.typeArguments[0].literal.getText(file).replace(/["']/g, '') === 'div'
      )
        return f.updateTypeReferenceNode(node, node.typeName, [
          f.createTypeQueryNode(f.createIdentifier('RegistryView')),
        ]);
      if (ts.isAsExpression(node) && node.type.getText(file) === 'React.CSSProperties')
        return ts.visitNode(node.expression, visit);
      if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(file) === 'ChartStyle')
        return f.createJsxExpression(undefined, f.createNull());
      if (ts.isJsxAttribute(node)) {
        const name = node.name.getText(file);
        // Upstream's stroke="0" is a browser shorthand for no separator, not a native color.
        if (
          name === 'stroke' &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          node.initializer.text === '0'
        )
          return f.updateJsxAttribute(node, node.name, f.createStringLiteral('none'));
        if (name === 'xmlns' || (name.startsWith('data-') && name !== 'data-active'))
          return undefined;
        if (
          (name === 'cx' || name === 'cy') &&
          node.parent?.parent?.tagName?.getText(file) === 'text'
        )
          return undefined;
        if (name === 'onClick' || name === 'aria-label' || name === 'dominantBaseline')
          return f.updateJsxAttribute(
            node,
            f.createIdentifier(
              name === 'onClick'
                ? 'onPress'
                : name === 'dominantBaseline'
                  ? 'alignmentBaseline'
                  : 'accessibilityLabel',
            ),
            ts.visitNode(node.initializer, visit),
          );
      }
      if (
        (ts.isJsxOpeningElement(node) ||
          ts.isJsxSelfClosingElement(node) ||
          ts.isJsxClosingElement(node)) &&
        ts.isIdentifier(node.tagName) &&
        hosts[node.tagName.text]
      ) {
        const original = node.tagName.text,
          name = hosts[original];
        hostNames.add(name);
        const tag = f.createIdentifier(name);
        if (ts.isJsxClosingElement(node)) return f.updateJsxClosingElement(node, tag);
        const attrs = ts.visitNode(node.attributes, visit);
        return ts.isJsxOpeningElement(node)
          ? f.updateJsxOpeningElement(node, tag, node.typeArguments, attrs)
          : f.updateJsxSelfClosingElement(node, tag, node.typeArguments, attrs);
      }
      return ts.visitEachChild(node, visit, context);
    };
    return (node) => ts.visitNode(node, visit);
  };
  const transformed = ts.transform(file, [transformer]).transformed[0];
  const statements = transformed.statements.filter(
    (s) =>
      !ts.isExpressionStatement(s) ||
      !ts.isStringLiteral(s.expression) ||
      s.expression.text !== 'use client',
  );
  const makeImport = (name, target) =>
    f.createImportDeclaration(
      undefined,
      f.createImportClause(
        false,
        undefined,
        f.createNamedImports([f.createImportSpecifier(false, undefined, f.createIdentifier(name))]),
      ),
      f.createStringLiteral(target),
      undefined,
    );
  imports.push(makeImport('withRegistryStyles', '../../native/registry-styles'));
  for (const name of hostNames) {
    const target = name.startsWith('Registry')
      ? '../../native/registry-styles'
      : ['G', 'Svg', 'Path', 'ClipPath'].includes(name)
        ? 'react-native-svg'
        : '../../native/charts';
    if (name.startsWith('Registry')) imports.push(makeImport(name, target));
    else {
      imports.push(
        f.createImportDeclaration(
          undefined,
          f.createImportClause(
            false,
            undefined,
            f.createNamedImports([
              f.createImportSpecifier(
                false,
                f.createIdentifier(name),
                f.createIdentifier('NativeHost' + name),
              ),
            ]),
          ),
          f.createStringLiteral(target),
          undefined,
        ),
      );
      declarations.push(
        f.createVariableStatement(
          undefined,
          f.createVariableDeclarationList(
            [
              f.createVariableDeclaration(
                name,
                undefined,
                undefined,
                f.createCallExpression(f.createIdentifier('withRegistryStyles'), undefined, [
                  f.createIdentifier('NativeHost' + name),
                  f.createStringLiteral(name === 'Svg' ? 'svg-root' : 'svg'),
                ]),
              ),
            ],
            ts.NodeFlags.Const,
          ),
        ),
      );
    }
  }
  const output = f.updateSourceFile(transformed, [
    ...imports,
    ...statements.filter(ts.isImportDeclaration),
    ...declarations,
    ...statements.filter((s) => !ts.isImportDeclaration(s)),
  ]);
  return (
    '// Adapted from shadcn/ui (MIT). Source and input hash are retained in NATIVE_RECIPES.json.\n' +
    ts.createPrinter().printFile(output)
  );
}
export function loadNativeChartRecipes() {
  return JSON.parse(
    gunzipSync(readFileSync(path.join(root, 'assets/ui/native-chart-recipes.json.gz'))),
  );
}
export function validateNativeChartRecipes(inventory, catalog) {
  if (catalog.schemaVersion !== 1 || catalog.upstream.commit !== inventory.source.commit)
    throw Error('Native chart source pin requires review.');
  const seen = new Set();
  for (const recipe of catalog.recipes) {
    if (seen.has(recipe.origin)) throw Error('Duplicate native chart origin: ' + recipe.origin);
    seen.add(recipe.origin);
    if (inventory.sources[recipe.origin]?.sha256 !== recipe.upstreamSha256)
      throw Error('Stale native chart source: ' + recipe.origin);
    if (hash(recipe.source) !== recipe.nativeSha256)
      throw Error('Changed native chart output: ' + recipe.origin);
    const key = `registry:${recipe.kind === 'block' ? 'block' : 'example'}/${recipe.name}`;
    if (JSON.stringify(recipe.reviewedInputs) !== JSON.stringify(reviewedInputs(inventory, key)))
      throw Error('Stale native chart style/dependency evidence: ' + recipe.origin);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--check')) {
  validateNativeChartRecipes(loadOfficialRegistry(), loadNativeChartRecipes());
  console.log('Native chart source, style and transitive dependency evidence passed.');
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const upstream = process.argv[process.argv.indexOf('--source') + 1];
  if (!process.argv.includes('--source'))
    throw Error('Pass --source /absolute/path/to/clean/pinned/shadcn-ui');
  const inventory = loadOfficialRegistry(),
    recipes = [];
  for (const [origin, entry] of Object.entries(inventory.sources)) {
    const block = /\/charts\/chart-[^/]+\.tsx$/.test(origin);
    const example =
      /\/examples\/chart-(?:bar-demo(?:-grid|-axis|-tooltip|-legend)?|tooltip-demo|example)\.tsx$/.test(
        origin,
      );
    if (!block && !example) continue;
    const [file, embedded] = origin.split('#');
    let source;
    if (embedded) {
      const item = JSON.parse(readFileSync(path.join(upstream, file), 'utf8'));
      source = item.files.find(
        (f) => f.path === embedded || embedded.endsWith('/' + f.path),
      )?.content;
    } else source = readFileSync(path.join(upstream, file), 'utf8');
    if (typeof source !== 'string' || hash(source) !== entry.sha256)
      throw Error('Source drift: ' + origin);
    const match = origin.match(/(?:registry\/|styles\/)(default|new-york-v4|new-york)\//),
      style = match?.[1] ?? origin.match(/registry\/bases\/(base|radix|aria)\//)?.[1];
    if (!style) throw Error('Unknown chart style ' + origin);
    const name = path.basename(origin, '.tsx');
    const native = portChartRecipe(source, origin);
    recipes.push({
      kind: block ? 'block' : 'example',
      style,
      name,
      origin,
      upstreamSha256: entry.sha256,
      reviewedInputs: reviewedInputs(inventory, `registry:${block ? 'block' : 'example'}/${name}`),
      nativeSha256: hash(native),
      source: native,
    });
  }
  if (recipes.length !== 231 || recipes.filter((r) => r.kind === 'block').length !== 210)
    throw Error('Expected 210 chart blocks and 21 chart examples; got ' + recipes.length);
  const manifest = { schemaVersion: 1, upstream: inventory.source, recipes };
  writeFileSync(
    path.join(root, 'assets/ui/native-chart-recipes.json.gz'),
    gzipSync(JSON.stringify(manifest), { level: 9 }),
  );
  console.log(
    'Generated',
    recipes.length,
    'native chart recipes with retained data, callbacks and source hashes.',
  );
}
