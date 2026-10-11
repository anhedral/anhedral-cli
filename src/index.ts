export {
  STANDARD_PRODUCTS,
  STANDARD_USAGE,
  parseStandardOptions,
  scaffoldStandardProject,
} from './standard.js';
export type { StandardOptions, StandardProduct, StandardRunner } from './standard.js';
export { GENERATOR_VERSION } from './version.js';
export { CAPABILITIES, CAPABILITY_REGISTRY, createSetupPlan } from './capabilities.js';
export type { Capability } from './capabilities.js';
export { inspectProject, validateSetupPlan } from './readiness.js';
export {
  registerApplication,
  readApplication,
  connectApplication,
  planDelivery,
  shipApplication,
  applicationStatus,
  verifyApplication,
  rollbackApplication,
  recoverApplication,
} from './delivery.js';
export type { ApplicationProject, DeploymentTarget, DeliveryRunner } from './delivery.js';
export { planProvisioning, provisionApplication } from './provision.js';

export {
  registerVercelApplication,
  connectVercelApplication,
  planVercelDelivery,
  shipVercelApplication,
  vercelApplicationStatus,
  verifyVercelApplication,
  rollbackVercelApplication,
  adoptVercelApplication,
  recoverVercelApplication,
} from './vercel.js';

export { setupRepository, githubRepository } from './repository.js';

export { inspectProviderReadiness } from './provider-readiness.js';

export {
  registerManagedApplication,
  stageManagedVersion,
  saveManagedVersion,
  deployManagedVersion,
  managedApplicationStatus,
} from './managed-hosting.js';

export { STACK_REGISTRY, STACK_ITEMS, getStackItem } from './stack-registry.js';
export type { StackItemId } from './stack-registry.js';
export type { StackRegistryItem } from './registry/types.js';
export { inspectWorkspaceGraph } from './workspace-graph.js';
export { resolveStackRegistry } from './registry/resolve.js';
export type { ResolvedStackRegistry } from './registry/resolve.js';
export { addStackItems } from './registry/add.js';
export type { AddRequest } from './registry/add.js';
