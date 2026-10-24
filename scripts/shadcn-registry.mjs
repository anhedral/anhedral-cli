import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = path.join(root, 'assets/ui/official');
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const read = (name) => readFileSync(name, 'utf8');
export function analyzeSource(source, filename) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const imports = new Set(),
    functions = new Set(),
    variants = new Map(),
    browser = new Set();
  const publicValues = new Set(),
    publicTypes = new Set();
  const add = (name, value) => {
    if (!variants.has(name)) variants.set(name, new Set());
    variants.get(name).add(value);
  };
  function visit(node) {
    const exported = node.modifiers?.some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    );
    if (exported && (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name)
      publicValues.add(node.name.text);
    if (exported && (ts.isTypeAliasDeclaration(node) || ts.isInterfaceDeclaration(node)))
      publicTypes.add(node.name.text);
    if (exported && ts.isVariableStatement(node))
      for (const declaration of node.declarationList.declarations)
        if (ts.isIdentifier(declaration.name)) publicValues.add(declaration.name.text);
    if (ts.isExportDeclaration(node) && node.exportClause && ts.isNamedExports(node.exportClause))
      for (const entry of node.exportClause.elements)
        (entry.isTypeOnly || node.isTypeOnly ? publicTypes : publicValues).add(entry.name.text);
    if (
      ts.isExportAssignment(node) ||
      node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)
    )
      publicValues.add('default');
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      (ts.isArrowFunction(node.initializer) || ts.isFunctionExpression(node.initializer))
    )
      functions.add(node.name.text);
    if (ts.isPropertySignature(node) && node.type && ts.isUnionTypeNode(node.type))
      for (const type of node.type.types)
        if (ts.isLiteralTypeNode(type) && ts.isStringLiteral(type.literal))
          add(node.name.getText(file), type.literal.text);
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier))
      imports.add(node.moduleSpecifier.text);
    if (ts.isFunctionDeclaration(node) && node.name) functions.add(node.name.text);
    if (
      ts.isJsxAttribute(node) &&
      node.initializer &&
      ['variant', 'size', 'orientation', 'side', 'align', 'type', 'mode', 'collapsible'].includes(
        node.name.getText(file),
      )
    ) {
      if (ts.isStringLiteral(node.initializer)) add(node.name.getText(file), node.initializer.text);
    }
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(file) === 'variants' &&
      ts.isObjectLiteralExpression(node.initializer)
    )
      for (const option of node.initializer.properties)
        if (ts.isPropertyAssignment(option) && ts.isObjectLiteralExpression(option.initializer))
          for (const entry of option.initializer.properties)
            if (entry.name)
              add(
                option.name.getText(file).replaceAll('"', ''),
                entry.name.getText(file).replaceAll('"', ''),
              );
    if (
      ts.isIdentifier(node) &&
      [
        'window',
        'document',
        'HTMLElement',
        'HTMLInputElement',
        'HTMLDivElement',
        'ResizeObserver',
        'IntersectionObserver',
        'localStorage',
        'sessionStorage',
        'FileList',
        'DataTransfer',
      ].includes(node.text)
    )
      browser.add(node.text);
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(file);
      if (
        ['iframe', 'canvas', 'video', 'audio', 'form', 'input', 'select', 'textarea'].includes(tag)
      )
        browser.add('<' + tag + '>');
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return {
    exports: { values: [...publicValues].sort(), types: [...publicTypes].sort() },
    imports: [...imports].sort(),
    functions: [...functions].sort(),
    variants: Object.fromEntries(
      [...variants].sort().map(([key, values]) => [key, [...values].sort()]),
    ),
    browser: [...browser].sort(),
  };
}
function stringNames(filename) {
  const file = ts.createSourceFile(
      filename,
      read(filename),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    ),
    names = [];
  function visit(node) {
    if (
      ts.isPropertyAssignment(node) &&
      node.name.getText(file) === 'name' &&
      ts.isStringLiteral(node.initializer)
    )
      names.push(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(file);
  return names;
}
export function loadOfficialRegistry() {
  return JSON.parse(
    gunzipSync(readFileSync(path.join(destination, 'inventory.json.gz')), {
      maxOutputLength: 32 * 1024 * 1024,
    }),
  );
}
/** Inputs include authored files, style tokens and transitive official registry dependencies. */
function itemFingerprint(inventory, style, name, visited = new Set()) {
  const item = inventory.registries[style]?.items.find((entry) => entry.name === name);
  if (!item) return null;
  const key = style + '/' + name;
  if (visited.has(key)) return 'cycle:' + key;
  const next = new Set(visited);
  next.add(key);
  const tokenStyle = style.replace(/^(?:base|aria|radix)-/, '');
  const styleSheet = [
    'registry:ui',
    'registry:block',
    'registry:example',
    'registry:component',
  ].includes(item.type)
    ? inventory.styleSheets['style-' + tokenStyle + '.css']?.sha256
    : undefined;
  return sha256(
    JSON.stringify({
      item,
      sources: (item.files ?? []).map((file) => ({
        path: file.path,
        source: file.source,
        sha256: inventory.sources[file.source]?.sha256,
      })),
      styleSheet,
      dependencies: (item.registryDependencies ?? []).map((dependency) => ({
        name: dependency,
        fingerprint: itemFingerprint(inventory, style, dependency, next),
      })),
    }),
  );
}
export function reviewedInputs(inventory, itemKey) {
  const result = {};
  for (const [style, registry] of Object.entries(inventory.registries)) {
    for (const item of registry.items) {
      if (item.type + '/' + item.name !== itemKey) continue;
      result[style] = itemFingerprint(inventory, style, item.name);
    }
  }
  return result;
}
export function diffOfficialRegistry(before, after) {
  const added = [],
    removed = [],
    changed = [];
  const previous = new Map(),
    current = new Map();
  for (const [style, registry] of Object.entries(before.registries))
    for (const item of registry.items)
      previous.set(style + '/' + item.name, itemFingerprint(before, style, item.name));
  for (const [style, registry] of Object.entries(after.registries))
    for (const item of registry.items)
      current.set(style + '/' + item.name, itemFingerprint(after, style, item.name));
  for (const [key, hash] of current)
    if (!previous.has(key)) added.push(key);
    else if (previous.get(key) !== hash) changed.push(key);
  for (const key of previous.keys()) if (!current.has(key)) removed.push(key);
  return {
    from: before.source.commit,
    to: after.source.commit,
    added: added.sort(),
    removed: removed.sort(),
    changed: changed.sort(),
  };
}
export function validateCoverage(
  inventory,
  coverage,
  fileExists = (name) => existsSync(path.join(root, name)),
) {
  if (coverage.schemaVersion !== 1) throw Error('Unknown native registry coverage schema.');
  for (const [key, entry] of Object.entries(coverage.items)) {
    const expected = reviewedInputs(inventory, key);
    if (!Object.keys(expected).length)
      throw Error('Coverage refers to an unknown official item: ' + key);
    if (!['partial', 'ported', 'web-specific'].includes(entry.status) || !entry.reason?.trim())
      throw Error('Coverage requires a status and concrete reason: ' + key);
    if (!entry.tests?.length || !entry.nativeFiles?.length)
      throw Error('Coverage requires actual implementation and test paths: ' + key);
    for (const file of [...entry.tests, ...entry.nativeFiles])
      if (
        !/^(?:assets|tests)\/[a-zA-Z0-9_./-]+$/.test(file) ||
        file.split('/').includes('..') ||
        !fileExists(file)
      )
        throw Error('Missing or unsafe coverage evidence: ' + file);
    if (entry.status === 'ported' || entry.status === 'web-specific') {
      if (
        JSON.stringify(Object.entries(entry.reviewedInputs ?? {}).sort()) !==
        JSON.stringify(Object.entries(expected).sort())
      )
        throw Error('Upstream inputs changed; native review must be renewed: ' + key);
    }
  }
}
export function registryChecklist(inventory, coverage) {
  validateCoverage(inventory, coverage);
  const styles = Object.keys(inventory.registries).sort();
  const groups = new Map();
  for (const [style, registry] of Object.entries(inventory.registries))
    for (const item of registry.items) {
      const key = item.type + '/' + item.name;
      if (!groups.has(key)) groups.set(key, { name: item.name, type: item.type, styles: [] });
      groups.get(key).styles.push(style);
    }
  const rows = [...groups.values()].sort((a, b) =>
    (a.type + '/' + a.name).localeCompare(b.type + '/' + b.name),
  );
  let text = `# Official shadcn registry → Expo\n\nPinned source: [shadcn-ui/ui at ${inventory.source.commit}](https://github.com/shadcn-ui/ui/tree/${inventory.source.commit}/apps/v4/registry). Published metadata retrieved ${inventory.retrieved}; every response has its own SHA-256. Source and published metadata are recorded separately because publication can lag source. Third-party registries are outside this official snapshot.\n\n**${styles.length} registries, ${Object.values(inventory.registries).reduce((n, r) => n + r.items.length, 0)} style/item entries, ${rows.length} distinct type/name pairs, ${Object.keys(inventory.sources).length} referenced source files.** A matching component name does not establish variant, example or block parity. Only reviewed coverage entries may be marked ported. Device acceptance is separate.\n\n## Maintenance model\n\nKeep a complete, pinned upstream source mirror and published metadata snapshot for review. Maintain the Expo source as a separate native overlay. Preserve upstream web implementations and CLI behavior rather than manually editing every web copy or forking CLI internals. Anhedral CLI can supply both outputs while the upstream mirror stays outside its shipped starter payload. No new remote fork is implied by taking a local snapshot.\n\nFor each upstream update, compare item/file hashes, public APIs, discovered variants, examples and dependencies. Refresh the web baseline from upstream; invalidate any native coverage whose reviewed inputs changed. Port and test the native changes before marking them complete. A successful upstream merge is not evidence that a new feature works on Expo. Device acceptance remains separately recorded.\n\nRefresh a clean upstream checkout with \`node scripts/shadcn-registry.mjs --snapshot /absolute/path/to/shadcn-ui\`, regenerate with \`pnpm native-ui:registry:docs\`, and compare a retained previous snapshot with \`pnpm native-ui:registry -- --diff /absolute/path/to/previous-inventory.json.gz\`. Normal checks are offline. Reviewed native coverage includes source, style and transitive registry dependency fingerprints, so changed inputs cannot retain a ported status silently.\n\n## Registry coverage\n\n| Registry | Published items | Metadata SHA-256 |\n| --- | ---: | --- |\n`;
  for (const style of styles)
    text += `| ${style} | ${inventory.registries[style].items.length} | \`${inventory.registries[style].sha256}\` |\n`;
  text +=
    '\n## Item checklist\n\nEvery row applies to all listed registries. The machine inventory retains each separate style/item, dependency, file, source hash, discovered variant, function/example and browser API. “Pending” means not yet completed; it is never an implicit web-only exemption.\n\n| Item | Type | Registries | Expo status | Evidence / web-specific adaptation |\n| --- | --- | --- | --- | --- |\n';
  for (const item of rows) {
    const entry = coverage.items[item.type + '/' + item.name];
    text += `| ${item.name} | ${item.type.replace('registry:', '')} | ${item.styles.sort().join(', ')} | ${entry?.status ?? 'pending'} | ${entry?.reason ?? 'Needs item, variant and dependency review.'} |\n`;
  }
  text +=
    '\n## Unresolved upstream registry references\n\nThese upstream metadata gaps remain visible; they are not silently dropped or treated as Expo implementations.\n\n| Registry | Item | Missing registry dependency |\n| --- | --- | --- |\n';
  for (const entry of inventory.unresolvedDependencies ?? [])
    text += `| ${entry.style} | ${entry.item} | ${entry.dependency} |\n`;
  text +=
    '\n## Web-specific checklist\n\n| Browser feature | Native policy | Acceptance |\n| --- | --- | --- |\n';
  for (const item of coverage.webSpecific)
    text += `| ${item.feature} | ${item.adaptation} | ${item.status} |\n`;
  return text;
}
async function snapshot(source, cache) {
  const sourceRoot = path.resolve(source),
    registryRoot = path.join(sourceRoot, 'apps/v4/registry');
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: sourceRoot,
    encoding: 'utf8',
  }).trim();
  if (
    execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
      cwd: sourceRoot,
      encoding: 'utf8',
    }).trim()
  )
    throw Error('Upstream source must be clean.');
  const bases = stringNames(path.join(registryRoot, 'bases.ts')),
    styles = stringNames(path.join(registryRoot, 'styles.tsx'));
  const targets = bases
    .flatMap((base) => styles.map((style) => base + '-' + style))
    .concat(['new-york-v4', 'new-york', 'default'])
    .sort();
  const result = {
    schemaVersion: 1,
    retrieved: new Date().toISOString().slice(0, 10),
    source: { repository: 'https://github.com/shadcn-ui/ui', commit },
    registries: {},
    sources: {},
    styleSheets: {},
    auxiliary: {},
  };
  const legacySources = new Map();
  for (const legacy of ['default', 'new-york'])
    for (const filename of readdirSync(
      path.join(sourceRoot, 'apps/v4/public/r/styles', legacy),
    ).filter((n) => n.endsWith('.json'))) {
      const item = JSON.parse(
        read(path.join(sourceRoot, 'apps/v4/public/r/styles', legacy, filename)),
      );
      for (const file of item.files ?? [])
        if (file.content)
          legacySources.set(
            file.path.startsWith('registry/') ? file.path : 'registry/' + legacy + '/' + file.path,
            { source: file.content, origin: 'apps/v4/public/r/styles/' + legacy + '/' + filename },
          );
    }
  for (const style of targets) {
    const url = `https://ui.shadcn.com/r/styles/${style}/registry.json`;
    const cacheFile = cache && path.join(cache, style + '-registry.json');
    let body;
    if (cacheFile && existsSync(cacheFile)) body = read(cacheFile);
    else {
      const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw Error(`${url}: ${response.status}`);
      body = await response.text();
    }
    const registry = JSON.parse(body);
    if (!Array.isArray(registry.items) || !registry.items.length)
      throw Error('Empty registry ' + style);
    const seen = new Set();
    for (const item of registry.items) {
      if (seen.has(item.name)) throw Error('Duplicate item ' + style + '/' + item.name);
      seen.add(item.name);
      for (const file of item.files ?? []) {
        if (
          !/^registry\/[a-z0-9-]+\//.test(file.path) ||
          file.path.split('/').some((part) => ['..', '.', ''].includes(part)) ||
          file.path.includes('\\')
        )
          throw Error('Unsafe registry source path: ' + file.path);
        let relative = file.path.replace(
          /^registry\/(base|radix|aria)-[^/]+\//,
          'apps/v4/registry/bases/$1/',
        );
        if (relative.startsWith('registry/')) relative = 'apps/v4/' + relative;
        const legacy = legacySources.get(file.path),
          full = path.join(sourceRoot, relative);
        let content, origin;
        if (existsSync(full)) {
          content = read(full);
          origin = relative;
        } else if (legacy) {
          content = legacy.source;
          origin = legacy.origin + '#' + file.path;
        } else if (file.content) {
          content = file.content;
          origin = url + '#' + file.path;
        } else throw Error(`Unresolved official source ${style}/${item.name}: ${file.path}`);
        const key = origin;
        if (!result.sources[key])
          result.sources[key] = { sha256: sha256(content), ...analyzeSource(content, file.path) };
        file.source = key;
        delete file.content;
      }
    }
    result.registries[style] = { url, sha256: sha256(body), items: registry.items };
  }
  result.unresolvedDependencies = Object.entries(result.registries).flatMap(([style, registry]) =>
    registry.items.flatMap((item) =>
      (item.registryDependencies ?? [])
        .filter((dependency) => !registry.items.some((candidate) => candidate.name === dependency))
        .map((dependency) => ({ style, item: item.name, dependency })),
    ),
  );
  for (const name of readdirSync(path.join(registryRoot, 'styles')).filter((n) =>
    /^style-.*\.css$/.test(n),
  )) {
    const content = read(path.join(registryRoot, 'styles', name));
    result.styleSheets[name] = { sha256: sha256(content), content };
  }
  for (const name of ['config.json', 'index.json', 'themes.css']) {
    const file = path.join(sourceRoot, 'apps/v4/public/r', name);
    result.auxiliary[name] = { sha256: sha256(readFileSync(file)) };
  }
  for (const folder of ['themes', 'colors', 'templates', 'icons']) {
    const folderRoot = path.join(sourceRoot, 'apps/v4/public/r', folder);
    const walk = (directory) => {
      for (const file of readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, file.name);
        if (file.isDirectory()) walk(full);
        else
          result.auxiliary[path.relative(path.join(sourceRoot, 'apps/v4/public/r'), full)] = {
            sha256: sha256(readFileSync(full)),
          };
      }
    };
    walk(folderRoot);
  }
  mkdirSync(destination, { recursive: true });
  writeFileSync(
    path.join(destination, 'inventory.json.gz'),
    gzipSync(JSON.stringify(result), { level: 9 }),
  );
  console.log(
    `Pinned ${targets.length} official registries and ${Object.keys(result.sources).length} referenced source files at ${commit}.`,
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const diffIndex = process.argv.indexOf('--diff');
  if (diffIndex >= 0) {
    if (!process.argv[diffIndex + 1])
      throw Error('--diff requires a previous inventory.json.gz snapshot.');
    const previous = JSON.parse(
      gunzipSync(readFileSync(process.argv[diffIndex + 1]), { maxOutputLength: 32 * 1024 * 1024 }),
    );
    console.log(JSON.stringify(diffOfficialRegistry(previous, loadOfficialRegistry()), null, 2));
  } else {
    const index = process.argv.indexOf('--snapshot');
    if (index >= 0) {
      if (!process.argv[index + 1]) throw Error('--snapshot requires an upstream source checkout.');
      await snapshot(
        process.argv[index + 1],
        process.argv.includes('--cache')
          ? process.argv[process.argv.indexOf('--cache') + 1]
          : undefined,
      );
    } else {
      const inventory = loadOfficialRegistry(),
        coverage = JSON.parse(read(path.join(destination, 'coverage.json')));
      const output = registryChecklist(inventory, coverage);
      if (process.argv.includes('--write'))
        writeFileSync(path.join(root, 'docs/native-registry.md'), output);
      else if (read(path.join(root, 'docs/native-registry.md')) !== output)
        throw Error('Official registry checklist is stale.');
    }
  }
}
