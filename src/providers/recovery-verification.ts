import { object, resourceId, type ApiRequest } from './api.js';
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
