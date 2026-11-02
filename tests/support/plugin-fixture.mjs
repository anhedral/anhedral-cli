import { readFileSync } from 'node:fs';
import { pluginPackageFiles } from '../../scripts/plugin-package-policy.mjs';
import { readStoredArchive } from '../../scripts/publish-plugin-source.mjs';
import { buildPluginArchive } from '../../scripts/package-plugin.mjs';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
export function pluginFixture(version = '1.2.3') {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-fixture-'));
  try {
    const source = new URL('../../plugins/codex/distribution/', import.meta.url);
    const distribution = path.join(root, 'plugins/codex/distribution');
    mkdirSync(path.dirname(distribution), { recursive: true });
    cpSync(source, distribution, { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }));
    const manifest = JSON.parse(readFileSync(path.join(distribution, 'plugin.json')));
    manifest.version = version;
    writeFileSync(path.join(distribution, 'plugin.json'), JSON.stringify(manifest));
    const file = path.join(distribution, 'references/stack-registry.json');
    const registry = JSON.parse(readFileSync(file));
    registry.cliVersion = version;
    for (const item of registry.items) item.version = version;
    writeFileSync(file, JSON.stringify(registry));
    const { contents } = buildPluginArchive(root);
    return { contents, files: readStoredArchive(contents) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
