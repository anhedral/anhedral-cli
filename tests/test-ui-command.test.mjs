import assert from 'node:assert/strict';
import test from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { scaffoldAnhedralStack, parseInitOptions } from '../dist/index.js';
import { detectUiTargets } from '../dist/ui-project.js';
import { resolveUiItems } from '../dist/ui-catalog.js';
import { runUiCommand } from '../dist/ui-command.js';
async function fixture() {
  const base = mkdtempSync(path.join(tmpdir(), 'anhedral-ui-'));
  const root = path.join(base, 'app');
  await scaffoldAnhedralStack(
    parseInitOptions([root, '--skip-install', '--no-git']),
    () => {
      throw Error('Network forbidden');
    },
    { quiet: true },
  );
  return { base, root, web: path.join(root, 'apps/web') };
}
async function inside(root, fn) {
  const before = process.cwd();
  process.chdir(root);
  try {
    return await fn();
  } finally {
    process.chdir(before);
  }
}
test('target discovery and UI resolution support only the Anhedral Stack web foundation', async () => {
  const { base, root, web } = await fixture();
  try {
    mkdirSync(path.join(root, 'apps/mobile'), { recursive: true });
    writeFileSync(
      path.join(root, 'apps/mobile/package.json'),
      JSON.stringify({ dependencies: { expo: '56.0.12' } }),
    );
    assert.deepEqual(
      detectUiTargets(root).map((t) => t.root),
      [realpathSync(web)],
    );
    assert.equal(resolveUiItems(['button'], 'web')[0].source, 'shadcn');
    assert.throws(() => resolveUiItems(['button'], 'native'), /Only.*web/);
    assert.throws(() => resolveUiItems(['../button'], 'web'), /Invalid component/);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
test('a dry-run never invokes upstream tooling or changes customer files', async () => {
  const { base, root, web } = await fixture();
  try {
    const before = readdirSync(web).sort();
    const styles = readFileSync(path.join(web, 'src/styles.css'), 'utf8');
    await inside(root, () =>
      runUiCommand(['add', 'button', '--dry-run'], { quiet: true }, () => {
        throw Error('Unexpected installer');
      }),
    );
    assert.deepEqual(readdirSync(web).sort(), before);
    assert.equal(readFileSync(path.join(web, 'src/styles.css'), 'utf8'), styles);
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
test('upstream runner declines each overwrite prompt without losing subsequent answers', async () => {
  const { base, web: root } = await fixture();
  const previousPath = process.env.PATH;
  try {
    const bin = path.join(root, 'bin');
    mkdirSync(bin);
    const script = `#!/usr/bin/env node
let answers = 0;
const ask = () => process.stdout.write('The file already exists. Would you like to overwrite? › \\u001b[90m(y/N)\\u001b[39m');
process.stdin.setEncoding('utf8');
process.stdin.on('data', (value) => {
  if (value.trim() !== 'n') process.exit(2);
  answers++;
  if (answers === 2) { process.stdout.write('\\nSkipped 2 files: consumer files preserved.\\n'); }
  else setTimeout(ask, 20);
});
process.stdin.on('end', () => process.exit(answers === 2 ? 0 : 3));
ask();
`;
    writeFileSync(path.join(bin, 'pnpm'), script, { mode: 0o755 });
    writeFileSync(path.join(bin, 'pnpm.cjs'), script);
    process.env.PATH = bin + path.delimiter + previousPath;
    await inside(root, () => runUiCommand(['add', 'button', 'card'], { quiet: true }));
    assert.ok(existsSync(path.join(root, '.anhedral-ui.json')));
  } finally {
    process.env.PATH = previousPath;
    rmSync(base, { recursive: true, force: true });
  }
});
