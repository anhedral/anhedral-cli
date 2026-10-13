import path from 'node:path';
import { existsSync, realpathSync } from 'node:fs';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from '../bounded-file.js';
import { validateSetupPlan } from '../readiness.js';

import {
  INTEGRATION_PROVIDERS,
  PROVIDER_DEFINITIONS,
  PROVIDER_EVENT_PATTERN,
  PROVIDER_IDENTITY_PATTERN,
  PROVIDER_TEXT_PATTERN,
  PROVIDER_WEBHOOK_PATTERN,
  type IntegrationProvider,
  type ProviderDefinition,
  type ProviderField,
  type ProviderSettings,
  type ProviderSettingsById,
} from './definitions.js';
export { INTEGRATION_PROVIDERS } from './definitions.js';
export type { IntegrationProvider, ProviderSettings, ProviderSettingsById } from './definitions.js';
export interface ProviderConfiguration {
  schemaVersion: 1;
  providers: Partial<ProviderSettingsById>;
}

/** Validate untrusted JSON before assigning provider-specific types. */
export function validateProviderConfiguration(
  value: unknown,
  selected: readonly IntegrationProvider[] = INTEGRATION_PROVIDERS,
): asserts value is ProviderConfiguration {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('schemaVersion' in value) ||
    value.schemaVersion !== 1 ||
    !('providers' in value) ||
    !value.providers ||
    typeof value.providers !== 'object' ||
    Array.isArray(value.providers) ||
    Object.keys(value).some((key) => !['schemaVersion', 'providers'].includes(key))
  )
    throw new Error('Invalid provider configuration schema.');
  for (const [id, settings] of Object.entries(value.providers)) {
    if (
      !INTEGRATION_PROVIDERS.includes(id as IntegrationProvider) ||
      !selected.includes(id as IntegrationProvider)
    )
      throw new Error('Provider configuration includes an unsupported or unselected provider.');
    if (!settings || typeof settings !== 'object' || Array.isArray(settings))
      throw new Error(`Invalid ${id} settings.`);
    const definition: ProviderDefinition = PROVIDER_DEFINITIONS[id as IntegrationProvider];
    for (const [key, entry] of Object.entries(settings)) {
      const field = definition.fields[key as ProviderField];
      if (!Object.hasOwn(definition.fields, key) || !field)
        throw new Error(`Unsupported ${id} setting. Credentials belong in the environment.`);
      if (field.kind === 'events') {
        if (
          !Array.isArray(entry) ||
          entry.length < 1 ||
          entry.length > 100 ||
          new Set(entry).size !== entry.length ||
          entry.some(
            (event) => typeof event !== 'string' || !new RegExp(PROVIDER_EVENT_PATTERN).test(event),
          )
        )
          throw new Error('Stripe webhook events must be explicit unique event names.');
        continue;
      }
      if (typeof entry !== 'string' || entry.length > 255 || /[\x00-\x1f\x7f]/.test(entry))
        throw new Error(`Invalid ${id} setting.`);
      if (field.choices && !field.choices.includes(entry))
        throw new Error(`Invalid ${id} ${key} choice.`);
      if (field.kind === 'https-url') {
        let url: URL;
        try {
          url = new URL(entry);
        } catch {
          throw new Error('Webhook URL must use HTTPS.');
        }
        if (
          !new RegExp(PROVIDER_WEBHOOK_PATTERN).test(entry) ||
          url.protocol !== 'https:' ||
          !url.hostname ||
          url.username ||
          url.password ||
          url.hash ||
          url.search
        )
          throw new Error('Webhook URL must use HTTPS without credentials, query or fragment.');
      } else if (
        !new RegExp(
          field.kind === 'identity' ? PROVIDER_IDENTITY_PATTERN : PROVIDER_TEXT_PATTERN,
        ).test(entry)
      )
        throw new Error(
          `Invalid ${id} ${field.kind === 'identity' ? 'resource identity' : 'setting'}.`,
        );
    }
  }
}

