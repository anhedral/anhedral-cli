import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { execFile, appendGitignore } from '../util.js';
import { bootstrapArguments } from '../registry/bootstrap.js';
import type { StandardRunner } from '../registry/types.js';

export function assertBootstrapPlatform(run: StandardRunner, platform = process.platform): void {
  if (platform === 'win32' && run === execFile)
    throw new Error(
      'Native Windows initialization is blocked because the upstream shadcn monorepo bootstrap writes component files outside the project. Run Anhedral inside WSL. Planning and doctor remain available on Windows.',
    );
}

export function bootstrapWorkspace(
  root: string,
  name: string,
  run: StandardRunner,
  webOnly = false,
): void {
  assertBootstrapPlatform(run);
  const temporary = path.join(root, '.bootstrap');
  mkdirSync(temporary);
  try {
    run('pnpm', bootstrapArguments(name, temporary), root);
    const generated = path.join(temporary, name);
    if (
      !existsSync(path.join(generated, 'pnpm-workspace.yaml')) ||
      !existsSync(path.join(generated, 'apps/web/package.json'))
    )
      throw new Error('Official shadcn bootstrap did not produce the expected monorepo.');
    const ignored = ['.git', 'node_modules', '.next', '.turbo'];
    const seed =
      !webOnly && existsSync(path.join(root, '.gitignore'))
        ? readFileSync(path.join(root, '.gitignore'), 'utf8')
        : '';
    for (const entry of webOnly ? ['apps/web', 'packages/ui'] : readdirSync(generated)) {
      if (ignored.includes(entry)) continue;
      if (webOnly && existsSync(path.join(root, entry)))
        throw new Error(`Web foundation target already exists: ${entry}.`);
      cpSync(path.join(generated, entry), path.join(root, entry), {
        recursive: true,
        filter: (source) => !ignored.includes(path.basename(source)),
      });
    }
    if (seed) appendGitignore(root, seed.split(/\r?\n/));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
}
