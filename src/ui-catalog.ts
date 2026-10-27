import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export type UiPlatform = 'web' | 'native';
export interface UiSource {
  item: string;
  dependencies: string[];
  registryDependencies: string[];
  compatibility: string;
}
export interface UiComponent {
  name: string;
  web: UiSource | null;
  native: UiSource | null;
}
export const UI_CATALOG = JSON.parse(
  readFileSync(new URL('../assets/ui/catalog.json', import.meta.url), 'utf8'),
) as {
  schemaVersion: number;
  revision: string;
  nativeStyling: string;
  shadcnCliVersion: string;
  sources: Record<string, string>;
  components: UiComponent[];
};
const extensions = fileURLToPath(new URL('../assets/ui/extensions/', import.meta.url));

/** Resolve names only. Upstream shadcn owns dependency resolution and source installation. */
export function resolveUiItems(names: string[], platform: UiPlatform, extensionRoot = extensions) {
  const registry = JSON.parse(readFileSync(path.join(extensionRoot, 'registry.json'), 'utf8')) as {
    items: { name: string }[];
  };
  return [...new Set(names)].map((name) => {
    if (!/^[a-z][a-z0-9-]{0,79}$/.test(name)) throw Error(`Invalid component name: ${name}.`);
    const component = UI_CATALOG.components.find((item) => item.name === name);
    if (!component) throw Error(`Unknown UI component: ${name}. Run anhedral ui list.`);
    if (platform === 'native' && registry.items.some((item) => item.name === name)) {
      const file = path.join(extensionRoot, `${name}.json`);
      if (!existsSync(file)) throw Error(`Missing reviewed Anhedral extension: ${name}.`);
      return { name, source: 'anhedral', item: file };
    }
    if (!component[platform])
      throw Error(`${name} is not yet available for ${platform}. No substitute was installed.`);
    return {
      name,
      source: platform === 'web' ? 'shadcn' : 'react-native-reusables',
      item:
        platform === 'web'
          ? name
          : `https://reactnativereusables.com/r/nativewind/${component.native!.item}.json`,
    };
  });
}
