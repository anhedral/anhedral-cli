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
For Android, set `JAVA_HOME` and `ANDROID_HOME` for the pinned React Native
runtime and start a dedicated emulator. Run `pnpm test:native-ui:android -- --device emulator-5558`.
The runner builds a release app and AndroidX UI Automator instrumentation, then checks
every required native case. Skipped, aborted and incomplete runs fail. Source
hashes, retained APKs, native screenshots, hierarchy dumps and logs remain under
`.artifacts/native-ui-android/`. Both platforms use one owned QA preparation path;
unrelated directories and symlinked outputs are rejected. Keep harness preparation
commands serial. Native OS runs remain explicit hardware checks alongside CI's native
rendering, type and Hermes checks.

Each full OS run also sweeps every authored root in the copied catalog. A story must
produce a real native layout and subsequent native frames before the sweep advances.
Caught render errors fail the sweep; the required total is injected from the private
copied catalog, including named exports and excluding support-only modules. This
checks native initial rendering; interaction and accessibility acceptance stay separate.

The QA application's iOS 27 scene lifecycle acceptance remains unresolved. Current
iOS OS evidence uses a compatible 26.5 runtime; retain that compatibility gap explicitly.

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
Card retains all eleven source style families and both modern sizes, including the
original section spacing, footer treatments, image corners, shadows, rings, heading
metrics and Sera casing. Modern custom spacing uses the native spacing prop; reviewed
registry --card-spacing formulas and nested length references share that scope. Native
header rows place explicit CardAction parts beside the title/description column; the
browser grid/container-query implementation stays web-specific. Fragments and native
registry styling wrappers preserve part identity. Dynamically mounted footers register
with their owning Card and release membership. Native text inherits application metrics
where the frozen source has no explicit size. Card examples that depend on other
unfinished components remain pending independently of these reviewed source slots.
The authored modern and frozen Card examples now retain scrollable terms, ordered
meeting notes, array-valued single selections and form fields. Lists preserve start,
reversed and explicit item counters with independent nested scopes; embedded controls
remain accessible. Overflow hosts use native ScrollView with separate content padding
and gap styles. Native underline placement follows OS text decoration rather than CSS
underline offsets. Card image color blending uses the native compositor. These examples
remain partial until their other component presets have full source parity.

Spinner retains the authored Lucide Loader2 glyph, sixteen-point default, inherited
and explicit colors, real class/native dimensions and stroke paint. Native animation
uses one one-second linear rotation with live reduced-motion updates and cleanup.
Animation classes control visual motion independently of the loading state; stopped
indicators may remain visible explicitly. Badge's direct SVG sizing includes Spinner
without reaching glyphs inside nested containers. Native progressbar roles and loading
labels replace SVG status semantics; SVG descendants remain hidden from accessibility.
Custom authored spinner glyphs use the same reduced-motion policy. Native styles,
props and View refs replace browser SVG host attributes and refs.

