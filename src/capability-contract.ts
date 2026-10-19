import { STANDARD_PRODUCTS, getStackItem } from './stack-registry.js';
import { PROVIDER_DEFINITIONS, type IntegrationProvider } from './providers/definitions.js';
import { GENERATOR_VERSION } from './version.js';
import type { StackSelection, StandardProduct } from './registry/types.js';

export type CapabilitySupport = 'implemented' | 'scaffold-only' | 'unsupported' | 'not-applicable';
export type CapabilityEvidence = 'local-contract' | 'unverified';
export interface CapabilityStage {
  support: CapabilitySupport;
  evidence: CapabilityEvidence;
  scope: string;
}
export interface ProductCapability {
  id: StandardProduct;
  description: string;
  targets: readonly string[];
  registryDependencies: readonly string[];
  selection: StackSelection;
  scaffold: CapabilityStage;
  provisioning: CapabilityStage;
  delivery: CapabilityStage;
  limits: readonly string[];
}
const stage = (
  support: CapabilitySupport,
  scope: string,
  evidence: CapabilityEvidence = 'local-contract',
): CapabilityStage => ({ support, evidence, scope });
const none = (scope: string) => stage('not-applicable', scope, 'unverified');
const cloudflareResources = ['d1', 'r2', 'kv', 'queues', 'basin'];
const deploymentBindings = [
  'realtime',
  'cron',
  'workflows',
  'workers-ai',
  'analytics-engine',
  'images',
];
function integration(id: string): IntegrationProvider | undefined {
  const provider = id === 'ai-sdk' ? 'openai' : id;
  return Object.hasOwn(PROVIDER_DEFINITIONS, provider)
    ? (provider as IntegrationProvider)
    : undefined;
}
function productCapability(id: StandardProduct): ProductCapability {
  const item = getStackItem(id);
  const provider = integration(id);
  let provisioning = none('No separately provisioned resource.');
  let delivery = none('Delivered as part of the selected application.');
  const limits = [
    'Generated primitives require application feature development and acceptance checks.',
  ];
  if (provider) {
    provisioning = stage(
      'implemented',
      `Selected ${PROVIDER_DEFINITIONS[provider].resources.join(', ')} through provider APIs.`,
    );
    limits.push(
      ...PROVIDER_DEFINITIONS[provider].ownerSteps,
      'Live account permissions and provider behavior require authorized acceptance.',
    );
  }
  if (cloudflareResources.includes(id)) {
    provisioning = stage(
      'implemented',
      id === 'basin'
        ? 'Private Cloudflare stream and Worker binding.'
        : 'Selected Cloudflare resource and checked Worker binding.',
    );
    limits.push(
      'Account eligibility, quotas, and live runtime behavior require authorized acceptance.',
    );
    if (id === 'basin')
      limits.push('Pipeline transforms and sinks are outside automated provisioning.');
  }
  if (deploymentBindings.includes(id)) {
    provisioning = stage(
      'implemented',
      'Worker deployment configures the selected binding or trigger.',
    );
    limits.push(
      'Configured bindings and triggers do not establish application behavior or execution success.',
    );
  }
  if (['vinext', 'next', 'hono'].includes(id))
    delivery = stage(
      'implemented',
      id === 'next'
        ? 'Selected Cloudflare or Vercel deployment with provider identity and source checks.'
        : 'Cloudflare Worker deployment with provider identity and source checks.',
    );
  if (id === 'expo') {
    delivery = stage(
      'implemented',
      'EAS build request, build receipt verification, and artifact link.',
    );
    limits.push(
      'No store submission; signing, enrollment, device testing, and store distribution remain developer responsibilities.',
    );
  }
  if (id === 'electron' || id === 'wxt') {
    delivery = stage(
      'scaffold-only',
      'Generated application and local build tooling; automated distribution is unavailable.',
    );
    limits.push(
      id === 'electron'
        ? 'Signing, notarization, installers, updates, and distribution require a separate delivery workflow.'
        : 'Extension signing, store submission, review, and distribution require a separate delivery workflow.',
    );
  }
  if (id === 'realtimekit' || id === 'video') {
    provisioning = stage(
      'scaffold-only',
      'Manual account activation and service configuration; no provider activation or credential installation during generation.',
      'unverified',
    );
    limits.push(
      'Server-only helper; product authorization routes, client UI and live provider acceptance remain required.',
    );
  }
  if (id === 'stream') {
    provisioning = stage(
      'scaffold-only',
      'Manual Stream activation and live input setup; no automatic Stream provisioning or runtime credential installation.',
      'unverified',
    );
    limits.push(
      'Server management factory only; creator/player UI, WHIP/WHEP signaling and playback token issuance require application implementation.',
      'Keep management tokens server-only and disclose secret WHIP URLs only to authorized creators; verify private media access independently of hosting protection.',
      'One-to-many broadcasts; conferencing, recording, HLS/DASH bridging, restreaming and live viewer counts are outside this integration.',
      'Usage-based viewer-minute billing, account eligibility and live broadcast/playback acceptance require separate verification.',
    );
  }
  if (id === 'neon-realtime') {
    provisioning = stage(
      'scaffold-only',
      'Manually enable Realtime on the intended Neon branch, configure allowed origins and supply its private secret and public URL; no automatic Realtime provisioning.',
      'unverified',
    );
    limits.push(
      'Neon Realtime is beta and does not support RLS; authenticate requests and seal only explicitly scoped, read-only application queries.',
      'Keep DATABASE_URL and NEON_REALTIME_SECRET server-only; clients use the public NEON_REALTIME_URL and short-lived sealed queries.',
      'The package exposes separate server/client factories and a Drizzle adapter; no arbitrary SQL endpoint or application subscription flow is generated.',
      'Live subscriptions, renewal, revocation, allowed origins and cross-tenant isolation require authorized acceptance; live behavior remains unverified.',
    );
  }
  if (id === 'better-auth')
    limits.push(
      'Configure private authentication secret and public origin; apply and verify database migrations and authorization rules.',
    );
  return {
    id,
    description: item.description,
    targets: item.targets,
    registryDependencies: item.registryDependencies,
    selection: item.selection,
    scaffold: stage('implemented', 'Bundled source recipe and stack composition.'),
    provisioning,
    delivery,
    limits,
  };
}

