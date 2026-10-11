import { bootstrapWorkspace } from '../scaffold/bootstrap.js';
import { registerApplication } from '../project-state.js';
import { registerVercelApplication } from '../vercel.js';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { applyEdits, modify, parse } from 'jsonc-parser';
import { STANDARD_PRODUCTS, installStackItem } from '../stack-registry.js';
import { inspectProject, validateSetupPlan } from '../readiness.js';
import { GENERATOR_VERSION } from '../version.js';
import { runStagedTransaction } from '../transaction.js';
import { inspectWorkspaceGraph } from '../workspace-graph.js';
import { execFile } from '../util.js';
import { json, put, readJson } from '../scaffold/files.js';
import { writeStandardRoot } from '../scaffold/workspace.js';
import { createRecipeContext } from './context.js';
import { resolveStackRegistry, resolveStandardProducts } from './resolve.js';
import { sourceFiles, assertSafeTarget } from './receipt.js';
import { loadSourceRegistry, resolveSourceItems, type RemoteRegistry } from './remote.js';
import type { StandardOptions, StandardProduct, StandardRunner } from './types.js';

export interface AddRequest {
  items: string[];
  registry?: string;
  integrity?: string;
  dryRun?: boolean;
  skipInstall?: boolean;
}

/** Add recipes to an initialized workspace, refusing edits to customer-owned source. */
export async function addStackItems(
  root: string,
  request: AddRequest,
  run: StandardRunner = execFile,
) {
  root = realpathSync(root);
  if (!request.items.length) throw new Error('Select at least one registry item.');
  const plan = readJson(root, 'anhedral.setup.json');
  validateSetupPlan(plan);
  if (plan.cliVersion !== GENERATOR_VERSION)
    throw new Error('Use the project CLI version before adding recipes.');
  if (!inspectProject(root).localReady)
    throw new Error('Run doctor and resolve project provenance or workspace errors before add.');
  const receipt = readJson(root, 'anhedral.registry.json');
  if (!receipt.files || typeof receipt.files !== 'object' || Array.isArray(receipt.files))
    throw new Error(
      'This project has no scaffold fingerprints; migrate it deliberately before using add.',
    );
  const baseline = receipt.files as Record<string, string>;
  const selected = new Set<StandardProduct>(plan.products);
  let remote: RemoteRegistry | undefined;
  if (request.registry) remote = await loadSourceRegistry(request.registry);
  else
    for (const id of request.items) {
      if (!(STANDARD_PRODUCTS as readonly string[]).includes(id))
        throw new Error(`Unknown stack product: ${id}.`);
      selected.add(id as StandardProduct);
    }
  if (request.integrity && (!remote || remote.integrity !== request.integrity))
    throw new Error('Source registry integrity differs from the reviewed payload.');
  resolveStandardProducts(selected, plan.hosting, false);
  const options: StandardOptions = {
    root,
    name: plan.name ?? path.basename(root),
    products: [...selected].sort(),
    hosting: plan.hosting,
    skipInstall: !!request.skipInstall,
    dryRun: false,
    json: true,
    initializeGit: false,
  };
  const registry = resolveStackRegistry(options);
  const oldItems = new Map(plan.registry.items.map((item) => [item.name, item]));
  const recipes = registry.items.filter(
    (item) => item.installer === 'recipe' && !isDeepStrictEqual(oldItems.get(item.name), item),
  );
  // Relocating auth, database or service ownership requires a migration, not an additive scaffold.
  for (const item of registry.items) {
    const before = oldItems.get(item.name);
    if (before && before.targets.some((target) => !item.targets.includes(target)))
      throw new Error(
        `Adding this selection relocates ${item.name}; migrate its existing source explicitly.`,
      );
  }
  const remoteItems = remote ? resolveSourceItems(remote.registry, request.items) : [];
  if (remote) {
    const previous = Array.isArray(receipt.remoteItems) ? receipt.remoteItems : [];
    for (const item of remoteItems) {
      const identity = `${remote.source}#${item.name}`;
      const targets = item.files.map((file) => file.target);
      for (const installed of previous) {
        if (
          installed.identity === identity &&
          installed.targets.some((target: string) => !targets.includes(target))
        )
          throw new Error(`Remote update relocates ${item.name}; migrate its source explicitly.`);
        if (
          installed.identity !== identity &&
          installed.targets.some((target: string) => targets.includes(target))
        )
          throw new Error(`Remote target is already owned by ${installed.name}.`);
      }
    }
  }
  const before = sourceFiles(root);
  const receiptText = readFileSync(path.join(root, 'anhedral.registry.json'), 'utf8');
  const commitPaths: string[] = [];
  const conflicts: string[] = [];
  const result = {
    schemaVersion: 1,
    root,
    dryRun: !!request.dryRun,
    items: registry.items
      .filter((item) => !isDeepStrictEqual(oldItems.get(item.name), item))
      .map((item) => item.name),
    remoteItems: remoteItems.map((item) => item.name),
    ...(remote ? { registry: { source: remote.source, integrity: remote.integrity } } : {}),
    files: commitPaths,
    conflicts,
  };
  await runStagedTransaction(root, {
    dryRun: !!request.dryRun,
    commitPaths,
    seedPaths: [...before.keys(), 'anhedral.registry.json'],
    build: async (stage) => {
      const context = createRecipeContext(stage, options);
      for (const item of registry.items) Object.assign(context.bindings, item.bindings);
      if (
        recipes.some((item) => ['vinext', 'next'].includes(item.name)) &&
        !existsSync(path.join(stage, 'apps/web/package.json'))
      )
        bootstrapWorkspace(stage, options.name, run, true);
      for (const item of recipes) await installStackItem(item, context);
      // Configuration items affect the existing runtime without regenerating its application source.
      const configurationItems = registry.items.filter(
        (item) => !isDeepStrictEqual(oldItems.get(item.name), item) && item.bindings,
      );
      if (configurationItems.length) {
        const file = `apps/${context.runtimeApp}/wrangler.jsonc`;
        let content = readFileSync(path.join(stage, file), 'utf8');
        const config = parse(content) as Record<string, unknown>;
        for (const item of configurationItems)
          for (const [key, value] of Object.entries(item.bindings!)) {
            if (config[key] !== undefined && !isDeepStrictEqual(config[key], value))
              throw new Error(
                `Existing ${key} configuration conflicts with ${item.name}; configure it explicitly.`,
              );
            content = applyEdits(
              content,
              modify(content, [key], value, {
                formattingOptions: { insertSpaces: true, tabSize: 2 },
              }),
            );
          }
        put(stage, file, content);
      }
      for (const item of remoteItems)
        for (const file of item.files) {
          assertSafeTarget(stage, file.target);
          put(stage, file.target, file.content);
        }
      writeStandardRoot(stage, options, registry, true);
      if (options.products.includes('next') && options.hosting === 'vercel')
        registerVercelApplication(stage);
      if (
        [...sourceFiles(stage).keys()].some((file) => /^apps\/[^/]+\/wrangler\.jsonc$/.test(file))
      )
        registerApplication(stage, true);
      if (!request.dryRun)
        run(
          'pnpm',
          ['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts'],
          stage,
        );
      const after = sourceFiles(stage);
      const files = { ...baseline };
      for (const [file, hash] of after) {
        if (before.get(file) === hash) continue;
        if (
          before.has(file) &&
          baseline[file] !== before.get(file) &&
          file !== 'anhedral.project.json'
        )
          conflicts.push(file);
        commitPaths.push(file);
        files[file] = hash;
      }
      // Never delete preexisting source as a side effect of an addition.
      for (const file of before.keys()) if (!after.has(file)) conflicts.push(file);
      if (conflicts.length && !request.dryRun)
        throw new Error(
          `Addition conflicts with edited or untracked source: ${conflicts.join(', ')}. No files were installed.`,
        );
      const remoteReceipts = Array.isArray(receipt.remoteItems) ? [...receipt.remoteItems] : [];
      for (const item of remoteItems) {
        const identity = `${remote!.source}#${item.name}`;
        const previous = remoteReceipts.findIndex((entry) => entry.identity === identity);
        const entry = {
          identity,
          name: item.name,
          version: item.version,
          source: remote!.source,
          integrity: remote!.integrity,
          targets: item.files.map((file) => file.target),
        };
        if (previous >= 0) remoteReceipts[previous] = entry;
        else remoteReceipts.push(entry);
      }
      json(stage, 'anhedral.registry.json', {
        ...registry,
        status: 'scaffolded',
        resourcesProvisioned: false,
        workspaces: inspectWorkspaceGraph(stage),
        files,
        ...(remoteReceipts.length ? { remoteItems: remoteReceipts } : {}),
      });
      commitPaths.push('anhedral.registry.json');
      // Detect concurrent changes even to source that this addition would otherwise preserve.
      if (
        !isDeepStrictEqual(sourceFiles(root), before) ||
        readFileSync(path.join(root, 'anhedral.registry.json'), 'utf8') !== receiptText
      )
        throw new Error('Workspace changed during addition; retry after reviewing source.');
    },
    afterCommit: () => {
      if (!request.skipInstall)
        run('pnpm', ['install', '--frozen-lockfile', '--ignore-scripts'], root);
    },
  });
  return result;
}
