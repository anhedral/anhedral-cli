import { stripVTControlCharacters } from 'node:util';

export function visible(value: unknown): string {
  return stripVTControlCharacters(String(value ?? '')).replace(/[\x00-\x1f\x7f]/g, ' ');
}

export function formatPlatformResult(command: string, result: unknown): string {
  const data = result as Record<string, unknown>;
  if (data.status === 'authorization_required')
    return `Approve CLI access at ${visible(data.verificationUrl)}\nConfirm code ${visible(data.userCode)}.\nNext: ${visible(data.nextAction)}`;
  if (data.status === 'authenticated')
    return `Signed in to ${visible(data.origin)}.\nExpires: ${visible(data.expiresAt)}.`;
  if (data.status === 'logged_out') return `Logged out of ${visible(data.origin)}.`;
  if (data.status === 'unlinked') return 'Removed the local project link.';
  if (command === 'whoami') {
    const context = data.context as
      | {
          credential?: { kind: string };
          project?: { name: string; projectId: string; teamId: string } | null;
        }
      | undefined;
    return [
      `Signed in as ${visible(data.name)} (${visible(data.principalId)}).`,
      `API origin: ${visible(data.origin)}.`,
      `Expires: ${visible(data.expiresAt)}.`,
      ...(context
        ? [
            `Credential store: ${visible(context.credential?.kind)}.`,
            context.project
              ? `Saved local project: ${visible(context.project.name)} (${visible(context.project.projectId)}), team ${visible(context.project.teamId)}. Project access has not been verified.`
              : 'No local project link is saved.',
          ]
        : []),
    ].join('\n');
  }
  if (command === 'projects') {
    if (data.status === 'dry_run')
      return `Project creation preview: ${visible(data.name)}.\nNo project, source or deployment was created.`;
    if (Array.isArray(data.projects)) {
      const projects = data.projects as { name: string; projectId: string; canLink: boolean }[];
      const teams = data.availableTeams as { name: string; id: string }[];
      return [
        data.team
          ? `Team: ${visible((data.team as { name: string }).name)} (${visible((data.team as { id: string }).id)}).`
          : 'No team is selected.',
        ...projects.map(
          (project) =>
            `${visible(project.name)} (${visible(project.projectId)})${project.canLink ? '' : ' [cannot link]'}`,
        ),
        ...(projects.length ? [] : ['No projects found.']),
        'Available teams:',
        ...teams.map((team) => `${visible(team.name)} (${visible(team.id)})`),
        ...(data.teamsTruncated
          ? ['Team list is truncated. Use a known team ID with --team.']
          : []),
        ...(data.nextCursor
          ? [
              `Next: anhedral projects list --cursor ${visible(data.nextCursor)}${data.team ? ` --team ${visible((data.team as { id: string }).id)}` : ''} (with the same API origin and credential store).`,
            ]
          : []),
      ].join('\n');
    }
    return `Created project ${visible(data.name)} (${visible(data.projectId)}).\nTeam: ${visible(data.teamId)}.${data.linked ? '\nSaved verified local project link.' : ''}\n${data.linked ? 'Next: anhedral source upload --dry-run' : `Next: anhedral link --project ${visible(data.projectId)} --team ${visible(data.teamId)}`} (with the same API origin and credential store).\nNo source was generated or deployment started.`;
  }
  if (command === 'link')
    return `Linked to ${visible(data.name)} (${visible(data.projectId)}).\nTeam: ${visible(data.teamId)}.`;
  if (data.status === 'dry_run')
    return `Source archive preview: ${visible(data.files)} files, ${visible(data.bytes)} source bytes, ${visible(data.archiveBytes)} archive bytes.\nNo source was uploaded. Review the included paths with --json.`;
  if (command === 'source')
    return `Source ${visible(data.state)} (${visible(data.id)}).\nSource revision: ${visible(data.sourceRevision ?? 'not sealed')}.\nUpload does not activate a runtime or deployment.`;
  if (command === 'deploy')
    return [
      data.state
        ? `Candidate ${visible(data.state)} (${visible(data.candidateId)}).`
        : `Deployment plan prepared (${visible(data.id)}).`,
      `Source revision: ${visible(data.sourceRevision)}.`,
      ...(
        (
          data.admission as
            { diagnostics?: { code: string; message: string; action: string }[] } | undefined
        )?.diagnostics ?? []
      ).flatMap((item) => [
        `[${visible(item.code)}] ${visible(item.message)}`,
        `Next: ${visible(item.action)}`,
      ]),
      ...(data.admission && (data.blockers as unknown[] | undefined)?.length === 0
        ? ['Source is eligible for candidate preparation. Run anhedral deploy prepare.']
        : []),
      'No preview or deployment was activated.',
    ].join('\n');
  return 'Platform command completed.';
}
