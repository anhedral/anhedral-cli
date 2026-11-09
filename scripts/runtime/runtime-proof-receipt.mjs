import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readBoundedFile } from '../../dist/bounded-file.js';
export function prepareRuntimeProof({ root, output, source, generator, tools, limits = [] }) {
  const bytes = readBoundedFile(path.join(root, 'pnpm-lock.yaml'), 16 * 1024 * 1024);
  const receipt = {
    schemaVersion: 1,
    source,
    generator,
    tools,
    lock: {
      filename: 'generated-pnpm-lock.yaml',
      sha256: createHash('sha256').update(bytes).digest('hex'),
      bytes: bytes.length,
    },
    status: 'prepared',
    limits,
  };
  mkdirSync(output, { recursive: true });
  writeFileSync(path.join(output, receipt.lock.filename), bytes);
  writeFileSync(
    path.join(output, 'runtime-evidence.json'),
    JSON.stringify(receipt, null, 2) + '\n',
  );
  return receipt;
}
export function finishRuntimeProof(output, status) {
  if (!['passed', 'failed'].includes(status))
    throw Error('Runtime proof completion must pass or fail');
  const file = path.join(output, 'runtime-evidence.json');
  if (!existsSync(file)) return;
  const receipt = JSON.parse(readFileSync(file, 'utf8'));
  receipt.status = status;
  writeFileSync(file, JSON.stringify(receipt, null, 2) + '\n');
  return receipt;
}
