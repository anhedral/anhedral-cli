import { CliArgumentError } from './cli-arguments.js';
import { PostCommitError } from './transaction.js';

export type FailureCategory =
  'usage' | 'auth' | 'permission' | 'network' | 'conflict' | 'context' | 'post_commit' | 'internal';

export class CliFailure extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly nextAction: string,
    readonly category: FailureCategory,
    readonly retryable = false,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'CliFailure';
  }
}

/** Preserve existing error fields and exit status; attach actionable safe detail. */
export function describeFailure(error: unknown, command?: string) {
  if (error instanceof CliArgumentError)
    return {
      error: error.message,
      code: error.code,
      nextAction: error.nextAction,
      category: 'usage' as const,
      retryable: false,
    };
  if (error instanceof CliFailure)
    return {
      error: error.message,
      code: error.code,
      nextAction: error.nextAction,
      category: error.category,
      retryable: error.retryable,
      ...(error.details ? { details: error.details } : {}),
    };
  if (error instanceof PostCommitError)
    return {
      error: error.message,
      code: 'POST_COMMIT_FAILED',
      nextAction:
        'The files were kept. Resolve the reported follow-up failure and rerun only that operation in the project directory; do not regenerate the project.',
      category: 'post_commit' as const,
      retryable: false,
      details: { committedPaths: [...error.committedPaths] },
    };
  const code =
    command === 'init'
      ? 'GENERATION_FAILED'
      : command === 'add' || command === 'stack'
        ? 'CAPABILITY_COMMAND_FAILED'
        : command === 'ui'
          ? 'UI_COMMAND_FAILED'
          : ['login', 'logout', 'whoami', 'link', 'unlink', 'source', 'deploy'].includes(
                command ?? '',
              )
            ? 'PLATFORM_COMMAND_FAILED'
            : 'INTERNAL_ERROR';
  return {
    error: error instanceof Error ? error.message : String(error),
    code,
    nextAction: `Run anhedral ${command && /^[a-z-]+$/.test(command) ? command + ' ' : ''}--help.`,
    category: 'internal' as const,
    retryable: false,
  };
}
