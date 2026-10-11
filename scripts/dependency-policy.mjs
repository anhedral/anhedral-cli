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
