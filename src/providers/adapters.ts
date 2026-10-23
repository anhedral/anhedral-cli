import { object, list, text, resourceId, type ApiObject, type ApiRequest } from './api.js';
import { setting, type IntegrationProvider, type ProviderSettings } from './config.js';
import type { ProvisioningState } from './state.js';

export interface AdapterContext {
  id: IntegrationProvider;
  settings: ProviderSettings;
  api: ApiRequest;
  state: ProvisioningState;
  environment: NodeJS.ProcessEnv;
}
export interface AdapterResult {
  resources: Record<string, string>;
  runtime: Record<string, string>;
  ready: boolean;
  nextActions: string[];
}
function result(
  resources: Record<string, string>,
  runtime: Record<string, string>,
  nextActions: string[] = [],
  ready = true,
): AdapterResult {
  return { resources, runtime, ready, nextActions };
}
const create = (context: AdapterContext, key: string, route: string, body: ApiObject) =>
  context.state.create(context.id, key, context.api, route, body);
function same(value: unknown, expected: unknown, description: string): void {
  if (value !== expected)
    throw new Error(`Provider ${description} differs from the selected configuration.`);
}

async function stripe(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api, environment } = context;
  const account = object(await api('/v1/account'));
  same(account.id, setting(config, 'accountId'), 'Stripe account');
  const key = text(environment.STRIPE_SECRET_KEY);
  const prefix = config.mode === 'live' ? /^(sk|rk)_live_/ : /^(sk|rk)_test_/;
  if (!prefix.test(key)) throw new Error('Stripe key does not match the selected test/live mode.');
  const resources: Record<string, string> = { account: resourceId(account.id) };
  const runtime: Record<string, string> = {
    STRIPE_SECRET_KEY: key,
    BILLING_ENVIRONMENT: config.mode === 'live' ? 'production' : 'sandbox',
  };
  if (setting(config, 'webhookUrl')) {
    const webhook = await create(context, 'webhook', '/v1/webhook_endpoints', {
      url: config.webhookUrl,
      enabled_events: config.webhookEvents,
    });
    const id = resourceId(webhook.id);
    const current = object(await api(`/v1/webhook_endpoints/${id}`));
    same(current.url, setting(config, 'webhookUrl'), 'Stripe webhook URL');
    same(current.livemode, config.mode === 'live', 'Stripe webhook mode');
    if (
      current.status !== 'enabled' ||
      !Array.isArray(current.enabled_events) ||
      JSON.stringify([...current.enabled_events].sort()) !==
        JSON.stringify([...(config.webhookEvents as string[])].sort())
    )
      throw new Error(
        'Stripe webhook is disabled or its events differ from the selected configuration.',
      );
    resources.webhook = id;
    runtime.STRIPE_WEBHOOK_SECRET = text(webhook.secret);
  }
  return result(
    resources,
    runtime,
    config.mode === 'live' && account.charges_enabled !== true
      ? ['Complete Stripe account activation before accepting live payments.']
      : [],
  );
}

async function revenuecat(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  let id = setting(config, 'projectId');
  if (!id)
    id = resourceId((await create(context, 'project', '/v2/projects', { name: config.name })).id);
  id = resourceId(id);
  const project = object(await api(`/v2/projects/${id}`));
  same(project.id, id, 'RevenueCat project');
  const resources: Record<string, string> = { project: id };
  const runtime: Record<string, string> = { REVENUECAT_PROJECT_ID: id };
  if (setting(config, 'webAppId') || setting(config, 'stripeAccountId')) {
    let appId = setting(config, 'webAppId');
    if (!appId)
      appId = resourceId(
        (
          await create(context, 'web-app', `/v2/projects/${id}/apps`, {
            name: `${setting(config, 'name') || id} web`,
            type: 'stripe',
            stripe: { stripe_account_id: config.stripeAccountId },
          })
        ).id,
      );
    appId = resourceId(appId);
    const app = object(await api(`/v2/projects/${id}/apps/${appId}`));
    same(app.type, 'stripe', 'RevenueCat web app');
    if (setting(config, 'stripeAccountId'))
      same(
        object(app.stripe).stripe_account_id,
        config.stripeAccountId,
        'RevenueCat Stripe account',
      );
    resources.webApp = appId;
  }
  for (const platform of ['ios', 'android'] as const) {
    const type = platform === 'ios' ? 'app_store' : 'play_store';
    const identifier = setting(config, platform === 'ios' ? 'bundleId' : 'packageName');
    let appId = setting(config, `${platform}AppId`);
    if (!identifier && !appId) continue;
    if (!appId)
      appId = resourceId(
        (
          await create(context, `${platform}-app`, `/v2/projects/${id}/apps`, {
            name: `${setting(config, 'name') || id} ${platform}`,
            type,
            [type]: { [platform === 'ios' ? 'bundle_id' : 'package_name']: identifier },
          })
        ).id,
      );
    appId = resourceId(appId);
    const app = object(await api(`/v2/projects/${id}/apps/${appId}`));
    same(app.type, type, 'RevenueCat app platform');
    if (identifier)
      same(
        object(app[type])[platform === 'ios' ? 'bundle_id' : 'package_name'],
        identifier,
        'RevenueCat app identifier',
      );
    const keys = list(
      object(await api(`/v2/projects/${id}/apps/${appId}/public_api_keys`)).items,
    ).filter((entry) => entry.app_id === appId && entry.environment === 'production');
    if (keys.length !== 1)
      throw new Error('RevenueCat must return exactly one production public SDK key per app.');
    resources[`${platform}App`] = appId;
    runtime[`EXPO_PUBLIC_REVENUECAT_${platform.toUpperCase()}_API_KEY`] = text(keys[0].key);
  }
  const appIds = ['iosApp', 'androidApp', 'webApp'].flatMap((name) =>
    resources[name] ? [resources[name]] : [],
  );
  if (appIds.length) runtime.REVENUECAT_APP_IDS_JSON = JSON.stringify(appIds);
  return result(resources, runtime, [
    'Configure the dedicated server RevenueCat v1 API key and authenticated webhook integration separately from the v2 management credential. Configure store credentials or the Stripe connection, products and offerings and verify purchases before enabling billing. SDK keys alone do not activate subscriptions.',
  ]);
}

export const PROVIDER_ADAPTERS: Record<
  IntegrationProvider,
  (context: AdapterContext) => Promise<AdapterResult>
> = {
  stripe,
  revenuecat,
};
