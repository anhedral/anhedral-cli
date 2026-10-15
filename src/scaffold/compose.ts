import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { installStackItem } from '../stack-registry.js';
import { createRecipeContext } from '../registry/context.js';
import type { StandardOptions } from '../registry/types.js';
import { inspectWorkspaceGraph } from '../workspace-graph.js';
import { writeStandardRoot } from './workspace.js';
import { json } from './files.js';
import { normalizeSharedLint } from './lint.js';
import { configureVoidDelivery } from './void.js';

/** Only used in a fresh staged workspace. Existing applications are never overlaid. */
export async function composeStack(
  root: string,
  options: StandardOptions,
  registry: ResolvedStackRegistry,
): Promise<void> {
  const context = createRecipeContext(root, options);
  if (!context.has('next') && !context.has('vinext')) {
    for (const directory of ['apps/web', 'packages/ui'])
      rmSync(path.join(root, directory), { recursive: true, force: true });
  }
  for (const item of registry.items) Object.assign(context.bindings, item.bindings);
  for (const item of registry.items) {
    if (item.installer === 'recipe') await installStackItem(item, context);
  }
  normalizeSharedLint(root);
  writeStandardRoot(root, options, registry);
  configureVoidDelivery(root);
  for (const item of registry.items) {
    for (const target of item.targets) {
      if (
        !existsSync(path.join(root, target)) &&
        !(
          target.endsWith('/wrangler.jsonc') &&
          existsSync(
            path.join(root, target.replace('/wrangler.jsonc', '/anhedral.cloudflare.json')),
          )
        )
      )
        throw new Error(`Registry target missing: ${item.name} -> ${target}.`);
    }
  }
  json(root, 'anhedral.registry.json', {
    ...registry,
    status: 'scaffolded',
    workspaces: inspectWorkspaceGraph(root),
    resourcesProvisioned: false,
  });
}
