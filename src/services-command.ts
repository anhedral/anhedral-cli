import path from 'node:path';
import { CliArgumentError } from './cli-arguments.js';
import { resolveIntegrationService } from './integration-service-readers.js';
import { inspectApplication } from './project-inspector.js';
import {
  resolveService,
  serviceCapabilities,
  unboundResourceSelectors,
} from './service-descriptor.js';
import { ServiceDeletionStore } from './service-deletion.js';
import { catalogDirectory } from './catalog-registration.js';
import { serviceOperation } from './service-operations.js';
import type { ServiceAction } from './service-model.js';
const argumentError = (message: string) =>
  new CliArgumentError(message, 'Run anhedral services --help.');
export async function runServiceCommand(root: string, input: string[]) {
  const args = input.filter((arg) => arg !== '--json');
  const action = args.shift();
  const actions = ['list', 'status', 'metrics', 'tables', 'data', 'delete-plan', 'delete'];
  if (!action || !actions.includes(action))
    throw argumentError('Choose a supported services operation.');
  if (action === 'list') {
    if (args.length) throw argumentError('services list accepts no service selector.');
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
      ...unboundResourceSelectors(inspection),
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
    throw argumentError('Choose the exact service key from services list.');
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
      throw argumentError('Invalid services options.');
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
    throw argumentError('This services operation does not accept that option.');
  if (action === 'delete' && (!options['--token'] || !options['--confirm-name']))
    throw argumentError('Deletion requires its plan token and exact resource name.');
  const result = await serviceOperation(
    root,
    action as ServiceAction,
    key,
    {
      hours: options['--hours'] === undefined ? undefined : Number(options['--hours']),
      table: options['--table'],
      offset: options['--offset'] === undefined ? undefined : Number(options['--offset']),
      cursor: options['--cursor'],
      token: options['--token'],
      typedName: options['--confirm-name'],
    },
    action === 'delete-plan' || action === 'delete'
      ? {
          deletions: new ServiceDeletionStore(
            path.join(catalogDirectory(), 'service-confirmations'),
          ),
        }
      : {},
  );
  return (
    result.status ??
    result.metrics ??
    result.tables ??
    result.data ??
    result.plan ??
    result.deletion
  );
}
