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

function next(lines: string[], action: unknown): void {
  if (string(action)) lines.push(`Next: ${string(action)}`);
}

function formatInit(data: RecordValue, lines: string[]): void {
  lines.push(
    data.generated ? `Created ${string(data.root)}.` : `Stack preview for ${string(data.root)}.`,
    `Stack: ${names(data.products)}.`,
    `Hosting: ${string(data.hosting)}.`,
    '',
  );
  const catalog = record(data.catalog);
  if (catalog.state === 'registered') lines.push('Registered in your local Anhedral dashboard.');
  if (catalog.state === 'pending') next(lines, catalog.nextAction);
  if (data.generated)
    lines.push(
      'Review the generated source and provider settings in anhedral.json (providers).',
      'In the project directory, start development with pnpm dev. Run pnpm check before delivery.',
      'Next: anhedral auth, then connect the intended hosting account and preview anhedral ship --dry-run.',
    );
  else lines.push('No files, provider resources or deployments were created.');
}

function formatServices(data: RecordValue, lines: string[], value: unknown): void {
  if (Array.isArray(data.services)) {
    lines.push(`${data.services.length} local service entries.`);
    for (const service of entries(data.services))
      lines.push(`  ${string(service.key)}${service.state ? ` — ${string(service.state)}` : ''}`);
  } else if (Array.isArray(data.points)) {
    lines.push(
      `Analytics: ${string(data.source)}.`,
      `Window: ${string(data.start)} to ${string(data.end)} (UTC).`,
      `${data.points.length} provider data points.`,
      'Use --json for the complete aggregate values.',
    );
  } else if (Array.isArray(data.rows)) {
    lines.push(
      `Read ${data.rows.length} rows.`,
      `Private data${data.masked ? '; sensitive fields are masked' : ''}. Use --json to inspect values.`,
    );
  } else if (string(data.token)) {
    lines.push(
      `Deletion plan: ${string(data.kind)} ${string(data.name)}.`,
      string(data.impact),
      `Affected apps: ${names(data.applications) || 'None recorded'}.`,
      `Expires: ${string(data.expiresAt)}.`,
      'Use --json for the single-use confirmation token; deleting requires the exact resource name.',
    );
  } else if (Array.isArray(value)) lines.push(`Tables: ${names(value) || 'None'}.`);
  else lines.push(`Service: ${string(data.state) || 'Checked'}.`, string(data.message));
}

function formatAdd(data: RecordValue, lines: string[]): void {
  lines.push(
    data.dryRun ? 'Addition preview.' : 'Stack parts added.',
    names(data.items) ? `Parts: ${names(data.items)}.` : 'No new stack parts.',
    `Project: ${string(data.root)}.`,
  );
  const files = Array.isArray(data.files) ? data.files : [];
  if (files.length) lines.push('', ...files.map((file) => `  ${string(file)}`));
  if (data.filesChecked === false)
    lines.push('Source files were not checked: this selection needs the networked web bootstrap.');
  if (names(data.conflicts)) lines.push(`Conflicts: ${names(data.conflicts)}.`);
  for (const preview of entries(data.previews))
    lines.push(
      '',
      string(preview.path),
      string(preview.unavailable ?? preview.diff ?? preview.content),
    );
  if (data.dryRun) lines.push('', 'No application files were changed.');
  else next(lines, 'Run anhedral doctor and review the selected services’ setup requirements.');
}

function formatInspect(data: RecordValue, lines: string[]): void {
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
    lines,
    'Use --json for target-specific records. Review local checks, then explicitly run auth or ship when intended.',
  );
}

function formatAuth(data: RecordValue, lines: string[]): void {
  const checks = entries(data.checks);
  lines.push(
    checks.length ? 'Provider authentication' : 'This stack requires no provider authentication.',
  );
  for (const check of checks) {
    lines.push(
      `  ${string(check.provider).padEnd(12)}${string(check.state)}${string(check.access) && check.access !== 'none' ? ` (${string(check.access)} access)` : ''}`,
    );
    if (check.state !== 'verified' || check.access === 'runtime') next(lines, check.nextAction);
  }
  if (checks.length && string(data.note)) lines.push(string(data.note));
  if (checks.length)
    next(
      lines,
      data.authenticated
        ? 'Complete provider settings, connect the intended hosting account, then run anhedral ship --dry-run.'
        : 'Resolve the reported access checks, then repeat anhedral auth --status.',
    );
}

