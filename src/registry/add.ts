import { scaffoldCloudflareServiceContext } from '../scaffold/cloudflare-services.js';
import {
  PROJECT_CONFIG_FILE,
  readProjectSection,
  writeProjectSection,
  hasProjectSection,
} from '../project-config.js';
import { scaffoldExpoRuntime } from '../scaffold/expo-runtime.js';
import { scaffoldWebBackend } from '../scaffold/backend.js';
import { configureDependencyPatches } from '../dependency-patches.js';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from '../bounded-file.js';
import { bootstrapWorkspace, assertWorkspaceRuntime } from '../scaffold/bootstrap.js';
import { registerApplication } from '../project-state.js';
import { registerVercelApplication } from '../vercel.js';
import { existsSync, lstatSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { applyEdits, modify, parse } from 'jsonc-parser';
import { STANDARD_PRODUCTS, getStackDefinition, installStackItem } from '../stack-registry.js';
import { inspectProject, validateSetupPlan } from '../readiness.js';
import { GENERATOR_VERSION } from '../version.js';
import { runStagedTransaction } from '../transaction.js';
import { inspectWorkspaceGraph } from '../workspace-graph.js';
import { execFile } from '../util.js';
import { supportsVoidRuntime, usesVoidSelection } from '../runtime-policy.js';
import { put } from '../scaffold/files.js';
import { writeStandardRoot } from '../scaffold/workspace.js';
import { configureVoidDelivery, refreshVoidEnvironment } from '../scaffold/void.js';
import { createRecipeContext } from './context.js';
import {
  resolveBillingProducts,
  resolveStackRegistry,
  resolveStandardProducts,
} from './resolve.js';
import { sourceFiles, configurationFingerprints } from './receipt.js';
import type { StandardOptions, StandardProduct, StandardRunner } from './types.js';
import {
  sourcePreview,
  validatePreviewPath,
  MAX_PREVIEW_TOTAL_BYTES,
  type SourcePreview,
} from './preview.js';

export interface AddRequest {
  items: string[];
  dryRun?: boolean;
  skipInstall?: boolean;
  preview?: { mode: 'diff' | 'view'; path?: string };
}

/** Add recipes to an initialized workspace, refusing edits to customer-owned source. */
export async function addStackItems(
  root: string,
  request: AddRequest,
  run: StandardRunner = execFile,
) {
  for (const key of Object.keys(request))
    if (!['items', 'dryRun', 'skipInstall', 'preview'].includes(key))
      throw new Error(`Unknown add option: ${key}. Only bundled registry items are supported.`);
  if (request.preview) {
    if (
      !request.dryRun ||
      !['diff', 'view'].includes(request.preview.mode) ||
      Object.keys(request.preview).some((key) => !['mode', 'path'].includes(key))
    )
      throw new Error('Source previews require dry-run and one mode: diff or view.');
    if (request.preview.path !== undefined) validatePreviewPath(request.preview.path);
  }
  if (!request.dryRun) assertWorkspaceRuntime(run);
  root = realpathSync(root);
  if (!request.items.length) throw new Error('Select at least one registry item.');
  const plan = readProjectSection(root, 'setup');
  if (
    Array.isArray(plan?.registry?.items) &&
    plan.registry.items.some(
      (item: { name?: string; package?: unknown }) => item.name === 'stripe' && item.package,
    )
  )
    throw new Error(
      'This project uses the legacy billing SDK recipe. Use its pinned CLI or perform a reviewed billing migration before adding capabilities.',
    );
  validateSetupPlan(plan);
  if (plan.cliVersion !== GENERATOR_VERSION)
    throw new Error('Use the project CLI version before adding recipes.');
  if (!inspectProject(root).localReady)
    throw new Error('Run doctor and resolve project provenance or workspace errors before add.');
  const receipt = readProjectSection(root, 'registry');
  if (!receipt.files || typeof receipt.files !== 'object' || Array.isArray(receipt.files))
    throw new Error('Add requires current scaffold fingerprints.');
  const baseline = receipt.files as Record<string, string>;
  if (
    !receipt.configuration ||
    typeof receipt.configuration !== 'object' ||
    Array.isArray(receipt.configuration)
  )
    throw new Error('Add requires current configuration fingerprints.');
  const originalConfiguration = configurationFingerprints(root);
  const selected = new Set<StandardProduct>(plan.products);
  for (const id of request.items) {
    if (!(STANDARD_PRODUCTS as readonly string[]).includes(id))
      throw new Error(`Unknown stack product: ${id}.`);
    selected.add(id as StandardProduct);
  }
  const existingServerFeatures = plan.products.some((id) =>
    Boolean(getStackDefinition(id).runtime),
  );
  if (
    !existingServerFeatures &&
    request.items.some((id) => Boolean(getStackDefinition(id).runtime))
  )
    selected.add('hono');
  if (
    request.items.some(
      (id) =>
        ['stripe', 'revenuecat'].includes(id) && !plan.products.includes(id as StandardProduct),
    )
  )
    resolveBillingProducts(selected);
  if (
    ['queues', 'basin', 'expo', 'images', 'analytics-engine'].some((id) =>
      selected.has(id as StandardProduct),
    ) &&
    hasProjectSection(root, 'cloudflare') &&
    readProjectSection(root, 'cloudflare').deliveryEngine === 'void'
  )
    throw new Error(
      'Expo web, Queues, Basin, Images and Analytics Engine require Wrangler delivery. They cannot be added to a Void project.',
    );
  resolveStandardProducts(selected, plan.hosting, false, false);
  const voidSelected = usesVoidSelection([...selected], plan.hosting);
  if (
    !request.dryRun &&
    voidSelected &&
    run === execFile &&
    !supportsVoidRuntime(process.versions.node)
  )
    throw new Error('Cloudflare workspaces using Void require Node.js 24.21.0 or newer.');
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
  if (
    plan.products.includes('hono') &&
    !existsSync(path.join(root, 'packages/contracts/package.json')) &&
    (request.items.some(
      (id) => ['vinext', 'next'].includes(id) && !plan.products.some((existing) => existing === id),
    ) ||
      (request.items.includes('better-auth') &&
        !plan.products.includes('better-auth') &&
        plan.products.some((id) => ['vinext', 'next'].includes(id))))
  )
    throw new Error(
      'This API predates shared contracts. Migrate its contracts and API endpoints explicitly before adding web/auth wiring.',
    );
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
        `Adding this selection relocates ${item.name}; additions must preserve existing runtime ownership.`,
      );
  }
  const before = sourceFiles(root);
  const receiptText = readBoundedFile(
    path.join(root, PROJECT_CONFIG_FILE),
    MAX_PROJECT_JSON_BYTES,
  ).toString('utf8');
  const commitPaths: string[] = [];
  const conflicts: string[] = [];
  const result = {
    schemaVersion: 1,
    root,
    dryRun: !!request.dryRun,
    items: registry.items
      .filter((item) => !isDeepStrictEqual(oldItems.get(item.name), item))
      .map((item) => item.name),
    bootstrapRequired:
      recipes.some((item) => ['vinext', 'next'].includes(item.name)) &&
      !existsSync(path.join(root, 'apps/web/package.json')),
    filesChecked: true,
    targets: recipes.flatMap((item) => item.targets),
    files: commitPaths,
    conflicts,
    ...(request.preview ? { previews: [] as SourcePreview[] } : {}),
  };
  // The upstream web generator requires network access and executes package scripts.
  // A preview reports the resolved selection without invoking that generator.
  if (request.dryRun && result.bootstrapRequired) {
    result.filesChecked = false;
    if (request.preview)
      throw new Error(
        'Source preview requires a new web bootstrap and cannot run offline. Use add --dry-run for the selection plan.',
      );
    return result;
  }
  await runStagedTransaction(root, {
    dryRun: !!request.dryRun,
    commitPaths,
    seedPaths: [...before.keys(), PROJECT_CONFIG_FILE],
    build: async (stage) => {
      const context = createRecipeContext(stage, options);
      context.updating = true;
      for (const item of registry.items) Object.assign(context.bindings, item.bindings);
      if (
        recipes.some((item) => ['vinext', 'next'].includes(item.name)) &&
        !existsSync(path.join(stage, 'apps/web/package.json'))
      )
        bootstrapWorkspace(stage, options.name, run, true);
      for (const item of recipes) {
        if (item.name === 'expo' && plan.products.includes('expo')) {
          scaffoldExpoRuntime(context);
        } else await installStackItem(item, context);
      }
      // Connect a newly introduced backend without regenerating customer UI.
      if (!plan.products.includes('hono') && selected.has('hono')) {
        if (plan.products.includes('expo')) scaffoldExpoRuntime(context);
        if (plan.products.includes('next') || plan.products.includes('vinext'))
          scaffoldWebBackend(context);
      }
      // Configuration items affect the existing runtime without regenerating its application source.
      const configurationItems = registry.items.filter(
        (item) => !isDeepStrictEqual(oldItems.get(item.name), item) && item.bindings,
      );
      if (configurationItems.length) {
        const directory = `apps/${context.runtimeApp}`;
        const file = `${directory}/${existsSync(path.join(stage, directory, 'anhedral.cloudflare.json')) ? 'anhedral.cloudflare.json' : 'wrangler.jsonc'}`;
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
      scaffoldCloudflareServiceContext(context);
      writeStandardRoot(stage, options, registry, true);
      if (voidSelected) {
        configureVoidDelivery(stage);
        refreshVoidEnvironment(stage);
      }
      if (options.products.includes('next') && options.hosting === 'vercel')
        registerVercelApplication(stage);
      if (
        [...sourceFiles(stage).keys()].some((file) =>
          /^apps\/[^/]+\/(?:wrangler\.jsonc|anhedral\.cloudflare\.json)$/.test(file),
        )
      )
        registerApplication(stage, true);
      if (!request.dryRun)
        run(
          'pnpm',
          ['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts'],
          stage,
        );
      if (!request.dryRun && configureDependencyPatches(stage))
        run(
          'pnpm',
          ['install', '--lockfile-only', '--no-frozen-lockfile', '--ignore-scripts'],
          stage,
        );
      const after = sourceFiles(stage);
      const files = { ...baseline };
      for (const [file, hash] of after) {
        if (before.get(file) === hash) continue;
        if (before.has(file) && baseline[file] !== before.get(file)) conflicts.push(file);
        commitPaths.push(file);
        files[file] = hash;
      }
      const configuration = configurationFingerprints(stage);
      for (const [section, hash] of Object.entries(originalConfiguration)) {
        // Hosting registration preserves existing user fields while adding new targets.
        if (
          section !== 'cloudflare' &&
          hash !== receipt.configuration[section] &&
          configuration[section] !== hash
        )
          conflicts.push(`${PROJECT_CONFIG_FILE} (${section})`);
      }
      // Never delete preexisting source as a side effect of an addition.
      for (const file of before.keys()) if (!after.has(file)) conflicts.push(file);
      if (conflicts.length && !request.dryRun)
        throw new Error(
          `Addition conflicts with edited or untracked source: ${conflicts.join(', ')}. No files were installed.`,
        );
      writeProjectSection(stage, 'registry', {
        ...registry,
        status: 'scaffolded',
        resourcesProvisioned: false,
        workspaces: inspectWorkspaceGraph(stage),
        files,
        configuration,
      });
      commitPaths.push(PROJECT_CONFIG_FILE);
      if (request.preview && result.previews) {
        const preview = request.preview;
        const selected = [...commitPaths]
          .filter((file) => !preview.path || preview.path === file)
          .sort();
        if (preview.path && !selected.length)
          throw new Error('Requested path is not a changed generated source file.');
        let total = 0;
        for (const file of selected) {
          const content = sourcePreview(root, stage, file, preview.mode);
          total += Buffer.byteLength(JSON.stringify(content));
          if (total > MAX_PREVIEW_TOTAL_BYTES)
            throw new Error(
              'Source preview exceeds 1 MiB. Select a single file with --diff <path> or --view <path>.',
            );
          result.previews.push(content);
        }
      }
      // Detect concurrent changes even to source that this addition would otherwise preserve.
      if (
        !isDeepStrictEqual(sourceFiles(root), before) ||
        readBoundedFile(path.join(root, PROJECT_CONFIG_FILE), MAX_PROJECT_JSON_BYTES).toString(
          'utf8',
        ) !== receiptText
      )
        throw new Error('Workspace changed during addition; retry after reviewing source.');
    },
    afterCommit: () => {
      if (request.skipInstall) return;
      const lockPath = path.join(root, 'pnpm-lock.yaml');
      const lock = readBoundedFile(lockPath, 16 * 1024 * 1024);
      const modules = path.join(root, 'node_modules');
      const metadata = lstatSync(modules, { throwIfNoEntry: false });
      if (metadata && (!metadata.isDirectory() || metadata.isSymbolicLink()))
        throw new Error('Dependency installation requires a real project node_modules directory.');
      // pnpm 10 can retain skipped optional packages after a new recipe makes
      // them required. Rebuild generated links from the reviewed lock while
      // retaining the separate content-addressed package store.
      rmSync(modules, { recursive: true, force: true });
      run('pnpm', ['install', '--frozen-lockfile'], root);
      if (!readBoundedFile(lockPath, 16 * 1024 * 1024).equals(lock))
        throw new Error(
          'Frozen dependency installation changed the reviewed lockfile; review it before continuing.',
        );
    },
  });
  return result;
}
