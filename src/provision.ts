import { assertNoDeletedServices } from './service-deletion.js';
import { existsSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { readBoundedFile } from './bounded-file.js';
import { applyEdits, modify } from 'jsonc-parser';
import {
  atomicJson,
  authenticate,
  defaultRunner,
  environment,
  readApplication,
  readConfig,
  targetDirectory,
  withApplicationLock,
  type DeliveryRunner,
} from './project-state.js';
import { cloudflareRequest, listCloudflare, type CloudflareRequest } from './cloudflare.js';

interface Resource {
  kind: 'd1' | 'r2';
  name: string;
  id?: string;
  target: string;
  field?: (string | number)[];
}
const resourceTypes = {
  d1: { endpoint: '/d1/database', nameField: 'name', idField: 'uuid' },
  r2: { endpoint: '/r2/buckets', nameField: 'name', idField: 'name' },
} as const;

async function listResources(
  request: CloudflareRequest,
  kind: Resource['kind'],
): Promise<Record<string, unknown>[]> {
  const { endpoint } = resourceTypes[kind];
  if (kind !== 'r2') return listCloudflare(request, endpoint);
  const value = (await request('GET', endpoint)).result as {
    buckets?: Record<string, unknown>[];
    truncated?: boolean;
  };
  if (!Array.isArray(value?.buckets) || value.truncated)
    throw new Error(
      'Unsupported or truncated R2 bucket listing; select resources explicitly with provider tooling.',
    );
  return value.buckets;
}

/** Provisioning and recovery use the same independently verified private-storage policy. */
async function assertPrivateBucket(request: CloudflareRequest, name: string): Promise<void> {
  const endpoint = `${resourceTypes.r2.endpoint}/${encodeURIComponent(name)}/domains`;
  const managed = (await request('GET', `${endpoint}/managed`)).result as { enabled?: unknown };
  const custom = (await request('GET', `${endpoint}/custom`)).result as {
    domains?: { enabled?: unknown }[];
  };
  if (
    managed?.enabled !== false ||
    !Array.isArray(custom?.domains) ||
    custom.domains.some((domain) => domain.enabled !== false)
  )
    throw new Error(
      'Selected R2 bucket has public or unknown domain access; resolve it before using private storage.',
    );
}

function resourceName(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-z0-9][a-z0-9-]{0,62}$/.test(value))
    throw new Error('Resources require explicit lowercase names of at most 63 characters.');
  return value;
}
export function planProvisioning(root: string) {
  const project = readApplication(root);
  const resources: Resource[] = [];
  for (const target of project.targets) {
    const config = readConfig(targetDirectory(root, target));
    if (
      (config.env && Object.keys(config.env as object).length) ||
      (config.account_id && config.account_id !== project.accountId)
    )
      throw new Error('Reconcile target account/environment before provisioning.');
    for (const [kind, field] of [
      ['d1', 'd1_databases'],
      ['r2', 'r2_buckets'],
    ] as const) {
      const entries = config[field];
      if (entries === undefined) continue;
      if (!Array.isArray(entries)) throw new Error(`Invalid ${field} configuration.`);
      entries.forEach((entry, index) => {
        if (!entry || typeof entry.binding !== 'string' || entry.jurisdiction)
          throw new Error('Use an explicit provider workflow for jurisdiction-specific resources.');
        const name = resourceName(kind === 'd1' ? entry.database_name : entry.bucket_name);
        const id = kind === 'd1' ? entry.database_id : undefined;
        resources.push({
          kind,
          name,
          target: target.id,
          id: typeof id === 'string' && !id.startsWith('REPLACE_WITH_') ? id : undefined,
          field: kind === 'r2' ? undefined : [field, index, kind === 'd1' ? 'database_id' : 'id'],
        });
      });
    }
  }
  return {
    projectId: project.id,
    accountId: project.accountId,
    resources,
    externalIntegrations: [],
  };
}
export async function provisionApplication(
  root: string,
  dryRun = false,
  run: DeliveryRunner = defaultRunner,
  suppliedRequest?: CloudflareRequest,
) {
  root = realpathSync(root);
  const plan = planProvisioning(root);
  assertNoDeletedServices(root, plan.resources);
  if (dryRun) return { ...plan, mutation: false };
  return withApplicationLock(root, async () => {
    const project = readApplication(root);
    const plan = planProvisioning(root);
    assertNoDeletedServices(root, plan.resources);
    const configured = new Map(
      project.targets.map((target) => {
        const file = path.join(targetDirectory(root, target), 'wrangler.jsonc');
        return [file, readFileSync(file, 'utf8')];
      }),
    );
    const assertConfiguration = () => {
      if (
        JSON.stringify(readApplication(root)) !== JSON.stringify(project) ||
        [...configured].some(([file, content]) => readFileSync(file, 'utf8') !== content)
      )
        throw new Error(
          'Configuration changed during provisioning; inspect resource receipts before retrying.',
        );
    };
    await authenticate(root, project, run);
    const request =
      suppliedRequest ??
      (await cloudflareRequest(
        project,
        targetDirectory(root, project.targets[0]),
        run,
        environment(project),
      ));
    const previousFile = path.join(root, '.anhedral/resources.json');
    let previousResources: {
      kind: string;
      name: string;
      id: string;
      reused: boolean;
      createdByProject?: boolean;
    }[] = [];
    if (existsSync(previousFile)) {
      const previous = JSON.parse(readBoundedFile(previousFile, 256 * 1024).toString('utf8'));
      if (
        previous.schemaVersion !== 1 ||
        previous.projectId !== project.id ||
        previous.accountId !== project.accountId ||
        !Array.isArray(previous.resources) ||
        previous.resources.length > 500 ||
        previous.resources.some(
          (entry: unknown) =>
            !entry ||
            typeof entry !== 'object' ||
            Array.isArray(entry) ||
            !['d1', 'r2'].includes(String((entry as { kind?: unknown }).kind)) ||
            ['name', 'id'].some(
              (field) => typeof (entry as Record<string, unknown>)[field] !== 'string',
            ) ||
            typeof (entry as { reused?: unknown }).reused !== 'boolean',
        )
      )
        throw new Error('Previous resource ownership cannot be verified.');
      previousResources = previous.resources;
    }
    const receipts: {
      kind: string;
      name: string;
      id: string;
      reused: boolean;
      createdByProject: boolean;
    }[] = [];
    const resources = new Map<string, (typeof receipts)[number]>();
    for (const resource of plan.resources) {
      assertConfiguration();
      const key = `${resource.kind}:${resource.name}`;
      let receipt = resources.get(key);
      if (!receipt) {
        const { endpoint, nameField, idField } = resourceTypes[resource.kind];
        const existing = await listResources(request, resource.kind);
        const matches = existing.filter((item) => item[nameField] === resource.name);
        if (matches.length > 1) throw new Error('Ambiguous provider resource name.');
        let value = matches[0];
        const reused = !!value;
        if (resource.id && (!value || value[idField] !== resource.id))
          throw new Error(
            'Configured resource ID does not match its account/name; no replacement was created.',
          );
        assertConfiguration();
        if (!value)
          value = (
            await request('POST', endpoint, {
              [nameField]: resource.name,
            })
          ).result as Record<string, unknown>;
        if (!value || typeof value[idField] !== 'string' || !value[idField])
          throw new Error(
            'Provider did not return a resource identity; inspect provider state before retrying.',
          );
        receipt = {
          kind: resource.kind,
          name: resource.name,
          id: value[idField] as string,
          reused,
          createdByProject:
            !reused ||
            previousResources.some(
              (previous) =>
                previous.kind === resource.kind &&
                previous.name === resource.name &&
                previous.id === value[idField] &&
                (previous.createdByProject === true || previous.reused === false),
            ),
        };
        resources.set(key, receipt);
        receipts.push(receipt);
        // Save identities immediately: a subsequent operation can fail without losing creation evidence.
        atomicJson(path.join(root, '.anhedral/resources.json'), {
          schemaVersion: 1,
          projectId: project.id,
          accountId: project.accountId,
          checkedAt: new Date().toISOString(),
          resources: receipts,
          state: 'reconciling',
        });
        if (resource.kind === 'r2') await assertPrivateBucket(request, resource.name);
      }
      assertConfiguration();
      if (resource.id && receipt.id !== resource.id)
        throw new Error('Targets disagree about a shared resource ID.');
      if (resource.field) {
        const target = project.targets.find((item) => item.id === resource.target)!;
        const file = path.join(targetDirectory(root, target), 'wrangler.jsonc');
        const before = readFileSync(file, 'utf8');
        const after = applyEdits(
          before,
          modify(before, resource.field, receipt.id, {
            formattingOptions: { insertSpaces: true, tabSize: 2 },
          }),
        );
        writeFileSync(file, after);
        configured.set(file, after);
      }
    }
    const result = {
      schemaVersion: 1,
      projectId: project.id,
      accountId: project.accountId,
      checkedAt: new Date().toISOString(),
      resources: receipts,
      state: 'reconciled',
      externalIntegrations: plan.externalIntegrations,
    };
    atomicJson(path.join(root, '.anhedral/resources.json'), result);
    return result;
  });
}

/** Reconcile committed identities against the customer account without creating resources or rewriting configuration. */
export async function inspectApplicationResources(root: string, request: CloudflareRequest) {
  const plan = planProvisioning(root);
  const receipts: { kind: string; name: string; id: string; target: string }[] = [];
  for (const resource of plan.resources) {
    const { nameField, idField } = resourceTypes[resource.kind];
    const existing = await listResources(request, resource.kind);
    const matches = existing.filter((item) => item[nameField] === resource.name);
    if (matches.length !== 1 || typeof matches[0][idField] !== 'string' || !matches[0][idField])
      throw new Error('Committed resource is missing or ambiguous in the registered account.');
    const id = matches[0][idField] as string;
    if ((resource.field && !resource.id) || (resource.id && resource.id !== id))
      throw new Error(
        'Committed resource identity differs from the registered account; recovery will not replace it.',
      );
    if (resource.kind === 'r2') await assertPrivateBucket(request, resource.name);
    receipts.push({ kind: resource.kind, name: resource.name, id, target: resource.target });
  }
  return { resources: receipts, externalIntegrations: plan.externalIntegrations };
}
