// Pinned public OJ release. Downloads only the declared artifact; never runs an installer.
import { spawn, execFileSync } from 'node:child_process';
import { constants } from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { readFile, lstat, mkdir, open, rename, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const policy = JSON.parse(await readFile(new URL('./oj-runtime.json', import.meta.url), 'utf8'));
const target = `${process.platform}-${process.arch}`;
const pin = policy.targets[target];
if (!pin) throw Error(`OJ ${policy.version} is not pinned for ${target}.`);
const cache = fileURLToPath(
  new URL(`../node_modules/.cache/anhedral-oj/${policy.version}/${target}/`, import.meta.url),
);
const binary = path.join(cache, 'oj');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
async function verifiedBinary() {
  const stat = await lstat(binary);
  if (
    !stat.isFile() ||
    stat.isSymbolicLink() ||
    stat.size !== pin.binaryBytes ||
    hash(await readFile(binary)) !== pin.binarySha256
  )
    throw Error('The cached OJ runtime failed integrity validation.');
}
try {
  await verifiedBinary();
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  await mkdir(cache, { recursive: true });
  const temporary = path.join(cache, randomUUID());
  const archive = `${temporary}.tar.gz`;
  try {
    const response = await fetch(
      `${policy.repository}/releases/download/v${policy.version}/${pin.asset}`,
      { signal: AbortSignal.timeout(180000) },
    );
    if (!response.ok || !response.body) throw Error('The pinned OJ download failed.');
    const file = await open(archive, 'wx', 0o600);
    const digest = createHash('sha256');
    let bytes = 0;
    try {
      for await (const chunk of response.body) {
        bytes += chunk.byteLength;
        if (bytes > pin.archiveBytes) throw Error('OJ archive exceeds its pinned size.');
        digest.update(chunk);
        await file.writeFile(chunk);
      }
    } finally {
      await file.close();
    }
    if (bytes !== pin.archiveBytes || digest.digest('hex') !== pin.archiveSha256)
      throw Error('OJ archive integrity failed.');
    // Extract exactly one member to memory; archive paths never choose filesystem targets.
    const executable = execFileSync('tar', ['-xOzf', archive, 'oj'], {
      maxBuffer: 256 * 1024 * 1024,
    });
    if (executable.length !== pin.binaryBytes || hash(executable) !== pin.binarySha256)
      throw Error('OJ executable integrity failed.');
    const output = await open(temporary, 'wx', 0o755);
    try {
      await output.writeFile(executable);
    } finally {
      await output.close();
    }
    await rename(temporary, binary);
  } finally {
    await rm(temporary, { force: true });
    await rm(archive, { force: true });
  }
}
const child = spawn(binary, process.argv.slice(2), { stdio: 'inherit', env: process.env });
for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on('exit', (code, signal) => {
  process.exitCode = signal ? 128 + (constants.signals[signal] ?? 1) : (code ?? 1);
});
