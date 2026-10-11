/** Sort a directed dependency graph in O(vertices + edges), rejecting unresolved edges and cycles. */
export function dependencyOrder(
  graph: ReadonlyMap<string, readonly string[]>,
  label: string,
): string[] {
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const order: string[] = [];
  const visit = (name: string): void => {
    if (visited.has(name)) return;
    if (visiting.has(name)) throw new Error(`${label} dependency cycle at ${name}.`);
    const dependencies = graph.get(name);
    if (!dependencies) throw new Error(`${label} dependency missing: ${name}.`);
    visiting.add(name);
    for (const dependency of dependencies) visit(dependency);
    visiting.delete(name);
    visited.add(name);
    order.push(name);
  };
  for (const name of graph.keys()) visit(name);
  return order;
}
