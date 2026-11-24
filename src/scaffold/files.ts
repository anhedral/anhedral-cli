import { readFileSync } from 'node:fs';
import path from 'node:path';

import type { CapabilityEditor } from '../composition/editor.js';
import { writeFile } from '../util.js';

export function launchTemplate(name: string): string {
  return readFileSync(new URL(`../../assets/launch/${name}`, import.meta.url), 'utf8');
}

export function stackTemplate(name: string): string {
  return readFileSync(new URL(`../../assets/stack/${name}`, import.meta.url), 'utf8');
}

export function json(root: string | CapabilityEditor, file: string, value: unknown): void {
  put(root, file, JSON.stringify(value, null, 2) + '\n');
}

export function put(root: string | CapabilityEditor, file: string, value: string): void {
  if (typeof root === 'string') writeFile(path.join(root, file), value);
  else root.create(file, value);
}

export function workerConfig(name: string, main: string, compatibilityDate: string) {
  return {
    $schema: 'node_modules/wrangler/config-schema.json',
    name,
    main,
    compatibility_date: compatibilityDate,
    compatibility_flags: ['nodejs_compat'],
    observability: { enabled: true },
  };
}
