import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { writeFile } from './util.js';

function policyBlock(key: string): RegExp {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `^(?:${escaped}|"${escaped}"|'${escaped}')[ \\t]*:.*(?:\\r?\\n|$)(?:[ \\t]+[^\\n]*(?:\\n|$)|#[^\\n]*(?:\\n|$)|[ \\t]*\\n)*`,
    'gm',
  );
}

/** Preserve unrelated starter YAML while replacing the settings this initializer owns. */
export function setPnpmPolicy(root: string, policy: Record<string, unknown>): void {
  const file = path.join(root, 'pnpm-workspace.yaml');
  let source = existsSync(file) ? readFileSync(file, 'utf8') : '';
  for (const [key, value] of Object.entries(policy)) {
    source = source.replace(policyBlock(key), '');
    if (value === undefined) continue;
    source += `${source.endsWith('\n') || !source ? '' : '\n'}${key}: ${JSON.stringify(value)}\n`;
  }
  writeFile(file, source);
}
