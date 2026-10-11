import { dependencyOrder } from '../dependency-order.js';
import {
  STANDARD_PRODUCTS,
  STACK_REGISTRY,
  getStackDefinition,
  getStackItem,
} from '../stack-registry.js';
import { createResolutionContext } from './context.js';
import type {
  Hosting,
  RecipeContext,
  StandardOptions,
  StandardProduct,
  StackRegistryItem,
} from './types.js';

function hasServer(context: RecipeContext): boolean {
  return context.has('hono') || context.has('vinext') || context.has('next');
}
function needsWorker(name: string, context: RecipeContext): boolean {
  const definition = getStackDefinition(name);
  return (
    definition.runtime === 'worker' ||
    (definition.runtime === 'optional-worker' && hasServer(context))
  );
}
function validateProducts(selected: ReadonlySet<string>, hosting: Hosting): void {
  if (!['cloudflare', 'vercel'].includes(hosting))
    throw new Error('hosting must be cloudflare or vercel.');
  for (const id of selected) {
    if (!(STANDARD_PRODUCTS as readonly string[]).includes(id))
      throw new Error(`Unknown stack product: ${id}.`);
    const { conflicts = [], requiresAny = [], requiresAll = [] } = getStackDefinition(id).selection;
    const conflict = conflicts.find((other) => selected.has(other));
    if (conflict) throw new Error(`Choose one of ${id} / ${conflict}.`);
    if (requiresAny.length && !requiresAny.some((other) => selected.has(other)))
      throw new Error(
        `${id} requires an explicitly selected ${requiresAny.join(' or ')} capability.`,
      );
    const missing = requiresAll.filter((other) => !selected.has(other));
    if (missing.length)
      throw new Error(`${id} requires ${missing.join(', ')}; select it explicitly.`);
  }
  if (selected.has('vinext') && hosting !== 'cloudflare')
    throw new Error('Vinext requires Cloudflare hosting; select --next for Vercel.');
}

/** Apply default selections once. All callers then use the same strict graph resolver. */
export function resolveStandardProducts(
  selected: Set<StandardProduct>,
  hosting: Hosting,
  hostingSpecified: boolean,
): void {
  for (const id of selected) getStackDefinition(id);
  if (![...selected].some((id) => getStackDefinition(id).type === 'application'))
    selected.add(hosting === 'vercel' ? 'next' : 'vinext');
  for (const id of selected) {
    const definition = getStackDefinition(id);
    const alternatives = definition.selection.requiresAny ?? [];
    if (
      definition.fallbackDependency &&
      !alternatives.some((other) => selected.has(other as StandardProduct))
    )
      selected.add(definition.fallbackDependency as StandardProduct);
  }
  const context = createResolutionContext({ products: [...selected], hosting });
  if (
    context.has('next') &&
    hosting === 'vercel' &&
    [...selected].some((id) => needsWorker(id, context))
  )
    selected.add('hono');
  if (hostingSpecified && !selected.has('next') && !selected.has('vinext'))
    throw new Error('--hosting applies to the web application.');
  resolveStackRegistry({ products: [...selected], hosting });
}

export interface ResolvedStackRegistry {
  schemaVersion: number;
  name: string;
  cliVersion: string;
  items: StackRegistryItem[];
}

function itemDependencies(name: string, context: RecipeContext): Set<string> {
  const definition = getStackDefinition(name);
  const dependencies = new Set(definition.registryDependencies);
  if (definition.runtime) {
    if (!hasServer(context) && definition.runtime !== 'optional-worker')
      throw new Error(`${name} requires a server runtime.`);
    if (
      needsWorker(name, context) &&
      !context.has('hono') &&
      !(context.options.hosting === 'cloudflare' && (context.has('vinext') || context.has('next')))
    )
      throw new Error(`${name} requires a Cloudflare runtime.`);
    if (hasServer(context))
      dependencies.add(context.has('hono') ? 'hono' : context.has('vinext') ? 'vinext' : 'next');
  }
  for (const dependency of definition.resolveDependencies?.(context) ?? [])
    dependencies.add(dependency);
  return dependencies;
}

export function resolveStackRegistry(
  options: Pick<StandardOptions, 'products' | 'hosting'> & Partial<Pick<StandardOptions, 'name'>>,
): ResolvedStackRegistry {
  const selected = new Set(options.products);
  validateProducts(selected, options.hosting);
  if (![...selected].some((id) => getStackDefinition(id).type === 'application'))
    throw new Error('Stack registry requires an application.');
  const context = createResolutionContext(options);
  const resolved = new Map<string, StackRegistryItem>();
  const collect = (name: string): void => {
    if (resolved.has(name)) return;
    const definition = getStackDefinition(name);
    const metadata = getStackItem(name);
    const dependencies = itemDependencies(name, context);
    metadata.registryDependencies = [...dependencies];
    metadata.environment = definition.resolveEnvironment?.(context) ?? metadata.environment;
    metadata.targets = definition.resolveTargets?.(context) ?? metadata.targets;
    if (definition.configure) metadata.bindings = definition.configure(context);
    if (definition.package)
      metadata.package =
        definition.resolvePackage?.(context, definition.package) ?? definition.package;
    resolved.set(name, metadata);
    for (const dependency of dependencies) collect(dependency);
  };
  for (const name of ['workspace', 'typescript', 'eslint', ...[...selected].sort()]) collect(name);
  const graph = new Map([...resolved].map(([name, item]) => [name, item.registryDependencies]));
  return {
    schemaVersion: STACK_REGISTRY.schemaVersion,
    name: STACK_REGISTRY.name,
    cliVersion: STACK_REGISTRY.cliVersion,
    items: dependencyOrder(graph, 'Stack registry').map((name) => resolved.get(name)!),
  };
}
