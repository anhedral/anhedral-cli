import { readFileSync } from 'node:fs';

export type UiPlatform = 'web';
export interface UiSource {
  item: string;
  dependencies: string[];
  registryDependencies: string[];
  compatibility: string;
}
export interface UiComponent {
  name: string;
  web: UiSource | null;
}
export const UI_CATALOG = JSON.parse(
  readFileSync(new URL('../assets/ui/catalog.json', import.meta.url), 'utf8'),
) as {
  schemaVersion: number;
  revision: string;
  shadcnCliVersion: string;
  sources: Record<string, string>;
  components: UiComponent[];
};
/** Resolve source-owned shadcn names for the single Anhedral Stack web foundation. */
export function resolveUiItems(names: string[], platform: UiPlatform) {
  if (platform !== 'web') throw Error('Only the Anhedral Stack web UI is supported.');
  return [...new Set(names)].map((name) => {
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(name)) throw Error(`Invalid component name: ${name}.`);
    const component = UI_CATALOG.components.find((item) => item.name === name);
    if (!component?.web) throw Error(`Unknown shadcn component: ${name}. Run anhedral ui list.`);
    return { name, source: 'shadcn', item: name };
  });
}
