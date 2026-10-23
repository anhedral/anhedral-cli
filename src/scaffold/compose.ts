import { writeProjectSection } from '../project-config.js';
import type { ResolvedStackRegistry } from '../registry/resolve.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { installStackItem } from '../stack-registry.js';
import { createRecipeContext } from '../registry/context.js';
import type { StandardOptions } from '../registry/types.js';
import { inspectWorkspaceGraph } from '../workspace-graph.js';
import { writeStandardRoot } from './workspace.js';

/** Only used in a fresh staged workspace. Existing applications are never overlaid. */
export async function composeStack(
  root: string,
  options: StandardOptions,
  registry: ResolvedStackRegistry,
): Promise<void> {
  const context = createRecipeContext(root, options);
  for (const item of registry.items) Object.assign(context.bindings, item.bindings);
  for (const item of registry.items) {
    if (item.installer === 'recipe') await installStackItem(item, context);
  }
  writeStandardRoot(root, options, registry);
  for (const item of registry.items) {
    for (const target of item.targets) {
      if (!existsSync(path.join(root, target)))
        throw new Error(`Registry target missing: ${item.name} -> ${target}.`);
    }
  }
  writeProjectSection(root, 'registry', {
    ...registry,
    status: 'scaffolded',
    workspaces: inspectWorkspaceGraph(root),
    resourcesProvisioned: false,
  });
}
