import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildPluginArchive } from '../scripts/package-plugin.mjs';
import { readStoredArchive } from '../scripts/publish-plugin-source.mjs';

// Explicit offline host acceptance, never part of an automatic network matrix.
// Supply an exact previous release ZIP; the current generated plugin is packaged
// through the same builder as release artifacts. All host state lives in tmpdir.
const enabled = process.env.ANHEDRAL_RUN_PLUGIN_UPDATE_ACCEPTANCE === '1';
const previousArchive = process.env.ANHEDRAL_PLUGIN_PREVIOUS_ARCHIVE;
const codex = process.env.ANHEDRAL_CODEX_BIN || 'codex';
const claude = process.env.ANHEDRAL_CLAUDE_BIN || 'claude';

function run(binary, args, cwd, env) {
  const result = spawnSync(binary, args, { cwd, env, encoding: 'utf8', timeout: 30000 });
  assert.equal(
    result.status,
    0,
    `${binary} ${args.join(' ')}: ${result.stderr || result.stdout || result.error?.message}`,
  );
  return result.stdout;
}
function installFiles(root, files) {
  for (const file of files) {
    const destination = path.join(root, 'plugins/anhedral', file.name);
    mkdirSync(path.dirname(destination), { recursive: true });
    writeFileSync(destination, file.contents);
  }
}
function manifests(root, url, ref, version) {
  const source = { source: 'git-subdir', url, path: 'plugins/anhedral', ref };
  for (const [name, manifest] of [
    [
      '.agents/plugins/marketplace.json',
      {
        name: 'anhedral-update-fixture',
        plugins: [{ name: 'anhedral', source, policy: { installation: 'AVAILABLE' } }],
      },
    ],
    [
      '.claude-plugin/marketplace.json',
      {
        name: 'anhedral-update-fixture',
        owner: { name: 'Fixture' },
        plugins: [{ name: 'anhedral', description: 'Offline fixture', version, source }],
      },
    ],
  ]) {
    const file = path.join(root, name);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify(manifest));
  }
}

test(
  'real plugin hosts update an installed immutable old release to the new package',
  {
    skip: !enabled
      ? 'Set ANHEDRAL_RUN_PLUGIN_UPDATE_ACCEPTANCE=1 and ANHEDRAL_PLUGIN_PREVIOUS_ARCHIVE for isolated host acceptance'
      : false,
    timeout: 180000,
  },
  () => {
    assert.ok(previousArchive, 'An exact previous published plugin ZIP is required');
    const oldFiles = readStoredArchive(readFileSync(previousArchive));
    const newArchive = process.env.ANHEDRAL_PLUGIN_CURRENT_ARCHIVE;
    const newFiles = readStoredArchive(
      newArchive
        ? readFileSync(newArchive)
        : buildPluginArchive(path.resolve(import.meta.dirname, '..')).contents,
    );
    const version = (files) =>
      JSON.parse(files.find((f) => f.name === 'plugin.json').contents).version;
    const oldVersion = version(oldFiles),
      newVersion = version(newFiles);
    assert.notEqual(oldVersion, newVersion);
    const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-update-'));
    try {
      const repo = path.join(root, 'marketplace');
      mkdirSync(repo);
      const url = 'https://anhedral-plugin-update.invalid/marketplace.git';
      const env = {
        ...process.env,
        HOME: path.join(root, 'home'),
        CODEX_HOME: path.join(root, 'codex'),
        CLAUDE_CONFIG_DIR: path.join(root, 'claude'),
        XDG_CONFIG_HOME: path.join(root, 'xdg'),
        GIT_CONFIG_NOSYSTEM: '1',
        GIT_CONFIG_GLOBAL: '/dev/null',
        GIT_TERMINAL_PROMPT: '0',
        GIT_CONFIG_COUNT: '2',
        GIT_CONFIG_KEY_0: `url.file://${repo}.insteadOf`,
        GIT_CONFIG_VALUE_0: url,
        GIT_CONFIG_KEY_1: 'protocol.file.allow',
        GIT_CONFIG_VALUE_1: 'always',
      };
      for (const key of ['HOME', 'CODEX_HOME', 'CLAUDE_CONFIG_DIR', 'XDG_CONFIG_HOME'])
        mkdirSync(env[key]);
      const git = (...args) => run('git', args, repo, env).trim();
      git('init', '-b', 'main');
      git('config', 'user.name', 'Plugin acceptance fixture');
      git('config', 'user.email', ['fixture', 'example.invalid'].join('@'));
      git('config', 'core.hooksPath', '/dev/null');
      const commit = (message) => {
        git('add', '.');
        git('commit', '-m', message);
        return git('rev-parse', 'HEAD');
      };
      installFiles(repo, oldFiles);
      const oldRef = commit('old immutable plugin');
      git('tag', `plugin-v${oldVersion}`, oldRef);
      manifests(repo, url, `plugin-v${oldVersion}`, oldVersion);
      commit('old marketplace pointer');
      const hasCodex = spawnSync(codex, ['--version'], { env, encoding: 'utf8' }).status === 0;
      const hasClaude = spawnSync(claude, ['--version'], { env, encoding: 'utf8' }).status === 0;
      assert.ok(hasCodex || hasClaude, 'At least one real plugin host must be installed');
      const id = ['anhedral', 'anhedral-update-fixture'].join('@');
      if (hasCodex) {
        run(codex, ['plugin', 'marketplace', 'add', url, '--ref', 'main', '--json'], root, env);
        const added = run(codex, ['plugin', 'add', id, '--json'], root, env);
        assert.ok(added.includes(oldVersion), added);
      }
      if (hasClaude) {
        run(claude, ['plugin', 'marketplace', 'add', url], root, env);
        run(claude, ['plugin', 'install', id], root, env);
        assert.ok(run(claude, ['plugin', 'list', '--json'], root, env).includes(oldVersion));
      }
      rmSync(path.join(repo, 'plugins/anhedral'), { recursive: true });
      installFiles(repo, newFiles);
      const newRef = commit('new immutable plugin');
      git('tag', `plugin-v${newVersion}`, newRef);
      manifests(repo, url, `plugin-v${newVersion}`, newVersion);
      commit('new marketplace pointer');
      if (hasCodex) {
        run(
          codex,
          ['plugin', 'marketplace', 'upgrade', 'anhedral-update-fixture', '--json'],
          root,
          env,
        );
        const upgraded = run(codex, ['plugin', 'add', id, '--json'], root, env);
        assert.ok(upgraded.includes(newVersion), upgraded);
      }
      if (hasClaude) {
        run(claude, ['plugin', 'marketplace', 'update', 'anhedral-update-fixture'], root, env);
        run(claude, ['plugin', 'update', id], root, env);
        assert.ok(run(claude, ['plugin', 'list', '--json'], root, env).includes(newVersion));
      }
      console.log(
        JSON.stringify({
          oldVersion,
          newVersion,
          codex: hasCodex,
          claude: hasClaude,
          oldRef,
          newRef,
          restartRequiredForExistingSessions: true,
        }),
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  },
);
