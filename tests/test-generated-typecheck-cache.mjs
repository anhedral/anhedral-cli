import path from 'node:path';
import { verifyTypecheckCache } from './support/typecheck-cache.mjs';
if (!process.argv[2]) throw new Error('Pass an installed generated core workspace.');
verifyTypecheckCache(path.resolve(process.argv[2]));
console.log('Generated API and Next typecheck cache restoration passed.');
