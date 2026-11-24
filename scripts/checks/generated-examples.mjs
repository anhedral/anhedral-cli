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

const stages = ['01-init', '01-web', '02-backend', '03-storage', '04-payment'];
const refresh = process.argv.includes('--write');
const cli = path.resolve('dist/bin.js');
const config = await resolveConfig('package.json');
const scratch = mkdtempSync(path.join(tmpdir(), 'anhedral-examples-'));
const project = (scenario) => path.join(scratch, scenario, 'example-app');
const errors = [];

function run(args, cwd) {
  execFileSync(process.execPath, [cli, ...args, '--skip-install', '--catalog-pins', '--json'], {
    cwd,
  });
}

function initialize(app, preset = []) {
  mkdirSync(path.dirname(app), { recursive: true });
  run(['init', ...preset, app, '--no-git'], scratch);
  // Only the project UUID is random. Keep the identity shared by all snapshots.
  const manifest = path.join(app, 'anhedral.json');
  const state = JSON.parse(readFileSync(manifest, 'utf8'));
  state.identity.id = JSON.parse(
    readFileSync('examples/01-init/anhedral.json', 'utf8'),
  ).identity.id;
  writeFileSync(manifest, JSON.stringify(state, null, 2) + '\n');
}

async function snapshotStage(stage, app) {
  const snapshot = path.join('examples', stage);
  const expected = new Set();
  for (const entry of readdirSync(app, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue;
    const file = path.join(entry.parentPath, entry.name);
    const relative = path.relative(app, file);
    // Generated prose is maintained in the owning templates.
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
    if (!expected.has(path.normalize(file)) && existsSync(file)) {
      if (refresh && readFileSync(file).equals(execFileSync('git', ['show', 'HEAD:' + file])))
        rmSync(file);
      else errors.push('Obsolete example file: ' + file);
    }
  }
}
try {
  const app = project('progressive');
  initialize(app);
  for (const stage of stages) {
    if (stage !== '01-init') run(['add', stage.slice(3)], app);
    await snapshotStage(stage, app);
  }
  const desktop = project('desktop');
  initialize(desktop);
  run(['add', 'desktop'], desktop);
  await snapshotStage('01-desktop', desktop);
  const progression = project('each-addition');
  initialize(progression);
  await snapshotStage('progression/00-init', progression);
  const additions = [
    'web',
    'api',
    'db',
    'auth',
    'mobile',
    'desktop',
    'web-extension',
    'storage',
    'client-sync',
    'cli',
    'payment',
    'in-app-purchases',
    'rtc',
  ];
  const { stack } = JSON.parse(
    execFileSync(process.execPath, [cli, 'stack', 'list', '--json'], { cwd: progression }),
  );
  const catalog = Object.keys(stack.additions)
    .filter((id) => id !== 'backend')
    .sort();
  if (JSON.stringify([...additions].sort()) !== JSON.stringify(catalog))
    throw Error('Update the progression snapshots to cover each individual CLI addition.');
  for (const [index, addition] of additions.entries()) {
    run(['add', addition], progression);
    const number = String(index + 1).padStart(2, '0');
    await snapshotStage('progression/' + number + '-' + addition, progression);
  }
  const all = project('all');
  initialize(all, ['all']);
  await snapshotStage('05-init-all', all);
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Generated examples match and their source is formatted.');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
