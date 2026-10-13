import { object, list, resourceId, type ApiRequest } from './api.js';
import { setting, type IntegrationProvider, type ProviderSettings } from './config.js';
import type { OperationDescriptor } from './state.js';
import type { MinimalReceipt } from './receipts.js';

function same(actual: unknown, expected: string, label: string): void {
  if (!expected || actual !== expected)
    throw new Error(`Recovered provider ${label} does not match the desired configuration.`);
}
function route(descriptor: OperationDescriptor, key: string, expected: string): void {
  if (descriptor.key !== key || descriptor.route !== expected)
    throw new Error('Pending provider operation does not match the supported recovery route.');
}

/** Only verified identities may finish a pending journal operation. Every request is
 * GET; key creation cannot be recovered by inventing a one-time credential. */
export async function verifyRecoveredResource(
  provider: IntegrationProvider,
  descriptor: OperationDescriptor,
  requested: string,
  settings: ProviderSettings,
  api: ApiRequest,
): Promise<MinimalReceipt> {
  const id = resourceId(requested);
  if (['sending-key', 'webhook', 'service-account'].includes(descriptor.key))
    throw new Error(
      'This operation creates a one-time credential. Restore its securely retained credential and verify it with the provider; resource-only recovery is unavailable.',
    );
  if (provider === 'neon') {
    route(descriptor, 'project', '/api/v2/projects');
    const project = object(object(await api(`/api/v2/projects/${id}`)).project);
    same(resourceId(project.id), id, 'Neon identity');
    same(project.org_id, setting(settings, 'organizationId'), 'Neon organization');
    same(project.name, setting(settings, 'name'), 'Neon project name');
    same(project.region_id, setting(settings, 'region'), 'Neon region');
    return { project: { id } };
  }
  if (provider === 'clerk') {
    route(descriptor, 'application', '/v1/platform/applications');
    same(
      object(await api('/v1/platform/me')).subject,
      setting(settings, 'workspaceId'),
      'Clerk workspace',
    );
    const application = object(await api(`/v1/platform/applications/${id}`));
    same(application.application_id, id, 'Clerk application identity');
    same(application.name, setting(settings, 'name'), 'Clerk application name');
    const instances = list(application.instances).filter(
      (entry) => entry.environment_type === settings.environment,
    );
    if (instances.length !== 1)
      throw new Error(
        'Recovered Clerk application does not have exactly one selected environment.',
      );
    return { application_id: id };
  }
  if (provider === 'resend') {
    route(descriptor, 'domain', '/domains');
    const domain = object(await api(`/domains/${id}`));
    same(domain.id, id, 'Resend domain identity');
    same(domain.name, setting(settings, 'domain'), 'Resend domain name');
    if (setting(settings, 'region'))
      same(domain.region, setting(settings, 'region'), 'Resend region');
    return { id };
  }
  if (provider === 'posthog') {
    const organization = resourceId(setting(settings, 'organizationId'));
    route(descriptor, 'project', `/api/organizations/${organization}/projects/`);
    const project = object(await api(`/api/organizations/${organization}/projects/${id}/`));
    same(resourceId(project.id), id, 'PostHog project identity');
    same(project.organization, organization, 'PostHog organization');
    same(project.name, setting(settings, 'name'), 'PostHog project name');
    return { id };
  }
  if (provider === 'openai') {
    route(descriptor, 'project', '/v1/organization/projects');
    const project = object(await api(`/v1/organization/projects/${id}`));
    same(project.id, id, 'OpenAI project identity');
    same(project.name, setting(settings, 'name'), 'OpenAI project name');
    same(project.status, 'active', 'OpenAI project status');
    return { id };
  }
  if (provider === 'sentry') {
    const organization = resourceId(setting(settings, 'organization'));
    const team = resourceId(setting(settings, 'team'));
    const slug = resourceId(setting(settings, 'project'));
    route(descriptor, 'project', `/api/0/teams/${organization}/${team}/projects/`);
    const project = object(await api(`/api/0/projects/${organization}/${slug}/`));
    same(resourceId(project.id), id, 'Sentry project identity');
    same(object(project.organization).slug, organization, 'Sentry organization');
    same(project.slug, slug, 'Sentry project slug');
    same(project.platform, setting(settings, 'platform'), 'Sentry platform');
    if (!list(project.teams).some((entry) => entry.slug === team))
      throw new Error('Recovered Sentry project does not belong to the selected team.');
    return { id };
  }
  if (provider === 'revenuecat') {
    if (descriptor.key === 'project') {
      route(descriptor, 'project', '/v2/projects');
      const project = object(await api(`/v2/projects/${id}`));
      same(project.id, id, 'RevenueCat project identity');
      same(project.name, setting(settings, 'name'), 'RevenueCat project name');
      return { id };
    }
    // Recovery of an app requires an explicit parent project choice. Never infer
    // that parent from whichever project the current credential most recently used.
    const project = resourceId(setting(settings, 'projectId'));
    if (!['ios-app', 'android-app', 'web-app'].includes(descriptor.key))
      throw new Error('Unsupported RevenueCat recovery operation.');
    route(descriptor, descriptor.key, `/v2/projects/${project}/apps`);
    const app = object(await api(`/v2/projects/${project}/apps/${id}`));
    same(app.id, id, 'RevenueCat app identity');
    const type =
      descriptor.key === 'ios-app'
        ? 'app_store'
        : descriptor.key === 'android-app'
          ? 'play_store'
          : 'stripe';
    same(app.type, type, 'RevenueCat app platform');
    const field =
      type === 'app_store'
        ? 'bundle_id'
        : type === 'play_store'
          ? 'package_name'
          : 'stripe_account_id';
    same(
      object(app[type])[field],
      setting(
        settings,
        type === 'app_store'
          ? 'bundleId'
          : type === 'play_store'
            ? 'packageName'
            : 'stripeAccountId',
      ),
      'RevenueCat app identifier',
    );
    return { id };
  }
  throw new Error('Resource-only recovery is unsupported for this provider operation.');
}
