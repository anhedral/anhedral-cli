import { lstat, realpath } from 'node:fs/promises';
import { dirname, isAbsolute, join, parse } from 'node:path';
import { CliFailure } from '../cli-errors.js';

const unavailable = () =>
  new CliFailure(
    'A trusted Linux Secret Service helper is unavailable.',
    'PLATFORM_ACCESS_FAILED',
    'Install a system-owned secret-tool, explicitly select a trusted system helper with ANHEDRAL_CLI_SECRET_TOOL_PATH, or use --credential-file.',
    'context',
    false,
  );

async function safePath(path: string, executable: boolean) {
  // Validate the original chain as well as the canonical chain: an untrusted
  // symlink or writable parent must not redirect a privileged helper lookup.
  let current = parse(path).root;
  const parts = path.slice(current.length).split('/').filter(Boolean);
  for (const [index, part] of parts.entries()) {
    current = join(current, part);
    const entry = await lstat(current);
    if (entry.uid !== 0 || (!entry.isSymbolicLink() && (entry.mode & 0o022) !== 0))
      throw unavailable();
    const last = index === parts.length - 1;
    if (!entry.isSymbolicLink() && !(last && executable ? entry.isFile() : entry.isDirectory()))
      throw unavailable();
    if (last && executable && !entry.isSymbolicLink() && (entry.mode & 0o111) === 0)
      throw unavailable();
  }
  const root = await lstat(parse(path).root);
  if (root.uid !== 0 || (root.mode & 0o022) !== 0) throw unavailable();
}

/** Never resolve credential infrastructure from project/package-manager PATH. */
export async function trustedLinuxCredentialHelper(
  explicit = process.env.ANHEDRAL_CLI_SECRET_TOOL_PATH,
): Promise<string> {
  const candidates =
    explicit === undefined ? ['/usr/bin/secret-tool', '/bin/secret-tool'] : [explicit];
  for (const candidate of candidates) {
    try {
      if (!isAbsolute(candidate) || /[\0\r\n]/.test(candidate) || dirname(candidate) === candidate)
        throw unavailable();
      await safePath(candidate, true);
      const canonical = await realpath(candidate);
      await safePath(canonical, true);
      return canonical;
    } catch {
      // An explicit selection never silently falls back to a different helper.
      if (explicit !== undefined) throw unavailable();
    }
  }
  throw unavailable();
}
