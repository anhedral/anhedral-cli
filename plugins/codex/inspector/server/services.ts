import {
  resolveIntegrationService,
  integrationRequest,
  observeIntegrationService,
  posthogServiceMetrics,
} from '../../../../src/integration-service-readers.ts';
import {
  neonReadConnection,
  listNeonTables,
  browseNeonData,
} from '../../../../src/neon-service-data.ts';
import { vercelApplicationStatus, vercelServiceMetrics } from '../../../../src/vercel.ts';
import { browseR2Objects } from '../../../../src/r2-service-data.ts';
import path from 'node:path';
import { readApplication, defaultRunner, targetDirectory } from '../../../../src/project-state.ts';
import { cloudflareRequest, type CloudflareRequest } from '../../../../src/cloudflare.ts';
import { resolveService } from '../../../../src/service-descriptor.ts';
import {
  observeService,
  readServiceMetrics,
  listServiceTables,
  browseServiceData,
} from '../../../../src/service-readers.ts';
import { ServiceDeletionStore } from '../../../../src/service-deletion.ts';
import {
  serviceArgumentsSchema,
  serviceResponseSchema,
  type ServiceTool,
  type ServiceArguments,
  type ServiceResponse,
} from '../shared/service-actions.ts';
import type { ProjectStore } from './store.ts';
export type ServiceRequestFactory = (
  root: string,
  analytics: boolean,
) => Promise<CloudflareRequest>;
export class ProjectServices {
  readonly deletion: ServiceDeletionStore;
  constructor(
    readonly store: ProjectStore,
    readonly factory: ServiceRequestFactory = async (root, analytics) => {
      const project = readApplication(root);
      return cloudflareRequest(
        project,
        targetDirectory(root, project.targets[0]),
        defaultRunner,
        { ...process.env, ANHEDRAL_COMMAND_TIMEOUT_MS: '10000' },
        { analytics, timeoutMs: 10_000 },
      );
    },
  ) {
    this.deletion = new ServiceDeletionStore(path.join(store.directory, 'service-confirmations'));
  }
  async call(tool: ServiceTool, raw: ServiceArguments): Promise<ServiceResponse> {
    const args = serviceArgumentsSchema.parse(raw);
    const { directory: root } = this.store.context(args.id);
    if (args.key.startsWith('provider:') || args.key.startsWith('integration:')) {
      const service = resolveIntegrationService(root, args.key);
      const api = integrationRequest(service);
      let response: ServiceResponse;
      if (tool === 'refresh_service')
        response = { status: await observeIntegrationService(service, api) };
      else if (tool === 'get_service_metrics')
        response = { metrics: await posthogServiceMetrics(service, api, args.hours ?? 24) };
      else if (tool === 'list_service_tables' && service.provider === 'neon')
        response = { tables: await listNeonTables(await neonReadConnection(service, api)) };
      else if (tool === 'browse_service_data' && service.provider === 'neon')
        response = {
          data: await browseNeonData(
            await neonReadConnection(service, api),
            args.table ?? '',
            args.offset ?? 0,
          ),
        };
      else throw new Error('This integration does not support that operation.');
      return serviceResponseSchema.parse(response);
    }
    if (args.key.startsWith('target:vercel:')) {
      if (
        !this.store
          .call('get_project', { id: args.id })
          .projects.find((project) => project.id === args.id)
          ?.inspection?.targets.data.some(
            (target) =>
              args.key === `target:${target.provider}:${target.id}` && target.provider === 'vercel',
          )
      )
        throw new Error('Choose a validated Vercel target.');
      if (tool === 'get_service_metrics')
        return serviceResponseSchema.parse({
          metrics: await vercelServiceMetrics(root, args.hours ?? 24, (command, args, cwd, env) =>
            defaultRunner(command, args, cwd, { ...env, ANHEDRAL_COMMAND_TIMEOUT_MS: '30000' }),
          ),
        });
      if (tool !== 'refresh_service') throw new Error('Unsupported Vercel operation.');
      const status = await vercelApplicationStatus(root, true, (command, args, cwd, env) =>
        defaultRunner(command, args, cwd, { ...env, ANHEDRAL_COMMAND_TIMEOUT_MS: '30000' }),
      );
      return serviceResponseSchema.parse({
        status: {
          state: 'available',
          fetchedAt: new Date().toISOString(),
          message: status.activeRecordedVersion
            ? 'Provider confirmed the recorded deployment is active. Application health is separate.'
            : 'Provider project verified. The recorded deployment is not confirmed active.',
        },
      });
    }
    const service = resolveService(root, args.key);
    if (service.kind === 'r2' && tool === 'list_service_tables') return { tables: ['objects'] };
    if (service.kind === 'r2' && tool === 'browse_service_data') {
      if (args.table !== 'objects') throw new Error('Choose object metadata.');
      return serviceResponseSchema.parse({ data: await browseR2Objects(service, args.cursor) });
    }
    const request = await this.factory(root, tool === 'get_service_metrics');
    let result: ServiceResponse;
    if (tool === 'refresh_service') result = { status: await observeService(service, request) };
    else if (tool === 'get_service_metrics')
      result = { metrics: await readServiceMetrics(service, request, args.hours ?? 24) };
    else if (tool === 'list_service_tables')
      result = {
        tables: service.kind === 'kv' ? ['keys'] : await listServiceTables(service, request),
      };
    else if (tool === 'browse_service_data')
      result = {
        data: await browseServiceData(service, request, args.table ?? '', args.offset ?? 0),
      };
    else if (tool === 'plan_service_deletion')
      result = { plan: await this.deletion.plan(root, args.key, request) };
    else if (tool === 'delete_service') {
      if (!args.token || !args.typedName)
        throw new Error('Review a deletion plan and type the exact resource name.');
      result = {
        deletion: await this.deletion.execute(root, args.key, args.token, args.typedName, request),
      };
    } else throw new Error('Unsupported service operation.');
    return serviceResponseSchema.parse(result);
  }
}
