import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync, gunzipSync } from 'node:zlib';
import ts from 'typescript';
import { registryClassRecipes } from './registry-class-recipes.mjs';
import {
  collectRegistryPackageInputs,
  validateRegistryPackageInputs,
  registryPackageFingerprint,
} from './shadcn-package-inputs.mjs';

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
    browser = new Set(),
    unresolvedImports = new Set();
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
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    )
      imports.add(node.moduleSpecifier.text);
    if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require'))
    ) {
      const argument = node.arguments[0];
      if (
        argument &&
        (ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument))
      )
        imports.add(argument.text);
      else unresolvedImports.add(argument?.getText(file) ?? '<missing module>');
    }
    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      ts.isStringLiteral(node.argument.literal)
    )
      imports.add(node.argument.literal.text);
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
  const classRecipes = registryClassRecipes(file);
  return {
    ...(Object.keys(classRecipes).length ? { classRecipes } : {}),
    exports: { values: [...publicValues].sort(), types: [...publicTypes].sort() },
    imports: [...imports].sort(),
    ...(unresolvedImports.size ? { unresolvedImports: [...unresolvedImports].sort() } : {}),
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
/** Global theme formulas are upstream inputs even when a sparse checkout omits the file. */
export function collectStyleGlobals(sourceRoot, commit) {
  if (!/^[a-f0-9]{40}$/.test(commit))
    throw Error('A full upstream commit is required for style globals.');
  const source = 'apps/v4/app/globals.css';
  const content = execFileSync('git', ['show', commit + ':' + source], {
    cwd: sourceRoot,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  });
  return { [source]: { sha256: sha256(content), content } };
}
export function validateStyleGlobals(inventory) {
  const globals = inventory.styleGlobals;
  if (!globals || Object.keys(globals).length !== 1 || !globals['apps/v4/app/globals.css'])
    throw Error('Official registry global style inputs are missing; refresh the snapshot.');
  for (const [name, input] of Object.entries(globals))
    if (
      !input ||
      typeof input.content !== 'string' ||
      !input.content.length ||
      sha256(input.content) !== input.sha256
    )
      throw Error('Official registry global style integrity failed: ' + name);
}
export function loadOfficialRegistry() {
  const inventory = JSON.parse(
    gunzipSync(readFileSync(path.join(destination, 'inventory.json.gz')), {
      maxOutputLength: 32 * 1024 * 1024,
    }),
  );
  validateStyleGlobals(inventory);
  validateRegistryPackageInputs(inventory.packageInputs, inventory.source.commit, inventory);
  return inventory;
}
/** Include locally imported companion source that published registry entries omit. */
export function sourceDependencies(inventory, origin, visited = new Set()) {
  if (visited.has(origin)) return [];
  const next = new Set(visited);
  next.add(origin);
  return (inventory.sources[origin]?.relativeSources ?? []).map((source) => ({
    source,
    sha256: inventory.sources[source]?.sha256,
    dependencies: sourceDependencies(inventory, source, next),
  }));
}
/** Inputs include authored files, local companions, style tokens and registry dependencies. */
function itemFingerprint(inventory, style, name, visited = new Set()) {
  const item = inventory.registries[style]?.items.find((entry) => entry.name === name);
  if (!item) return null;
  const key = style + '/' + name;
  if (visited.has(key)) return 'cycle:' + key;
  const next = new Set(visited);
  next.add(key);
  const tokenStyle = style.replace(/^(?:base|aria|radix)-/, '');
  const styledItem = [
    'registry:ui',
    'registry:block',
    'registry:example',
    'registry:component',
  ].includes(item.type);
  const styleSheet = styledItem
    ? inventory.styleSheets['style-' + tokenStyle + '.css']?.sha256
    : undefined;
  const usesStyles = styledItem && (!!styleSheet || style === 'new-york-v4');
  return sha256(
    JSON.stringify({
      item,
      sources: (item.files ?? []).map((file) => ({
        path: file.path,
        source: file.source,
        sha256: inventory.sources[file.source]?.sha256,
        ...(inventory.sources[file.source]?.relativeSources?.length
          ? { relativeSources: sourceDependencies(inventory, file.source) }
          : {}),
      })),
      styleSheet,
      packageInputs: registryPackageFingerprint(inventory, item, usesStyles),
      ...(usesStyles && inventory.styleGlobals
        ? {
            styleGlobals: Object.fromEntries(
              Object.entries(inventory.styleGlobals)
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([name, input]) => [name, input.sha256]),
            ),
          }
        : {}),
      ...(inventory.registries[style]?.additionalEndpoints?.[name]
        ? { publishedEndpoint: inventory.registries[style].additionalEndpoints[name] }
        : {}),
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
/** Public exports and variants are tracked even while a full item remains pending. */
export function nativeApiReport(inventory, nativeRegistry) {
  const names = [
    ...new Set(
      Object.values(inventory.registries).flatMap((registry) =>
        registry.items.filter((item) => item.type === 'registry:ui').map((item) => item.name),
      ),
    ),
  ].sort();
  return Object.fromEntries(
    names.map((name) => {
      const origins = new Set();
      for (const registry of Object.values(inventory.registries)) {
        const item = registry.items.find(
          (item) => item.type === 'registry:ui' && item.name === name,
        );
        for (const file of item?.files ?? []) origins.add(file.source);
      }
      const values = [
        ...new Set(
          [...origins].flatMap((source) => inventory.sources[source].exports?.values ?? []),
        ),
      ].sort();
      const types = [
        ...new Set(
          [...origins].flatMap((source) => inventory.sources[source].exports?.types ?? []),
        ),
      ].sort();
      const variants = {};
      for (const source of origins)
        for (const [key, options] of Object.entries(inventory.sources[source].variants)) {
          variants[key] ??= [];
          variants[key] = [...new Set([...variants[key], ...options])].sort();
        }
      const native = [
        ...(nativeRegistry.components.find((item) => item.id === name)?.exports ??
          nativeRegistry.supportModules?.find((item) => item.file === name)?.exports ??
          []),
      ];
      if (name === 'sonner' && native.includes('SonnerToaster')) native.push('Toaster');
      return [
        name,
        {
          upstreamValues: values,
          upstreamTypes: types,
          upstreamVariants: variants,
          nativeValues: native.sort(),
          missingValues: values.filter((value) => !native.includes(value)),
          reviewedInputs: reviewedInputs(inventory, 'registry:ui/' + name),
        },
      ];
    }),
  );
}
export function incompleteNativeItems(inventory, coverage) {
  const keys = [
    ...new Set(
      Object.values(inventory.registries).flatMap((registry) =>
        registry.items.map((item) => item.type + '/' + item.name),
      ),
    ),
  ].sort();
  return keys.filter((key) => !['ported', 'web-specific'].includes(coverage.items[key]?.status));
}
export function validateApiPolicy(report, policy) {
  for (const [key, entry] of Object.entries(policy.exports)) {
    const [component, name] = key.split('/');
    if (
      !report[component]?.upstreamValues.includes(name) ||
      entry.classification !== 'web-specific-export' ||
      !entry.reason?.trim()
    )
      throw Error('Unknown or invalid browser-export policy: ' + key);
    for (const file of [...(entry.nativeFiles ?? []), ...(entry.tests ?? [])])
      if (file.split('/').includes('..') || !existsSync(path.join(root, file)))
        throw Error('Missing native alternative evidence: ' + file);
    if (!entry.nativeFiles?.length || !entry.tests?.length)
      throw Error('Browser export requires a native alternative and tests: ' + key);
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
  let text = `# Official shadcn registry → Expo\n\nPinned source: [shadcn-ui/ui at ${inventory.source.commit}](https://github.com/shadcn-ui/ui/tree/${inventory.source.commit}/apps/v4/registry). Inventory assembled ${inventory.retrieved}; registry index responses and additional Git-published endpoints retain separate dates, origins and SHA-256 values. Source and published metadata are recorded separately because publication can lag source. Third-party registries are outside this official snapshot.\n\n**${styles.length} registries, ${Object.values(inventory.registries).reduce((n, r) => n + r.items.length, 0)} style/item entries, ${rows.length} distinct type/name pairs, ${Object.keys(inventory.sources).length} referenced source files.** A matching component name does not establish variant, example or block parity. Only reviewed coverage entries may be marked ported. Device acceptance is separate. The snapshot also retains eight component stylesheets and the pinned upstream global stylesheet, including its theme metric formulas.\n\n## Maintenance model\n\nKeep a complete, pinned upstream source mirror and published metadata snapshot for review. Maintain the Expo source as a separate native overlay. Preserve upstream web implementations and CLI behavior rather than manually editing every web copy or forking CLI internals. Anhedral CLI can supply both outputs while the upstream mirror stays outside its shipped starter payload. The complete upstream fork is [anhedral/shadcn-ui](https://github.com/anhedral/shadcn-ui), with upstream branches and tags preserved. The reviewed source pin and web CLI version are recorded in assets/ui/UPSTREAM-LOCK.json.\n\nFor each upstream update, compare item/file hashes, public APIs, discovered variants, examples and dependencies. Refresh the web baseline from upstream; invalidate any native coverage whose reviewed inputs changed. Port and test the native changes before marking them complete. A successful upstream merge is not evidence that a new feature works on Expo. Device acceptance remains separately recorded.\n\nRefresh a clean upstream checkout with \`node scripts/shadcn-registry.mjs --snapshot /absolute/path/to/shadcn-ui\`, regenerate with \`pnpm native-ui:registry:docs\`, and compare a retained previous snapshot with \`pnpm native-ui:registry -- --diff /absolute/path/to/previous-inventory.json.gz\`. Normal checks are offline. Reviewed native coverage includes source, style and transitive registry dependency fingerprints, so changed inputs cannot retain a ported status silently.\n\n## Platform adaptation checklist\n\nThese decisions describe the named native boundary; they do not mark an entire component, style or example complete. Device acceptance remains separate.\n\n| Browser-specific behavior | Native handling | Evidence / remaining work |\n| --- | --- | --- |\n| HTML chart recipe hosts, click handlers and CSS utility classes | View/Text/Pressable, native event names, inherited text styles and a strict reviewed utility translator | All 210 chart blocks and 21 chart examples retain authored data and callbacks; recipe render/control tests and source hash checks. Unknown hosts, imports and utilities fail. |\n| Recharts renderer and pointer-only data exploration | D3 geometry, native SVG primitives, touch selection and adjustable accessibility actions | Series/stack/curve/pie/radar/radial/label tests. This ports the APIs used by the reviewed recipes, not the entire Recharts library or its browser animation engine. |\n| ChartStyle CSS injection and color custom properties | Chart configuration/context and scoped native color resolution, including gradient stops | Chart contracts and recipe tests; CSS style elements are omitted on native. |\n| SVG DOM text attributes, rem units and CSS text casing | Native SVG attributes, point lengths, real font cuts, inherited casing and open text-on-arc paths | Native chart engine/font tests. Native OS typography acceptance remains pending. |\n| SVG CSS luminosity blending | Preserve explicit native label paint and theme contrast; browser compositing is not reproduced | The radial-label source remains visible in the recipe manifest; device contrast review remains pending. |\n| Next font loading, CSS font-face and CSS font variables | Expo Font with selected body/heading/serif/mono roles, verified TrueType cuts, errors and retry | All 52 font entries, 347 hashed cuts and retained licenses. Unavailable italic cuts use explicit native synthesis. |\n| HSL/OKLCH theme CSS and alpha colors | Shared token source plus gamut-mapped native sRGB colors and theme metrics | All eight registry themes, color/alpha and light/dark tests. This does not certify all eight component style presets. |\n| Browser gallery URL parameters and icon-package picker | Explicit native preview options and official Lucide native icons | Native example tests cover the authored bar-corner condition. Other icon-library picker implementations remain web gallery features. |\n| Tooltip demonstration hover transitions | Native pointer/touch animation with reduced-motion preference and subscription cleanup | Recipe motion tests. Browser focus pseudo-classes use native focus/accessibility behavior. |\n| DOM portals, browser overlay windows and hover/context activation | Native Modal, safe areas, touch-and-hold, native dismissal and focus restoration | Overlay/selection tests; OS focus and screen-reader device acceptance remains pending. |\n| Browser media queries, CSS scrollbars and DOM element measurements | Native window/layout events, ScrollView indicators and native measurements | Window breakpoint, scrolling and resize tests; no extra CSS scrollbar thumb is installed. |\n| Public cn CSS class helper | StyleSheet flattening through nativeStyles; recipe-local classes are translated before rendering | Native utility tests. Public browser CSS strings are not treated as native styles. |\n| Browser toast exit-transition queue | Native toast store/provider and native lifecycle removal | Legacy hook, isolated manager, replacement/cancellation/timer tests. Browser CSS transition delays are not reproduced. |\n| HTML form association, DOM input extraction and browser blur-before-submit | Scoped NativeForm, actual RHF/TanStack/Formisch stores, native labels/refs and explicit blur validation | All 28 authored library examples have native translations and behavior tests. Pending whole-item evidence remains explicit below. |\n| Next Form and server-action examples | Native value collection, React action state and retained schemas/local callbacks | Both authored forms and four omitted action/schema companions are inventoried. API/database integration remains the original application placeholder; Next transport is web-specific. |\n| Named browser palette colors and toast JSON markup | Shared official 244-color palette, native rich toast content and syntax-highlighted JSON | Palette source hash checks, actual submitted values, per-message placement and formatter error tests. |\n| Aria trigger/content ownership and DOM slots | Explicit native overlay composition, scalar/range slider adapters and native object/multiple selection | Authored source and behavior tests; nativeButton DOM dispatch and alignItemWithTrigger browser geometry are omitted. Aria table selection slots remain pending. |\n| Trigger CSS variables, hash pagination and HTML numeric bounds | Native onLayout measurements, page state/navigation callbacks and numeric min/max/step on blur | Native upstream control tests cover measured popup width, page transitions and bounds. |\n| CSS grayscale, generated borders, motion and paragraph utilities | Native SVG saturation filter, native borders, reduced-motion animations and OS text breaking | Image loading/source identity tests and interaction tests. CSS pseudo-element mix-blend compositing remains web-specific and is not reproduced by native borders. |\n| Embla browser carousel and resizable DOM geometry | Native ScrollView snap offsets, fractional cards, selection subscriptions and percentage panels | Authored counter/API and named-layout/bounds tests. DOM node access, browser plugins and cyclic cloned-slide animation remain outside these reviewed native APIs. |\n| HTML label-for lookup and repeated DOM IDs | Reviewed source pairs become scoped native fields with named focus/activation targets | Label names, input focus, repeated IDs, unmount cleanup and transparent grid scopes are tested; one missing upstream Amount input ID is explicitly repaired. Unknown or ambiguous ownership fails generation. Other recipe/API coverage remains pending. |\n| Named/default recipe exports and source generation | Every exported UI root carries its original registry source context; parenthesized and conditional roots remain JSX expressions | Boundary tests cover named functions, aliases, concise arrows, source generations and nested callbacks. This preserves legacy palettes and routes Button styling to the original CVA definitions. |\n| Component CVA base classes, variants and defaults | Retain statically analyzed class recipes, including class arrays and finite compound predicates, alongside the source hashes | All 116 current recipes are static and retained. Dynamic expressions, shadowed/nested binding scopes and unsupported declarations remain explicit review data; upstream code is never evaluated. Source hashes continue to invalidate changed inputs. |\n| Button preset classes, state selectors, icon descendants and group ancestry | Source-pinned native Button slot rules, native state handlers, icon context and group context | All 120 newer source rules plus the six component class definitions retain the three frozen generations and all authored sizes. The combined variant/size/mode matrix runs through three native state sets. Native text underline position, View background clipping and immediate transitions differ from browser paint/timing; other component preset slots and device acceptance remain pending. |\n| Badge preset classes, glyphs and render composition | Source-pinned native CVA rules, native state and glyph contexts, composed native links and explicit consumer text overrides | All 56 newer rules and six component definitions retain all eleven style families. Native styles replace browser class helper exports; transitions and background/underline painting use native renderers. Expanded device acceptance remains separate. |\n| Native render hosts, callback styles and view click handlers | One native host receives normalized style arrays/pressable callbacks, with real pressable views, themed text and stable refs | Static/pressable composition, child-first cancellation, pointer/touch/hover motion, text metrics and retained callback ownership are tested. Multi-root render output requires a native container or separate components; DOM attributes/class names use native props/styles. Device keyboard/screen-reader/visual acceptance remains separate. |\n| Upstream global theme formulas and CSS metric aliases | Retain the pinned global stylesheet alongside all eight component styles; include it in transitive native review fingerprints | Missing or corrupt globals fail snapshot validation. A global-only change invalidates affected component, example and block evidence. Native component metric implementation is still pending with the presets. |\n| Next Image server optimization and browser responsive image loading | Native OS image cache, source HTTPS URLs, native dimensions/cropping and composed SVG grayscale/brightness | Four authored aspect-ratio examples, alt/decorative image names, independent renderer loading, stale-source callbacks, visible errors and retry are tested. Browser srcset, preload and optimization stay web-specific. Unported local assets fail explicitly; source URLs require network availability. |\n| HTML anchors, Next Link and browser navigation | Native inline Text links, composed pressable links, OS URL bridge and explicit app route/anchor handlers | Generated Expo roots connect navigate/replace. Screen handles the empty hash; named anchors require a destination handler. Actual Button/breadcrumb examples, cancellation, disabled, hover/press, retry and stale request tests. Browser prefetch/SSR, history/target semantics and device navigation acceptance remain separate. |\n| Input Group CSS ancestry, DOM bubbling and read-only browser controls | Scoped physical-host metadata, source-pinned presets, explicit child-first native activation and OS TextInput focus requests | Four addon alignments, four button sizes, all eleven styles and native geometry/edit/disable/growth tests. Browser event propagation, textarea resize handles and exact CSS transition timing remain web-specific; read-only keyboard-focus parity is not claimed. |\n| Browser clipboard fallback, raw autosizing textarea and Tabler example imports | Expo OS clipboard with rejection/timeout/cleanup; native content sizing with raw preflight geometry; pinned native Tabler SVGs | Companion hook source pin/hash and authored copy/favorite controls are tested. Hidden DOM textarea fallback is web-specific. |\n| Browser overlay trigger anchoring, offsets and CSS color/shadow transitions | Native viewport-relative surface placement and side/alignment displacement; immediate native state painting | Offsets retain their values on the native surface. Trigger-coordinate anchoring, portal coordinates and exact CSS animation timing remain web-specific; complete overlay presets/API remain pending. |\n| HTML file inputs, web routing and SSR examples | Require explicit native controls, file picking, submit/navigation callbacks and Expo screen composition | Remaining native examples/blocks and provider-independent bindings remain pending in the inventory below; a no-op callback is not completion. |\n\n## Registry coverage\n\n| Registry | Published items | Metadata SHA-256 |\n| --- | ---: | --- |\n`;
  for (const style of styles)
    text += `| ${style} | ${inventory.registries[style].items.length} | \`${inventory.registries[style].sha256}\` |\n`;
  const api = nativeApiReport(
    inventory,
    JSON.parse(read(path.join(root, 'assets/ui/native/registry.json'))),
  );
  const policy = JSON.parse(read(path.join(destination, 'api-policy.json')));
  validateApiPolicy(api, policy);
  const additional = styles.flatMap((style) =>
    Object.entries(inventory.registries[style].additionalEndpoints ?? {}).map(([name, entry]) => ({
      style,
      name,
      ...entry,
    })),
  );
  if (additional.length) {
    text +=
      '\n## Published endpoints omitted from indexes\n\nThese valid published registry items remain directly installable by name. They are included in the item checklist, with their own published-file fingerprints; the index SHA-256 above continues to identify the original index response.\n\n| Registry | Item | Published endpoint | File SHA-256 |\n| --- | --- | --- | --- |\n';
    for (const entry of additional)
      text += `| ${entry.style} | ${entry.name} | [${entry.name}](${entry.url}) | ${entry.sha256} |\n`;
  }
  const packages = inventory.packageInputs;
  text += `\n## External dependency review\n\nThe snapshot retains ${Object.keys(packages.files).length} exact Git package/lock/workspace inputs and ${Object.keys(packages.packages).length} imported or declared npm package roots. Review fingerprints include reachable transitive dependency integrity, peer contexts, workspace source trees and patched dependency bytes. Package resolution uses the registry owner first, with explicit workspace or lockfile fallback records. Literal dynamic imports and import types are included; unresolved dynamic expressions require renewed review on every upstream revision. Snapshot collection never installs packages or evaluates upstream code.\n\n| Package without a pinned resolution | Native handling |\n| --- | --- |\n`;
  for (const [name, entry] of Object.entries(packages.packages))
    if (entry.resolution === 'unresolved')
      text += `| ${name} | Retained unresolved upstream metadata; requires explicit browser/native review. |\n`;
  text +=
    '\n## Public API review\n\nThis is export tracking, not proof of complete behavior or visual parity. Native item status remains separate. Browser-only exports have explicit native alternatives in the reviewed policy. All source variant declarations remain in the API ledger.\n\n| Component | Upstream value exports | Native exports present | Browser-specific exports | Unimplemented exports |\n| --- | ---: | ---: | --- | --- |\n';
  for (const [name, entry] of Object.entries(api)) {
    const web = entry.missingValues.filter((value) => policy.exports[name + '/' + value]);
    const missing = entry.missingValues.filter((value) => !policy.exports[name + '/' + value]);
    text += `| ${name} | ${entry.upstreamValues.length} | ${entry.upstreamValues.length - entry.missingValues.length} | ${web.join(', ') || 'none'} | ${missing.join(', ') || 'none'} |\n`;
  }
  text +=
    '\n## Item checklist\n\nEvery row applies to all listed registries. The machine inventory retains each separate style/item, dependency, file, source hash, discovered variant, function/example and browser API. “Pending” means not yet completed; it is never an implicit web-only exemption.\n\n| Item | Type | Registries | Expo status | Evidence / web-specific adaptation |\n| --- | --- | --- | --- | --- |\n';
  const styleSets = new Map();
  for (const item of rows) {
    const members = item.styles.slice().sort().join(', ');
    if (!styleSets.has(members)) styleSets.set(members, 'S' + (styleSets.size + 1));
  }
  for (const item of rows) {
    const entry = coverage.items[item.type + '/' + item.name];
    text += `| ${item.name} | ${item.type.replace('registry:', '')} | ${styleSets.get(item.styles.slice().sort().join(', '))} | ${entry?.status ?? 'pending'} | ${entry?.reason ?? 'Needs item, variant and dependency review.'} |\n`;
  }
  text +=
    '\n## Registry sets\n\nEvery set expands to the exact registry members below; item rows retain all styles through their set.\n\n| Set | Registries |\n| --- | --- |\n';
  for (const [members, label] of styleSets) text += `| ${label} | ${members} |\n`;
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
/** Preserve direct published items omitted by legacy registry indexes. Indexed entries
 * remain byte-for-byte metadata owners; endpoint provenance is retained separately. */
export function includePublishedRegistryEndpoints(registry, style, publications) {
  const items = structuredClone(registry.items),
    known = new Set(items.map((item) => item.name));
  const endpoints = [];
  for (const publication of publications) {
    const item = JSON.parse(publication.body);
    if (
      typeof item.name !== 'string' ||
      typeof item.type !== 'string' ||
      !item.type.startsWith('registry:')
    )
      continue;
    if (!/^[a-z0-9-]+$/.test(item.name) || publication.filename !== item.name + '.json')
      throw Error('Published registry endpoint identity requires review: ' + publication.filename);
    if (known.has(item.name)) continue;
    const normalized = structuredClone(item);
    for (const file of normalized.files ?? []) {
      if (typeof file.path !== 'string') throw Error('Unsafe published registry source path');
      file.path = file.path.startsWith('registry/')
        ? file.path
        : 'registry/' + style + '/' + file.path;
      if (
        !/^registry\/[a-z0-9-]+\//.test(file.path) ||
        file.path.split('/').some((part) => ['..', '.', ''].includes(part)) ||
        file.path.includes('\\')
      )
        throw Error('Unsafe published registry source path: ' + file.path);
    }
    known.add(item.name);
    items.push(normalized);
    endpoints.push([
      item.name,
      {
        url: 'https://ui.shadcn.com/r/styles/' + style + '/' + publication.filename,
        source: publication.origin,
        sha256: sha256(publication.body),
      },
    ]);
  }
  return {
    items,
    indexedItemCount: registry.items.length,
    additionalEndpoints: Object.fromEntries(endpoints),
  };
}
/** Discover publications from the pinned tree, including files absent from registry indexes. */
export function publishedRegistryFiles(sourceRoot, commit) {
  const prefix = 'apps/v4/public/r/styles/';
  const names = execFileSync('git', ['ls-tree', '-r', '--name-only', commit, '--', prefix], {
    cwd: sourceRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .trim()
    .split('\n')
    .filter(Boolean);
  const result = new Map();
  for (const origin of names) {
    const relative = origin.slice(prefix.length);
    if (!relative.endsWith('.json') || !relative.includes('/')) continue; // images and root style index are auxiliary metadata
    const match = /^([a-z0-9-]+)\/([a-z0-9-]+\.json)$/.exec(relative);
    if (!match) throw Error('Published registry layout requires review: ' + origin);
    const [, style, filename] = match;
    if (!result.has(style)) result.set(style, []);
    result.get(style).push({
      filename,
      origin,
      body: execFileSync('git', ['show', commit + ':' + origin], {
        cwd: sourceRoot,
        encoding: 'utf8',
        maxBuffer: 64 * 1024 * 1024,
      }),
    });
  }
  return result;
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
  const publications = publishedRegistryFiles(sourceRoot, commit);
  const targets = [
    ...new Set(
      bases
        .flatMap((base) => styles.map((style) => base + '-' + style))
        .concat(['new-york-v4', 'new-york', 'default'], [...publications.keys()]),
    ),
  ].sort();
  const result = {
    schemaVersion: 1,
    retrieved: new Date().toISOString().slice(0, 10),
    source: { repository: 'https://github.com/shadcn-ui/ui', commit },
    registries: {},
    sources: {},
    styleSheets: {},
    styleGlobals: collectStyleGlobals(sourceRoot, commit),
    auxiliary: {},
  };
  const legacySources = new Map();
  const previous =
    cache && existsSync(path.join(destination, 'inventory.json.gz'))
      ? loadOfficialRegistry()
      : undefined;
  for (const [legacy, entries] of publications)
    for (const { filename, origin, body } of entries) {
      const item = JSON.parse(body);
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
    const expanded = includePublishedRegistryEndpoints(
      registry,
      style,
      publications.get(style) ?? [],
    );
    const seen = new Set();
    for (const item of expanded.items) {
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
    result.registries[style] = {
      url,
      sha256: sha256(body),
      ...expanded,
      metadataSource: cacheFile && existsSync(cacheFile) ? 'cache' : 'network',
      metadataRetrieved:
        cacheFile && existsSync(cacheFile)
          ? previous?.registries[style]?.sha256 === sha256(body)
            ? (previous.registries[style].metadataRetrieved ?? previous.retrieved)
            : undefined
          : new Date().toISOString().slice(0, 10),
    };
  }
  const queue = Object.keys(result.sources).filter((source) => !source.includes('#'));
  result.unresolvedSourceImports = [];
  for (let index = 0; index < queue.length; index++) {
    const origin = queue[index],
      input = result.sources[origin],
      relativeSources = [];
    for (const module of input.imports.filter((name) => name.startsWith('.'))) {
      const base = path.posix.normalize(path.posix.join(path.posix.dirname(origin), module));
      if (!base.startsWith('apps/v4/registry/'))
        throw Error(
          'Relative registry import escapes source boundary: ' + origin + ' -> ' + module,
        );
      const resolved = ['', '.ts', '.tsx', '.js', '.jsx', '.json', '/index.ts', '/index.tsx']
        .map((suffix) => base + suffix)
        .find(
          (candidate) =>
            existsSync(path.join(sourceRoot, candidate)) &&
            statSync(path.join(sourceRoot, candidate)).isFile(),
        );
      if (!resolved) {
        result.unresolvedSourceImports.push({ origin, module });
        continue;
      }
      relativeSources.push(resolved);
      if (!result.sources[resolved]) {
        const content = read(path.join(sourceRoot, resolved));
        result.sources[resolved] = { sha256: sha256(content), ...analyzeSource(content, resolved) };
        queue.push(resolved);
      }
    }
    if (relativeSources.length) input.relativeSources = [...new Set(relativeSources)].sort();
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
  result.packageInputs = collectRegistryPackageInputs(sourceRoot, commit, result);
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
  if (process.argv.includes('--complete')) {
    const inventory = loadOfficialRegistry(),
      coverage = JSON.parse(read(path.join(destination, 'coverage.json')));
    validateCoverage(inventory, coverage);
    const pending = incompleteNativeItems(inventory, coverage);
    console.log(
      JSON.stringify(
        { complete: pending.length === 0, pendingCount: pending.length, pending },
        null,
        2,
      ),
    );
    process.exit(pending.length ? 1 : 0);
  }
  if (process.argv.includes('--api')) {
    const report = nativeApiReport(
      loadOfficialRegistry(),
      JSON.parse(read(path.join(root, 'assets/ui/native/registry.json'))),
    );
    const target = path.join(destination, 'native-api.json');
    if (process.argv.includes('--write'))
      writeFileSync(target, JSON.stringify(report, null, 2) + '\n');
    else {
      if (process.argv.includes('--report')) console.log(JSON.stringify(report, null, 2));
      if (JSON.stringify(JSON.parse(read(target))) !== JSON.stringify(report))
        throw Error('Native API/variant parity ledger is stale; review upstream changes.');
    }
    process.exit(0);
  }
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
