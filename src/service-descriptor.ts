import { inspectApplication } from './project-inspector.js';
import { readApplication } from './project-state.js';
import type { ServiceDescriptor, ServiceKind } from './service-model.js';
import type { ProjectInspection } from './inspector-model.js';
const kinds: Record<string, ServiceKind> = {
  D1: 'd1',
  R2: 'r2',
};

export function unboundResourceSelectors(inspection: ProjectInspection): string[] {
  return inspection.cloudflareResources.data
    .filter(
      (resource) =>
        !inspection.configuration.data.bindings.some(
          (binding) =>
            kinds[binding.kind] === resource.kind &&
            (binding.resourceId === resource.id ||
              (resource.kind === 'r2' && binding.resourceId === resource.name)),
        ),
    )
    .map((resource) => `receipt:${resource.kind}:${resource.id}`);
}
export function resolveService(root: string, key: string): ServiceDescriptor {
  const inspection = inspectApplication(root);
  const project = readApplication(root);
  if (
    !project.accountId ||
    inspection.targets.state !== 'available' ||
    inspection.configuration.state !== 'available'
  )
    throw new Error('Validated service configuration and a connected account are required.');
  const target = inspection.targets.data.find(
    (item) =>
      key === `target:${item.provider}:${item.id}` && item.provider === 'cloudflare' && !item.error,
  );
  if (target) {
    const configured = project.targets.find((item) => item.directory === target.application);
    if (!configured) throw new Error('Service target identity changed.');
    return {
      key,
      kind: 'worker',
      id: configured.workerName,
      name: configured.workerName,
      accountId: project.accountId,
      projectId: project.id,
      applications: [target.application],
      ownership: 'unknown',
    };
  }
  const binding = inspection.configuration.data.bindings.find(
    (item) => key === `binding:${item.application}:${item.kind}:${item.name}`,
  );
  const record = inspection.cloudflareResources.data.find(
    (item) => key === `receipt:${item.kind}:${item.id}`,
  );
  const kind = binding ? kinds[binding.kind] : (record?.kind as ServiceKind);
  const id = binding?.resourceId ?? record?.id;
  if (!kind || !['d1', 'r2'].includes(kind) || !id || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,254}$/.test(id))
    throw new Error('This service has no supported provider resource identity.');
  const receipt =
    record ??
    inspection.cloudflareResources.data.find(
      (item) => item.kind === kind && (item.id === id || (kind === 'r2' && item.name === id)),
    );
  const references = inspection.configuration.data.bindings.filter(
    (item) =>
      kinds[item.kind] === kind &&
      (item.resourceId === id ||
        (receipt && [receipt.name, receipt.id].includes(item.resourceId ?? ''))),
  );
  return {
    key,
    kind,
    id: receipt?.id ?? id,
    name: receipt?.name ?? (kind === 'r2' ? id : null),
    accountId: project.accountId,
    projectId: project.id,
    applications: [...new Set(references.map((item) => item.application))].sort(),
    ownership:
      inspection.cloudflareResources.state === 'available' &&
      (receipt?.createdByProject === true || receipt?.reused === false)
        ? 'created'
        : receipt?.reused === true
          ? 'reused'
          : 'unknown',
  };
}
export function serviceCapabilities(kind: ServiceKind) {
  return {
    status: true,
    metrics: kind === 'd1' || kind === 'worker',
    data: kind === 'd1' || kind === 'r2',
    delete: kind === 'd1',
  };
}
