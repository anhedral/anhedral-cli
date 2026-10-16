import path from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { existsSync, lstatSync, mkdirSync, realpathSync } from 'node:fs';
import { readBoundedFile, MAX_PROJECT_JSON_BYTES } from '../bounded-file.js';
import { atomicJson, type DeliveryRunner } from '../project-state.js';
import { digest, object, ProviderRequestError, type ApiObject, type ApiRequest } from './api.js';
import { verifyRecoveredResource } from './recovery-verification.js';
import {
  splitReceipt,
  validReceipt,
  validCredentials,
  restoreReceipt,
  type CredentialField,
  type OperationCredentials,
  type MinimalReceipt,
} from './receipts.js';
import {
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
  type ProviderSettings,
} from './config.js';

export interface OperationDescriptor {
  key: string;
  route: string;
}
function validDescriptor(value: unknown): value is OperationDescriptor {
  return (
    record(value) &&
    Object.keys(value).every((key) => ['key', 'route'].includes(key)) &&
    typeof value.key === 'string' &&
    /^(project|application|domain|web-app|ios-app|android-app|sending-key|webhook|service-account|client-key)$/.test(
      value.key,
    ) &&
    typeof value.route === 'string' &&
    value.route.length <= 1024 &&
    /^\/[a-zA-Z0-9_/-]+$/.test(value.route) &&
    !value.route.includes('//')
  );
}
interface Operation {
  status: 'pending' | 'complete';
  value?: MinimalReceipt;
  credentialFields?: CredentialField[];
  descriptor: OperationDescriptor;
}
interface ProviderState {
  config: string;
  operations: Record<string, Operation>;
}
interface State {
  schemaVersion: 2;
  providers: Partial<Record<IntegrationProvider, ProviderState>>;
}

function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/** Validate saved operations before trusting their replay protection or resource values. */
function validState(value: unknown): value is State {
  if (
    !record(value) ||
    value.schemaVersion !== 2 ||
    Object.keys(value).some((key) => !['schemaVersion', 'providers'].includes(key)) ||
    !record(value.providers)
  )
    return false;
  return Object.entries(value.providers).every(([id, provider]) => {
    if (
      !INTEGRATION_PROVIDERS.includes(id as IntegrationProvider) ||
      !record(provider) ||
      Object.keys(provider).some((key) => !['config', 'operations'].includes(key)) ||
      typeof provider.config !== 'string' ||
      !/^[a-f0-9]{64}$/.test(provider.config) ||
      !record(provider.operations)
    )
      return false;
    return Object.entries(provider.operations).every(([key, operation]) => {
      if (
        !/^[a-f0-9]{64}$/.test(key) ||
        !record(operation) ||
        Object.keys(operation).some(
          (field) => !['status', 'value', 'credentialFields', 'descriptor'].includes(field),
        )
      )
        return false;
      if (!validDescriptor(operation.descriptor)) return false;
      if (operation.status === 'pending')
        return !Object.hasOwn(operation, 'value') && !Object.hasOwn(operation, 'credentialFields');
      if (operation.status !== 'complete' || !record(operation.value)) return false;
      return (
        validReceipt(id as IntegrationProvider, operation.value) &&
        (operation.credentialFields === undefined ||
          (Array.isArray(operation.credentialFields) &&
            new Set(operation.credentialFields).size === operation.credentialFields.length &&
            operation.credentialFields.every(
              (field) =>
                typeof field === 'string' &&
                validCredentials(id as IntegrationProvider, { [field]: 'validation-placeholder' }),
            )))
      );
    });
  });
}

export async function privateStateDirectory(root: string, run: DeliveryRunner): Promise<string> {
  root = realpathSync(root);
  const directory = path.join(root, '.anhedral');
  if (
    existsSync(directory) &&
    (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory())
  )
    throw new Error('Provider state directory must be a regular directory.');
  const environment = { ...process.env, CI: '1', NO_COLOR: '1' };
  if (
    realpathSync((await run('git', ['rev-parse', '--show-toplevel'], root, environment)).trim()) !==
    root
  )
    throw new Error('Provider configuration requires its own application repository.');
  for (const file of [
    '.anhedral/providers.json',
    '.anhedral/provider-credentials.json',
    '.anhedral/runtime.json',
  ]) {
    if ((await run('git', ['ls-files', '--', file], root, environment)).trim())
      throw new Error('Provider state must not be tracked.');
    if (
      (await run('git', ['check-ignore', '--no-index', '--', file], root, environment)).trim() !==
      file
    )
      throw new Error('Ignore .anhedral/ before provisioning providers.');
  }
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  if (realpathSync(directory) !== directory)
    throw new Error('Provider state directory escapes the project.');
  return directory;
}

