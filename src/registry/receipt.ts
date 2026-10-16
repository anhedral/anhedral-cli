import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import {
  PROJECT_CONFIG_FILE,
  readProjectConfig,
  readProjectSection,
  writeProjectSection,
} from '../project-config.js';

const excluded = new Set([
  '.pnpm-store',
  '.artifacts',
  '.git',
  'node_modules',
  '.next',
  '.open-next',
  '.wrangler',
  '.void',
  '.vinext',
  '.void-wrangler.jsonc',
  '.turbo',
  'dist',
  '.output',
  '.expo',
  '.fallow',
  '.anhedral',
  '.anhedral-audit-report.json',
  '.anhedral.lock',
  '.anhedral-txn',
  PROJECT_CONFIG_FILE,
]);
export function sourceFiles(root: string): Map<string, string> {
  const files = new Map<string, string>();
  const visit = (directory: string): void => {
    for (const entry of readdirSync(path.join(root, directory), { withFileTypes: true })) {
      if (excluded.has(entry.name)) continue;
      const relative = directory ? `${directory}/${entry.name}` : entry.name;
      // Deployment mirrors are disposable; reviewed SQL lives in packages/db/drizzle.
      if (/^apps\/[^/]+\/db\/migrations$/.test(relative)) continue;
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
export function configurationFingerprints(root: string): Record<string, string> {
  return Object.fromEntries(
    Object.entries(readProjectConfig(root))
      .filter(([section]) => !['schemaVersion', 'registry'].includes(section))
      .map(([section, value]) => [
        section,
        createHash('sha256').update(JSON.stringify(value)).digest('hex'),
      ]),
  );
}
export function recordScaffoldFiles(root: string): void {
  const receipt = readProjectSection(root, 'registry');
  writeProjectSection(root, 'registry', {
    ...receipt,
    files: Object.fromEntries(sourceFiles(root)),
    configuration: configurationFingerprints(root),
  });
}
