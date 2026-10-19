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

async function neon(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  let id = setting(config, 'projectId');
  if (!id) {
    const response = await create(context, 'project', '/api/v2/projects', {
      project: {
        name: setting(config, 'name'),
        org_id: setting(config, 'organizationId'),
        region_id: setting(config, 'region'),
        default_branch: {
          name: 'main',
          database_name: setting(config, 'database'),
          role_name: setting(config, 'role'),
        },
      },
    });
    id = resourceId(object(response.project).id);
  }
  id = resourceId(id);
  const project = object(object(await api(`/api/v2/projects/${id}`)).project);
  same(project.org_id, setting(config, 'organizationId'), 'Neon organization');
  if (project.suspended === true) throw new Error('Neon project is suspended.');
  const operations = list(object(await api(`/api/v2/projects/${id}/operations`)).operations);
  if (operations.some((operation) => !['finished', 'skipped'].includes(String(operation.status))))
    return result(
      { project: id },
      {},
      ['Neon operations are pending or failed. Inspect the project, then run ship again.'],
      false,
    );
  const query = new URLSearchParams({
    database_name: setting(config, 'database'),
    role_name: setting(config, 'role'),
    pooled: 'true',
  });
  const uri = text(object(await api(`/api/v2/projects/${id}/connection_uri?${query}`)).uri);
  const parsed = new URL(uri);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !parsed.hostname.endsWith('.neon.tech')
  )
    throw new Error('Neon returned an unexpected database connection.');
  return result({ project: id }, { DATABASE_URL: uri }, [
    'Configure DATABASE_URL_UNPOOLED with the intended direct migration connection in ignored packages/db/.env; runtime provisioning does not configure migration credentials.',
    'Run pnpm db:generate, review the SQL, then run pnpm db:migrate against the intended database before testing authentication or application data.',
  ]);
}

async function clerk(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  const principal = object(await api('/v1/platform/me'));
  same(principal.subject, setting(config, 'workspaceId'), 'Clerk workspace');
  let id = setting(config, 'applicationId');
  if (!id)
    id = resourceId(
      (
        await create(context, 'application', '/v1/platform/applications', {
          name: setting(config, 'name'),
          environment_types: [setting(config, 'environment')],
        })
      ).application_id,
    );
  id = resourceId(id);
  const application = object(await api(`/v1/platform/applications/${id}?include_secret_keys=true`));
  same(application.application_id, id, 'Clerk application');
  const instances = list(application.instances).filter(
    (instance) => instance.environment_type === config.environment,
  );
  if (instances.length !== 1)
    throw new Error('Clerk did not return exactly one selected environment.');
  const instance = instances[0];
  const publishable = text(instance.publishable_key);
  const secret = text(instance.secret_key);
  const mode = config.environment === 'production' ? 'live' : 'test';
  if (!publishable.startsWith(`pk_${mode}_`) || !secret.startsWith(`sk_${mode}_`))
    throw new Error('Clerk keys do not match the selected environment.');
  return result(
    { application: id, instance: resourceId(instance.instance_id) },
    {
      CLERK_SECRET_KEY: secret,
      CLERK_PUBLISHABLE_KEY: publishable,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: publishable,
    },
    config.environment === 'production'
      ? ['Verify the production Clerk domain, DNS and enabled OAuth providers before delivery.']
      : [],
  );
}

