import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
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
export function assertSafeTarget(root: string, relative: string): void {
  if (
    !relative ||
    path.isAbsolute(relative) ||
    relative.includes('\\') ||
    relative
      .split('/')
      .some(
        (part) =>
          !part ||
          part === '.' ||
          part === '..' ||
          part.includes(':') ||
          /[\x00-\x1f]/.test(part) ||
          /[. ]$/.test(part) ||
          /^(?:CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])(?:\.|$)/i.test(part),
      )
  )
    throw new Error(`Unsafe registry target: ${relative}.`);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (existsSync(current) && lstatSync(current).isSymbolicLink())
      throw new Error(`Registry target traverses a symlink: ${relative}.`);
  }
}
