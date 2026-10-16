import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';

// Observe close/error immediately: a failed preview may exit before assertions finish.
export function launchPreview(command, args, options) {
  const child = spawn(command, args, {
    ...options,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const kill = (signal) => {
    if (!child.pid) return;
    if (process.platform === 'win32') {
      spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' }).on(
        'error',
        () => {},
      );
    } else {
      try {
        process.kill(-child.pid, signal);
      } catch (error) {
        if (error.code !== 'ESRCH') throw error;
      }
    }
  };
  let output = '';
  let failure;
  let finished = false;
  const closed = new Promise((resolve) => {
    child.once('error', (error) => {
      failure = error;
    });
    child.once('close', () => {
      finished = true;
      resolve();
    });
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      output = (output + chunk).slice(-64 * 1024);
    });
  }
  return {
    async address(timeout = 30000) {
      const deadline = Date.now() + timeout;
      while (Date.now() < deadline) {
        if (failure) throw failure;
        if (finished || child.exitCode !== null || child.signalCode !== null)
          throw new Error(`Preview exited: ${output}`);
        const address = output.match(/http:\/\/127\.0\.0\.1:\d+\//)?.[0];
        if (address) return address;
        await delay(25);
      }
      throw new Error(`Preview did not start: ${output}`);
    },
    async stop(grace = 2000) {
      if (finished) return;
      async function wait(timeout) {
        let timer;
        try {
          return await Promise.race([
            closed.then(() => true),
            new Promise((resolve) => {
              timer = setTimeout(() => resolve(false), timeout);
            }),
          ]);
        } finally {
          clearTimeout(timer);
        }
      }
      kill('SIGTERM');
      if (await wait(grace)) return;
      kill('SIGKILL');
      if (!(await wait(grace))) throw new Error('Preview process did not close after SIGKILL.');
    },
  };
}