/** Advertises implemented scope and the evidence level separately. This catalog is
 * pure metadata; consulting it never authenticates, provisions, or verifies a live account. */
export const CAPABILITY_CONTRACT = {
  schemaVersion: 1,
  cliVersion: GENERATOR_VERSION,
  mutation: false,
  liveAcceptance: 'unverified' as const,
  products: STANDARD_PRODUCTS.map(productCapability),
  providers: Object.entries(PROVIDER_DEFINITIONS).map(([id, definition]) => ({
    id,
    managementCredential: definition.credential,
    resources: definition.resources,
    provisioning: stage(
      'implemented',
      'Selected resources through provider APIs; fixture-tested local contracts.',
    ),
    liveAcceptance: 'unverified' as const,
    ownerSteps: definition.ownerSteps,
  })),
  hosts: [
    {
      id: 'cloudflare',
      delivery: stage(
        'implemented',
        'Provision selected resources, configure bindings/secrets, deploy Workers, inspect provider identity and source receipts.',
      ),
      liveAcceptance: 'unverified' as const,
    },
    {
      id: 'vercel',
      delivery: stage(
        'implemented',
        'Configure the selected project environment, deploy the web app, inspect provider identity and source receipts.',
      ),
      liveAcceptance: 'unverified' as const,
    },
  ],
  plugin: [
    {
      id: 'project-inspection',
      capability: stage(
        'implemented',
        'Offline versioned stack, setup prerequisites and target-specific recorded delivery evidence, shared by CLI and optional UI.',
      ),
    },
    {
      id: 'project-catalog',
      capability: stage(
        'implemented',
        'Local projects, configuration, and recorded delivery receipts.',
      ),
    },
    {
      id: 'native-host-installation',
      capability: stage('implemented', 'Packaged plugin and host integration.', 'unverified'),
    },
    {
      id: 'live-analytics',
      capability: stage(
        'implemented',
        'Explicit selected-resource analytics for Cloudflare Workers/D1, Vercel and PostHog; provider access and metric availability require live acceptance.',
      ),
    },
    {
      id: 'live-database-reader',
      capability: stage(
        'implemented',
        'Explicit bounded D1 and restricted read-only Neon data reads; masked rows and schema are private app metadata.',
      ),
    },
    {
      id: 'live-provider-health',
      capability: stage(
        'implemented',
        'Explicit resource existence, identity and recorded deployment status checks; these do not certify application health.',
      ),
    },
    {
      id: 'schedule-execution',
      capability: stage(
        'unsupported',
        'Schedules are declared configuration; no execution-history reader is implemented.',
        'unverified',
      ),
    },
  ],
  limits: [
    'Local contract tests are separate from live provider acceptance and completed application verification.',
    'Account selection, enrollment, billing approval, DNS ownership, and signing can require owner action.',
    'Mixed hosting is sequential; no atomic cross-provider rollback or cached phase skipping is promised.',
    'The CLI scaffolds supported primitives; customer application features remain development work.',
  ],
};

export function formatCapabilityContract(): string {
  return [
    `Anhedral ${CAPABILITY_CONTRACT.cliVersion} capabilities`,
    'Evidence: local contracts; live provider acceptance remains unverified.',
    '',
    'Product             Provisioning        Delivery',
    ...CAPABILITY_CONTRACT.products.map(
      (product) =>
        `${product.id.padEnd(20)}${product.provisioning.support.padEnd(20)}${product.delivery.support}`,
    ),
    '',
    'Providers: ' + CAPABILITY_CONTRACT.providers.map((provider) => provider.id).join(', '),
    'Expo delivery returns EAS artifacts; it does not submit to stores.',
    'Electron and WXT distribution: scaffold only.',
    'Plugin: explicit selected-resource analytics, bounded database reads and provider status checks; live acceptance remains unverified.',
    'Schedule execution history: unavailable. Resource status does not certify application health.',
    '',
    ...CAPABILITY_CONTRACT.limits,
    '',
    'Use --json for scope, owner steps, and evidence for every capability.',
  ].join('\n');
}