export function providerConfiguration(root: string): ProviderConfiguration {
  root = realpathSync(root);
  const file = path.join(root, 'anhedral.providers.json');
  const selected = selectedIntegrations(root);
  if (!existsSync(file)) return { schemaVersion: 1, providers: {} };
  let value: unknown;
  try {
    value = JSON.parse(readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8'));
  } catch {
    throw new Error('Invalid anhedral.providers.json.');
  }
  validateProviderConfiguration(value, selected);
  return value;
}

export function setting(settings: ProviderSettings, key: string): string {
  const value = settings[key as ProviderField];
  return typeof value === 'string' ? value : '';
}

/** No identities, domains, prices or organizations are inferred from a user's last session. */
export function providerRequirements(id: IntegrationProvider, config: ProviderSettings): string[] {
  const missing: string[] = [];
  const need = (key: string) => {
    if (!setting(config, key)) missing.push(key);
  };
  const existingOrNew = () => {
    if (!setting(config, 'projectId')) need('name');
  };
  switch (id) {
    case 'neon':
      existingOrNew();
      need('organizationId');
      need('database');
      need('role');
      if (!setting(config, 'projectId')) need('region');
      break;
    case 'clerk':
      need('workspaceId');
      if (!setting(config, 'applicationId')) need('name');
      if (!['development', 'production'].includes(setting(config, 'environment')))
        missing.push('environment');
      break;
    case 'resend':
      need('domain');
      break;
    case 'stripe':
      need('accountId');
      if (!['test', 'live'].includes(setting(config, 'mode'))) missing.push('mode');
      if (setting(config, 'webhookUrl') && !config.webhookEvents) missing.push('webhookEvents');
      if (config.webhookEvents && !setting(config, 'webhookUrl')) missing.push('webhookUrl');
      break;
    case 'revenuecat':
      existingOrNew();
      if (
        ![
          'iosAppId',
          'androidAppId',
          'webAppId',
          'stripeAccountId',
          'bundleId',
          'packageName',
        ].some((key) => setting(config, key))
      )
        missing.push('store app identifiers or a connected stripeAccountId');
      break;
    case 'sentry':
      need('organization');
      need('team');
      need('project');
      need('platform');
      break;
    case 'posthog':
      existingOrNew();
      need('organizationId');
      if (!['us', 'eu'].includes(setting(config, 'region'))) missing.push('region');
      break;
    case 'openai':
      existingOrNew();
      need('serviceAccountName');
      break;
  }
  return missing;
}

export function selectedIntegrations(root: string): IntegrationProvider[] {
  const setup: unknown = JSON.parse(
    readBoundedFile(path.join(root, 'anhedral.setup.json'), MAX_PROJECT_JSON_BYTES).toString(
      'utf8',
    ),
  );
  validateSetupPlan(setup);
  return INTEGRATION_PROVIDERS.filter(
    (id) => setup.products.includes(id) || (id === 'openai' && setup.products.includes('ai-sdk')),
  );
}

export function providerConfigurationTemplate(
  products: readonly string[],
  name: string,
): ProviderConfiguration {
  const templates: ProviderSettingsById = {
    neon: { name, organizationId: '', region: '', database: 'app', role: 'app_owner' },
    clerk: { name, workspaceId: '', environment: 'development' },
    resend: { domain: '' },
    stripe: { accountId: '', mode: 'test' },
    revenuecat: products.includes('expo')
      ? { name, bundleId: '', packageName: '' }
      : { name, stripeAccountId: '' },
    sentry: {
      name,
      organization: '',
      team: '',
      project: name,
      platform:
        products.includes('next') || products.includes('vinext') ? 'javascript-nextjs' : 'node',
    },
    posthog: { name, organizationId: '', region: '' },
    openai: { name, serviceAccountName: 'anhedral-runtime' },
  };
  return {
    schemaVersion: 1,
    providers: Object.fromEntries(
      INTEGRATION_PROVIDERS.filter(
        (id) => products.includes(id) || (id === 'openai' && products.includes('ai-sdk')),
      ).map((id) => [id, templates[id]]),
    ),
  };
}
