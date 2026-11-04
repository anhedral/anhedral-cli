import path from 'node:path';
import { verifyTypecheckCache } from './support/typecheck-cache.mjs';
if (!process.argv[2]) throw new Error('Pass an installed generated Anhedral Stack workspace.');
verifyTypecheckCache(path.resolve(process.argv[2]));
console.log('Generated API and TanStack typecheck cache restoration passed.');
