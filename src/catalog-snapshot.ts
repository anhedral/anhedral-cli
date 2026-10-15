import { existsSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { readBoundedFile } from './bounded-file.js';
import { inspectApplication } from './project-inspector.js';
import { STANDARD_PRODUCTS } from './stack-registry.js';
import type { ProjectSummary } from './catalog-model.js';
import { z } from 'zod';
import type { ProjectEntry } from './project-catalog.js';

/** List views read only two bounded source manifests; detailed evidence is opt-in by ID. */
export function projectSnapshot(entry: ProjectEntry, detail = false): ProjectSummary {
  const summary: ProjectSummary = {
    id: entry.id,
    name: entry.name,
    sourceName: '',
    updatedAt: entry.updatedAt,
    products: [],
    status: 'source',
  };
  try {
    if (entry.sourceIdentity !== readCatalogSourceIdentity(entry.root))
      return {
        ...summary,
        status: 'unavailable',
        message:
          'This directory contains a different app. Select its new catalog entry or restore the registered source.',
      };
    if (realpathSync(entry.root) !== entry.root) throw new Error();
    const read = (relative: string) => {
      const file = path.join(entry.root, relative);
      if (!realpathSync(file).startsWith(entry.root + path.sep)) throw new Error();
      return JSON.parse(readBoundedFile(file, 256 * 1024).toString('utf8')) as Record<
        string,
        unknown
      >;
    };
    const manifest = read('package.json');
    if (
      typeof manifest.name !== 'string' ||
      !/^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(manifest.name) ||
      manifest.name.length > 214
    )
      throw new Error();
    summary.sourceName = manifest.name;
    if (existsSync(path.join(entry.root, 'anhedral.setup.json'))) {
      const setup = read('anhedral.setup.json');
      summary.products = Array.isArray(setup.products)
        ? setup.products
            .filter(
              (p): p is (typeof STANDARD_PRODUCTS)[number] =>
                typeof p === 'string' &&
                STANDARD_PRODUCTS.includes(p as (typeof STANDARD_PRODUCTS)[number]),
            )
            .slice(0, 100)
        : [];
    }
  } catch {
    summary.status = 'unavailable';
    summary.message =
      'Source summary is unavailable. Restore or inspect the registered source, then refresh.';
  }
  if (detail) {
    try {
      if (realpathSync(entry.root) !== entry.root) throw new Error();
      summary.inspection = inspectApplication(entry.root);
      summary.status =
        summary.status !== 'unavailable' &&
        summary.inspection.targets.data.some(
          (target) => target.latestAttempt || target.lastSuccessful,
        )
          ? 'recorded'
          : summary.status;
    } catch {
      summary.status = 'unavailable';
      summary.message = 'Registered source is unavailable. Restore the directory, then refresh.';
    }
  }
  return summary;
}

export function readCatalogSourceIdentity(root: string): string | undefined {
  const file = path.join(root, 'anhedral.app.json');
  if (!existsSync(file)) return undefined;
  const value = z
    .object({ schemaVersion: z.literal(1), id: z.string().uuid() })
    .strict()
    .parse(JSON.parse(readBoundedFile(file, 4096).toString('utf8')));
  return value.id;
}
