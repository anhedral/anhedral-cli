import { resolveStandardProducts } from './resolve.js';
import path from 'node:path';
import { packageNameFromText } from '../render.js';
import type { StandardOptions, StandardProduct } from './types.js';

function readGitFlag(token: string, previous: boolean | undefined): boolean {
  const value = token === '--git';
  if (previous !== undefined && value !== previous) throw new Error('Conflicting Git options.');
  return value;
}

function parseStandardFlags(remaining: readonly string[]) {
  const products = new Set<StandardProduct>();
  const hosting = 'cloudflare' as const;
  let gitSpecified: boolean | undefined;
  for (const token of remaining) {
    if (['--skip-install', '--dry-run', '--json', '--verbose'].includes(token)) continue;
    if (token === '--git' || token === '--no-git') {
      gitSpecified = readGitFlag(token, gitSpecified);
      continue;
    }
    throw new Error(`Unknown init option: ${token}. Run anhedral init --help.`);
  }
  return { products, hosting, gitSpecified };
}

export function parseStandardOptions(args: readonly string[]): StandardOptions {
  const remaining = [...args];
  const hasDirectory = remaining[0] && !remaining[0].startsWith('-');
  const directory = hasDirectory ? remaining.shift() : process.cwd();
  if (!directory || directory.startsWith('-'))
    throw new Error('Specify a valid initialization directory.');
  const root = path.resolve(directory);
  const { products, hosting, gitSpecified } = parseStandardFlags(remaining);
  resolveStandardProducts(products, hosting);
  return {
    root,
    name: packageNameFromText(path.basename(root)),
    products: [...products].sort(),
    hosting,
    skipInstall: remaining.includes('--skip-install'),
    dryRun: remaining.includes('--dry-run'),
    json: remaining.includes('--json'),
    initializeGit: gitSpecified ?? Boolean(hasDirectory),
  };
}
