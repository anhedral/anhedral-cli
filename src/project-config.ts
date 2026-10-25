import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
export const PROJECT_CONFIG_FILE = 'anhedral.json';
/** Called only inside a fresh staged workspace. Contains nonsecret generation provenance. */
export function writeProjectSection(root: string, section: string, value: unknown): void {
  const file = path.join(root, PROJECT_CONFIG_FILE);
  let previous: Record<string, unknown> = {};
  try {
    previous = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
  writeFileSync(
    file,
    JSON.stringify({ ...previous, schemaVersion: 1, [section]: value }, null, 2) + '\n',
  );
}
