import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { parse } from 'yaml';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const sections = ['dependencies', 'devDependencies', 'optionalDependencies'];
/** Import subpaths and versioned registry declarations resolve to their owning package. */
export function externalPackageName(value) {
  if (typeof value !== 'string' || /^(?:[./~#]|@\/|node:|https?:|workspace:)/.test(value)) return;
  const match = /^(?:(@[a-z0-9_.-]+\/[a-z0-9_.-]+)|([a-z0-9_][a-z0-9_.-]*))(?:$|[/@])/.exec(value);
  return match?.[1] ?? match?.[2];
}
const implicitStyles = ['tailwindcss', 'tw-animate-css', 'shadcn'];
const styleImportsCache = new WeakMap();
function stylePackageNames(inventory) {
  const sheets = [
    ...Object.values(inventory.styleGlobals ?? {}),
    ...Object.values(inventory.styleSheets ?? {}),
  ];
  if (!sheets.length) return implicitStyles;
  const stamp = sheets.map((sheet) => sheet.sha256 ?? sheet.content ?? '').join('|');
  const cached = styleImportsCache.get(inventory);
  if (cached?.stamp === stamp) return cached.names;
  const names = new Set();
  for (const sheet of sheets)
    for (const match of (sheet.content ?? '').matchAll(
      /@(?:import|plugin|reference)\s+(?:url\()?['"]([^'"]+)['"]/g,
    )) {
      const name = externalPackageName(match[1]);
      if (name) names.add(name);
    }
  const result = [...names].sort();
  styleImportsCache.set(inventory, { stamp, names: result });
  return result;
}
export function externalPackageNames(inventory) {
  const names = new Set(stylePackageNames(inventory));
  for (const input of Object.values(inventory.sources))
    for (const module of input.imports ?? []) {
      const name = externalPackageName(module);
      if (name) names.add(name);
    }
  for (const registry of Object.values(inventory.registries))
    for (const item of registry.items)
      for (const dependency of [...(item.dependencies ?? []), ...(item.devDependencies ?? [])]) {
        const name = externalPackageName(dependency);
        if (name) names.add(name);
      }
  return [...names].sort();
}
/** Retain exact Git objects; no package install, upstream JavaScript or lifecycle hook runs. */
export function collectRegistryPackageInputs(sourceRoot, commit, inventory) {
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw Error('Full upstream commit required for package inputs.');
  const git = (...args) =>
    execFileSync('git', args, { cwd: sourceRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const files = Object.create(null);
  const read = (name) => {
    const content = git('show', commit + ':' + name);
    files[name] = { sha256: hash(content), content };
    return content;
  };
  const lock = parse(read('pnpm-lock.yaml'), { maxAliasCount: 50, uniqueKeys: true });
  if (
    String(lock.lockfileVersion) !== '9.0' ||
    !lock.importers ||
    !lock.packages ||
    !lock.snapshots
  )
    throw Error('Upstream package lock shape needs renewed native review.');
  read('pnpm-workspace.yaml');
  const patches = new Map();
  for (const [name, patch] of Object.entries(lock.patchedDependencies ?? {})) {
    const file = typeof patch === 'string' ? patch : patch.path;
    if (
      typeof file !== 'string' ||
      !file.length ||
      file.startsWith('/') ||
      file.split('/').some((part) => part === '..' || part === '.')
    )
      throw Error('Unsafe upstream package patch path: ' + name);
    read(file);
    patches.set(name, {
      path: file,
      sha256: files[file].sha256,
      ...(typeof patch === 'object' && patch.hash ? { hash: patch.hash } : {}),
    });
  }
  const manifests = Object.create(null);
  for (const name of git('ls-tree', '-r', '--name-only', commit)
    .split('\n')
    .filter((name) =>
      /^(?:package\.json|apps\/[^/]+\/package\.json|packages\/[^/]+\/package\.json)$/.test(name),
    )) {
    const manifest = JSON.parse(read(name));
    manifests[path.posix.dirname(name)] = {
      path: name,
      manifest,
      tree: git(
        'rev-parse',
        path.posix.dirname(name) === '.'
          ? commit + '^{tree}'
          : commit + ':' + path.posix.dirname(name),
      ).trim(),
    };
  }
  const byName = new Map(
    Object.entries(manifests)
      .filter(([, entry]) => entry.manifest.name)
      .map(([directory, entry]) => [entry.manifest.name, directory]),
  );
  const npmNode = (name, version) => {
    const alias = /^((?:@[^/()]+\/)?[^@()/]+)@(.+)$/.exec(version);
    if (alias) {
      name = alias[1];
      version = alias[2];
    }
    const key = name + '@' + version;
    const base = name + '@' + version.split('(')[0];
    const snapshot = lock.snapshots[key] ?? lock.snapshots[base];
    const pkg = lock.packages[base];
    const patchHash = /\(patch_hash=([^)]*)\)/.exec(version)?.[1];
    const patch =
      patches.get(base) ??
      patches.get(name) ??
      (patchHash ? [...patches.values()].filter((entry) => entry.hash === patchHash) : undefined);
    if (patchHash && (!patch || (Array.isArray(patch) && !patch.length)))
      throw Error('Unresolved upstream package patch association: ' + key);
    return {
      key,
      value: { package: pkg ?? null, snapshot: snapshot ?? null, ...(patch ? { patch } : {}) },
      snapshot,
    };
  };
  const graph = (roots) => {
    const nodes = new Map();
    const visit = (name, version, importer) => {
      if (typeof version !== 'string' || !version.length)
        throw Error('Unsupported upstream package resolution: ' + name);
      if (version.startsWith('link:') || version.startsWith('workspace:')) {
        const directory = version.startsWith('link:')
          ? path.posix.normalize(path.posix.join(importer, version.slice(5)))
          : byName.get(name);
        const entry = manifests[directory];
        const key = 'workspace:' + (directory ?? name);
        if (nodes.has(key)) return;
        const dependencies = lock.importers[directory];
        nodes.set(key, {
          manifest: entry?.manifest ?? null,
          tree: entry?.tree ?? null,
          importer: dependencies ?? null,
        });
        if (dependencies)
          for (const section of sections)
            for (const [child, resolved] of Object.entries(dependencies[section] ?? {}))
              visit(child, resolved.version, directory);
        return;
      }
      const node = npmNode(name, version);
      if (nodes.has(node.key)) return;
      nodes.set(node.key, node.value);
      for (const section of ['dependencies', 'optionalDependencies'])
        for (const [child, resolved] of Object.entries(node.snapshot?.[section] ?? {}))
          visit(child, resolved, importer);
    };
    for (const root of roots) visit(root.name, root.version, root.importer);
    return {
      sha256: hash(JSON.stringify([...nodes].sort(([a], [b]) => a.localeCompare(b)))),
      nodeCount: nodes.size,
      unresolved: [...nodes]
        .filter(([, value]) =>
          'package' in value
            ? !value.package || !value.snapshot
            : !value.manifest || !value.importer,
        )
        .map(([key]) => key)
        .sort(),
    };
  };
  const packages = Object.create(null);
  for (const name of externalPackageNames(inventory)) {
    const owner = 'apps/v4';
    const declared = Object.fromEntries(
      Object.entries(manifests)
        .flatMap(([, entry]) =>
          [...sections, 'peerDependencies'].flatMap((section) =>
            entry.manifest[section]?.[name] === undefined
              ? []
              : [[entry.path + '#' + section, entry.manifest[section][name]]],
          ),
        )
        .sort(([a], [b]) => a.localeCompare(b)),
    );
    let roots = sections.flatMap((section) =>
      lock.importers[owner]?.[section]?.[name]
        ? [{ name, importer: owner, section, ...lock.importers[owner][section][name] }]
        : [],
    );
    let resolution = 'registry-owner';
    if (!roots.length && byName.has(name)) {
      resolution = 'workspace-package';
      roots = [{ name, version: 'workspace:*', importer: owner }];
    }
    if (!roots.length) {
      resolution = 'lockfile-fallback';
      roots = Object.keys(lock.snapshots)
        .filter((key) => key.startsWith(name + '@'))
        .sort()
        .map((key) => ({ name, version: key.slice(name.length + 1), importer: owner }));
    }
    packages[name] = {
      declared,
      resolution: roots.length ? resolution : 'unresolved',
      roots,
      graph: graph(roots),
    };
  }
  return { schemaVersion: 1, source: { commit }, files, packages };
}
export function validateRegistryPackageInputs(inputs, commit, inventory) {
  if (
    !inputs ||
    inputs.schemaVersion !== 1 ||
    !inputs.files?.['pnpm-lock.yaml'] ||
    !inputs.files?.['apps/v4/package.json'] ||
    !inputs.files?.['package.json'] ||
    !inputs.files?.['pnpm-workspace.yaml'] ||
    !inputs.packages
  )
    throw Error('Official registry package inputs are missing; refresh the snapshot.');
  if (
    !/^[a-f0-9]{40}$/.test(inputs.source?.commit ?? '') ||
    (commit !== undefined && inputs.source.commit !== commit)
  )
    throw Error('Official registry package inputs reference a different upstream revision.');
  for (const [name, entry] of Object.entries(inputs.packages)) {
    if (
      !['registry-owner', 'workspace-package', 'lockfile-fallback', 'unresolved'].includes(
        entry.resolution,
      ) ||
      !Array.isArray(entry.roots) ||
      !/^[a-f0-9]{64}$/.test(entry.graph?.sha256 ?? '') ||
      !Number.isSafeInteger(entry.graph.nodeCount) ||
      entry.graph.nodeCount < 0 ||
      !Array.isArray(entry.graph.unresolved) ||
      (entry.resolution !== 'unresolved' && (!entry.roots.length || !entry.graph.nodeCount))
    )
      throw Error('Invalid official registry package record: ' + name);
  }
  if (
    inventory &&
    JSON.stringify(Object.keys(inputs.packages).sort()) !==
      JSON.stringify(externalPackageNames(inventory))
  )
    throw Error('Official registry package membership changed; refresh the snapshot.');
  for (const [name, input] of Object.entries(inputs.files))
    if (typeof input.content !== 'string' || hash(input.content) !== input.sha256)
      throw Error('Official registry package input integrity failed: ' + name);
}
/** Scope review to imports and their reachable local companions, plus the actual CSS runtime. */
export function registryPackageFingerprint(inventory, item, usesStyles) {
  if (!inventory.packageInputs) return undefined;
  const names = new Set(usesStyles ? stylePackageNames(inventory) : []),
    visited = new Set(),
    unresolved = {};
  const visit = (origin) => {
    if (visited.has(origin)) return;
    visited.add(origin);
    const input = inventory.sources[origin];
    if (input?.unresolvedImports?.length) unresolved[origin] = input.unresolvedImports;
    for (const module of input?.imports ?? []) {
      const name = externalPackageName(module);
      if (name) names.add(name);
    }
    for (const companion of input?.relativeSources ?? []) visit(companion);
  };
  for (const file of item.files ?? []) visit(file.source);
  for (const dependency of [...(item.dependencies ?? []), ...(item.devDependencies ?? [])]) {
    const name = externalPackageName(dependency);
    if (name) names.add(name);
  }
  const result = Object.fromEntries(
    [...names]
      .sort()
      .map((name) => [
        name,
        inventory.packageInputs.packages[name] ?? { resolution: 'unresolved' },
      ]),
  );
  if (Object.keys(unresolved).length)
    result['<unresolved-dynamic-imports>'] = {
      expressions: unresolved,
      upstreamCommit: inventory.source?.commit ?? null,
      lockfile: inventory.packageInputs.files?.['pnpm-lock.yaml']?.sha256 ?? null,
    };
  return result;
}
