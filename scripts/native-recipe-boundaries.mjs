import ts from 'typescript';
const functionNode = (node) =>
  node &&
  (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node));
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
export function nativeRecipeBoundaries(file, filename) {
  const owners = new Map(),
    functions = new Set();
  for (const statement of file.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name)
      owners.set(statement.name.text, statement);
    if (ts.isVariableStatement(statement))
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name) && functionNode(unwrap(declaration.initializer)))
          owners.set(declaration.name.text, unwrap(declaration.initializer));
  }
  const add = (name) => {
    const owner = owners.get(name);
    if (owner) functions.add(owner);
  };
  for (const statement of file.statements) {
    const exported = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    const primary = statement.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
    );
    if (
      ts.isFunctionDeclaration(statement) &&
      (primary || (exported && statement.name && /^[A-Z]/.test(statement.name.text)))
    )
      functions.add(statement);
    if (ts.isVariableStatement(statement) && exported)
      for (const declaration of statement.declarationList.declarations)
        if (ts.isIdentifier(declaration.name) && /^[A-Z]/.test(declaration.name.text))
          add(declaration.name.text);
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      const expression = unwrap(statement.expression);
      if (ts.isIdentifier(expression)) add(expression.text);
      else if (functionNode(expression)) functions.add(expression);
    }
    if (
      ts.isExportDeclaration(statement) &&
      !statement.isTypeOnly &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    )
      for (const entry of statement.exportClause.elements)
        if (!entry.isTypeOnly && (entry.name.text === 'default' || /^[A-Z]/.test(entry.name.text)))
          add((entry.propertyName ?? entry.name).text);
  }
  const source =
    filename.match(/registry\/bases\/(base|radix|aria)\//)?.[1] ??
    filename.match(/(?:registry\/|styles\/)(default|new-york-v4|new-york)\//)?.[1];
  return { functions, source };
}
export function recipeFunctionOwner(node) {
  for (let parent = node.parent; parent; parent = parent.parent)
    if (functionNode(parent) || ts.isMethodDeclaration(parent)) return parent;
  return undefined;
}
export function recipeRootExpression(input) {
  const node = unwrap(input);
  return (
    node &&
    (ts.isJsxElement(node) ||
      ts.isJsxSelfClosingElement(node) ||
      ts.isJsxFragment(node) ||
      (ts.isConditionalExpression(node) &&
        (recipeRootExpression(node.whenTrue) || recipeRootExpression(node.whenFalse))))
  );
}
