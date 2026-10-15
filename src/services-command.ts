import {
  resolveIntegrationService,
  integrationRequest,
  observeIntegrationService,
  posthogServiceMetrics,
} from './integration-service-readers.js';
import { neonReadConnection, listNeonTables, browseNeonData } from './neon-service-data.js';
import { vercelServiceMetrics, vercelApplicationStatus } from './vercel.js';
import { browseR2Objects } from './r2-service-data.js';
import path from 'node:path';
import { inspectApplication } from './project-inspector.js';
import { readApplication, targetDirectory, defaultRunner } from './project-state.js';
import { cloudflareRequest } from './cloudflare.js';
import { resolveService, serviceCapabilities } from './service-descriptor.js';
import {
  observeService,
  readServiceMetrics,
  listServiceTables,
  browseServiceData,
} from './service-readers.js';
import { ServiceDeletionStore } from './service-deletion.js';
import { catalogDirectory } from './catalog-registration.js';
export async function runServiceCommand(root: string, input: string[]) {
  const args = input.filter((arg) => arg !== '--json');
  const action = args.shift();
  const actions = ['list', 'status', 'metrics', 'tables', 'data', 'delete-plan', 'delete'];
  if (!action || !actions.includes(action))
    throw new Error('Choose a supported services operation.');
  if (action === 'list') {
    if (args.length) throw new Error('services list accepts no service selector.');
    const inspection = inspectApplication(root);
    const keys = [
      ...inspection.setupProviders.data
        .filter((provider) => !['cloudflare', 'vercel', 'expo'].includes(provider.id))
        .map((provider) => `provider:${provider.id}`),
      ...inspection.integrations.data.flatMap((provider) =>
        provider.operations.map(
          (operation) => `integration:${provider.provider}:${operation.operation}`,
        ),
      ),
      ...inspection.targets.data.map((target) => `target:${target.provider}:${target.id}`),
      ...inspection.configuration.data.bindings.map(
        (binding) => `binding:${binding.application}:${binding.kind}:${binding.name}`,
      ),
    ];
    return {
      services: keys.map((key) => {
        try {
          if (key.startsWith('provider:') || key.startsWith('integration:')) {
            const service = resolveIntegrationService(root, key);
            return {
              key,
              provider: service.provider,
              capabilities: {
                status: true,
                metrics: service.provider === 'posthog',
                data: service.provider === 'neon',
                delete: false,
              },
            };
          }
          if (key.startsWith('target:vercel:'))
            return {
              key,
              provider: 'vercel',
              capabilities: { status: true, metrics: true, data: false, delete: false },
            };
          const service = resolveService(root, key);
          return { ...service, capabilities: serviceCapabilities(service.kind) };
        } catch {
          return { key, capabilities: null, state: 'unsupported-or-unconfigured' };
        }
      }),
    };
  }
  const key = args.shift();
  if (!key || key.startsWith('-') || key.length > 1024)
    throw new Error('Choose the exact service key from services list.');
  const options: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--hours', '--table', '--offset', '--token', '--confirm-name', '--cursor'].includes(
        args[i],
      ) ||
      options[args[i]] !== undefined ||
      !args[i + 1] ||
      args[i + 1].startsWith('-')
    )
      throw new Error('Invalid services options.');
    options[args[i]] = args[i + 1];
  }
  const allowed: Record<string, string[]> = {
    status: [],
    metrics: ['--hours'],
    tables: [],
    data: ['--table', '--offset', '--cursor'],
    'delete-plan': [],
    delete: ['--token', '--confirm-name'],
  };
  if (Object.keys(options).some((option) => !allowed[action].includes(option)))
    throw new Error('This services operation does not accept that option.');
  if (action === 'delete' && (!options['--token'] || !options['--confirm-name']))
    throw new Error('Deletion requires its plan token and exact resource name.');
  if (key.startsWith('provider:') || key.startsWith('integration:')) {
    const service = resolveIntegrationService(root, key);
    const api = integrationRequest(service);
    if (action === 'status') return observeIntegrationService(service, api);
    if (action === 'metrics')
      return posthogServiceMetrics(service, api, Number(options['--hours'] ?? 24));
    if (action === 'tables' && service.provider === 'neon')
      return listNeonTables(await neonReadConnection(service, api));
    if (action === 'data' && service.provider === 'neon')
      return browseNeonData(
        await neonReadConnection(service, api),
        options['--table'] ?? '',
        Number(options['--offset'] ?? 0),
      );
    throw new Error('This integration does not support that operation.');
  }
  if (key.startsWith('target:vercel:')) {
    if (
      !inspectApplication(root).targets.data.some(
        (target) =>
          key === `target:${target.provider}:${target.id}` && target.provider === 'vercel',
      )
    )
      throw new Error('Choose a recorded Vercel target.');
    if (action === 'metrics') return vercelServiceMetrics(root, Number(options['--hours'] ?? 24));
    if (action === 'status') return vercelApplicationStatus(root, true);
    throw new Error('Unsupported Vercel service operation.');
  }
  const service = resolveService(root, key);
  if (service.kind === 'r2' && action === 'tables') return ['objects'];
  if (service.kind === 'r2' && action === 'data') {
    if (options['--table'] !== 'objects') throw new Error('Choose object metadata.');
    return browseR2Objects(service, options['--cursor']);
  }
  const project = readApplication(root);
  const request = await cloudflareRequest(
    project,
    targetDirectory(root, project.targets[0]),
    defaultRunner,
    { ...process.env, ANHEDRAL_COMMAND_TIMEOUT_MS: '10000' },
    { analytics: action === 'metrics', timeoutMs: 10000 },
  );
  if (action === 'status') return observeService(service, request);
  if (action === 'metrics')
    return readServiceMetrics(service, request, Number(options['--hours'] ?? 24));
  if (action === 'tables')
    return service.kind === 'kv' ? ['keys'] : listServiceTables(service, request);
  if (action === 'data')
    return browseServiceData(
      service,
      request,
      options['--table'] ?? '',
      Number(options['--offset'] ?? 0),
    );
  const deletions = new ServiceDeletionStore(
    path.join(catalogDirectory(), 'service-confirmations'),
  );
  if (action === 'delete-plan') return deletions.plan(root, key, request);
  if (!options['--token'] || !options['--confirm-name'])
    throw new Error('Deletion requires its plan token and exact resource name.');
  return deletions.execute(root, key, options['--token'], options['--confirm-name'], request);
}
