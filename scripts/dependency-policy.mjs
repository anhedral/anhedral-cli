import ts from 'typescript';

const dependencyGroups = new Set(['dependencies', 'devDependencies', 'optionalDependencies']);
const recipeArguments = new Map([
  ['sharedPackage', 3],
  ['worker', 4],
  ['packageSource', 2],
]);

/** Detect literal dependency values outside the one reviewed version catalog. */
export function findUncataloguedDependencyPins(source, filename) {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  const findings = [];
  const nameOf = (node) =>
    ts.isIdentifier(node) || ts.isStringLiteral(node) ? node.text : undefined;
  function inspectMap(node) {
    for (const property of node.properties) {
      if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.initializer)) continue;
      const value = property.initializer.text;
      if (value.startsWith('workspace:')) continue;
      const { line } = file.getLineAndCharacterOfPosition(property.getStart(file));
      findings.push(
        `${filename}:${line + 1}: dependency ${nameOf(property.name) ?? property.name.getText(file)} must come from src/dependencies.ts (received ${value})`,
      );
    }
  }
  function visit(node) {
    if (ts.isObjectLiteralExpression(node)) {
      const parent = node.parent;
      const propertyMap =
        ts.isPropertyAssignment(parent) && dependencyGroups.has(nameOf(parent.name));
      const assignmentMap =
        ts.isBinaryExpression(parent) &&
        ts.isPropertyAccessExpression(parent.left) &&
        dependencyGroups.has(parent.left.name.text);
      const recipeMap =
        ts.isCallExpression(parent) &&
        ts.isIdentifier(parent.expression) &&
        recipeArguments.get(parent.expression.text) !== undefined &&
        parent.arguments[recipeArguments.get(parent.expression.text)] === node;
      if (propertyMap || assignmentMap || recipeMap) inspectMap(node);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return findings;
}

/** Read reviewed dependency maps and tagged tool pins without evaluating source. */
export function collectCatalogDependencyPins(source, filename = 'dependencies.ts') {
  const file = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error(`Cannot parse dependency catalog ${filename}`);
  const declarations = new Map();
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (ts.isIdentifier(declaration.name) && declaration.initializer)
        declarations.set(declaration.name.text, declaration.initializer);
    }
  }
  const resolve = (node, seen = new Set()) => {
    if (seen.has(node)) return undefined;
    seen = new Set([...seen, node]);
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text) || !declarations.has(node.text)) return undefined;
      return resolve(declarations.get(node.text), new Set([...seen, node.text]));
    }
    if (ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)) {
      const object = resolve(node.expression, seen);
      const key = ts.isPropertyAccessExpression(node)
        ? node.name.text
        : ts.isStringLiteralLike(node.argumentExpression)
          ? node.argumentExpression.text
          : undefined;
      if (!object || !ts.isObjectLiteralExpression(object) || !key) return undefined;
      const property = object.properties.find(
        (entry) =>
          ts.isPropertyAssignment(entry) &&
          (ts.isIdentifier(entry.name) || ts.isStringLiteral(entry.name)) &&
          entry.name.text === key,
      );
      return property ? resolve(property.initializer, seen) : undefined;
    }
    if (
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isParenthesizedExpression(node)
    )
      return resolve(node.expression, seen);
    return node;
  };
  const pins = [];
  const exact = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/;
  const add = (name, initializer) => {
    const node = resolve(initializer);
    if (!node || !ts.isStringLiteralLike(node) || !exact.test(node.text))
      throw new Error(`Unresolved exact dependency pin ${name} in ${filename}`);
    pins.push({ name, version: node.text });
  };
  const inspect = (initializer) => {
    const node = resolve(initializer);
    if (!node || !ts.isObjectLiteralExpression(node))
      throw new Error(`Unresolved dependency map in ${filename}`);
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        inspect(property.expression);
        continue;
      }
      if (!ts.isPropertyAssignment(property))
        throw new Error(`Unsupported dependency property in ${filename}`);
      const name =
        ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)
          ? property.name.text
          : undefined;
      if (!name) throw new Error(`Unsupported dependency name in ${filename}`);
      if (dependencyGroups.has(name)) inspect(property.initializer);
      else {
        const value = resolve(property.initializer);
        if (value && ts.isStringLiteralLike(value) && value.text.startsWith('workspace:')) continue;
        add(name, property.initializer);
      }
    }
  };
  for (const statement of file.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    const leading = source.slice(statement.getFullStart(), statement.getStart(file));
    const tag = leading.match(/renovate:\s+datasource=npm\s+depName=([^\s]+)/)?.[1];
    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue;
      const name = declaration.name.text;
      if (name.endsWith('_DEPENDENCIES')) inspect(declaration.initializer);
      else if (name === 'PACKAGE_MANAGER') {
        const value = resolve(declaration.initializer);
        const coordinate =
          value && ts.isStringLiteralLike(value) ? /^(pnpm)@(.+)$/.exec(value.text) : null;
        if (!coordinate || !exact.test(coordinate[2]))
          throw new Error(`Invalid package manager pin in ${filename}`);
        pins.push({ name: coordinate[1], version: coordinate[2] });
      } else if (tag) add(tag, declaration.initializer);
    }
  }
  return [...new Map(pins.map((pin) => [`${pin.name}@${pin.version}`, pin])).values()];
}
