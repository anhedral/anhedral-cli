import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { check, resolveConfig } from 'prettier';

const stages = ['01-init', '02-backend', '03-storage', '04-payment'];
const refresh = process.argv.includes('--write');
const cli = path.resolve('dist/bin.js');
const config = await resolveConfig('package.json');
const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-examples-'));
const app = path.join(scratch, 'example-app');
const errors = [];

function run(args, cwd) {
  execFileSync(process.execPath, [cli, ...args, '--skip-install', '--json'], { cwd });
}

try {
  run(['init', app, '--no-git'], scratch);
  // Only the project UUID is random. Keep the identity shared by the four snapshots.
  const manifest = path.join(app, 'anhedral.json');
  const state = JSON.parse(readFileSync(manifest, 'utf8'));
  state.identity.id = JSON.parse(
    readFileSync('examples/01-init/anhedral.json', 'utf8'),
  ).identity.id;
  writeFileSync(manifest, JSON.stringify(state, null, 2) + '\n');

  for (const stage of stages) {
    if (stage !== '01-init') run(['add', stage.slice(3)], app);
    const snapshot = path.join('examples', stage);
    const expected = new Set();
    for (const entry of readdirSync(app, { recursive: true, withFileTypes: true })) {
      if (!entry.isFile()) continue;
      const file = path.join(entry.parentPath, entry.name);
      const relative = path.relative(app, file);
      // Keep generated prose in its owning guide and the init snapshot.
      if (stage !== '01-init' && relative.endsWith('.md')) continue;
      const destination = path.join(snapshot, relative);
      expected.add(destination);
      const source = readFileSync(file);
      if (
        /\.(?:[cm]?[jt]sx?|css)$/.test(file) &&
        !(await check(source.toString('utf8'), { ...config, filepath: file }))
      ) {
        errors.push('Unformatted generator output: ' + destination);
      }
      if (existsSync(destination) && source.equals(readFileSync(destination))) continue;
      if (refresh) {
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, source);
      } else errors.push('Outdated or missing example: ' + destination);
    }
    const tracked = execFileSync('git', ['ls-files', '-z', '--', snapshot], { encoding: 'utf8' });
    for (const file of tracked.split('\0').filter(Boolean)) {
      if (!expected.has(path.normalize(file))) errors.push('Obsolete example file: ' + file);
    }
  }
  if (errors.length) throw Error(errors.join('\n'));
  console.log('All four generated examples match and their source is formatted.');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