interface CredentialsState {
  schemaVersion: 1;
  providers: Partial<Record<IntegrationProvider, Record<string, OperationCredentials>>>;
}
function validCredentialsState(value: unknown): value is CredentialsState {
  return (
    record(value) &&
    value.schemaVersion === 1 &&
    !Object.keys(value).some((key) => !['schemaVersion', 'providers'].includes(key)) &&
    record(value.providers) &&
    Object.entries(value.providers).every(
      ([id, operations]) =>
        INTEGRATION_PROVIDERS.includes(id as IntegrationProvider) &&
        record(operations) &&
        Object.entries(operations).every(
          ([key, entries]) =>
            /^[a-f0-9]{64}$/.test(key) && validCredentials(id as IntegrationProvider, entries),
        ),
    )
  );
}
function privateJson(file: string): unknown {
  const stat = lstatSync(file);
  if (!stat.isFile() || stat.isSymbolicLink())
    throw new Error('Provider state must be a regular private file.');
  if (process.platform !== 'win32' && stat.mode & 0o077)
    throw new Error('Provider state contains credentials; restrict its permissions to 0600.');
  try {
    return JSON.parse(readBoundedFile(file, MAX_PROJECT_JSON_BYTES).toString('utf8'));
  } catch {
    throw new Error('Invalid provider state.');
  }
}

export function readProviderStateStatus(directory: string) {
  const file = path.join(directory, 'providers.json');
  if (!existsSync(file)) return { schemaVersion: 2, providers: [] };
  if (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory())
    throw new Error('Provider state directory must be a regular private directory.');
  const state = privateJson(file);
  if (!validState(state)) throw new Error('Invalid provider state.');
  return {
    schemaVersion: 2,
    providers: Object.entries(state.providers).map(([id, provider]) => ({
      provider: id,
      operations: Object.entries(provider.operations).map(([operation, saved]) => ({
        operation,
        status: saved.status,
        ...(saved.value ? { resources: saved.value } : {}),
        descriptor: saved.descriptor,
        recovery: ['sending-key', 'webhook', 'service-account'].includes(saved.descriptor.key)
          ? 'requires-one-time-credential'
          : ['project', 'application', 'domain', 'web-app', 'ios-app', 'android-app'].includes(
                saved.descriptor.key,
              )
            ? 'verified-resource'
            : 'unsupported-operation',
      })),
    })),
  };
}

/** Store credentials before completing a minimal receipt. A crash leaves a pending
 * operation, never permission to replay a provider mutation with an unknown outcome. */
export class ProvisioningState {
  private readonly file: string;
  private readonly credentialsFile: string;
  private readonly state: State;
  private readonly credentials: CredentialsState;
  constructor(
    directory: string,
    private readonly write: typeof atomicJson = atomicJson,
  ) {
    if (lstatSync(directory).isSymbolicLink() || !lstatSync(directory).isDirectory())
      throw new Error('Provider state directory must be a regular private directory.');
    directory = realpathSync(directory);
    this.file = path.join(directory, 'providers.json');
    this.credentialsFile = path.join(directory, 'provider-credentials.json');
    const credentials = existsSync(this.credentialsFile)
      ? privateJson(this.credentialsFile)
      : { schemaVersion: 1, providers: {} };
    if (!validCredentialsState(credentials)) throw new Error('Invalid provider credential state.');
    this.credentials = credentials;
    const state = existsSync(this.file)
      ? privateJson(this.file)
      : { schemaVersion: 2, providers: {} };
    if (!validState(state)) throw new Error('Invalid provider state.');
    this.state = state;
    this.assertCredentials();
  }
  private assertCredentials(): void {
    for (const [id, provider] of Object.entries(this.state.providers)) {
      for (const [operation, saved] of Object.entries(provider.operations)) {
        const credentials =
          this.credentials.providers[id as IntegrationProvider]?.[operation] ?? {};
        if (saved.credentialFields?.some((field) => !credentials[field]))
          throw new Error(
            'Provider creation credentials are missing. Restore private state before retrying.',
          );
      }
    }
  }
  private retainCredentials(
    id: IntegrationProvider,
    operation: string,
    entries: OperationCredentials,
  ): void {
    if (!Object.keys(entries).length) return;
    const provider = (this.credentials.providers[id] ??= {});
    const previous = provider[operation];
    // Compare the private credential records directly; credential values must not
    // flow through the SHA-256 helper used for public operation fingerprints.
    if (previous && !isDeepStrictEqual(previous, entries))
      throw new Error('Provider credential state conflicts with the saved creation result.');
    provider[operation] = entries;
  }
  /** No configurations, credentials, provider payloads or mutation bodies in status. */
  status() {
    return {
      schemaVersion: 2,
      providers: Object.entries(this.state.providers).map(([id, provider]) => ({
        provider: id,
        operations: Object.entries(provider.operations).map(([operation, saved]) => ({
          operation,
          status: saved.status,
          resources: saved.value ?? {},
        })),
      })),
    };
  }

