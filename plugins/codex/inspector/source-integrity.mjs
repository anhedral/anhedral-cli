import { createHash } from 'node:crypto';
import { lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
export const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
export function pluginSourceDigest(root) {
  const files = [
    'plugins/codex/distribution/references/stack-registry.json',
    ...[
      'build.mjs',
      'licenses.mjs',
      'source-integrity.mjs',
      'package.json',
      'pnpm-lock.yaml',
      'tsconfig.json',
      'vite.config.ts',
    ].map((name) => `plugins/codex/inspector/${name}`),
  ];
  function visit(relative) {
    for (const name of readdirSync(path.join(root, relative)).sort()) {
      const entry = path.posix.join(relative, name);
      const stat = lstatSync(path.join(root, entry));
      if (stat.isSymbolicLink())
        throw new Error('Plugin build source must not contain symbolic links.');
      if (stat.isDirectory()) visit(entry);
      else if (stat.isFile()) files.push(entry);
    }
  }
  // The server imports shared CLI domain modules; bind the entire small source tree
  // so a stale bundled lifecycle cannot pass packaging after a domain change.
  visit('src');
  visit('plugins/codex/distribution/assets');
  for (const directory of ['server', 'shared', 'web'])
    visit(`plugins/codex/inspector/${directory}`);
  return digest(
    Buffer.from(
      files
        .sort()
        .map((file) => `${file}:${digest(readFileSync(path.join(root, file)))}`)
        .join('\n'),
    ),
  );
}
export function verifyPluginRuntime(root) {
  const directory = path.join(root, 'plugins/codex/distribution/runtime');
  let metadata;
  try {
    metadata = JSON.parse(readFileSync(path.join(directory, 'build.json'), 'utf8'));
  } catch {
    throw new Error('Build the plugin UI before packaging: pnpm plugin:build.');
  }
  const version = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8')).version;
  if (metadata.version !== version || metadata.sourceDigest !== pluginSourceDigest(root))
    throw new Error('Plugin UI source changed. Rebuild with pnpm plugin:build before packaging.');
  for (const file of ['server.mjs', 'dashboard.html', 'THIRD_PARTY_NOTICES.txt']) {
    const target = path.join(directory, file);
    if (
      !lstatSync(target).isFile() ||
      lstatSync(target).isSymbolicLink() ||
      metadata.files?.[file] !== digest(readFileSync(target))
    )
      throw new Error(`Plugin runtime integrity failed: ${file}`);
  }
}
