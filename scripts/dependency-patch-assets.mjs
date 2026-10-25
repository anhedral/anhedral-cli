import { readFileSync, writeFileSync } from 'node:fs';
import { brotliCompressSync, brotliDecompressSync, constants } from 'node:zlib';
import { fileURLToPath } from 'node:url';
const source = new URL('../assets/patches/node-forge@1.4.0.patch', import.meta.url);
const target = new URL('../assets/patches/node-forge@1.4.0.patch.br', import.meta.url);
export function writeDependencyPatchAssets() {
  const bytes = readFileSync(source),
    compressed = brotliCompressSync(bytes, {
      params: {
        [constants.BROTLI_PARAM_QUALITY]: 11,
        [constants.BROTLI_PARAM_MODE]: constants.BROTLI_MODE_TEXT,
      },
    });
  if (!brotliDecompressSync(compressed, { maxOutputLength: 2 * 1024 * 1024 }).equals(bytes))
    throw Error('Dependency patch compression changed source bytes.');
  writeFileSync(target, compressed);
  return { sourceBytes: bytes.length, packedBytes: compressed.length };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) console.log(writeDependencyPatchAssets());
