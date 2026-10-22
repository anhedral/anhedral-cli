import { lstatSync, realpathSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { readBoundedFile } from '../bounded-file.js';
import { parseProjectConfig } from '../project-config.js';
import { validateSetupPlan } from '../readiness.js';
import { STANDARD_PRODUCTS } from '../stack-registry.js';
import { GENERATOR_VERSION } from '../version.js';
import type {
  UiConsumerDescriptor,
  UiConsumerResolution,
  UiInspectionOptions,
  UiPlatform,
} from './types.js';

type ObjectValue = Record<string, unknown>;
class DeclarationError extends Error {}
function object(value: unknown): ObjectValue {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new DeclarationError('Expected an object declaration.');
  return value as ObjectValue;
}
function portable(relative: string): void {
  if (
    typeof relative !== 'string' ||
    relative.length > 512 ||
    !/^[a-zA-Z0-9_@.-]+(?:\/[a-zA-Z0-9_@.-]+)*$/.test(relative) ||
    relative.split('/').some((part) => part === '.' || part === '..')
  )
    throw new DeclarationError('Expected a portable workspace-relative path.');
}
/** Static containment checks; concurrent ancestor replacement is not certified. */
function safe(root: string, relative: string): string {
  portable(relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    if (lstatSync(current).isSymbolicLink())
      throw new DeclarationError('UI inspection rejects symlink paths.');
  }
  return current;
}
function declarations(root: string) {
  const cache = new Map<string, ObjectValue>();
  let bytes = 0;
  return (relative: string): ObjectValue => {
    const existing = cache.get(relative);
    if (existing) return existing;
    if (cache.size >= 129) throw new DeclarationError('UI declaration count exceeds limit.');
    const source = readBoundedFile(
      safe(root, relative),
      relative === 'anhedral.json' ? 2 * 1024 * 1024 : 128 * 1024,
    );
    bytes += source.length;
    if (bytes > 4 * 1024 * 1024)
      throw new DeclarationError('UI declarations exceed total byte limit.');
    let value: ObjectValue;
    try {
      value = object(JSON.parse(source.toString('utf8')));
    } catch {
      throw new DeclarationError('Invalid JSON object declaration.');
    }
    cache.set(relative, value);
    return value;
  };
}
function runtimeDependencies(manifest: ObjectValue): Record<string, string> {
  const dependencies = object(manifest.dependencies ?? {});
  if (
    Object.keys(dependencies).length > 256 ||
    Object.values(dependencies).some((value) => typeof value !== 'string')
  )
    throw new DeclarationError('Invalid or oversized runtime dependencies.');
  return dependencies as Record<string, string>;
}
function workspaces(root: string, read: ReturnType<typeof declarations>) {
  const graph: {
    name: string;
    directory: string;
    manifest: ObjectValue;
    dependencies: Record<string, string>;
  }[] = [];
  for (const group of ['apps', 'packages']) {
    if (!lstatSync(path.join(root, group), { throwIfNoEntry: false })) continue;
    const parent = safe(root, group);
    if (!lstatSync(parent).isDirectory()) throw new DeclarationError('Invalid workspace group.');
    const entries = readdirSync(parent, { withFileTypes: true });
    if (entries.length > 128) throw new DeclarationError('Workspace count exceeds limit.');
    for (const entry of entries) {
      if (entry.isSymbolicLink())
        throw new DeclarationError('UI inspection rejects workspace symlinks.');
      if (!entry.isDirectory()) continue;
      if (graph.length >= 128) throw new DeclarationError('Workspace count exceeds limit.');
      const directory = `${group}/${entry.name}`;
      const manifest = read(`${directory}/package.json`);
      if (
        typeof manifest.name !== 'string' ||
        !/^(?:@[\w.-]+\/)?[\w.-]+$/.test(manifest.name) ||
        graph.some((node) => node.name === manifest.name)
      )
        throw new DeclarationError('Invalid or duplicate workspace name.');
      graph.push({
        name: manifest.name,
        directory,
        manifest,
        dependencies: runtimeDependencies(manifest),
      });
    }
  }
  return graph;
}
/** Inspect supported package-export conditions in declaration order, not by flattening them. */
function exportTarget(value: unknown, platform: UiPlatform, depth = 0): string | null | undefined {
  if (depth > 8) throw new DeclarationError('UI export conditions exceed depth limit.');
  if (value === null || typeof value === 'string') return value;
  const entries = Object.entries(object(value));
  if (entries.length > 16) throw new DeclarationError('Too many UI export conditions.');
  for (const [condition, target] of entries) {
    if (!['default', 'import', platform === 'web' ? 'browser' : 'react-native'].includes(condition))
      continue;
    const resolved = exportTarget(target, platform, depth + 1);
    if (resolved !== undefined) return resolved;
  }
  return undefined;
}

/** Offline identity inspection; no recipe, foundation or runtime acceptance is implied. */
export function resolveUiConsumer(
  root: string,
  options: UiInspectionOptions = {},
): UiConsumerResolution {
  const result = (
    state: UiConsumerResolution['state'],
    reason: string,
    consumers: UiConsumerDescriptor[] = [],
    consumer: UiConsumerDescriptor | null = null,
  ): UiConsumerResolution => ({ state, reason, consumers, consumer, eligibility: 'unavailable' });
  try {
    if (Object.keys(options).some((key) => !['app', 'platform'].includes(key)))
      throw new DeclarationError('Unknown UI inspection option.');
    if (options.app !== undefined) portable(options.app);
    if (options.platform !== undefined && !['web', 'ios', 'android'].includes(options.platform))
      throw new DeclarationError('UI platform must be web, ios or android.');
    const absolute = path.resolve(root);
    if (lstatSync(absolute).isSymbolicLink() || !lstatSync(absolute).isDirectory())
      throw new DeclarationError('Project root must be a real directory.');
    root = realpathSync(absolute);
    const read = declarations(root);
    const config = parseProjectConfig(read('anhedral.json'));
    const standard = object(config.standard),
      setup = object(config.setup);
    if (
      standard.schemaVersion !== 1 ||
      setup.schemaVersion !== 1 ||
      setup.registryVersion !== 1 ||
      typeof setup.cliVersion !== 'string' ||
      !Array.isArray(standard.products) ||
      !standard.products.length ||
      !standard.products.every(
        (id) => typeof id === 'string' && (STANDARD_PRODUCTS as readonly string[]).includes(id),
      ) ||
      new Set(standard.products).size !== standard.products.length ||
      !isDeepStrictEqual(standard.products, setup.products) ||
      !['cloudflare', 'vercel'].includes(String(setup.hosting))
    )
      throw new DeclarationError('Invalid or inconsistent project selection.');
    const products = standard.products as string[];
    if (products.includes('next') && products.includes('vinext'))
      throw new DeclarationError('Conflicting selected web profiles.');
    const expectedHosting = products.some((id) => ['expo', 'next', 'vinext'].includes(id))
      ? setup.hosting
      : null;
    if (standard.hosting !== expectedHosting)
      throw new DeclarationError('Hosting selection mismatch.');
    const legacy = setup.cliVersion !== GENERATOR_VERSION;
    if (!legacy) {
      try {
        validateSetupPlan(setup);
      } catch {
        throw new DeclarationError(
          'Setup requirements or registry do not match the supported selection.',
        );
      }
    }
    const registry = object(setup.registry);
    if (
      registry.schemaVersion !== 1 ||
      typeof registry.name !== 'string' ||
      registry.cliVersion !== setup.cliVersion ||
      !Array.isArray(registry.items) ||
      registry.items.length > 128
    )
      throw new DeclarationError('Invalid registry metadata.');
    const items = registry.items.map(object);
    for (const item of items) {
      if (
        typeof item.name !== 'string' ||
        !Array.isArray(item.targets) ||
        item.targets.length > 128
      )
        throw new DeclarationError('Invalid registry item declarations.');
      for (const target of item.targets) {
        if (typeof target !== 'string') throw new DeclarationError('Invalid registry target.');
        portable(target);
      }
    }
    if (new Set(items.map((item) => item.name)).size !== items.length)
      throw new DeclarationError('Duplicate registry items.');
    const recorded = object(config.registry);
    const {
      status,
      workspaces: _workspaces,
      files: _files,
      configuration: _configuration,
      resourcesProvisioned,
      ...snapshot
    } = recorded;
    if (
      status !== 'scaffolded' ||
      resourcesProvisioned !== false ||
      !isDeepStrictEqual(snapshot, setup.registry)
    )
      throw new DeclarationError('Registry receipt differs from setup metadata.');
    const graph = workspaces(root, read);
    const consumers: UiConsumerDescriptor[] = [];
    for (const node of graph.filter((node) => node.directory.startsWith('apps/'))) {
      const dependencies = node.dependencies;
      // Vinext intentionally retains Next as a compatibility dependency.
      const profiles = (['expo', 'vinext', 'next'] as const).filter(
        (id) =>
          Object.hasOwn(dependencies, id) &&
          !(id === 'next' && Object.hasOwn(dependencies, 'vinext')),
      );
      if (!profiles.length) continue;
      if (profiles.length !== 1 || !products.includes(profiles[0]))
        throw new DeclarationError('Consumer manifest conflicts with selected UI profile.');
      const profile = profiles[0];
      const recipe = items.find((item) => item.name === profile);
      if (!recipe || !(recipe.targets as string[]).includes(node.directory))
        throw new DeclarationError('Consumer differs from its recorded profile target.');
      const packages: NonNullable<UiConsumerDescriptor['uiPackage']>[] = [];
      for (const [dependency, version] of Object.entries(dependencies)) {
        if (!version.startsWith('workspace:')) continue;
        const target = graph.find((item) => item.name === dependency);
        if (!target || !['workspace:*', 'workspace:^', 'workspace:~'].includes(version))
          throw new DeclarationError('Missing or unsupported runtime workspace dependency.');
        if (!target.manifest.exports) continue;
        const exports = object(target.manifest.exports);
        const buttonKey = ['./components/button', './components/*', './button'].find((key) =>
          Object.hasOwn(exports, key),
        );
        if (!buttonKey) {
          if (/(?:^|\/)ui$/.test(dependency))
            throw new DeclarationError('Declared UI package has no explicit button export.');
          continue;
        }
        // A narrow inspector must not advertise the broad pattern when another
        // matching pattern can block or redirect the same import.
        const subpath = buttonKey.replaceAll('*', 'button');
        if (
          buttonKey.includes('*') &&
          Object.keys(exports).some((key) => {
            if (key === buttonKey || !key.includes('*')) return false;
            const parts = key.split('*');
            return (
              parts.length !== 2 ||
              (subpath.startsWith(parts[0]) &&
                subpath.endsWith(parts[1]) &&
                subpath.length >= parts[0].length + parts[1].length)
            );
          })
        )
          throw new DeclarationError(
            'Overlapping UI export patterns require explicit supported exports.',
          );
        const buttonTargets: Partial<Record<UiPlatform, string>> = {};
        for (const platform of profile === 'expo'
          ? (['web', 'ios', 'android'] as const)
          : (['web'] as const)) {
          const template = exportTarget(exports[buttonKey], platform);
          if (template == null) continue;
          if (
            !template.startsWith('./') ||
            (template.match(/\*/g)?.length ?? 0) > (buttonKey.includes('*') ? 1 : 0)
          )
            throw new DeclarationError('Unsupported or escaping UI export target.');
          const destination = template.replaceAll('*', 'button').slice(2);
          const file = safe(root, `${target.directory}/${destination}`);
          if (!lstatSync(file).isFile())
            throw new DeclarationError('UI export must name a regular file.');
          buttonTargets[platform] = destination;
        }
        packages.push({
          root: target.directory,
          importNamespace: dependency,
          buttonExport: `${dependency}${buttonKey.replaceAll('*', 'button').slice(1)}`,
          buttonTargets,
        });
      }
      if (packages.length > 1)
        throw new DeclarationError('Consumer declares multiple runtime button providers.');
      consumers.push({
        workspace: node.directory,
        profile,
        uiPackage: packages[0] ?? null,
        supportedPlatforms: profile === 'expo' ? ['web', 'ios', 'android'] : ['web'],
        platform: options.platform ?? null,
        sourceRecipeVersion: null,
        portableContractVersion: null,
      });
    }
    if (
      (['expo', 'next', 'vinext'] as const).some(
        (profile) =>
          products.includes(profile) && !consumers.some((item) => item.profile === profile),
      )
    )
      throw new DeclarationError('Selected UI profile has no matching workspace manifest.');
    if (consumers.length > 1 && options.app === undefined)
      return result('ambiguous', 'Select a consumer with --app.', consumers);
    const consumer =
      options.app === undefined
        ? consumers[0]
        : consumers.find((item) => item.workspace === options.app);
    if (!consumer)
      return result('unsupported', 'No selected UI consumer matches this application.', consumers);
    if (
      options.platform &&
      (!consumer.supportedPlatforms.includes(options.platform) ||
        (consumer.uiPackage && !consumer.uiPackage.buttonTargets[options.platform]))
    )
      return result(
        'unsupported',
        'Platform or declared button export is unsupported by this consumer.',
        consumers,
        consumer,
      );
    return result(
      'migration-required',
      legacy
        ? 'Legacy metadata identifies this consumer; portable recipe unavailable.'
        : consumer.uiPackage
          ? 'Consumer identified; portable foundation and source recipe are unavailable in K1a.'
          : 'Consumer identified without a declared shared UI package; portable foundation unavailable.',
      consumers,
      consumer,
    );
  } catch (error) {
    return result(
      'invalid',
      error instanceof DeclarationError
        ? error.message
        : 'Invalid or unsafe UI consumer declarations.',
    );
  }
}