function formatIntegrations(data: RecordValue, lines: string[]): void {
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
    lines,
    data.nextAction ??
      'Use --json to inspect the resource IDs and safe recovery descriptors. Unknown operations must be verified before retrying.',
  );
}

function formatRegistry(data: RecordValue, lines: string[]): void {
  lines.push(`${string(data.name)} (${string(data.type)})`, string(data.description));
  if (names(data.targets)) lines.push(`Files: ${names(data.targets)}`);
  if (names(data.registryDependencies)) lines.push(`Requires: ${names(data.registryDependencies)}`);
  const setup = record(data.setup);
  for (const key of ['access', 'credentials', 'resources', 'verify'])
    if (names(setup[key])) lines.push(`${key}: ${names(setup[key])}`);
  next(lines, `Inspect anhedral add ${string(data.name)} --dry-run in your project.`);
}

function formatDoctor(data: RecordValue, lines: string[]): void {
  const local = record(data.local);
  const checks = entries(data.checks ?? local.checks);
  lines.push(
    data.localReady ? 'Local project checks passed.' : 'Local project checks need attention.',
  );
  for (const check of checks) {
    lines.push(
      `  ${check.ok ? 'pass' : 'fail'}  ${string(check.id)}${string(check.detail) ? ` — ${string(check.detail)}` : ''}`,
    );
    if (check.ok === false) next(lines, check.nextAction);
  }
  if (data.providerVerification)
    lines.push(`Provider evidence: ${string(data.providerVerification)}.`);
  for (const check of entries(data.prerequisiteChecks)) {
    lines.push(`  ${check.ok ? 'pass' : 'fail'}  ${string(check.id)} — ${string(check.detail)}`);
    if (check.ok === false) next(lines, check.nextAction);
  }
  lines.push('Local readiness does not certify production behavior.');
}

function formatDeliveryHeader(data: RecordValue, lines: string[], command: string): void {
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
}

function formatDeliveryResources(data: RecordValue, lines: string[]): void {
  const release = record(data.release);
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
}

function formatDeliveryIntegrations(data: RecordValue, lines: string[]): void {
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
      next(lines, action);
  }
}

function formatDeliveryOperation(data: RecordValue, lines: string[]): void {
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
}

function formatDelivery(
  data: RecordValue,
  lines: string[],
  _value: unknown,
  command: string,
): void {
  const project = record(data.project);
  const state = string(data.state ?? record(data.release).state);
  formatDeliveryHeader(data, lines, command);
  formatDeliveryResources(data, lines);
  formatDeliveryIntegrations(data, lines);
  if (data.productVerification)
    lines.push(`Product verification: ${string(data.productVerification)}.`);
  formatDeliveryOperation(data, lines);
  next(lines, data.nextAction);
  if (data.mutation === false) lines.push('No provider resources or deployments were changed.');
  else if (!data.nextAction && command === 'ship' && state === 'deployed')
    next(lines, 'Run anhedral verify to exercise the application’s configured acceptance checks.');
  else if (!data.nextAction && command === 'connect')
    next(lines, 'Review and commit the connection manifest, then run anhedral ship --dry-run.');
  if (!state && !data.nextAction && !Object.keys(project).length)
    lines.push('Use --json for the complete recorded evidence.');
}

type Formatter = (data: RecordValue, lines: string[], value: unknown, command: string) => void;
const formatters: Readonly<Record<string, Formatter>> = {
  init: formatInit,
  services: formatServices,
  add: formatAdd,
  inspect: formatInspect,
  auth: formatAuth,
  integrations: formatIntegrations,
  registry: formatRegistry,
  doctor: formatDoctor,
};

/** Human output is an explicit summary, never a recursive dump of provider payloads. */
export function formatResult(command: string, value: unknown): string {
  const lines: string[] = [];
  const format = Object.hasOwn(formatters, command) ? formatters[command] : formatDelivery;
  format(record(value), lines, value, command);
  return lines.join('\n').trimEnd();
}

export function printResult(command: string, value: unknown, options: OutputOptions = {}): void {
  if (options.json) console.log(JSON.stringify(value, null, 2));
  else if (!options.quiet) console.log(formatResult(command, value));
}

export function printProgress(message: string, options: OutputOptions = {}): void {
  if (process.stderr.isTTY && !options.json && !options.quiet) console.error(message);
}
