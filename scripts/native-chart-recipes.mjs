import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  nativeRecipeBoundaries,
  recipeFunctionOwner,
  recipeRootExpression,
} from './native-recipe-boundaries.mjs';
import { nativeFieldAssociations, nativeLabelBindings } from './native-field-associations.mjs';
import { loadOfficialRegistry, reviewedInputs } from './shadcn-registry.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const hash = (value) => createHash('sha256').update(value).digest('hex');
export function portNativeRegistryRecipe(source, filename, { nativeForms = false } = {}) {
  // The source's month selector controls a custom shape. Expose the same controlled
  // value to native accessibility actions so touch and assistive selection stay in sync.
  if (filename.endsWith('chart-pie-interactive.tsx'))
    source = source.replace(
      '<PieChart>',
      '<PieChart value={activeIndex} onValueChange={(index) => setActiveMonth(desktopData[index].month)}>',
    );
  if (filename.endsWith('pagination-demo.tsx')) {
    source =
      'import * as React from "react";\n' +
      source
        .replace(
          'function PaginationDemo() {',
          'function PaginationDemo() { const [page,setPage] = React.useState(2);',
        )
        .replace(
          '<PaginationPrevious href="#" />',
          '<PaginationPrevious disabled={page === 1} onPress={() => setPage(Math.max(1,page-1))} />',
        )
        .replace(
          '<PaginationNext href="#" />',
          '<PaginationNext disabled={page === 3} onPress={() => setPage(Math.min(3,page+1))} />',
        )
        .replace(
          /<PaginationLink href="#"(?: isActive)?>(\s*[123]\s*)<\/PaginationLink>/g,
          (_, number) =>
            '<PaginationLink isActive={page === ' +
            number.trim() +
            '} onPress={() => setPage(' +
            number.trim() +
            ')}> ' +
            number.trim() +
            ' </PaginationLink>',
        );
  }
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
  if (filename.endsWith('spinner-custom.tsx'))
    source = source.replace(
      'React.ComponentProps<"svg">',
      'import("lucide-react-native").LucideProps & {className?:string}',
    );
  if (filename.endsWith('/select-example.tsx'))
    source = source.replace(/(fonts|plans)\[0\]\.(value|name)/g, '$1[0]!.$2');
  const ariaRecipe = filename.includes('/bases/aria/');
  const nativeActions = nativeForms && /form-next-/.test(filename);
  if (nativeActions) source = source.replace(/\bFormData\b/g, 'NativeFormValues');
  // A successful action can return the original empty default again. Native
  // controlled inputs reset from the new state object; refresh the count too.
  if (nativeActions && filename.endsWith('form-next-demo.tsx'))
    source = source.replace('[formState.values.description]', '[formState]');
  if (nativeForms && filename.includes('form-formisch-'))
    source = source.replace(/field\.onChange\(value\)/g, 'field.onChange(String(value))');
  if (nativeForms) source = source.replace(/\brequired_error:/g, 'error:');
  // Native submit actions have no browser default. Await the actual library action
  // so pending/error state belongs to the native form for its entire lifetime.
  if (nativeForms && /form-tanstack-[a-z-]+\.tsx$/.test(filename))
    source = source.replace(
      /onSubmit=\{\(e\) => \{\s*e\.preventDefault\(\)\s*form\.handleSubmit\(\)\s*\}\}/g,
      'onSubmit={async () => { await form.validate("blur"); await form.handleSubmit(); }}',
    );
  if (nativeForms && /form-(?:rhf|tanstack|formisch)-array\.tsx$/.test(filename))
    source = source.replace(
      /id=\{`(form-(?:rhf|tanstack|formisch)-array-email-\$\{index\})`\}/g,
      'id={`$1`} aria-label={`Email address ${index + 1}`}',
    );
  if (nativeForms && filename.endsWith('form-rhf-complex.tsx'))
    source = source.replace(
      /useForm<z\.infer<typeof formSchema>>/g,
      'useForm<z.input<typeof formSchema>, unknown, z.output<typeof formSchema>>',
    );
  // The reviewed amount label names an input whose upstream example omitted its ID.
  if (filename.endsWith('/button-group-example.tsx'))
    source = source.replace(
      '<Input placeholder="Enter amount to send" />',
      '<Input id="amount" placeholder="Enter amount to send" />',
    );
  const f = ts.factory,
    file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const linkNames = new Set([
    'a',
    ...file.statements
      .filter(
        (node) =>
          ts.isImportDeclaration(node) &&
          node.moduleSpecifier.text === 'next/link' &&
          node.importClause?.name,
      )
      .map((node) => node.importClause.name.text),
  ]);
  const buttonLink = (node) => {
    const open = ts.isJsxClosingElement(node) ? node.parent.openingElement : node;
    return (
      linkNames.has(open.tagName?.getText(file)) &&
      open.attributes?.properties.some(
        (attr) =>
          ts.isJsxAttribute(attr) &&
          attr.name.getText(file) === 'className' &&
          attr.initializer &&
          ts.isJsxExpression(attr.initializer) &&
          attr.initializer.expression &&
          ts.isCallExpression(attr.initializer.expression) &&
          attr.initializer.expression.expression.getText(file) === 'buttonVariants',
      )
    );
  };
  const boundary = nativeRecipeBoundaries(file, filename);
  const fieldLabels = nativeLabelBindings(file);
  const fieldRanges = nativeForms ? nativeFieldAssociations(file) : new Map(),
    fieldAlias = f.createUniqueName('NativeRegistryFieldScope');
  const declarations = [],
    imports = [],
    hostNames = new Set();
  const hosts = {
    div: 'RegistryView',
    dl: 'RegistryDescriptionList',
    ol: 'RegistryOrderedList',
    ul: 'RegistryUnorderedList',
    li: 'RegistryListItem',
    dt: 'RegistryDescriptionTerm',
    dd: 'RegistryDescriptionDetails',
    span: 'RegistryText',
    samp: 'RegistrySample',
    p: 'RegistryText',
    h1: 'RegistryH1',
    h2: 'RegistryH2',
    h3: 'RegistryH3',
    h4: 'RegistryH4',
    strong: 'RegistryStrong',
    small: 'RegistrySmall',
    blockquote: 'RegistryText',
    figure: 'RegistryView',
    figcaption: 'RegistryText',
    img: 'RegistryImage',
    a: 'RegistryLink',
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
    ...(nativeForms ? { form: 'NativeForm', pre: 'RegistryPre', code: 'RegistryCode' } : {}),
  };
  const wrapRecipeRoot = (input) => {
    let expression =
      ts.isJsxElement(input) || ts.isJsxSelfClosingElement(input) || ts.isJsxFragment(input)
        ? input
        : f.createJsxExpression(undefined, input);
    if (nativeForms)
      expression = f.createJsxElement(
        f.createJsxOpeningElement(
          f.createIdentifier('NativeFormScope'),
          undefined,
          f.createJsxAttributes([]),
        ),
        [expression],
        f.createJsxClosingElement(f.createIdentifier('NativeFormScope')),
      );
    return f.createJsxElement(
      f.createJsxOpeningElement(
        f.createIdentifier('NativeRegistryPalette'),
        undefined,
        f.createJsxAttributes([
          f.createJsxAttribute(
            f.createIdentifier('generation'),
            f.createStringLiteral(
              /registry\/(?:default|new-york)\//.test(filename) ? 'legacy' : 'modern',
            ),
          ),
          ...(boundary.source
            ? [
                f.createJsxAttribute(
                  f.createIdentifier('source'),
                  f.createStringLiteral(boundary.source),
                ),
              ]
            : []),
        ]),
      ),
      [expression],
      f.createJsxClosingElement(f.createIdentifier('NativeRegistryPalette')),
    );
  };
  const transformer = (context) => {
    const visit = (node) => {
      const associations = fieldRanges.get(node);
      if (associations) {
        const updated = ts.visitEachChild(node, visit, context),
          children = [];
        let position = 0;
        for (const range of associations) {
          children.push(...updated.children.slice(position, range.start));
          children.push(
            f.createJsxElement(
              f.createJsxOpeningElement(
                fieldAlias,
                undefined,
                f.createJsxAttributes([
                  f.createJsxAttribute(f.createIdentifier('id'), ts.visitNode(range.value, visit)),
                  f.createJsxAttribute(
                    f.createIdentifier('invalid'),
                    f.createJsxExpression(undefined, f.createFalse()),
                  ),
                ]),
              ),
              updated.children.slice(range.start, range.end + 1),
              f.createJsxClosingElement(fieldAlias),
            ),
          );
          position = range.end + 1;
        }
        children.push(...updated.children.slice(position));
        return ts.isJsxElement(updated)
          ? f.updateJsxElement(updated, updated.openingElement, children, updated.closingElement)
          : f.updateJsxFragment(
              updated,
              updated.openingFragment,
              children,
              updated.closingFragment,
            );
      }

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
        if (module === 'next/image' || module === 'next/link') {
          if (!node.importClause?.name || node.importClause.namedBindings)
            throw Error('Only the reviewed default Next media/navigation import is supported.');
          return f.createImportDeclaration(
            undefined,
            f.createImportClause(
              false,
              undefined,
              f.createNamedImports([
                f.createImportSpecifier(
                  false,
                  f.createIdentifier(module === 'next/link' ? 'RegistryLink' : 'RegistryImage'),
                  node.importClause.name,
                ),
              ]),
            ),
            f.createStringLiteral('../../native/registry-styles'),
            undefined,
          );
        }
        if (nativeActions && /^\.\/form-next-/.test(module)) return node;
        if (nativeActions && module === 'next/form')
          return f.createImportDeclaration(
            undefined,
            f.createImportClause(
              false,
              undefined,
              f.createNamedImports([
                f.createImportSpecifier(
                  false,
                  f.createIdentifier('NativeActionForm'),
                  f.createIdentifier('Form'),
                ),
              ]),
            ),
            f.createStringLiteral('../../native/registry-action-form'),
            undefined,
          );
        if (
          nativeForms &&
          [
            'react-hook-form',
            '@hookform/resolvers/zod',
            '@tanstack/react-form',
            'valibot',
            'zod',
          ].includes(module)
        )
          return node;
        if (nativeForms && module === '@formisch/react')
          return f.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            f.createStringLiteral('../../native/registry-formisch'),
            undefined,
          );
        if (nativeForms && module === 'sonner')
          return f.updateImportDeclaration(
            node,
            node.modifiers,
            node.importClause,
            f.createStringLiteral('../../native/sonner'),
            undefined,
          );
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
        if (module === 'react-resizable-panels') target = '../../native/resizable';
        else if (
          ariaRecipe &&
          /\/ui\/(alert-dialog|dialog|dropdown-menu|popover|tooltip)$/.test(module)
        )
          target = '../../native/registry-aria-overlay';
        else if (/\/bases\/(base|aria)\/ui\/slider$/.test(module))
          target = '../../native/registry-slider';
        else if (nativeActions && /\/ui\/(radio-group|select|checkbox|switch)$/.test(module))
          target = '../../native/registry-action-form';
        else if (nativeForms && /\/ui\/(input|textarea|input-group)$/.test(module))
          target = '../../native/registry-form-controls';
        else if (module === 'recharts' || module.startsWith('recharts/'))
          target = '../../native/charts';
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
          .filter((e) => {
            if (module === 'lucide-react' && (e.propertyName ?? e.name).text === 'LucideIcon') {
              imports.push(
                f.createImportDeclaration(
                  undefined,
                  f.createImportClause(
                    false,
                    undefined,
                    f.createNamedImports([
                      f.createImportSpecifier(true, f.createIdentifier('RegistryIcon'), e.name),
                    ]),
                  ),
                  f.createStringLiteral('../../native/registry-styles'),
                  undefined,
                ),
              );
              return false;
            }
            return !['ChartStyle', 'buttonVariants'].includes(e.name.text);
          })
          .map((e) => {
            if (
              node.importClause.isTypeOnly ||
              e.isTypeOnly ||
              module.startsWith('recharts/types/') ||
              e.name.text === 'ChartConfig' ||
              (module === 'lucide-react' &&
                ['LucideIcon', 'LucideProps', 'IconNode'].includes((e.propertyName ?? e.name).text))
            )
              return f.updateImportSpecifier(e, true, e.propertyName, e.name);
            if (/^[a-z]/.test(e.name.text)) return e;
            const alias = f.createUniqueName('Native' + e.name.text);
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
                            : /^(Button|Toggle|ToggleGroupItem|RadioGroupItem)$|Trigger$|Menu(?:Item|CheckboxItem|RadioItem)$/.test(
                                  e.name.text,
                                )
                              ? 'button'
                              : module === 'lucide-react'
                                ? 'icon'
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
            return f.updateImportSpecifier(
              e,
              false,
              ariaRecipe && /\/ui\/slider$/.test(module) && e.name.text === 'Slider'
                ? f.createIdentifier('AriaSlider')
                : (e.propertyName ?? e.name),
              alias,
            );
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
        ts.isReturnStatement(node) &&
        node.expression &&
        boundary.functions.has(recipeFunctionOwner(node)) &&
        recipeRootExpression(node.expression)
      )
        return f.updateReturnStatement(node, wrapRecipeRoot(ts.visitNode(node.expression, visit)));
      if (
        ts.isArrowFunction(node) &&
        boundary.functions.has(node) &&
        recipeRootExpression(node.body)
      ) {
        const updated = ts.visitEachChild(node, visit, context);
        return f.updateArrowFunction(
          updated,
          updated.modifiers,
          updated.typeParameters,
          updated.parameters,
          updated.type,
          updated.equalsGreaterThanToken,
          wrapRecipeRoot(updated.body),
        );
      }
      if (
        nativeForms &&
        ts.isPropertyAssignment(node) &&
        ts.isObjectLiteralExpression(node.parent) &&
        ts.isCallExpression(node.parent.parent) &&
        /^toast(?:\.|$)/.test(node.parent.parent.expression.getText(file))
      ) {
        const name = node.name.getText(file).replace(/["']/g, '');
        if (name === 'classNames') {
          if (!/content:\s*["']flex flex-col gap-2["']/.test(node.initializer.getText(file)))
            throw Error('Unreviewed native form toast classes.');
          return f.createPropertyAssignment('contentGap', f.createNumericLiteral(8));
        }
        if (name === 'style') {
          if (!/calc\(var\(--radius\)\s*\+\s*4px\)/.test(node.initializer.getText(file)))
            throw Error('Unreviewed native form toast style.');
          return f.createPropertyAssignment('radiusOffset', f.createNumericLiteral(4));
        }
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
      if (nativeActions && ts.isJsxOpeningElement(node) && node.tagName.getText(file) === 'Form')
        return f.updateJsxOpeningElement(
          node,
          node.tagName,
          node.typeArguments,
          f.createJsxAttributes([
            f.createJsxAttribute(
              f.createIdentifier('pending'),
              f.createJsxExpression(undefined, f.createIdentifier('pending')),
            ),
            ...ts.visitNode(node.attributes, visit).properties,
            f.createJsxAttribute(
              f.createIdentifier('values'),
              f.createJsxExpression(
                undefined,
                f.createPropertyAccessExpression(f.createIdentifier('formState'), 'values'),
              ),
            ),
          ]),
        );
      if (nativeForms && ts.isPropertyAssignment(node) && node.name.getText(file) === 'onClick')
        return f.updatePropertyAssignment(
          node,
          f.createIdentifier('onPress'),
          ts.visitNode(node.initializer, visit),
        );
      if (nativeForms && ts.isMethodDeclaration(node) && node.name.getText(file) === 'onClick')
        return f.updateMethodDeclaration(
          node,
          node.modifiers,
          node.asteriskToken,
          f.createIdentifier('onPress'),
          node.questionToken,
          node.typeParameters,
          node.parameters,
          node.type,
          ts.visitNode(node.body, visit),
        );
      if (ts.isJsxAttribute(node)) {
        const name = node.name.getText(file),
          tag = node.parent.parent.tagName?.getText(file);
        if (
          nativeForms &&
          node.initializer &&
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isArrowFunction(node.initializer.expression)
        ) {
          const arrow = node.initializer.expression,
            param = arrow.parameters[0];
          let type;
          if (
            tag === 'Slider' &&
            ['onValueChange', 'onValueCommit'].includes(name) &&
            param &&
            !param.type
          )
            type = f.createUnionTypeNode([
              f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
              f.createTypeOperatorNode(
                ts.SyntaxKind.ReadonlyKeyword,
                f.createArrayTypeNode(f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword)),
              ),
            ]);
          if (
            tag === 'ToggleGroup' &&
            ['onValueChange', 'onSelectionChange'].includes(name) &&
            param &&
            !param.type
          ) {
            const attrs = node.parent.properties;
            const arrayValue = attrs.some(
              (attr) =>
                ts.isJsxAttribute(attr) &&
                (['selectedKeys', 'defaultSelectedKeys'].includes(attr.name.getText(file)) ||
                  (['value', 'defaultValue'].includes(attr.name.getText(file)) &&
                    attr.initializer &&
                    ts.isJsxExpression(attr.initializer) &&
                    attr.initializer.expression &&
                    ts.isArrayLiteralExpression(attr.initializer.expression)) ||
                  (attr.name.getText(file) === 'type' &&
                    attr.initializer &&
                    ts.isStringLiteral(attr.initializer) &&
                    attr.initializer.text === 'multiple')),
            );
            type = arrayValue
              ? f.createArrayTypeNode(f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword))
              : f.createKeywordTypeNode(ts.SyntaxKind.StringKeyword);
          }
          if (tag === 'Select' && name === 'itemToStringValue' && param && !param.type) {
            const items = node.parent.properties.find(
              (attr) => ts.isJsxAttribute(attr) && attr.name.getText(file) === 'items',
            );
            if (
              items?.initializer &&
              ts.isJsxExpression(items.initializer) &&
              items.initializer.expression &&
              ts.isIdentifier(items.initializer.expression)
            )
              type = f.createIndexedAccessTypeNode(
                f.createTypeQueryNode(items.initializer.expression),
                f.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
              );
          }
          if (type) {
            const annotated = f.updateParameterDeclaration(
              param,
              param.modifiers,
              param.dotDotDotToken,
              param.name,
              param.questionToken,
              type,
              param.initializer,
            );
            const updated = f.updateArrowFunction(
              arrow,
              arrow.modifiers,
              arrow.typeParameters,
              [annotated, ...arrow.parameters.slice(1)],
              arrow.type,
              arrow.equalsGreaterThanToken,
              ts.visitNode(arrow.body, visit),
            );
            return f.updateJsxAttribute(
              node,
              name === 'onSelectionChange' ? f.createIdentifier('onValueChange') : node.name,
              f.updateJsxExpression(node.initializer, updated),
            );
          }
        }
        if (
          name === 'className' &&
          node.initializer &&
          ts.isJsxExpression(node.initializer) &&
          node.initializer.expression &&
          ts.isCallExpression(node.initializer.expression) &&
          node.initializer.expression.expression.getText(file) === 'buttonVariants'
        ) {
          const args = node.initializer.expression.arguments;
          if (args.length > 1 || (args.length === 1 && !ts.isObjectLiteralExpression(args[0])))
            throw Error('Unreviewed native button variant composition.');
          return f.createJsxSpreadAttribute(
            args.length ? ts.visitNode(args[0], visit) : f.createObjectLiteralExpression(),
          );
        }
        if (
          name === 'nativeButton' ||
          name === 'alignItemWithTrigger' ||
          (ariaRecipe && name === 'slot')
        )
          return undefined;
        if (ariaRecipe && name === 'isRowHeader')
          return f.createJsxAttribute(
            f.createIdentifier('accessibilityRole'),
            f.createStringLiteral('header'),
          );
        if (ariaRecipe && tag === 'Button' && name === 'isPending')
          return f.updateJsxAttribute(
            node,
            f.createIdentifier('pending'),
            ts.visitNode(node.initializer, visit),
          );
        const renamed =
          ariaRecipe &&
          tag === 'ToggleGroup' &&
          ['selectedKeys', 'defaultSelectedKeys'].includes(name)
            ? name === 'selectedKeys'
              ? 'value'
              : 'defaultValue'
            : ariaRecipe && tag === 'ToggleGroupItem' && name === 'id'
              ? 'value'
              : name === 'isDisabled'
                ? 'disabled'
                : name === 'isInvalid'
                  ? 'invalid'
                  : ['selectedKey', 'defaultSelectedKey'].includes(name)
                    ? name === 'selectedKey'
                      ? 'value'
                      : 'defaultValue'
                    : name === 'onSelectionChange'
                      ? 'onValueChange'
                      : name === 'isExpanded'
                        ? 'open'
                        : name === 'defaultExpanded'
                          ? 'defaultOpen'
                          : name === 'onExpandedChange'
                            ? 'onOpenChange'
                            : name === 'minValue'
                              ? 'min'
                              : name === 'maxValue'
                                ? 'max'
                                : name === 'defaultSelected'
                                  ? ['Toggle', 'ToggleGroupItem'].includes(tag)
                                    ? 'defaultPressed'
                                    : 'defaultChecked'
                                  : name === 'isSelected'
                                    ? ['Toggle', 'ToggleGroupItem'].includes(tag)
                                      ? 'pressed'
                                      : 'checked'
                                    : ariaRecipe &&
                                        name === 'onChange' &&
                                        ['Switch', 'Checkbox'].includes(tag)
                                      ? 'onCheckedChange'
                                      : ariaRecipe && name === 'onChange' && tag === 'Toggle'
                                        ? 'onPressedChange'
                                        : ariaRecipe && name === 'onChange' && tag === 'Slider'
                                          ? 'onValueChange'
                                          : ariaRecipe &&
                                              name === 'id' &&
                                              ['TabsTrigger', 'TabsContent', 'SelectItem'].includes(
                                                tag,
                                              )
                                            ? 'value'
                                            : undefined;
        if (renamed)
          return f.updateJsxAttribute(
            node,
            f.createIdentifier(renamed),
            ts.visitNode(node.initializer, visit),
          );
        if (
          nativeForms &&
          !nativeActions &&
          name === 'name' &&
          !node.parent.parent.tagName?.getText(file).includes('.') &&
          !['Input', 'Textarea', 'InputGroupInput', 'InputGroupTextarea', 'Controller'].includes(
            node.parent.parent.tagName?.getText(file),
          )
        )
          return undefined;
        if (nativeForms && name === 'htmlFor' && fieldLabels.has(tag))
          return f.updateJsxAttribute(
            node,
            f.createIdentifier('controlID'),
            ts.visitNode(node.initializer, visit),
          );
        if (nativeForms && ['htmlFor', 'aria-describedby', 'aria-errormessage'].includes(name))
          return undefined;
        if (nativeForms && name === 'data-disabled' && ['Field', 'FieldSet'].includes(tag))
          return f.updateJsxAttribute(
            node,
            f.createIdentifier('disabled'),
            node.initializer &&
              ts.isStringLiteral(node.initializer) &&
              ['true', 'false'].includes(node.initializer.text)
              ? f.createJsxExpression(
                  undefined,
                  node.initializer.text === 'true' ? f.createTrue() : f.createFalse(),
                )
              : ts.visitNode(node.initializer, visit),
          );
        if (nativeForms && ['id', 'aria-invalid', 'data-invalid'].includes(name))
          return f.updateJsxAttribute(
            node,
            f.createIdentifier(name === 'id' ? 'nativeID' : 'invalid'),
            name !== 'id' &&
              node.initializer &&
              ts.isStringLiteral(node.initializer) &&
              ['true', 'false'].includes(node.initializer.text)
              ? f.createJsxExpression(
                  undefined,
                  node.initializer.text === 'true' ? f.createTrue() : f.createFalse(),
                )
              : ts.visitNode(node.initializer, visit),
          );
        if (
          nativeForms &&
          name === 'defaultChecked' &&
          node.parent.parent.tagName?.getText(file) === 'FieldLabel'
        )
          return undefined;
        if (
          nativeForms &&
          name === 'modal' &&
          node.parent.parent.tagName?.getText(file) === 'DropdownMenu'
        )
          return undefined;
        if (
          nativeForms &&
          name === 'onChange' &&
          ['Input', 'Textarea', 'InputGroupInput', 'InputGroupTextarea'].includes(
            node.parent.parent.tagName?.getText(file),
          )
        ) {
          const convert = (child) =>
            ts.isPropertyAccessExpression(child) &&
            ['value', 'checked'].includes(child.name.text) &&
            ts.isPropertyAccessExpression(child.expression) &&
            ['target', 'currentTarget'].includes(child.expression.name.text)
              ? child.expression.expression
              : ts.visitEachChild(child, convert, context);
          return f.updateJsxAttribute(
            node,
            f.createIdentifier('onChangeText'),
            ts.visitNode(node.initializer, convert),
          );
        }

        // Upstream's stroke="0" is a browser shorthand for no separator, not a native color.
        if (
          name === 'stroke' &&
          node.initializer &&
          ts.isStringLiteral(node.initializer) &&
          node.initializer.text === '0'
        )
          return f.updateJsxAttribute(node, node.name, f.createStringLiteral('none'));
        if (name === 'data-icon')
          return f.updateJsxAttribute(
            node,
            f.createIdentifier('registryIcon'),
            ts.visitNode(node.initializer, visit),
          );
        if (name === 'title' && ['img', 'Image'].includes(tag)) return undefined;
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
        (hosts[node.tagName.text] || buttonLink(node))
      ) {
        const original = node.tagName.text,
          name = buttonLink(node) ? 'RegistryButtonLink' : hosts[original];
        hostNames.add(name);
        const tag = f.createIdentifier(name);
        if (ts.isJsxClosingElement(node)) return f.updateJsxClosingElement(node, tag);
        let attrs = ts.visitNode(node.attributes, visit);
        if (
          original === 'form' &&
          /form-(?:rhf|tanstack)-[a-z-]+\.tsx$/.test(filename) &&
          !attrs.properties.some(
            (attr) => ts.isJsxAttribute(attr) && attr.name.text === 'noValidate',
          )
        )
          attrs = f.updateJsxAttributes(attrs, [
            ...attrs.properties,
            f.createJsxAttribute(f.createIdentifier('noValidate'), undefined),
          ]);
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
      !['use client', 'use server'].includes(s.expression.text),
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
  if (fieldRanges.size)
    imports.push(
      f.createImportDeclaration(
        undefined,
        f.createImportClause(
          false,
          undefined,
          f.createNamedImports([
            f.createImportSpecifier(false, f.createIdentifier('NativeFieldProvider'), fieldAlias),
          ]),
        ),
        f.createStringLiteral('../../native/_field-context'),
        undefined,
      ),
    );
  imports.push(makeImport('withRegistryStyles', '../../native/registry-styles'));
  imports.push(makeImport('NativeRegistryPalette', '../../native/_registry-context'));
  if (nativeForms) imports.push(makeImport('NativeFormScope', '../../native/native-form'));
  if (nativeActions && /\bNativeFormValues\b/.test(source))
    imports.push(makeImport('NativeFormValues', '../../native/registry-action-form'));
  for (const name of hostNames) {
    const target =
      name === 'NativeForm'
        ? '../../native/native-form'
        : name.startsWith('Registry')
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
                f.createIdentifier(name === 'NativeForm' ? 'NativeRecipeForm' : name),
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
                  f.createStringLiteral(
                    name === 'NativeForm' ? 'view' : name === 'Svg' ? 'svg-root' : 'svg',
                  ),
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
  const native =
    '// Adapted from shadcn/ui (MIT). Source and input hash are retained in NATIVE_RECIPES.json.\n' +
    ts.createPrinter().printFile(output);
  validateNativeRecipeSyntax(native, filename);
  return native;
}
export function validateNativeRecipeSyntax(source, filename) {
  const parsed = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  if (parsed.parseDiagnostics.length)
    throw Error(
      'Invalid translated native source ' +
        filename +
        ': ' +
        ts.flattenDiagnosticMessageText(parsed.parseDiagnostics[0].messageText, ' '),
    );
}
/** Data/config literals must survive translation byte-for-byte after AST printing. */
export function chartLiteralInputs(source) {
  const file = ts.createSourceFile(
      'chart.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    printer = ts.createPrinter({ removeComments: true }),
    result = [];
  function visit(node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      /(?:Data$|^chartConfig$)/.test(node.name.text) &&
      node.initializer
    ) {
      let value = node.initializer;
      while (
        ts.isAsExpression(value) ||
        ts.isSatisfiesExpression(value) ||
        ts.isParenthesizedExpression(value)
      )
        value = value.expression;
      if (ts.isArrayLiteralExpression(value) || ts.isObjectLiteralExpression(value))
        result.push([node.name.text, printer.printNode(ts.EmitHint.Expression, value, file)]);
    }
    if (
      ts.isJsxAttribute(node) &&
      ['data', 'payload', 'config'].includes(node.name.getText(file)) &&
      node.parent.parent.tagName?.getText(file) !== 'ChartStyle' &&
      node.initializer &&
      ts.isJsxExpression(node.initializer) &&
      node.initializer.expression
    ) {
      const value = node.initializer.expression;
      if (ts.isArrayLiteralExpression(value) || ts.isObjectLiteralExpression(value))
        result.push([
          'prop:' + node.name.getText(file),
          printer.printNode(ts.EmitHint.Expression, value, file),
        ]);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}
export function assertChartLiteralInputs(source, native, filename) {
  const original = chartLiteralInputs(source),
    translated = chartLiteralInputs(native);
  if (JSON.stringify(original) !== JSON.stringify(translated))
    throw Error('Native chart data/config literals changed: ' + filename);
  return { count: original.length, sha256: hash(JSON.stringify(original)) };
}
export function portChartRecipe(source, filename, options) {
  const native = portNativeRegistryRecipe(source, filename, options);
  assertChartLiteralInputs(source, native, filename);
  return native;
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
    validateNativeRecipeSyntax(recipe.source, recipe.origin);
    const dataInputs = chartLiteralInputs(recipe.source);
    if (
      recipe.name.startsWith('chart-') &&
      (recipe.dataInputs?.count !== dataInputs.length ||
        recipe.dataInputs?.sha256 !== hash(JSON.stringify(dataInputs)))
    )
      throw Error('Stale native chart data/config review: ' + recipe.origin);
    if (hash(recipe.source) !== recipe.nativeSha256)
      throw Error('Changed native chart output: ' + recipe.origin);
    const key =
      recipe.itemKey ?? `registry:${recipe.kind === 'block' ? 'block' : 'example'}/${recipe.name}`;
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
      dataInputs: assertChartLiteralInputs(source, native, origin),
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
