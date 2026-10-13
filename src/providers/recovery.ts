import path from 'node:path';
import { existsSync, realpathSync } from 'node:fs';
import { defaultRunner, withApplicationLock, type DeliveryRunner } from '../project-state.js';
import { providerApi, resourceId, digest } from './api.js';
import {
  providerConfiguration,
  selectedIntegrations,
  INTEGRATION_PROVIDERS,
  type IntegrationProvider,
} from './config.js';
import { privateStateDirectory, ProvisioningState, readProviderStateStatus } from './state.js';

export function integrationStatus(root: string) {
  root = realpathSync(root);
  return { ...readProviderStateStatus(path.join(root, '.anhedral')), mutation: false };
}
export interface IntegrationRecoveryRequest {
  provider: IntegrationProvider;
  operation: string;
  resourceId: string;
}
/** Explicitly reconcile a verified resource; never recreate or delete it. Local
 * receipt writes are authorized by this action, provider calls remain read-only. */
export async function recoverIntegrationResource(
  root: string,
  request: IntegrationRecoveryRequest,
  run: DeliveryRunner = defaultRunner,
  send: typeof fetch = fetch,
  environment: NodeJS.ProcessEnv = process.env,
) {
  root = realpathSync(root);
  if (
    !INTEGRATION_PROVIDERS.includes(request.provider) ||
    !/^[a-f0-9]{64}$/.test(request.operation)
  )
    throw new Error('Select a supported provider and an exact pending operation hash.');
  const id = resourceId(request.resourceId);
  if (!selectedIntegrations(root).includes(request.provider))
    throw new Error('Recovery requires a selected provider.');
  const configuration = providerConfiguration(root);
  const settings = configuration.providers[request.provider] ?? {};
  const fingerprint = digest(configuration);
  if (!existsSync(path.join(root, '.anhedral/providers.json')))
    throw new Error('There is no pending provider journal to reconcile.');
  const directory = await privateStateDirectory(root, run);
  return withApplicationLock(root, async () => {
    const state = new ProvisioningState(directory);
    return state.recoverResource(
      request.provider,
      request.operation,
      id,
      settings,
      providerApi(request.provider, settings, environment, send),
      () => {
        if (digest(providerConfiguration(root)) !== fingerprint)
          throw new Error(
            'Provider configuration changed during recovery; no completion receipt was written.',
          );
      },
    );
  });
}
