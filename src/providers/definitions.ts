import type { StandardProduct } from '../stack-registry.js';

/** Public provider configuration describes resources, never credentials. Empty strings are
 * permitted for scaffolding; provisioning separately checks the required choices. */
export interface NeonSettings {
  projectId?: string;
  name?: string;
  organizationId?: string;
  region?: string;
  database?: string;
  role?: string;
}
export interface ClerkSettings {
  workspaceId?: string;
  applicationId?: string;
  name?: string;
  environment?: '' | 'development' | 'production';
}
export interface ResendSettings {
  domainId?: string;
  domain?: string;
  region?: string;
}
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
export interface SentrySettings {
  organization?: string;
  team?: string;
  project?: string;
  name?: string;
  platform?: string;
}
export interface PostHogSettings {
  organizationId?: string;
  projectId?: string;
  name?: string;
  region?: '' | 'us' | 'eu';
}
export interface OpenAISettings {
  projectId?: string;
  name?: string;
  serviceAccountName?: string;
}
export interface ProviderSettingsById {
  neon: NeonSettings;
  clerk: ClerkSettings;
  resend: ResendSettings;
  stripe: StripeSettings;
  revenuecat: RevenueCatSettings;
  sentry: SentrySettings;
  posthog: PostHogSettings;
  openai: OpenAISettings;
}
export type IntegrationProvider = keyof ProviderSettingsById;
/** Shared adapter access remains bounded to known fields; provider configuration itself
 * uses ProviderSettingsById so fields cannot leak between providers. */
export type ProviderSettings = Omit<
  NeonSettings &
    ClerkSettings &
    ResendSettings &
    StripeSettings &
    RevenueCatSettings &
    SentrySettings &
    PostHogSettings &
    OpenAISettings,
  'region'
> & { region?: string };
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
  neon: {
    credential: 'NEON_API_KEY',
    auth: { path: '/api/v2/projects' },
    origin: 'https://console.neon.tech',
    fields: {
      projectId: identity,
      name: text,
      organizationId: identity,
      region: text,
      database: text,
      role: text,
    },
    resources: ['project', 'database connection'],
    ownerSteps: ['Choose an organization and region; approve any provider billing requirements.'],
  },
  clerk: {
    credential: 'CLERK_PLATFORM_API_KEY',
    auth: {
      path: '/v1/platform/me',
      runtime: { credential: 'CLERK_SECRET_KEY', path: '/v1/users/count' },
    },
    origin: 'https://api.clerk.com',
    fields: {
      workspaceId: identity,
      applicationId: identity,
      name: text,
      environment: { kind: 'text', choices: ['', 'development', 'production'] },
    },
    resources: ['application', 'environment keys'],
    ownerSteps: [
      'Obtain Platform API access; configure production domains, DNS, and OAuth credentials.',
    ],
  },
  resend: {
    credential: 'RESEND_API_KEY',
    auth: { path: '/domains' },
    origin: 'https://api.resend.com',
    fields: { domainId: identity, domain: text, region: text },
    resources: ['domain', 'sending key'],
    ownerSteps: ['Publish domain verification DNS records and wait for verification.'],
  },
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
  sentry: {
    credential: 'SENTRY_AUTH_TOKEN',
    auth: { path: '/api/0/organizations/' },
    origin: 'https://sentry.io',
    fields: {
      organization: identity,
      team: identity,
      project: identity,
      name: text,
      platform: text,
    },
    resources: ['project', 'DSN'],
    ownerSteps: [
      'Choose organization and team access; configure source maps and application instrumentation.',
    ],
  },
  posthog: {
    credential: 'POSTHOG_PERSONAL_API_KEY',
    auth: { path: '/api/organizations/' },
    origin: 'https://us.posthog.com',
    regionalOrigins: { us: 'https://us.posthog.com', eu: 'https://eu.posthog.com' },
    fields: {
      organizationId: identity,
      projectId: identity,
      name: text,
      region: { kind: 'text', choices: ['', 'us', 'eu'] },
    },
    resources: ['project', 'ingestion configuration'],
    ownerSteps: ['Choose organization and region; define analytics events and consent behavior.'],
  },
  openai: {
    credential: 'OPENAI_ADMIN_KEY',
    auth: {
      path: '/v1/organization/projects',
      products: ['openai', 'ai-sdk'],
      runtime: { credential: 'OPENAI_API_KEY', path: '/v1/models' },
    },
    origin: 'https://api.openai.com',
    fields: { projectId: identity, name: text, serviceAccountName: text },
    resources: ['project', 'service account', 'runtime key'],
    ownerSteps: [
      'Obtain organization administration access; configure billing and application usage limits.',
    ],
  },
} as const satisfies Record<IntegrationProvider, ProviderDefinition>;
export const INTEGRATION_PROVIDERS = Object.keys(PROVIDER_DEFINITIONS) as IntegrationProvider[];

export const PROVIDER_TEXT_PATTERN = '^(?:[a-zA-Z0-9][a-zA-Z0-9_. -]*)?$';
export const PROVIDER_IDENTITY_PATTERN = '^(?:[a-zA-Z0-9][a-zA-Z0-9_-]{0,254})?$';
export const PROVIDER_EVENT_PATTERN = '^[a-z][a-z0-9_.]{0,100}$';
/** Schema and runtime use the same pattern; URL parsing also verifies normalization. */
export const PROVIDER_WEBHOOK_PATTERN = '^https://[^/?#@\\\\\\s]+(?:/[^?#\\\\\\s]*)?$';
