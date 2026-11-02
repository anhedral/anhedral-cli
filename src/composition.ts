import { sourceCompositionSchema } from './contracts/deployment.js';
import { z } from 'zod';
import { GENERATOR_VERSION } from './version.js';
import type { Capability } from './capability-catalog.js';

// Version 2 describes launch source only. It does not expand the portable hosting contract.
export const launchCompositionSchema = sourceCompositionSchema.extend({
  contractVersion: z.literal(2),
  foundation: z.literal('tanstack-start'),
});
const compositionSchema = z.union([sourceCompositionSchema, launchCompositionSchema]);

/** Local source provenance is never a hosting receipt or a provider activation claim. */
export function composeSourceProvenance(
  previous: unknown,
  installed: readonly Capability[],
  additions: readonly Capability[],
) {
  const old = previous === undefined ? undefined : compositionSchema.parse(previous);
  if (old && Object.keys(old.capabilities).some((id) => !installed.includes(id as Capability)))
    throw Error('Composition provenance disagrees with installed source; reconcile anhedral.json.');
  const identity = installed.includes('database-auth') ? 'better-auth-d1-v1' : 'none';
  if (old && old.identity !== 'none' && old.identity !== identity)
    throw Error('Preserve existing application identity; an explicit adapter is required.');
  return compositionSchema.parse({
    contractVersion: old?.contractVersion ?? 1,
    foundation: old?.foundation ?? 'next-opennext',
    generatorVersion: old?.generatorVersion ?? null,
    identity,
    capabilities: Object.fromEntries(
      installed.map((id) => [
        id,
        additions.includes(id) ? GENERATOR_VERSION : (old?.capabilities[id] ?? null),
      ]),
    ),
  });
}
