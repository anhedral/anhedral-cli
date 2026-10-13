export interface OutputOptions {
  json?: boolean;
  quiet?: boolean;
}
type RecordValue = Record<string, unknown>;
const record = (value: unknown): RecordValue =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as RecordValue) : {};
const entries = (value: unknown): RecordValue[] => (Array.isArray(value) ? value.map(record) : []);
const string = (value: unknown): string =>
  typeof value === 'string' ? value.replace(/[\x00-\x08\x0b-\x1f\x7f]/g, '') : '';
const names = (value: unknown): string =>
  Array.isArray(value)
    ? value
        .filter((entry) => typeof entry === 'string')
        .map(string)
        .join(', ')
    : '';

/** Human output is an explicit summary, never a recursive dump of provider payloads. */
export function formatResult(command: string, value: unknown): string {
  const data = record(value);
  const lines: string[] = [];
  const next = (action: unknown) => {
    if (string(action)) lines.push(`Next: ${string(action)}`);
  };
  if (command === 'init' || command === 'new') {
    lines.push(
      data.generated ? `Created ${string(data.root)}.` : `Stack preview for ${string(data.root)}.`,
      `Stack: ${names(data.products)}.`,
      `Hosting: ${string(data.hosting)}.`,
      '',
    );
    if (data.generated)
      lines.push(
        'Review the generated source and anhedral.providers.json.',
        'In the project directory, start development with pnpm dev. Run pnpm check before delivery.',
        'Next: anhedral auth, then connect the intended hosting account and preview anhedral ship --dry-run.',
      );
    else lines.push('No files, provider resources or deployments were created.');
  } else if (command === 'add') {
    lines.push(
      data.dryRun ? 'Addition preview.' : 'Stack parts added.',
      names(data.items) ? `Parts: ${names(data.items)}.` : 'No new stack parts.',
      `Project: ${string(data.root)}.`,
    );
    const files = Array.isArray(data.files) ? data.files : [];
    if (files.length) lines.push('', ...files.map((file) => `  ${string(file)}`));
    if (data.filesChecked === false)
      lines.push(
        'Source files were not checked: this selection needs the networked web bootstrap.',
      );
    if (names(data.conflicts)) lines.push(`Conflicts: ${names(data.conflicts)}.`);
    for (const preview of entries(data.previews))
      lines.push(
        '',
        string(preview.path),
        string(preview.unavailable ?? preview.diff ?? preview.content),
      );
    if (data.dryRun) lines.push('', 'No application files were changed.');
    else next('Run anhedral doctor and review the selected services’ setup requirements.');
  } else if (command === 'inspect') {
    lines.push(
      `Project: ${string(data.name) || 'Name unavailable'}.`,
      'Local recorded evidence; authentication and live provider status are not checked.',
    );
    const selection = record(record(data.selection).data);
    lines.push(`Stack: ${names(selection.products) || 'Unavailable'}.`);
    for (const target of entries(record(data.targets).data)) {
      const latest = record(target.latestAttempt),
        successful = record(target.lastSuccessful);
      lines.push(
        `  ${string(target.application)} — ${string(target.provider)} (${string(target.delivery)})`,
      );
      if (string(latest.state))
        lines.push(`    Latest recorded target result: ${string(latest.state)}.`);
      if (string(latest.operationState))
        lines.push(`    Overall attempt: ${string(latest.operationState)}.`);
      if (string(successful.id)) lines.push(`    Last recorded success: ${string(successful.id)}.`);
      if (string(target.error)) lines.push(`    ${string(target.error)}`);
    }
    for (const check of entries(record(record(data.readiness).data).checks))
      lines.push(`  ${check.ok ? 'pass' : 'fail'}  ${string(check.id)} — ${string(check.detail)}`);
    for (const key of [
      'selection',
      'workspaces',
      'configuration',
      'targets',
      'setupProviders',
      'integrations',
      'cloudflareResources',
      'readiness',
      'operation',
    ]) {
      const section = record(data[key]);
      if (section.state === 'unavailable')
        lines.push(`${key}: ${string(section.error) || 'Unavailable'}.`);
    }
    next(
      'Use --json for target-specific records. Review local checks, then explicitly run auth or ship when intended.',
    );
  } else if (command === 'auth') {
    const checks = entries(data.checks);
    lines.push(
      checks.length ? 'Provider authentication' : 'This stack requires no provider authentication.',
    );
    for (const check of checks) {
      lines.push(
        `  ${string(check.provider).padEnd(12)}${string(check.state)}${string(check.access) && check.access !== 'none' ? ` (${string(check.access)} access)` : ''}`,
      );
      if (check.state !== 'verified' || check.access === 'runtime') next(check.nextAction);
    }
    if (checks.length && string(data.note)) lines.push(string(data.note));
    if (checks.length)
      next(
        data.authenticated
          ? 'Complete provider settings, connect the intended hosting account, then run anhedral ship --dry-run.'
          : 'Resolve the reported access checks, then repeat anhedral auth --status.',
      );
  } else if (command === 'integrations') {
    lines.push(
      data.recovered
        ? 'Integration resource reconciled.'
        : 'Integration receipts (recorded locally).',
    );
    for (const provider of entries(data.providers)) {
      lines.push(`  ${string(provider.provider)}`);
      for (const operation of entries(provider.operations))
        lines.push(`    ${string(operation.operation)}: ${string(operation.status)}`);
    }
    if (string(data.operation)) lines.push(`Operation: ${string(data.operation)}`);
    next(
      data.nextAction ??
        'Use --json to inspect the resource IDs and safe recovery descriptors. Unknown operations must be verified before retrying.',
    );
  } else if (command === 'registry') {
    lines.push(`${string(data.name)} (${string(data.type)})`, string(data.description));
    if (names(data.targets)) lines.push(`Files: ${names(data.targets)}`);
    if (names(data.registryDependencies))
      lines.push(`Requires: ${names(data.registryDependencies)}`);
    const setup = record(data.setup);
    for (const key of ['access', 'credentials', 'resources', 'verify'])
      if (names(setup[key])) lines.push(`${key}: ${names(setup[key])}`);
    next(`Inspect anhedral add ${string(data.name)} --dry-run in your project.`);
  } else if (command === 'doctor') {
    const local = record(data.local);
    const checks = entries(data.checks ?? local.checks);
    lines.push(
      data.localReady ? 'Local project checks passed.' : 'Local project checks need attention.',
    );
    for (const check of checks) {
      lines.push(
        `  ${check.ok ? 'pass' : 'fail'}  ${string(check.id)}${string(check.detail) ? ` — ${string(check.detail)}` : ''}`,
      );
      if (check.ok === false) next(check.nextAction);
    }
    if (data.providerVerification)
      lines.push(`Provider evidence: ${string(data.providerVerification)}.`);
    for (const check of entries(data.prerequisiteChecks)) {
      lines.push(`  ${check.ok ? 'pass' : 'fail'}  ${string(check.id)} — ${string(check.detail)}`);
      if (check.ok === false) next(check.nextAction);
    }
    lines.push('Local readiness does not certify production behavior.');
  } else {
    const project = record(data.project);
    const release = record(data.release);
    const state = string(data.state ?? release.state);
    lines.push(
      data.mutation === false
        ? `${command}: preview only.`
        : `${command}${state ? `: ${state}` : ': completed'}.`,
    );
    if (string(project.name))
      lines.push(`Project: ${string(project.name)} (${string(project.provider)}).`);
    if (string(release.id)) lines.push(`Release: ${string(release.id)}`);
    if (string(data.buildId))
      lines.push(
        `Build: ${string(data.buildId)} (${string(data.platform)}, ${string(data.profile)}).`,
      );
    if (string(data.evidence)) lines.push(`Evidence: ${string(data.evidence)}.`);
    if (typeof data.activeRecordedVersion === 'boolean')
      lines.push(
        `Recorded production version: ${data.activeRecordedVersion ? 'active' : 'not confirmed'}.`,
      );
    for (const target of entries(data.provider))
      lines.push(
        `  ${string(target.target)}: ${target.activeRecordedVersion === true ? 'recorded version active' : 'recorded version not confirmed'}`,
      );
    const repository = record(data.repository);
    if (string(repository.nameWithOwner))
      lines.push(`Repository: ${string(repository.nameWithOwner)}`);
    if (string(data.branch)) lines.push(`Branch: ${string(data.branch)}`);
    for (const resource of entries(record(data.provisioning ?? data).resources))
      lines.push(
        `  ${string(resource.kind)}  ${string(resource.name)}${string(resource.target) ? ` (${string(resource.target)})` : ''}`,
      );
    for (const key of ['downloadUrl', 'buildPageUrl', 'managementFile', 'file'])
      if (string(data[key])) lines.push(`${key}: ${string(data[key])}`);
    if (string(release.url)) lines.push(`URL: ${string(release.url)}`);
    const integration = record(data.integrations);
    for (const provider of entries(integration.providers)) {
      lines.push(
        `  ${string(provider.provider)}${names(provider.missing) ? `: missing ${names(provider.missing)}` : ': configuration selected'}`,
      );
    }
    for (const provider of entries(integration.results)) {
      lines.push(
        `  ${string(provider.provider)}: ${provider.ready ? 'configured' : 'setup pending'}`,
      );
      for (const action of Array.isArray(provider.nextActions) ? provider.nextActions : [])
        next(action);
    }
    if (data.productVerification)
      lines.push(`Product verification: ${string(data.productVerification)}.`);
    const operation = record(data.operation);
    if (string(operation.state)) {
      lines.push(`Operation: ${string(operation.state)} (recorded locally).`);
      for (const phase of entries(operation.phases))
        lines.push(`  ${string(phase.name)}: ${string(phase.state)}`);
    }
    for (const target of entries(data.targets)) {
      if (string(target.provider)) {
        const result = record(target.result);
        const release = record(result.release);
        lines.push(
          `  ${string(target.provider)}: ${string(target.state ?? result.state ?? release.state) || 'planned'}`,
        );
      }
    }
    next(data.nextAction);
    if (data.mutation === false) lines.push('No provider resources or deployments were changed.');
    else if (!data.nextAction && command === 'ship' && state === 'deployed')
      next('Run anhedral verify to exercise the application’s configured acceptance checks.');
    else if (!data.nextAction && command === 'connect')
      next('Review and commit the connection manifest, then run anhedral ship --dry-run.');
    if (!state && !data.nextAction && !Object.keys(project).length)
      lines.push('Use --json for the complete recorded evidence.');
  }
  return lines.join('\n').trimEnd();
}

export function printResult(command: string, value: unknown, options: OutputOptions = {}): void {
  if (options.json) console.log(JSON.stringify(value, null, 2));
  else if (!options.quiet) console.log(formatResult(command, value));
}

export function printProgress(message: string, options: OutputOptions = {}): void {
  if (process.stderr.isTTY && !options.json && !options.quiet) console.error(message);
}
