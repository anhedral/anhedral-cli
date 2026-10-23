import type { RecipeContext, StandardOptions } from './types.js';

export function createRecipeContext(root: string, options: StandardOptions): RecipeContext {
  const selected = new Set<string>(options.products);
  return {
    root,
    options,
    has: (product) => selected.has(product),
    runtimeApp: 'api',
    bindings: {},
  };
}

export function createResolutionContext(
  selection: Pick<StandardOptions, 'products' | 'hosting'> & Partial<Pick<StandardOptions, 'name'>>,
): RecipeContext {
  return createRecipeContext('', {
    root: '',
    name: selection.name ?? 'app',
    skipInstall: true,
    dryRun: true,
    json: false,
    initializeGit: false,
    ...selection,
  });
}