  context(id: IntegrationProvider, settings: ProviderSettings): void {
    const hash = digest(settings);
    const saved = this.state.providers[id];
    if (saved && saved.config !== hash)
      throw new Error(
        `${id}: desired configuration changed. Reconcile saved resource IDs before changing provider state.`,
      );
    if (!saved) this.state.providers[id] = { config: hash, operations: {} };
  }
  async recoverResource(
    id: IntegrationProvider,
    operation: string,
    resource: string,
    settings: ProviderSettings,
    api: ApiRequest,
    beforeCommit: () => void = () => {},
  ) {
    this.context(id, settings);
    const provider = this.state.providers[id]!;
    const saved = provider.operations[operation];
    if (!saved || saved.status !== 'pending')
      throw new Error(
        'Only an explicitly identified pending provider operation can be reconciled.',
      );
    const receipt = await verifyRecoveredResource(id, saved.descriptor, resource, settings, api);
    beforeCommit();
    const complete: Operation = {
      status: 'complete',
      descriptor: saved.descriptor,
      value: receipt,
    };
    provider.operations[operation] = complete;
    try {
      this.write(this.file, this.state);
    } catch (error) {
      provider.operations[operation] = saved;
      throw error;
    }
    return {
      provider: id,
      operation,
      status: 'complete',
      resources: receipt,
      mutation: 'local-receipt-only',
    };
  }
  async create(
    id: IntegrationProvider,
    key: string,
    api: ApiRequest,
    route: string,
    body: ApiObject,
  ): Promise<ApiObject> {
    const state = this.state.providers[id];
    if (!state) throw new Error('Select a provider configuration before creating resources.');
    const operation = digest({ key, route, body });
    const saved = state.operations[operation];
    if (saved?.status === 'complete')
      return restoreReceipt(saved.value!, this.credentials.providers[id]?.[operation] ?? {});
    if (saved)
      throw new Error(
        `${id}: interrupted ${key} creation has an unknown outcome. Inspect the provider and reconcile the saved operation before retrying.`,
      );
    const descriptor = { key, route };
    if (!validDescriptor(descriptor)) throw new Error('Unsupported provider operation descriptor.');
    state.operations[operation] = { status: 'pending', descriptor };
    this.write(this.file, this.state);
    let value: ApiObject;
    try {
      value = object(await api(route, 'POST', body, operation));
    } catch (error) {
      if (error instanceof ProviderRequestError && error.rejected) {
        delete state.operations[operation];
        this.write(this.file, this.state);
      }
      throw error;
    }
    const { receipt, credentials } = splitReceipt(id, value);
    const expected =
      id === 'resend' && key === 'sending-key'
        ? 'token'
        : id === 'stripe' && key === 'webhook'
          ? 'secret'
          : id === 'openai' && key === 'service-account'
            ? 'api_key'
            : undefined;
    if (expected && !credentials[expected])
      throw new Error(
        'Provider omitted the one-time creation credential. Inspect the pending operation before retrying.',
      );
    this.retainCredentials(id, operation, credentials);
    if (Object.keys(credentials).length) this.write(this.credentialsFile, this.credentials);
    state.operations[operation] = {
      status: 'complete',
      descriptor,
      value: receipt,
      ...(Object.keys(credentials).length
        ? { credentialFields: Object.keys(credentials) as CredentialField[] }
        : {}),
    };
    try {
      this.write(this.file, this.state);
    } catch (error) {
      state.operations[operation] = { status: 'pending', descriptor };
      throw error;
    }
    return restoreReceipt(receipt, credentials);
  }
}
