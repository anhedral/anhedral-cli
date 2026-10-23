import { inspectApplication } from './project-inspector.js';
import {
  providerConfiguration,
  setting,
  type IntegrationProvider,
  type ProviderSettings,
} from './providers/config.js';
import { INTEGRATION_PROVIDERS } from './providers/definitions.js';
import { providerApi, ProviderRequestError, resourceId, type ApiRequest } from './providers/api.js';
import { record } from './service-readers.js';
import type { ServiceObservation } from './service-model.js';
export interface IntegrationService {
  provider: IntegrationProvider;
  settings: ProviderSettings;
  resources: Record<string, string>;
}
export function resolveIntegrationService(root: string, key: string): IntegrationService {
  const inspection = inspectApplication(root);
  const match = key.match(/^(provider|integration):([a-z]+)(?::(.+))?$/);
  if (
    !match ||
    !INTEGRATION_PROVIDERS.includes(match[2] as IntegrationProvider) ||
    !inspection.setupProviders.data.some((provider) => provider.id === match[2])
  )
    throw new Error('Choose a selected integration service.');
  const provider = match[2] as IntegrationProvider;
  let resources: Record<string, string> = {};
  if (match[1] === 'integration') {
    const operation = inspection.integrations.data
      .find((entry) => entry.provider === provider)
      ?.operations.find((entry) => entry.operation === match[3]);
    if (!operation || operation.status !== 'complete')
      throw new Error('The integration operation is not complete.');
    resources = operation.resources;
  }
  const settings = providerConfiguration(root).providers[provider];
  if (!settings) throw new Error('Complete the selected provider configuration.');
  return { provider, settings, resources };
}
export function integrationRequest(
  service: IntegrationService,
  env: NodeJS.ProcessEnv = process.env,
  send: typeof fetch = fetch,
): ApiRequest {
  return providerApi(service.provider, service.settings, env, send, {
    maxAttempts: 1,
    totalTimeoutMs: 10000,
    attemptTimeoutMs: 10000,
  });
}
function selected(service: IntegrationService, field: string, receipt: string) {
  const configured = setting(service.settings, field);
  const recorded = service.resources[receipt];
  if (configured && recorded && configured !== recorded)
    throw new Error('Configured and recorded integration identities differ.');
  return resourceId(configured || recorded);
}
export async function inspectIntegrationResource(
  service: IntegrationService,
  api: ApiRequest,
): Promise<Record<string, unknown>> {
  const { provider, settings } = service;
  let value: Record<string, unknown>;
  let expected: string;
  let returned: unknown;
  if (provider === 'stripe') {
    if (record(await api('/v1/account')).id !== setting(settings, 'accountId'))
      throw new Error('Stripe account differs.');
    expected = resourceId(service.resources.webhook);
    value = record(await api(`/v1/webhook_endpoints/${expected}`));
    returned = value.id;
    if (
      value.livemode !== (setting(settings, 'mode') === 'live') ||
      value.url !== setting(settings, 'webhookUrl')
    )
      throw new Error('Stripe environment or webhook differs.');
  } else if (provider === 'revenuecat') {
    expected = selected(service, 'projectId', 'project');
    value = record(await api(`/v2/projects/${expected}`));
    returned = value.id;
  } else throw new Error('Unsupported integration.');
  if (String(returned) !== expected) throw new Error('Provider resource identity differs.');
  return value;
}
export async function observeIntegrationService(
  service: IntegrationService,
  api: ApiRequest,
): Promise<ServiceObservation> {
  const fetchedAt = new Date().toISOString();
  try {
    const value = await inspectIntegrationResource(service, api);
    const name =
      typeof value.name === 'string' && value.name.length <= 256 ? value.name : undefined;
    return {
      state: 'available',
      fetchedAt,
      ...(name ? { name } : {}),
      message:
        'Provider confirmed the selected resource and account context. Application health is separate.',
    };
  } catch (error) {
    const status = error instanceof ProviderRequestError ? error.status : undefined;
    return {
      state:
        status === 404
          ? 'not-found'
          : status === 401 || status === 403
            ? 'permission-required'
            : 'unavailable',
      fetchedAt,
      message:
        'Selected integration could not be verified. Check account configuration, identity and scoped permissions.',
    };
  }
}
