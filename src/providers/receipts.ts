import { object, resourceId, text, type ApiObject } from './api.js';
import type { IntegrationProvider } from './config.js';

export type CredentialField = 'token' | 'secret' | 'api_key';
export type OperationCredentials = Partial<Record<CredentialField, string>>;
export interface MinimalReceipt {
  id?: string | number;
  application_id?: string | number;
  project?: { id: string | number };
}
const allowedCredentials: Partial<Record<IntegrationProvider, CredentialField>> = {
  resend: 'token',
  stripe: 'secret',
  openai: 'api_key',
};
function identity(value: unknown): string | number {
  resourceId(value);
  return value as string | number;
}

/** Keep only identities required for adapter retries and separately retain supported
 * one-time credentials. Provider responses often include unrelated secrets or metadata. */
export function splitReceipt(id: IntegrationProvider, value: unknown) {
  const response = object(value);
  const receipt: MinimalReceipt = {};
  if (Object.hasOwn(response, 'id')) receipt.id = identity(response.id);
  if (id === 'neon' && Object.hasOwn(response, 'project'))
    receipt.project = { id: identity(object(response.project).id) };
  if (id === 'clerk' && Object.hasOwn(response, 'application_id'))
    receipt.application_id = identity(response.application_id);
  if (!Object.keys(receipt).length) throw new Error('Provider returned no creation identity.');
  const credentials: OperationCredentials = {};
  const field = allowedCredentials[id];
  if (field && Object.hasOwn(response, field))
    credentials[field] = text(
      field === 'api_key' ? object(response.api_key).value : response[field],
    );
  return { receipt, credentials };
}

export function validReceipt(id: IntegrationProvider, value: unknown): value is MinimalReceipt {
  try {
    const response = object(value);
    const allowed = [
      'id',
      ...(id === 'neon' ? ['project'] : []),
      ...(id === 'clerk' ? ['application_id'] : []),
    ];
    if (Object.keys(response).some((key) => !allowed.includes(key))) return false;
    if (response.project && Object.keys(object(response.project)).some((key) => key !== 'id'))
      return false;
    splitReceipt(id, response);
    return true;
  } catch {
    return false;
  }
}

export function validCredentials(
  id: IntegrationProvider,
  value: unknown,
): value is OperationCredentials {
  try {
    const credentials = object(value);
    const allowed = allowedCredentials[id];
    return Object.entries(credentials).every(
      ([field, value]) => field === allowed && text(value) === value,
    );
  } catch {
    return false;
  }
}

export function restoreReceipt(
  receipt: MinimalReceipt,
  credentials: OperationCredentials,
): ApiObject {
  return {
    ...receipt,
    ...(credentials.token ? { token: credentials.token } : {}),
    ...(credentials.secret ? { secret: credentials.secret } : {}),
    ...(credentials.api_key ? { api_key: { value: credentials.api_key } } : {}),
  };
}
