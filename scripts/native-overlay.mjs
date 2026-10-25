import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, brotliDecompressSync, gunzipSync, constants } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export function nativeOverlayFiles(directory = root) {
  const ui = path.join(directory, 'assets/ui');
  const registry = JSON.parse(readFileSync(path.join(ui, 'native/registry.json'), 'utf8'));
  const files = Object.fromEntries(
    [...new Set([...registry.components.map((item) => item.file), ...registry.supportFiles])]
      .sort()
      .map((file) => ['native/' + file, readFileSync(path.join(ui, 'native', file), 'utf8')]),
  );
  for (const file of ['native-fonts.json', 'native-chart-recipes.json'])
    files[file] = gunzipSync(readFileSync(path.join(ui, file + '.gz')), {
      maxOutputLength: 16 * 1024 * 1024,
    }).toString();
  return files;
}
export function writeNativeOverlay(directory = root) {
  const files = nativeOverlayFiles(directory);
  const payload = Buffer.from(JSON.stringify({ schemaVersion: 1, files }));
  const compressed = brotliCompressSync(payload, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: 11,
      [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
    },
  });
  const recovered = JSON.parse(brotliDecompressSync(compressed));
  for (const [file, source] of Object.entries(files))
    if (recovered.files[file] !== source) throw Error('Native overlay compression changed ' + file);
  writeFileSync(path.join(directory, 'assets/ui/native-overlay.json.br'), compressed);
  return {
    files: Object.keys(files).length,
    unpackedSize: payload.length,
    size: compressed.length,
  };
}
