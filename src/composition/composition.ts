import { sourceCompositionSchema } from '../contracts/deployment.js';
import { z } from 'zod';
import { GENERATOR_VERSION } from '../version.js';
import type { Capability } from './catalog.js';

// Narrow the shared source contract for the launch generator; runtime admission remains server-owned.
export const launchCompositionSchema = sourceCompositionSchema.safeExtend({
  contractVersion: z.literal(2),
  foundation: z.literal('tanstack-start'),
});
const compositionSchema = launchCompositionSchema;

/** Local source provenance is never a hosting receipt or a provider activation claim. */
export function composeSourceProvenance(
  previous: unknown,
  installed: readonly Capability[],
  additions: readonly Capability[],
) {
  const old = compositionSchema.parse(previous);
  if (old && Object.keys(old.capabilities).some((id) => !installed.includes(id as Capability)))
    throw Error('Composition provenance disagrees with installed source; reconcile anhedral.json.');
  const identity = installed.includes('database-auth') ? 'better-auth-d1-v1' : 'none';
  if (old && old.identity !== 'none' && old.identity !== identity)
    throw Error('Preserve existing application identity; an explicit adapter is required.');
  return compositionSchema.parse({
    contractVersion: 2,
    foundation: 'tanstack-start',
    generatorVersion: GENERATOR_VERSION,
    identity,
    capabilities: Object.fromEntries(
      installed.map((id) => [
        id,
        additions.includes(id) ? GENERATOR_VERSION : old.capabilities[id],
      ]),
    ),
  });
}
