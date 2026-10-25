import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync, gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import Color from 'colorjs.io';
import { loadOfficialRegistry } from './shadcn-registry.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'assets/ui/utility-colors.json.gz');
const sha = (value) => createHash('sha256').update(value).digest('hex');
export const loadUtilityColors = () => JSON.parse(gunzipSync(readFileSync(target)));
export function validateUtilityColors(catalog) {
  if (
    catalog.schemaVersion !== 1 ||
    catalog.source.package !== 'tailwindcss' ||
    catalog.source.version !== '4.3.0' ||
    catalog.source.upstreamCommit !== loadOfficialRegistry().source.commit ||
    catalog.source.integrity !==
      'sha512-y6nxMGB1nMW9R6k96e5gdIFzcfL/gTJRNaqGes1YvkLnPVXzWgbqFF2yLC0T8G774n24cx3Pe8XrKoniCOAH+Q==' ||
    catalog.sha256 !== sha(JSON.stringify(catalog.colors))
  )
    throw Error('Stale native utility palette.');
  if (
    sha(catalog.source.css) !== catalog.source.sha256 ||
    Object.keys(catalog.colors).length !== 288
  )
    throw Error('Incomplete utility source.');
  for (const [name, value] of Object.entries(catalog.colors)) {
    const match = [...catalog.source.css.matchAll(/--color-([a-z]+(?:-\d+)?):\s*([^;]+);/g)].find(
      (m) => m[1] === name,
    );
    if (
      !match ||
      new Color(match[2].trim())
        .to('srgb')
        .toGamut({ method: 'css' })
        .toString({ format: 'hex' }) !== value
    )
      throw Error('Utility conversion drift: ' + name);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--source');
  if (index >= 0) {
    const base = path.resolve(process.argv[index + 1]),
      metadata = JSON.parse(readFileSync(path.join(base, 'metadata.json'))),
      tar = readFileSync(path.join(base, 'package.tgz'));
    if (
      metadata.version !== '4.3.0' ||
      'sha512-' + createHash('sha512').update(tar).digest('base64') !== metadata.dist.integrity
    )
      throw Error('Tailwind archive integrity mismatch.');
    const css = readFileSync(path.join(base, 'package/theme.css'), 'utf8'),
      colors = {};
    for (const [, name, value] of css.matchAll(/--color-([a-z]+(?:-\d+)?):\s*([^;]+);/g))
      colors[name] = new Color(value.trim())
        .to('srgb')
        .toGamut({ method: 'css' })
        .toString({ format: 'hex' });
    const catalog = {
      schemaVersion: 1,
      source: {
        package: 'tailwindcss',
        upstreamCommit: loadOfficialRegistry().source.commit,
        version: metadata.version,
        url: metadata.dist.tarball,
        integrity: metadata.dist.integrity,
        sha256: sha(css),
        css,
        license: readFileSync(path.join(base, 'package/LICENSE'), 'utf8'),
      },
      colors,
      sha256: sha(JSON.stringify(colors)),
    };
    validateUtilityColors(catalog);
    writeFileSync(target, gzipSync(JSON.stringify(catalog), { level: 9 }));
  } else validateUtilityColors(loadUtilityColors());
  console.log('Tailwind 4.3.0 native utility palette verified.');
}
