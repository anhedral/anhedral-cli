import Color from 'colorjs.io';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadOfficialRegistry, reviewedInputs } from './shadcn-registry.mjs';
const target = fileURLToPath(new URL('../assets/ui/registry-themes.json.gz', import.meta.url));
export function loadNativeRegistryThemes() {
  return JSON.parse(gunzipSync(readFileSync(target), { maxOutputLength: 1024 * 1024 }).toString());
}
export function nativeRegistryThemes(inventory) {
  const themes = {};
  for (const registry of Object.values(inventory.registries))
    for (const item of registry.items)
      if (item.type === 'registry:theme') {
        if (themes[item.name]) continue;
        const result = {
          upstream: item.cssVars,
          native: {},
          css: {},
          metrics: {},
          reviewedInputs: reviewedInputs(inventory, 'registry:theme/' + item.name),
        };
        for (const mode of ['light', 'dark']) {
          const native = {},
            css = {};
          const metrics = {};
          for (const [key, value] of Object.entries(item.cssVars[mode])) {
            if (key === 'radius') {
              if (!/^[0-9.]+(?:rem|px)$/.test(value))
                throw Error('Unsupported native radius: ' + value);
              metrics.radius = parseFloat(value) * (value.endsWith('rem') ? 16 : 1);
              css['--radius'] = value;
              continue;
            }
            const source = /^[-\d.]+\s+[-\d.]+%/.test(value) ? `hsl(${value})` : value;
            const color = new Color(source).to('srgb').toGamut({ method: 'css' });
            native[key] =
              color.alpha === 1
                ? color.toString({ format: 'hex' })
                : 'rgba(' +
                  color.coords.map((value) => Math.round(value * 255)).join(', ') +
                  ', ' +
                  color.alpha +
                  ')';
            const [h, s, l] = color
              .to('hsl')
              .coords.map((value) => (Number.isFinite(value) ? Number(value.toFixed(6)) : 0));
            css['--' + key] = `${h} ${s}% ${l}%${color.alpha < 1 ? ' / ' + color.alpha : ''}`;
          }
          result.metrics[mode] = metrics;
          result.native[mode] = native;
          result.css[mode] = css;
        }
        themes[item.name] = result;
      }
  return Object.fromEntries(Object.entries(themes).sort());
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const output = nativeRegistryThemes(loadOfficialRegistry());
  if (process.argv.includes('--write'))
    writeFileSync(target, gzipSync(JSON.stringify(output, null, 2) + '\n'));
  else if (JSON.stringify(loadNativeRegistryThemes()) !== JSON.stringify(output))
    throw Error('Registry theme colors or upstream evidence changed.');
}
