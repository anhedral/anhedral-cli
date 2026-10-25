# Native shadcn components for Expo

Anhedral CLI maintains React Native semantic adaptations for the **66 entries** in the [shadcn Components catalog](https://ui.shadcn.com/docs/components), reviewed 2026-10-24. This tracks starter component adaptations, not complete API/variant coverage of the official CLI registry. See the [full official registry checklist](native-registry.md) for that larger scope. This is the native component baseline; upstream's separate AI Elements, form-library integrations and ecosystem registry packages have independent scopes. New upstream components require a new review rather than inheriting a complete status automatically.

## Source and ownership

Canonical implementations live in `assets/ui/native/`; `registry.json` owns the public component inventory and export names. Shared helpers have an underscore prefix. `src/scaffold/native-ui.ts` copies all required source into each generated application's `packages/native-ui`, with the inventory in `NATIVE_COMPONENTS.json`. The package exposes `@workspace/native-ui`, `@workspace/native-ui/components/<name>` and `@workspace/native-ui/theme`. Styling comes from `@workspace/styling`; no independent native palette or DOM runtime is installed.

Generated source belongs to the application. CLI updates never overwrite an existing product's edited components. Compare the pinned inventory and apply reviewed source changes explicitly. Maintain attribution in `assets/ui/UPSTREAM.json` and `LICENSE.shadcn`.

## Native API and interactions

These are native APIs, not DOM prop or Recharts compatibility shims. Use React Native `style`, `onPress`, accessibility props and typed controlled-value callbacks. Compound Dialog/Select/Tabs/Accordion/menu parts share root context. The original Dialog `triggerLabel`/`title` interface remains supported. Do not import this package into Next.js.

Menus, popovers, sheets and preview cards use native Modal surfaces; hover/context interactions have touch-and-hold and screen-reader activation. Overlays handle native back/escape, restore trigger focus and keep dismissed content out of accessibility traversal. Drawer has a drag handle and accessible dismissal action. Slider and Resizable expose adjustable actions as well as drag handling. Native ScrollView owns platform scroll indicators, so ScrollBar intentionally renders no separate thumb.

Calendar supports local-date single, multiple and range selection, locale labels and disabled bounds/predicates. DatePicker adds a modal trigger. DataTable owns native sorting/filtering/pagination and stable row IDs, with native column renderers. Chart accepts `data: { label: string; value: number }[]` and bar/line/area/pie/radar/radial renderers using Expo-compatible SVG; it does not execute browser chart components. CodeBlock preserves source bytes, renders offline lexical syntax/diff tokens and uses Expo Clipboard. It does not execute code or claim language-server tokenization. MessageScroller follows new content only while the reader is at the bottom. Questionnaire supports single/multiple/text steps, back/skip and validated submission.

## Native OS acceptance

Run `pnpm test:native-ui:ios -- --device <dedicated simulator UUID>` on a Mac with
Xcode and CocoaPods. The maintained gallery selects every authored default or named
component export, typechecks its UI helpers, and runs actual native XCTest controls.
Use `node scripts/native-ui-ios.mjs --prepare-only` for gallery/type validation.
The generated QA application has its own bundle ID; dated Xcode logs and result
bundles remain under `.artifacts/native-ui-ios/`. Keep native preparation/test
commands serial because they regenerate the shared harness source directory.
Expo 57's scene lifecycle is incompatible with iOS 27/Xcode 27; use a compatible
runtime for current acceptance and retain that SDK compatibility gap explicitly.

## Component preset styles

Select a native component preset with `NativeComponentStyleProvider style="nova"`
around the relevant subtree. It shares style selection with recipe options; legacy
recipe boundaries retain their own presentation. The source-driven Button adapter
includes all eight newer presets plus the published Default, New York and New York v4
CVA definitions, with every authored variant/size and native hover/focus,
invalid/expanded/disabled states, group corners and icon placement. It uses the
pinned upstream radius formulas and OKLCH secondary hover mix. Raw authored native
layouts also use the pinned global radius multipliers, including directional corners,
local radius scopes and bounded native radius expressions. Frozen Default/New York
layouts retain their additive metrics; unsupported formulas require explicit review. Explicit native styles
and icon sizes take precedence. Text-bearing buttons grow for native font scaling and
explicit text metrics; icon-only slots keep their square geometry. Compound controls
own their own preset slots and do not inherit Button typography or dimensions.
Badge also retains all eight newer presets and the three frozen CVA definitions,
including Sera's text-only treatment, legacy filled destructive paint, all six modern
variants, focus/invalid state, link-only hover, glyph placement and source typography.
Default and New York retain their four authored variants. Badge supports native
asChild/render elements and typed native render callbacks. Authored text colors and
explicit consumer text styles win over source defaults. Avatar badges retain their
separate baseline until their own preset slots are reviewed. Interactive badges keep
expanded native touch bounds without changing authored visual geometry.
Skeleton retains all eleven source style families, including frozen New York primary
transparency and New York v4 accent paint. Its native pulse follows the source two-second
cubic easing cycle and half-opacity midpoint, responds to live reduced-motion changes,
and remains static if the native preference is unavailable. Explicit native styles win.
Separator preserves source-specific decorative defaults and vertical stretch versus
full-height behavior. AspectRatio uses native layout instead of CSS padding/custom
properties. Both support one native child/render host, native style values, composed
refs and layout callbacks; DOM host properties are replaced by native View properties.
Authored description lists use native term/definition hosts and scoped term/value labels.
Embedded controls stay independently accessible. Typography slash modifiers retain their
source line heights; native flex layouts use the authored row default while explicit
column directions take precedence. Unsupported utility formulas still require review.

Render callbacks return one native host element with native style arrays and
normalized text/pressable props. Static View and themed Text roots preserve inherited
metrics, colors, refs and child content; native views with actions become real
pressables. A raw native Text root is adapted through the maintained themed text host.
Use a native container or separate components for fragment/multiple-root output.
Default Text inherits surrounding native typography; an explicit variant or style can
override it. Event composition preserves child-first cancellation, pointer/touch
callbacks and stable ref lifetimes during press feedback.

Small visual buttons retain expanded touch targets
through hitSlop; parent layout must allow those touch bounds.

Run `pnpm native-ui:presets` to check all 120 Button and 56 Badge CSS rules,
their component class definitions and global inputs. The frozen source generations can also
be selected with `style="default"`, `style="new-york"` or `style="new-york-v4"`.
Default and New York retain their four authored sizes; the other families support
eight. Authored recipes carry their original generation automatically, including
named exports and default aliases. Native code is generated from static data; the
browser CVA runtime is not installed in the native package. Other component preset slots remain unfinished and keep their existing native
adaptations. Browser underline offset, background clipping and CSS transition timing
use native text/View painting and immediate state changes; they are not exact browser
paint/animation parity. Native device/keyboard/visual acceptance remains separate.

## Official registry assets and recipes

The authored component example overlay currently includes 434 reviewed source modules,
with 166 source-pinned Lucide native selections. Generate and validate these through
`node scripts/native-example-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui`
and `node scripts/native-icons.mjs --check`. Their coverage remains partial while
component preset/API parity is unfinished. The overlay includes 97 distinct published
examples from each of the legacy Default and New York registries. Their original
source files, color generation, controlled callbacks and hashes are retained;
matching names never substitute the modern source. Filled legacy destructive buttons
and badges remain distinct from modern translucent variants.

NativeLink renders inline Text or a composed Pressable. NativeNavigationProvider
supplies app routing and anchor callbacks; generated Expo roots connect application
routes to Expo Router navigate/replace. OS links use HTTP(S), mail, telephone or SMS
bridges. Screen handles the empty hash by scrolling to the top; named anchors require
an explicit scroll destination handler. Missing routes/anchors and OS failures expose
visible retryable errors. LinkButton retains its existing one-argument onNavigate API.
Button composition preserves source styling, focus refs and child-first callbacks.
Next prefetch/SSR, DOM history and browser targets have no claimed native equivalence;
unreviewed browser props fail generated type checks. Product routes and named anchor
destinations still belong to the consuming application. On iOS, Text links are exposed as accessible fragments using their visible text;
a custom accessibilityLabel names the containing paragraph rather than that fragment.
Composed Pressable links keep their custom accessible names. Native
keyboard/screen-reader and device navigation acceptance remains separate.

Authored image recipes use native image caching and SVG grayscale/brightness filters.
They retain source HTTPS URLs, alt text, crop, dimensions and aspect ratios, with visible
loading, failure and retry. Next server optimization, browser srcset and preload are
web-specific. Unported local image paths fail explicitly; remote media availability is
not an offline guarantee. A native renderer stalled for 30 seconds exposes retry.

The native package includes the reviewed font and theme catalogs. `NativeFontProvider`
loads selected body/heading/serif/monospace roles through Expo Font; `useNativeFonts`
exposes loading, error and retry states. All 52 official font and heading entries map
to 347 verified TrueType cuts from an immutable Expo Google Fonts source revision.
The generated `native-fonts.json` retains file hashes, declared/internal weights and
font licenses. Font files are fetched when selected; applications that need offline
startup should bundle the selected cuts and register their aliases during startup.
Missing italic cuts use native synthesis rather than claiming a separate font asset.

`ThemeProvider` accepts the eight official registry theme names through `theme`.
The shared styling package owns the original tokens and converted native sRGB values;
transparent colors retain their alpha. `radius` and chart/sidebar tokens come from
that same theme. The font and theme evidence checks reject changed upstream inputs.

The chart overlay provides native SVG series, axes, grids, labels, tooltips and
legends through `@workspace/native-ui/lib/charts` and the chart component module.
It uses D3 for geometry and React Native SVG for rendering. Its touch selection and
adjustable accessibility actions expose the original values. It includes the actual
70 official chart blocks from each of the default, New York and New York v4 registries,
including their data, formatters and controls, plus all 21 authored chart examples. Import a block such as
`@workspace/native-ui/blocks/new-york-v4/chart-area-interactive`; inspect
`@workspace/native-ui/recipes` for the source, style/dependency and translated-file hashes.
`assets/ui/native-chart-recipes.json.gz` is the maintained compressed source overlay;
regenerate it with `node scripts/native-chart-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui`.
The generator verifies every input against the official inventory before translating.
The npm artifact stores native templates in a lossless Brotli overlay; generated source
is byte-identical to the maintained files and is editable in the application.

Recipe layouts use a reviewed native utility vocabulary, measured container widths,
native text inheritance and native SVG paint. Unknown utilities fail instead of
silently disappearing. Browser custom properties become scoped native colors;
HTML buttons become accessible Pressables. The browser-only `ChartStyle` element is
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
`NativeFormScope`; form IDs do not become a global registry. Syntax-highlighted
submitted JSON retains the actual values. Regenerate the catalog with
`node scripts/native-form-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui`.

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

Run `pnpm test:native-ui:bundle` to compile every maintained source recipe and companion into production Hermes bytecode for iOS and Android. This uses the same Expo Babel preset as generated applications; Jest retains the React Native test preset. Bundling verifies module resolution and native compilation, while device acceptance remains separate.

From the CLI checkout, install the pinned test harness with `pnpm --dir tests/native-ui install --frozen-lockfile`, then run `pnpm test:native-ui`. It typechecks the copied public source and renders it with React Native Testing Library under iOS and Android module resolution. Native bridges are mocked only at platform boundaries; component implementations are not replaced with HTML or mocks. The catalog examples must cover exactly the baseline and every declared export must exist. Family tests exercise controlled/uncontrolled state, disabled choices, filtering, date bounds/ranges, native dismissal, stepping/resizing, pagination/selection, timers, code/clipboard, chart selection, themes and submission.

For interactive review, run `pnpm --dir tests/native-ui showcase` with a development client built from this harness (`pnpm --dir tests/native-ui exec expo run:ios` or `expo run:android`). The gallery exposes all 66 examples and theme switching. Use a fresh client after changing native dependency pins. Device acceptance includes VoiceOver/TalkBack, dynamic type, safe areas, gestures, keyboard dismissal, RTL and reduced motion.

Root tests additionally generate a source-only application and compare every native source file, public export, dependency pin and packaged registry. Native-source changes run the native harness in the existing Linux CI gate. `pnpm native-ui:upstream` explicitly checks the live upstream catalog for added/removed IDs; it is not a network requirement for normal builds/tests. Update the reviewed baseline, implementation and tests together, then regenerate this checklist with `pnpm native-ui:docs`.

**Evidence boundary:** automated component tests execute JavaScript, not native OS rendering. The device columns deliberately remain unchecked until each component is accepted with VoiceOver/TalkBack, dynamic type, keyboard/gestures, safe areas, reduced motion, RTL, and light/dark themes on the actual iOS/Android target. Compile/export success is not device acceptance. Record dated runs in `docs/verification.md`; do not mark these device columns from a Jest result.

## Component parity checklist

This table is generated from `assets/ui/native/registry.json`. “Automated” means a catalog render/export contract plus its named family suite, not complete upstream DOM API coverage or native-device certification.

| Upstream component | Native source | Implementation | Automated family | iOS device | Android device | Native adaptation |
| --- | --- | --- | --- | --- | --- | --- |
| [accordion](https://ui.shadcn.com/docs/components/accordion) | `accordion.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [alert](https://ui.shadcn.com/docs/components/alert) | `alert.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [alert-dialog](https://ui.shadcn.com/docs/components/alert-dialog) | `alert-dialog.tsx` | [x] | [x] overlays | [ ] | [ ] | Explicit action/cancel; backdrop touches do not dismiss the decision. |
| [aspect-ratio](https://ui.shadcn.com/docs/components/aspect-ratio) | `aspect-ratio.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [attachment](https://ui.shadcn.com/docs/components/attachment) | `attachment.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [avatar](https://ui.shadcn.com/docs/components/avatar) | `avatar.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [badge](https://ui.shadcn.com/docs/components/badge) | `badge.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [breadcrumb](https://ui.shadcn.com/docs/components/breadcrumb) | `breadcrumb.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [bubble](https://ui.shadcn.com/docs/components/bubble) | `bubble.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [button](https://ui.shadcn.com/docs/components/button) | `button.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [button-group](https://ui.shadcn.com/docs/components/button-group) | `button-group.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [calendar](https://ui.shadcn.com/docs/components/calendar) | `calendar.tsx` | [x] | [x] calendar | [ ] | [ ] | Locale-aware native day grid; single/multiple/range selection and disabled dates. |
| [card](https://ui.shadcn.com/docs/components/card) | `card.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [carousel](https://ui.shadcn.com/docs/components/carousel) | `carousel.tsx` | [x] | [x] motion | [ ] | [ ] | Native paged ScrollView, bounded/loop navigation and accessible controls. |
| [chart](https://ui.shadcn.com/docs/components/chart) | `chart.tsx` | [x] | [x] content | [ ] | [ ] | Native SVG bar, line, area, pie, radar and radial charts with accessible data selection; native data API replaces Recharts. |
| [checkbox](https://ui.shadcn.com/docs/components/checkbox) | `checkbox.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [code-block](https://ui.shadcn.com/docs/components/code-block) | `code-block.tsx` | [x] | [x] content | [ ] | [ ] | Offline native Text syntax/diff tokens and Expo Clipboard; no HTML injection or runtime code execution. |
| [collapsible](https://ui.shadcn.com/docs/components/collapsible) | `collapsible.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [combobox](https://ui.shadcn.com/docs/components/combobox) | `combobox.tsx` | [x] | [x] selection | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [command](https://ui.shadcn.com/docs/components/command) | `command.tsx` | [x] | [x] selection | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [context-menu](https://ui.shadcn.com/docs/components/context-menu) | `context-menu.tsx` | [x] | [x] overlays | [ ] | [ ] | Touch-and-hold or accessibility activation opens a native modal action menu. |
| [data-table](https://ui.shadcn.com/docs/components/data-table) | `data-table.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Native sortable/filterable/paginated rows with stable ID selection; native column API replaces DOM/TanStack renderers. |
| [date-picker](https://ui.shadcn.com/docs/components/date-picker) | `date-picker.tsx` | [x] | [x] calendar | [ ] | [ ] | Modal calendar picker replaces browser popover input. |
| [dialog](https://ui.shadcn.com/docs/components/dialog) | `dialog.tsx` | [x] | [x] overlays | [ ] | [ ] | Compound native Modal API plus backwards-compatible original triggerLabel/title API. |
| [direction](https://ui.shadcn.com/docs/components/direction) | `direction.tsx` | [x] | [x] motion | [ ] | [ ] | Context and native layout direction; slider adjusts its gesture direction in RTL. |
| [drawer](https://ui.shadcn.com/docs/components/drawer) | `drawer.tsx` | [x] | [x] overlays | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [dropdown-menu](https://ui.shadcn.com/docs/components/dropdown-menu) | `dropdown-menu.tsx` | [x] | [x] overlays | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [empty](https://ui.shadcn.com/docs/components/empty) | `empty.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [field](https://ui.shadcn.com/docs/components/field) | `field.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [hover-card](https://ui.shadcn.com/docs/components/hover-card) | `hover-card.tsx` | [x] | [x] overlays | [ ] | [ ] | Touch-and-hold preview replaces hover-only activation. |
| [input](https://ui.shadcn.com/docs/components/input) | `input.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [input-group](https://ui.shadcn.com/docs/components/input-group) | `input-group.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [input-otp](https://ui.shadcn.com/docs/components/input-otp) | `input-otp.tsx` | [x] | [x] controls | [ ] | [ ] | Native single code field supports OS autofill and paste; optional visual digit slots. |
| [item](https://ui.shadcn.com/docs/components/item) | `item.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [kbd](https://ui.shadcn.com/docs/components/kbd) | `kbd.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [label](https://ui.shadcn.com/docs/components/label) | `label.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [marker](https://ui.shadcn.com/docs/components/marker) | `marker.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [menubar](https://ui.shadcn.com/docs/components/menubar) | `menubar.tsx` | [x] | [x] overlays | [ ] | [ ] | Touch menus replace browser menubar keyboard conventions. |
| [message](https://ui.shadcn.com/docs/components/message) | `message.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [message-scroller](https://ui.shadcn.com/docs/components/message-scroller) | `message-scroller.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Follow new content only while at the bottom; preserve reading position otherwise. |
| [native-select](https://ui.shadcn.com/docs/components/native-select) | `native-select.tsx` | [x] | [x] selection | [ ] | [ ] | Accessible modal picker replaces the HTML select element. |
| [navigation-menu](https://ui.shadcn.com/docs/components/navigation-menu) | `navigation-menu.tsx` | [x] | [x] selection | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [pagination](https://ui.shadcn.com/docs/components/pagination) | `pagination.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [popover](https://ui.shadcn.com/docs/components/popover) | `popover.tsx` | [x] | [x] overlays | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [progress](https://ui.shadcn.com/docs/components/progress) | `progress.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [questionnaire](https://ui.shadcn.com/docs/components/questionnaire) | `questionnaire.tsx` | [x] | [x] content | [ ] | [ ] | Native single/multiple/text steps with required-answer validation, back/skip and one completion per submission. |
| [radio-group](https://ui.shadcn.com/docs/components/radio-group) | `radio-group.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [resizable](https://ui.shadcn.com/docs/components/resizable) | `resizable.tsx` | [x] | [x] motion | [ ] | [ ] | PanResponder handles and accessible increment/decrement resize adjacent native panels within bounds. |
| [scroll-area](https://ui.shadcn.com/docs/components/scroll-area) | `scroll-area.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Native ScrollView owns scrolling and its platform scrollbar; ScrollBar is an intentional no-render adapter. |
| [select](https://ui.shadcn.com/docs/components/select) | `select.tsx` | [x] | [x] selection | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [separator](https://ui.shadcn.com/docs/components/separator) | `separator.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [sheet](https://ui.shadcn.com/docs/components/sheet) | `sheet.tsx` | [x] | [x] overlays | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [sidebar](https://ui.shadcn.com/docs/components/sidebar) | `sidebar.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Modal navigation drawer with a shared controlled/uncontrolled provider. |
| [skeleton](https://ui.shadcn.com/docs/components/skeleton) | `skeleton.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [slider](https://ui.shadcn.com/docs/components/slider) | `slider.tsx` | [x] | [x] motion | [ ] | [ ] | Touch drag and screen-reader adjustable actions; bounded single/multiple values and step constraints. |
| [spinner](https://ui.shadcn.com/docs/components/spinner) | `spinner.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [switch](https://ui.shadcn.com/docs/components/switch) | `switch.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [table](https://ui.shadcn.com/docs/components/table) | `table.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [tabs](https://ui.shadcn.com/docs/components/tabs) | `tabs.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [textarea](https://ui.shadcn.com/docs/components/textarea) | `textarea.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [toast](https://ui.shadcn.com/docs/components/toast) | `toast.tsx` | [x] | [x] data-feedback | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [toggle](https://ui.shadcn.com/docs/components/toggle) | `toggle.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [toggle-group](https://ui.shadcn.com/docs/components/toggle-group) | `toggle-group.tsx` | [x] | [x] controls | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [tooltip](https://ui.shadcn.com/docs/components/tooltip) | `tooltip.tsx` | [x] | [x] overlays | [ ] | [ ] | Touch-and-hold or screen-reader activation reveals dismissible native help. |
| [trace](https://ui.shadcn.com/docs/components/trace) | `trace.tsx` | [x] | [x] content | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
| [typography](https://ui.shadcn.com/docs/components/typography) | `typography.tsx` | [x] | [x] presentation | [ ] | [ ] | Native React Native primitives and shared semantic tokens; no DOM runtime. |
