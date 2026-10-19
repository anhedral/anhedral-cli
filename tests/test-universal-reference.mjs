import path from 'node:path';
import { verifyUniversalDevelopment } from './support/universal-dev-smoke.mjs';

const root = path.resolve(import.meta.dirname, '../examples/universal-reference');
await verifyUniversalDevelopment(root, { browser: process.argv.includes('--browser') });
