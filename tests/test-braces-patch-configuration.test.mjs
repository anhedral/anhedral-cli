import { readProjectSection } from '../dist/project-config.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { parse } from 'yaml';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { scaffoldStandardProject, parseStandardOptions } from '../dist/standard.js';
import { addStackItems } from '../dist/registry/add.js';
import { sourceFiles, recordScaffoldFiles } from '../dist/registry/receipt.js';
import { bootstrap } from './support/workspace-bootstrap.mjs';
import { configureDependencyPatches, writeDependencyAudit } from '../dist/dependency-patches.js';

const patch = 'patches/braces@3.0.3.patch';
function fixture(
  lock = "lockfileVersion: '9.0'\npackages:\n  braces@3.0.3:\n    resolution: {integrity: sha512-example}\n",
) {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-braces-config-'));
  writeFileSync(path.join(root, 'package.json'), '{"name":"fixture"}');
  writeFileSync(path.join(root, 'pnpm-lock.yaml'), lock);
  writeFileSync(
    path.join(root, 'pnpm-workspace.yaml'),
    "# customer workspace\npackages: ['apps/*', 'packages/*']\npatchedDependencies:\n  # preserve the customer patch\n  'another-package@1.0.0': patches/customer.patch\nonlyBuiltDependencies: [workerd]\n",
  );
  const policy = () => readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8');
  return { root, policy, close: () => rmSync(root, { recursive: true, force: true }) };
}

