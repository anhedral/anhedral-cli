import semver from 'semver';
import { RTC_UI_CORE } from '../dependencies.js';

/** Compatibility information only. Registry metadata is never executed. */
export interface Release {
  version: string;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  engines?: { node?: string };
  deprecated?: string;
}

export type Registry = (name: string) => Promise<Release[]>;

async function readRegistry(url: URL, accept: string, name: string) {
  try {
    const response = await fetch(url, {
      headers: { accept },
      redirect: 'error',
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok || !response.body) throw Error('HTTP ' + response.status);
    const chunks: Uint8Array[] = [];
    let size = 0;
    const reader = response.body.getReader();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > 96 * 1024 * 1024) throw Error('metadata exceeds the size limit');
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    return Buffer.concat(chunks).toString('utf8');
  } catch (error) {
    throw Error(
      'Could not read registry metadata for ' + name + '. Retry when the registry is available.',
      {
        cause: error,
      },
    );
  }
}

export const npmReleases: Registry = async (name) => {
  const base = new URL(
    process.env.npm_config_registry ||
      process.env.NPM_CONFIG_REGISTRY ||
      'https://registry.npmjs.org/',
  );
  if (
    (base.protocol !== 'https:' &&
      !(
        base.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname)
      )) ||
    base.username ||
    base.password ||
    base.search ||
    base.hash
  )
    throw Error('Use an HTTPS npm registry or a loopback registry without embedded credentials.');
  if (!base.pathname.endsWith('/')) base.pathname += '/';
  const content = await readRegistry(
    new URL(encodeURIComponent(name), base),
    'application/vnd.npm.install-v1+json',
    name,
  );
  const document = JSON.parse(content);
  if (document.name !== name || !document.versions || typeof document.versions !== 'object')
    throw Error('Invalid npm registry metadata for ' + name);
  const releases: Release[] = [];
  for (const [key, raw] of Object.entries(document.versions)) {
    const entry = raw as Release;
    if (entry?.version !== key || !semver.valid(key) || semver.prerelease(key)) continue;
    const { version, dependencies, peerDependencies, engines, deprecated } = entry;
    releases.push({ version, dependencies, peerDependencies, engines, deprecated });
  }
  return releases;
};

export async function crateReleases(
  name: 'tauri' | 'tauri-build',
  rust?: string,
): Promise<Release[]> {
  const source = await readRegistry(
    new URL('https://index.crates.io/ta/ur/' + name),
    'text/plain',
    name,
  );
  return source
    .trim()
    .split('\n')
    .flatMap((line) => {
      const row = JSON.parse(line);
      if (row.name !== name || row.yanked || !semver.valid(row.vers) || semver.prerelease(row.vers))
        return [];
      if (rust && row.rust_version && !semver.satisfies(rust, '>=' + row.rust_version)) return [];
      const requirements = Object.fromEntries(
        (row.deps as { name: string; req: string }[])
          .filter((d) => d.name === 'tauri-build')
          .map((d) => [d.name, d.req]),
      );
      return [{ version: row.vers, dependencies: requirements }];
    });
}

/** Solve direct pins together. Try newest releases first and prune incompatible peers in both directions. */
export function selectReleases(input: Map<string, Release[]>, label: string): Map<string, Release> {
  const selected = new Map<string, Release>();
  let failedName = '';
  function requiredBy(owner: string, release: Release, name: string, other: Release) {
    const version = other.version;
    if (owner === '@cloudflare/realtimekit-react-ui' && name === '@cloudflare/realtimekit-react') {
      const core = '@cloudflare/realtimekit';
      const ui =
        release.peerDependencies?.[core] ??
        release.dependencies?.[core] ??
        RTC_UI_CORE[release.version];
      const sdk = other.dependencies?.[core] ?? other.peerDependencies?.[core];
      if (
        !ui ||
        !sdk ||
        !semver.validRange(ui) ||
        !semver.validRange(sdk) ||
        !semver.intersects(ui, sdk)
      )
        return false;
    }
    if (
      (owner === 'react-dom' && name === 'react') ||
      (owner === '@typescript-eslint/eslint-plugin' && name === '@typescript-eslint/parser')
    ) {
      if (version !== release.version) return false;
    }
    return [release.dependencies?.[name], release.peerDependencies?.[name]].every(
      (range) => !range || range === '*' || semver.satisfies(version, range),
    );
  }
  function choose(pending: Map<string, Release[]>): boolean {
    if (!pending.size) return true;
    const [name, candidates] = [...pending].reduce((a, b) => (a[1].length <= b[1].length ? a : b));
    failedName = name;
    for (const release of candidates) {
      const rest = new Map<string, Release[]>();
      let possible = true;
      for (const [other, choices] of pending) {
        if (other === name) continue;
        const compatible = choices.filter(
          (option) =>
            requiredBy(name, release, other, option) && requiredBy(other, option, name, release),
        );
        if (!compatible.length) {
          failedName = name + ' and ' + other;
          possible = false;
          break;
        }
        rest.set(other, compatible);
      }
      if (!possible) continue;
      selected.set(name, release);
      if (choose(rest)) return true;
      selected.delete(name);
    }
    return false;
  }
  // Independent sets have independent solutions. An unsatisfied peer must not trigger a
  // combinatorial search through unrelated tooling.
  const sorted = new Map(
    [...input].map(([name, list]) => [
      name,
      [...list].sort((a, b) => semver.rcompare(a.version, b.version)),
    ]),
  );
  const edges = new Map([...sorted.keys()].map((name) => [name, new Set<string>()]));
  function connect(a: string, b: string) {
    if (a === b || !edges.has(a) || !edges.has(b)) return;
    edges.get(a)!.add(b);
    edges.get(b)!.add(a);
  }
  connect('@cloudflare/realtimekit-react-ui', '@cloudflare/realtimekit-react');
  connect('react-dom', 'react');
  connect('@typescript-eslint/eslint-plugin', '@typescript-eslint/parser');
  for (const [name, releases] of sorted) {
    for (const release of releases) {
      for (const dependency of [
        ...Object.keys(release.dependencies ?? {}),
        ...Object.keys(release.peerDependencies ?? {}),
      ]) {
        connect(name, dependency);
      }
    }
  }
  for (const name of sorted.keys()) {
    if (selected.has(name)) continue;
    const group = new Map<string, Release[]>();
    const visit = (key: string) => {
      if (group.has(key)) return;
      group.set(key, sorted.get(key)!);
      for (const neighbor of edges.get(key)!) visit(neighbor);
    };
    visit(name);
    if (!choose(group))
      throw Error(
        'No compatible stable version for ' +
          failedName +
          ' in ' +
          label +
          '. Check the template ranges, runtime and existing pins.',
      );
  }
  return selected;
}
