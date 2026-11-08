import { readFileSync } from 'node:fs';
import { pluginPackageFiles } from '../../scripts/plugin/plugin-package-policy.mjs';
import { readStoredArchive } from '../../scripts/plugin/publish-plugin-source.mjs';
import { buildPluginArchive } from '../../scripts/plugin/package-plugin.mjs';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
export function pluginFixture(version = '1.2.3') {
  const root = mkdtempSync(path.join(tmpdir(), 'anhedral-plugin-fixture-'));
  try {
    const source = new URL('../../plugin/', import.meta.url);
    const distribution = path.join(root, 'plugin');
    mkdirSync(path.dirname(distribution), { recursive: true });
    cpSync(source, distribution, { recursive: true });
    writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version }));
    const manifest = JSON.parse(readFileSync(path.join(distribution, 'plugin.json')));
    manifest.version = version;
    writeFileSync(path.join(distribution, 'plugin.json'), JSON.stringify(manifest));
    const claudeManifestFile = path.join(distribution, '.claude-plugin/plugin.json');
    const claudeManifest = JSON.parse(readFileSync(claudeManifestFile));
    claudeManifest.version = version;
    writeFileSync(claudeManifestFile, JSON.stringify(claudeManifest));
    const file = path.join(distribution, 'references/stack-registry.json');
    const registry = JSON.parse(readFileSync(file));
    registry.cliVersion = version;
    writeFileSync(file, JSON.stringify(registry));
    const { contents } = buildPluginArchive(root);
    return { contents, files: readStoredArchive(contents) };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
