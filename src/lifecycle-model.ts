export type OperationState = 'running' | 'blocked' | 'completed' | 'failed';
export type PhaseState = 'running' | 'completed' | 'failed';
export interface LifecycleOperation {
  schemaVersion: 1;
  id: string;
  target: 'cloudflare' | 'mobile';
  state: OperationState;
  startedAt: string;
  updatedAt: string;
  phases: { name: string; state: PhaseState }[];
}

export function isLifecycleOperation(value: unknown): value is LifecycleOperation {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const operation = value as LifecycleOperation;
  return (
    operation.schemaVersion === 1 &&
    typeof operation.id === 'string' &&
    /^[a-f0-9-]{36}$/.test(operation.id) &&
    ['cloudflare', 'mobile'].includes(operation.target) &&
    ['running', 'blocked', 'completed', 'failed'].includes(operation.state) &&
    [operation.startedAt, operation.updatedAt].every(
      (date) => typeof date === 'string' && Number.isFinite(Date.parse(date)),
    ) &&
    Array.isArray(operation.phases) &&
    operation.phases.length <= 100 &&
    operation.phases.every(
      (phase) =>
        phase &&
        typeof phase.name === 'string' &&
        /^[a-z][a-z-]{0,63}$/.test(phase.name) &&
        ['running', 'completed', 'failed'].includes(phase.state),
    ) &&
    new Set(operation.phases.map((phase) => phase.name)).size === operation.phases.length &&
    Object.keys(operation).every((key) =>
      ['schemaVersion', 'id', 'target', 'state', 'startedAt', 'updatedAt', 'phases'].includes(key),
    ) &&
    operation.phases.every((phase) =>
      Object.keys(phase).every((key) => ['name', 'state'].includes(key)),
    )
  );
}
