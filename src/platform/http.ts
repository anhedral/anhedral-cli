import { z } from 'zod';
import { readSourceBounded } from '../contracts/source-bundle.js';
import { visible } from './output.js';
import { platformFailure as createPlatformFailure, type PlatformFailureCategory } from './state.js';
import type { PlatformRequest } from './types.js';

export function createPlatformRequest({
  command,
  operation,
  origin,
  fetch: fetchRequest,
}: {
  command: string;
  operation?: string;
  origin: string;
  fetch?: typeof fetch;
}): PlatformRequest {
  const platformFailure = (
    message: string,
    category: PlatformFailureCategory = 'context',
    retryable = false,
    nextAction = `Run anhedral ${command} --help.`,
  ) => createPlatformFailure(message, nextAction, category, retryable);
  return async (path: string, method: string, body?: unknown, token?: string, team?: string) => {
    let response: Response;
    try {
      response = await (fetchRequest ?? fetch)(`${origin}/api/cli/v1${path}`, {
        method,
        redirect: 'error',
        signal: AbortSignal.timeout(30000),
        headers: {
          'x-anhedral-cli-protocol': '1',
          ...(body instanceof Uint8Array
            ? { 'content-type': 'application/octet-stream' }
            : { 'content-type': 'application/json' }),
          ...(token ? { authorization: `Bearer ${token}` } : {}),
          ...(team ? { 'x-anhedral-team': team } : {}),
        },
        body:
          body === undefined
            ? undefined
            : body instanceof Uint8Array
              ? Uint8Array.from(body)
              : JSON.stringify(body),
      });
    } catch {
      throw platformFailure(
        command === 'projects' && operation === 'create'
          ? 'Platform request was interrupted. Retry the saved project request without --new to resume.'
          : 'Platform request was interrupted. Retry the same command to resume.',
        'network',
        true,
        command === 'projects' && operation === 'create'
          ? 'Retry anhedral projects create with the same name, summary, team, API origin, credential store and working directory, omitting --new to reuse the saved request.'
          : `Retry anhedral ${command} with the same API origin, working directory and options to resume.`,
      );
    }
    const data: unknown = await readSourceBounded(
      response.body,
      /\/projects\/[^/]+\/(environment|staging|production|runtime-logs)(\?|$)/.test(path)
        ? 1024 * 1024
        : command === 'projects'
          ? 1024 * 1024
          : 65536,
    )
      .then((b) => JSON.parse(new TextDecoder().decode(b)))
      .catch(() => {
        throw platformFailure('Platform returned an invalid response.', 'network');
      });
    if (!response.ok) {
      if (path === '/auth/token') {
        const error = z
          .object({
            error: z.enum([
              'authorization_pending',
              'slow_down',
              'access_denied',
              'expired_token',
              'invalid_grant',
            ]),
          })
          .safeParse(data);
        if (error.success) return error.data;
      }
      const serverMessage = z.object({ error: z.string().max(2000) }).safeParse(data);
      const admissionProblem =
        serverMessage.success &&
        /^\[(?:RUNTIME_UNAVAILABLE|ARTIFACT_MISMATCH|SOURCE_VERSION_MISMATCH|DEPENDENCY_LOCK_MISMATCH|INDEPENDENT_APPROVAL_REQUIRED|PRODUCTION_PERMISSION_REQUIRED)\] [^\r\n]{1,1500}$/.test(
          serverMessage.data.error,
        )
          ? visible(serverMessage.data.error)
          : null;
      throw platformFailure(
        admissionProblem ??
          (response.status === 401
            ? 'CLI login expired or was revoked. Run anhedral login.'
            : response.status === 409
              ? command === 'deploy'
                ? 'Deployment plan is stale or inputs conflict. Review deploy plan --new.'
                : command === 'projects'
                  ? 'Project creation conflicts with the saved request. Preserve retry state; use projects create --new only to create another project.'
                  : command === 'staging'
                    ? 'Candidate, configuration or staging generation changed. Review staging status before starting a new deployment.'
                    : command === 'production'
                      ? 'Candidate, production configuration, permissions or generation changed. Review production status before retrying.'
                      : command === 'env'
                        ? 'Environment versions or import contents conflict. Review env list and preserve saved retry state before starting a new import.'
                        : 'Upload conflicts with saved source. Restore the original files or use source upload --new.'
              : response.status === 403
                ? command === 'projects'
                  ? 'Current team project access or project creation permission is unavailable.'
                  : command === 'env'
                    ? 'Current project environment access or administrator permission is unavailable.'
                    : command === 'logs'
                      ? 'Current project log access is unavailable.'
                      : command === 'production'
                        ? 'Current production permission or team approval policy does not allow this deployment. Review production status and the team policy.'
                        : 'Current project build access is unavailable.'
                : `Platform request failed (${response.status}).`),
        response.status === 401
          ? 'auth'
          : response.status === 403
            ? 'permission'
            : response.status === 409
              ? 'conflict'
              : 'network',
        response.status === 429 || response.status >= 500,
        response.status === 401
          ? 'Run anhedral login with the same API origin and credential store.'
          : response.status === 403 && command === 'production'
            ? 'Run anhedral production status and review current production permissions and the team approval policy in Platform.'
            : `Run anhedral ${command} --help.`,
      );
    }
    return data;
  };
}
