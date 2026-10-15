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
import type { ServiceMetrics, ServiceObservation } from './service-model.js';
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
  if (provider === 'neon') {
    expected = selected(service, 'projectId', 'project');
    value = record(record(await api(`/api/v2/projects/${expected}`)).project);
    returned = value.id;
    if (value.org_id !== setting(settings, 'organizationId'))
      throw new Error('Neon organization differs.');
  } else if (provider === 'clerk') {
    if (record(await api('/v1/platform/me')).subject !== setting(settings, 'workspaceId'))
      throw new Error('Clerk workspace differs.');
    expected = selected(service, 'applicationId', 'application');
    value = record(await api(`/v1/platform/applications/${expected}?include_secret_keys=false`));
    returned = value.application_id;
  } else if (provider === 'resend') {
    expected = selected(service, 'domainId', 'domain');
    value = record(await api(`/domains/${expected}`));
    returned = value.id;
    if (value.name !== setting(settings, 'domain')) throw new Error('Resend domain differs.');
  } else if (provider === 'stripe') {
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
  } else if (provider === 'sentry') {
    const organization = resourceId(setting(settings, 'organization'));
    const slug = resourceId(setting(settings, 'project'));
    value = record(await api(`/api/0/projects/${organization}/${slug}/`));
    expected = resourceId(service.resources.project ?? value.id);
    returned = value.id;
    if (record(value.organization).slug !== organization || value.slug !== slug)
      throw new Error('Sentry organization or project differs.');
  } else if (provider === 'posthog') {
    expected = selected(service, 'projectId', 'project');
    const organization = resourceId(setting(settings, 'organizationId'));
    value = record(await api(`/api/organizations/${organization}/projects/${expected}/`));
    returned = String(value.id);
    if (value.organization !== organization) throw new Error('PostHog organization differs.');
  } else {
    expected = selected(service, 'projectId', 'project');
    value = record(await api(`/v1/organization/projects/${expected}`));
    returned = value.id;
  }
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
export async function posthogServiceMetrics(
  service: IntegrationService,
  api: ApiRequest,
  hours = 24,
): Promise<ServiceMetrics> {
  if (service.provider !== 'posthog' || ![1, 24, 168].includes(hours))
    throw new Error('Unsupported analytics selection.');
  await inspectIntegrationResource(service, api);
  const end = new Date().toISOString();
  const start = new Date(Date.parse(end) - hours * 3600000).toISOString();
  const id = selected(service, 'projectId', 'project');
  const date = (value: string) => value.slice(0, 19).replace('T', ' ');
  const value = record(
    await api(`/api/projects/${id}/query/`, 'POST', {
      query: {
        kind: 'HogQLQuery',
        query: `SELECT formatDateTime(timestamp, '%Y-%m-%dT%H:00:00Z', 'UTC') AS time, count() AS events, uniqExact(distinct_id) AS visitors FROM events WHERE timestamp >= toDateTime('${date(start)}', 'UTC') AND timestamp < toDateTime('${date(end)}', 'UTC') GROUP BY time ORDER BY time LIMIT 1000`,
      },
      name: 'Anhedral selected-project hourly analytics',
      async: false,
    }),
  );
  if (!Array.isArray(value.results) || value.results.length >= 1000)
    throw new Error('Analytics is pending, truncated or unavailable.');
  const points = value.results.map((row) => {
    if (
      !Array.isArray(row) ||
      row.length !== 3 ||
      typeof row[0] !== 'string' ||
      !Number.isFinite(Date.parse(row[0])) ||
      row
        .slice(1)
        .some((count) => typeof count !== 'number' || !Number.isFinite(count) || count < 0)
    )
      throw new Error('Unsupported analytics output.');
    return { time: row[0], values: { events: row[1] as number, visitors: row[2] as number } };
  });
  return {
    start,
    end,
    fetchedAt: new Date().toISOString(),
    source: 'PostHog hourly product analytics',
    timezone: 'UTC',
    sampled: false,
    points,
    units: { events: 'count', visitors: 'hourly bucket count' },
  };
}
