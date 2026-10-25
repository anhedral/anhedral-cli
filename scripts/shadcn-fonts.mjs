import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import { gzipSync, gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { loadOfficialRegistry, sha256 } from './shadcn-registry.mjs';
const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'assets/ui/native-fonts.json.gz');
const cache = path.join(root, '.artifacts/shadcn-fonts');
export function loadNativeFontCatalog() {
  return JSON.parse(gunzipSync(readFileSync(target), { maxOutputLength: 1024 * 1024 }).toString());
}
export function officialFonts(inventory) {
  const result = {};
  for (const registry of Object.values(inventory.registries))
    for (const item of registry.items)
      if (item.type === 'registry:font') {
        const font = Object.fromEntries(Object.entries(item.font).sort());
        if (result[item.name] && JSON.stringify(result[item.name]) !== JSON.stringify(font))
          throw Error('Conflicting upstream font metadata: ' + item.name);
        result[item.name] = font;
      }
  return Object.fromEntries(Object.entries(result).sort());
}
/** Read actual sfnt table records; CSS/webfont metadata cannot pass this check. */
export function inspectNativeFont(bytes) {
  const buffer = Buffer.from(bytes);
  if (
    buffer.length < 12 ||
    !['00010000', '4f54544f'].includes(buffer.subarray(0, 4).toString('hex'))
  )
    throw Error('Native font must be an OpenType or TrueType sfnt.');
  const count = buffer.readUInt16BE(4),
    tables = new Map();
  if (count < 5 || count > 100 || buffer.length < 12 + count * 16)
    throw Error('Invalid sfnt directory.');
  for (let index = 0; index < count; index++) {
    const offset = 12 + index * 16,
      tag = buffer.toString('ascii', offset, offset + 4),
      start = buffer.readUInt32BE(offset + 8),
      length = buffer.readUInt32BE(offset + 12);
    if (start + length > buffer.length || start < 12 + count * 16)
      throw Error('Invalid font table: ' + tag);
    tables.set(tag, buffer.subarray(start, start + length));
  }
  for (const name of ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2'])
    if (!tables.has(name)) throw Error('Missing native font table: ' + name);
  const os2 = tables.get('OS/2');
  if (os2.length < 64) throw Error('Truncated OS/2 font table.');
  return {
    weight: os2.readUInt16BE(4),
    italic: !!(os2.readUInt16BE(62) & 1),
    tables: [...tables.keys()].sort(),
  };
}
export function validateFontCatalog(inventory, catalog) {
  if (
    catalog.schemaVersion !== 1 ||
    catalog.source.repository !== 'https://github.com/expo/google-fonts' ||
    !/^[a-f0-9]{40}$/.test(catalog.source.commit)
  )
    throw Error('Invalid native font provenance.');
  const fonts = officialFonts(inventory);
  if (JSON.stringify(Object.keys(fonts)) !== JSON.stringify(Object.keys(catalog.items)))
    throw Error('Native font registry membership changed.');
  for (const [id, font] of Object.entries(fonts)) {
    const item = catalog.items[id],
      family = catalog.families[item.family];
    if (!/^[a-z0-9-]+$/.test(item.family)) throw Error('Unsafe native font family.');
    if (JSON.stringify(item.upstream) !== JSON.stringify(font))
      throw Error('Upstream font configuration changed: ' + id);
    if (
      !family?.variants.length ||
      !family.license?.text ||
      !/^[a-f0-9]{64}$/.test(family.license.sha256) ||
      sha256(family.license.text) !== family.license.sha256
    )
      throw Error('Missing native font/license: ' + id);
    for (const variant of family.variants) {
      if (
        !/^[A-Za-z0-9_]+$/.test(variant.name) ||
        !/^[a-f0-9]{64}$/.test(variant.sha256) ||
        variant.bytes < 1000 ||
        !/^\d{3}[A-Za-z]+(?:_Italic)?\/[A-Za-z0-9_]+\.ttf$/.test(variant.file) ||
        variant.weight < 100 ||
        variant.weight > 900
      )
        throw Error('Invalid native font asset: ' + id);
    }
    const weights =
      font.weight?.map(Number) ??
      family.variants.filter((variant) => !variant.italic).map((variant) => variant.weight);
    for (const weight of weights)
      if (!family.variants.some((variant) => variant.weight === weight && !variant.italic))
        throw Error('Missing declared font weight: ' + id + '/' + weight);
  }
}
export function verifyFontAsset(cut, bytes) {
  if (bytes.length !== cut.bytes || sha256(bytes) !== cut.sha256)
    throw Error('Native font bytes changed: ' + cut.name);
  const actual = inspectNativeFont(bytes);
  if (actual.weight !== cut.sfntWeight || actual.italic !== cut.italic)
    throw Error('Native font tables changed: ' + cut.name);
  return actual;
}
async function fetched(url, file) {
  if (existsSync(file)) return readFileSync(file);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw Error(`${response.status} ${url}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, bytes);
  return bytes;
}
async function snapshot(commit) {
  if (!/^[a-f0-9]{40}$/.test(commit ?? ''))
    throw Error('--snapshot requires an immutable Expo Google Fonts commit.');
  const inventory = loadOfficialRegistry(),
    items = officialFonts(inventory);
  const catalog = {
    schemaVersion: 1,
    source: { repository: 'https://github.com/expo/google-fonts', commit },
    items: {},
    families: {},
  };
  for (const [id, font] of Object.entries(items)) {
    const slug = font.dependency.split('/')[1];
    catalog.items[id] = { family: slug, upstream: font };
    if (catalog.families[slug]) continue;
    const base = `https://raw.githubusercontent.com/expo/google-fonts/${commit}/font-packages/${slug}/`;
    const index = (
      await fetched(base + 'index.js', path.join(cache, commit, slug, 'index.js'))
    ).toString();
    const metadata = JSON.parse(
      (
        await fetched(base + 'metadata.json', path.join(cache, commit, slug, 'metadata.json'))
      ).toString(),
    );
    const license = (
      await fetched(base + 'LICENSE_FONT', path.join(cache, commit, slug, 'LICENSE_FONT'))
    ).toString();
    const variants = [];
    const sources = [
      ...index.matchAll(/export const ([A-Za-z0-9_]+) = require\('\.\/([A-Za-z0-9_/.]+\.ttf)'\);/g),
    ];
    if (!sources.length) throw Error('No Expo font cuts: ' + slug);
    for (let offset = 0; offset < sources.length; offset += 6)
      await Promise.all(
        sources.slice(offset, offset + 6).map(async ([, name, file]) => {
          const bytes = await fetched(base + file, path.join(cache, commit, slug, file));
          const native = inspectNativeFont(bytes),
            expected = Number(name.match(/_(\d{3})/)?.[1]);
          if (!expected || native.italic !== name.endsWith('_Italic'))
            throw Error('Font naming and sfnt disagree: ' + name);
          if (native.weight !== expected)
            console.log('Provider sfnt weight differs: ' + name + ' / ' + native.weight);
          variants.push({
            name,
            file,
            weight: expected,
            sfntWeight: native.weight,
            italic: native.italic,
            sha256: sha256(bytes),
            bytes: bytes.length,
          });
        }),
      );
    catalog.families[slug] = {
      family: metadata.family,
      license: { file: 'LICENSE_FONT', sha256: sha256(license), text: license },
      variants: variants.sort((a, b) => a.weight - b.weight || Number(a.italic) - Number(b.italic)),
    };
    console.log(`${slug}: ${variants.length} native cuts verified`);
  }
  validateFontCatalog(inventory, catalog);
  writeFileSync(target, gzipSync(JSON.stringify(catalog, null, 2) + '\n'));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf('--snapshot');
  if (index >= 0) await snapshot(process.argv[index + 1]);
  else {
    const catalog = loadNativeFontCatalog();
    validateFontCatalog(loadOfficialRegistry(), catalog);
    if (process.argv.includes('--verify-assets'))
      for (const [family, entry] of Object.entries(catalog.families))
        for (const cut of entry.variants) {
          const file = path.join(cache, catalog.source.commit, family, cut.file);
          const bytes = await fetched(
            `https://raw.githubusercontent.com/expo/google-fonts/${catalog.source.commit}/font-packages/${family}/${cut.file}`,
            file,
          );
          verifyFontAsset(cut, bytes);
        }
    console.log(
      `Verified ${Object.keys(catalog.items).length} native font items / ${Object.values(catalog.families).reduce((total, family) => total + family.variants.length, 0)} real sfnt cuts.`,
    );
  }
}
