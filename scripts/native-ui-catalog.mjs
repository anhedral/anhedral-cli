import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
export function nativeChecklist(registry) {
  const intro = `# Native shadcn components for Expo

Anhedral CLI maintains React Native semantic adaptations for the **${registry.baseline.count} entries** in the [shadcn Components catalog](${registry.baseline.source}), reviewed ${registry.baseline.retrieved}. This tracks starter component adaptations, not complete API/variant coverage of the official CLI registry. See the [full official registry checklist](native-registry.md) for that larger scope. This is the native component baseline; upstream's separate AI Elements, form-library integrations and ecosystem registry packages have independent scopes. New upstream components require a new review rather than inheriting a complete status automatically.

## Source and ownership

Canonical implementations live in \`assets/ui/native/\`; \`registry.json\` owns the public component inventory and export names. Shared helpers have an underscore prefix. \`src/scaffold/native-ui.ts\` copies all required source into each generated application's \`packages/native-ui\`, with the inventory in \`NATIVE_COMPONENTS.json\`. The package exposes \`@workspace/native-ui\`, \`@workspace/native-ui/components/<name>\` and \`@workspace/native-ui/theme\`. Styling comes from \`@workspace/styling\`; no independent native palette or DOM runtime is installed.

Generated source belongs to the application. CLI updates never overwrite an existing product's edited components. Compare the pinned inventory and apply reviewed source changes explicitly. Maintain attribution in \`assets/ui/UPSTREAM.json\` and \`LICENSE.shadcn\`.

## Native API and interactions

These are native APIs, not DOM prop or Recharts compatibility shims. Use React Native \`style\`, \`onPress\`, accessibility props and typed controlled-value callbacks. Compound Dialog/Select/Tabs/Accordion/menu parts share root context. The original Dialog \`triggerLabel\`/\`title\` interface remains supported. Do not import this package into Next.js.

Menus, popovers, sheets and preview cards use native Modal surfaces; hover/context interactions have touch-and-hold and screen-reader activation. Overlays handle native back/escape, restore trigger focus and keep dismissed content out of accessibility traversal. Drawer has a drag handle and accessible dismissal action. Slider and Resizable expose adjustable actions as well as drag handling. Native ScrollView owns platform scroll indicators, so ScrollBar intentionally renders no separate thumb.

Calendar supports local-date single, multiple and range selection, locale labels and disabled bounds/predicates. DatePicker adds a modal trigger. DataTable owns native sorting/filtering/pagination and stable row IDs, with native column renderers. Chart accepts \`data: { label: string; value: number }[]\` and bar/line/area/pie/radar/radial renderers using Expo-compatible SVG; it does not execute browser chart components. CodeBlock preserves source bytes, renders offline lexical syntax/diff tokens and uses Expo Clipboard. It does not execute code or claim language-server tokenization. MessageScroller follows new content only while the reader is at the bottom. Questionnaire supports single/multiple/text steps, back/skip and validated submission.

## Native OS acceptance

Run \`pnpm test:native-ui:ios -- --device <dedicated simulator UUID>\` on a Mac with
Xcode and CocoaPods. The maintained gallery selects every authored default or named
component export, typechecks its UI helpers, and runs actual native XCTest controls.
Use \`node scripts/native-ui-ios.mjs --prepare-only\` for gallery/type validation.
The generated QA application has its own bundle ID; dated Xcode logs and result
bundles remain under \`.artifacts/native-ui-ios/\`. Keep native preparation/test
commands serial because they regenerate the shared harness source directory.
Expo 57's scene lifecycle is incompatible with iOS 27/Xcode 27; use a compatible
runtime for current acceptance and retain that SDK compatibility gap explicitly.

## Official registry assets and recipes

The authored component example overlay currently includes 409 reviewed source modules,
with 166 source-pinned Lucide native selections. Generate and validate these through
\`node scripts/native-example-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui\`
and \`node scripts/native-icons.mjs --check\`. Their coverage remains partial while
component preset/API parity is unfinished. The overlay includes 91 distinct published
examples from each of the legacy Default and New York registries. Their original
source files, color generation, controlled callbacks and hashes are retained;
matching names never substitute the modern source. Filled legacy destructive buttons
and badges remain distinct from modern translucent variants.

Authored image recipes use native image caching and SVG grayscale/brightness filters.
They retain source HTTPS URLs, alt text, crop, dimensions and aspect ratios, with visible
loading, failure and retry. Next server optimization, browser srcset and preload are
web-specific. Unported local image paths fail explicitly; remote media availability is
not an offline guarantee. A native renderer stalled for 30 seconds exposes retry.

The native package includes the reviewed font and theme catalogs. \`NativeFontProvider\`
loads selected body/heading/serif/monospace roles through Expo Font; \`useNativeFonts\`
exposes loading, error and retry states. All 52 official font and heading entries map
to 347 verified TrueType cuts from an immutable Expo Google Fonts source revision.
The generated \`native-fonts.json\` retains file hashes, declared/internal weights and
font licenses. Font files are fetched when selected; applications that need offline
startup should bundle the selected cuts and register their aliases during startup.
Missing italic cuts use native synthesis rather than claiming a separate font asset.

\`ThemeProvider\` accepts the eight official registry theme names through \`theme\`.
The shared styling package owns the original tokens and converted native sRGB values;
transparent colors retain their alpha. \`radius\` and chart/sidebar tokens come from
that same theme. The font and theme evidence checks reject changed upstream inputs.

The chart overlay provides native SVG series, axes, grids, labels, tooltips and
legends through \`@workspace/native-ui/lib/charts\` and the chart component module.
It uses D3 for geometry and React Native SVG for rendering. Its touch selection and
adjustable accessibility actions expose the original values. It includes the actual
70 official chart blocks from each of the default, New York and New York v4 registries,
including their data, formatters and controls, plus all 21 authored chart examples. Import a block such as
\`@workspace/native-ui/blocks/new-york-v4/chart-area-interactive\`; inspect
\`@workspace/native-ui/recipes\` for the source, style/dependency and translated-file hashes.
\`assets/ui/native-chart-recipes.json.gz\` is the maintained compressed source overlay;
regenerate it with \`node scripts/native-chart-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui\`.
The generator verifies every input against the official inventory before translating.\nThe npm artifact stores native templates in a lossless Brotli overlay; generated source\nis byte-identical to the maintained files and is editable in the application.

Recipe layouts use a reviewed native utility vocabulary, measured container widths,
native text inheritance and native SVG paint. Unknown utilities fail instead of
silently disappearing. Browser custom properties become scoped native colors;
HTML buttons become accessible Pressables. The browser-only \`ChartStyle\` element is
removed because the native chart container supplies those colors directly. Pie month
selectors and accessibility actions share controlled selection. Browser SVG text
attributes and CSS units are converted to their native equivalents. This translation
does not establish completion of the remaining registry examples or all component
style presets; the official checklist remains authoritative.

The form overlay includes all ten official React Hook Form, nine TanStack Form,
nine Formisch and two action-form examples, together with the action schemas and
callbacks omitted from the published registry files. Native field bindings preserve
validation, touched/error state, controlled values, array operations, disabled choices,
external submit buttons and keyboard submission. Each screen uses a scoped
\`NativeFormScope\`; form IDs do not become a global registry. Syntax-highlighted
submitted JSON retains the actual values. Regenerate the catalog with
\`node scripts/native-form-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui\`.

Formisch keeps its actual Valibot store and subscriptions; native bindings replace
HTML Form and DOM event extraction. TanStack submit refreshes blur validation before
submitting because a native Save press need not blur a keyboard field. The two Next
action examples use native value collection and React action state. Their schema and
callback code executes locally; the upstream API/database placeholder remains an
application integration point, and no Next server transport is implied. File uploads
require explicit native file picking and are outside these text/choice examples.
The shared styling package also retains all 244 official named registry colors,
including the password-strength colors. It owns palette values for generated apps.

## Checks and maintenance

Run \`pnpm test:native-ui:bundle\` to compile every maintained source recipe and companion into production Hermes bytecode for iOS and Android. This uses the same Expo Babel preset as generated applications; Jest retains the React Native test preset. Bundling verifies module resolution and native compilation, while device acceptance remains separate.

From the CLI checkout, install the pinned test harness with \`pnpm --dir tests/native-ui install --frozen-lockfile\`, then run \`pnpm test:native-ui\`. It typechecks the copied public source and renders it with React Native Testing Library under iOS and Android module resolution. Native bridges are mocked only at platform boundaries; component implementations are not replaced with HTML or mocks. The catalog examples must cover exactly the baseline and every declared export must exist. Family tests exercise controlled/uncontrolled state, disabled choices, filtering, date bounds/ranges, native dismissal, stepping/resizing, pagination/selection, timers, code/clipboard, chart selection, themes and submission.

For interactive review, run \`pnpm --dir tests/native-ui showcase\` with a development client built from this harness (\`pnpm --dir tests/native-ui exec expo run:ios\` or \`expo run:android\`). The gallery exposes all 66 examples and theme switching. Use a fresh client after changing native dependency pins. Device acceptance includes VoiceOver/TalkBack, dynamic type, safe areas, gestures, keyboard dismissal, RTL and reduced motion.\n\nRoot tests additionally generate a source-only application and compare every native source file, public export, dependency pin and packaged registry. Native-source changes run the native harness in the existing Linux CI gate. \`pnpm native-ui:upstream\` explicitly checks the live upstream catalog for added/removed IDs; it is not a network requirement for normal builds/tests. Update the reviewed baseline, implementation and tests together, then regenerate this checklist with \`pnpm native-ui:docs\`.

**Evidence boundary:** automated component tests execute JavaScript, not native OS rendering. The device columns deliberately remain unchecked until each component is accepted with VoiceOver/TalkBack, dynamic type, keyboard/gestures, safe areas, reduced motion, RTL, and light/dark themes on the actual iOS/Android target. Compile/export success is not device acceptance. Record dated runs in \`docs/verification.md\`; do not mark these device columns from a Jest result.

## Component parity checklist

This table is generated from \`assets/ui/native/registry.json\`. “Automated” means a catalog render/export contract plus its named family suite, not complete upstream DOM API coverage or native-device certification.

| Upstream component | Native source | Implementation | Automated family | iOS device | Android device | Native adaptation |
| --- | --- | --- | --- | --- | --- | --- |
`;
  return (
    intro +
    registry.components
      .map(
        (item) =>
          `| [${item.id}](${item.upstream}) | \`${item.file}\` | [x] | ${item.automated === 'rntl' ? '[x]' : '[ ]'} ${item.suite} | [${item.iosDevice === 'accepted' ? 'x' : ' '}] | [${item.androidDevice === 'accepted' ? 'x' : ' '}] | ${item.adaptation} |`,
      )
      .join('\n') +
    '\n'
  );
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const registry = JSON.parse(
    readFileSync(path.join(root, 'assets/ui/native/registry.json'), 'utf8'),
  );
  if (process.argv.includes('--write'))
    writeFileSync(path.join(root, 'docs/native-ui.md'), nativeChecklist(registry));
  else if (process.argv.includes('--upstream')) {
    const response = await fetch(registry.baseline.source, { signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw Error(`Upstream catalog returned ${response.status}.`);
    const html = await response.text();
    const ids = [
      ...new Set(
        [...html.matchAll(/href="\/docs\/components\/(?:base\/)?([a-z0-9-]+)"/g)].map(
          (match) => match[1],
        ),
      ),
    ].sort();
    if (!ids.length) throw Error('Upstream catalog markup is unrecognized; review it explicitly.');
    const pinned = registry.components.map((item) => item.id).sort();
    const added = ids.filter((id) => !pinned.includes(id));
    const removed = pinned.filter((id) => !ids.includes(id));
    if (added.length || removed.length)
      throw Error(
        `Catalog changed; review before claiming parity. Added: ${added.join(', ') || 'none'}. Removed: ${removed.join(', ') || 'none'}.`,
      );
    console.log(`Upstream catalog matches all ${ids.length} pinned component IDs.`);
  } else {
    if (readFileSync(path.join(root, 'docs/native-ui.md'), 'utf8') !== nativeChecklist(registry))
      throw Error('Native component checklist is stale. Run pnpm native-ui:docs.');
    console.log('Native component checklist matches its registry.');
  }
}
