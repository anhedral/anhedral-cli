import {
  PROVIDER_DEFINITIONS,
  PROVIDER_EVENT_PATTERN,
  PROVIDER_IDENTITY_PATTERN,
  PROVIDER_TEXT_PATTERN,
  PROVIDER_WEBHOOK_PATTERN,
  type ProviderFieldDefinition,
} from './definitions.js';

function fieldSchema(field: ProviderFieldDefinition): Record<string, unknown> {
  if (field.kind === 'events')
    return {
      type: 'array',
      minItems: 1,
      maxItems: 100,
      uniqueItems: true,
      items: { type: 'string', pattern: PROVIDER_EVENT_PATTERN },
    };
  return {
    type: 'string',
    maxLength: 255,
    ...(field.choices
      ? { enum: field.choices }
      : {
          pattern:
            field.kind === 'identity'
              ? PROVIDER_IDENTITY_PATTERN
              : field.kind === 'https-url'
                ? PROVIDER_WEBHOOK_PATTERN
                : PROVIDER_TEXT_PATTERN,
        }),
  };
}

/** Editor schema validates syntax; selected-stack and provisioning readiness checks
 * remain application rules, since templates deliberately contain empty choices. */
export const PROVIDER_CONFIGURATION_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  title: 'Anhedral provider configuration',
  description: 'Nonsecret resource choices. Supply credentials through the environment.',
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'providers'],
  properties: {
    schemaVersion: { const: 1 },
    providers: {
      type: 'object',
      additionalProperties: false,
      properties: Object.fromEntries(
        Object.entries(PROVIDER_DEFINITIONS).map(([id, definition]) => [
          id,
          {
            type: 'object',
            additionalProperties: false,
            properties: Object.fromEntries(
              Object.entries(definition.fields).map(([key, field]) => [key, fieldSchema(field)]),
            ),
          },
        ]),
      ),
    },
  },
} as const;
