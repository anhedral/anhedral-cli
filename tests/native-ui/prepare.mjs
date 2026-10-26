import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseStandardOptions, scaffoldStandardProject } from '../../dist/standard.js';
const root = path.dirname(fileURLToPath(import.meta.url));
const target = path.join(root, '.generated');
const temporary = mkdtempSync(path.join(tmpdir(), 'anhedral-native-ui-consumer-'));
const previous = process.env.ANHEDRAL_PLUGIN_DATA;
process.env.ANHEDRAL_PLUGIN_DATA = path.join(temporary, 'catalog');
try {
  const directory = path.join(temporary, 'app');
  const options = {
    ...parseStandardOptions([directory, '--skip-install', '--no-git']),
    products: ['d1', 'expo', 'hono', 'next', 'r2', 'styling'],
  };
  await scaffoldStandardProject(
    options,
    () => {
      throw Error('Native component tests must generate offline source only.');
    },
    { quiet: true },
  );
  rmSync(target, { recursive: true, force: true });
  cpSync(path.join(directory, 'packages/native-ui'), target, { recursive: true });
  cpSync(path.join(directory, 'packages/styling'), path.join(target, 'styling'), {
    recursive: true,
  });
  writeFileSync(path.join(target, 'index.ts'), "export * from './src';\n");
} finally {
  if (previous === undefined) delete process.env.ANHEDRAL_PLUGIN_DATA;
  else process.env.ANHEDRAL_PLUGIN_DATA = previous;
  rmSync(temporary, { recursive: true, force: true });
}
