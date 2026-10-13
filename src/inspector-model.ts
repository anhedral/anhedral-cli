import type { LifecycleOperation } from './lifecycle-model.js';

export interface InspectionSection<T> {
  state: 'available' | 'unavailable';
  data: T;
  error?: string;
}
export type DependencyField =
  'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';
export interface WorkspaceEvidence {
  name: string;
  directory: string;
  dependencies: { name: string; kind: DependencyField }[];
}
export interface BindingEvidence {
  application: string;
  name: string;
  kind: string;
  configured: boolean;
  identifierRequired: boolean;
  resourceId: string | null;
}
export interface ReleaseEvidence {
  id: string;
  state: string;
  commit: string;
  recordedAt: string | null;
  url: string | null;
  kind: 'deployment' | 'build';
  operationState?: string;
  platform?: string;
  profile?: string;
  artifact?: string;
}
export interface TargetEvidence {
  id: string;
  provider: 'cloudflare' | 'vercel' | 'expo' | 'desktop' | 'extension';
  application: string;
  audience: 'public' | 'private' | 'unconfigured' | 'not-applicable';
  accountReference: string | null;
  latestAttempt: ReleaseEvidence | null;
  lastSuccessful: ReleaseEvidence | null;
  delivery: 'implemented' | 'artifact-only' | 'scaffold-only';
  liveStatus: 'unknown';
  error?: string;
}
export interface IntegrationEvidence {
  provider: string;
  operations: {
    operation: string;
    status: 'pending' | 'complete';
    resources: Record<string, string>;
    recovery: string;
    kind: string | null;
  }[];
}
export interface ResourceEvidence {
  kind: string;
  name: string;
  id: string;
  reused: boolean | null;
  recordedAt: string | null;
}
/** Browser-safe projection. Read time never substitutes for provider evidence time. */
export interface ProjectInspection {
  schemaVersion: 1;
  name: string;
  inspectedAt: string;
  authentication: { state: 'not-checked' };
  liveStatus: { state: 'unknown' };
  limits: string[];
  selection: InspectionSection<{
    cliVersion: string | null;
    products: string[];
    hosting: 'cloudflare' | 'vercel' | null;
  }>;
  setupProviders: InspectionSection<
    {
      id: string;
      managementCredential: string | null;
      ownerSteps: string[];
      authentication: 'not-checked';
      permissions: 'unknown';
      billing: 'unknown';
    }[]
  >;
  workspaces: InspectionSection<WorkspaceEvidence[]>;
  configuration: InspectionSection<{
    bindings: BindingEvidence[];
    schedules: { application: string; expression: string }[];
    environment: { application: string; name: string }[];
  }>;
  targets: InspectionSection<TargetEvidence[]>;
  integrations: InspectionSection<IntegrationEvidence[]>;
  cloudflareResources: InspectionSection<ResourceEvidence[]>;
  readiness: InspectionSection<{
    localReady: boolean;
    checks: { id: string; ok: boolean; detail: string }[];
  }>;
  operation: InspectionSection<LifecycleOperation | null>;
}
export type ApplicationInspection = ProjectInspection;
