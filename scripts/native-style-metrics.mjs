import { validateStyleGlobals } from './shadcn-registry.mjs';
export function nativeGlobalMetrics(inventory) {
  validateStyleGlobals(inventory);
  const global = inventory.styleGlobals['apps/v4/app/globals.css'];
  const radius = Object.fromEntries(
    [
      ...global.content.matchAll(
        /--radius-(sm|md|lg|xl|2xl|3xl|4xl):\s*(?:calc\(var\(--radius\) \* ([\d.]+)\)|var\(--radius\));/g,
      ),
    ].map((match) => [match[1], Number(match[2] ?? 1)]),
  );
  if (Object.keys(radius).length !== 7) throw Error('Upstream radius formulas need native review.');
  return { upstream: inventory.source, globals: { sha256: global.sha256, radius } };
}
