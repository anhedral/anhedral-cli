import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { z } from 'zod';
import { commandArgumentError, type commandArguments } from '../cli-arguments.js';
import {
  cliLinkSchema,
  cliProjectCreateInputSchema,
  cliProjectCreateReceiptSchema,
  cliProjectListQuerySchema,
  cliProjectListSchema,
} from '../contracts/cli-transport.js';
import { linkSchema } from './state-schema.js';
import { readPrivate, withProjectLock, writePrivate } from './state.js';
import type { ProjectOperation } from './types.js';
const projectCreateState = z
  .object({
    origin: z.string(),
    principalId: z.uuid(),
    teamId: z.uuid(),
    input: cliProjectCreateInputSchema,
    receipt: cliProjectCreateReceiptSchema.optional(),
  })
  .strict();
export async function runProjects({
  options,
  origin,
  actor,
  token,
  stateDir,
  linkPath,
  request,
  emit,
  platformFailure,
  projectInput,
}: ProjectOperation & { projectInput?: { name: string; summary: string } }) {
  const selectedTeam = options.value('--team') ?? actor.teamId;
  if (options.positional[0] === 'list') {
    const query = cliProjectListQuerySchema.parse({
      ...(options.has('--limit') ? { limit: options.value('--limit') } : {}),
      ...(options.has('--cursor') ? { cursor: options.value('--cursor') } : {}),
    });
    const params = new URLSearchParams({ limit: String(query.limit) });
    if (query.cursor) params.set('cursor', query.cursor);
    const result = cliProjectListSchema.parse(
      await request(`/projects?${params}`, 'GET', undefined, token, selectedTeam ?? undefined),
    );
    if (
      result.principalId !== actor.principalId ||
      (selectedTeam && result.team?.id !== selectedTeam) ||
      result.projects.some((project) => project.teamId !== result.team?.id)
    )
      throw platformFailure('Project list identity differs.');
    emit(result);
    return;
  }
  if (!selectedTeam)
    throw platformFailure(
      'No team is selected. Run anhedral projects list to discover available teams, then use --team <uuid>.',
    );
  await withProjectLock(stateDir, async () => {
    const journalPath = join(stateDir, 'project-create.json');
    const previous = await readPrivate(journalPath);
    let state = previous === null ? null : projectCreateState.parse(previous);
    if (
      state &&
      !options.has('--new') &&
      (state.origin !== origin ||
        state.principalId !== actor.principalId ||
        state.teamId !== selectedTeam ||
        state.input.name !== projectInput!.name ||
        state.input.summary !== projectInput!.summary)
    )
      throw platformFailure(
        'Saved project creation belongs to different input or context. Restore the original options to retry, or explicitly use --new to create another project.',
      );
    if (!state || options.has('--new'))
      state = {
        origin,
        principalId: actor.principalId,
        teamId: selectedTeam,
        input: cliProjectCreateInputSchema.parse({
          protocol: 1,
          requestId: randomUUID(),
          ...projectInput,
        }),
      };
    const checkLink = async () => {
      const value = await readPrivate(linkPath);
      if (value === null) return;
      const existing = linkSchema.parse(value);
      if (
        existing.origin !== origin ||
        existing.principalId !== actor.principalId ||
        existing.teamId !== selectedTeam ||
        existing.projectId !== state!.input.requestId
      )
        throw platformFailure(
          'A different local project link exists. Use another working directory or explicitly unlink before creating with --link.',
        );
    };
    if (options.has('--link')) await checkLink();
    await writePrivate(journalPath, state);
    const receipt = cliProjectCreateReceiptSchema.parse(
      await request('/projects', 'POST', state.input, token, selectedTeam),
    );
    if (
      receipt.requestId !== state.input.requestId ||
      receipt.projectId !== state.input.requestId ||
      receipt.principalId !== actor.principalId ||
      receipt.teamId !== selectedTeam ||
      receipt.name !== state.input.name ||
      receipt.summary !== state.input.summary
    )
      throw platformFailure(
        'Project creation receipt identity or input differs. Preserve saved retry state.',
      );
    state = { ...state, receipt };
    await writePrivate(journalPath, state);
    if (options.has('--link')) {
      await checkLink();
      const link = cliLinkSchema.parse(
        await request(
          '/link',
          'POST',
          { projectId: receipt.projectId, teamId: selectedTeam },
          token,
          selectedTeam,
        ),
      );
      if (
        link.principalId !== actor.principalId ||
        link.projectId !== receipt.projectId ||
        link.teamId !== selectedTeam
      )
        throw platformFailure('Project link identity differs.');
      await checkLink();
      await writePrivate(linkPath, { ...link, origin });
    }
    emit({ ...receipt, linked: options.has('--link') });
  });
  return;
}

export function validateProjects(
  options: ReturnType<typeof commandArguments>,
): { name: string; summary: string } | undefined {
  const operation = options.positional[0];
  if (options.has('--team') && !z.uuid().safeParse(options.value('--team')).success)
    throw commandArgumentError('projects', 'Supply a team UUID with --team.');
  if (operation === 'list') {
    if (['--name', '--summary', '--link', '--dry-run', '--new'].some((flag) => options.has(flag)))
      throw commandArgumentError('projects', 'Creation options apply to projects create only.');
    const query = cliProjectListQuerySchema.safeParse({
      ...(options.has('--limit') ? { limit: options.value('--limit') } : {}),
      ...(options.has('--cursor') ? { cursor: options.value('--cursor') } : {}),
    });
    if (!query.success || (options.has('--limit') && !/^[0-9]+$/.test(options.value('--limit')!)))
      throw commandArgumentError('projects', 'Use --limit 1–100 and an optional cursor UUID.');
  } else {
    if (options.has('--limit') || options.has('--cursor'))
      throw commandArgumentError('projects', 'Pagination options apply to projects list only.');
    const parsed = cliProjectCreateInputSchema.safeParse({
      protocol: 1,
      requestId: randomUUID(),
      name: options.value('--name'),
      summary: options.value('--summary') ?? '',
    });
    if (!parsed.success)
      throw commandArgumentError(
        'projects',
        'Supply --name with 1–160 characters and an optional summary up to 2000 characters.',
      );
    return { name: parsed.data.name, summary: parsed.data.summary };
  }
}
