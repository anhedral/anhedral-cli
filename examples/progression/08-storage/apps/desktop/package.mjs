import { writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { packager } from '@electron/packager';

const require = createRequire(import.meta.url);
const { productName, version } = require('./package.json');
await writeFile(
  'out/package.json',
  JSON.stringify({ name: productName, version, type: 'module', main: 'main/index.js' }),
);
await packager({
  name: productName,
  dir: 'out',
  out: 'release',
  electronVersion: require('electron/package.json').version,
  asar: true,
  prune: false,
  overwrite: true,
});
