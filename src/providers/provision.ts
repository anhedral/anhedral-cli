import { realpathSync } from 'node:fs';
import { defaultRunner, withApplicationLock, type DeliveryRunner } from '../project-state.js';
import { CREDENTIALS, providerApi, digest } from './api.js';
import { PROVIDER_ADAPTERS } from './adapters.js';
import { providerConfiguration, providerRequirements, selectedIntegrations } from './config.js';
import { privateStateDirectory, ProvisioningState } from './state.js';
import { configureRuntime, type RuntimeValues } from './runtime.js';

export function planProviderProvisioning(root: string) {
  const configuration = providerConfiguration(root);
  const providers = selectedIntegrations(root).map((id) => {
    const settings = configuration.providers[id] ?? {};
    return {
      provider: id,
      settings,
      credential: CREDENTIALS[id],
      missing: providerRequirements(id, settings),
    };
  });
  return {
    schemaVersion: 1,
    providers,
    configured: providers.every((provider) => !provider.missing.length),
    mutation: false,
  };
}

export async function provisionSelectedProviders(
  root: string,
  dryRun = false,
  run: DeliveryRunner = defaultRunner,
  send: typeof fetch = fetch,
  environment: NodeJS.ProcessEnv = process.env,
) {
  root = realpathSync(root);
  const plan = planProviderProvisioning(root);
  const fingerprint = digest(providerConfiguration(root));
  const assertConfiguration = () => {
    if (digest(providerConfiguration(root)) !== fingerprint)
      throw new Error(
        'Provider configuration changed during provisioning; inspect recorded resources before retrying.',
      );
  };
  if (dryRun || !plan.providers.length)
    return { ...plan, ready: plan.configured, results: [], configuredFiles: [] };
  for (const provider of plan.providers) {
    if (provider.missing.length)
      throw new Error(
        `${provider.provider}: complete anhedral.providers.json (${provider.missing.join(', ')}).`,
      );
    if (!environment[provider.credential])
      throw new Error(`${provider.provider}: supply ${provider.credential} before provisioning.`);
  }
  const directory = await privateStateDirectory(root, run);
  return withApplicationLock(root, async () => {
    const state = new ProvisioningState(directory);
    for (const provider of plan.providers) state.context(provider.provider, provider.settings);
    const results: {
      provider: string;
      resources: Record<string, string>;
      ready: boolean;
      nextActions: string[];
    }[] = [];
    const values: RuntimeValues = {};
    for (const provider of plan.providers) {
      assertConfiguration();
      const response = await PROVIDER_ADAPTERS[provider.provider]({
        id: provider.provider,
        settings: provider.settings,
        state,
        environment,
        api: providerApi(provider.provider, provider.settings, environment, send),
      });
      Object.assign(values, response.runtime);
      results.push({
        provider: provider.provider,
        resources: response.resources,
        ready: response.ready,
        nextActions: response.nextActions,
      });
    }
    assertConfiguration();
    const configuredFiles = await configureRuntime(root, values, run);
    return {
      schemaVersion: 1,
      results,
      ready: results.every((result) => result.ready),
      configuredFiles,
      mutation: true,
    };
  });
}
