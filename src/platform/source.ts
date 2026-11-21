import ignore from 'ignore';
import { readBoundedFile } from '../bounded-file.js';
import { constants } from 'node:fs';
import { lstat, open, readdir, stat, type FileHandle } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { sourceContainsCredential as localCredentialMaterial } from '../../assets/security/credential-patterns.mjs';
import {
  SOURCE_LIMITS,
  sourceContainsCredential,
  uploadExcluded,
  uploadSecret,
} from '../contracts/cli-transport.js';
import {
  packSource,
  setSourceExecutable,
  sourceInventory,
  validateSourcePath,
} from '../contracts/source-bundle.js';
import { excludedSource, generatedSource, secretSource } from '../contracts/source-profile.js';
import { platformFailure } from './state.js';
// Keep the directory open throughout all child lookups. These OS namespaces
// address the open object even if a writer renames its original directory.
export async function anchoredDirectory(handle: FileHandle) {
  const identity = await handle.stat({ bigint: true });
  const path =
    process.platform === 'linux'
      ? '/proc/self/fd/' + handle.fd
      : '/.vol/' + identity.dev + '/' + identity.ino;
  const resolved = await stat(path, { bigint: true }).catch(() => null);
  if (!identity.isDirectory() || identity.dev !== resolved?.dev || identity.ino !== resolved.ino)
    throw platformFailure('This filesystem cannot safely anchor source directories for upload.');
  return path;
}

export async function packageSource(root: string) {
  if (!['linux', 'darwin'].includes(process.platform))
    throw platformFailure(
      'Source packaging requires Linux procfs or a macOS volume supporting directory IDs. On Windows, run the CLI inside WSL.',
    );
  const directoryFlags = constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  const files = new Map<string, Uint8Array>();
  let bytes = 0;
  type Rule = { base: string; matcher: ReturnType<typeof ignore> };
  async function walk(handle: FileHandle, relative: string, rules: Rule[]) {
    const directory = await anchoredDirectory(handle);
    const ignorePath = join(directory, '.gitignore');
    const gitignore = await lstat(ignorePath).catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (gitignore && (!gitignore.isFile() || gitignore.isSymbolicLink()))
      throw platformFailure('Source ignore file is unsafe.');
    if (gitignore) {
      if (gitignore.size > 65536) throw platformFailure('Source ignore file exceeds its limit.');
      rules = [
        ...rules,
        {
          base: relative,
          matcher: ignore().add(
            readBoundedFile(ignorePath, 65536, (opened) => {
              if (opened.dev !== gitignore.dev || opened.ino !== gitignore.ino)
                throw platformFailure('Source ignore file changed during packaging.');
            }).toString('utf8'),
          ),
        },
      ];
    }
    for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const path = relative ? `${relative}/${entry.name}` : entry.name;
      if (
        /^(?:\.env|\.dev\.vars|\.anhedral$)/i.test(entry.name) ||
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
      const childPath = join(directory, entry.name);
      const info = await lstat(childPath);
      if (info.isSymbolicLink() || (!info.isFile() && !info.isDirectory()))
        throw platformFailure(
          'Source contains a symbolic link or special file. Exclude it before uploading.',
        );
      validateSourcePath(path);
      if (info.isDirectory()) {
        const child = await open(childPath, directoryFlags);
        try {
          const opened = await child.stat();
          if (opened.dev !== info.dev || opened.ino !== info.ino)
            throw platformFailure('Source directory changed during packaging.');
          await walk(child, path, rules);
        } finally {
          await child.close();
        }
        continue;
      }
      if (files.size >= SOURCE_LIMITS.files || (bytes += info.size) > SOURCE_LIMITS.bytes)
        throw platformFailure('Source exceeds its file or byte limit.');
      const handle = await open(
        childPath,
        constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
      );
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
      if (sourceContainsCredential(content) || localCredentialMaterial(content))
        throw platformFailure('Source contains credential material. Remove it before uploading.');
      files.set(path, content);
      setSourceExecutable(files, path, Boolean(info.mode & 0o111));
    }
  }
  const rootHandle = await open(resolve(root) === process.cwd() ? '.' : root, directoryFlags);
  try {
    await walk(rootHandle, '', []);
  } finally {
    await rootHandle.close();
  }
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
