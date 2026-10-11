import { resolveStandardProducts } from './resolve.js';
import path from 'node:path';
import { packageNameFromText } from '../render.js';
import { STANDARD_PRODUCTS } from '../stack-registry.js';
import type { StandardOptions, StandardProduct } from './types.js';

function readGitFlag(token: string, previous: boolean | undefined): boolean {
  const value = token === '--git';
  if (previous !== undefined && value !== previous) throw new Error('Conflicting Git options.');
  return value;
}

function readHostingFlag(
  value: string | undefined,
  previous: StandardOptions['hosting'],
  specified: boolean,
): StandardOptions['hosting'] {
  if (value !== 'cloudflare' && value !== 'vercel')
    throw new Error('hosting must be cloudflare or vercel.');
  if (specified && previous !== value) throw new Error('Conflicting hosting options.');
  return value;
}

function parseStandardFlags(remaining: readonly string[]) {
  const products = new Set<StandardProduct>();
  let hosting: StandardOptions['hosting'] = 'cloudflare';
  let hostingSpecified = false;
  let gitSpecified: boolean | undefined;
  for (let index = 0; index < remaining.length; index++) {
    const token = remaining[index];
    if (['--skip-install', '--dry-run', '--json', '--verbose'].includes(token)) continue;
    if (token === '--git' || token === '--no-git') {
      gitSpecified = readGitFlag(token, gitSpecified);
      continue;
    }
    if (token === '--hosting' || token.startsWith('--hosting=')) {
      const value = token === '--hosting' ? remaining[++index] : token.slice('--hosting='.length);
      hosting = readHostingFlag(value, hosting, hostingSpecified);
      hostingSpecified = true;
      continue;
    }
    const value = token.replace(/^--/, '');
    if (!STANDARD_PRODUCTS.includes(value as StandardProduct)) {
      throw new Error(`Unknown standard product: ${token}. Select only required products.`);
    }
    products.add(value as StandardProduct);
  }
  if (!hostingSpecified && products.has('next')) hosting = 'vercel';
  return { products, hosting, hostingSpecified, gitSpecified };
}

export function parseStandardOptions(
  command: 'new' | 'init',
  args: readonly string[],
): StandardOptions {
  const remaining = [...args];
  const directory = command === 'new' ? remaining.shift() : process.cwd();
  if (!directory || directory.startsWith('-'))
    throw new Error('new requires a destination directory.');
  const root = path.resolve(directory);
  const { products, hosting, hostingSpecified, gitSpecified } = parseStandardFlags(remaining);
  resolveStandardProducts(products, hosting, hostingSpecified);
  return {
    root,
    name: packageNameFromText(path.basename(root)),
    products: [...products].sort(),
    hosting,
    skipInstall: remaining.includes('--skip-install'),
    dryRun: remaining.includes('--dry-run'),
    json: remaining.includes('--json'),
    initializeGit: gitSpecified ?? command === 'new',
  };
}
