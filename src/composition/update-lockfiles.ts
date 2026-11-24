import { existsSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { globSync } from 'tinyglobby';
import { parse as yaml } from 'yaml';
import { readBoundedFile } from '../bounded-file.js';
import type { CommandRunner } from '../command-types.js';
import { configureDependencyPatches, reviewedPatchFiles } from '../dependency-patches.js';
import { ANHEDRAL_STACK_DEPENDENCIES, CLIENT_DEPENDENCIES } from '../dependencies.js';
import { renderWorkspaceTemplates } from '../launch.js';
import { put } from '../scaffold/files.js';
import {
  pinGeneratedDependencies,
  type ResolutionOptions,
} from '../scaffold/resolve-dependencies.js';
import { assertRelativePath } from '../transactions/paths.js';
import { execFile } from '../util.js';
import { capabilityOrder, usesTauriDesktop, type Capability } from './catalog.js';
import { CapabilityEditor, fingerprint } from './editor.js';

const pnpmLock = 'pnpm-lock.yaml';
const workspace = 'pnpm-workspace.yaml';
const cargoFile = 'apps/desktop/src-tauri/Cargo.toml';
const ignore = ['**/node_modules/**', '**/.git/**', '**/.anhedral-txn/**', '**/target/**'];
const manifestNames = '{package.json,package.yaml,package.json5}';

function workspaceFiles(root: string, patterns: string[]) {
  if (!Array.isArray(patterns)) throw Error('Expected workspace package patterns.');
  const globs = patterns.map((pattern) => {
    if (
      typeof pattern !== 'string' ||
      path.isAbsolute(pattern.replace(/^!/, '')) ||
      pattern.split('/').includes('..')
    )
      throw Error('Workspace package patterns must stay within the project.');
    return pattern.replace(/\/$/, '') + '/' + manifestNames;
  });
  return [
    ...new Set([
      'package.json',
      ...globSync(globs, { cwd: root, dot: true, ignore, followSymbolicLinks: false }).map((file) =>
        path.posix.normalize(file),
      ),
    ]),
  ].sort();
}

export interface UpdateDependencies extends Pick<ResolutionOptions, 'registry' | 'crates'> {
  run?: CommandRunner;
}

/** The package manager sees proposed manifests, existing importers and patch inputs in a disposable workspace. */
export async function planDependencyUpdate(
  editor: CapabilityEditor,
  installed: Capability[],
  options: UpdateDependencies,
) {
  const scratch = realpathSync(mkdtempSync(path.join(tmpdir(), 'anhedral-update-')));
  const archives = new Map<string, string>();
  const additionalChecks: (() => void)[] = [];
  try {
    const baseline = path.join(scratch, 'templates');
    mkdirSync(baseline);
    const template = renderWorkspaceTemplates(
      baseline,
      editor.json('package.json').name,
      capabilityOrder(installed, [], true),
    );
    if (installed.includes('desktop') && usesTauriDesktop(editor)) {
      // Ownership for the former desktop scaffold. Resolve only its original direct pins.
      template.writes.set(
        'apps/desktop/package.json',
        JSON.stringify({
          devDependencies: {
            '@tauri-apps/cli': CLIENT_DEPENDENCIES['@tauri-apps/cli'],
            vite: ANHEDRAL_STACK_DEPENDENCIES.vite,
          },
        }),
      );
      template.writes.set(
        cargoFile,
        '[build-dependencies]\ntauri-build = "=2.7.6"\n\n[dependencies]\ntauri = "=2.12.7"\n',
      );
    }
    const pins = await pinGeneratedDependencies(editor, { ...options, template });
    const stage = path.join(scratch, 'project');
    mkdirSync(stage);
    const copy = (file: string) => {
      assertRelativePath(file);
      const source = editor.read(file);
      if (source !== null) put(stage, file, source);
      return source;
    };
    const collect = (file: string) => {
      const source = readBoundedFile(
        path.join(stage, file),
        file.endsWith('.lock') || file === pnpmLock ? 16 * 1024 * 1024 : 2 * 1024 * 1024,
      ).toString('utf8');
      if (editor.read(file) !== source) editor.writes.set(file, source);
    };
    const policy = yaml(copy(workspace)!);
    const npmrc = copy('.npmrc') ?? '';
    const hooksDisabled =
      policy.ignorePnpmfile === true || /^\s*ignore-pnpmfile\s*=\s*true\s*$/im.test(npmrc);
    if (
      !hooksDisabled &&
      (policy.pnpmfile ||
        policy.globalPnpmfile ||
        /^\s*(?:global-)?pnpmfile\s*=/im.test(npmrc) ||
        editor.read('.pnpmfile.cjs') !== null)
    )
      throw Error(
        'This workspace uses a pnpm hook that can change the dependency graph. Update its lockfile with the project tooling, or use --offline for a source-only update.',
      );
    const patterns = policy.packages ?? ['**'];
    const members = workspaceFiles(editor.root, patterns);
    additionalChecks.push(() => {
      if (JSON.stringify(workspaceFiles(editor.root, patterns)) !== JSON.stringify(members))
        throw Error('Workspace members changed during the update. Preview again.');
    });
    const files = new Set([
      ...members,
      ...[...editor.writes.keys()].filter((file) => path.posix.basename(file) === 'package.json'),
    ]);
    for (const file of files) {
      const source = copy(file);
      if (source === null) throw Error('Missing local package manifest: ' + file);
      if (!file.endsWith('package.json')) continue;
      const manifest = editor.json(file);
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.optionalDependencies,
      };
      for (const spec of Object.values(dependencies)) {
        if (typeof spec !== 'string' || !/^(file|link):/.test(spec)) continue;
        const target = spec.replace(/^(file|link):/, '');
        if (path.posix.isAbsolute(target) || path.win32.isAbsolute(target))
          throw Error('Lockfile previews require workspace-relative local dependencies in ' + file);
        const local = path.posix.join(path.posix.dirname(file), target);
        if (local !== '.') assertRelativePath(local);
        if (local.endsWith('.tgz') || local.endsWith('.tar.gz')) {
          const binary = () => readBoundedFile(editor.file(local), 64 * 1024 * 1024);
          const bytes = binary();
          const digest = fingerprint(bytes);
          archives.set(local, digest);
          mkdirSync(path.dirname(path.join(stage, local)), { recursive: true });
          writeFileSync(path.join(stage, local), bytes);
          additionalChecks.push(() => {
            if (fingerprint(binary()) !== digest)
              throw Error('Local package archive changed. Preview again.');
          });
        } else files.add(path.posix.join(local, 'package.json'));
      }
    }
    copy('.gitattributes');
    copy(pnpmLock);
    for (const patch of new Set([
      ...Object.values(policy.patchedDependencies ?? {}),
      ...Object.values(editor.json('package.json').pnpm?.patchedDependencies ?? {}),
      ...reviewedPatchFiles,
    ])) {
      if (typeof patch !== 'string') throw Error('Expected a workspace-relative pnpm patch file.');
      copy(patch);
    }
    const run = options.run ?? execFile;
    const lock = () =>
      run(
        'pnpm',
        [
          'install',
          '--lockfile-only',
          '--no-frozen-lockfile',
          '--ignore-scripts',
          '--ignore-pnpmfile',
          '--config.lockfile-dir=' + stage,
        ],
        stage,
      );
    lock();
    if (configureDependencyPatches(stage)) lock();
    collect(pnpmLock);
    const importers = yaml(editor.read(pnpmLock)!).importers;
    if (
      !importers ||
      workspaceFiles(stage, patterns).some(
        (file) => !Object.hasOwn(importers, path.posix.dirname(file)),
      ) ||
      Object.keys(importers).some((dir) => path.isAbsolute(dir) || dir.split('/').includes('..'))
    )
      throw Error('pnpm produced a lockfile outside the expected workspace layout.');

    for (const file of [workspace, '.gitattributes', ...reviewedPatchFiles]) {
      if (existsSync(path.join(stage, file))) collect(file);
    }
    if (pins.some((pin) => pin.file === cargoFile)) {
      // Cargo can resolve local path crates from their manifests alone. Empty targets
      // allow target discovery without copying application code or invoking a build.
      const rustFiles = globSync('**/Cargo.toml', {
        cwd: editor.root,
        ignore,
        dot: true,
        followSymbolicLinks: false,
      }).sort();
      for (const file of rustFiles) {
        copy(file);
        const dir = path.posix.dirname(file);
        for (const target of ['build.rs', 'src/lib.rs', 'src/main.rs']) {
          const relative = path.posix.join(dir, target);
          if (existsSync(path.join(editor.root, relative))) put(stage, relative, '');
        }
        copy(path.posix.join(dir, 'Cargo.lock'));
      }
      run('cargo', ['update', '--workspace', '--manifest-path', cargoFile], stage);
      const locks = globSync('**/Cargo.lock', { cwd: stage, ignore, dot: true });
      if (!locks.length) throw Error('Cargo did not produce a lockfile.');
      for (const file of locks) collect(file);
    }
    const verify = () => {
      for (const check of additionalChecks) check();
    };
    verify();
    const inputs = [...editor.before].map(
      ([file, source]) => [file, source === null ? null : fingerprint(source)] as const,
    );
    const inputDigest = fingerprint(
      JSON.stringify([...inputs, ...archives].sort(([a], [b]) => a.localeCompare(b))),
    );
    return { pins, verify, inputDigest };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
