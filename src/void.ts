import path from 'node:path';
import { existsSync, readdirSync, realpathSync, readFileSync } from 'node:fs';
import { readApplication, readConfig, targetDirectory } from './project-state.js';

// Exact delivery pin. Runtime and receipt adapters target this distribution.
// renovate: datasource=npm depName=void
export const VOID_VERSION = '0.27.0';
export const VOID_NODE_ENGINE = '>=24.21.0';

export interface VoidDeliveryOptions {
  /** Target ID, not every target with a database binding. */
  migrationOwner?: string;
}

function localEnvironmentFiles(root: string, directory: string): string[] {
  return [root, directory, path.join(root, 'packages/db')].flatMap((folder) => {
    if (!existsSync(folder)) return [];
    return readdirSync(folder)
      .filter((name) => /^(?:\.env(?:\..+)?|\.dev\.vars(?:\..+)?)$/.test(name))
      .filter((name) => !name.endsWith('.example'))
      .map((name) => path.relative(root, path.join(folder, name)).split(path.sep).join('/'));
  });
}

export function supportsVoidRuntime(version: string): boolean {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version);
  if (!match) return false;
  const [major, minor] = match.slice(1).map(Number);
  return major > 24 || (major === 24 && minor >= 21);
}

/**
 * Read-only migration candidate. Never execute application configuration, create
 * resources, install dependencies, or infer deployment success from CLI prose.
 * Existing projects retain their engine until an explicit migration.
 */
