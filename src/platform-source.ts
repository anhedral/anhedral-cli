import { constants } from 'node:fs';
import { lstat, readFile, readdir, open } from 'node:fs/promises';
import { join } from 'node:path';
import ignore from 'ignore';
import {
  SOURCE_LIMITS,
  sourceContainsCredential,
  uploadExcluded,
  uploadSecret,
} from './contracts/cli-transport.js';
import { excludedSource, generatedSource, secretSource } from './contracts/source-profile.js';
import {
  packSource,
  setSourceExecutable,
  sourceInventory,
  validateSourcePath,
} from './contracts/source-bundle.js';
import { platformFailure } from './platform-state.js';
export async function packageSource(root: string) {
  const files = new Map<string, Uint8Array>();
  let bytes = 0;
  type Rule = { base: string; matcher: ReturnType<typeof ignore> };
  async function walk(relative: string, rules: Rule[]) {
    const directory = join(root, relative);
    const gitignore = await lstat(join(directory, '.gitignore')).catch(() => null);
    if (gitignore && (!gitignore.isFile() || gitignore.isSymbolicLink()))
      throw platformFailure('Source ignore file is unsafe.');
    if (gitignore) {
      if (gitignore.size > 65536) throw platformFailure('Source ignore file exceeds its limit.');
      rules = [
        ...rules,
        {
          base: relative,
          matcher: ignore().add(await readFile(join(directory, '.gitignore'), 'utf8')),
        },
      ];
    }
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        excludedSource.test(path) ||
        generatedSource.test(path) ||
        secretSource.test(path) ||
        uploadExcluded.test(path) ||
        uploadSecret.test(path)
      )
        continue;
      let ignored = false;
      for (const { base, matcher } of rules) {
        const match = matcher.test(
          path.slice(base ? base.length + 1 : 0) + (entry.isDirectory() ? '/' : ''),
        );
        if (match.ignored) ignored = true;
        else if (match.unignored) ignored = false;
      }
      if (ignored) continue;
      const info = await lstat(join(root, path));
      if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()))
        throw platformFailure(
          'Source contains a symbolic link or special file. Exclude it before uploading.',
        );
      validateSourcePath(path);
      if (info.isDirectory()) {
        await walk(path, rules);
        continue;
      }
      if (files.size >= SOURCE_LIMITS.files || (bytes += info.size) > SOURCE_LIMITS.bytes)
        throw platformFailure('Source exceeds its file or byte limit.');
      const handle = await open(join(root, path), constants.O_RDONLY | constants.O_NOFOLLOW);
      let content: Buffer;
      try {
        const before = await handle.stat();
        if (
          !before.isFile() ||
          before.dev !== info.dev ||
          before.ino !== info.ino ||
          before.size !== info.size
        )
          throw platformFailure('Source changed during packaging.');
        content = Buffer.alloc(info.size);
        let offset = 0;
        while (offset < content.length) {
          const read = await handle.read(content, offset, content.length - offset, offset);
          if (!read.bytesRead) break;
          offset += read.bytesRead;
        }
        const after = await handle.stat();
        if (offset !== info.size || after.size !== info.size || after.mtimeMs !== before.mtimeMs)
          throw platformFailure('Source changed during packaging.');
      } finally {
        await handle.close();
      }
      if (content.length !== info.size)
        throw platformFailure('Source changed during packaging. Retry after saving your files.');
      if (sourceContainsCredential(content))
        throw platformFailure('Source contains credential material. Remove it before uploading.');
      files.set(path, content);
      setSourceExecutable(files, path, Boolean(info.mode & 0o111));
    }
  }
  await walk('', []);
  const config = files.get('anhedral.json');
  if (!config || !files.has('pnpm-lock.yaml'))
    throw platformFailure('Upload requires anhedral.json and pnpm-lock.yaml.');
  let cliVersion: unknown;
  try {
    cliVersion = JSON.parse(new TextDecoder().decode(config)).setup?.cliVersion;
  } catch {
    throw platformFailure('Workspace configuration is invalid.');
  }
  if (typeof cliVersion !== 'string')
    throw platformFailure('The workspace must declare setup.cliVersion.');
  const inventory = await sourceInventory(files),
    archive = await packSource(files);
  return {
    archive,
    inventoryDigest: inventory.digest,
    cliVersion,
    files: files.size,
    paths: [...files.keys()].sort(),
    bytes,
  };
}
