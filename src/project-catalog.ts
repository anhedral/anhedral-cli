import {
  existsSync,
  lstatSync,
  openSync,
  closeSync,
  mkdirSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';
import path from 'node:path';
import { hostname } from 'node:os';
import { z } from 'zod';
import { projectSnapshot, readCatalogSourceIdentity } from './catalog-snapshot.js';
import type { Dashboard, DashboardTool, ToolArguments } from './catalog-model.js';
import { readBoundedFile } from './bounded-file.js';

export type CatalogErrorCode =
  | 'CATALOG_BUSY'
  | 'CATALOG_INVALID'
  | 'PROJECT_NOT_FOUND'
  | 'PROJECT_UNAVAILABLE'
  | 'INVALID_INPUT'
  | 'CATALOG_FAILURE';
const catalogErrors: Record<CatalogErrorCode, { message: string; nextAction: string }> = {
  CATALOG_BUSY: {
    message: 'The catalog is busy. Retry when the other operation has finished.',
    nextAction:
      'If an operation was interrupted, inspect the catalog lock and use the local recover-catalog-lock command.',
  },
  CATALOG_INVALID: {
    message: 'Project catalog is invalid. Restore the local catalog before continuing.',
    nextAction: 'Restore a valid catalog backup; no project files were changed.',
  },
  PROJECT_NOT_FOUND: {
    message: 'This project is not in your catalog.',
    nextAction: 'Refresh the project list and select a registered project.',
  },
  PROJECT_UNAVAILABLE: {
    message: 'Registered source is unavailable.',
    nextAction: 'Restore the registered source directory, then refresh.',
  },
  INVALID_INPUT: {
    message: 'The catalog input is invalid.',
    nextAction: 'Check the project ID and requested input, then retry.',
  },
  CATALOG_FAILURE: {
    message: 'The catalog operation could not complete.',
    nextAction: 'Check local catalog access and retry.',
  },
};
export class CatalogError extends Error {
  constructor(readonly code: CatalogErrorCode) {
    super(catalogErrors[code].message);
  }
}
export function catalogFailure(error: unknown) {
  const code = error instanceof CatalogError ? error.code : 'CATALOG_FAILURE';
  return { code, ...catalogErrors[code] };
}

const entrySchema = z
  .object({
    id: z.string().uuid(),
    root: z.string().min(1),
    name: z.string().trim().min(1).max(80),
    updatedAt: z.string().datetime(),
    sourceIdentity: z.string().uuid().optional(),
  })
  .strict();
// Keep the private on-disk catalog format compatible with existing registrations.
const catalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    sites: z.array(entrySchema).max(200),
    view: z.enum(['list', 'grid']),
    importedCatalogs: z
      .array(z.string().regex(/^[a-f0-9]{64}$/))
      .max(64)
      .optional(),
  })
  .strict();
export type ProjectEntry = z.infer<typeof entrySchema>;
type Catalog = z.infer<typeof catalogSchema>;
const projectId = z.string().uuid();
const toolSchema = z.enum([
  'list_projects',
  'get_project',
  'rename_project',
  'forget_project',
  'set_view',
]);
const inputSchemas = {
  list_projects: z.object({}).strict(),
  get_project: z.object({ id: projectId }).strict(),
  rename_project: z.object({ id: projectId, name: z.string().trim().min(1).max(80) }).strict(),
  forget_project: z.object({ id: projectId }).strict(),
  set_view: z.object({ view: z.enum(['list', 'grid']) }).strict(),
};
const CATALOG_LIMIT = 1024 * 1024;

