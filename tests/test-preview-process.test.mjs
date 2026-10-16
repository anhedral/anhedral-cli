import assert from 'node:assert/strict';
import { test } from 'node:test';
import { launchPreview } from './support/preview-process.mjs';

const launch = (source) => launchPreview(process.execPath, ['-e', source]);

test(
  'preview cleanup completes after startup fails and after repeated cleanup',
  { timeout: 5000 },
  async () => {
    const preview = launch('console.error("build failed"); process.exit(1)');
    await assert.rejects(preview.address(), /Preview exited:.*build failed/s);
    await preview.stop();
    await preview.stop();
  },
);

test(
  'preview spawn errors are observed without an unhandled error event',
  { timeout: 5000 },
  async () => {
    const preview = launchPreview('/anhedral-missing-preview-executable', []);
    await assert.rejects(preview.address(), /ENOENT/);
    await preview.stop();
  },
);

test('preview cleanup kills a server that ignores termination', { timeout: 5000 }, async () => {
  const preview = launch(`
    process.on('SIGTERM', () => {});
    console.log('http://127.0.0.1:12345/');
    setInterval(() => {}, 1000);
  `);
  try {
    assert.equal(await preview.address(), 'http://127.0.0.1:12345/');
  } finally {
    await preview.stop(100);
  }
});

test('preview startup timeout retains only bounded diagnostics', { timeout: 5000 }, async () => {
  const preview = launch('console.log("x".repeat(1024 * 1024)); setInterval(() => {}, 1000)');
  try {
    await assert.rejects(preview.address(500), (error) => {
      assert.match(error.message, /Preview did not start/);
      assert.ok(error.message.length <= 64 * 1024 + 24);
      return true;
    });
  } finally {
    await preview.stop();
  }
});

test(
  'preview cleanup terminates descendants holding inherited output pipes',
  { timeout: 5000, skip: process.platform === 'win32' },
  async () => {
    const preview = launch(`
    const { spawn } = require('node:child_process');
    spawn(process.execPath, ['-e', \`
      process.on('SIGTERM', () => {});
      console.log('http://127.0.0.1:12345/');
      setInterval(() => {}, 1000);
    \`], { stdio: ['ignore', 'inherit', 'inherit'] });
    setInterval(() => {}, 1000);
  `);
    try {
      assert.equal(await preview.address(), 'http://127.0.0.1:12345/');
    } finally {
      await preview.stop(100);
    }
  },
);