export function planVoidDelivery(root: string, options: VoidDeliveryOptions = {}) {
  root = realpathSync(root);
  const project = readApplication(root);
  const blockers: string[] = [];
  if (!project.accountId) blockers.push('Connect the customer Cloudflare account.');
  if (project.audience === 'unconfigured') blockers.push('Select the application audience.');
  if (!project.targets.length) blockers.push('No Cloudflare deployment targets.');
  const migrationCandidates: string[] = [];
  const databaseConsumers: string[] = [];
  const environmentMigrations: { target: string; files: string[] }[] = [];
  const targets = project.targets.map((target) => {
    const directory = targetDirectory(root, target);
    const cloudflare = structuredClone(readConfig(directory));
    const declarationFile = path.join(directory, 'anhedral.cloudflare.json');
    if (existsSync(declarationFile) && Array.isArray(cloudflare.d1_databases)) {
      const declared = JSON.parse(readFileSync(declarationFile, 'utf8'));
      // Void records a conventional migrations_dir during resource resolution.
      // Only the authored declaration assigns Anhedral's migration owner.
      for (const database of cloudflare.d1_databases) {
        const source = declared.d1_databases?.find(
          (entry: { binding?: string }) => entry.binding === database.binding,
        );
        if (source?.migrations_dir) database.migrations_dir = source.migrations_dir;
        else delete database.migrations_dir;
      }
    }

    if (cloudflare.name !== target.workerName)
      throw new Error('Worker identity differs from the registered application.');
    if (cloudflare.account_id && cloudflare.account_id !== project.accountId)
      throw new Error('Void must use the registered customer Cloudflare account.');
    if (cloudflare.env && Object.keys(cloudflare.env as object).length) {
      blockers.push(
        `${target.id}: migrate each named environment to a separate Void target configuration, preserving its account, bindings, secrets, routes and audience.`,
      );
      // A named environment is not a valid direct Void configuration. Do not
      // silently flatten it into the top-level customer's resources.
      delete cloudflare.env;
    }
    delete cloudflare.$schema;
    cloudflare.account_id = project.accountId;
    // These migration-only hints belong to Anhedral, not the provider config.
    const namespaces = cloudflare.kv_namespaces;
    if (Array.isArray(namespaces))
      for (const namespace of namespaces) delete namespace.anhedral_name;
    if (Array.isArray(cloudflare.d1_databases) && cloudflare.d1_databases.length) {
      databaseConsumers.push(target.id);
      if (cloudflare.d1_databases.some((database) => database.migrations_dir))
        migrationCandidates.push(target.id);
      for (const database of cloudflare.d1_databases) {
        if (database.migrations_dir && database.migrations_dir !== '../../packages/db/drizzle')
          blockers.push(
            `${target.id}: preserve the shared packages/db/drizzle migration directory.`,
          );
      }
    }
    if (existsSync(path.join(directory, 'open-next.config.ts')))
      blockers.push(`${target.id}: verify OpenNext deployment support before migration.`);
    if (cloudflare.queues || cloudflare.pipelines)
      blockers.push(
        `${target.id}: preserve legacy delivery for queue dead-letter recovery and Basin provisioning until Void supports these resource contracts.`,
      );
    const configuredBinding = (field: string): string | false => {
      const entries = cloudflare[field];
      return Array.isArray(entries) && typeof entries[0]?.binding === 'string'
        ? entries[0].binding
        : false;
    };
    const files = [...new Set(localEnvironmentFiles(root, directory))].sort();
    const filesToMigrate =
      project.deliveryEngine === 'void'
        ? files.filter((file) => file !== `${target.directory}/.env`)
        : files;
    if (filesToMigrate.length)
      environmentMigrations.push({ target: target.id, files: filesToMigrate });
    // Narrow inference is a convenience, not an isolation guarantee. Managed
    // auth and checked-in migrations can require bindings despite overrides.
    return {
      target: target.id,
      directory: target.directory,
      command: ['pnpm', 'exec', 'void', 'deploy', '--platform', 'cloudflare'],
      config: {
        target: 'cloudflare',
        inference: {
          scanDirs: ['src', 'app', 'lib'],
          bindings: {
            db: configuredBinding('d1_databases'),
            kv: configuredBinding('kv_namespaces'),
            storage: configuredBinding('r2_buckets'),
            ai:
              cloudflare.ai && typeof (cloudflare.ai as { binding?: unknown }).binding === 'string'
                ? (cloudflare.ai as { binding: string }).binding
                : false,
            sandbox: false,
          },
        },
        cloudflare,
      },
      committedFiles: ['void.config.ts', 'void.lock.json'],
      generatedFiles: ['.void/', '.void-wrangler.jsonc'],
      bindingEvidence: 'generated-output-validation-required' as const,
    };
  });
  let migrationOwner =
    options.migrationOwner ?? (migrationCandidates.length === 1 ? migrationCandidates[0] : null);
  if (migrationOwner && !databaseConsumers.includes(migrationOwner))
    throw new Error('The D1 migration owner must be a database-consuming deployment target.');
  if (databaseConsumers.length && !migrationOwner)
    blockers.push('Select one D1 migration owner before enabling deployment migrations.');
  if (options.migrationOwner && !migrationCandidates.includes(options.migrationOwner)) {
    blockers.push(
      `${options.migrationOwner}: configure the shared D1 migration directory before activation.`,
    );
    migrationOwner = null;
  }
  for (const target of targets) {
    if (target.target !== migrationOwner) {
      const databases = target.config.cloudflare.d1_databases;
      if (Array.isArray(databases))
        for (const database of databases) delete database.migrations_dir;
    }
  }
  if (environmentMigrations.length)
    blockers.push(
      'Map existing local environment files explicitly; Void does not load Anhedral package/app dotenv conventions.',
    );
  return {
    engine: 'void' as const,
    version: VOID_VERSION,
    node: VOID_NODE_ENGINE,
    projectId: project.id,
    accountId: project.accountId,
    ownership: project.ownership,
    mutation: false as const,
    targets,
    migrationOwner,
    databaseConsumers,
    provisioning: {
      writer: 'void' as const,
      concurrency: 1,
      existingResourceIds: 'preserve' as const,
      lockHandoff: 'commit-before-another-machine-or-ci' as const,
    },
    environment: {
      localFile: 'one .env per Void project root',
      schema: 'env.ts',
      filesToReview: environmentMigrations,
      secretTransport: 'protected-file-or-stdin',
      buildPublicPrefix: 'VITE_',
      frameworkPublicVariables: 'explicit-mapping-required',
      migrationCredentials: 'separate-from-runtime-secrets',
      sourceValuesRead: false,
    },
    blockers,
    activation:
      project.deliveryEngine === 'void'
        ? ('configured' as const)
        : ('runtime-validation-required' as const),
    acceptance: [
      'Install the exact Void pin and build/preview Vinext with its supported adapter.',
      'Use the Markdown documentation and agent instructions bundled with the installed pin.',
      'Verify shared-package bindings, one migration owner, and resource reuse from a fresh checkout.',
      'Verify database consumers never apply migrations, including when a conventional migrations directory exists.',
      'Compare generated bindings with registry capabilities, including auth and migration-driven requirements.',
      'Provision and deploy through Void without running Anhedral resource creation in parallel.',
      'Configure secrets through Void without placing values in command arguments or release evidence.',
      'Verify local .env, process build values, remote server secrets and framework public variable mapping separately.',
      'Correlate the exact source commit and Void deployment with independent provider state.',
      'Record provisioned, uploaded, activated and ready independently; readiness is not product verification.',
      'Verify private Access policies and private R2 before accepting the release.',
      'Exercise failed deployment, rollback, and the live multi-interface product flows.',
    ],
  };
}
