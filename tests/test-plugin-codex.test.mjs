import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createInterface } from 'node:readline';
import test from 'node:test';
import { buildPluginArchive } from '../scripts/plugin/package-plugin.mjs';
import { readStoredArchive } from '../scripts/plugin/publish-plugin-source.mjs';

// Host acceptance is optional on CI images without Codex, but exercises the real
// loader when installed. No model inference, credentials or live OAuth is needed.
const binary = process.env.ANHEDRAL_CODEX_BIN || 'codex';
const available = spawnSync(binary, ['--version'], { encoding: 'utf8', timeout: 10000 });
test(
  'Codex installs the exact plugin archive and discovers both CLI skills without remote connections',
  {
    skip: available.error?.code === 'ENOENT' ? 'Codex CLI is unavailable' : false,
    timeout: 30000,
  },
  async () => {
    assert.equal(available.status, 0, available.stderr);
    const root = mkdtempSync(path.join(tmpdir(), 'anhedral-codex-host-'));
    let server;
    try {
      const home = path.join(root, 'home');
      mkdirSync(home);
      const env = { ...process.env, CODEX_HOME: home };
      const { contents } = buildPluginArchive(path.resolve(import.meta.dirname, '..'));
      for (const file of readStoredArchive(contents)) {
        const destination = path.join(root, 'plugin', file.name);
        mkdirSync(path.dirname(destination), { recursive: true });
        writeFileSync(destination, file.contents);
      }
      const marketplacePath = path.join(root, '.agents/plugins/marketplace.json');
      mkdirSync(path.dirname(marketplacePath), { recursive: true });
      writeFileSync(
        marketplacePath,
        JSON.stringify({
          name: 'anhedral-host-test',
          plugins: [
            {
              name: 'anhedral',
              source: { source: 'local', path: './plugin' },
              policy: { installation: 'AVAILABLE' },
            },
          ],
        }),
      );
      for (const args of [
        ['plugin', 'marketplace', 'add', root, '--json'],
        ['plugin', 'add', 'anhedral@anhedral-host-test', '--json'],
      ]) {
        const result = spawnSync(binary, args, {
          cwd: root,
          env,
          encoding: 'utf8',
          timeout: 10000,
        });
        assert.equal(result.status, 0, result.stderr || result.error?.message);
      }
      server = spawn(binary, ['app-server', '--stdio'], {
        cwd: root,
        env,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      const pending = new Map();
      let diagnostics = '';
      server.stderr.on('data', (chunk) => {
        diagnostics += chunk;
      });
      const lines = createInterface({ input: server.stdout });
      let serverError;
      function failRequests(error) {
        serverError = error;
        for (const { reject } of pending.values()) reject(error);
        pending.clear();
      }
      server.on('error', failRequests);
      server.on('exit', (code) =>
        failRequests(new Error(`Codex exited (${code}): ${diagnostics}`)),
      );
      server.stdin.on('error', failRequests);
      lines.on('line', (line) => {
        try {
          const message = JSON.parse(line);
          if (pending.has(message.id)) {
            const { resolve } = pending.get(message.id);
            pending.delete(message.id);
            resolve(message);
          }
        } catch (error) {
          failRequests(error);
        }
      });
      let nextId = 0;
      async function request(method, params) {
        if (serverError) throw serverError;
        const id = ++nextId;
        const response = new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
        server.stdin.write(JSON.stringify({ id, method, params }) + '\n');
        let timer;
        try {
          const message = await Promise.race([
            response,
            new Promise((_, reject) => {
              timer = setTimeout(
                () => reject(new Error(`Codex ${method} timed out: ${diagnostics}`)),
                10000,
              );
            }),
          ]);
          assert.equal(message.error, undefined, JSON.stringify(message.error));
          return message.result;
        } finally {
          clearTimeout(timer);
          pending.delete(id);
        }
      }
      await request('initialize', {
        clientInfo: { name: 'anhedral-host-test', version: '1.0' },
        capabilities: { experimentalApi: true },
      });
      const { plugin } = await request('plugin/read', { marketplacePath, pluginName: 'anhedral' });
      assert.equal(plugin.summary.enabled, true);
      assert.deepEqual(plugin.mcpServers, []);
      assert.deepEqual(plugin.apps, []);
      assert.deepEqual(plugin.hooks, []);
      const result = await request('skills/list', { cwds: [root], forceReload: true });
      const skills = result.data.flatMap((item) => {
        assert.deepEqual(item.errors, []);
        return item.skills.filter((skill) => skill.pluginId === 'anhedral@anhedral-host-test');
      });
      assert.deepEqual(skills.map((skill) => skill.name).sort(), [
        'anhedral:anhedral-design',
        'anhedral:anhedral-init',
      ]);
      assert.ok(skills.every((skill) => skill.enabled));
      assert.doesNotMatch(diagnostics, /failed to parse plugin MCP server/);
    } finally {
      if (server && server.exitCode === null && server.signalCode === null) {
        let timer;
        const exited = new Promise((resolve) => server.once('close', resolve));
        server.kill();
        try {
          await Promise.race([
            exited,
            new Promise((resolve) => {
              timer = setTimeout(() => {
                server.kill('SIGKILL');
                resolve();
              }, 1500);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      }
      rmSync(root, { recursive: true, force: true });
    }
  },
);
