import { dependencyOrder } from '../dependency-order.js';
import {
  STANDARD_PRODUCTS,
  STACK_REGISTRY,
  getStackDefinition,
  getStackItem,
} from '../stack-registry.js';
import { createResolutionContext } from './context.js';
import type { Hosting, StandardOptions, StandardProduct, StackRegistryItem } from './types.js';

export const CORE_PRODUCTS: readonly StandardProduct[] = [
  'expo',
  'hono',
  'd1',
  'r2',
  'better-auth',
  'styling',
];
export function resolveBillingProducts(selected: Set<StandardProduct>): void {
  for (const product of CORE_PRODUCTS) selected.add(product);
}
/** Every initialization uses one foundation; only payment additions are optional. */
export function resolveStandardProducts(
  selected: Set<StandardProduct>,
  hosting: Hosting,
  _hostingSpecified = false,
  _initializing = true,
): void {
  if (hosting !== 'cloudflare') throw new Error('Anhedral applications use Cloudflare Workers.');
  for (const id of selected) getStackDefinition(id);
  resolveBillingProducts(selected);
  resolveStackRegistry({ products: [...selected], hosting });
}
export interface ResolvedStackRegistry {
  schemaVersion: number;
  name: string;
  cliVersion: string;
  items: StackRegistryItem[];
}
export function resolveStackRegistry(
  options: Pick<StandardOptions, 'products' | 'hosting'> & Partial<Pick<StandardOptions, 'name'>>,
): ResolvedStackRegistry {
  if (options.hosting !== 'cloudflare')
    throw new Error('Anhedral applications use Cloudflare Workers.');
  for (const id of options.products)
    if (!(STANDARD_PRODUCTS as readonly string[]).includes(id))
      throw new Error(`Unknown stack product: ${id}.`);
  const products = [...new Set([...CORE_PRODUCTS, ...options.products])];
  const context = createResolutionContext({ ...options, products });
  const resolved = new Map<string, StackRegistryItem>();
  function collect(name: string): void {
    if (resolved.has(name)) return;
    const definition = getStackDefinition(name);
    const metadata = getStackItem(name);
    metadata.registryDependencies = [
      ...new Set([
        ...definition.registryDependencies,
        ...(definition.resolveDependencies?.(context) ?? []),
      ]),
    ];
    metadata.environment = definition.resolveEnvironment?.(context) ?? metadata.environment;
    metadata.targets = definition.resolveTargets?.(context) ?? metadata.targets;
    if (definition.configure) metadata.bindings = definition.configure(context);
    if (definition.package)
      metadata.package =
        definition.resolvePackage?.(context, definition.package) ?? definition.package;
    resolved.set(name, metadata);
    for (const dependency of metadata.registryDependencies) collect(dependency);
  }
  for (const name of ['workspace', 'typescript', 'eslint', ...products.sort()]) collect(name);
  const graph = new Map([...resolved].map(([name, item]) => [name, item.registryDependencies]));
  return {
    schemaVersion: STACK_REGISTRY.schemaVersion,
    name: STACK_REGISTRY.name,
    cliVersion: STACK_REGISTRY.cliVersion,
    items: dependencyOrder(graph, 'Stack registry').map((name) => resolved.get(name)!),
  };
}
