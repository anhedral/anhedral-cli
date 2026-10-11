import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { WORKER_DEV_PORTS } from '../../dist/dependencies.js';

/** Run two local Workers together and verify that unconfigured public entrypoints stay closed. */
export async function verifyWorkerDevelopment(root) {
  const targets = [
    { app: 'realtime', status: 501 },
    { app: 'workflows', status: 403 },
  ];
  const processes = targets.map((target) => {
    const child = spawn('pnpm', ['--dir', `apps/${target.app}`, 'run', 'dev', '--local'], {
      cwd: root,
      detached: process.platform !== 'win32',
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    });
    const entry = { ...target, child, output: '', error: undefined };
    const capture = (chunk) => {
      entry.output = (entry.output + chunk).slice(-20_000);
    };
    child.stdout.on('data', capture);
    child.stderr.on('data', capture);
    child.on('error', (error) => {
      entry.error = error;
    });
    return entry;
  });
  try {
    await Promise.all(
      processes.map(async (entry) => {
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline) {
          if (entry.error) throw entry.error;
          if (entry.child.exitCode !== null)
            throw new Error(`${entry.app} development exited: ${entry.output}`);
          let response;
          try {
            response = await fetch(`http://127.0.0.1:${WORKER_DEV_PORTS[entry.app].http}`, {
              signal: AbortSignal.timeout(1000),
            });
          } catch {
            await delay(200);
            continue;
          }
          assert.equal(response.status, entry.status, `${entry.app} public entrypoint`);
          await response.arrayBuffer();
          return;
        }
        throw new Error(`${entry.app} development did not start: ${entry.output}`);
      }),
    );
    console.log(
      'Concurrent local Workers started on distinct HTTP/inspector ports and rejected unconfigured public entrypoints',
    );
  } finally {
    for (const { child } of processes) {
      if (child.exitCode !== null || !child.pid) continue;
      try {
        if (process.platform === 'win32') child.kill();
        else process.kill(-child.pid, 'SIGTERM');
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  }
}
