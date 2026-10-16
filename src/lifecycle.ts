import path from 'node:path';
import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from './bounded-file.js';
import { atomicJson, withApplicationLock, type DeliveryRunner } from './project-state.js';

import { isLifecycleOperation, type LifecycleOperation } from './lifecycle-model.js';
export type { LifecycleOperation, OperationState, PhaseState } from './lifecycle-model.js';

export interface LifecycleSession {
  phase<T>(name: string, action: () => Promise<T>): Promise<T>;
}

/** A nonsecret record of execution; a completed phase is not product acceptance. */
export function readLifecycleOperation(root: string): LifecycleOperation | null {
  root = realpathSync(root);
  const file = path.join(root, '.anhedral/operation.json');
  if (!existsSync(file)) return null;
  if (
    realpathSync(path.dirname(file)) !== path.join(root, '.anhedral') ||
    lstatSync(file).isSymbolicLink()
  )
    throw new Error('Invalid lifecycle state location.');
  let value: unknown;
  try {
    value = JSON.parse(readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8'));
  } catch {
    throw new Error('Invalid lifecycle state.');
  }
  if (!isLifecycleOperation(value)) throw new Error('Invalid lifecycle state.');
  return value;
}

export async function withLifecycleOperation<T>(
  root: string,
  target: LifecycleOperation['target'],
  run: DeliveryRunner,
  action: (session: LifecycleSession) => Promise<T>,
): Promise<T & { operation: LifecycleOperation }> {
  root = realpathSync(root);
  const env = { ...process.env, CI: '1', NO_COLOR: '1' };
  const relative = '.anhedral/operation.json';
  if (
    (await run('git', ['ls-files', '--', relative], root, env)).trim() ||
    (await run('git', ['check-ignore', '--no-index', '--', relative], root, env)).trim() !==
      relative
  )
    throw new Error('Ignore .anhedral/ before recording a shipping operation.');
  return withApplicationLock(root, async () => {
    readLifecycleOperation(root);
    const now = new Date().toISOString();
    const operation: LifecycleOperation = {
      schemaVersion: 1,
      id: randomUUID(),
      target,
      state: 'running',
      startedAt: now,
      updatedAt: now,
      phases: [],
    };
    const save = () => {
      operation.updatedAt = new Date().toISOString();
      atomicJson(path.join(root, relative), operation);
    };
    save();
    const session: LifecycleSession = {
      async phase(name, task) {
        if (
          !/^[a-z][a-z-]{0,63}$/.test(name) ||
          operation.phases.some((phase) => phase.name === name) ||
          operation.phases.length >= 100
        )
          throw new Error('Invalid or duplicate lifecycle phase.');
        const phase: LifecycleOperation['phases'][number] = { name, state: 'running' };
        operation.phases.push(phase);
        save();
        try {
          const result = await task();
          phase.state = 'completed';
          save();
          return result;
        } catch (error) {
          phase.state = 'failed';
          save();
          throw error;
        }
      },
    };
    try {
      const result = await action(session);
      const state =
        result && typeof result === 'object' && 'state' in result ? result.state : undefined;
      operation.state = ['partial', 'failed'].includes(String(state))
        ? 'failed'
        : ['configuration-required', 'provider-configuration-required', 'building'].includes(
              String(state),
            )
          ? 'blocked'
          : 'completed';
      save();
      return Object.assign({}, result, { operation });
    } catch (error) {
      operation.state = 'failed';
      save();
      throw error;
    }
  });
}
