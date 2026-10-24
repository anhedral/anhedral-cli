import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
await import('./prepare.mjs');
const selected = process.argv[2] ?? 'both';
if (!['ios', 'android', 'both'].includes(selected)) throw Error('Use ios, android or both.');
for (const platform of selected === 'both' ? ['ios', 'android'] : [selected]) {
  console.log(`Native component contracts: ${platform}`);
  const result = spawnSync(
    process.execPath,
    [
      require.resolve('jest/bin/jest'),
      '--runInBand',
      ...process.argv.slice(3).filter((argument) => argument !== '--'),
    ],
    {
      cwd: fileURLToPath(new URL('.', import.meta.url)),
      env: { ...process.env, NATIVE_UI_PLATFORM: platform },
      stdio: 'inherit',
    },
  );
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Error(
      `Native ${platform} tests exited ${result.status}; signal=${result.signal ?? 'none'}.`,
    );
}
