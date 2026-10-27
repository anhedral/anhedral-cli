import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { format } from 'prettier';
const directory = new URL('../assets/stack/', import.meta.url);
let failed = false;
for (const name of readdirSync(directory)) {
  if (!/\.(?:tsx?|js|json|css)\.txt$/.test(name)) continue;
  const file = new URL(name, directory);
  const current = readFileSync(file, 'utf8');
  const expected = await format(current, {
    filepath: name.slice(0, -4),
    ...JSON.parse(readFileSync(new URL('../.prettierrc.json', import.meta.url), 'utf8')),
  });
  if (current !== expected) {
    if (process.argv.includes('--write')) writeFileSync(file, expected);
    else {
      console.error('Unformatted stack template: ' + name);
      failed = true;
    }
  }
}
if (failed) process.exitCode = 1;
