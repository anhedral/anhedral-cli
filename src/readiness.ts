import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from './bounded-file.js';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { inspectWorkspaceGraph } from './workspace-graph.js';
import { resolveStackRegistry, resolveStandardProducts } from './registry/resolve.js';
import type { ResolvedStackRegistry } from './registry/resolve.js';
import { CAPABILITY_REGISTRY } from './capabilities.js';
import { STANDARD_PRODUCTS, type StandardProduct } from './stack-registry.js';

export function inspectProject(root: string) {
  const checks: { id: string; ok: boolean; detail: string }[] = [];
  const record = (id: string, ok: boolean, detail: string) => checks.push({ id, ok, detail });
  const read = (file: string) =>
    JSON.parse(readBoundedFile(path.join(root, file), MAX_PROJECT_JSON_BYTES).toString('utf8'));
  record(
    'workspace',
    existsSync(path.join(root, 'pnpm-workspace.yaml')),
    'pnpm workspace manifest',
  );
  record(
    'lockfile',
    existsSync(path.join(root, 'pnpm-lock.yaml')),
    'Committed dependency resolution required',
  );
  try {
    const plan = read('anhedral.setup.json');
    const recordedVersion = plan?.cliVersion;
    const compatible = recordedVersion === CAPABILITY_REGISTRY.cliVersion;
    record(
      'cli-compatibility',
      compatible,
      /^\d+\.\d+\.\d+$/.test(recordedVersion ?? '')
        ? `Use anhedral@${recordedVersion} for this project or review upgrade differences`
        : 'Use the recorded project CLI version or review upgrade differences',
    );
    validateSetupPlan(plan);
    const standard = read('anhedral.standard.json');
    record('setup-plan', true, `Requirements recorded by CLI ${plan.cliVersion}`);
    try {
      const installed = read('anhedral.registry.json');
      const {
        status,
        workspaces: _workspaces,
        files: _files,
        resourcesProvisioned,
        ...snapshot
      } = installed;
      if (
        status !== 'scaffolded' ||
        resourcesProvisioned !== false ||
        !isDeepStrictEqual(snapshot, plan.registry)
      )
        throw new Error('Registry provenance differs from the setup plan.');
      for (const item of plan.registry.items)
        for (const target of item.targets) {
          if (!existsSync(path.join(root, target)))
            throw new Error(`Registry target missing: ${item.name}.`);
        }
      record(
        'stack-registry',
        true,
        'Registry provenance and resolved targets match the setup plan',
      );
    } catch {
      record(
        'stack-registry',
        false,
        'Missing registry provenance or targets; inspect before regenerating',
      );
    }
    try {
      const workspaces = inspectWorkspaceGraph(root);
      record(
        'workspace-graph',
        workspaces.length > 0,
        'Workspace names and dependencies resolve without cycles',
      );
    } catch {
      record(
        'workspace-graph',
        false,
        'Invalid workspace manifests, references or dependency cycles',
      );
    }

    record(
      'selection',
      standard.schemaVersion === 1 &&
        JSON.stringify(standard.products) === JSON.stringify(plan.products) &&
        standard.hosting ===
          (plan.products.includes('next') || plan.products.includes('vinext')
            ? plan.hosting
            : null),
      'Setup plan matches project selection',
    );
  } catch {
    record(
      'setup-plan',
      false,
      'Missing, invalid or unsupported setup plan; inspect the project before changing it',
    );
  }
  return {
    schemaVersion: 1,
    root,
    checks,
    localReady: checks.every((check) => check.ok),
    providerVerification: 'unverified',
    productionReady: false,
  };
}

export function validateSetupPlan(plan: unknown): asserts plan is {
  schemaVersion: 1;
  cliVersion: string;
  registryVersion: 1;
  products: StandardProduct[];
  hosting: 'cloudflare' | 'vercel';
  name?: string;
  registry: ResolvedStackRegistry;
} {
  if (!plan || typeof plan !== 'object') throw new Error('Invalid setup plan.');
  const value = plan as Record<string, unknown>;
  if (
    value.schemaVersion !== 1 ||
    value.registryVersion !== 1 ||
    typeof value.cliVersion !== 'string'
  )
    throw new Error('Unsupported setup plan version.');
  if (
    /^\d+\.\d+\.\d+$/.test(value.cliVersion as string) &&
    value.cliVersion !== CAPABILITY_REGISTRY.cliVersion
  )
    throw new Error(
      `Use anhedral@${value.cliVersion} for this project or review upgrade differences.`,
    );
  if (
    !Array.isArray(value.products) ||
    !value.products.length ||
    !value.products.every((id) => STANDARD_PRODUCTS.includes(id))
  )
    throw new Error('Unknown setup capabilities.');
  if (value.hosting !== 'cloudflare' && value.hosting !== 'vercel')
    throw new Error('Invalid hosting.');
  validateRequirements(value.setup, value.products);
  const selected = new Set<StandardProduct>(value.products);
  resolveStandardProducts(selected, value.hosting, false);
  if (selected.size !== value.products.length)
    throw new Error('Invalid or incomplete setup selection.');
  if (value.name !== undefined && typeof value.name !== 'string')
    throw new Error('Invalid setup project name.');
  if (
    !isDeepStrictEqual(
      value.registry,
      resolveStackRegistry({
        products: value.products,
        hosting: value.hosting,
        name: value.name as string | undefined,
      }),
    )
  )
    throw new Error('Invalid or inconsistent stack registry.');
}

function validateRequirements(setup: unknown, products: string[]): void {
  if (!setup || typeof setup !== 'object') throw new Error('Missing setup requirements.');
  const value = setup as Record<string, unknown>;
  if (
    value.resourcesProvisioned !== false ||
    !Array.isArray(value.capabilities) ||
    value.capabilities.length !== products.length
  )
    throw new Error('Invalid capability requirements.');
  const ids = value.capabilities.map((item) => validateCapability(item));
  if (new Set(ids).size !== products.length || !products.every((id) => ids.includes(id)))
    throw new Error('Capability selection mismatch.');
}

function validateCapability(item: unknown): string {
  if (!item || typeof item !== 'object') throw new Error('Invalid capability.');
  const value = item as Record<string, unknown>;
  if (
    typeof value.id !== 'string' ||
    typeof value.purpose !== 'string' ||
    !['planned', 'starter'].includes(String(value.status))
  )
    throw new Error('Invalid capability metadata.');
  for (const key of ['tools', 'access', 'credentials', 'resources', 'verify']) {
    if (!Array.isArray(value[key]) || !value[key].every((entry) => typeof entry === 'string'))
      throw new Error('Invalid requirement fields.');
  }
  return value.id;
}