export class ProjectStore {
  readonly directory: string;
  readonly file: string;
  constructor(directory: string) {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    this.directory = realpathSync(directory);
    this.file = path.join(this.directory, 'sites.json');
  }
  private read() {
    if (!existsSync(this.file))
      return { schemaVersion: 1 as const, sites: [] as ProjectEntry[], view: 'list' as const };
    try {
      const value = catalogSchema.parse(
        JSON.parse(readBoundedFile(this.file, CATALOG_LIMIT).toString('utf8')),
      );
      if (new Set(value.sites.map((site) => site.id)).size !== value.sites.length)
        throw new Error();
      return value;
    } catch {
      throw new CatalogError('CATALOG_INVALID');
    }
  }
  private write(catalog: z.infer<typeof catalogSchema>) {
    const temporary = path.join(this.directory, `${randomUUID()}.tmp`);
    const bytes = JSON.stringify(catalogSchema.parse(catalog), null, 2) + '\n';
    if (Buffer.byteLength(bytes) > CATALOG_LIMIT)
      throw new Error('Project catalog exceeds its storage limit.');
    writeFileSync(temporary, bytes, {
      mode: 0o600,
      flag: 'wx',
    });
    try {
      renameSync(temporary, this.file);
    } finally {
      rmSync(temporary, { force: true });
    }
  }
  /** Merge an earlier private catalog once, without altering it or resurrecting forgotten apps. */
  importLegacy(source: ProjectStore): void {
    if (source.directory === this.directory) return;
    const identity = createHash('sha256').update(source.directory).digest('hex');
    if (this.read().importedCatalogs?.includes(identity)) return;
    const previous = source.read();
    this.mutate((catalog) => {
      if (catalog.importedCatalogs?.includes(identity)) return;
      const wasEmpty = catalog.sites.length === 0;
      for (const entry of previous.sites) {
        const existing = catalog.sites.find((site) => site.id === entry.id);
        if (
          existing &&
          (existing.root !== entry.root || existing.sourceIdentity !== entry.sourceIdentity)
        )
          throw new CatalogError('CATALOG_INVALID');
        if (
          !existing &&
          !catalog.sites.some(
            (site) => site.root === entry.root && site.sourceIdentity === entry.sourceIdentity,
          )
        )
          catalog.sites.push(entry);
      }
      if (wasEmpty) catalog.view = previous.view;
      catalog.importedCatalogs = [...(catalog.importedCatalogs ?? []), identity];
    });
  }
  register(root: string, displayName?: string): string {
    const resolved = realpathSync(root);
    if (!statSync(resolved).isDirectory()) throw new Error('Choose a project directory.');
    // Registration is an operator action; MCP tools cannot add arbitrary filesystem paths.
    let packageName: string;
    try {
      packageName = z
        .string()
        .min(1)
        .parse(
          JSON.parse(
            readBoundedFile(path.join(resolved, 'package.json'), 1024 * 1024).toString('utf8'),
          ).name,
        );
    } catch {
      throw new Error('Choose a project with a valid package.json name.');
    }
    const sourceIdentity = readCatalogSourceIdentity(resolved);
    return this.mutate((catalog) => {
      const previous = catalog.sites.find(
        (site) => site.root === resolved && site.sourceIdentity === sourceIdentity,
      );
      if (previous) return previous.id;
      const entry = entrySchema.parse({
        id: randomUUID(),
        root: resolved,
        name: displayName ?? packageName,
        updatedAt: new Date().toISOString(),
        ...(sourceIdentity ? { sourceIdentity } : {}),
      });
      catalog.sites.push(entry);
      return entry.id;
    });
  }
  private mutate<T>(operation: (catalog: Catalog) => T): T {
    const lock = path.join(this.directory, 'sites.lock');
    let descriptor: number;
    try {
      if (existsSync(path.join(this.directory, 'sites.recovery.lock'))) throw new Error();
      descriptor = openSync(lock, 'wx', 0o600);
    } catch {
      throw new CatalogError('CATALOG_BUSY');
    }
    try {
      writeFileSync(
        descriptor,
        JSON.stringify({
          schemaVersion: 1,
          pid: process.pid,
          host: hostname(),
          token: randomUUID(),
          createdAt: new Date().toISOString(),
        }),
      );
      if (existsSync(path.join(this.directory, 'sites.recovery.lock')))
        throw new CatalogError('CATALOG_BUSY');
      const catalog = this.read();
      const result = operation(catalog);
      this.write(catalog);
      return result;
    } finally {
      closeSync(descriptor);
      rmSync(lock, { force: true });
    }
  }

  /** Explicit local operator recovery only; uncertain ownership never removes a lock. */
  recoverCatalogLock(): { recovered: boolean } {
    const guard = path.join(this.directory, 'sites.recovery.lock');
    let descriptor: number;
    try {
      descriptor = openSync(guard, 'wx', 0o600);
    } catch {
      throw new CatalogError('CATALOG_BUSY');
    }
    try {
      const lock = path.join(this.directory, 'sites.lock');
      if (!existsSync(lock)) return { recovered: false };
      let owner;
      try {
        if (!lstatSync(lock).isFile() || lstatSync(lock).isSymbolicLink()) throw new Error();
        owner = z
          .object({
            schemaVersion: z.literal(1),
            pid: z.number().int().positive(),
            host: z.string(),
            token: z.string().uuid(),
            createdAt: z.string().datetime(),
          })
          .strict()
          .parse(JSON.parse(readBoundedFile(lock, 4096).toString('utf8')));
      } catch {
        throw new CatalogError('CATALOG_BUSY');
      }
      if (owner.host !== hostname()) throw new CatalogError('CATALOG_BUSY');
      try {
        process.kill(owner.pid, 0);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'ESRCH') {
          rmSync(lock);
          return { recovered: true };
        }
        throw new CatalogError('CATALOG_BUSY');
      }
      throw new CatalogError('CATALOG_BUSY');
    } finally {
      closeSync(descriptor);
      rmSync(guard, { force: true });
    }
  }

  context(id: string) {
    const site = this.read().sites.find((site) => site.id === id);
    if (!site) throw new CatalogError('PROJECT_NOT_FOUND');
    try {
      if (
        realpathSync(site.root) !== site.root ||
        site.sourceIdentity !== readCatalogSourceIdentity(site.root)
      )
        throw new Error();
    } catch {
      throw new CatalogError('PROJECT_UNAVAILABLE');
    }
    return { id: site.id, name: site.name, directory: site.root };
  }
  snapshot(selectedId: string | null = null): Dashboard {
    const catalog = this.read();
    return {
      projects: catalog.sites
        .map((entry) => projectSnapshot(entry, entry.id === selectedId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      selectedId,
      preferences: { view: catalog.view },
    };
  }
  call(tool: DashboardTool, raw: ToolArguments): Dashboard {
    let args: ToolArguments;
    try {
      args = inputSchemas[toolSchema.parse(tool)].parse(raw);
    } catch {
      throw new CatalogError('INVALID_INPUT');
    }
    if (tool === 'list_projects') return this.snapshot();
    if (tool === 'get_project') {
      if (!this.read().sites.some((site) => site.id === args.id))
        throw new CatalogError('PROJECT_NOT_FOUND');
      return this.snapshot(args.id!);
    }
    const selectedId = this.mutate((catalog) => {
      if (tool === 'set_view') {
        if (!args.view) throw new Error('Choose list or grid view.');
        catalog.view = args.view;
        return null;
      }
      const site = catalog.sites.find((site) => site.id === args.id);
      if (!site) throw new CatalogError('PROJECT_NOT_FOUND');
      if (tool === 'rename_project') {
        if (!args.name) throw new Error('Enter a project name.');
        site.name = args.name;
        site.updatedAt = new Date().toISOString();
        return site.id;
      }
      catalog.sites = catalog.sites.filter((entry) => entry.id !== site.id);
      return null;
    });
    return this.snapshot(selectedId);
  }
}