async function resend(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  let id = setting(config, 'domainId');
  if (!id)
    id = resourceId(
      (
        await create(context, 'domain', '/domains', {
          name: setting(config, 'domain'),
          ...(setting(config, 'region') ? { region: config.region } : {}),
        })
      ).id,
    );
  id = resourceId(id);
  let domain = object(await api(`/domains/${id}`));
  same(domain.name, setting(config, 'domain'), 'Resend domain');
  if (domain.status !== 'verified') {
    await api(`/domains/${id}/verify`, 'POST');
    domain = object(await api(`/domains/${id}`));
  }
  if (domain.status !== 'verified') {
    const records = list(domain.records).map(
      (record) =>
        `${text(record.type)} ${text(record.name)} ${text(record.value)}${record.priority === undefined ? '' : ` (priority ${Number(record.priority)})`}`,
    );
    return result(
      { domain: id },
      {},
      ['Publish the Resend DNS records, wait for verification, then run ship again.', ...records],
      false,
    );
  }
  const key = await create(context, 'sending-key', '/api-keys', {
    name: `anhedral-${id}`.slice(0, 50),
    permission: 'sending_access',
    domain_id: id,
  });
  const keys = object(await api('/api-keys'));
  if (keys.has_more === true || !list(keys.data).some((entry) => entry.id === key.id))
    throw new Error(
      'Resend did not confirm the recorded sending key; inspect key access before configuring runtime.',
    );
  return result(
    { domain: id, sendingKey: resourceId(key.id) },
    { RESEND_API_KEY: text(key.token) },
  );
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

async function sentry(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  const organization = resourceId(config.organization);
  const team = resourceId(config.team);
  const slug = resourceId(config.project);
  const projects = list(await api(`/api/0/teams/${organization}/${team}/projects/`));
  const matching = projects.filter((project) => project.slug === slug);
  if (matching.length > 1) throw new Error('Sentry project selection is ambiguous.');
  if (!matching.length)
    await create(context, 'project', `/api/0/teams/${organization}/${team}/projects/`, {
      name: setting(config, 'name') || slug,
      slug,
      platform: config.platform,
      default_rules: false,
    });
  const project = object(await api(`/api/0/projects/${organization}/${slug}/`));
  same(object(project.organization).slug, organization, 'Sentry organization');
  same(project.platform, setting(config, 'platform'), 'Sentry platform');
  if (!list(project.teams).some((entry) => entry.slug === team))
    throw new Error('Sentry project belongs to a different team.');
  let keys = list(await api(`/api/0/projects/${organization}/${slug}/keys/`)).filter(
    (key) => key.isActive === true,
  );
  if (!keys.length) {
    await create(context, 'client-key', `/api/0/projects/${organization}/${slug}/keys/`, {
      name: 'Anhedral',
    });
    keys = list(await api(`/api/0/projects/${organization}/${slug}/keys/`)).filter(
      (key) => key.isActive === true,
    );
  }
  if (keys.length !== 1)
    throw new Error('Select exactly one active Sentry client key before configuring.');
  const dsn = text(object(keys[0].dsn).public);
  if (new URL(dsn).protocol !== 'https:') throw new Error('Sentry DSN must use HTTPS.');
  return result({ project: resourceId(project.id) }, { SENTRY_DSN: dsn });
}

async function posthog(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  const organization = resourceId(config.organizationId);
  let id = setting(config, 'projectId');
  if (!id)
    id = resourceId(
      (
        await create(context, 'project', `/api/organizations/${organization}/projects/`, {
          name: config.name,
        })
      ).id,
    );
  id = resourceId(id);
  const project = object(await api(`/api/organizations/${organization}/projects/${id}/`));
  same(resourceId(project.id), id, 'PostHog project');
  same(project.organization, organization, 'PostHog organization');
  return result(
    { project: id },
    {
      POSTHOG_API_KEY: text(project.api_token),
      POSTHOG_HOST:
        config.region === 'eu' ? 'https://eu.i.posthog.com' : 'https://us.i.posthog.com',
    },
  );
}

async function openai(context: AdapterContext): Promise<AdapterResult> {
  const { settings: config, api } = context;
  let id = setting(config, 'projectId');
  if (!id)
    id = resourceId(
      (await create(context, 'project', '/v1/organization/projects', { name: config.name })).id,
    );
  id = resourceId(id);
  const project = object(await api(`/v1/organization/projects/${id}`));
  same(project.id, id, 'OpenAI project');
  if (project.status !== 'active') throw new Error('OpenAI project is not active.');
  const account = await create(
    context,
    'service-account',
    `/v1/organization/projects/${id}/service_accounts`,
    { name: config.serviceAccountName },
  );
  const accountId = resourceId(account.id);
  const current = object(
    await api(`/v1/organization/projects/${id}/service_accounts/${accountId}`),
  );
  same(current.id, accountId, 'OpenAI service account');
  same(current.name, setting(config, 'serviceAccountName'), 'OpenAI service account name');
  return result(
    { project: id, serviceAccount: accountId },
    { OPENAI_API_KEY: text(object(account.api_key).value) },
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
  neon,
  clerk,
  resend,
  stripe,
  revenuecat,
  sentry,
  posthog,
  openai,
};
