import { resolveStackRegistry } from './registry/resolve.js';
import { GENERATOR_VERSION } from './version.js';
import type { StandardOptions } from './registry/types.js';
export function createSetupPlan(
  options: StandardOptions,
  registry = resolveStackRegistry(options),
) {
  return {
    schemaVersion: 1,
    cliVersion: GENERATOR_VERSION,
    root: options.root,
    name: options.name,
    products: options.products,
    dryRun: options.dryRun,
    registry,
    resourcesProvisioned: false,
  };
}
