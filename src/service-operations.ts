import {
  resolveIntegrationService,
  integrationRequest,
  observeIntegrationService,
  posthogServiceMetrics,
} from './integration-service-readers.js';
import { neonReadConnection, listNeonTables, browseNeonData } from './neon-service-data.js';
import { vercelApplicationStatus, vercelServiceMetrics } from './vercel.js';
import { browseR2Objects } from './r2-service-data.js';
import { inspectApplication } from './project-inspector.js';
import { readApplication, defaultRunner, targetDirectory } from './project-state.js';
import { cloudflareRequest, type CloudflareRequest } from './cloudflare.js';
import { resolveService } from './service-descriptor.js';
import {
  observeService,
  readServiceMetrics,
  listServiceTables,
  browseServiceData,
} from './service-readers.js';
import type { ServiceDeletionStore, DeletionPlan } from './service-deletion.js';
import type {
  ServiceData,
  ServiceMetrics,
  ServiceObservation,
  ServiceAction,
} from './service-model.js';

export interface ServiceOptions {
  hours?: number;
  table?: string;
  offset?: number;
  cursor?: string;
  token?: string;
  typedName?: string;
}
export interface ServiceResult {
  status?: ServiceObservation;
  metrics?: ServiceMetrics;
  tables?: string[];
  data?: ServiceData;
  plan?: DeletionPlan;
  deletion?: { state: 'deleted' | 'uncertain'; resourceId: string; message: string };
}
export type ServiceRequestFactory = (
  root: string,
  analytics: boolean,
) => Promise<CloudflareRequest>;
const requestFor: ServiceRequestFactory = async (root, analytics) => {
  const project = readApplication(root);
  return cloudflareRequest(
    project,
    targetDirectory(root, project.targets[0]),
    defaultRunner,
    { ...process.env, ANHEDRAL_COMMAND_TIMEOUT_MS: '10000' },
    { analytics, timeoutMs: 10000 },
  );
};
const vercelRunner: typeof defaultRunner = (command, args, cwd, env, input) =>
  defaultRunner(command, args, cwd, { ...env, ANHEDRAL_COMMAND_TIMEOUT_MS: '30000' }, input);

/** Shared operations; transports decide how private results are presented. */
export async function serviceOperation(
  root: string,
  action: ServiceAction,
  key: string,
  options: ServiceOptions = {},
  context: { request?: ServiceRequestFactory; deletions?: ServiceDeletionStore } = {},
): Promise<ServiceResult> {
  if (key.startsWith('provider:') || key.startsWith('integration:')) {
    const service = resolveIntegrationService(root, key);
    const api = integrationRequest(service);
    if (action === 'status') return { status: await observeIntegrationService(service, api) };
    if (action === 'metrics')
      return { metrics: await posthogServiceMetrics(service, api, options.hours ?? 24) };
    if (action === 'tables' && service.provider === 'neon')
      return { tables: await listNeonTables(await neonReadConnection(service, api)) };
    if (action === 'data' && service.provider === 'neon')
      return {
        data: await browseNeonData(
          await neonReadConnection(service, api),
          options.table ?? '',
          options.offset ?? 0,
        ),
      };
    throw new Error('This integration does not support that operation.');
  }
  if (key.startsWith('target:vercel:')) {
    if (
      !inspectApplication(root).targets.data.some(
        (target) =>
          key === `target:${target.provider}:${target.id}` && target.provider === 'vercel',
      )
    )
      throw new Error('Choose a validated Vercel target.');
    if (action === 'metrics')
      return { metrics: await vercelServiceMetrics(root, options.hours ?? 24, vercelRunner) };
    if (action !== 'status') throw new Error('Unsupported Vercel operation.');
    const status = await vercelApplicationStatus(root, true, vercelRunner);
    return {
      status: {
        state: 'available',
        fetchedAt: new Date().toISOString(),
        message: status.activeRecordedVersion
          ? 'Provider confirmed the recorded deployment is active. Application health is separate.'
          : 'Provider project verified. The recorded deployment is not confirmed active.',
      },
    };
  }
  const service = resolveService(root, key);
  if (service.kind === 'r2' && action === 'tables') return { tables: ['objects'] };
  if (service.kind === 'r2' && action === 'data') {
    if (options.table !== 'objects') throw new Error('Choose object metadata.');
    return { data: await browseR2Objects(service, options.cursor) };
  }
  const request = await (context.request ?? requestFor)(root, action === 'metrics');
  if (action === 'status') return { status: await observeService(service, request) };
  if (action === 'metrics')
    return { metrics: await readServiceMetrics(service, request, options.hours ?? 24) };
  if (action === 'tables')
    return { tables: service.kind === 'kv' ? ['keys'] : await listServiceTables(service, request) };
  if (action === 'data')
    return {
      data: await browseServiceData(
        service,
        request,
        options.table ?? '',
        options.offset ?? 0,
        25,
        options.cursor,
      ),
    };
  if (!context.deletions) throw new Error('A deletion confirmation store is required.');
  if (action === 'delete-plan') return { plan: await context.deletions.plan(root, key, request) };
  if (!options.token || !options.typedName)
    throw new Error('Review a deletion plan and type the exact resource name.');
  return {
    deletion: await context.deletions.execute(root, key, options.token, options.typedName, request),
  };
}
