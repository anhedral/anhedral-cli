import { resolveStackRegistry } from './registry/resolve.js';
import { BOOTSTRAP_COMMAND } from './registry/bootstrap.js';
import { GENERATOR_VERSION } from './version.js';
import { PACKAGE_MANAGER } from './dependencies.js';
import { STANDARD_PRODUCTS, getStackDefinition } from './stack-registry.js';
import type {
  StandardOptions,
  StandardProduct,
  SetupRequirements,
  StackSelection,
} from './registry/types.js';
export type Capability = SetupRequirements & { selection: StackSelection };
export const CAPABILITIES = Object.fromEntries(
  STANDARD_PRODUCTS.map((id) => {
    const definition = getStackDefinition(id);
    return [id, { ...definition.setup!, selection: definition.selection }];
  }),
) as Record<StandardProduct, Capability>;
export const CAPABILITY_REGISTRY = {
  schemaVersion: 1,
  cliVersion: GENERATOR_VERSION,
  capabilities: CAPABILITIES,
};

const HOSTING_SETUP = {
  cloudflare: {
    tools: ['Wrangler'],
    access: [
      'Client-owned Cloudflare account; account ID; scoped OAuth/API access; service-compatible plan; DNS access only when needed',
    ],
  },
};

export function createSetupPlan(
  options: StandardOptions,
  registry = resolveStackRegistry(options),
) {
  const items = new Map(registry.items.map((item) => [item.name, item]));
  const capabilities = options.products.map((id) => {
    const item = items.get(id)!;
    return {
      id,
      ...item.setup!,
      selection: item.selection,
      status: options.dryRun ? ('planned' as const) : ('starter' as const),
    };
  });
  const providers = [
    ...new Set<StandardOptions['hosting']>([
      ...capabilities.flatMap(({ tools }) =>
        tools.includes('Wrangler') ? ['cloudflare' as const] : [],
      ),
    ]),
  ].map(() => HOSTING_SETUP.cloudflare);
  return {
    schemaVersion: 1,
    cliVersion: GENERATOR_VERSION,
    registryVersion: CAPABILITY_REGISTRY.schemaVersion,
    standard: 'anhedral-application-stack',
    root: options.root,
    name: options.name,
    products: options.products,
    hosting: options.hosting,
    registry,
    bootstrap: [...BOOTSTRAP_COMMAND],
    dryRun: options.dryRun,
    setup: {
      tools: [
        ...new Set([
          'Git',
          'Node.js 22.13+ on 22.x, or Node.js 24+ for generated workspaces',
          PACKAGE_MANAGER.replace('@', ' '),
          'GitHub integration or gh',
          'Fallow',
          'Cloudflare security audit skill',
          ...providers.flatMap((provider) => provider.tools),
          ...capabilities.flatMap((item) => item.tools),
        ]),
      ],
      access: [
        'User-owned GitHub repository and CI access',
        ...providers.flatMap((provider) => provider.access),
      ],
      capabilities,
      completion: [
        'Guide GitHub authentication, own local Git checkout, reviewed initial commit and private user-owned remote; verify the selected deployment source connection',
        'Discover available plugins and fallbacks; verify the selected account and scope',
        'Configure separate environments, bindings and server-side secrets',
        'Implement starter behavior and meaningful tests',
        'Run pnpm check plus platform/provider verification',
        'Verify deployed preview; obtain required production authorization; record rollback and operating ownership',
      ],
      resourcesProvisioned: false,
    },
  };
}