Input and Textarea retain all eight newer preset rules and the three frozen source
families, including responsive type, placeholder/selection colors, invalid/disabled
paint, source geometry and explicit caller overrides. Native intrinsic layout drives modern
Textarea growth and shrinkage; frozen Default/New York keep their authored fixed minimum.
Authored HTML rows affects only fixed-sizing sources, matching the [HTML textarea
sizing rules](https://html.spec.whatwg.org/multipage/rendering.html#the-textarea-element-2).
Explicit native numberOfLines remains available. Automatic native editing mirrors
uncontrolled text internally while controlled values remain owned by the application.
The OS owns text selection foreground and editing handles. Browser field-sizing and
resize handles become native intrinsic sizing and scrolling; CSS focus outlines
and transitions follow native focus/state rendering. Android RN 0.86 routes TextInput
edge colors to every edge; a native width/padding projection preserves authored
underlines and exact content insets without that unsupported edge-color dispatch.

Use FileInput for a system document picker with typed file metadata, MIME filters,
multiple selection, cancellation and retry. Picked documents are copied to the local
cache; URI access and uploads belong to the application. Browser FileList, DOM file
input events, multipart encoding and arbitrary extension-to-MIME inference are not
native APIs. File selector typography retains its separate source slot. Unsupported
extension filters fail explicitly instead of silently accepting every file.
Use TemporalInput with type date/time for native date/clock selection. Dates use local
YYYY-MM-DD values and times use minute-precision HH:mm values. Bounds, overnight time
ranges, required fields, cancel, disabled/stale results and provider errors preserve
application ownership. iOS stages selection until Apply; Android uses its system
confirmation. Native props, refs, keyboard modes and value callbacks replace DOM
input properties/events; browser date/time formatting, second/fractional step controls
and HTML autofill behavior stay web-specific. These fields have no implicit server,
file upload or application submission handler.

Label retains all eleven style families and sixteen newer theme rules, including
Sera's distinct input versus checkbox/radio/switch typography. Field disabled metadata
and reactive control state replace DOM group/peer selectors. Use controlID for explicit
native ownership; native association metadata replaces sibling ordering and vendor
LabelContext. Label activation preserves cancellation, disabled targets, read-only focus requests
and independent refs. Associated labels avoid duplicate accessible names. Explicit native
text/layout styles win, and letter spacing follows the selected type size. HTML for/slot
and browser cursor rules are replaced by the native field API and OS pointer policy.

Kbd and KbdGroup retain all eleven source families and sixteen newer theme slots,
including source Sans typography, compact geometry, scoped tooltip/input-group paint,
font scaling and caller overrides. Native modal boundaries reset ancestor selectors.
The source SVG size is a default; explicit icon dimensions win. Authored samp output
uses native monospace text, while inline code retains its independent styling.
Keyboard hints remain read-only content; application shortcut registration belongs to
the application. DOM kbd/samp semantics, refs and CSS ancestry become typed native
View/Text hosts and explicit native contexts.

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

Button accepts an element or a native render callback with normalized host props,
disabled state and an optional owning-overlay open state. Stateful children receive
live hover, press, focus, disabled and pending values. Pending blocks activation and
exposes busy while keeping source pending paint distinct from disabled paint. Native
Button children recompute their own source slots and typography; composition forwards
form/type associations and dispatches a form action only once. Callback-added glyphs
participate in the source's icon spacing rules. Native Text render hosts retain centered
alignment and native text metrics. Explicit child styling remains authoritative.

Native focus events supply the focus-visible flag. Disabled and pending focus follows
OS policy; browser tabIndex and Base UI focusableWhenDisabled tab-order overrides have
no direct native counterpart. DOM nativeButton flags are omitted, and native views
with actions become real Pressables. These are deliberate platform boundaries, not a
browser host-prop compatibility layer. Keyboard/screen-reader device acceptance remains
separately recorded.

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

Input Group retains six authored parts, four addon alignments and four button sizes
across all eleven source families. Its compound buttons compose the regular Button
recipe before the group classes, preserving native form actions, refs and focus paint.
Immediate button slots receive composed addon activation, accessible labels, expanded/disabled state and long-press timing; child cancellation is preserved. Descendant state drives group focus, invalid and disabled paint; a disabled child does
not disable sibling actions. Explicit group disabled state blocks its controls.
Native slots track direct versus nested physical views and stop their ancestry at
modal boundaries. Keyboard hints retain direct/descendant source rules and inherited
leading. Textarea and raw autosizing examples grow through native content sizing;
readonly controls keep enabled accessibility state and delegate focus requests to the OS. Native readOnly interaction follows TextInput behavior; browser keyboard-focus parity is not claimed. Adjacent text expressions retain a continuous
native text run for counters and accessibility.

Select retains six source implementations and eleven style families, source trigger
sizes, indicator placement, focus/invalid/disabled paint and native host refs.
A renderer audit consumes all 64 native class slots; one slot delegates and eighteen
are explicit browser-specific decisions, covering all 83 captured source slots.
Controlled object values and array-valued multiple selections retain their callbacks.
The Aria source adapter keeps generic collections, original selectedItems, rich selected
content and the authored country search with locale-sensitive collation and empty state.
Native Modal surfaces preserve safe-area bounds, logical left/right placement and
source offset defaults. ScrollView measures the selected native row for initial scrolling.
Browser portal/trigger coordinates, selected-row anchoring, hover scroll arrows,
backdrop-filter pseudo-elements and CSS animation timing remain explicit platform
boundaries. Native surfaces retain source alpha, native shadows and direct state paint.
The native API uses View/Text/ScrollView refs and native press/focus/scroll events;
it does not install the browser primitive libraries or emulate DOM objects.

Alert retains all six source implementations, twenty-one class slots, both variants and
all eleven style families. Modern native rows preserve direct glyph columns, title/body
spacing and action padding; frozen roots retain their physical icon inset and the
source div-only sibling offset. Sera's source pseudo stripe becomes a non-interactive
native edge. Scoped native link underline/hover and paragraph spacing/leading preserve
the authored descriptions, including their lists. Native descriptions use block Views
with inline Text runs, so paragraphs and lists do not collapse into a single text node.
Generic display titles remain independent from Alert typography. Native announcements,
View/Text refs and native action events replace browser alert hosts and DOM events.
CSS underline offset, browser text layout algorithms and DOM selectors remain explicit
platform boundaries; native line breaking/clamping and direct geometry provide their
reviewed adaptations. Physical screen-reader acceptance remains separate.

Progress retains six source implementations, eleven style families and eighteen
source class slots. Base/Aria roots append their track after source labels/values;
Radix and frozen roots retain their single track. Native width geometry disables
unwanted flex growth; Radix/frozen fills keep physical left anchoring, while compound
tracks inherit logical direction. Thin source tracks remain fixed under font scaling.
Base preserves raw-value formatting and its (formattedValue, rawValue) callback;
Aria preserves normalized range formatting and its single formatted-value callback.
Aria's unknown indicator is full width and has no value text/callback; the other
source families retain an empty unknown track. Native finite range guards, progressbar
values and busy state replace browser hosts. Unknown transitions explicitly clear old
accessibility text. Formatting uses a locale prop/provider or the runtime locale. Dynamic ProgressLabel text registers
with its own root. External field labels/descriptions apply only with an explicit
nativeID, so a supporting strength bar cannot steal an input's label. Native View/Text
refs and layout events replace DOM refs, and native direct state paint replaces CSS
transition/percentage-transform timing. Companion primitive contracts are reviewed
against their exact upstream lock-integrity-verified package versions.

NativeSelect owns all four actual upstream source definitions and all nine published
style families (the older Default/New York registries do not publish this component).
Its wrapper, control, icon, option and optgroup slots retain source typography, size,
focus/invalid/disabled paint and Mira's asymmetric small-icon offset. Native font
scaling grows compact controls. Intrinsic width measures the widest option label;
explicit wrapper width remains caller-owned. Empty option values, omitted value/text
normalization, first eligible selection, disabled groups, controlled ownership and
removed-option fallback are tested. A fallback reset does not emit a user callback.
Native refs, press events and onValueChange replace HTMLSelectElement/onChange.
The popup uses the maintained native Modal collection; HTML system picker rendering,
Canvas/CanvasText system colors, browser form submission/validation, keyboard/typeahead
and CSS transitions remain explicit platform differences. Canvas colors map to the
native popover tokens. Older frozen style names are optional native extensions using
New York v4 metrics, rather than additional upstream publications.

The authored copy example uses the OS clipboard through Expo Clipboard, with success,
rejection, timeout and unmount handling. Its companion upstream hook, outside the
published registry index, has an explicit source path, pin and SHA-256; changing the
upstream pin requires review. Tabler examples use native SVG glyphs from the same
3.34.1 version locked upstream. Native overlay offsets displace the viewport-relative
surface along its side and alignment axes. Browser trigger-coordinate anchoring,
portal coordinates, CSS focus outlines and color/box-shadow transition timing remain
explicit web-specific boundaries; native surface positioning and state paint are
maintained separately. Overlay preset/API parity remains unfinished.

## Official registry assets and recipes

The authored component example overlay currently includes 470 reviewed source modules,
with 166 source-pinned Lucide native selections. Generate and validate these through
`node scripts/native-example-recipes.mjs --source /absolute/path/to/the/pinned/shadcn-ui`
and `node scripts/native-icons.mjs --check`. Their coverage remains partial while
component preset/API parity is unfinished. The overlay includes 101 distinct published examples from each of the legacy Default and New York registries. Their original
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
ChartContainer, ChartTooltipContent and ChartLegendContent accept native View refs
and typed `textStyle` overrides. Tooltip `labelStyle` replaces browser
`labelClassName`. All eleven source style families retain tooltip padding,
border/ring/shadow layers, radius, twelve-point type and indicator/icon geometry.
Native SVG paints source grid, axis, cursor and marker rules directly. CSS selector
matching and Recharts DOM animation internals remain browser mechanisms; the native
renderer uses explicit drawing state, touch selection and accessibility actions.

The generator verifies every input against the official inventory before translating.
It also compares all authored data/config literal ASTs before and after translation,
including inline payloads; changed, missing or reordered inputs fail generation.
Each chart recipe retains that review fingerprint. Browser ChartStyle's redundant
CSS-injection config is excluded from this check; native ChartContainer owns colors.
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

Registry fields retain required, minimum length, pattern, email and URL constraints
through scoped native form registrations. Schema-owned RHF, TanStack, Formisch and
action forms opt out of the browser constraint layer and retain their existing schema
errors; explicit noValidate overrides remain available. Submission focuses the first invalid field
and exposes an accessible error; disabled and removed fields no longer block it. The
registry Button adapter preserves HTML implicit submission for Radix and frozen sources;
Base and Aria buttons default to button, as do public native Buttons and internal
compound controls. Explicit unassociated submit buttons without a form ID are inert,
matching the authored Card Login button outside its form. An explicit missing form ID
still fails visibly. Demonstration forms without a handler report their missing action
instead of inventing application authentication or browser page navigation.

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
