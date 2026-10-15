import { createHash, randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { readBoundedFile } from './bounded-file.js';
import { atomicJson, readApplication, withApplicationLock } from './project-state.js';
import { inspectApplication } from './project-inspector.js';
import { resolveService } from './service-descriptor.js';
import { observeService, record, serviceEndpoint } from './service-readers.js';
import type { CloudflareRequest } from './cloudflare.js';
import type { ServiceDescriptor } from './service-model.js';
const digest = (value: string) => createHash('sha256').update(value).digest('hex');
const actionSchema = z
  .object({
    schemaVersion: z.literal(1),
    root: z.string(),
    serviceKey: z.string().max(1024),
    fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
    name: z.string().max(256),
    expiresAt: z.number(),
    state: z.enum(['prepared', 'pending', 'deleted', 'uncertain', 'rejected']),
  })
  .strict();
export interface DeletionPlan {
  token: string;
  name: string;
  accountId: string;
  resourceId: string;
  kind: string;
  applications: string[];
  expiresAt: string;
  impact: string;
}
function fingerprint(root: string, service: ServiceDescriptor) {
  const inspection = inspectApplication(root);
  return digest(
    JSON.stringify({
      service,
      project: readApplication(root),
      configuration: inspection.configuration,
      receipts: inspection.cloudflareResources,
    }),
  );
}
async function assertDeletionScope(
  root: string,
  service: ServiceDescriptor,
  request: CloudflareRequest,
) {
  if (
    !['d1', 'kv'].includes(service.kind) ||
    service.ownership !== 'created' ||
    !service.name ||
    service.applications.length > 1
  )
    throw new Error(
      'Deletion requires a supported, recorded project-created resource with at most one owning application. Reused, shared, or unverified resources cannot be deleted here.',
    );
  const observation = await observeService(service, request);
  if (observation.state !== 'available' || observation.name !== service.name)
    throw new Error('The exact resource identity must be confirmed before deletion.');
  const scripts = await request('GET', '/workers/scripts?per_page=100');
  if (
    !Array.isArray(scripts.result) ||
    scripts.result.length >= 100 ||
    (scripts.result_info?.total_pages ?? 1) > 1
  )
    throw new Error('Worker dependency listing is incomplete; deletion is blocked.');
  const project = readApplication(root);
  const allowed = new Set(
    project.targets
      .filter((target) => service.applications.includes(target.directory))
      .map((target) => target.workerName),
  );
  for (const raw of scripts.result) {
    const script = record(raw);
    if (typeof script.id !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,62}$/.test(script.id))
      throw new Error('Worker dependency identity is unavailable.');
    const settings = record(
      (await request('GET', `/workers/scripts/${script.id}/settings`)).result,
    );
    if (!Array.isArray(settings.bindings) || settings.bindings.length > 500)
      throw new Error('Worker dependencies could not be verified.');
    for (const rawBinding of settings.bindings) {
      const binding = record(rawBinding);
      if (
        (binding.type === 'd1' && typeof binding.id !== 'string') ||
        (binding.type === 'kv_namespace' && typeof binding.namespace_id !== 'string')
      )
        throw new Error('Worker dependency identities are incomplete.');
      const uses =
        service.kind === 'd1'
          ? binding.type === 'd1' && binding.id === service.id
          : binding.type === 'kv_namespace' && binding.namespace_id === service.id;
      if (uses && !allowed.has(script.id))
        throw new Error(
          'Another Worker uses this resource. Shared resources cannot be deleted here.',
        );
    }
  }
}
export class ServiceDeletionStore {
  readonly directory: string;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.directory = realpathSync(directory);
  }
  async plan(root: string, key: string, request: CloudflareRequest): Promise<DeletionPlan> {
    root = realpathSync(root);
    const service = resolveService(root, key);
    const before = fingerprint(root, service);
    await assertDeletionScope(root, service, request);
    if (before !== fingerprint(root, resolveService(root, key)))
      throw new Error('Source changed during deletion planning.');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = Date.now() + 5 * 60_000;
    writeFileSync(
      path.join(this.directory, `${digest(token)}.json`),
      JSON.stringify({
        schemaVersion: 1,
        root,
        serviceKey: key,
        fingerprint: before,
        name: service.name,
        expiresAt,
        state: 'prepared',
      }),
      { mode: 0o600, flag: 'wx' },
    );
    return {
      token,
      name: service.name!,
      accountId: service.accountId,
      resourceId: service.id,
      kind: service.kind,
      applications: service.applications,
      expiresAt: new Date(expiresAt).toISOString(),
      impact:
        'Permanently removes this resource and its stored data. Existing source bindings remain and must be reviewed before shipping.',
    };
  }
  async execute(
    root: string,
    key: string,
    token: string,
    typedName: string,
    request: CloudflareRequest,
  ) {
    if (!/^[a-zA-Z0-9_-]{43}$/.test(token)) throw new Error('Invalid deletion confirmation.');
    const file = path.join(this.directory, `${digest(token)}.json`);
    return withApplicationLock(root, async () => {
      const saved = actionSchema.parse(JSON.parse(readBoundedFile(file, 16384).toString('utf8')));
      root = realpathSync(root);
      if (
        saved.root !== root ||
        saved.serviceKey !== key ||
        saved.name !== typedName ||
        saved.expiresAt < Date.now() ||
        saved.state !== 'prepared'
      )
        throw new Error(
          'Deletion confirmation is expired, already used, or does not match this resource.',
        );
      const service = resolveService(root, key);
      if (saved.fingerprint !== fingerprint(root, service))
        throw new Error('Service identity or dependencies changed. Review a new deletion plan.');
      await assertDeletionScope(root, service, request);
      if (saved.fingerprint !== fingerprint(root, resolveService(root, key)))
        throw new Error('Source changed before deletion.');
      saved.state = 'pending';
      atomicJson(file, saved);
      const journal = path.join(root, '.anhedral/service-deletions.json');
      const writeReceipt = (state: 'pending' | 'deleted' | 'uncertain') => {
        let entries: unknown[] = [];
        if (existsSync(journal)) {
          const previous = record(
            JSON.parse(readBoundedFile(journal, 256 * 1024).toString('utf8')),
          );
          if (
            previous.projectId !== service.projectId ||
            previous.accountId !== service.accountId ||
            !Array.isArray(previous.entries) ||
            previous.entries.length >= 500
          )
            throw new Error('Deletion journal is invalid or full.');
          entries = previous.entries.filter((entry) => record(entry).resourceId !== service.id);
        }
        atomicJson(journal, {
          schemaVersion: 1,
          projectId: service.projectId,
          accountId: service.accountId,
          entries: [
            ...entries,
            {
              resourceId: service.id,
              kind: service.kind,
              name: service.name,
              state,
              recordedAt: new Date().toISOString(),
            },
          ],
        });
      };
      writeReceipt('pending');
      try {
        await request('DELETE', serviceEndpoint(service));
        if ((await observeService(service, request)).state !== 'not-found')
          throw new Error('Deletion could not be confirmed.');
        saved.state = 'deleted';
        atomicJson(file, saved);
        writeReceipt('deleted');
        return {
          state: 'deleted' as const,
          resourceId: service.id,
          message:
            'Provider confirmed deletion. Review the remaining source bindings before shipping.',
        };
      } catch {
        saved.state = 'uncertain';
        atomicJson(file, saved);
        writeReceipt('uncertain');
        return {
          state: 'uncertain' as const,
          resourceId: service.id,
          message:
            'Deletion outcome is uncertain. Refresh provider status; no automatic deletion retry is performed.',
        };
      }
    });
  }
}
export function assertNoDeletedServices(root: string, resources: { kind: string; name: string }[]) {
  const file = path.join(root, '.anhedral/service-deletions.json');
  if (!existsSync(file)) return;
  const saved = record(JSON.parse(readBoundedFile(file, 256 * 1024).toString('utf8')));
  const project = readApplication(root);
  if (
    saved.projectId !== project.id ||
    saved.accountId !== project.accountId ||
    !Array.isArray(saved.entries)
  )
    throw new Error('Deletion history cannot be verified before provisioning.');
  for (const raw of saved.entries) {
    const entry = record(raw);
    if (resources.some((resource) => resource.kind === entry.kind && resource.name === entry.name))
      throw new Error(
        'A selected resource has a recorded deletion attempt. Review source bindings and remote state before provisioning; deleted services are not recreated automatically.',
      );
  }
}
