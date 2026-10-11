import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { json, readJson } from '../scaffold/files.js';

const excluded = new Set([
  '.pnpm-store',
  '.artifacts',
  '.git',
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  '.turbo',
  'dist',
  '.output',
  '.expo',
  '.fallow',
  '.anhedral',
  '.anhedral.lock',
  '.anhedral-txn',
  'anhedral.registry.json',
]);
export function sourceFiles(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const visit = (directory: string): void => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const relative = directory ? `${directory}/${entry.name}` : entry.name;
      // Local credentials are never seeded into an addition transaction or fingerprint receipt.
      if (/^(?:\.env|\.dev\.vars)(?:\.|$)/.test(entry.name) && !entry.name.endsWith('.example'))
        continue;
      if (entry.isSymbolicLink()) throw new Error(`Source symlinks are unsupported: ${relative}.`);
      if (entry.isDirectory()) visit(relative);
      else if (entry.isFile())
        files.set(
          relative,
          createHash('sha256')
            .update(readFileSync(path.join(root, relative)))
            .digest('hex'),
        );
    }
  };
  visit('');
  return files;
}
export function recordScaffoldFiles(root: string): void {
  const receipt = readJson(root, 'anhedral.registry.json');
  json(root, 'anhedral.registry.json', {
    ...receipt,
    files: Object.fromEntries(sourceFiles(root)),
  });
}