test('exact braces patch preserves unrelated YAML and patches, uses bundled bytes and is idempotent', () => {
  const f = fixture();
  try {
    const before = parse(f.policy());
    assert.equal(configureDependencyPatches(f.root), true);
    const source = f.policy();
    const after = parse(source);
    assert.deepEqual(after.packages, before.packages);
    assert.deepEqual(after.onlyBuiltDependencies, before.onlyBuiltDependencies);
    assert.equal(after.patchedDependencies['another-package@1.0.0'], 'patches/customer.patch');
    assert.equal(after.patchedDependencies['braces@3.0.3'], patch);
    assert.match(source, /# customer workspace/);
    assert.match(source, /# preserve the customer patch/);
    assert.deepEqual(
      readFileSync(path.join(f.root, patch)),
      readFileSync(new URL('../assets/patches/braces@3.0.3.patch', import.meta.url)),
    );
    assert.deepEqual(
      readFileSync(path.join(f.root, 'patches/LICENSE.braces')),
      readFileSync(new URL('../assets/patches/LICENSE.braces', import.meta.url)),
    );
    assert.equal(configureDependencyPatches(f.root), false);
    assert.equal(f.policy(), source);
  } finally {
    f.close();
  }
});

for (const version of ['3.0.2', '3.0.4', '3.0.30', '3x0x3'])
  test(`braces ${version} never receives a version-mismatched patch`, () => {
    const f = fixture(
      `lockfileVersion: '9.0'\npackages:\n  braces@${version}:\n    resolution: {integrity: sha512-example}\n`,
    );
    try {
      const before = f.policy();
      assert.equal(configureDependencyPatches(f.root), false);
      assert.equal(f.policy(), before);
      assert.equal(existsSync(path.join(f.root, 'patches')), false);
    } finally {
      f.close();
    }
  });

test('reviewed dependency staging recognizes exact quoted peer-qualified lock entries', () => {
  const f = fixture(
    "lockfileVersion: '9.0'\npackages:\n  'braces@3.0.3(peer@1.0.0)':\n    resolution: {integrity: sha512-example}\n",
  );
  try {
    assert.equal(configureDependencyPatches(f.root), true);
    assert.equal(parse(f.policy()).patchedDependencies['braces@3.0.3'], patch);
    assert.equal(configureDependencyPatches(f.root), false);
  } finally {
    f.close();
  }
});

test('flow-style workspace patch mappings remain intact', () => {
  const f = fixture();
  try {
    writeFileSync(
      path.join(f.root, 'pnpm-workspace.yaml'),
      "packages: ['apps/*']\npatchedDependencies: { 'custom@1.0.0': 'patches/custom.patch' }\n",
    );
    configureDependencyPatches(f.root);
    assert.deepEqual(parse(f.policy()).patchedDependencies, {
      'custom@1.0.0': 'patches/custom.patch',
      'braces@3.0.3': patch,
    });
  } finally {
    f.close();
  }
});

test('customer patch mappings and files are never overwritten', () => {
  const f = fixture();
  try {
    writeFileSync(
      path.join(f.root, 'pnpm-workspace.yaml'),
      'patchedDependencies:\n  braces@3.0.3: patches/custom-braces.patch\n',
    );
    const before = f.policy();
    assert.throws(() => configureDependencyPatches(f.root), /different customer patch/);
    assert.equal(f.policy(), before);
    assert.equal(existsSync(path.join(f.root, 'patches')), false);
    writeFileSync(path.join(f.root, 'pnpm-workspace.yaml'), 'packages: [apps/*]\n');
    mkdirSync(path.join(f.root, 'patches'));
    writeFileSync(path.join(f.root, patch), 'customer patch content');
    assert.throws(() => configureDependencyPatches(f.root), /different customer content/);
    assert.equal(readFileSync(path.join(f.root, patch), 'utf8'), 'customer patch content');
    assert.equal(f.policy(), 'packages: [apps/*]\n');
  } finally {
    f.close();
  }
});

test('legacy package-level patch maps are refused rather than shadowed', () => {
  const f = fixture();
  try {
    writeFileSync(
      path.join(f.root, 'package.json'),
      JSON.stringify({ pnpm: { patchedDependencies: { 'custom@1.0.0': 'patches/custom.patch' } } }),
    );
    const before = f.policy();
    assert.throws(() => configureDependencyPatches(f.root), /must not be shadowed/);
    assert.equal(f.policy(), before);
    assert.equal(existsSync(path.join(f.root, 'patches')), false);
  } finally {
    f.close();
  }
});

test('patch files and directories cannot redirect writes through symlinks', () => {
  const f = fixture();
  const outside = mkdtempSync(path.join(tmpdir(), 'anhedral-braces-outside-'));
  try {
    const before = f.policy();
    symlinkSync(outside, path.join(f.root, 'patches'), 'dir');
    assert.throws(() => configureDependencyPatches(f.root), /real directory/);
    assert.equal(existsSync(path.join(outside, 'braces@3.0.3.patch')), false);
    rmSync(path.join(f.root, 'patches'));
    mkdirSync(path.join(f.root, 'patches'));
    writeFileSync(path.join(outside, 'customer.patch'), 'unchanged');
    symlinkSync(path.join(outside, 'customer.patch'), path.join(f.root, patch));
    assert.throws(() => configureDependencyPatches(f.root), /regular file/);
    assert.equal(readFileSync(path.join(outside, 'customer.patch'), 'utf8'), 'unchanged');
    assert.equal(f.policy(), before);
  } finally {
    f.close();
    rmSync(outside, { recursive: true, force: true });
  }
});

function resolutionRunner(
  events,
  shouldResolveBraces = () => true,
  shouldResolveForge = () => false,
) {
  return (_command, args, cwd) => {
    if (args[0] === 'dlx') {
      bootstrap(path.join(args[args.indexOf('--cwd') + 1], args[args.indexOf('--name') + 1]));
      return;
    }
    if (args.includes('--lockfile-only')) {
      const policy = parse(readFileSync(path.join(cwd, 'pnpm-workspace.yaml'), 'utf8'));
      const coordinates = [
        ...(shouldResolveBraces() ? ['braces@3.0.3'] : []),
        ...(shouldResolveForge() ? ['node-forge@1.4.0'] : []),
      ];
      const configured =
        coordinates.length > 0 &&
        coordinates.every(
          (coordinate) =>
            policy.patchedDependencies?.[coordinate] === `patches/${coordinate}.patch`,
        );
      events.push({ phase: configured ? 'patch-resolution' : 'initial-resolution', args });
      if (configured)
        for (const coordinate of coordinates)
          assert.equal(existsSync(path.join(cwd, `patches/${coordinate}.patch`)), true);
      writeFileSync(
        path.join(cwd, 'pnpm-lock.yaml'),
        "lockfileVersion: '9.0'\n" +
          (coordinates.length
            ? 'packages:\n' +
              coordinates
                .map(
                  (coordinate) => `  ${coordinate}:\n    resolution: {integrity: sha512-example}\n`,
                )
                .join('')
            : ''),
      );
      return;
    }
    if (args.includes('--frozen-lockfile')) {
      events.push({ phase: 'frozen-install', args });
      for (const coordinate of [
        ...(shouldResolveBraces() ? ['braces@3.0.3'] : []),
        ...(shouldResolveForge() ? ['node-forge@1.4.0'] : []),
      ]) {
        assert.equal(
          parse(readFileSync(path.join(cwd, 'pnpm-workspace.yaml'), 'utf8')).patchedDependencies?.[
            coordinate
          ],
          `patches/${coordinate}.patch`,
        );
        assert.equal(existsSync(path.join(cwd, `patches/${coordinate}.patch`)), true);
      }
      return;
    }
    throw new Error(`Unexpected command: ${args}`);
  };
}
async function quietly(action) {
  const previous = console.log;
  console.log = () => {};
  try {
    return await action();
  } finally {
    console.log = previous;
  }
}
function assertPatchReceipt(root) {
  const receipt = readProjectSection(root, 'registry');
  for (const file of [
    patch,
    'patches/LICENSE.braces',
    '.gitattributes',
    'scripts/audit-deps.mjs',
    ...(existsSync(path.join(root, 'patches/node-forge@1.4.0.patch'))
      ? ['patches/node-forge@1.4.0.patch', 'patches/LICENSE.node-forge']
      : []),
  ]) {
    const expected = createHash('sha256')
      .update(readFileSync(path.join(root, file)))
      .digest('hex');
    assert.equal(receipt.files[file], expected);
  }
}

test('init resolves again with the exact patch before frozen install and fingerprints generated bytes', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-braces-init-'));
  try {
    const root = path.join(temp, 'project');
    const events = [];
    await quietly(() =>
      scaffoldStandardProject(
        parseStandardOptions([root, '--no-git', '--json']),
        resolutionRunner(events),
      ),
    );
    assert.deepEqual(
      events.map((event) => event.phase),
      ['initial-resolution', 'patch-resolution', 'frozen-install'],
    );
    assertPatchReceipt(root);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('init fingerprints both reviewed dependency patch assets before frozen installation', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-reviewed-init-'));
  try {
    const root = path.join(temp, 'project');
    const events = [];
    await quietly(() =>
      scaffoldStandardProject(
        parseStandardOptions([root, '--no-git', '--json']),
        resolutionRunner(
          events,
          () => true,
          () => true,
        ),
      ),
    );
    assert.deepEqual(
      events.map((event) => event.phase),
      ['initial-resolution', 'patch-resolution', 'frozen-install'],
    );
    assert.equal(
      parse(readFileSync(path.join(root, 'pnpm-workspace.yaml'), 'utf8')).patchedDependencies[
        'node-forge@1.4.0'
      ],
      'patches/node-forge@1.4.0.patch',
    );
    assertPatchReceipt(root);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('add previews never resolve or write a patch; actual add resolves again and fingerprints it before install', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-braces-add-'));
  try {
    const root = path.join(temp, 'project');
    const events = [];
    let introduceBraces = false;
    const run = resolutionRunner(events, () => introduceBraces);
    await quietly(() =>
      scaffoldStandardProject(
        parseStandardOptions([root, '--skip-install', '--no-git', '--json']),
        run,
      ),
    );
    writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: \"9.0\"\n');
    recordScaffoldFiles(root);
    assert.equal(existsSync(path.join(root, patch)), false);
    assert.deepEqual(
      readFileSync(path.join(root, 'scripts/audit-deps.mjs')),
      readFileSync(new URL('../assets/patches/audit-deps.mjs', import.meta.url)),
    );
    assert.equal(
      JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).scripts['audit:deps'],
      'node scripts/audit-deps.mjs',
    );
    events.length = 0;
    introduceBraces = true;
    const before = sourceFiles(root);
    await addStackItems(root, { items: ['stripe'], dryRun: true, skipInstall: true }, run);
    assert.deepEqual(events, []);
    assert.deepEqual(sourceFiles(root), before);
    assert.equal(existsSync(path.join(root, patch)), false);
    await addStackItems(root, { items: ['stripe'] }, run);
    assert.deepEqual(
      events.map((event) => event.phase),
      ['initial-resolution', 'patch-resolution', 'frozen-install'],
    );
    assert.equal(events[0].args.includes('--ignore-scripts'), true);
    assert.equal(events[1].args.includes('--ignore-scripts'), true);
    assertPatchReceipt(root);
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});

test('a conflicting license notice refuses configuration without writing the patch or changing YAML', () => {
  const f = fixture();
  try {
    mkdirSync(path.join(f.root, 'patches'));
    const notice = path.join(f.root, 'patches/LICENSE.braces');
    writeFileSync(notice, 'customer notice');
    const before = f.policy();
    assert.throws(
      () => configureDependencyPatches(f.root),
      /license notice.*different customer content/,
    );
    assert.equal(existsSync(path.join(f.root, patch)), false);
    assert.equal(readFileSync(notice, 'utf8'), 'customer notice');
    assert.equal(f.policy(), before);
  } finally {
    f.close();
  }
});

test('generated Git attributes preserve customer rules and keep patch bytes stable with autocrlf enabled', () => {
  const f = fixture();
  try {
    const attributes = path.join(f.root, '.gitattributes');
    const existing = '# customer rules\r\n*.bin binary\r\n*.patch text eol=crlf\r\n';
    writeFileSync(attributes, existing);
    configureDependencyPatches(f.root);
    const contents = readFileSync(attributes, 'utf8');
    assert.ok(contents.startsWith(existing));
    assert.ok(
      contents.endsWith(
        '/patches/braces@3.0.3.patch text eol=lf -whitespace\r\n/patches/LICENSE.braces text eol=lf\r\n',
      ),
    );
    assert.equal(configureDependencyPatches(f.root), false);
    assert.equal(readFileSync(attributes, 'utf8'), contents);
    const git = (args) => {
      const result = spawnSync('git', ['-c', 'core.autocrlf=true', ...args], { cwd: f.root });
      assert.equal(result.status, 0, result.stderr.toString());
      return result.stdout;
    };
    git(['init', '--quiet']);
    const attrs = git([
      'check-attr',
      'eol',
      'whitespace',
      '--',
      patch,
      'patches/LICENSE.braces',
    ]).toString();
    assert.match(attrs, /braces@3\.0\.3\.patch: eol: lf/);
    assert.match(attrs, /braces@3\.0\.3\.patch: whitespace: unset/);
    assert.match(attrs, /LICENSE\.braces: eol: lf/);
    const patchBytes = readFileSync(path.join(f.root, patch));
    const licenseBytes = readFileSync(path.join(f.root, 'patches/LICENSE.braces'));
    git(['add', '.gitattributes', patch, 'patches/LICENSE.braces']);
    assert.deepEqual(git(['show', `:${patch}`]), patchBytes);
    rmSync(path.join(f.root, patch));
    rmSync(path.join(f.root, 'patches/LICENSE.braces'));
    git(['checkout-index', '--force', '--all']);
    assert.deepEqual(readFileSync(path.join(f.root, patch)), patchBytes);
    assert.deepEqual(readFileSync(path.join(f.root, 'patches/LICENSE.braces')), licenseBytes);
  } finally {
    f.close();
  }
});

test('Git attributes symlinks are refused before writing patch files or policy', () => {
  const f = fixture();
  const outside = mkdtempSync(path.join(tmpdir(), 'anhedral-braces-attributes-'));
  try {
    const target = path.join(outside, 'customer-attributes');
    writeFileSync(target, '*.patch binary\n');
    symlinkSync(target, path.join(f.root, '.gitattributes'));
    const before = f.policy();
    assert.throws(() => configureDependencyPatches(f.root), /regular file/);
    assert.equal(existsSync(path.join(f.root, patch)), false);
    assert.equal(f.policy(), before);
    assert.equal(readFileSync(target, 'utf8'), '*.patch binary\n');
  } finally {
    f.close();
    rmSync(outside, { recursive: true, force: true });
  }
});

test('every generated profile receives the audit gate even without braces or a local patch', () => {
  const f = fixture("lockfileVersion: '9.0'\n");
  try {
    const before = f.policy();
    writeDependencyAudit(f.root);
    const script = path.join(f.root, 'scripts/audit-deps.mjs');
    assert.deepEqual(
      readFileSync(script),
      readFileSync(new URL('../assets/patches/audit-deps.mjs', import.meta.url)),
    );
    writeDependencyAudit(f.root);
    assert.equal(configureDependencyPatches(f.root), false);
    assert.equal(existsSync(path.join(f.root, patch)), false);
    assert.equal(f.policy(), before);
  } finally {
    f.close();
  }
});

test('audit gate installation preserves different files and rejects symlink destinations', () => {
  const f = fixture();
  const outside = mkdtempSync(path.join(tmpdir(), 'anhedral-audit-script-'));
  try {
    mkdirSync(path.join(f.root, 'scripts'));
    const script = path.join(f.root, 'scripts/audit-deps.mjs');
    writeFileSync(script, '// customer script\n');
    assert.throws(() => writeDependencyAudit(f.root), /different customer content/);
    assert.equal(readFileSync(script, 'utf8'), '// customer script\n');
    rmSync(script);
    const original = path.join(outside, 'audit.mjs');
    writeFileSync(original, '// outside\n');
    symlinkSync(original, script);
    assert.throws(() => writeDependencyAudit(f.root), /regular file/);
    assert.equal(readFileSync(original, 'utf8'), '// outside\n');
  } finally {
    f.close();
    rmSync(outside, { recursive: true, force: true });
  }
});

test('add refuses edited generated audit scripts before committing unrelated changes', async () => {
  const temp = mkdtempSync(path.join(tmpdir(), 'anhedral-audit-add-conflict-'));
  try {
    const root = path.join(temp, 'project');
    const run = resolutionRunner([], () => false);
    await quietly(() =>
      scaffoldStandardProject(
        parseStandardOptions([root, '--skip-install', '--no-git', '--json']),
        run,
      ),
    );
    writeFileSync(path.join(root, 'pnpm-lock.yaml'), 'lockfileVersion: \"9.0\"\n');
    recordScaffoldFiles(root);
    const script = path.join(root, 'scripts/audit-deps.mjs');
    writeFileSync(script, '// edited customer policy\n');
    const before = sourceFiles(root);
    await assert.rejects(
      addStackItems(root, { items: ['stripe'], skipInstall: true }, run),
      /conflicts.*scripts\/audit-deps\.mjs/,
    );
    assert.deepEqual(sourceFiles(root), before);
    assert.equal(readFileSync(script, 'utf8'), '// edited customer policy\n');
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
});
