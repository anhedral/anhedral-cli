import ts from 'typescript';
/** Resolve authored label/control relationships before removing browser attributes. */
export function nativeLabelBindings(file) {
  const labels = new Set(['Label']);
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.moduleSpecifier.text.endsWith('/ui/label'))
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings && ts.isNamedImports(bindings))
      for (const item of bindings.elements)
        if ((item.propertyName ?? item.name).text === 'Label') labels.add(item.name.text);
  }
  return labels;
}
export function nativeFieldAssociations(file) {
  const labels = nativeLabelBindings(file);
  const controls = [],
    references = [];
  const element = (node) => (ts.isJsxOpeningElement(node) ? node.parent : node);
  const tag = (node) =>
    ts.isJsxElement(node)
      ? node.openingElement.tagName.getText(file)
      : ts.isJsxSelfClosingElement(node)
        ? node.tagName.getText(file)
        : '';
  const attr = (node, name) =>
    node.attributes.properties.find(
      (prop) => ts.isJsxAttribute(prop) && prop.name.getText(file) === name,
    )?.initializer;
  const key = (value) =>
    !value
      ? undefined
      : ts.isStringLiteral(value)
        ? 'literal:' + value.text
        : ts.isJsxExpression(value) && value.expression
          ? 'expression:' + value.expression.getText(file).replace(/\s+/g, '')
          : undefined;
  const scope = (node) => {
    for (let current = node.parent; current; current = current.parent)
      if (ts.isFunctionLike(current)) return current;
    return file;
  };
  const field = (node) => {
    for (let current = node.parent; current; current = current.parent)
      if (['Field', 'FieldSet'].includes(tag(current))) return current;
    return undefined;
  };
  const walk = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const owner = element(node);
      if (labels.has(node.tagName.getText(file))) {
        const value = attr(node, 'htmlFor');
        if (value) references.push({ node: owner, key: key(value), value, scope: scope(node) });
      } else {
        const value = attr(node, 'id');
        if (value) controls.push({ node: owner, key: key(value), scope: scope(node) });
      }
    }
    ts.forEachChild(node, walk);
  };
  walk(file);
  const ranges = new Map();
  for (const reference of references) {
    const candidates = controls.filter(
      (control) => control.key === reference.key && control.scope === reference.scope,
    );
    if (!reference.key || candidates.length !== 1)
      throw Error(
        'Unresolved or ambiguous native label association in ' +
          file.fileName +
          ': ' +
          reference.value.getText(file),
      );
    const control = candidates[0],
      existing = field(reference.node);
    if (existing && existing === field(control.node)) continue;
    if (existing || field(control.node))
      throw Error(
        'Cross-field native label association requires explicit ownership in ' + file.fileName,
      );
    const ancestors = new Set();
    for (let node = control.node.parent; node; node = node.parent)
      if (ts.isJsxElement(node) || ts.isJsxFragment(node)) ancestors.add(node);
    let common;
    for (let node = reference.node.parent; node; node = node.parent)
      if (ancestors.has(node)) {
        common = node;
        break;
      }
    if (!common)
      throw Error('Native label and control require a shared JSX scope in ' + file.fileName);
    const index = (node) => {
      let child = node;
      while (child.parent !== common && child.parent) child = child.parent;
      return common.children.indexOf(child);
    };
    const left = index(reference.node),
      right = index(control.node);
    if (left < 0 || right < 0)
      throw Error('Unsupported native label/control ownership in ' + file.fileName);
    const range = {
      start: Math.min(left, right),
      end: Math.max(left, right),
      value: reference.value,
    };
    const entries = ranges.get(common) ?? [];
    if (entries.some((entry) => range.start <= entry.end && range.end >= entry.start))
      throw Error(
        'Overlapping native field associations require explicit native fields in ' + file.fileName,
      );
    entries.push(range);
    ranges.set(
      common,
      entries.sort((a, b) => a.start - b.start),
    );
  }
  return ranges;
}
