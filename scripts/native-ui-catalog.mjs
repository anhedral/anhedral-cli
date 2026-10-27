import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('../', import.meta.url));
export function nativeChecklist(registry) {
  const intro = `# Native shadcn components for Expo

> Legacy port reference. New init does not generate this port. Current Anhedral UI uses official shadcn and React Native Reusables through [the UI CLI](ui.md); exhaustive native parity is not its release gate. This material and active port work are preserved for separate review.

Anhedral CLI maintains React Native semantic adaptations for the **${registry.baseline.count} entries** in the [shadcn Components catalog](${registry.baseline.source}), reviewed ${registry.baseline.retrieved}. This is the native component baseline; upstream's separate AI Elements, form-library integrations and ecosystem registry packages have independent scopes. New upstream components require a new review rather than inheriting a complete status automatically.

## Source and ownership

Canonical implementations live in \`assets/ui/native/\`; \`registry.json\` owns the public component inventory and export names. Shared helpers have an underscore prefix. \`src/scaffold/native-ui.ts\` copies all required source into each generated application's \`packages/native-ui\`, with the inventory in \`NATIVE_COMPONENTS.json\`. The package exposes \`@workspace/native-ui\`, \`@workspace/native-ui/components/<name>\` and \`@workspace/native-ui/theme\`. Styling comes from \`@workspace/styling\`; no independent native palette or DOM runtime is installed.

Generated source belongs to the application. CLI updates never overwrite an existing product's edited components. Compare the pinned inventory and apply reviewed source changes explicitly. Maintain attribution in \`assets/ui/UPSTREAM.json\` and \`LICENSE.shadcn\`.

## Native API and interactions

These are native APIs, not DOM prop or Recharts compatibility shims. Use React Native \`style\`, \`onPress\`, accessibility props and typed controlled-value callbacks. Compound Dialog/Select/Tabs/Accordion/menu parts share root context. The original Dialog \`triggerLabel\`/\`title\` interface remains supported. Do not import this package into Next.js.

Menus, popovers, sheets and preview cards use native Modal surfaces; hover/context interactions have touch-and-hold and screen-reader activation. Overlays handle native back/escape, restore trigger focus and keep dismissed content out of accessibility traversal. Drawer has a drag handle and accessible dismissal action. Slider and Resizable expose adjustable actions as well as drag handling. Native ScrollView owns platform scroll indicators, so ScrollBar intentionally renders no separate thumb.

Calendar supports local-date single, multiple and range selection, locale labels and disabled bounds/predicates. DatePicker adds a modal trigger. DataTable owns native sorting/filtering/pagination and stable row IDs, with native column renderers. Chart accepts \`data: { label: string; value: number }[]\` and bar/line/area/pie/radar/radial renderers using Expo-compatible SVG; it does not execute browser chart components. CodeBlock preserves source bytes, renders offline lexical syntax/diff tokens and uses Expo Clipboard. It does not execute code or claim language-server tokenization. MessageScroller follows new content only while the reader is at the bottom. Questionnaire supports single/multiple/text steps, back/skip and validated submission.

## Checks and maintenance

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
