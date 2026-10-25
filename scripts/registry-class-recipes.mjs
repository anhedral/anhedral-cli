import ts from 'typescript';

/** Read CVA declarations as data. Never evaluate upstream source or dynamic class expressions. */
export function registryClassRecipes(file) {
  const calls = new Set(),
    namespaces = new Set(),
    bindings = new Map();
  for (const statement of file.statements) {
    if (
      ts.isImportDeclaration(statement) &&
      ts.isStringLiteral(statement.moduleSpecifier) &&
      statement.moduleSpecifier.text === 'class-variance-authority'
    ) {
      const named = statement.importClause?.namedBindings;
      if (named && ts.isNamedImports(named))
        for (const specifier of named.elements)
          if ((specifier.propertyName ?? specifier.name).text === 'cva')
            calls.add(specifier.name.text);
      if (named && ts.isNamespaceImport(named)) namespaces.add(named.name.text);
    }
    if (ts.isVariableStatement(statement) && statement.declarationList.flags & ts.NodeFlags.Const)
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name) && declaration.initializer)
          bindings.set(declaration.name.text, declaration.initializer);
  }
  const result = {};
  const put = (record, name, value) =>
    Object.defineProperty(record, name, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  const unwrap = (node) => {
    while (
      node &&
      (ts.isParenthesizedExpression(node) ||
        ts.isAsExpression(node) ||
        ts.isSatisfiesExpression(node))
    )
      node = node.expression;
    return node;
  };
  const key = (node) =>
    ts.isStringLiteral(node) || ts.isNumericLiteral(node) ? node.text : node.getText(file);
  function visit(node) {
    if (
      ts.isCallExpression(node) &&
      ((ts.isIdentifier(node.expression) && calls.has(node.expression.text)) ||
        (ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          namespaces.has(node.expression.expression.text) &&
          node.expression.name.text === 'cva'))
    ) {
      const declaration =
        ts.isVariableDeclaration(node.parent) && ts.isIdentifier(node.parent.name)
          ? node.parent
          : undefined;
      const topLevel =
        declaration &&
        ts.isVariableStatement(declaration.parent?.parent) &&
        declaration.parent.parent.parent === file;
      const name = declaration?.name.getText(file) ?? 'call_' + node.pos;
      if (Object.hasOwn(result, name))
        throw Error('Ambiguous upstream class recipe binding: ' + name);
      const unsupported = [];
      const fail = (label, value) => {
        unsupported.push({ field: label, expression: value?.getText(file) ?? '<missing>' });
        return undefined;
      };
      function classes(input, label, seen = new Set()) {
        const value = unwrap(input);
        if (!value) return '';
        if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value))
          return value.text.trim().replace(/\s+/g, ' ');
        if (
          [
            ts.SyntaxKind.NullKeyword,
            ts.SyntaxKind.FalseKeyword,
            ts.SyntaxKind.TrueKeyword,
          ].includes(value.kind) ||
          (ts.isIdentifier(value) && value.text === 'undefined')
        )
          return '';
        if (ts.isArrayLiteralExpression(value)) {
          const parts = value.elements.map((entry, index) =>
            classes(
              ts.isSpreadElement(entry) ? entry.expression : entry,
              label + '[' + index + ']',
              seen,
            ),
          );
          return parts.includes(undefined) ? undefined : parts.filter(Boolean).join(' ');
        }
        if (
          topLevel &&
          ts.isIdentifier(value) &&
          bindings.has(value.text) &&
          !seen.has(value.text)
        ) {
          const next = new Set(seen);
          next.add(value.text);
          return classes(bindings.get(value.text), label, next);
        }
        return fail(label, value);
      }
      const base = classes(node.arguments[0], 'base');
      const recipe = { base, variants: {}, defaultVariants: {}, compoundVariants: [] };
      const options = unwrap(node.arguments[1]);
      if (options && !ts.isObjectLiteralExpression(options)) fail('options', options);
      if (options && ts.isObjectLiteralExpression(options))
        for (const property of options.properties) {
          if (!ts.isPropertyAssignment(property) || ts.isComputedPropertyName(property.name)) {
            fail('options', property);
            continue;
          }
          const kind = key(property.name),
            value = unwrap(property.initializer);
          if (kind === 'variants') {
            if (!ts.isObjectLiteralExpression(value)) {
              fail(kind, value);
              continue;
            }
            for (const group of value.properties) {
              if (
                !ts.isPropertyAssignment(group) ||
                ts.isComputedPropertyName(group.name) ||
                !ts.isObjectLiteralExpression(unwrap(group.initializer))
              ) {
                fail(kind, group);
                continue;
              }
              const groupName = key(group.name),
                choices = {};
              put(recipe.variants, groupName, choices);
              for (const option of unwrap(group.initializer).properties) {
                if (!ts.isPropertyAssignment(option) || ts.isComputedPropertyName(option.name)) {
                  fail(kind + '.' + groupName, option);
                  continue;
                }
                const optionName = key(option.name);
                put(
                  choices,
                  optionName,
                  classes(option.initializer, 'variants.' + groupName + '.' + optionName),
                );
              }
            }
          } else if (kind === 'defaultVariants') {
            if (!ts.isObjectLiteralExpression(value)) {
              fail(kind, value);
              continue;
            }
            for (const option of value.properties) {
              if (!ts.isPropertyAssignment(option) || ts.isComputedPropertyName(option.name)) {
                fail(kind, option);
                continue;
              }
              const own = unwrap(option.initializer),
                ownKey = key(option.name);
              if (ts.isStringLiteral(own) || ts.isNumericLiteral(own))
                put(recipe.defaultVariants, ownKey, own.text);
              else if (
                own.kind === ts.SyntaxKind.TrueKeyword ||
                own.kind === ts.SyntaxKind.FalseKeyword
              )
                put(recipe.defaultVariants, ownKey, own.kind === ts.SyntaxKind.TrueKeyword);
              else if (own.kind === ts.SyntaxKind.NullKeyword)
                put(recipe.defaultVariants, ownKey, null);
              else fail(kind + '.' + ownKey, own);
            }
          } else if (kind === 'compoundVariants') {
            if (!ts.isArrayLiteralExpression(value)) {
              fail(kind, value);
              continue;
            }
            const literal = (input, label) => {
              const own = unwrap(input);
              if (ts.isStringLiteral(own)) return own.text;
              if (ts.isNumericLiteral(own)) return Number(own.text);
              if (own.kind === ts.SyntaxKind.TrueKeyword || own.kind === ts.SyntaxKind.FalseKeyword)
                return own.kind === ts.SyntaxKind.TrueKeyword;
              if (own.kind === ts.SyntaxKind.NullKeyword) return null;
              if (ts.isArrayLiteralExpression(own))
                return own.elements.map((element) => literal(element, label));
              return fail(label, own);
            };
            for (const [index, entry] of value.elements.entries()) {
              const own = unwrap(entry),
                when = {},
                style = [];
              if (!ts.isObjectLiteralExpression(own)) {
                fail(kind + '[' + index + ']', own);
                continue;
              }
              for (const condition of own.properties) {
                if (
                  !ts.isPropertyAssignment(condition) ||
                  ts.isComputedPropertyName(condition.name)
                ) {
                  fail(kind + '[' + index + ']', condition);
                  continue;
                }
                const name = key(condition.name),
                  label = kind + '[' + index + '].' + name;
                if (name === 'class' || name === 'className')
                  style.push(classes(condition.initializer, label));
                else put(when, name, literal(condition.initializer, label));
              }
              recipe.compoundVariants.push({ when, className: style.filter(Boolean).join(' ') });
            }
          } else fail(kind, value);
        }
      if (!topLevel) fail('scope', node.expression);
      if (unsupported.length) recipe.unsupported = unsupported;
      put(result, name, recipe);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return result;
}
