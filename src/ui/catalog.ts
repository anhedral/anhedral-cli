import { resolveUiConsumer } from './target.js';
import type { UiCatalogEntry, UiInspectionOptions } from './types.js';

export function parseUiSelector(selector: string): 'ui/button' {
  if (selector !== 'ui/button') throw new Error('Supported UI inspection selector: ui/button.');
  return selector;
}

/** Candidate metadata only: no installer, receipt writer or asset source is exposed. */
export function inspectUiCatalog(
  root: string,
  options: UiInspectionOptions = {},
  selector?: string,
) {
  if (selector !== undefined) parseUiSelector(selector);
  const entry: UiCatalogEntry = {
    selector: 'ui/button',
    kind: 'ui',
    sourceAvailability: 'candidate-unavailable',
    installable: false,
    sourceRecipeVersion: null,
    portableContractVersion: null,
  };
  return {
    schemaVersion: 1 as const,
    items: [entry],
    resolution: resolveUiConsumer(root, options),
  };
}
