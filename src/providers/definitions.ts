import type { StandardProduct } from '../stack-registry.js';
export interface StripeSettings {
  accountId?: string;
  mode?: '' | 'test' | 'live';
  webhookUrl?: string;
  webhookEvents?: string[];
}
export interface RevenueCatSettings {
  projectId?: string;
  name?: string;
  iosAppId?: string;
  androidAppId?: string;
  webAppId?: string;
  stripeAccountId?: string;
  bundleId?: string;
  packageName?: string;
}
export interface ProviderSettingsById {
  stripe: StripeSettings;
  revenuecat: RevenueCatSettings;
}
export type IntegrationProvider = keyof ProviderSettingsById;
/** Shared adapter access remains bounded to known fields; provider configuration itself
 * uses ProviderSettingsById so fields cannot leak between providers. */
export type ProviderSettings = StripeSettings & RevenueCatSettings;
export type ProviderField = keyof ProviderSettings;
export type FieldKind = 'text' | 'identity' | 'https-url' | 'events';
export interface ProviderFieldDefinition {
  kind: FieldKind;
  choices?: readonly string[];
}
export interface ProviderDefinition {
  credential: string;
  auth: {
    path: string;
    products?: readonly StandardProduct[];
    runtime?: { credential: string; path: string };
  };
  origin: string;
  regionalOrigins?: Readonly<Record<string, string>>;
  fields: Partial<Record<ProviderField, ProviderFieldDefinition>>;
  /** Describes adapter scope, not account permissions or production readiness. */
  resources: readonly string[];
  ownerSteps: readonly string[];
}
const text = { kind: 'text' } as const;
const identity = { kind: 'identity' } as const;
export const PROVIDER_DEFINITIONS = {
  stripe: {
    credential: 'STRIPE_SECRET_KEY',
    auth: { path: '/v1/account' },
    origin: 'https://api.stripe.com',
    fields: {
      accountId: identity,
      mode: { kind: 'text', choices: ['', 'test', 'live'] },
      webhookUrl: { kind: 'https-url' },
      webhookEvents: { kind: 'events' },
    },
    resources: ['account verification', 'webhook'],
    ownerSteps: ['Complete account activation; define products, prices, and purchase behavior.'],
  },
  revenuecat: {
    credential: 'RC_API_KEY',
    auth: { path: '/v2/projects' },
    origin: 'https://api.revenuecat.com',
    fields: {
      projectId: identity,
      name: text,
      iosAppId: identity,
      androidAppId: identity,
      webAppId: identity,
      stripeAccountId: identity,
      bundleId: text,
      packageName: text,
    },
    resources: ['project', 'application', 'SDK keys'],
    ownerSteps: [
      'Configure store credentials or Stripe, products, offerings, and entitlements; verify purchases.',
    ],
  },
} as const satisfies Record<IntegrationProvider, ProviderDefinition>;
export const INTEGRATION_PROVIDERS = Object.keys(PROVIDER_DEFINITIONS) as IntegrationProvider[];

export const PROVIDER_TEXT_PATTERN = '^(?:[a-zA-Z0-9][a-zA-Z0-9_. -]*)?$';
export const PROVIDER_IDENTITY_PATTERN = '^(?:[a-zA-Z0-9][a-zA-Z0-9_-]{0,254})?$';
export const PROVIDER_EVENT_PATTERN = '^[a-z][a-z0-9_.]{0,100}$';
/** Schema and runtime use the same pattern; URL parsing also verifies normalization. */
export const PROVIDER_WEBHOOK_PATTERN = '^https://[^/?#@\\\\\\s]+(?:/[^?#\\\\\\s]*)?$';
