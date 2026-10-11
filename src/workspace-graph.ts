import { existsSync, lstatSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { dependencyOrder } from './dependency-order.js';

export interface WorkspaceNode {
  name: string;
  directory: string;
  dependencies: string[];
}
interface WorkspaceManifest {
  name: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}
const dependencyFields = [
  'dependencies',
  'devDependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

function readManifest(file: string, directory: string): WorkspaceManifest {
  if (!existsSync(file)) throw new Error(`Workspace manifest missing: ${directory}.`);
  if (lstatSync(file).isSymbolicLink())
    throw new Error(`Workspace symlinks are unsupported: ${directory}/package.json.`);
  const value: unknown = JSON.parse(readFileSync(file, 'utf8'));
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`Invalid workspace manifest: ${directory}.`);
  const manifest = value as Record<string, unknown>;
  if (typeof manifest.name !== 'string' || !manifest.name)
    throw new Error(`Workspace name missing: ${directory}.`);
  for (const field of dependencyFields) {
    const dependencies = manifest[field];
    if (dependencies === undefined) continue;
    if (
      !dependencies ||
      typeof dependencies !== 'object' ||
      Array.isArray(dependencies) ||
      Object.values(dependencies).some((version) => typeof version !== 'string')
    )
      throw new Error(`Invalid workspace dependencies: ${directory}/${field}.`);
  }
  return manifest as unknown as WorkspaceManifest;
}

/** Validate manifests and references, then traverse the indexed dependency graph. */
export function inspectWorkspaceGraph(root: string): WorkspaceNode[] {
  const packages = new Map<string, { directory: string; manifest: WorkspaceManifest }>();
  for (const group of ['apps', 'packages']) {
    const parent = path.join(root, group);
    if (!existsSync(parent)) continue;
    if (lstatSync(parent).isSymbolicLink())
      throw new Error(`Workspace symlinks are unsupported: ${group}.`);
    for (const entry of readdirSync(parent, { withFileTypes: true })) {
      const directory = `${group}/${entry.name}`;
      if (entry.isSymbolicLink())
        throw new Error(`Workspace symlinks are unsupported: ${directory}.`);
      if (!entry.isDirectory()) continue;
      const manifest = readManifest(path.join(root, directory, 'package.json'), directory);
      if (packages.has(manifest.name))
        throw new Error(`Duplicate workspace package: ${manifest.name}.`);
      packages.set(manifest.name, { directory, manifest });
    }
  }
  const graph = [...packages]
    .map(([name, { directory, manifest }]) => {
      const dependencies = new Set<string>();
      for (const field of dependencyFields) {
        for (const [dependency, version] of Object.entries(manifest[field] ?? {})) {
          if (!version.startsWith('workspace:')) continue;
          if (!['workspace:*', 'workspace:^', 'workspace:~'].includes(version))
            throw new Error(
              `Unsupported workspace reference ${name} -> ${dependency}: ${version}.`,
            );
          if (!packages.has(dependency))
            throw new Error(`Missing workspace dependency: ${name} -> ${dependency}.`);
          dependencies.add(dependency);
        }
      }
      return { name, directory, dependencies: [...dependencies].sort() };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
  dependencyOrder(new Map(graph.map((node) => [node.name, node.dependencies])), 'Workspace');
  return graph;
}
