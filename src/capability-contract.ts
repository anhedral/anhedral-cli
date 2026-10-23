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
const cloudflareResources = ['d1', 'r2'];

function integration(id: string): IntegrationProvider | undefined {
  const provider = id;
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
    provisioning = stage('implemented', 'Selected Cloudflare resource and checked Worker binding.');
    limits.push(
      'Account eligibility, quotas, and live runtime behavior require authorized acceptance.',
    );
  }
  if (id === 'next') {
    delivery = stage(
      'implemented',
      'Full Next.js OpenNext Worker and assets deployed through Wrangler with an API service binding.',
    );
    limits.push(
      'Default adapter caching is not persistent ISR; provision separately scoped cache infrastructure before adding persistent ISR.',
    );
  }
  if (id === 'hono')
    delivery = stage(
      'implemented',
      'Cloudflare Worker deployment with provider identity and source checks.',
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
        'Explicit selected-resource analytics for Cloudflare Workers/D1; provider access and metric availability require live acceptance.',
      ),
    },
    {
      id: 'live-database-reader',
      capability: stage(
        'implemented',
        'Explicit bounded D1 data reads; masked rows and schema are private app metadata.',
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
    'Plugin: explicit selected-resource analytics, bounded database reads and provider status checks; live acceptance remains unverified.',
    'Resource status does not certify application health.',
    '',
    ...CAPABILITY_CONTRACT.limits,
    '',
    'Use --json for scope, owner steps, and evidence for every capability.',
  ].join('\n');
}
