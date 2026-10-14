import registry from '../../plugins/anhedral/skills/anhedral/references/stack-registry.json';
import type { ProjectInspection } from '../../src/inspector-model.ts';

export type ServiceGroup = 'Applications' | 'Resources' | 'Integrations';
export interface ServiceEntry {
  id: string;
  name: string;
  group: ServiceGroup;
  provider: string;
  kind: string;
  applications: string[];
  resourceId: string | null;
  status: 'Declared' | 'Configured' | 'Recorded' | 'Pending' | 'Unavailable';
  recordedAt: string | null;
  url: string | null;
  ownership: 'created' | 'reused' | 'unknown';
  notes: string[];
}
export interface ServiceInventory {
  entries: ServiceEntry[];
  capabilities: { name: string; description: string }[];
  errors: string[];
  inspectedAt: string;
}
const resourceKinds: Record<string, string> = {
  D1: 'd1',
  R2: 'r2',
  KV: 'kv',
  'Queue producer': 'queue',
  'Queue consumer': 'queue',
  'Basin stream': 'stream',
};
/** Project-scoped inventory of validated evidence, never inferred live state. */
export function serviceInventory(inspection: ProjectInspection): ServiceInventory {
  const entries: ServiceEntry[] = [];
  const errors = [
    inspection.targets,
    inspection.configuration,
    inspection.cloudflareResources,
    inspection.integrations,
    inspection.setupProviders,
    inspection.selection,
  ]
    .filter((section) => section.state === 'unavailable')
    .map((section) => section.error ?? 'Some service evidence is unavailable.');
  for (const target of inspection.targets.data) {
    const release = target.lastSuccessful;
    entries.push({
      id: `target:${target.provider}:${target.id}`,
      name: target.application.split('/').at(-1) ?? target.id,
      group: 'Applications',
      provider: target.provider,
      kind: target.delivery === 'artifact-only' ? 'Build target' : 'Application target',
      applications: [target.application],
      resourceId: null,
      status: target.error ? 'Unavailable' : release ? 'Recorded' : 'Declared',
      recordedAt: release?.recordedAt ?? null,
      url: release?.url ?? null,
      ownership: 'unknown',
      notes: [
        ...(target.error ? [target.error] : []),
        `Audience: ${target.audience}`,
        ...(release ? [`Last successful ${release.kind}: ${release.id}`] : []),
        ...(target.latestAttempt && target.latestAttempt.id !== release?.id
          ? [`Latest attempt: ${target.latestAttempt.state}`]
          : []),
        'Current provider health is not checked.',
      ],
    });
  }
  const receipts = inspection.cloudflareResources.data;
  const matched = new Set<number>();
  for (const binding of inspection.configuration.data.bindings) {
    // Match both the resource kind and identifier. Similar names are not proof
    // that a receipt belongs to this binding or application.
    const index =
      binding.resourceId === null
        ? -1
        : receipts.findIndex(
            (receipt) =>
              receipt.kind.toLowerCase() === resourceKinds[binding.kind] &&
              (receipt.id === binding.resourceId ||
                (['R2', 'Queue producer', 'Queue consumer'].includes(binding.kind) &&
                  receipt.name === binding.resourceId)),
          );
    const receipt = index < 0 ? undefined : receipts[index];
    if (index >= 0) matched.add(index);
    entries.push({
      id: `binding:${binding.application}:${binding.kind}:${binding.name}`,
      name: binding.name,
      group: 'Resources',
      provider: 'cloudflare',
      kind: binding.kind,
      applications: [binding.application],
      resourceId: binding.resourceId,
      status: receipt ? 'Recorded' : binding.configured ? 'Configured' : 'Declared',
      recordedAt: receipt?.recordedAt ?? null,
      url: null,
      ownership:
        receipt?.reused === true ? 'reused' : receipt?.reused === false ? 'created' : 'unknown',
      notes: [
        receipt
          ? 'Provisioning receipt recorded; resource existence is not checked.'
          : 'Source declaration only; resource existence is not checked.',
      ],
    });
  }
  receipts.forEach((receipt, index) => {
    if (matched.has(index)) return;
    entries.push({
      id: `receipt:${receipt.kind}:${receipt.id}`,
      name: receipt.name,
      group: 'Resources',
      provider: 'cloudflare',
      kind: receipt.kind,
      applications: [],
      resourceId: receipt.id,
      status: 'Recorded',
      recordedAt: receipt.recordedAt,
      url: null,
      ownership:
        receipt.reused === true ? 'reused' : receipt.reused === false ? 'created' : 'unknown',
      notes: [
        'Provisioning receipt recorded; no matching source binding was found.',
        'Application association and current resource existence are not checked.',
      ],
    });
  });
  const recordedProviders = new Set<string>();
  for (const integration of inspection.integrations.data) {
    if (integration.operations.length) recordedProviders.add(integration.provider);
    for (const operation of integration.operations) {
      entries.push({
        id: `integration:${integration.provider}:${operation.operation}`,
        name: operation.kind ?? operation.operation,
        group: 'Integrations',
        provider: integration.provider,
        kind: 'Provider operation',
        applications: [],
        resourceId: null,
        status: operation.status === 'pending' ? 'Pending' : 'Recorded',
        recordedAt: null,
        url: null,
        ownership: 'unknown',
        notes: [
          ...Object.entries(operation.resources).map(([kind, id]) => `${kind}: ${id}`),
          `Recovery: ${operation.recovery}`,
          'Receipt only; current provider state and application association are not checked.',
        ],
      });
    }
  }
  for (const provider of inspection.setupProviders.data) {
    if (
      provider.id === 'cloudflare' ||
      provider.id === 'vercel' ||
      provider.id === 'expo' ||
      recordedProviders.has(provider.id)
    )
      continue;
    entries.push({
      id: `provider:${provider.id}`,
      name: provider.id,
      group: 'Integrations',
      provider: provider.id,
      kind: 'Selected provider',
      applications: [],
      resourceId: null,
      status: 'Declared',
      recordedAt: null,
      url: null,
      ownership: 'unknown',
      notes: ['Provider selected; no provisioning receipt recorded.', ...provider.ownerSteps],
    });
  }
  if (entries.length > 2000) {
    entries.length = 2000;
    errors.push('Service inventory exceeds its display limit. Some entries are not shown.');
  }
  const descriptions = new Map(registry.items.map((item) => [item.name, item.description]));
  return {
    entries,
    capabilities: [...new Set(inspection.selection.data.products)].map((name) => ({
      name,
      description: descriptions.get(name) ?? 'Recorded stack option',
    })),
    errors: [...new Set(errors)],
    inspectedAt: inspection.inspectedAt,
  };
}
