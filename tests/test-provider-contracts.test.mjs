import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  validateProviderConfiguration,
  providerConfigurationTemplate,
  providerRequirements,
} from '../dist/providers/config.js';
import { PROVIDER_DEFINITIONS, INTEGRATION_PROVIDERS } from '../dist/providers/definitions.js';
import { PROVIDER_CONFIGURATION_SCHEMA } from '../dist/providers/schema.js';
import { CREDENTIALS } from '../dist/providers/api.js';

for (const provider of INTEGRATION_PROVIDERS) {
  test(`${provider}: template and editor schema use the same supported fields`, () => {
    const config = providerConfigurationTemplate([provider], 'example-app');
    validateProviderConfiguration(config, [provider]);
    const fields =
      PROVIDER_CONFIGURATION_SCHEMA.properties.providers.properties[provider].properties;
    assert.deepEqual(Object.keys(fields), Object.keys(PROVIDER_DEFINITIONS[provider].fields));
    for (const [key, value] of Object.entries(config.providers[provider])) {
      if (fields[key].enum) assert.ok(fields[key].enum.includes(value));
      if (fields[key].pattern) assert.match(value, new RegExp(fields[key].pattern));
    }
    assert.equal(CREDENTIALS[provider], PROVIDER_DEFINITIONS[provider].credential);
    assert.ok(PROVIDER_DEFINITIONS[provider].ownerSteps.length);
    assert.equal(
      providerRequirements(provider, config.providers[provider]).every(
        (field) => typeof field === 'string',
      ),
      true,
    );
  });
}
for (const [provider, fields] of [
  ['clerk', { environment: 'preview' }],
  ['stripe', { mode: 'production' }],
  ['posthog', { region: 'auto' }],
  ['stripe', { webhookEvents: ['event.created', 'event.created'] }],
  ['neon', { applicationId: 'foreign' }],
  ['neon', JSON.parse('{"__proto__":"foreign"}')],
  ['neon', { constructor: 'foreign' }],
  ['openai', { OPENAI_ADMIN_KEY: 'secret' }],
  ['resend', { domainId: 'invalid/path' }],
]) {
  test(`${provider}: rejects malformed or foreign provider fields`, () => {
    assert.throws(
      () => validateProviderConfiguration({ schemaVersion: 1, providers: { [provider]: fields } }),
      /Invalid|Unsupported|unique/,
    );
  });
}
test('schema permits unfinished templates, not unsupported providers or fields', () => {
  assert.equal(PROVIDER_CONFIGURATION_SCHEMA.additionalProperties, false);
  assert.equal(PROVIDER_CONFIGURATION_SCHEMA.properties.providers.additionalProperties, false);
  validateProviderConfiguration({
    schemaVersion: 1,
    providers: { clerk: { environment: '' }, posthog: { region: '' } },
  });
  assert.throws(
    () => validateProviderConfiguration({ schemaVersion: 1, providers: { neon: {} } }, []),
    /unselected/,
  );
});
for (const webhookUrl of [
  'https://example.com/hook',
  'https://example.com:443/hook',
  'https://example.com/',
]) {
  test(`schema and runtime accept safe webhook URL ${webhookUrl}`, () => {
    validateProviderConfiguration({ schemaVersion: 1, providers: { stripe: { webhookUrl } } });
    assert.match(
      webhookUrl,
      new RegExp(
        PROVIDER_CONFIGURATION_SCHEMA.properties.providers.properties.stripe.properties.webhookUrl
          .pattern,
      ),
    );
  });
}
for (const webhookUrl of [
  'https://example.com\\hook',
  'https://example.com/hook?q=secret',
  'https://name:pass@example.com/hook',
  'https:// example.com/hook',
]) {
  test(`schema and runtime reject unsafe webhook URL ${webhookUrl}`, () => {
    assert.throws(
      () =>
        validateProviderConfiguration({ schemaVersion: 1, providers: { stripe: { webhookUrl } } }),
      /Webhook/,
    );
    assert.doesNotMatch(
      webhookUrl,
      new RegExp(
        PROVIDER_CONFIGURATION_SCHEMA.properties.providers.properties.stripe.properties.webhookUrl
          .pattern,
      ),
    );
  });
}
