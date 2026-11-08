import type { z } from 'zod';
import type { commandArguments } from '../cli-arguments.js';
import type { CliFailure } from '../cli-errors.js';
import type { cliLinkSchema } from '../contracts/cli-transport.js';
import type { PlatformFailureCategory } from './state.js';
export type PlatformRequest = (
  path: string,
  method: string,
  body?: unknown,
  token?: string,
  team?: string,
) => Promise<unknown>;
export type PlatformFailure = (
  message: string,
  category?: PlatformFailureCategory,
  retryable?: boolean,
  nextAction?: string,
) => CliFailure;
export type ProjectOperation = {
  options: ReturnType<typeof commandArguments>;
  origin: string;
  actor: { principalId: string; teamId?: string | null };
  token: string;
  stateDir: string;
  linkPath: string;
  request: PlatformRequest;
  emit: (result: unknown) => void;
  platformFailure: PlatformFailure;
};
export type SourceOperation = ProjectOperation & {
  link: z.infer<typeof cliLinkSchema>;
  uploadPath: string;
  root: string;
};
