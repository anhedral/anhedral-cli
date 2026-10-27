import { readFileSync, readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Measure emitted runtime modules, not Next's build cache or browser assets.
export function measureWorker(directory, maxGzipBytes) {
  const modules = [];
  function walk(folder) {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      const file = path.join(folder, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (/\.(?:m?js|wasm)$/.test(entry.name)) {
        const bytes = readFileSync(file);
        modules.push({
          path: path.relative(directory, file),
          bytes: bytes.length,
          gzipBytes: gzipSync(bytes).length,
        });
      }
    }
  }
  if (!statSync(path.join(directory, 'worker.js')).isFile())
    throw Error('Missing compiled Worker entrypoint');
  walk(directory);
  const report = {
    schemaVersion: 1,
    measurement:
      'sum of individually gzipped emitted JS/Wasm modules; not provider upload size or isolate memory',
    bytes: modules.reduce((sum, module) => sum + module.bytes, 0),
    gzipBytes: modules.reduce((sum, module) => sum + module.gzipBytes, 0),
    maxGzipBytes,
    modules: modules.sort((a, b) => b.bytes - a.bytes),
  };
  if (!Number.isSafeInteger(maxGzipBytes) || maxGzipBytes <= 0)
    throw Error('Positive integer bundle budget required');
  return { ...report, passed: report.gzipBytes <= maxGzipBytes };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [directory, output, budget] = process.argv.slice(2);
  const report = measureWorker(path.resolve(directory), Number(budget));
  mkdirSync(path.dirname(output), { recursive: true });
  writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
  console.log(
    JSON.stringify({
      gzipBytes: report.gzipBytes,
      maxGzipBytes: report.maxGzipBytes,
      passed: report.passed,
    }),
  );
  if (!report.passed) throw Error('Worker bundle exceeds reviewed budget');
}
