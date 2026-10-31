import { sourceCompositionSchema } from './contracts/deployment.js';
import { GENERATOR_VERSION } from './version.js';
import type { Capability } from './capability-catalog.js';

/** Local source provenance is never a hosting receipt or a provider activation claim. */
export function composeSourceProvenance(
  previous: unknown,
  installed: readonly Capability[],
  additions: readonly Capability[],
) {
  const old = previous === undefined ? undefined : sourceCompositionSchema.parse(previous);
  if (old && Object.keys(old.capabilities).some((id) => !installed.includes(id as Capability)))
    throw Error('Composition provenance disagrees with installed source; reconcile anhedral.json.');
  const identity = installed.includes('database-auth') ? 'better-auth-d1-v1' : 'none';
  if (old && old.identity !== 'none' && old.identity !== identity)
    throw Error('Preserve existing application identity; an explicit adapter is required.');
  return sourceCompositionSchema.parse({
    contractVersion: 1,
    foundation: 'next-opennext',
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
