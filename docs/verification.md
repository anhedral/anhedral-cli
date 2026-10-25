# Input Group source presets, composed actions and authored examples — October 25, 2026

Input Group now retains all six source implementations, eleven style families,
four addon alignments and four button sizes. Source rules drive native control,
button, text and Kbd geometry, focus/invalid/disabled paint and font growth.
Scoped metadata follows physical native hosts; it does not feed aggregate invalid
or disabled state back into independent sibling controls. Explicitly composed
addon triggers forward actions to their native inner buttons with child-first
cancellation, accessibility metadata and long-press timing.

Eight additional authored modules bring the catalog to 728 modules and 724 roots.
The companion clipboard hook retains its upstream pin/hash with native OS clipboard
writes, failure reporting, success timers and cleanup. Native Tabler 3.34.1 matches
the pinned upstream web package. Custom autosizing textareas retain raw preflight
geometry; adjacent raw text stays continuous. Source country menu callbacks,
copy/favorite controls and nested popup/tooltip actions have direct regression tests.

Browser DOM bubbling, textarea resize handles, clipboard fallback nodes, portal
coordinates and exact CSS animation timing remain explicit platform boundaries.
Read-only controls stay enabled and forward focus requests to the native TextInput;
browser keyboard-focus parity is not claimed. Overlay-dependent examples remain
partial until their owning presets/API are complete. Input Group and six independent
examples close seven checklist groups: 188 accounted for, 431 unfinished.

Validation:

- All 61 native suites and 1,782 tests passed on each target after the final
  accessibility/userSelect changes. All 728 modules bundle for both Hermes targets;
  generated native typecheck, source generators, lint, static security, CLI contract
  checks and packed consumer checks passed. The earlier complete CLI run passed
  673 tests with one existing optional skip; final source/checklist changes received
  focused regression and packaging checks. Packlist: 249 files, 1,065,594 packed bytes.
- Full Android and iOS 26.5 runs each passed all 19 cases, including all 724 authored
  roots. Evidence: Android `.artifacts/native-ui-android/2026-10-25T16-25-35-074Z/`
  and iOS `.artifacts/native-ui-ios/2026-10-25T16-33-15-790Z/`.
- The final metadata/userSelect refinement passed the focused regression on both
  targets: Android `.artifacts/native-ui-android/2026-10-25T16-45-51-983Z/` and
  iOS `.artifacts/native-ui-ios/2026-10-25T16-50-44-753Z/`.
  APK 38787feda692b810389f469d403a437b0157fc96f6525adc7b120d3f6db2eb69;
  test APK a089b5c872197c9fc87a6a886cd457d1d2ff403e2fbcacfa7efbccf9d023be33.
  Source equivalence for all 143 native files is retained under
  `.artifacts/native-ui/2026-10-25-input-group/`. Focused results are not described
  as full same-binary suite acceptance. Android screenshots were inspected.
- Earlier failed runs are retained: Android readiness/reveal races and an iOS
  keyboard-covered dismiss target. The driver now waits for actual registration,
  stable physical bounds and disabled state; iOS uses the input Return action.
  Actual composed-button popup failure was independently reproduced before the
  implementation fix. No coverage gate or assertion was weakened.

Expanded screen-reader/physical-device acceptance and the QA app's iOS 27 scene
lifecycle adoption remain separate. These checks do not close the remaining registry.

# Source chart styles, native rendering and input provenance — October 25, 2026

ChartContainer/Tooltip/Legend retain all six source implementations and eleven style
families, including tooltip surfaces, padding/radius/shadows/rings, source type,
three indicators, icon precedence, formatter zero, scoped colors, native refs and
caller textStyle/labelStyle. Source SVG rules now retain grid border/50, axis/cursor
paint and literal-white marker outline handling. Vertical charts draw a horizontal cursor
at the selected category. Browser ChartStyle injection, DOM refs,
CSS selectors and Recharts animation/package internals remain explicit boundaries.

All 231 chart modules now guard 483 authored data/config literal inputs through AST
comparison during translation and retained fingerprints. The native module sources
are byte-identical to the previous catalog; the new metadata records that review.
The shared validator still accepts non-chart form/example catalogs. Source review
accounts for 76 further item groups; 438 remain unfinished. Interactive area and pie
blocks keep pending Select preset coverage, including Select imports omitted by
upstream registryDependencies. Other UI/example/block work remains open.

Visual/source review caught double Android shadows: RN 0.86 applies elevation to
the native View and independently paints boxShadow drawables. Source utilities now
use their exact shadow/ring layers with zero additional elevation. Before/after
Android screenshots were inspected and retained with the owning native excerpts.

Validation for this change:

- All 59 native suites/1,719 assertions passed on each target after the final shadow
  correction. All 720 modules bundle for both Hermes targets. Source generators,
  API ledger, generated typecheck, lint and static security pass. CLI tests: 669
  passed, one existing optional skip. Packed consumer and packlist passed: 249 files,
  1,050,158 packed bytes, within the existing budgets.
- Android: all 18 instrumentation cases passed, including the 716-root sweep,
  eleven measured tooltip presets, all six series and actual displayed value updates.
  Evidence: `.artifacts/native-ui-android/2026-10-25T14-29-00-133Z/`.
  APK 22837b094457abac63dd8d48832fa865b9d3b0fea25ef2a0238243b6ab433996;
  test APK 361f8896c2e443374678d5b1cce2b315bd009df83b47675888d685b437ba3265.
- iOS 26.5: all 18 XCTest cases passed, including the 716-root sweep and chart
  matrix. Files restores its previous folder and can expose two Browse buttons;
  the driver now targets the actual document-picker tab bar. The failed full run
  at `2026-10-25T14-30-32-591Z` is retained. The focused regression passed at
  `2026-10-25T14-46-45-954Z`; the complete rerun used those unchanged built binaries.
  Full evidence: `.artifacts/native-ui-ios/2026-10-25T14-52-12-472Z-reuse-full/`.
  App binary ec764566e0216ac244043ebe94d08c3722ae1183f884dceec1ee33c42c487a81;
  XCTest binary 47cb94560f8f607474f2ce5e6720d12b8e751851c9f1c30396fd7f6056d914cc.
  Both hashes were checked before/after execution, and all 139 shipped native source
  files matched the review index and private built copy. Focused runs are not counted
  as full acceptance. An earlier obsolete run was interrupted for the shadow update
  and is separately identified as interrupted.

Detailed source equivalence, immutable-input review, native shadow owners and visual
comparison live under `.artifacts/native-ui/2026-10-25-chart-presets/`. Expanded
screen-reader/physical-device acceptance and the QA application's iOS 27 scene
lifecycle work remain separate; these results do not close the remaining registry.

# Source example gallery sizing — October 25, 2026

The three modern Example/ExampleWrapper implementations now retain source background,
responsive grid/container widths, 48-point panel padding, theme radius and caller
class ownership. Native class composition uses the pinned tailwind-merge 3.5.0.
Utility translation corrects container widths, media/dark/preset precedence, padding
replacement and flex basis resets. The direct-container width selector currently
covers raw views and Card roots; other component owners remain explicitly partial.

Native device testing caught zero-height single-column panels: native scroll/flex
layout needed an intrinsic auto basis to reproduce CSS grid auto rows. Explicit
active basis utilities and native contentStyle still override it. Final Android
screenshots were inspected and show restored Card list content. Measured gallery
panels are 320×116 with child inset 48,48; p-0 panels are 320×20; two-column cells
are 144×116. Earlier failed and focused runs remain preserved.

Validation: all 58 native suites/1,691 assertions passed per platform, all 720
registry modules bundled for both Hermes targets, and all 17 required OS cases
passed on Android and iOS 26.5. Both runs include all 716 authored story roots.
All 137 native source files matched both private device copies. CLI tests passed
664 with one existing optional skip; lint, static security, packed consumer and
packlist checks passed (1,044,262 packed bytes). The source-equivalence report is
`.artifacts/native-ui/2026-10-25-example-layout/device-source-equivalence.json`.
Android evidence: `.artifacts/native-ui-android/2026-10-25T13-59-28-163Z/`, APK
719e8fa4c1d3693644a073f6eace1f544e4aa27c84243324e23124cac6861460,
test APK 16ca1f3b397810019daacf9392012f81d0187b0b049019938379377fc4db430e.
iOS evidence: `.artifacts/native-ui-ios/2026-10-25T14-00-42-011Z/`.
These runs establish this layout fix, not completion of the remaining registry.

# Source labels and complete authored native rendering sweep — October 25, 2026

Label retains all six source implementations and sixteen newer theme slots, including Sera's distinct input versus checkbox/radio/switch typography. Reactive native control metadata and Field disabled state replace DOM label lookup, peer/group selectors and vendor LabelContext. Native labels preserve cancellation, independent control IDs/refs, disabled targets, read-only focus, cleanup and explicit caller styles. Tracking resets now clear inherited em spacing. Keyboard groups and unbound labels preserve inherited native text tone.

The OS harness now requires a native layout and subsequent frames for every authored story before advancing. Its required total is derived from the private copied catalog, rejects duplicate identities and excludes support-only modules. Both complete release-built OS runs passed every one of 16 required cases, including all 716 authored roots, label-to-input focus, source layout, controls, system document selection/cancel and date/time selection/cancel. This establishes native initial rendering for the maintained catalog; it does not replace per-item interaction, visual or screen-reader acceptance or establish completion of pending official registry work.

- Native tests: 57 suites and 1,677 assertions passed per platform, with existing coverage thresholds unchanged. Typecheck passed; Hermes compiled all 720 authored modules for both platforms.
- Android: `.artifacts/native-ui-android/2026-10-25T12-49-48-341Z/`; all 16 cases passed. APK SHA-256 `8563f07b4ddebc924c59dcb163b4036576005cfc3bee8beb3b62f274956c7920`; test APK `efdcd581e24d9a458aac5ddd5ac255ca7fa24b7a76b593271ea0882910694988`. The during-sweep screenshot was inspected and native final screenshots/hierarchies are retained.
- iOS 26.5: `.artifacts/native-ui-ios/2026-10-25T12-50-36-268Z/`; all 16 cases passed on the requested dedicated simulator. The 716-root sweep passed in 215.859 seconds. iOS 27 scene lifecycle acceptance remains unresolved separately.
- All 136 canonical native source files match both private device build copies; evidence: `.artifacts/native-ui/2026-10-25-label-presets/device-source-equivalence.json`.
- CLI unit checks passed (658 passed, one existing optional install skip). Lint, static security, source/checklist contracts, packed-consumer smoke and packlist policy passed. Logs: `/private/tmp/anhedral-label-*`. The package remained within the unchanged size budget.

The official registry checklist accounts for Label and the composed frozen input/textarea/file label examples. Field, choice-control, modern composite examples and other source presets remain independently pending.

# Source keyboard hints and sample output — October 25, 2026

Kbd/KbdGroup retain all six source implementations and sixteen newer theme slots: source Sans typography, compact heights, spacing, radius, light/dark paint, tooltip/input-group ancestry and explicit text/icon overrides. Native modal boundaries reset physical ancestor selectors. Source sample-output elements use native monospace text; inline code keeps its independent styling. Three modern authored Kbd examples were added, bringing the catalog to 455 component examples and 720 total authored modules. Shortcut registration remains application-owned. InputGroup/Tooltip full preset parity and keyboard device/screen-reader acceptance remain separate.

Validation: all 56 native suites passed on each platform target (1,648 assertions each) with existing coverage thresholds; the subsequent final icon-sizing regression passed in the focused 37-case suite on both targets. Native typecheck passed. Metro/Hermes compiled all 720 modules for both platforms. Source evidence tests reject changed source/CSS bytes and additional direct or descendant selectors. The official registry checklist now accounts for Kbd and its three isolated frozen examples; modern composite Kbd examples remain partial until their dependencies are complete. CLI unit checks passed with one existing optional install skip; lint, static security, packed-consumer smoke and packlist policy passed. Detailed logs are retained as `/private/tmp/anhedral-kbd-*` and native bundle/coverage artifacts under `.artifacts/`.

# Source text fields and native system pickers — October 25, 2026

## 2026-10-25 — Published registry endpoints outside indexes

The pinned upstream tree also publishes four block endpoints omitted by its registry indexes: default/new-york `v0-sidebar-16`, new-york `app-01`, and new-york `button-01`. All four returned HTTP 200 with bodies matching their pinned Git artifacts. The inventory now retains 6,441 style/item entries, 619 item groups and 2,085 referenced source files. The native checklist keeps the three added groups pending; existing review fingerprints are unchanged. Discovery reads tracked Git publication bytes, includes discovered style directories, ignores preview images and rejects unexpected JSON layouts. Cached index provenance remains separate from the snapshot assembly date.

Validation: all 18 official registry contract tests passed, including committed-byte discovery, untracked-file exclusion, endpoint identity/path rejection and native evidence invalidation. The inventory diff contains exactly four additions and no removals or changed existing items. Detailed HTTP/hash and diff evidence is retained under `.artifacts/shadcn-registry/`. This discovery does not establish native completion for the added blocks.

Input and Textarea retain all eleven source families and sixteen newer CSS rules,
with responsive typography, native font scaling, placeholder/selection colors,
focus/invalid/disabled state and caller overrides. Native field bindings now cover
all authored text/password/email/phone/URL/search/number/file/date/time types.
FileInput uses Expo DocumentPicker 57.0.3, with cache-backed metadata, filters,
multiple selection, cancellation/retry and stale-result guards. TemporalInput uses
the Expo-compatible native DateTimePicker 9.1.0 API, with local canonical values,
bounds, overnight time ranges, controlled ownership and staged iOS Apply/Cancel.
Uploads, multipart encoding, DOM events/refs, browser resize/selection details and
OS-specific calendar behavior remain explicit native/application boundaries.

- Native suites: 1,609 passed per platform across 55 suites with existing coverage
  thresholds. All 717 modules compile to both Hermes targets. Generated typecheck,
  the CLI unit suite, lint, static security and focused source/driver contracts pass;
  the existing optional braces-runtime skip remains. The catalog now contains 452
  authored component example modules and 713 authored UI story roots.
- Device testing exposed an initial content-size height lock. Modern Textarea now
  uses intrinsic layout and mirrors uncontrolled editing; controlled values retain
  application ownership. Frozen HTML rows uses source font/padding/border metrics.
  Both OS platforms verify growth/shrinkage and the legacy three-row 90-point height.
- Real iOS date-wheel testing exposed feedback from intermediate controlled updates.
  Native picker seeds now remain stable while the draft changes; Apply commits the
  latest draft and external application value changes still replace it. A large
  25-to-17 day change, clock selection and cancellation pass on native controls.
- Visual review caught RN 0.86 Android TextInput's per-edge color setter targeting
  ALL edges. Native widths and compensating padding preserve the source underline,
  outer dimensions and exact text insets. The before/after Android screenshots were
  inspected; Sera keeps its 160×40 geometry and no longer paints side borders.
- Android: all fifteen release instrumentation cases passed. Evidence:
  `.artifacts/native-ui-android/2026-10-25T12-02-06-901Z/`. APK SHA-256
  be6becb1035ff5813148a6add46f981349dcab6a8d11cb3125511311647d463a;
  test APK 6ed0d698697969982f687e597877b2fde7dc3d24599ced45bfeffd33919e6148.
- iOS: all fifteen required XCTest cases passed on the owned iOS 26.5 simulator.
  Evidence: `.artifacts/native-ui-ios/2026-10-25T12-03-43-527Z/`. Focused runs are
  separately identified and cannot replace the full expected-case gate.
- QA document seeding preserves collisions and symlinks; file sharing is enabled
  only in the owned QA app. Real system document selection/cancel is exercised on
  both platforms. Earlier native failures remain in their dated artifact directories;
  picker-window settling, label coordinates and UIKit's border-excluding accessibility
  frames were corrected without removing native cases or assertions.

Source review, renderer excerpts, byte comparison, retained failures and final logs
live under `.artifacts/native-ui/2026-10-25-input-presets/`. Input, Textarea and six
self-contained legacy example groups are accounted for. Modern aggregate examples
and file examples retain partial status for unfinished Label/Field/Select presets.
The indexed registry checklist is 97 groups accounted / 519 pending at this review;
a separate audit has identified four additional published legacy endpoints outside
those indexes, which must also be inventoried and ported. These results do not
establish complete registry, physical-device, expanded screen-reader or store acceptance.

# Source Spinner and native glyph composition — October 25, 2026

Spinner now uses the authored Lucide Loader2 glyph, size-4 default, inherited/custom
colors, stroke and actual native dimensions. A one-second linear native animation
responds to live reduced motion and releases its resources. Custom authored glyphs
use the same fail-static preference policy. Native progressbar names/View refs replace
browser SVG status and host semantics. Badge's direct SVG size rules include Spinner
and fragments while preserving authored sizes inside nested containers.

- Native suites: 1,521 passed per platform across 51 suites with existing coverage
  thresholds. All 711 modules compile to both Hermes targets. Generated typecheck,
  lint, static security and focused registry/driver contracts passed.
- CLI suite: 640 passed, one existing optional braces-runtime skip. Packed-consumer
  smoke passed; packlist before evidence changes: 249 files / 1,021,771 packed bytes.
  Full CLI validation caught a stale assertion expecting Button to remain pending;
  the explicit checklist assertions were updated and the full run then passed.
- Android: all twelve release instrumentation cases passed. Evidence:
  `.artifacts/native-ui-android/2026-10-25T09-50-40-420Z/`. APK SHA-256
  90a277af4deaad0208e8927aa9c3613db7663cec98ca81973ed122ba64ea4e92;
  test APK 7095e7b682ac8d6fe0dcad325f48fddfc18b46bdd852d1a0cf89d285ad47f26b.
- iOS: all twelve XCTest cases passed without skips in 365.659 seconds on the owned
  iOS 26.5 simulator. Evidence: `.artifacts/native-ui-ios/2026-10-25T09-55-55-918Z/`.
  The completed result summary was validated and screenshot attachments exported.
  Both platforms' Spinner screenshots were inspected: a 24-point red source glyph,
  12-point Badge glyph, inherited Button color, stopped glyph and one action.
- All 123 native source files matched both device QA copies before Input work began.
  `.artifacts/native-ui/2026-10-25-spinner/` retains that equality, source review,
  patches, logs and upstream Lucide 0.474.0 tar integrity/glyph verification.
  The earlier iOS run was interrupted after a selector failure: Fabric's native
  scroll element omits the wrapper testID. The final helper selects the largest
  actual scroll viewport and retains all native cases/assertions.

Spinner plus six authored basic/Button/Badge/size/color/custom example groups are
accounted for: 89 groups accounted / 527 pending. Examples depending on unfinished
Empty, Item, InputGroup or Field slots remain partial. These results do not establish
complete registry, physical-device, screen-reader or store acceptance.

# Native Button callback and form composition — October 25, 2026

Button now supports element/function render hosts and live children state, including
hover, press, focus, disabled and pending values. Native views and text preserve
refs, consumer styles and centered source typography. Callback-added glyphs affect
source spacing; nested Buttons retain their own CVA. Child-first cancellation and
form/type ownership prevent duplicate submissions and unintended select/link submits.
Native focus supplies focus-visible; disabled and pending focus follows OS policy.
DOM tab-order/nativeButton flags remain explicit platform boundaries.

- Native suites: 1,488 passed on each platform across 50 suites, with unchanged
  coverage thresholds. All 711 source modules compiled to both Hermes targets.
  Focused CLI native-driver/gallery contracts: six passed. Lint/static security and
  packed-consumer smoke passed; packlist: 249 files / 1,019,953 bytes before this
  evidence entry. The preceding full CLI run passed 640 tests with one optional skip.
- Android: eleven release instrumentation cases passed on the owned API 36 emulator.
  Evidence: `.artifacts/native-ui-android/2026-10-25T09-33-43-990Z/`.
  APK SHA-256 101321ce0196cdc10df28ad08c2dbcd0529d7debe57674e02aa887a497426d36;
  test APK fa3a7848a52cd7908f1402b40205b36f4ad439cd8811a6b3e9ae3318c899bf8b.
- iOS: all eleven XCTest cases passed without skips in 356.901 seconds on the owned
  iOS 26.5 simulator. Evidence: `.artifacts/native-ui-ios/2026-10-25T09-31-41-145Z/`.
  Completed xcresult summary was validated and attachments exported. Callback-control
  screenshots on both platforms were inspected; counters, source geometry and
  distinct pending paint are visible. All 122 native source files matched both QA
  copies before the next component work began.
- Prior failed runs remain retained. Android busy labels include an OS suffix;
  XCTest exposes a combobox outside its Button query. Scroll helpers now target the
  owned gallery viewport, allow native mount/gesture settling and reveal clipped
  content by its leading edge. Required cases and assertions were preserved.
- Dated local source equivalence, patch and logs:
  `.artifacts/native-ui/2026-10-25-button-callbacks/`.

Button's reviewed component group is now accounted for: 82 groups accounted / 534
pending. Dependent example groups remain independently pending. This does not
establish full registry, physical-device, store or screen-reader acceptance.

# Authored Card examples and native content semantics — October 25, 2026

Nine more authored source modules retain the modern Card example, login Card and
frozen notification/project examples. The overlay now has 446 component examples,
34 form/support modules and 231 chart modules: 711 modules and 707 renderable authored
stories. Both frozen registries retain 99 distinct component example modules. Catalog
contracts now cross-check these documentation counts against the actual source catalog.

- All twelve modern Card sections are tested across Base, Radix and Aria and all
  eight presets. Spacing selections, five numbered notes, nested/counter lists,
  native scroll content styles and source-specific form button defaults are tested.
  Plain lists retain Tailwind preflight's absence of markers. Source grids with a
  fixed icon track, last-item spacing, hover underline and image color composition
  have explicit native adapters; image title hover tooltips use retained alt names.
- Plain native forms register required/type/pattern/length constraints, focus the
  first invalid field and report accessible errors. Disabled/unmounted controls
  release constraints. Schema-owned RHF, TanStack, Formisch and action examples
  retain their schema validation through explicit native noValidate policy.
  Unassociated Login buttons remain inert as authored; forms without handlers
  expose their integration boundary rather than inventing application actions.
- Full generated tests: 1,471 passed on each platform, 48 suites each, with existing
  coverage thresholds intact. All 711 modules compiled to iOS/Android Hermes.
  Strengthened all-twelve-section tests passed in all 24 modern source/style cases
  on each platform. Native generated typecheck, lint and static security passed.
- CLI tests: 640 passed, one optional skip. Packed consumer installation passed;
  packlist before this evidence entry: 249 files / 1,017,052 packed bytes. The first
  root run caught a stale generated checklist template, which was corrected and
  cross-checked against actual module counts before the passing full run.
- Full native runs caught implicit submit defaults reaching internal select controls
  and generic constraints replacing library schema errors. The authored Button
  adapter now owns implicit HTML defaults, and schema-owned forms bypass native
  browser constraints. The original failing logs remain in local dated evidence.
- Android: all ten release instrumentation cases passed on the owned API 36 emulator.
  Evidence: `.artifacts/native-ui-android/2026-10-25T08-14-07-964Z/`; APK SHA-256
  e94ac4781cb4bc2e0092636374f3d09b6d30fb198b1bccc8a2a9e8ca9835d49c.
  Test APK SHA-256 a832b47aae95b663c7c1b671dd742b172453d22a5dc4179d672203f3af493fa2.
- iOS: all ten XCTest cases passed without skips in 271.553 seconds on the owned
  iOS 26.5 simulator. Evidence: `.artifacts/native-ui-ios/2026-10-25T08-15-06-666Z/`.
  Completed xcresult summary was validated; screenshot attachments were exported.
  Both platforms' authored Card list screenshots were visually inspected. Native
  source bytes match both device QA copies. XCTest keeps results/screenshots but
  disables automatic full-system diagnostic collection after its prior stalls.
- `.artifacts/native-ui/2026-10-25-card-examples/` retains source-equivalence and
  package review evidence. Base UI 1.6.0, React Aria Components 1.20.0, React Aria
  3.51.0 and Tailwind 4.3.0 archives were verified against pinned lock integrity.
  Their button defaults and list preflight informed these adapters.

Coverage remains 81 accounted / 535 pending. Card examples have explicit partial
entries until dependent component presets/API behavior is complete. These tests do
not establish full registry, screen-reader, physical-device or store acceptance.

# Upstream package provenance — October 25, 2026

Registry review now includes the exact pinned upstream package manifests, pnpm
workspace and lockfile, reachable package integrity and peer contexts, workspace
source trees and patched dependency bytes. Literal dynamic imports, require calls
and import types enter the inventory. Unresolved dynamic expressions require
renewed review on every upstream revision. Global CSS also invalidates v4 UI
consumers while hooks remain independent of stylesheet changes.

- The upstream pin and published metadata baseline are unchanged. Nine exact Git
  inputs cover 74 npm roots; all resolved graphs are complete. The legacy
  `tailwindcss-animate` declarations have no version in the current upstream lock;
  four browser style/index references remain explicit. No version was invented.
- All 702 native recipe source bytes, upstream hashes and origins remain identical;
  all eight theme values remain identical. Coverage stays 81 accounted / 535 pending.
  Evidence: `.artifacts/shadcn-registry/package-runtime-equivalence.json` and the
  retained previous inventory and source-import-analysis records.
- Root unit tests: 639 passed, one optional skip. Native generated typecheck,
  lint, static security, packed consumer installation and packlist passed:
  249 files, 1,006,760 packed bytes. New Git fixtures test package-only changes,
  transitive/peer/alias/cyclic graphs, workspace code, patch bytes, dirty checkouts,
  dynamic imports and unrelated-package isolation. CI includes these contracts.
- This changes review provenance, not native runtime behavior; the unchanged
  native source retains the separately recorded Jest, Hermes and OS evidence below.
  It does not establish complete registry parity or a dependency advisory audit.

# Native Card source styles and measured geometry — October 25, 2026

Card now retains the eight modern presets and three frozen source definitions for
all seven slots. The source generator verifies exact component hashes, 48 ordinary
CSS slot rules, both spacing formulas and Vega's additional direct-Choices selector.
It rejects new selectors or changed source definitions until renewed review.
Native header rows replace browser grid placement; source footer conditions,
direct image corners, rings, shadows, typography and casing are preserved.

- Custom modern spacing has a native numeric prop and a scoped translation of the
  authored card-spacing formula, including nested padding and negative margins.
  Footer membership handles opaque/dynamic children and cleanup. Keyed fragments
  preserve child state when reordered. Explicit native text/view overrides win;
  relative letter spacing uses the final font size. Wide/wider values were checked
  against the retained Tailwind 4.3.0 theme source.
- Full native suites passed 1,422 tests per platform in 46 suites with unchanged
  coverage gates. Final generated typecheck and all 33 focused Card cases passed
  on both targets after narrowing internal text-paint props to the root slot.
  All 702 maintained native modules compile into iOS/Android Hermes bundles.
- Android API 36 arm64: all nine physical acceptance cases passed. Card checks
  measured all sixteen modern preset/size combinations and the 105-point bordered
  footer. Evidence: .artifacts/native-ui-android/2026-10-25T07-12-31-641Z/.
- iOS 26.5: all nine cases passed, including every Card measurement. The finalized
  xcresult summary was independently checked for nine passed, zero failed/skipped
  or expected failures, on the exact owned simulator. Evidence:
  .artifacts/native-ui-ios/2026-10-25T07-21-50-115Z/. Xcode's post-test automatic
  diagnostic collection stalled; only its owned simctl-diagnose child was stopped.
  Xcode then finalized successfully. The action, command, sources, summary and
  screenshots are retained. Both platforms' final Card screenshots were reviewed.
- Earlier failed/interrupted device runs remain retained. They exposed duplicate
  UIKit text snapshot matches, high-inertia XCTest swipes, stale Android scroll
  nodes and a footer expectation missing the source border's one point. Corrected
  checks use actual visible bounds, fresh native nodes and measured drags; they do
  not accept offscreen labels or relax the expected component dimensions.
- CLI build/lint/static security, 633 root tests (one existing optional skip),
  focused source/coverage/runner contracts, packed consumer and packlist checks
  passed before this dated evidence entry. The preceding pack measured 249 files
  and 1,004,145 bytes. Detailed logs are retained with the native Card evidence.
- Card and the composed modern Skeleton example are now accounted for: 81 groups
  covered, 535 pending. Dependent Card examples, other unfinished component styles,
  screen-reader/store/physical-device acceptance and the Expo 57 / iOS 27 lifecycle
  gap remain explicit. No publication or deployment occurred.

# Native OS registry acceptance runners — October 24, 2026

Added an explicit-device Android instrumentation runner and shared owned QA app
preparation. Preparation rejects unrelated directories and symlinked outputs;
source manifests identify the copied native gallery. Android evidence retains
both APKs and their hashes, the exact runner/test sources, instrumentation output,
logcat, eight screenshots and native hierarchy XML. Result validation rejects
skips, partial runs and abnormal completion. CI scope now includes all owned native
generators, boundary checks and runner contract tests.

- Android API 36 arm64 emulator: all eight physical interaction cases passed,
  including source Button metrics/actions, composed hosts, route destinations,
  toggle/pagination state, associated input focus, layout geometry and visible
  authored description terms/values. Evidence:
  .artifacts/native-ui-android/2026-10-25T06-36-51-967Z/.
- iOS 26.5 simulator: the same eight acceptance areas passed. Xcode then spent ten
  minutes collecting simulator diagnostics and reported a diagnostic timeout;
  its completed xcresult and process still report TEST SUCCEEDED. The retained
  screenshots were exported and visually reviewed, including all three visible
  description rows. Evidence:
  .artifacts/native-ui-ios/2026-10-25T06-34-17-996Z/results.xcresult.
- CLI build, lint, static security, 630 root tests (one existing optional skip),
  packed-consumer smoke and packlist policy passed. Packed artifact before this
  evidence entry: 249 files, 1,001,295 compressed bytes. Contract logs remain under
  /private/tmp/anhedral-native-device-*.log. Native implementation is unchanged
  from the preceding 1,389 tests per platform / 702-module Hermes validation.
- Earlier failing Android runs remain retained. They exposed gallery transition
  synchronization and inline accessibility-name assumptions; the corrected tests
  require actual visible elements and assert destination/state after real taps.
  This does not establish screen-reader, physical-device/store, iOS 27 or complete
  registry parity. Coverage remains 79 accounted groups and 537 pending. No package
  publication or deployment ran.

# Native description lists and authored layout metrics — October 24, 2026

Added native term/definition hosts for authored description lists, including nested
lists, multiple terms/definitions, dynamic labels, native IDs/refs and individually
accessible embedded controls. The initial labelled-by approach replaced definition
values in accessible names; combined native term/value labels now preserve both.

- Added the actual Base/Radix/Aria Separator example modules. Every authored section
  renders under all eight newer styles. There are 437 component example modules and
  702 native registry modules overall. Separator-example now has reviewed source
  coverage; strict whole-registry completion still rejects 537 pending type/name groups.
- Native typography retains font-size/line-height slash modifiers, extended source
  sizes, explicit leading precedence and inherited leading resets. Authored flex boxes
  use browser row defaults while explicit column directions remain authoritative.
  Skeleton also safely wraps raw native text children.
- Both full native suites passed 1,389 tests across 45 suites with unchanged thresholds;
  strict generated types and both 702-module Hermes bundles passed. Root tests passed
  625 with one existing optional skip. Lint, source contracts, security policy,
  installed package smoke and packlist passed (1,000,654 compressed bytes).
- Failed association/type/curation diagnostics and corrected results are retained
  under .artifacts/native-ui/2026-10-25-native-descriptions/. Device screen-reader and
  visual matrix acceptance remain separate; no additional physical device acceptance
  is inferred from this source promotion. No publication or deployment occurred.

# Native Skeleton source styles and layout primitives — October 24, 2026

Skeleton retains all eight newer presets and three frozen source styles. Source hashes
and CSS selectors guard every definition. Native-driver pulse uses the upstream
[two-second cubic easing and half-opacity midpoint](https://tailwindcss.com/docs/animation),
responds to live reduced-motion changes, rejects stale preference reads and releases
animations/subscriptions. Raw authored pulse utilities use the same implementation.
Separator preserves source-specific decorative defaults and stretch/full-height layout;
AspectRatio uses native geometry. Their one-host composition retains refs and callbacks.

- Strict generated types passed. Both full native suites passed 1,356 tests across
  44 suites with unchanged coverage thresholds; both Hermes bundles contain all 699
  registry modules. Forty-four Skeleton contracts include all source styles and modes,
  authored section rendering, source dimensions, overrides and motion lifecycle.
- Root tests passed 622 with one existing optional skip. Lint, source contracts,
  security policy, installed CLI smoke and packlist checks passed; package size was
  997,713 compressed bytes. Initial type/mocking/format diagnostics are retained with
  corrected results under .artifacts/native-ui/2026-10-25-native-static/.
- Actual iOS 26.5 XCTest passed all seven cases in 157.6 seconds. The new native layout
  fixture measured 160x80 aspect-ratio geometry, 160x1 and 1x80 separators, and a 100x20
  Skeleton. Evidence: .artifacts/native-ui-ios/2026-10-25T05-44-28-486Z/results.xcresult.
  Its exported app screenshot was inspected: geometry, labels, separators and the
  placeholder are visible without a runtime error. This is a bounded fixture review;
  full device, screen-reader, keyboard and visual matrix acceptance remains separate.
- Eight more type/name groups have reviewed source coverage; strict whole-registry
  completion still rejects 538 pending items. Modern Skeleton examples remain partial
  because their Card dependencies still require source-style work. They were not
  promoted merely because they render. No publication or deployment occurred.
- A read-only syntax audit examined all 1,684 distinct example/block/internal/component
  TypeScript sources: 1,175 translate through the current adapter and 509 require
  additional source adapters. This does not establish rendering, native API, behavior,
  style or device parity. Per-source results and exact blockers are retained under
  .artifacts/native-ui/2026-10-25-full-source-audit/audit.json to guide the remaining port.

# Native global radius metrics — October 24, 2026

Raw authored layouts now use the pinned modern global radius multipliers instead of
legacy additive metrics. Generated global metrics retain their source fingerprint,
independent of Button/Badge slots. Frozen Default and New York layouts preserve their
original metrics; local radius scopes do not leak to siblings.

- Reviewed physical/logical corners, explicit sizes, CSS radius variables, bounded
  min/max formulas and native calc offsets. Unknown formulas fail explicitly; native
  translation does not evaluate arbitrary CSS or JavaScript.
- Focused source/global/utility contracts passed. Generated native types passed;
  full suites passed 1,289 tests on each platform across 42 suites with existing
  coverage thresholds unchanged. Both Hermes bundles contain all 699 registry modules.
  Packed CLI installation and package policy passed (995,639 compressed bytes).
  The first root run overlapped a clean build and four test files failed to import
  temporarily absent dist modules. That failed log is preserved; the four affected
  files were rerun after the build completed. Builds and dist-consuming tests must
  remain serial. Evidence logs: .artifacts/native-ui/2026-10-25-native-radius/.
- This shared layout correction does not promote unrelated component coverage.
  Whole-registry completion still rejects 546 pending items. No publication occurred.

# Native render-host composition and Badge coverage — October 24, 2026

Native slots now resolve static Text/View styles, preserve child callbacks and refs,
and create real pressable controls for authored clickable views. Default native Text
inherits the surrounding component typography; explicit text variants remain authoritative.
Animated registry controls retain their animation values and press feedback.

- Full native suites passed 1,288 tests per platform across 42 suites. Generated types
  and both 699-module Hermes bundles passed. Root tests passed 616 with one existing
  optional skip. Initial root failure from the old pending-count expectation is retained.
- Real iOS 26.5 XCTest passed all six cases in 127.2 seconds, including composed View
  and Text actions with exactly one counter increment per tap. Evidence:
  .artifacts/native-ui-ios/2026-10-25T05-27-19-571Z/results.xcresult.
  The preceding failed run is retained: its Text selector matched paragraph and text
  accessibility representations; the corrected selector uses the first matching native
  button and verifies actual action counts and destination state.
- Badge and five distinct Badge example groups now meet reviewed source coverage.
  Strict whole-registry completion still rejects 546 pending items. Device/visual/
  keyboard/screen-reader acceptance remains a separate checklist; this source promotion
  does not claim whole-registry completion. No publication or deployment occurred.

# Native Badge source styles and shared CVA evaluation — October 24, 2026

Badge now retains all eleven source families: the eight newer component presets
and the pinned Default, New York and New York v4 CVA definitions. All 56 newer
Badge rules are checked alongside Button's 120 rules. The shared native evaluator
preserves source state precedence, radii, shadows, finite compound conditions and
explicit failures for unknown slots/bindings. Avatar badges retain their own baseline.

- Added the three actual Base/Radix/Aria Badge example modules. The overlay now
  contains 434 distinct component example modules and 699 registry modules overall.
  A duplicate source-list entry was caught by provenance validation and removed;
  the generator now rejects duplicates before writing the catalog.
- Fifty-two Badge contracts cover every authored variant/mode/state family, glyphs,
  native font scaling, link-only hover, invalid/focus paint, explicit colors/styles,
  callback ownership and rendered child ownership. All three modern source examples
  render under each of the eight newer presets. Static render-host composition
  remains an explicit partial-coverage gap rather than inheriting completion.
- Full native suites passed all 1,276 tests on each platform (41 suites), strict
  generated types passed, and iOS/Android Hermes bundles contain all 699 modules.
  Root tests passed 615 with one existing optional skip; 18 focused source/style/
  overlay/harness contracts passed. Full native thresholds remain unchanged.
- The first full native run caught an existing link-role contract for action Badges.
  That behavior is restored. Earlier focused failures exposed missing overflow and
  zero-border utilities, plus nullable native press props and press-retention bounds
  crossing a composed link. Explicit native handling now passes generated types;
  authored text colors and consumer text styles override the source default paint.
- Real iOS 26.5 XCTest passed all five cases in 104.6 seconds, including actual inline
  and composed link destinations and a named anchor, alongside pagination, label
  focus and eight Button geometries/actions. Evidence:
  .artifacts/native-ui-ios/2026-10-25T04-42-04-622Z/results.xcresult.
  The two earlier failed navigation runs retain their result bundles and exported
  accessibility trees. They showed that iOS Text links expose their visible fragment
  as the Link name; custom labels name the paragraph container. Pressable link names
  retain the custom label. Tests now address the actual native Link elements and
  assert destination state after tapping, rather than substituting coordinates.
- React review checked hook ownership, async cleanup, native accessibility boundaries
  and component separation. Tests, native source hashes and initial failed logs are
  retained under .artifacts/native-ui/2026-10-25-badge-styles/. The post-XCTest simulator
  screenshot shows the home screen and does not establish app visual acceptance.
  Full Badge device/keyboard/screen-reader/visual acceptance and the remaining registry
  work are still open; strict whole-registry completion continues to reject 552 items.
  No publication or deployment occurred.

# Native registry navigation and authored link recipes — October 24, 2026

Added native inline Text links, composed pressable links, explicit route/anchor
handlers and OS URL dispatch. Generated Expo roots connect routes to navigate/replace.
Screen owns top scrolling for the empty hash; named anchors require an application
destination handler. Missing handlers, invalid protocols and OS failures remain visible
and retryable. The existing LinkButton navigation callback still receives one argument.

- Added 22 actual source modules, including Base's full Button composition example,
  modern breadcrumb recipes and six additional published examples per legacy style.
  The maintained overlay now contains 431 component examples and 696 registry modules.
  All authored examples render without browser hosts or warnings. Source callbacks,
  destination strings and independent source hashes remain retained.
- Full native suites passed 1,220 tests per platform in 40 suites. Generated strict
  types and production iOS/Android Hermes bundles passed after the narrow Text pointer
  event type correction described below. Root tests passed 614 with one existing
  optional skip. Twenty focused source/generator/style/OS-harness checks also passed.
  Lint, static security, installed packed CLI smoke and packlist passed: 249 files,
  984,025 compressed bytes. Packaging limits are unchanged.
- Ten navigation contracts cover route/anchor options, OS schemes, cancellation,
  disabled controls, inline layout, composed geometry/ref/text ownership, hover/press,
  visible retries, stale/unmounted failures and actual authored source interactions.
  Descendant SVG defaults cross native wrappers without overriding authored icon sizes.
- The first new test run omitted the required ThemeProvider and used asynchronous
  test events without awaiting their act scopes. Corrected fixtures pass. Subsequent
  generated typechecking caught pointer enter/leave missing from React Native 0.86's
  legacy public TextProps even though its installed Text runtime and generated types
  declare these events. A narrow typed pointer contract now preserves those actual
  native events. No broad type escape or validation threshold change was introduced.
- The maintained iOS harness now includes inline/composed route and anchor taps;
  the real OS run is in progress and is not included in the passing results above.
  Browser prefetch/SSR, history/target behavior and app-specific destinations remain
  explicit boundaries. Complete component styles and whole-registry acceptance are
  unfinished; strict completion still rejects 552 distinct items. No release occurred.

# Frozen Button recipes and exported recipe scopes — October 24, 2026

Default, New York and New York v4 now use their actual pinned CVA classes for
native Button geometry, variants and states. Together with the eight newer
presets, the matrix covers 2,880 source/style/variant/size/mode/state combinations.
Named exports, default aliases and concise arrow recipes now receive their source
palette and component family at the exported root; nested callbacks remain local.

- All 1,188 native tests passed on each platform (39 suites), strict generated
  types passed, and both Hermes bundles contain all 674 maintained modules.
  Root tests passed 613 with one existing optional skip. Lint, static security,
  installed packed smoke and packlist passed: 249 files, 977,714 compressed bytes.
- Focus/ring offsets, legacy additive versus modern multiplicative radii, filled
  destructive variants, direct icons through fragments and shadow layers have
  focused regressions. Conditional exported JSX and default/named aliases have
  compiler contracts. Divergent or unsupported upstream recipes require review.
- An initial runtime run exposed parenthesized JSX being emitted as literal text
  inside a generated provider. The compiler now emits a JSX expression; corrected
  focused and full suites pass. The failed and corrected logs remain dated local
  evidence. Device coverage remains the preceding iOS four-case run; it was not
  repeated for this slice. Link composition and other component families remain
  pending, and strict whole-registry completion still rejects 552 items.

# Complete static CVA recipe inventory — October 24, 2026

The pinned official inventory now retains all 116 CVA class recipes, including
base classes, every variant class value, defaults and finite compound predicates.
The current source has no compound cases or unsupported CVA declarations. This
captures the legacy and New York v4 component styles that are not defined by the
eight newer preset CSS files. It does not promote their native implementation status.

- Static analysis preserves imported aliases, literal class arrays, constant
  references, boolean defaults and special property names. Dynamic expressions and
  nested binding scopes stay explicitly unsupported; no upstream code is executed.
  Synthetic tests cover finite compound conditions even though this pin has none.
- Twenty parser/inventory/preset contracts, lint and static security passed. The
  Button preset evidence and public API ledger remain current. Original source hashes
  and every reviewed item fingerprint are unchanged, so no native source or native
  runtime behavior changed in this inventory update.
- The data explicitly distinguishes Default's 40-point and New York's 36-point
  source Button height, plus New York v4's filled destructive surface from the newer
  translucent presets. Their complete native styling remains in progress. No release,
  deployment or whole-registry completion is claimed.

# Eight native Button preset families — October 24, 2026

Added source-driven native Button slots for Vega, Nova, Maia, Lyra, Mira, Luma,
Sera and Rhea: all 120 CSS rules, six variants and eight sizes per preset. The
explicit NativeComponentStyleProvider shares selection with recipe options, while
legacy boundaries retain their own presentation. Other native compound controls
own their preset slots and do not accidentally inherit Button geometry/typography.

- The matrix evaluates 768 preset/variant/size/mode combinations through three
  state sets (2,304 combinations). Focus/invalid precedence, native hover/expanded
  state, disabled surfaces, group corners, icon placement/size overrides and OKLCH
  secondary hover are tested. Native labels grow for OS font scaling and explicit
  text metrics; icon-only slots remain square. Touch expansion, no-wrap labels,
  cleared icon padding and composed parent/child hover callbacks are covered.
- Full native suites passed 1,180 tests on each platform, 39 suites each, with
  unchanged thresholds. Strict generated types and both production Hermes bundles
  passed; the bundles contain all 674 maintained registry modules. The root suite
  passed 603 tests with one existing optional skip; focused source/gallery checks
  cover the final preset and QA additions. Lint, static security, installed packed
  CLI smoke and packlist passed: 249 files, 966,558 compressed bytes.
- Native iOS 26.5 passed all four XCTest cases. The new matrix checks each preset's
  actual default height and taps all eight to update selection. Dated evidence:
  .artifacts/native-ui-ios/2026-10-25T03-26-34-358Z/results.xcresult and
  button-presets.png. This does not establish all variants, hardware keyboard,
  screen-reader, Android device or iOS 27 acceptance.
- Initial focused checks exposed a test targeting pressIn rather than the native
  pressed-state fixture; the corrected test uses React Native's supported
  testOnly_pressed state. Follow-up tests ensure internal compound controls retain
  their own styling and large native fonts do not clip into fixed source heights.
- The manual upstream review now retains a component-style diff and rejects stale
  Button selectors, slot counts, CSS hashes or global formulas. Browser underline
  offset, View background clipping and immediate state transitions remain explicit
  renderer differences. Complete legacy CSS and other component preset families
  remain pending; whole-registry completion still rejects 552 distinct items.
  No publication or deployment occurred.

# Upstream global style provenance — October 24, 2026

The official inventory now retains apps/v4/app/globals.css from the exact reviewed
Git object. This captures theme metric formulas omitted by the component CSS files,
including the upstream multiplicative radius scale. Sparse checkout state or an
uncommitted working-file replacement cannot alter that source. Missing globals or
a content/hash mismatch fail validation. Global changes now invalidate affected
component, example and block fingerprints through registry dependencies.

- Twenty-two source/parity contracts and twenty generated-consumer checks passed.
  An isolated Git fixture proves exact-commit reading after working-file changes
  and removal. A global-only edit invalidates all three component families while
  independent hooks and legacy components keep their previous fingerprints.
- Rebuilt chart and example catalogs retain identical native source hashes for all
  674 modules; only review metadata changes. Font, theme and icon evidence checks
  passed. Existing device coverage is unchanged; no native runtime retest is implied.
- Lint, static security, installed packed CLI smoke and packlist passed: 249 files,
  961,353 compressed bytes. The first security run rejected a literal test fixture
  address; fixture construction now avoids that false positive without exemptions.
- The initial regeneration guard correctly rejected silently renewing form's
  completed status. Its tested behavior is retained, but preset/global metric parity
  remains unfinished, so its checklist status is now partial. The strict completion
  gate rejects 552 pending items. No publication, deployment or completion is claimed.

# Published legacy registry examples — October 24, 2026

Added the actual published source for 91 Default and 91 New York examples, with
independent source/dependency/style hashes: 409 component example modules and
674 native registry modules overall. Published source comes from its pinned
registry JSON, not from a replacement modern implementation. Legacy color palettes,
small shadows and filled destructive buttons/badges retain their own generation.

- Full native suites: 1,155 tests per platform, 38 suites each. Strict generated
  TypeScript passed. Authored pagination, carousel API counters and controlled OTP
  feedback passed on both platforms. Source/generator contracts: ten passed.
- Root: 599 passed, one existing optional skip. Lint, installed packed CLI smoke
  and packlist passed: 249 files, 960,783 compressed bytes. Both production Hermes
  bundles contain all 674 maintained modules. Package budgets are unchanged.
- Initial checks found an unported legacy shadow and an old LucideIcon import
  being wrapped as a runtime component. The native adapter now uses its proper
  component type, including recipe classes, without requiring a forward-ref brand.
  The first OTP test targeted a visual digit button; it was corrected to type into
  the actual one-time-code input and verify the authored feedback and final digit.
- This adds source and behavior evidence; it does not certify complete legacy CSS,
  remaining component APIs, all preset styles or native OS acceptance. Whole-registry
  completion still rejects unfinished coverage. No release or deployment occurred.

# Native authored image recipes — October 24, 2026

The Expo overlay now retains all four reviewed aspect-ratio example modules:
227 component example modules and 492 native registry modules overall. Next Image
imports become native image sources with the original HTTPS URL, alt text,
dimensions, crop and authored aspect ratios. Native SVG applies grayscale and
brightness together. Next server optimization, browser srcset and preload remain
web-specific; unported local paths fail explicitly rather than silently disappearing.

- Native bitmap and filtered-renderer readiness are tracked separately. Loading,
  failure, retry and a 30-second stalled-renderer timeout stay visible. Old source
  and old retry callbacks cannot change the new image. Decorative images remain
  outside accessibility; authored image names become native image labels.
- Full suites: 965 tests per platform, 37 suites each, with unchanged coverage
  thresholds. Strict generated typecheck passed. Focused suites: 235 per platform.
  Five source/generator contracts and lint passed. Root: 597 passed, one existing
  optional skip. Installed packed CLI smoke and packlist passed (249 files,
  945,870 compressed bytes). Both production Hermes bundles include all 492 modules.
- Initial focused checks found the removed React Native absoluteFillObject API,
  an unported 4xl container length and missing explicit native image role. The
  adapter now uses native inset positioning, reviewed container lengths and the
  explicit role. Those failures remain in local dated logs.
- No new image device/visual or offline network acceptance is claimed. Whole
  registry coverage remains incomplete, including component style presets and
  the recorded Expo 57 / iOS 27 lifecycle gap. No release or deployment occurred.

# Lossless dependency patch packaging — October 24, 2026

The maintained node-forge security patch now ships as bounded Brotli data. Source
checkouts retain the canonical raw patch; installed CLIs expand the exact same
bytes into generated applications. Canonical patch and license content did not
change. Corrupt data and expansion beyond 2 MiB fail before workspace writes.

- Packlist policy passed: 249 files and 941,083 compressed bytes, within the
  unchanged 1.25 MB compressed / 3 MB unpacked limits. Installed CLI smoke passed,
  including exact expanded-byte comparisons, corrupt data and oversized output.
- Node/browser signature regressions passed against a frozen patched node-forge
  installation. Root suite: 595 passed, one existing optional skip. Eleven focused
  patch/security contracts passed; lint and static security policy passed.
- The first security check mistook the generated patch coordinate for an email
  address. An exact filename exemption and a regression preserving detection of
  unreviewed coordinates corrected that finding; generic email scanning remains.
- Native registry coverage is unchanged. This packaging work makes space for the
  remaining port; it does not establish parity, publication or deployment.

# Native label association and control focus — October 24, 2026

The source compiler now resolves HTML label targets before removing DOM props.
Twenty-six maintained files contain label associations; 22 need generated native
field scopes. Existing native fields retain their ownership. Unknown, ambiguous,
cross-function and cross-field targets fail generation. The reviewed button-group
Amount example omitted its matching input ID upstream; its native translation adds
that exact ID while retaining the original source fingerprint.

- Native labels keep specific targets, accessible names and Android label IDs.
  Named targets remain isolated when another field unmounts or story IDs repeat.
  Transparent field scopes preserve grid placement and sibling selectors. Inputs,
  input groups, sliders and selection controls retain real focus/activation bindings.
- Selected bookmark icons now receive native fill/stroke paint. Current-color,
  stroke widths and SVG child restrictions retain explicit native mappings.
- Full suites: 955 tests on each of iOS and Android, 36 suites each. Root: 594
  passed, one existing optional skip. Strict generated types, lint, package policy
  and installed packed CLI smoke passed. Both production Hermes builds contain
  all 488 maintained modules. Packlist: 249 files, 1,177,479 compressed bytes.
- The maintained iOS command passed all three XCTest cases on iOS 26.5, including
  a real label touch followed by typing into its native email input. Evidence:
  `.artifacts/native-ui-ios/2026-10-25T02-55-25-192Z/results.xcresult`.
- Unsupported recipe types, remaining APIs and all eight component style presets
  remain unfinished. Whole-registry completion still rejects 551 distinct items.
  Expo 57 / iOS 27 scene lifecycle compatibility and Android device acceptance
  remain open. No release or full parity is asserted.

# Reproducible native iOS acceptance harness — October 24, 2026

The maintained command `pnpm test:native-ui:ios -- --device <dedicated UUID>`
builds an isolated Release application, strictly typechecks all 484 rendered
story exports, and runs native XCTest interactions. Its application and simulator
identity are separate from generated products. `--prepare-only` validates the
story gallery without building native code. Dated logs and result bundles remain
under `.artifacts/native-ui-ios/`.

- The full command passed both XCTest cases on iOS 26.5: authored pagination
  changed selection and disabled its end boundaries; the authored bookmark toggle
  changed native accessibility selection. Result: `.artifacts/native-ui-ios/2026-10-25T02-32-32-912Z/results.xcresult`.
- Export selection tests cover default functions, named chart and Demo exports,
  ambiguous/missing exports, safe paths and actual published UI helpers. These
  contracts prevent the gallery-only errors found in the initial manual attempt.
- Lint and static security policy passed. This adds OS interaction evidence for
  the two named stories; it does not mark all components or styles device-tested.
- The documented Expo 57 / iOS 27 scene-lifecycle incompatibility remains open.
  No iOS 27 acceptance, Android device acceptance or full registry parity is claimed.

# Native registry carousel and resizable source APIs — October 24, 2026

Added seven authored resizable examples and the authored carousel API example:
223 component example modules and 488 native registry modules overall. Native
percentage sizes retain orientation, named layout records and neighboring bounds.
Carousels retain fractional widths, measured snaps, source selection subscriptions,
unsubscribe, reinitialization notifications and initial selection. Primitive text
sequences now render as one native text run.

- Full native suites: 949 tests on iOS and 949 on Android, 36 suites each. Strict
  generated typecheck passed. Root: 589 passed, one existing optional skip. Lint,
  packlist and installed packed CLI smoke passed. Packed size: 1,175,628 bytes.
  Production Hermes bundles include all 488 modules on both platforms.
- Behavior tests found and fixed a collision between native View layout events
  and the legacy resizable size-array callback. The authored example updates
  displayed percentages through its actual onLayoutChange callback.
- An isolated, strictly typechecked iOS gallery contains 484 renderable stories.
  XCTest uncovered gallery-only missing helpers/export selection and query-name
  issues, which were corrected. No OS interaction pass is claimed yet.
- The pinned Expo 57.0.8 template fails before JavaScript on iOS 27 when built
  with Xcode 27 because it lacks UIScene lifecycle support. iOS 26.5 launches it.
  Expo SDK 58 documents the migration at https://expo.dev/changelog/sdk-58.
  This compatibility gap remains open; bundle success does not resolve it.
- Registry coverage remains partial while component style presets, remaining APIs
  and authored sources are unfinished. No release or full parity is asserted.

# Native typography, utility palettes and more authored examples — October 24, 2026

Expanded the authored component example overlay from 152 to 215 source modules.
Added native paragraph/heading semantics, scoped radius metrics, first-child and
sibling spacing, shadows, avatar ring/filter inheritance and recursive button
fragment labels. Table headers handle direct Aria columns; radio-group invalid
state reaches its choices.

- Tailwind 4.3.0 is pinned by upstream's lockfile. Its independently verified npm
  archive supplies 288 converted utility colors, including mauve, olive, mist and
  taupe. The 244-color published legacy registry palette remains separate. Recipe
  boundaries select the original generation; theme tokens still belong to styling.
- Full iOS and Android suites: 936 tests each, 36 suites each. Strict generated
  typecheck passed. Root suite: 589 passed, one existing optional skip. Lint and
  security policy passed. Both production Hermes builds include 480 native modules.
- Packed CLI smoke passed. The first packlist check rejected 3,024,879 unpacked
  bytes against the unchanged 3 MB limit. The generated registry checklist now
  uses an explicit registry-set legend instead of repeating the same 27-member
  lists on hundreds of rows. Every item and registry remains represented. The
  revised artifact is 1,172,180 compressed / 2,958,476 unpacked bytes; the new
  utility palette is explicitly allowlisted in the package contract.
- Initial isolated XCTest build failed due to an unset test-target product name;
  the test target was corrected and is rebuilding. OS interaction, typography and
  assistive-technology acceptance remain open until actual tests pass.
- Larger combobox collections, drawer/hover-card variants, required forms,
  resizable layouts, all component style presets and remaining source modules
  remain explicit unfinished work. This evidence does not certify full parity.

# Authored component examples and icon sources — October 24, 2026

Added 152 source-preserving component examples and 166 actual Lucide native icon
selections. The native compiler now validates translated TSX syntax and preserves
callback bodies, object values, lower-case managers and distinct imported aliases.
Native adapters cover Aria overlay ownership, scalar/range slider values, object
and multiple selection, pagination, measured trigger width and numeric input bounds.
Image lifecycle checks cover grayscale filtering, source changes and stable URI identity.

- Both iOS and Android passed 867 tests in 36 suites. A subsequent image-identity
  refinement passed the 17 affected presentation/control tests on each platform.
- Root tests: 587 passed, one existing optional skip. Typecheck, lint, source hygiene,
  release policy and security policy passed. Packed CLI smoke passed; packlist:
  248 files, 1,142,094 compressed bytes. Both production Hermes builds contain all
  417 native registry modules.
- An isolated Expo iOS QA app built successfully with 413 renderable stories.
  Installation succeeded. Interactive simulator and screen-reader acceptance remain
  unverified; build success is not device acceptance.
- Coverage entries remain partial. The strict whole-registry completion gate still
  rejects 551 distinct items; all eight component style presets and remaining authored
  sources still require work. Nothing in this slice certifies full Expo parity.

# Authored native form registry — October 24, 2026

Added the actual ten React Hook Form, nine TanStack Form, nine Formisch and two
Next action-form examples as native source, with the two action/schema companion
pairs missing from the published registry entries. The inventory now records 2,073
referenced files. Relative source imports feed transitive parity fingerprints;
changing an omitted companion invalidates the owning form's review.

- Native fields retain labels, descriptions, invalid state, focus refs, disabled
  choices, whole-card radio activation and submitted values. Scoped form IDs support
  footer buttons; pending actions serialize and expose retryable errors.
- Formisch retains its real Valibot store; native bindings replace DOM extraction.
  TanStack submission refreshes blur validation because native button presses need
  not blur a keyboard field. Native action forms retain schema/results and React
  action state, collect repeated checkbox values and reset successful feedback input.
  They execute local callbacks; upstream API/database placeholders remain application
  integration points. Next server transport, multipart files and SSR are web-specific.
- All 244 official named colors have source/output hashes in shared styling. Rich
  Sonner content supports native JSON highlighting, message positions and theme radius;
  formatter failures become dismissible errors.
- Strict generated native typecheck passed. Full iOS and Android suites each passed
  **703 tests / 33 suites**, above unchanged coverage gates. Android's first full run
  found one iOS-only Switch-prop assertion; the corrected accessibility-state assertion
  and full Android rerun passed. Native action pending-state checks passed on both.
- Root unit checks passed **584 tests, one existing optional skip**. Lint, source
  hygiene, security/release policy and 20 focused inventory/packaging contracts passed.
  The actual packed CLI generated source byte-identical to both recipe catalogs;
  packlist passed at 248 entries and 1,058,599 compressed bytes before the final
  pending-state and palette-hash refinements. Repack before publication.
- Production Metro/Hermes bytecode succeeded for all **265 maintained recipe and
  companion modules** on iOS and Android. The initial bundle exposed the test harness's
  React Native preset lacking Expo's export-namespace transform; production bundling
  now uses the same pinned Expo preset as generated applications. Jest retains its
  React Native preset. This does not establish OS/device acceptance.

The new form entries remain **partial** in the whole-registry checklist while full
component dependency/style parity is pending. The strict completion gate still rejects
551 distinct items. The full Expo port is not complete; no merge or release occurred.

# Native registry fonts, themes, forms and chart recipes — October 24, 2026

Continued the full Expo port on the existing topic branch. The official checklist
still reports 551 incomplete distinct items; this entry does not certify the full
port or native device acceptance.

- All 52 font/heading entries now map to 26 families and 347 real TrueType cuts from
  immutable Expo Google Fonts revision `b7302afca702257988f2e49375530339e1d71336`.
  Every downloaded cut passed byte/hash, sfnt table, weight and italic checks.
  Licenses, declared/internal weights and missing-italic synthesis are retained.
  Expo loading/error/retry, role selection, native text and SVG font cuts are tested.
- All eight registry themes retain their HSL/OKLCH source and share native gamut-mapped
  colors, alpha, chart/sidebar tokens and radius metrics with the web styling package.
  Added native variant behavior, compound composition/ref/event handling, isolated
  toast managers, the legacy toast hook, native style utilities, input groups and
  React Hook Form/Zod controller, field-array and focus/accessibility coverage.
- The actual 210 official chart blocks and 21 chart examples are translated into
  native source with original data, formatters and controls. D3/native SVG renderers
  cover stacks, curves, axes, grids, pie/radar/radial shapes, gradients, labels and
  native data selection. Added scoped native recipe styles, pointer/touch motion
  respecting reduced motion, and explicit browser-specific decisions. Source,
  style and transitive dependency changes invalidate recipe evidence.
- Strict native typechecking passes. All 636 tests pass on each iOS/Android JavaScript
  target (1,272 executions), across 27 suites, with existing coverage gates intact.
  Root build/lint/security/release policy checks pass. The latest root unit run has
  581 tests: 580 passed and one existing optional runtime skip.
- Native templates ship in a lossless Brotli overlay; generated application source
  is byte-identical and remains editable. The packed CLI smoke test passed a real
  frozen generated install and compared every native source/font/recipe byte. The
  first compressed artifact measured 1,018,114 bytes in 247 entries. The bounded
  packed budget was increased from 1 MB to 1.25 MB for the expanded registry; the
  3 MB unpacked budget is unchanged. Later source changes require another artifact
  measurement before publication.

The [platform adaptation checklist](native-registry.md#platform-adaptation-checklist)
separates native handling from browser-only behavior and unresolved work. Remaining
component style/API coverage, non-chart examples/blocks, other form integrations and
OS/device acceptance are still open. No publication, deployment or provider mutation
occurred. The upstream fork remains pinned; PR #75 remains draft.

# shadcn upstream fork and expanded native API checkpoint — October 24, 2026

The complete upstream fork is [anhedral/shadcn-ui](https://github.com/anhedral/shadcn-ui), created from `shadcn-ui/ui` with all branches. At verification both repositories advertised identical heads and tags: 71 branches and 138 tags, with main at `617134d5810bba521803b3ed787190bacbb80b35`. The fork preserves upstream source/history; Anhedral owns native adaptations in this CLI. This is **not a completed Expo registry port**: the strict completion command still fails with 615 of 616 distinct items awaiting complete review.

- Generated web consumers pin published shadcn 4.22.1 and expose `ui:add` / `ui:view`; a real invocation fetched the official `base-nova/button` item. Both web and native packages receive `UPSTREAM-LOCK.json`. The native generator preserves component, hook and library subpaths and explicitly named support exports. No existing application is automatically upgraded.
- Expanded native compound APIs for attachments, bubbles, traces, code blocks, questionnaires, comboboxes, progress, locale/direction, calendar ranges, selects, sidebar controls and message scrolling. Added provider-free Sonner notifications, native link navigation and missing button/badge/toggle variants. Tests cover async questionnaire failure/retry, controlled selections, disabled choices, multiple chips, accent-insensitive search, clipboard source preservation, notification timers/promise replacement/cancellation, native URL failure/recovery, visible message geometry, anchors and reading-position preservation. The final scroller correction targets the real transcript end before React removes temporary anchor padding.
- A public API/variant ledger tracks 65 official UI payloads across every reviewed style. Explicit browser-export policies identify native alternatives and test evidence without promoting an item to full parity. Nine inventory/sync tests reject unknown classifications and stale source/API/variant evidence. The optional manual upstream-review workflow retains inventories, source/style/dependency diffs and current API reports, and fails on stale API or native coverage evidence. It never executes upstream code or writes remote repositories.
- Native strict typechecking passes. All 226 tests pass on each iOS/Android JavaScript target (452 executions); unchanged global coverage gates pass. The final scroller correction additionally passes its six tests on both targets. A freshly generated native package passes ESLint. CLI build/lint/static security/release policy pass; all 569 root tests complete with 568 passed and one existing optional runtime skip. Packlist remains within existing limits (329 files, 941,428 packed bytes before this evidence update).

Full API behavior, all source variants/styles, registry blocks/examples, fonts, remaining hooks/utilities and device acceptance remain pending in the [explicit checklist](native-registry.md). The ledger records these gaps; export presence does not certify them. Earlier gallery Hermes exports are historical evidence and have not been repeated for this expanded checkpoint. No publication, deployment or provider mutation occurred. PR #75 remains draft and #74 remains open.

# Official shadcn registry inventory and native foundations — October 24, 2026

This is a checkpoint in the full-registry port, **not completion of that port**. The 66 documentation components in PR #73 do not establish parity for the entire CLI registry or every public API and variant.

- Pinned the official source at `617134d5810bba521803b3ed787190bacbb80b35` and recorded published metadata for 27 registries: 24 Base UI/Radix/Aria × style combinations, plus `new-york-v4`, `new-york` and `default`. The inventory contains 6,437 style/item entries, 616 distinct type/name pairs and 2,069 referenced authored source files, including imports, discovered variants/functions, public exports and browser APIs. Eight style sheets and supporting colors/themes/templates/icons are fingerprinted. Published metadata and authored source have separate provenance because source publication can lag.
- The generated [whole-registry checklist](native-registry.md) leaves unreviewed blocks, examples, fonts, variants and component APIs pending. Seven unresolved upstream registry dependency references remain visible. Five inventory/sync regression tests verify scope, source resolution, AST discovery, stale evidence rejection and change propagation through source/style/dependency inputs. Review metadata is retained in Git and excluded from the shipped starter package.
- Added native window-size detection, React Hook Form bindings and the upstream Shiki streaming highlighter adapted to native Text, with thirteen grammars, aliases, ANSI, continued grammar state and light/dark token colors. The native suite passes 162 tests per platform (324 executions), with its existing coverage gates unchanged. Required-field failures, controlled input submission, window breakpoint/resize/subscription cleanup and streaming replacement are tested. The highlighter uses the JavaScript regex engine; no HTML renderer or WASM bridge is used by the native UI.
- CLI build, lint, static security and release policy pass. The full root suite reports 565 tests: 564 passed and one existing optional runtime test skipped. Packlist checks pass without increasing the existing size limits, and the upstream review snapshot is excluded from the package.
- Expo exports the complete gallery for iOS and Android, including the new dependency graph. This verifies bundling and Hermes bytecode compilation, not grammar execution or accessibility on a device. Device/Hermes acceptance, remaining form integrations and the broader registry port remain pending. No remote upstream fork, provider change or package release has been created by this checkpoint.

# Expo native shadcn catalog — October 24, 2026

The CLI now maintains native semantic adaptations for all 66 entries in the shadcn Components catalog reviewed on 2026-10-24. `assets/ui/native/registry.json` pins the IDs, exports, shared helpers and evidence status; [Native UI](native-ui.md) is its generated parity checklist. This baseline excludes separately maintained AI Elements, form-library integrations and ecosystem registries. Native style/events, SVG chart data and touch/menu interactions deliberately have native APIs rather than DOM/Recharts compatibility.

- The real offline generator is used by both the contract tests and native test harness. Tests compare copied sources, explicit helper inventory, all public exports/module paths, an independent upstream ID snapshot, examples and Expo-compatible dependency pins. Fresh applications receive all source, attribution, inventory and native guidance. Application edits are never overwritten by CLI upgrades.
- React Native Testing Library: 144 tests in nine suites pass under both iOS and Android module resolution (288 executions), using real generated components. Tests exercise controlled values, disabled inputs, long press, native back/escape, menus/filtering, calendar bounds/leap dates/ranges, cumulative drag state, adjustable actions, table selection/sort/pagination, timers, source-preserving syntax/diff highlighting, clipboard failure/retry, six SVG chart types, questionnaire submission, safe areas, themes and reduced-motion subscriptions. Native persistence/clipboard bridges are isolated at the platform boundary. Coverage gates require 90% lines, 85% statements, 75% functions and 70% branches.
- Strict TypeScript 6 includes the generated mobile application's `noUncheckedIndexedAccess` setting. A fresh installed core application passes native-package ESLint, native-package typechecking and mobile typechecking. Expo SDK 57 exports Hermes bundles for iOS and Android for that application and the complete 66-component gallery. SVG is pinned to the SDK's 15.15.4 native ABI and Clipboard to 57.0.2.
- CLI build, lint, source hygiene, static security and release policy pass. The full root unit run initially had two failures: the isolated plugin fixture omitted the newly required native guide and the bundled stack-standard link lacked that reference. Both were fixed at their source; the full rerun reports 560 tests, 559 passed and one existing optional runtime test skipped. Plugin checks, packed CLI smoke and explicit packlist checks pass. Live upstream comparison reports exactly the 66 pinned IDs. Native changes run the test harness within the existing single Linux CI gate; no hosted device/build matrix is added.

The gallery is maintained in `tests/native-ui` for native review. Interactive device acceptance remains pending for every component: neither JavaScript tests nor Hermes exports establish VoiceOver/TalkBack, physical gestures, OS focus restoration, dynamic type or hardware behavior. A local test simulator could boot, but the Simulator application was unavailable and the existing development client lacked the new Clipboard module; no interactive acceptance is claimed. The temporary Metro server was stopped and the simulator returned to its prior shutdown state. No provider configuration, store submission, production deployment or package publication occurred.

# Next.js web and Expo native architecture — October 23, 2026

CLI 0.15 source preparation separates full Next.js App Router web (SSR/RSC through
Cloudflare OpenNext) from Expo iOS/Android. The UI contracts are DOM shadcn for web
and the Anhedral-maintained React Native port of shadcn for native, with shared
semantic tokens and public API contracts. Hono, Drizzle/D1 and private R2 remain
core; Stripe and RevenueCat remain the only additions.

The canonical diagram was regenerated in both themes as self-contained SVG and
1920×1080 PNG using the existing local Chrome renderer. The same SVG bytes are
mirrored by the Platform landing. This is documentation/artwork verification;
it does not establish generated-app, installed-plugin, native-device, provider,
hosted-image or production acceptance. Record runtime evidence separately.

## Next development proxy response framing — October 23, 2026

The Platform Linux image proof reproduced a failed `/api/health` response through
actual Next dev: Node fetch decoded the Hono sidecar's gzip body, but the generated
proxy retained its compressed `Content-Encoding` and `Content-Length`. The next
HTTP client attempted to decode the already-decoded response and failed.

The development HTTP proxy now removes those stale wire headers before Next
frames the response. The production service-binding path retains its existing
response handling. A real loopback HTTP server supplies a gzip response in the
regression test; all five Next web tests pass. `pnpm build` and `pnpm lint` also
pass, including typecheck, formatting, source hygiene and release-policy checks.
This evidence does not establish a deployed Platform runtime; its image and live
initialization are verified separately in the Platform repository.

The full `pnpm release:check` passed: 550 unit tests passed with one existing
skip, frozen patch installation checks passed, and packed CLI smoke and packlist
checks passed. Linux Next dev returned `200 {"ok":true}` through `/api/health`
and `200 null` through `/api/auth/get-session` after applying the generated fix.

## CLI 0.15 generated runtime acceptance — October 23, 2026

The implementation agent recorded the following local evidence for the unpublished
0.15 source preview, with Next.js web separate from Expo native:

- Complete generated `pnpm check` passed: lint, typechecks, Fallow with zero issues,
  dependency audit, available tests and builds. A manual fixture rsync temporarily
  overwrote its patch policy; after restoring the ordinary-init policy, the full
  check passed. This was a test-harness issue, not an initialization result.
- The packed tarball completed ordinary initialization, including staged dependency
  resolution, patches and frozen installation; doctor and target checks passed.
- Both iOS and Android Hermes exports passed, with output retained locally at
  `/tmp/anhedral-next-native-final-export`. This is export evidence, not device,
  screen-reader, store or native interaction acceptance.
- Production OpenNext running in local workerd passed SSR/RSC, guarded account,
  cookie roundtrip, signup, reload, sign-in/sign-out and rejected native-origin
  checks. Browser acceptance reported zero errors. The final typography-only
  OpenNext rebuild passed: 5474.81 KiB upload, 1130.07 KiB gzip and 44 assets;
  its additional browser/layout rerun was still pending when this entry was written.
- Root Turbopack development reached first compile/browser readiness in 4825 ms.
  A source edit reached HMR in 790 ms, preserving window state with zero browser
  errors. Webpack development failed reproducibly in
  `WasmHash._updateWithBuffer` with an undefined `length`; production webpack and
  OpenNext builds passed. The supported default development path uses Turbopack.

A small warm-workerd comparison used three fresh Chrome contexts before the final
heading CSS adjustment. Next readiness was 115/90/78 ms, transferred bytes were
172418/172089/172092 and FCP was 72/40/40 ms. The earlier Expo baseline medians
were 149 ms readiness, 438928 transferred bytes and 48 ms FCP. These are tiny local
samples with a warm server, not universal performance claims or live deployment
measurements. They do not establish a consistent FCP improvement.

No npm publication, installed-plugin update, hosted-image activation, production
deployment, real payment or physical-device acceptance is established by these
checks. Final serialized CLI/plugin/reference checks follow this documentation
update and must be recorded separately if they expose further failures.

# Focused core verification — October 23, 2026

The 0.14.0 source intentionally narrows initialization to Expo + Hono + Drizzle/D1 + private R2, supporting Better Auth and styling, with only Stripe and RevenueCat additions. This supersedes the older catalog scope in the historical evidence below. Existing applications/resources were not migrated or deleted. Compiled 0.13 output was preserved locally before rebuilding; output and credentials remain ignored rather than committed.

Validation of this change:

- CLI build, typecheck, formatting/hygiene, release policy and static security passed.
- Complete CLI unit suite after the streamlining pass: 545 passed, one platform-conditional skip, zero failures (546 tests).
- Codex plugin check: typecheck/build and 61 tests passed; browser smoke 11/11 passed using installed Chrome.
- Packed CLI installed/executed successfully; packlist allowlist passed (222 files, approximately 543 KB compressed at this validation).
- OSV audit passed for all 56 unique locked/catalog dependency versions.
- Generated all four supported selections in isolated tests; offline init, authored-source preservation, addition rollback/conflicts, private secret exclusion and generator provenance covered.
- Private-file route tests against real Hono passed: anonymous and cross-user rejection, upload/download/delete, origin protection, actual streamed size enforcement and misleading Content-Length.
- Installed generated both-payment workspace: lint and typecheck across seven packages, Fallow audit with zero issues, dependency audit under existing reviewed local-patch policy, Hono Worker bundle, Expo web export and gateway bundle passed. Generated pnpm test currently has no default product tests; successful execution alone is not test coverage.
- Real local workerd: exported Expo routes, gateway service binding, isolated local D1 authentication/session/revocation and native scheme/origin handling passed.
- Actual generated Hono/Better Auth/Drizzle signup/login/session/revocation passed with in-memory SQLite. Generated Stripe/RevenueCat billing reconciliation tests passed with synthetic vendor responses, including idempotency, webhook replay/order, ownership/CSRF, expiry/revocation, provider union and outage/retry recovery.

The follow-up streamlining pass removed obsolete alternate-stack adapters and unused bootstrap test fixtures, aligned human help/plugin defaults with the supported stack, and removed a retired dependency's secret-scanner exemption. Regression tests cover actual core catalog paths and payment-only suggestions. CLI build/lint/static security, all unit tests, plugin check (61 tests), packed smoke and package allowlist passed again. The final package remains 222 files, approximately 543 KB compressed. README instructions distinguish the source candidate from a published npm release.

Worktree recovery review also recovered a one-line inspector safe-area correction: project details now retain host top padding through the shared CSS variable. Two new browser regressions exercise 24px and 112px insets through project/tab/list navigation. Plugin typecheck/build and all 61 plugin tests passed; browser smoke passed 13/13 using installed Chrome. This simulates the host layout contract and does not claim installed native-host acceptance.

The CLI presentation follow-up restores a connected static default-stack diagram in both themes, with only Stripe and RevenueCat marked optional. The README, stack guide, npm documentation and plugin references carry valid image targets. Only the two PNGs are added to the npm package; editable SVG/layout/logo source remains documentation source. CLI build/lint, documentation/plugin contracts, packed smoke and packlist passed (224 files, approximately 793 KB compressed). The platform landing mirrors the canonical SVGs rather than maintaining a second diagram layout. Artwork does not certify provider activation or deployment.

Local staging acceptance generated a fresh core application through ordinary init, including dependency installation and Git initialization. Drizzle generation reported no schema changes; the generated lint, typechecks, Fallow/dependency audit and web/Worker builds passed. Local D1 migrations were applied explicitly. Browser acceptance reproduced a return-to-sign-in race after sign-out: the API accepted the new session while the account hook still held the earlier anonymous state. The generator now mounts the session hook on sign-in and awaits its refresh after server verification, before navigating. This follows the supported [Better Auth session hook](https://better-auth.com/docs/basic-usage#use-session).

The expanded real-workerd browser regression passed signup, protected account, reload, sign-out, sign-in again, another reload and mobile viewport checks in a newly generated application. Local D1 session/revocation and native scheme/origin transport checks passed. Independent live local R2 checks exercised upload/download/delete, forced attachment headers, anonymous rejection, cross-user read/delete isolation, mutation-origin rejection and the 1 MiB bound. CLI build/lint and all 545 unit tests passed with one conditional skip. Logs are retained locally under `/tmp/anhedral-staging-init-*` and `/tmp/anhedral-staging-default-flow*.log`; generated applications and private local state remain ignored. These checks exercise web and API transport, not native-device execution.

No cloud provisioning, real payment, configured-database migration, deployment, app-store/device acceptance, npm publication or installed-plugin update occurred. Existing installed runtimes remain separate from this source candidate. Historical provider reports below are dated evidence, not current live verification.

---

# Verification record

Dated records below describe the source and environment exercised at that time. Earlier results are historical evidence, not acceptance of a later release. Current architecture and operating instructions live in the stack standard and software factory.

## README stack catalog and static artwork — 2026-10-19

Replaced the README Mermaid diagram with dark/light static artwork. After reviewing the earlier connected reference, refined the illustration to Expo web/iOS/Android → Hono → Better Auth / Drizzle + D1 / private R2, with Cloudflare hosting, native distribution, shared UI/contracts and workspace tools. Large icons, short labels and thin curves follow the landing hero style. The caption explicitly preserves plain init's Expo-only selection; backend/auth/data are added when needed. The README retains the under-construction notice, early starting commands, all CLI selections and upstream documentation for 117 named ecosystem options.

Local validation: all 38 registry entries remain represented in the retained catalog; CLI build, four documentation-contract tests and the npm packlist policy passed. Inspected rendered artwork for icons, connections and label spacing. No CLI runtime behavior, provider configuration or deployment changed. GitHub/npm image URLs will show this artwork after the assets reach main.

## Full Cloudflare default and optional shared billing — 2026-10-18

New plain initialization and new Expo selections include Expo web/iOS/Android, Hono, Better Auth, Drizzle/D1 and private R2. Explicit Neon replaces D1. WXT-only initialization adds an extension to that default; explicit primary applications preserve their compatibility selection. Existing saved selections and unrelated additions do not receive new profile defaults. Legacy billing SDK/guidance projects require their pinned CLI or an explicit reviewed migration; strict provenance was preserved.

Stripe and RevenueCat are independently optional. Generated shared contracts, Expo web/native billing adapters, authenticated Hono Checkout/portal/identity/entitlement routes and a server enforcement example are connected. The authenticated subject is the RevenueCat App User ID. Server-only Drizzle tables store account/customer ownership, fenced reconciliation snapshots and an idempotent webhook inbox. Stripe signatures use raw request bodies; RevenueCat requires configured Authorization and supports HMAC with timestamp checks. Canonical provider reads reconcile grants instead of trusting event order or client purchase state. A bounded scheduled retry drains pending events. Access caches expire within sixty seconds and never outlive provider expiry; stale access fails closed during outages. Provider environments and native public keys remain isolated from private credentials.

Checkout guards nonterminal subscriptions independently of entitlement state, including refunded or past-due subscriptions. Verified open same-plan sessions are reused across distinct intents; another pending plan returns a conflict. Root client error handling gives safe conflict guidance. SDK operations fence native identity changes; RevenueCat logout failure cannot prevent Better Auth session revocation. R2 remains a private binding: each product must implement file ownership checks before exposing file routes.

Local evidence:

- CLI build, lint and static security checks passed. The full unit suite passed with 743 passing, zero failures and two existing skips (745 total); the focused release-scanner regression also passed. The scanner correction exempts only adjacent empty assignments in example files; populated secrets and JavaScript multiline credentials remain detected.
- Retained `examples/billing-reference` was generated with `--stripe --revenuecat`; its final full `pnpm check` passed, including client/server/Worker types, Fallow, dependency audit, static web export and both Worker dry builds. Reviewed reference migration source is `0001_billing.sql`; no configured database was migrated. Final iOS/Android Hermes exports passed with the real optional RevenueCat native package and account-transition adapters.
- `pnpm test:billing` passed against the compiled generated Hono Worker, real Better Auth/Drizzle SQL and Stripe SDK, with synthetic vendor HTTP responses and in-memory SQLite. It covered authenticated account isolation, strict plans/body/origins, deterministic retries, open-session reuse, duplicate-sale guards, server enforcement, independent optional providers, Stripe/RevenueCat grant union, refund/revocation, cancellation versus expiry, trial/past-due behavior, native transfers, invalid/stale signatures, environment/app scope, duplicate/out-of-order events, concurrent lease fencing, stale-cache outage denial and durable scheduled recovery. SQLite fixtures do not certify Cloudflare D1 semantics; vendor fixtures do not certify provider/store acceptance.
- A final fresh `node tests/test-generated-apps.mjs universal-billing` passed initialization/install, generated SQL/check/build, local workerd/D1/R2 auth and the compiled billing proof, including open-session reuse and duplicate-sale guards. The hosted CI matrix now includes this reproducible profile.
- Real local workerd, service bindings, D1 and private R2 loaded successfully. Chrome verified signup, protected account/reload, sign-out and mobile viewport behavior. An initial concurrent-edit run observed Worker reload/session unavailability; the unchanged assertions passed after source writers stopped. No timeout or security assertions were relaxed.
- Main repository `pnpm check` and `pnpm build` passed. The five local Anhedral skills passed frontmatter/UI-metadata YAML and local-reference checks. CLI build refreshes bundled references; an installed plugin is not silently updated.

Billing provider products/prices, webhook ingress and credentials, RevenueCat project/store policy, signed native builds and real sandbox purchases still require owner configuration and acceptance. Native exports are not device tests. Nothing was provisioned, deployed or published; no financial provider writes, charges or remote migrations were performed. Earlier dated records remain historical evidence of their own source/environment.

## Universal Expo default — 2026-10-18

New plain initialization selects Expo web/iOS/Android in `apps/mobile`, Hono in `apps/api`, shared contracts/styling and Wrangler delivery on Cloudflare. SDK 57 exports static web assets behind a thin API-binding gateway. Explicit Vinext/Next.js selections and existing projects remain supported. Better Auth selects a database and generates browser/native session adapters, exact application-scheme trust, SecureStore integration and account screens. Billing entitlements and the portal publisher remain separate implementation work.

Local evidence:

- CLI build, lint, static security policy and the full unit suite passed: 740 passing, zero failures and two existing conditional skips (742 total). Coverage includes gateway forwarding/caching/failure behavior, API-first target order, public build-variable isolation, native cookie rotation and server/browser/native auth boundaries.
- Retained `examples/universal-reference` was generated from the local CLI with `--better-auth --no-git`. Its complete `pnpm check` passed, including lint, client/server/gateway types, Fallow, dependency audit, static web export and both Worker dry builds. Its lockfile and source are retained; generated outputs remain ignored.
- `pnpm test:reference --browser` passed against real local workerd, an API service binding and disposable D1. It exercised health/exported routes, signup/login, protected contracts, incorrect-password rejection, sign-out/revocation, forged identity-header rejection, native scheme/cookie transport and untrusted-scheme rejection. Headless installed Chrome verified account creation, the protected account screen, reload, sign-out and a 390px viewport without horizontal overflow. The helper creates local synthetic credentials/state, applies migrations only with `--local`, refuses existing configured private files and cleans its processes/files.
- A second fresh `node tests/test-generated-apps.mjs universal-auth` passed initialization, installation, full generated `pnpm check` and the real workerd/D1 gateway acceptance flow, proving the retained example does not depend on manual source repairs.
- Final iOS and Android Hermes exports passed with the platform-specific auth and development-client modules. This proves bundler compatibility, not an installed native build or device session persistence.
- Main repository `pnpm check` and `pnpm build` passed. Five local Anhedral skills passed YAML/frontmatter/UI-metadata and local-reference validation.

The browser preview currently needs a new static export for changes; it does not provide web HMR. Arbitrary unknown dynamic URLs require explicit routing/rendering design. Physical-device/simulator native acceptance, native compilation/signing, deployed Cloudflare behavior, store purchase sandboxes and complete billing synchronization remain unverified. No cloud provisioning, remote migration, deployment, package publication or installed-plugin update occurred. Earlier records below retain their original source/environment scope.

## Default Hono backend — 2026-10-18

New initialization includes Hono and framework-independent Zod/HTTP contracts. Web remains Vinext/Cloudflare by default; explicit native Next.js/Vercel calls the API through a server-only configured URL. Cloudflare web/API service bindings, cookie-preserving same-origin transport, selected database bindings/factories and Better Auth routes/session UI are generated together. Database and identity remain opt-in. New routes still need product authorization. Existing registry metadata remains compatible; readiness and additions do not apply new backend defaults to old selections.

Local validation:

- CLI build and lint (types, formatting, source hygiene and release policy) passed. The unit suite passed with 738 passing and two skipped tests, including shared-client response validation and Vercel server-credential transport checks. The composition matrix now validates 200 supported combinations.
- A fresh `node tests/test-generated-apps.mjs web-auth` completed initialization/install, generated `pnpm check` (including Fallow and dependency audit), build, real Vite/workerd web→API service binding, rendered auth screen, signup/login, protected session, invalid-password rejection, signout and revocation. Compiled Worker/Drizzle auth also passed against isolated in-memory SQLite; both generated Workers passed production-runtime local previews. Test data and credentials were synthetic/local; migrations were never applied to a configured production database.
- An isolated generated native Next.js/Vercel + Hono/Neon profile passed its full `pnpm check` and build after regeneration with the current scaffold. No live Neon database or protected Vercel-to-Cloudflare deployment was exercised. Its API URL and optional Access service credentials remain explicit deployment configuration.
- A copy of the original HEAD generator produced real old web-only, Hono-only and combined Hono/web/auth receipts. Current readiness accepted each; adding Resend preserved its API source and did not silently generate/migrate contracts. Pre-contracts Hono web/auth additions require an explicit migration.
- The five local skills in the main repository passed frontmatter/UI-metadata parsing and local-reference checks. Main repository `pnpm check` and `pnpm build` passed for the checked working state. Historical verification records remain intact.

The Expo/RevenueCat/Stripe sequence is a documented implementation roadmap, not generated native authentication, store purchases or verified billing behavior. No cloud provisioning, remote migrations, deployment, package publication or installed-plugin update occurred. Provider access/protection, native/device acceptance, store sandboxes and real billing remain separate verification work.

## Maintenance practices — 2026-10-18

Added the software factory's evidence-driven maintenance workflow and connected it to the CLI's root `AGENTS.md`, contribution/PR guidance, shipped Anhedral skill and generated application instructions. It covers removal evidence for published/generated consumers, operational flag dependencies, focused changes, causal flaky-test diagnosis and controlled instruction comparisons. Existing uncommitted CI work was preserved. These instruction changes have not been evaluated through comparative agent task replays; no model cost or quality improvement is claimed.

Local CLI build, generator and plugin package contracts (`node --test tests/test-standard.test.mjs tests/test-plugin.test.mjs`, two tests passed), source hygiene, changed TypeScript formatting and `git diff --check` passed. Build refreshed bundled canonical references. Skill YAML parsing passed using the repository's YAML library, and package contracts checked bundled Markdown reference targets. The skill-creator Python validator could not start because PyYAML is unavailable. No full release gate, provider acceptance, publication or installed-plugin update was performed for this local workflow change.

### CLI integration verification — 2026-10-18

Reviewed the pending maintenance guidance and documentation-only CI changes together with the Windows pnpm PATH fix. Ordinary contribution and PR-template Markdown now takes the documentation path; registry matrix preparation is skipped for that path. Source, shipped plugin instructions, unknown comparison history and manual runs retain full checks. Regression coverage includes source-to-document renames, whitespace failures, generated instructions preserving existing framework guidance, and earlier pnpm shims taking precedence over later native executables.

Local CLI and optional inspector builds passed with a 384 MB Node heap cap. All 16 targeted tests passed across CI scope, release-candidate policy, command execution, generated guidance, documentation contracts, plugin packaging/workflow and standard generation. Root lint (types, formatting, hygiene and release policy), static security policy, package allowlist (227 files, 607781 packed bytes) and `git diff --check` passed. The first plugin workflow check correctly rejected a stale runtime; rebuilding the inspector resolved it. Frozen inspector dependency installation changed no lockfiles. Build refreshed bundled references. Hosted CI, the full cross-platform/generated-app matrix, browser acceptance, current external advisory refresh, publication and installed-plugin updates were not performed in this focused pass.

## Release candidate 0.12.0 — 2026-10-16

This candidate combines the CLI/service refactor with optional Cloudflare Stream live video and consolidated documentation. Stream supplies a server-only management factory; billing activation, input ownership, broadcast/player UI, signed playback and live media acceptance remain explicit integration work. The README links into three maintained documents: the stack standard, software factory and this dated evidence record. Provider, CLI, dashboard, Void and codebase-review material is retained in those documents; packaging and plugin references use the same sources.

Local validation on the assembled candidate passed CLI build, lint/type checking/formatting, source hygiene, release policy, static security policy and the full CLI suite (729 passed, two existing skips; 731 total). Package allowlisting passed with 227 files. The generated Stream management source compiles; request tests cover explicit playback privacy, bounded account/input identifiers and sanitized HTTP/JSON failures. Composition covers Vinext, Hono, native Next.js and OpenNext. A pre-existing README link to unpublished source was changed to its GitHub URL after package validation caught it.

The first hosted generated-profile pass caught a complexity finding in the Stream response parser across Vercel auth, Neon API and Worker-service profiles. Validation is now split into private field/endpoint/input readers without changing public behavior or weakening the gate. The generated source passes the same Fallow 3.33.1 complexity threshold locally, with a maximum cyclomatic complexity of four; expanded malformed endpoint regressions pass. Complete generated profiles still require the updated hosted run. The local patch-installation regression attempt timed out during its registry-dependent pnpm step; hosted release checks must establish those frozen-install regressions.

Inspector type checking and build passed; 61 of 62 tests passed locally, with the preview listener test blocked by this session's loopback `listen EPERM` restriction. Hosted CI must establish the full listener/browser, generated-profile, clean-install, advisory and supported OS/Node gates before publication. Local Git metadata writes and shell network access are restricted; the connected GitHub integration is used for source delivery. These local results do not claim publication, a newly installed plugin or live Stream acceptance.

## Refactoring coherence review — 2026-10-16

Completed the six reviewed refactoring areas: CLI dispatch and delivery routing, human result formatting, mobile build orchestration, source transaction locking, Cloudflare delivery evidence, and Vercel project/provider helpers. Public imports through `src/index.ts`, `src/delivery.ts` and `src/vercel.ts` retain their existing entry points. Command options come from the same schema as help and validation; initialization and source-preview selection retain their specialized parsers. The CLI design guide records the resulting module boundaries.

Follow-up reading traced the extracted helpers through lifecycle locking and recovery, provisioning, provider authentication/readiness, mixed-stack shipping, management output, service inspection, inspector bundling and release packaging. A normalized function-body comparison against HEAD confirmed that all 42 extracted transaction-lock, Cloudflare evidence and Vercel project helper functions are unchanged apart from their export modifiers. Mobile orchestration preserves the whole-flow lifecycle lock, source rechecks, provider identity checks, credential filtering and journal-before-submission ordering. Unknown EAS submissions still block further mutations; queued builds resume by recorded ID. Provider-specific blocked states and mixed-stack preflight remain intact.

The review also consolidated the unchanged Vercel CLI version into the shared dependency catalog. Authentication and delivery now consume one audited, Renovate-tracked pin. A regression checks both command paths against that catalog version. Other regressions cover schema-driven argument collection, 26 human-output contracts captured before extraction, initial EAS project linking and foreign-owner rejection, alongside the earlier D1 and CLI error fixes.

Fallow 3.33.1 found no dependency cycles after extraction. The measured orchestration functions are smaller: `main` has cyclomatic complexity 11 (previously 74), `runDelivery` 5 (121), `formatResult` 2 (117), and `executeMobileBuild` 10 (88). These are per-function measurements reflecting decomposition; they do not establish lower total branching or measured test coverage. Existing complex lifecycle and validation functions remain subject to their domain tests.

Final local validation passed: CLI build; lint, type checking, formatting, source hygiene and release policy; static security policy; 723 CLI tests with two existing skips (725 total); inspector type checking and 22 focused service, inspection, MCP and integrity tests against the rebuilt runtime; package allowlist (228 files); and `git diff --check`. Fresh packed installation, external advisory refresh, browser/listener checks and live provider acceptance remain unverified in this restricted environment. Changes are local and uncommitted.

## Codebase review and service fixes — 2026-10-16

D1 table discovery now uses SQLite GLOB patterns for the literal internal prefixes `sqlite_` and `_cf_`. The previous LIKE patterns treated underscores as single-character wildcards and hid valid application tables. A real in-memory SQLite regression exercises table discovery and browsing, preserves `acfxrecords`, `_cfXrecords` and `sqliteXapp`, and excludes Cloudflare and SQLite internal tables. This regression skips explicitly on Node versions without `node:sqlite`; the current local run executed it.

CLI inspection failures now report `INSPECTION_FAILED`, service-operation failures report `SERVICE_FAILED`, and service grammar errors use the existing `CliArgumentError` / `INVALID_ARGUMENT` contract. Subprocess regressions verify nonzero status, empty stdout, structured stderr and command-specific next actions. Unknown commands retain their existing classification. The CLI and inspector guides describe the behavior; the build refreshed the bundled inspector reference.

Continued review covered workspace composition and additions, source transaction recovery, provider provisioning and private runtime configuration, Cloudflare/Vercel/mobile delivery and recovery, inspector transport/data boundaries, canonical stack/factory documentation and release artifact verification. Fallow 3.33.1 analyzed 258 files under the repository configuration and found no dependency cycles. Command dispatch (`runDelivery`, `main`), result formatting and mobile delivery remain complexity hotspots. Source-only example imports and published/runtime-facing exports require contextual review; static findings were not used as deletion proof. The inspector is excluded from that Fallow configuration and was reviewed separately.

Validation: build, lint/typecheck/format, source hygiene, release policy and static security checks passed. The full CLI suite passed 693 tests with two existing skips (695 total). Inspector type checking and 22 focused inspection, service, MCP and archive-integrity tests passed against the rebuilt runtime. The package allowlist passed (218 files); `git diff --check` passed. Fresh packed installation, generated-runtime/browser checks, external advisory refresh and live provider acceptance are not established by these local checks. No provider resources, deployment, publication or source commit was changed.

## Final branch checks for 0.11.1 — 2026-10-16

Hosted CI on the first wrap-up commit exposed colored preview URLs, a Vinext RSC chunk-layout defect, a generated Neon factory complexity finding and the unused brace-expansion 3.x catalog advisory described below. Preview discovery now strips terminal controls while preserving diagnostics. An RSC-only final bundler output hook keeps server chunks beside Vinext's real emitted manifests, preserving client/SSR layouts and avoiding copied or synthesized modules. A two-entry Rolldown reproduction goes from one broken import to none; a cached real Void/Vinext build validates 55 server modules with no missing imports. The generated runtime harness now checks emitted relative module imports before workerd starts. The Neon factory separates URL parsing from SDK creation and passes the generated health gate; source-backed SDK sealing still passes. The approved example received only the matching build-config and override corrections, with refreshed source fingerprints.

After those corrections, the local suite passed 690 tests with two explicit skips (692 total); focused follow-up checks also passed. Hosted CI must pass again on the corrected commit before merge/release.

The next hosted run passed 34 of 35 jobs, including real workerd web/API previews, Better Auth/D1 session lifecycle, fresh published Neon SDK wrappers and the advisory scan. Its remaining Clerk preview lacked private runtime configuration. The isolated anonymous-rendering fixture now supplies disposable public/private test keys, refuses existing private files, removes its owned environment file and reports bounded, redacted server diagnostics on HTTP failure. Seven focused preview tests pass; live Clerk identity remains outside this fixture's scope. Final hosted CI remains the merge/release gate.

The final local CLI suite passed 686 tests with two explicit skips (688 total). Root lint, type checking, source hygiene, release policy, static security scanning and both real frozen pnpm patch installation suites passed. Built the CLI and inspector together, packed the CLI tarball and plugin ZIP, verified their integrity and scanned the artifacts for secrets. The approved full-stack example remains source-only under `examples/full-stack`, with one root `anhedral.json` and no provisioned resources.

The release must use a successful hosted CI candidate from the exact final main commit. Local registry DNS and listener restrictions remain as described below; the hosted generated-profile matrix, fresh packed installations, advisory refresh and inspector browser checks are release gates. Local archives are preparation evidence, not publication evidence.

## Neon Realtime option — 2026-10-16

Added optional `--neon-realtime` as live PostgreSQL query foundations, independently of `--realtime` Durable Object rooms. It selects Neon, rejects D1, requires a server and preserves the single root `anhedral.json`. Better Auth database defaults now resolve consistently regardless of flag order. The package separates server sealing and browser subscriptions; shipping reads the branch secret only from the selected backend's private runtime file. Realtime activation, allowed origins and product authorization remain manual application setup.

Reviewed the official [overview](https://neon.com/docs/realtime/overview), [query/authorization guide](https://neon.com/docs/realtime/guides/queries), [subscription guide](https://neon.com/docs/realtime/guides/subscribing) and [Drizzle example](https://neon.com/docs/realtime/examples/drizzle). Exact SDK pins are `@neon/realtime@0.1.0` and `@neon/realtime-drizzle@0.1.0`, checked against the official [October 14 release commit](https://github.com/neondatabase/neon-pkgs/commit/36f8c44bbbb52d978f243700c211c25e13f16928). The adapter's Drizzle peer range includes the existing `0.45.4` pin. Existing Neon HTTP runtime and direct transactional migration tooling are retained.

Local evidence:

- Full CLI unit run: 680 passed, two skipped, zero failures (682 total). Six additional feature tests passed separately after they were added.
- The content matrix generated 166 compatible single-option/runtime selections; all 2,646 option pairs resolved deterministically or failed selection validation. Composition also covered both realtime options together.
- Build, root lint, static security policy and package allowlist passed.
- Generated secret handling tests cover Void, Wrangler and native Vercel, backend isolation, Better Auth coexistence, invalid/missing credentials and tracked-file rejection.
- Authentic SDK source from the exact release commit was bundled for a browser target with cached esbuild and real Drizzle `0.45.4` / Neon serverless `1.2.0`. Local sealing produced randomized encrypted capabilities, stable same-query fingerprints, distinct user-scoped fingerprints and approximately 60-second expiry. Alias enforcement and Drizzle date/timestamp parsers were exercised. Client construction/close opened no socket. Fail-fast fetch/WebSocket replacements ruled out network activity.
- The committed `tests/test-generated-neon-realtime.mjs` passed against actual generated database/server/client factories with those source-backed SDK bundles. It is wired into the native Vercel and Hono/Neon generated integration profiles for execution against fresh installed dependencies in CI.

Limits: registry DNS is unavailable here, so SDK evidence uses official release source rather than a fresh published npm installation. The optional dynamic `ws` import remains in the browser bundle; source bundling passed, but workerd compilation and live subscription behavior are unverified. Branch activation, allowed origins, authorization, renewal/revocation and reconnect behavior need a real application's acceptance tests. No provider service was enabled, provisioned or deployed. Earlier release-candidate artifacts below predate this option and must be rebuilt for any release.

Verified locally on 2026-10-16 with Node.js 26.8.2 and pnpm 10.34.5.
Repository: https://github.com/anhedral/anhedral-cli, branch
`codex/project-services-dashboard`. The checkout contains uncommitted work;
this record does not identify a published release or a deployed source commit.

## Dependency management

The CLI and bundled plugin target version 0.11.1. The installed development
plugin is 0.11.0; verification used the checkout's built 0.11.1 CLI and plugin
runtime. Existing project reorganization, Void integration and reviewed braces
and node-forge patches were preserved.

Security override versions now live in `src/dependencies.ts`, alongside other
generated dependency pins. The catalog audit includes their actual package
coordinates, Renovate discovers the pins, and static policy rejects literal
override versions outside the catalog. A regression test generates Vinext,
Next.js/Cloudflare, WXT and Electron workspaces and checks every selected
override against the audited catalog. Override versions and selection rules
are unchanged.

## Completed checks

- Root and inspector frozen lockfile installs passed offline with scripts disabled.
- CLI and inspector production builds passed.
- Type checking, formatting, source hygiene, release policy and static security checks passed.
- The full CLI unit suite passed after consistency fixes: 657 passed, two explicitly skipped.
- The generated-override catalog regression passed for all four profiles.
- Package allowlist passed: 214 files in the CLI tarball.
- CLI tarball and plugin ZIP creation, artifact integrity verification and release secret scanning passed.

## Remaining release gates

- `pnpm audit:osv` cannot resolve `api.osv.dev` in this execution environment.
- Packed CLI fresh-install smoke testing was stopped after registry access stalled.
- `pnpm plugin:check` passed type checking and build, with 59 of 60 inspector tests
  passing. The preview test failed because this environment rejects listening on
  `127.0.0.1` with `EPERM`; its HTTP behavior remains unverified here.
- Generated application integration builds, browser tests, supported Node-version
  and operating-system matrices must still pass in CI.

No publication or production deployment was performed. Run the full CI matrix
on the intended committed source, then use the existing reviewed-candidate
release workflow with that commit and the CLI/plugin integrity values produced
by CI. Local artifacts are candidates and do not replace successful CI evidence.

## Dependency patch simplification

Renamed the installer to `src/dependency-patches.ts` and removed its braces-only compatibility entry point. The exact patches, upstream notices, customer-content conflict checks, LF attributes, and transactional generation/add behavior are retained.

Generated audit policy is reduced from 480 to 167 lines. It preserves raw pnpm JSON, validates reports, blocks unrelated high/critical findings, and allows only the reviewed exact advisory/version pairs with the effective pnpm patch mapping and reviewed patch SHA-256. pnpm returns absolute configured paths; policy tests cover both relative and absolute mappings. Frozen installation owns patch application and lockfile consistency; audit no longer certifies installed package trees or executes package code.

Regression probes now live only under `tests/support/`. The install fixtures no longer depend on live advisory-service responses. `npm_config_offline=true pnpm test:patch` passed with cached public packages: frozen patch installation, changed-patch rejection, braces depth/cycle and glob/watch behavior, and node-forge valid/malformed signatures through Node and both browser bundles. Deterministic audit tests cover exact exceptions, report failures, changed patches, and missing/wrong configuration.

The rebuilt CLI and inspector, full CLI suite (649 passed, two skips), focused audit-policy tests, lint, static security policy, and package allowlist passed. The stale inspector build initially blocked one unit test; rebuilding the inspector resolved it. Fresh packed installation and current external advisory-service checks retain the limitations listed above. No publication or deployment was performed.

## Consistency fixes

The owner excluded backward compatibility and upgrades of existing projects. No upgrade workflow or compatibility layer was added; current-version validation remains.

Completed fixes:

- Capability metadata and its tests now describe the implemented service status, analytics and bounded database readers; schedule execution remains unsupported and provider status is distinct from application health.
- Vercel provider names are normalized and bounded independently of package/directory names, including punctuation and long names.
- Generation/setup/diagnostics share runtime eligibility and Void selection policy. Doctor requires the pinned pnpm version.
- Root unit tests verify/reuse the inspector runtime, or install its frozen dependencies and rebuild it before packaging tests. The offline test run exercised repair of a stale runtime; the final run reused the verified result. Older CLI Node lanes continue to consume the verified CI artifact.
- Neon runtime provisioning leaves the migration package's credentials untouched. Provider next actions and generated documentation require a separate direct DATABASE_URL_UNPOOLED, SQL generation/review and explicit migration.
- Generator subprocesses have bounded execution in both verbose and captured-output modes, with timeout regressions.
- CLI and inspector use a shared service-operation dispatcher. CLI discovery includes unbound resource receipts. KV key metadata follows provider cursors; D1 schema is preserved for empty tables. D1/Neon queries use bounded projections, SQL masking and explicit row ordering; live writes can still shift offset pages.
- The generated-profile runner now invokes the existing Void fresh-build/production-preview harness after ordinary checks. The full hosted generated matrix remains unverified here.
- Generated guidance states explicitly that starters contain no application tests or test:live script. Obsolete catalog snapshot documentation is corrected.

Validation passed: CLI build; 657 CLI tests with two skips; 43 focused consistency/cursor tests; lint (including type checking, formatting, source hygiene and release policy); static security policy; offline patch install/runtime regressions; package allowlist (214 files). A real in-memory SQLite experiment additionally verified SQL masking before fetched rows, truncation, ordering and empty-table schema. Inspector type checking/build and 59 tests passed; its one preview-listener test still fails with environment EPERM on 127.0.0.1. Browser/provider acceptance, external advisory refresh and fresh packed dependency installation retain the limitations above.

No provider mutations, publication, production deployment or source commit were performed.

## Continued review: runtime state and preview failure handling

Fixed source receipt/addition transaction policy to exclude disposable Void/Vinext caches, generated Wrangler configuration and app migration mirrors. Authored database source remains tracked. The addition regression includes runtime state and a cached symlink and exercises the real staged addition path.

Fixed the generated production-preview harness to observe process errors/closure immediately, cap retained diagnostics, bound startup/build/HTTP waits, terminate process groups and escalate termination. Five real subprocess regressions cover early exit, spawn failure, ignored SIGTERM, descendant-held output pipes and excessive startup output. These tests require no listening socket.

Validation passed: CLI build; full offline CLI unit suite (663 passed, two skipped, zero failures); focused registry/preview tests (18 passed); lint; static security policy; package allowlist (214 files); and git diff whitespace checks. Root unit preparation rebuilt and verified the inspector runtime after the source change. The actual generated workerd preview, hosted matrix, fresh dependency resolution and live provider acceptance remain subject to the limitations recorded above. No provider mutations, publication or source commit were performed.

## Multistage independent review

Four subagents independently reviewed CLI/registry contracts, generated applications, delivery/provider recovery, and repository/plugin/release coherence. Cross-reviews checked each track's fixes; a final scan checked grammar, exports, state formats and documentation together.

Fixed the native-only workspace addition path so its first Cloudflare application selects the actual Void/Wrangler engine, including already registered zero-target workspaces while preserving identity/account/audience. Root engine requirements derive directly from selection. Registration now validates current setup provenance before writes and requires an explicit delivery engine. Removed the `new` compatibility alias, ambiguous add-directory parser, Wrangler-to-Void migration planner/candidate output, provider schema-1 migration, old catalog import and historical CLI-only release-verification fallback. Current OpenNext/Queues/Basin Wrangler profiles and current rollback/recovery remain supported. The private catalog now consistently uses projects naming. Updated canonical/bundled instructions and separated root/inspector Node type-definition update rules.

Generated audit guidance now describes configuration/hash verification accurately. Void backend Vite configs restore declared inspector ports and enforce strict HTTP ports. The generated API profile opts into isolated local D1/Better Auth acceptance: reviewed local SQL, ephemeral credentials, matching local origin, signup/login/session/incorrect-password/revocation assertions and cleanup. Two reviewers checked persistence, environment and adapter contracts against cached pinned sources. This gate is wired but was not executed here; no workerd runtime success is claimed.

Final validation: CLI build passed; full offline unit suite 662 passed, two skipped, zero failures (664 total); focused grammar/readiness/addition checks 30 passed; lint, static security policy, package allowlist (214 files), offline braces/forge installation/runtime regressions and whitespace checks passed. Inspector type checking/build passed and 59 tests passed; its listener test remains blocked by `listen EPERM` on 127.0.0.1. The inspector browser fixture was updated to the simplified options API and explicit engine marker and passed type checking. The packed smoke was attempted offline and stopped at ENOTCACHED for @neondatabase/serverless because that smoke intentionally uses an empty isolated npm cache. Hosted matrices, actual new auth preview, browser/provider acceptance and external advisory refresh remain unverified for this source. No provider mutation, publication, deployment or source commit was performed.

## Continued generated-runtime and package review

A further independent review reproduced a packaging hole: deleting MCP configuration allowed the packer to skip runtime verification and accept an incomplete plugin distribution. The packer now requires the current skill, documentation references, MCP entrypoint, manifest assets and runtime files and always verifies runtime integrity. Regressions remove required files or redirect the MCP entrypoint and assert rejection. Cross-review found no additional packaging defect.

Corrected public/server environment guidance against cached pinned Vinext sources. Vinext already loads app .env for local builds and maps NEXT_PUBLIC__; Vite client values use VITE__. Production public values belong in the build environment. Full ship can read protected untracked server values and send them through stdin to void secret; the old blanket claim that local dotenv values are never uploaded was inaccurate. Generated guidance and canonical/bundled references now agree. The Void evidence document's current version contract requires explicit engines; earlier local evidence is clearly labeled historical.

Generated a new current Hono/D1/Better Auth/R2 workspace using the repository bootstrap fixture and real composer, then linked cached dependency installations. All direct pins in the API, auth and database packages were checked against installed versions. This was not a fresh upstream bootstrap or frozen dependency installation. The actual Vite build passed, and the actual compiled health/OpenAPI handlers passed direct Node execution.

Added and ran tests/test-generated-auth.mjs against that freshly compiled output. It loads the shipped 0000_better_auth.sql into a private in-memory SQLite database, supplies the small D1 prepared-statement interface used by the actual Drizzle adapter, and dispatches requests to the real compiled generated handler. Actual Better Auth/Drizzle signup, login, session lookup, incorrect-password rejection and logout/session revocation passed. The shared assertion helper now accepts an injected transport and requires HTTP 200 for the revoked-session lookup before accepting null. This repeatable test runs in the isolated generated API CI profile before the separate workerd preview gate. It does not emulate or certify workerd, D1 provider behavior, Access, business authorization or cross-app identity.

Wrangler generated the declared binding types but its runtime-type phase stopped at listen EPERM on 127.0.0.1; the subsequent generated tsc/lint steps were therefore not run in that attempt. Actual workerd preview and the full hosted generated profile remain unverified here.

Validation: CLI build; full offline unit suite 663 passed, two skipped, zero failures (665 total); focused plugin/documentation/environment tests passed; lint, static security policy, package allowlist (214 files) and whitespace checks passed. Created a complete CLI tarball and plugin ZIP together in .artifacts/release-codebase-review, independently verified their identity/integrity, and passed the release secret scan. This is a local uncommitted candidate, not publication or hosted release acceptance. Fresh isolated npm installation and current external advisory refresh retain the earlier limitations. No provider mutation, publication, deployment or source commit was performed.

## Single root project configuration

The owner requested one anhedral.json instead of multiple Anhedral metadata files at the project root. The generator, additive composition, registration, provider setup/auth/runtime, Cloudflare/Vercel delivery and recovery, doctor, catalog and inspector now use the same envelope with identity, standard, setup, registry, providers and selected cloudflare/vercel sections. Old root filenames are neither read nor migrated. Tool-owned manifests and private .anhedral runtime journals remain separate.

Section updates validate bounded input, preserve unrelated sections, reject malformed envelopes without exposing their contents, write atomically, and share the existing source transaction lock. An interprocess regression confirms that competing configuration writers cannot overwrite each other's sections. The registry excludes the configuration file from recursive file hashing and retains independent configuration fingerprints; edited sections that regeneration would change still conflict, and whole-document comparisons detect concurrent changes. Tests cover preview immutability and preservation of provider settings and connected hosting identity. Inspector metadata is read once with persection error isolation; corrupt hosting data does not hide unrelated valid sections.

The source-only examples/full-stack now contains only anhedral.json for Anhedral root metadata. Its identity, sixteen selected services/options, six targets and unconfigured provider/account state are preserved. Example syntax/workspace validation and security checks pass; doctor still reports only the intentionally missing dependency lockfile. No services were provisioned or shipped.

Validation: CLI build; full offline unit suite 668 passed, two skipped, zero failures (670 total); focused configuration/addition checks 22 passed before the additional preservation regression; provider/auth/runtime/shipping suite 278 passed; inspector source section/catalog tests passed; lint, static security policy, package allowlist (216 files) and whitespace checks passed. Canonical/bundled instructions and browser fixtures use the unified file. Hosted/browser/workerd/live-provider and fresh dependency installation limitations remain as previously recorded. No provider mutation, deployment, publication or source commit was performed.

Inspector follow-up: type checking/build passed, 61 tests passed and the one preview-listener test remains blocked by listen EPERM on 127.0.0.1. Rebuilt runtime source/integrity checks passed.

## Retired unused brace-expansion 3.x override

The fresh OSV catalog scan flagged `brace-expansion@3.0.9` under GHSA-3jxr-9vmj-r5cp. The maintainer and reviewed GitHub advisory identify fixes on the 1.x, 2.x and 5.x lines, with no repaired 3.x version listed. The 3.x coordinate came from a blanket catalog override; it is absent from the CLI/inspector lockfiles and from all 18 accessible cached generated lockfiles inspected in the task temp directories and repository artifacts. Those generated locks contained 1.1.21 and 5.0.12.

Removed the unused 3.x catalog pin and generated major override while retaining reviewed 1.1.21, 2.1.7 and 5.0.12 overrides. No advisory exception, audit relaxation or new patch was introduced. Catalog/override regressions assert the retained coordinates and absence of the unused 3.x override. A coordinated rebuild, fresh OSV scan and generated-profile verification remain necessary before release.

## Void delivery verification

This records the implementation's evidence and remaining acceptance work. It is not a release certificate. Update the live results when an operation completes; retain sanitized target/version identifiers and actual acceptance results rather than diagnostic output.

### Version contract

- Anhedral development checkout: `anhedral@0.11.1`.
- Direct Cloudflare delivery: exact `void@0.27.0`.
- Void runtime requirement: Node `>=24.21.0` (checked before execution).
- Workspace package manager: `pnpm@10.34.5`.
- The published Void package distribution and its bundled documentation were inspected. Installed executable version and app dependency pin must agree.

Current Cloudflare configuration requires an explicit `deliveryEngine` in the `cloudflare` section of `anhedral.json`. Supported Void profiles select `void`; explicit OpenNext, Queues/DLQ and Basin profiles select `wrangler`. Missing or unsupported markers are rejected. No existing-project migration workflow is provided.

### Historical local evidence: initial Void integration

These results describe the earlier integration snapshot. They do not certify the current uncommitted candidate; subsequent local reviews are recorded in the consolidated verification record.

The initial Void/coherence local CLI suite passed **608 of 608 tests**, with zero failures. The inspector suite passed **60 of 60 tests**. Build, typecheck, formatting, source hygiene, static security policy, packed CLI smoke and package allowlist checks passed. The corrected OSV audit passed for **85 unique locked and direct-catalog package versions**; the inspector dependency audit also reported no known vulnerabilities. This does not audit every generated application’s transitive dependency graph.

The normal generated combined workspace installed **395 packages** without extra harness dependency pins. Actual fresh builds passed for **Vinext 1.1.0 with Void 0.27.0** and **Hono**. Workerd returned HTTP 200 for rendered HTML, its client asset, API health and OpenAPI. A separate services profile covered D1/R2/KV/AI plus cron build/preview gates; the compiled scheduled handler was preserved and invoked successfully. Readiness responses contained an actual Worker version UUID.

Wrangler applied the generated local D1 migration `0000_better_auth` (10 commands). The shared Better Auth/D1 runtime passed signup, login, cookie/session lookup, incorrect-password HTTP 401, logout and session revocation through `tests/test-void-local-auth.mjs`. These are actual local runtime checks rather than mocked provider tests. They do not prove Cloudflare provisioning, production secrets, visitor Access policy enforcement or remote rollback.

The earlier generated dependency audit passed with a local `braces` backport and `fflate@0.7.5`; its raw advisory report still contained one high finding. The bundled backport system has since been removed at the owner’s request. A subsequent owner-approved change adds one narrowly scoped standard pnpm patch for `braces@3.0.3`, while retaining the upstream pnpm audit report and all advisory findings. The owner subsequently approved a verification gate for the one exact patched advisory, described below. The earlier backport audit gate remains removed; its result does not establish a passing audit for newly generated applications.

Additional regression coverage includes non-object JSONL records, canonical configuration/lock merging, and resolved bindings with authored placeholders. The final integrated count above includes this regression coverage.

The automated checks cover the pinned JSONL receipt format, rejection of stale/foreign/incomplete/ambiguous receipts, independent provider version confirmation, source cleanliness, explicit current engine validation, private policy reconciliation, and the lock-review checkpoint. Mocked Cloudflare responses establish control flow; they do not establish provider/runtime compatibility.

### Deployment evidence contract

Void 0.27.0 writes a new `~/.void/logs/deploy-*.jsonl` per invocation. Anhedral requires exactly one new matching log with:

1. A `deploy_start` record identifying the exact target working directory and a timestamp after invocation began.
2. One `cloudflare_deploy_end` record with `ok: true`, the expected Worker name and a complete version ID.
3. A final `deploy_end` record with `ok: true`.

This contract was inspected in the published distribution, rather than inferred from console prose. The recorded version must independently own 100% of current Cloudflare traffic. Application source and configuration are checked before and after deployment. Void's direct Cloudflare log does not contain a Git commit annotation; Anhedral correlates the checked invocation and its receipt with the clean source commit. Missing or ambiguous logs stop acceptance even when provider changes may have occurred.

Application URLs require provider evidence: enabled Workers subdomain plus account subdomain, or a matching custom-domain assignment. Private Access policies are checked before and after activation. Selected resource identities and private R2 exposure are independently inspected after Void resolves resources.

Void lock changes are expected on initial provisioning. If only the allowed target `void.lock.json` files change, activated version receipts are retained with release state `configuration-required`. Review and commit those files, then ship the clean configuration. Such a checkpoint cannot pass `verify` or serve as a complete rollback release. Arbitrary source changes still fail delivery. Database migrations remain applied during code rollback.

### Reproduce local checks

From the CLI repository:

```sh
pnpm build
pnpm typecheck
node --test tests/test-void-state.test.mjs tests/test-void-execution.test.mjs tests/test-void-migrations.test.mjs tests/test-delivery.test.mjs tests/test-delivery-lock.test.mjs tests/test-ship.test.mjs
pnpm test:unit
```

Use the repository's installed Node/pnpm versions. Avoid concurrent builds because the build script replaces shared `dist/` output.

### Live acceptance

Customer Cloudflare authentication succeeded using workspace-scoped Wrangler state. No credential contents belong in this document. A reproducible authentication pattern is:

```sh
XDG_CONFIG_HOME="$PWD/.anhedral/cloudflare-auth" pnpm exec wrangler login
XDG_CONFIG_HOME="$PWD/.anhedral/cloudflare-auth" pnpm exec wrangler whoami --json
```

The actual Void authentication bridge also succeeded against the customer account with `accountConfirmed: true`. Credentials were supplied through the child-process environment, and no credential was persisted by the bridge. This is read-only authentication evidence, not deployment evidence.

The source-coherence review removed obsolete release helpers, diagram assets, stale plugin wrappers and duplicate dependencies; fixed bounded inspection of resolved Void locks; and brought CI runtimes and delivery documentation in line with the implementation. Browser UI acceptance was attempted but could not launch Chromium because the host denied its macOS Mach-port registration. The browser suite remains unverified in this environment. Hosted CI on commit `06bce77173cd8a122a35c3e04a7e210e4fd9d78c` subsequently passed the dashboard browser suite, both plugin checks, four CLI test lanes, eight macOS/Windows portability jobs and CodeQL. That evidence applies to that commit; subsequent changes require their own checks.

The executable read-only live preflight was also run using the workspace-scoped login. It exited with status 1 and structured `providerMutations: false`, `ready: false` before any cloud writes. Reproduce against the intended customer account and an existing generated fixture:

```sh
XDG_CONFIG_HOME="$PWD/.anhedral/cloudflare-auth" \
WRANGLER_LOG_PATH=/tmp/anhedral-void-live-preflight.log \
node tests/test-live-void.mjs --account <customer-account-id> --fixture /absolute/generated-workspace
```

The preflight can prepare an isolated local fixture with `--prepare-only /absolute/new-unused-path`; this scaffolds and builds locally and does not perform remote acceptance or publication.

Authentication alone does not prove provisioning, runtime builds, private access or deployment. Authenticated read-only preflight succeeded for the Workers account subdomain. The same login received HTTP 403 from Access organizations (provider code `10000`) and Access applications (provider code `9999`). No deployment or other provider mutation was performed. Private live acceptance is blocked until the authorized account has usable Access organization/application/policy permissions. Public deployment is not a substitute for the requested private acceptance. Separately, the Cloudflare dashboard explicitly shows that Zero Trust onboarding must be completed for this account. The dashboard observation and API permission errors are distinct evidence; the 403 responses alone do not establish their cause. In particular, do not infer that the complete Vinext plus Hono/shared database/auth combination works from local unit tests.

The acceptance workspace must exercise:

- Fresh-checkout installation and build using pinned versions.
- Vinext and Hono Workers with reusable shared packages.
- Existing D1/private R2 identity reuse, one migration owner, serialized resource creation and committed lock reuse across a new checkout.
- Environment validation, production secret stdin upload and public build variables.
- Private Access protection before activation, anonymous rejection, allowed user login and denied user behavior.
- Actual routing, assets, authentication and streaming responses.
- Initial lock review checkpoint followed by a clean provider-confirmed release and meaningful `test:live`.
- Failed build/deployment recovery and rollback without claiming migration reversal.

Watch the interaction between private Access's pre-created empty Worker and Void's existing-Worker checks, and between the first target's lock changes and later targets' secret upload guards. Validate both rather than weakening privacy or source checks.

For an authorized disposable application, use the built CLI's `connect`, `ship --dry-run`, `ship`, `status --refresh`, `verify`, and reviewed `rollback` commands. Preserve resource ownership and inspect partial operations before retrying. This document does not authorize additional provider resources or expenses.

### Handoff

Keep the customer-owned account, committed application manifest, `anhedral.cloudflare.json`, `void.config.ts`, `env.ts`, reviewed SQL and each app's `void.lock.json`. Keep secrets out of source. Local `.anhedral/` history and Void diagnostic logs are separate operational evidence; a fresh checkout cannot reconstruct historical source-to-version mappings from current provider versions. `recover` reports a current snapshot and does not fabricate historical verification.

### Generated dependency review (2026-10-15)

Hosted generated-profile checks on `d117f402faa6d899f972152f242b18026a45053b` failed. They are distinct from the passing CLI/plugin checks. Root-cause analysis found several independent paths to `braces`, including:

| Consumer                | Dependency path                                                                     | Required structural remediation                                                                 |
| ----------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Every inherited starter | Shared ESLint config → Next ESLint plugin → fast-glob → micromatch → braces         | Declare framework lint tooling only in the web application; retain generic shared lint coverage |
| Vinext                  | vite-plugin-commonjs → vite-plugin-dynamic-import → fast-glob → micromatch → braces | Upstream consumer migration with CommonJS, development and SSR/RSC behavior verified            |
| WXT styling             | Tailwind CSS 3 → chokidar → braces                                                  | Supported Tailwind/toolchain migration, including generated styles and builds                   |
| Expo                    | React Native Metro config → Metro tooling → glob matching dependencies → braces     | Compatible Metro/Expo dependency migration                                                      |

The current [CVE-2026-93687 advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) affects `braces <=3.0.3` and lists no patched version. npm’s latest is still `3.0.3`. [Proposed fix #72](https://github.com/micromatch/braces/pull/72) is closed without merging. The maintainer disputes the advisory’s security interpretation in [issue #70](https://github.com/micromatch/braces/issues/70); the advisory remains active. The separate [CVE-2024-4068](https://github.com/advisories/GHSA-grv7-fg5c-xmjg) was fixed by `3.0.3`, which does not resolve the newer advisory.

The failure is recursive AST processing of deeply nested glob patterns. Remote exploitability depends on whether an application passes attacker-controlled patterns to those operations; the presence of a development dependency alone does not establish an exploitable deployed endpoint. No complete reachability review has been performed for every generated profile.

An unqualified `fast-glob` → `tinyglobby` package alias is incompatible: consumers use different exports and directory expansion defaults. Removing the global starter dependency is an Anhedral composition fix, not proof that every supported framework is free of `braces`. Do not clear the audit gate or claim production acceptance until the resolved graphs and relevant runtime checks pass. The same generated CI also reports a separate `node-forge` advisory in Expo/WXT tooling, which is outside the `braces` remediation.

The shared-lint ownership change was checked against the actual upstream template manifest: a newly resolved pnpm graph contained 169 packages and none of `@next/eslint-plugin-next`, `fast-glob`, `micromatch` or `braces`; its standard pnpm audit reported no known vulnerabilities. This is evidence for the shared lint foundation only, not the entire generated application matrix. App-local web linting explicitly selects JavaScript/TypeScript/JSX/TSX files rather than relying on ESLint’s default JavaScript selection.

Validation of the scoped composition change passed 613 CLI unit tests with the real lint probe enabled, 60 inspector tests, builds, lint, static security policy, OSV checks for 86 root/catalog versions, and the package allowlist. The five lint tests include actual Next Image/Link and React Hooks diagnostics, full recommended/Core Web Vitals rule configuration, TypeScript/JSX parsing and adding web after an API-only scaffold. A helper now exercises installed rules in generated web CI profiles. A fresh local upstream shadcn initialization was attempted but its `ui.shadcn.com` request was refused by the network proxy; no fresh full generated-app matrix success is claimed.

### Temporary braces patch verification

The depth-only mitigation is based on official `braces@3.0.3`, tarball integrity `sha512-yQbXgO/OSZVD2IsiLlro+7Hf6Q18EJrKSEsdoMzKePKXct3gvD8oLcOQdIzGupr5Fj+EDe8gO/lxc1BzfMpxvA==`. Both the unmodified baseline and patched package passed all 764 tests from the published release source (`74b2db2938fad48a2ea54a9c8bf27a37a62c350d`). The bounded verifier passed 360 differential compile/expand/stringify comparisons, depth 100/101 and mixed/literal boundaries, deep direct ASTs, child cycles and expansion-parent cycles. Expansion width/range behavior and stringify parent handling remain unchanged.

This establishes the tested library mitigation, not a complete application exposure analysis or an upstream fixed release. The upstream registry report remains unmodified. The owner-approved gate accepts only the exact patched braces advisory after verifying installed bytes and regressions. Separate Expo/WXT findings and the remaining private Cloudflare acceptance gaps remain independent.

A real pnpm fixture resolved `braces@3.0.3` with micromatch, fast-glob and chokidar consumers, merged the exact patch, resolved the new lock and installed with `--frozen-lockfile --ignore-scripts`. The installed bytes passed the depth verifier and normal filesystem glob/watch checks. Changing the patch after resolution made a frozen install fail; restoring its bytes restored successful installation. The untouched pnpm audit JSON still reported `GHSA-vfj7-8cjw-p6xm` for `3.0.3` and was retained locally as test evidence. Both the patch and MIT notice are recorded in generated source fingerprints; customer artifacts and YAML patch entries are preserved or rejected on conflict.

Release-exception assessment: the evidence supports the tested depth mitigation for the exact patched version. It does not support a blanket advisory waiver, other versions, unrelated findings or a claim that every generated installation has been exercised. Any later exception must be constrained to the advisory/version and independently verified installed bytes, reviewed for the intended release, and retired with the patch. The owner subsequently approved and restored the exact verified exception below; other findings remain blocking.

The generated exact-path Git attributes preserve LF bytes with `core.autocrlf=true`; a real index/checkout round trip verifies the patch and license remain identical. The patch’s SHA-256 is `69bd65a37da4569ba0be8a044aa732ad7c2ebd5494d6076f966eb6df8a12756e`.

Final local validation of the mitigation passed 628 CLI tests without skips, 60 inspector tests, build/typecheck/lint, static secret/security scans, OSV checks for 87 root/catalog versions, package allowlist and packed CLI smoke. The packed installation test invokes the installed patch helper and compares generated patch/license bytes with the shipped assets. These results establish the tested mitigation, not completion of all generated-profile or live acceptance requirements.

### Restored verified advisory handling

The owner approved restoring the earlier verification-aware behavior for one package/advisory. `pnpm audit:deps` now invokes the bundled gate, preserving raw pnpm JSON in `.anhedral-audit-report.json` and printing the known upstream finding. Only `GHSA-vfj7-8cjw-p6xm` for `braces@3.0.3` can pass through this exception. Verification requires the pinned patch checksum, every discovered installed copy matching the reviewed full-package hash, and bounded depth/cycle regression checks. Unpatched/tampered copies, unknown versions, malformed or incomplete reports, command failures, and unrelated high/critical findings fail.

This restores the working patch-plus-verification behavior without the removed multi-package backport framework. It does not claim an upstream fixed release or waive the independent Expo/WXT findings or private Cloudflare acceptance work.

Validation of the restored gate passed 634 CLI tests without skips and 60 inspector tests, build/typecheck/lint, static security policy, package allowlist and packed CLI smoke. The real frozen pnpm fixture covered an npm dependency alias, accepted the exact verified mitigation, preserved the upstream audit JSON, rejected both patch-file and installed-package tampering, and passed again after restoration. The packed CLI writes the audit gate from its distributed asset.

### Hosted release follow-through (2026-10-16)

Hosted CI on `83e83e476fba8a052fb3c73aaa0e3b59659231bc` passed the Linux braces installation gate, all four CLI Node-version checks, portable macOS/Windows checks, inspector checks, plain Vercel, Next.js/Cloudflare (including Better Auth), desktop on Linux/macOS, Worker services and Vercel services. Other generated profiles exposed Void entrypoint discovery and duplicated database configuration, corrected in the subsequent source changes. These results are profile-specific, not a successful full matrix or live deployment.

The same hosted run independently confirmed that extension and combined-client profiles fail on `GHSA-86w9-cpqp-85rv` in `node-forge`. The [current advisory](https://github.com/advisories/GHSA-86w9-cpqp-85rv) covers versions through 1.4.0 and has no patched release; [upstream PR 1152](https://github.com/digitalbazaar/forge/pull/1152) remains unmerged. Current Expo CLI and extension-runner dependency paths still require this package. A framework version upgrade alone does not establish remediation.

The prior Node-main patch was evaluated separately against the official 1.4.0 release source (`fa385f92440879601240020f158bed68e444e83a`): baseline and patched versions each passed 828 tests with four upstream pending cases; the malformed-signature regression failed before and passed after patching. The aggregate harness neutralized an upstream `describe.only` so the complete suite actually ran. At that checkpoint the source-only patch did not update the package's prebuilt browser bundles and was not accepted. The completed bundle remediation and verification below supersede that earlier candidate.

Fresh pnpm resolution confirmed that Void's `^1.63.1` Cloudflare Vite dependency could select 1.64.0, whose Wrangler peer requirement exceeds Anhedral's validated pin. The Void recipe now pins that transitive edge to 1.63.1, sharing the existing version source, preserving customer override entries and leaving unrelated recipes untouched. The exact 1.63.1/4.149.0 pair passed fresh resolution and an actual Vinext/Void Vite build. Generated Worker acceptance reads the emitted Vite Worker configuration and verifies its actual entry artifact, instead of expecting the legacy Wrangler output path.

### Completed node-forge remediation

The final exact-version mitigation covers `lib/rsa.js`, `dist/forge.min.js` and `dist/forge.all.min.js` from official `node-forge@1.4.0`, rather than accepting an unpatched distribution path. The patch is 1,177,827 bytes because unified diffs include complete minified lines; the actual guard changes are limited to nested DigestAlgorithm cardinality and strict DER NULL contents. The minified predicates implement the same source guard, and their trivial one-line source maps remain valid. The upstream BSD attribution is retained.

Patch SHA-256: `2cbbff9183d2896f13da8c8655b8f598b0f24c9b7477e8230f9a313f806c239f`. Reviewed full installed-tree SHA-256: `2e3a4c3aa2e8f3235d9dd9b3f21698c7aa88983ba9623f1502029386316380e4`. The official tarball integrity is `sha512-LarFH0+6VfriEhqMMcLX2F7SwSXeWwnEAJEsYm5QKWchiVYVvJyV9v7UDvUv+w5HO23ZpQTXDv/GxdDdMyOuoQ==`.

For each of the three published entrypoints, forced pure-JavaScript RSA verification preserved 11 valid cases and rejected all 30 malformed cases across six digest algorithms. The official unpatched package accepted 23 malformed cases, so the regression distinguishes the fix. The complete official Node suite passed 828 tests with four upstream pending cases against the final source patch. Exact Node 24.21/pnpm 10.34.5 frozen installation with direct and aliased dependencies passed and reproduced the reviewed bytes and all-entrypoint behavior.

The audit gate extends its fixed policy to the one additional exact advisory/version only after patch checksum, every installed package tree and bounded runtime probes pass. It retains the raw upstream advisory and rejects unrelated high/critical findings. It is a verified local mitigation, not an official upstream fixed release. The removed open-ended multi-package manifest/backport framework remains absent.

CI now prepares a reviewable Linux release candidate on Node 24.21 after its checks, verifying artifact integrity, scanning for secrets and executing the exact packed CLI. It uploads the candidate with one-day retention; this step cannot publish and does not change required reviews or main-commit release checks.

Consolidated local validation passed 649 CLI tests without skips, 60 inspector tests, build/typecheck/lint, static security policy, package allowlist and packed CLI smoke. Both real frozen-install fixtures passed, including original braces glob/watch behavior and node-forge source/browser-bundle tamper rejection. The packed CLI carries and stages both exact patches and upstream notices. The combined candidate still requires the full hosted matrix and the repository’s existing code-owner review before publication.

Installed-graph verification recognizes explicitly optional peer dependencies as well as ordinary optional dependencies. A missing peer is skippable only when the parent declares the peer and marks it optional, with no competing required dependency declaration; present dangling links, outside paths and missing required packages still fail. Missing required-package diagnostics include an escaped project-relative path. All 650 CLI tests passed after this change.

### Incremental dependency installation repair

The remaining existing-project acceptance case exposed a real pnpm 10.34.5 installation defect. In an API/Neon project, `tslib@2.8.1` was initially skipped through optional `@emnapi/runtime`. Adding WXT introduced required `async-mutex -> tslib`, and the newly resolved lock recorded it as required, but the incremental frozen installation retained the old skipped state and omitted the package. The original verifier correctly rejected this missing required dependency. Optional-peer support is independently valid and does not hide this defect.

Removing only generated root `node_modules` and running an ordinary frozen installation completed in 5.6 seconds on the original failing graph. The reviewed lock remained exactly `b412f3758702f52968e564a99fcac618ea6be89697a05e301e4bad4807a04906`; the dependency was installed, its skipped state cleared, and both the original collector and full verified audit gate passed. Workspace links and the separate content-addressed package store were retained.

Actual additions now rematerialize that generated cache before frozen installation and check that the lock bytes remain unchanged. Linked or non-directory cache paths are rejected before cleanup. Source, reviewed patches and lock ownership remain intact. The alternate `--fix-lockfile` command was rejected because it rewrote the reviewed lock despite `--frozen-lockfile`; `--force` is not used.

The final cache-regression run passed all 652 CLI tests without skips, 60 inspector tests, lint and static security policy. Focused cases cover stale generated cache removal with package-store preservation, linked-cache refusal and frozen-lock byte drift.

### Simplified dependency patch policy (2026-10-16)

This supersedes the installed-tree and runtime audit-gate design described in the historical checkpoints above. `src/dependency-patches.ts` installs both exact-version patches and notices while preserving customer policy and source files. Generated audits retain the raw pnpm report and accept only the two reviewed advisory/version pairs, with the effective pnpm patch mapping and bundled patch checksum. Frozen pnpm installation applies the patches and checks lockfile consistency. The audit no longer traverses installed dependencies, hashes package trees, or executes package code.

Runtime coverage lives in this repository: the braces fixture checks depth/cycle guards and normal glob/watch consumers; the forge fixture checks valid and malformed signatures through Node and both browser bundles. Both fixtures check frozen installation and changed-patch rejection. Audit-policy tests use deterministic reports to cover unknown advisories, other versions, critical findings, malformed reports, command errors, missing/wrong mappings, and changed patch bytes. Live advisory-service availability is independent of these regression tests; generated `pnpm audit:deps` still queries the actual service.

## CLI and generated application review

Reviewed 2026-10-16 against the uncommitted 0.11.1 checkout. This report describes the current source and local evidence, not a published release. Backward compatibility and upgrades of existing projects are explicitly outside the owner's requirements.

### Review process

Four independent review tracks examined CLI and registry contracts, generated applications, delivery/provider recovery, and repository/plugin/release cohesion. A second stage cross-reviewed the changes across tracks. A final stage checked command grammar, public exports, generated guidance, removed compatibility paths, runtime prerequisites and packaging policy together.

The review covered command parsing/help/JSON failures, registry selection and staged additions, workspace composition, web/API/native/extension recipes, shared database/auth packages, environment conventions, dependency patches, current Cloudflare engines, provider receipts and credential separation, partial operations, deployment/rollback/recovery evidence, project catalog, inspector/MCP, CI, release verification and package contents. Existing structural suites exercise generated combinations; they do not establish every runtime integration.

### Completed corrections

| Area                                             | Current behavior                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency patches                               | A generic installer owns the exact pnpm patches. Generated audit policy verifies only reviewed advisory/version pairs, effective patch configuration and patch hashes. Installed-package/runtime regressions belong to repository tests. Generated guidance now describes that boundary accurately.                                                                                                                |
| First Cloudflare app added to a native workspace | The selected runtime determines the actual Void or Wrangler output. Configuration, root Node engine, documentation and delivery manifest agree. A previously registered zero-target workspace keeps its identity, account and audience when selecting its first engine.                                                                                                                                            |
| One project configuration                        | Root metadata now lives in `anhedral.json`: identity, standard, setup, registry, provider settings and selected Cloudflare/Vercel sections. Old filenames are not read. Section updates preserve unrelated settings, share the source transaction lock, and retain edit/concurrency protection through separate configuration fingerprints. The local full-stack example uses this same format.                    |
| Current delivery manifest                        | `deliveryEngine` is explicit and validated. Registration validates the current setup plan before writing application state. Missing/unknown engine markers and incomplete setup plans fail without rewriting the manifest.                                                                                                                                                                                         |
| CLI grammar                                      | `init [directory]` is the initialization command. `add <items...>` operates in the current project; `--cwd <directory>` selects another project. The `new` compatibility alias and ambiguous positional add-directory parser are removed from help, implementation, examples and test harnesses.                                                                                                                   |
| Compatibility remnants                           | Removed the Wrangler-to-Void migration planner, `voidCandidate` outputs, old provider journal migration, catalog import shim and historical CLI-only release-verification fallback. Unsupported saved formats fail rather than being converted.                                                                                                                                                                    |
| Current Wrangler profiles                        | Explicit OpenNext, Queues/dead-letter recovery and Basin selections retain the required Wrangler implementation. Those are current supported selections. Additions do not mix engines or relocate existing runtime ownership.                                                                                                                                                                                      |
| Project catalog                                  | Private schema fields, files, locks and the default directory consistently use `projects`. Catalog registration, inspector startup, MCP fixtures and documentation agree; no old catalog migration is retained.                                                                                                                                                                                                    |
| Toolchain policy                                 | Generation, setup and diagnostics share Node eligibility and engine selection. Doctor requires the exact pnpm pin. Root and inspector Node type-definition update rules are scoped independently.                                                                                                                                                                                                                  |
| Root verification prerequisites                  | Unit tests verify/reuse the inspector runtime or prepare its frozen dependencies and rebuild it. Packaging cannot accept a stale source digest.                                                                                                                                                                                                                                                                    |
| Service operations                               | CLI and MCP share one dispatcher. Receipt-only selectors are discoverable, KV follows provider cursors, and D1/Neon browsing uses bounded projections, SQL masking and explicit ordering. Offset pages remain subject to concurrent writes.                                                                                                                                                                        |
| Neon migration handoff                           | Runtime provisioning does not put pooled credentials into the migration package. Guidance requires separate direct migration credentials and reviewed SQL.                                                                                                                                                                                                                                                         |
| Optional Neon Realtime                           | `--neon-realtime` selects Neon consistently with Better Auth and adds separate server/client factories for sealed live queries. Durable Object rooms retain `--realtime`. Branch activation is manual; the beta has no RLS. SDK source sealing checks and generated composition pass; live subscriptions and a fresh published SDK installation remain unverified. See the dated record in `docs/verification.md`. |
| Provider naming                                  | Vercel names are normalized and bounded independently of package/directory names.                                                                                                                                                                                                                                                                                                                                  |
| Disposable runtime state                         | Source receipts and addition transactions exclude Void/Vinext caches, generated Wrangler configuration and app migration mirrors. Authored database files and shared reviewed SQL remain source.                                                                                                                                                                                                                   |
| Process execution                                | Generator commands have bounded execution. Preview tests register lifecycle listeners immediately, bound output/startup/build/HTTP waits, and terminate descendant processes with forced cleanup when necessary.                                                                                                                                                                                                   |
| Generated development ports                      | Void backend Vite configurations use their declared per-app inspector ports and strict HTTP ports. Generated routing instructions identify the actual Worker entry adapter.                                                                                                                                                                                                                                        |
| Generated acceptance wiring                      | Generated-profile checks invoke a compiled-handler SQLite auth gate and fresh Void build/preview acceptance. The isolated D1/Better Auth API profile additionally applies local migrations and exercises signup, login, session retrieval, incorrect-password rejection and revocation with temporary credentials and a matching local origin.                                                                     |
| Plugin completeness                              | Packaging requires the current skill, references, MCP entrypoint, manifest assets and verified runtime. Missing MCP configuration cannot bypass runtime verification.                                                                                                                                                                                                                                              |
| Public and server environment                    | Vinext maps `NEXT_PUBLIC_*` during builds; Vite clients use `VITE_*`. Production public values belong in the build environment. Protected local server values can be sent to `void secret` via stdin; dotenv files remain private and untracked.                                                                                                                                                                   |
| Release identity                                 | Verification requires both CLI and matching plugin archives. Canonical documentation is regenerated into the bundled plugin references. The immutable marketplace `plugins/anhedral` release-tree path remains a consumer contract. Bundled guide filenames now match the canonical `stack-standard.md` and `software-factory.md`.                                                                                 |

The cross-reviews found no further confirmed defect in the reviewed changes. That is a source-review result, not proof that every supported combination is production-ready.

### Verification for this pass

| Check                                                     | Result                                                                                                                                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| CLI build                                                 | Passed                                                                                                                                                                                                                                                                                 |
| Full CLI unit suite                                       | 668 passed, two skipped, zero failures; 670 total                                                                                                                                                                                                                                      |
| Focused CLI grammar/readiness/addition tests              | 30 passed                                                                                                                                                                                                                                                                              |
| Delivery/provider focused suite                           | 174 passed before final consolidation; covered again by the full suite                                                                                                                                                                                                                 |
| Root lint                                                 | Passed: type checking, formatting, source hygiene and release policy                                                                                                                                                                                                                   |
| Static security policy                                    | Passed                                                                                                                                                                                                                                                                                 |
| Offline patch installation/runtime regressions            | Passed for braces and node-forge                                                                                                                                                                                                                                                       |
| Package allowlist                                         | Passed: 214 files                                                                                                                                                                                                                                                                      |
| Inspector                                                 | Type checking/build passed; 61 tests passed; one listener test blocked by `listen EPERM` on `127.0.0.1`                                                                                                                                                                                |
| Fresh packed CLI installation                             | Offline attempt blocked by `ENOTCACHED` for `@neondatabase/serverless` in the smoke test's isolated empty npm cache                                                                                                                                                                    |
| Fresh generated API build and compiled handlers           | Passed with current generator overlays and version-checked cached dependency links: Vite build, health/OpenAPI, and real Better Auth/Drizzle SQL/session flow against in-memory SQLite. This used the bootstrap fixture, not a new upstream download or fresh dependency installation. |
| Generated workerd/type generation                         | Workerd preview remains unexecuted; Wrangler runtime type generation attempted and blocked by `listen EPERM`.                                                                                                                                                                          |
| Complete local release candidate                          | CLI tarball/plugin ZIP created together, independently integrity-verified and secret-scanned; not published or installed.                                                                                                                                                              |
| Hosted generated matrix, browser flows and live providers | Not established for this uncommitted candidate                                                                                                                                                                                                                                         |
| Current external advisory databases                       | Not refreshed in this pass                                                                                                                                                                                                                                                             |

The listener and empty-cache failures are environment limitations, not proven application defects. Earlier dated local/provider results in the Void delivery section below apply to their recorded source and do not substitute for testing this candidate.

### Remaining acceptance work

1. Run the complete hosted OS/Node and generated-profile matrices against the intended commit, including the newly wired local auth path and inspector browser tests.
2. Establish a fresh packed dependency installation and refresh external advisory results for that candidate.
3. Exercise private first deployment, committed resource-lock reuse from a fresh checkout, partial deployment recovery, and provider-confirmed rollback with the intended customer accounts and Access permissions.
4. For an implemented product, verify protected business data, denied users, tenant isolation and any cross-app/native/extension identity flows. The scaffold's auth session smoke does not implement or certify those product behaviors.

No provider resources, publication, production deployment or source commit were performed during this review. Detailed local evidence and prior pass results are recorded in `docs/verification.md`.

## Progressive stack — local checkout, 2026-10-18

Plain initialization now selects Expo only. Capability dependencies resolve to a
fixed point; the compatible full-product preset includes Cloudflare AI, analytics,
media, realtime and jobs plus WXT, billing, email and monitoring. Existing edited
source and backend/delivery ownership remain protected. Legacy full-stack records
above describe earlier defaults and are retained as historical evidence.

Real generated `universal` (minimal) and `full-product` profiles passed dependency
installation and `pnpm check`, including lint, type checks, Fallow, dependency audit,
tests and builds. Full-product built Expo web, WXT, Hono and service Workers. These
were isolated temporary projects; no configured database was migrated or provider
resource deployed. The full-product check exposed unused helper dependencies and
duplicate transport code; shared server transport and lazy Hono adapters fixed the
actual findings without suppressing the generated checks.

Focused regressions exercise minimal selection, provider independence, preset
overrides, read-only previews, adding auth/billing without overwriting an edited
home screen, data added after service adapters, scoped media calls, private image
responses and redacted invalid provider JSON. The stack page's Mermaid diagram was
rendered locally. The six local plugin skills passed frontmatter/link validation.

Remaining acceptance: account/service activation and permissions, actual AI/event
receipt/image/video behavior, RealtimeKit calls, app room authorization, native
build/device/store flows and live payment reconciliation. No release, installation,
publication, production deployment or source commit was performed.

Final regression run: `pnpm test:unit` reported 750 tests, 748 passed, two skipped,
zero failures. `pnpm typecheck`, `pnpm format:check`, `pnpm check:hygiene`,
`pnpm check:security`, `pnpm check:release-policy`, CLI build and inspector/plugin
build passed. Additional growth coverage confirms direct billing additions retain
native RevenueCat key examples in the consuming app and preserve API-origin entries.

## 0.13.0 release preparation

The candidate changes plain init to a minimal Expo app, adds dependency-resolving
capabilities and a full-product preset, and packages six focused skills with shared
plugin-wide references. README and the concise stack page use the same progressive
diagram. Historical generated reference apps retain their original provenance.

Local `pnpm release:check` passed: lint/typecheck/format/hygiene/release policy,
static security policy, refreshed OSV audit, 748 passing tests (two skipped), exact
braces/node-forge patch regressions, packed CLI installation and package allowlist.
`pnpm plugin:check` passed, including 62 inspector tests. Release artifact creation,
hosted CI and publication are recorded separately after they actually complete.

### 2026-10-19 — release CI corrections and artifact reuse

- Hosted generated-profile checks exposed an unused web API-client stub in Clerk builds and Wrangler ready URLs without trailing slashes. Emit the web client/dependency only for its Better Auth consumer; normalize both Vite and Wrangler loopback URLs. Both Clerk profiles subsequently passed real local generation, check, build and Worker preview. Universal auth and billing reference previews passed with the corrected readiness parser.
- Provider-call assertions in billing fixtures now compare exact hostnames, addressing CodeQL substring findings without changing provider transport.
- Publication consumes the immutable candidate from successful trusted main CI for the exact reviewed SHA instead of reinstalling and rebuilding it. CLI/plugin integrity pins, secret scan, package smoke, cross-platform artifact checks, protected npm environment and OIDC publication remain required. Negative policy checks reject staging, PR-run or unpinned candidate selection.

## 2026-10-21 — focused staging releases and CI tiers

Adopted topic PRs into `staging` and focused staging-to-main release PRs. Routine
code CI uses one Linux Node 24 CLI lane and one plugin lane; release candidates
retain supported Node, macOS/Windows, both plugin toolchains and all generated
profiles. Removed the duplicate E2E packed-CLI job. Stable `CI gate` fails on scope
errors or applicable failed/skipped jobs. Candidate upload is restricted to trusted
main CI. Reviewed-integrity dispatch, npm OIDC/provenance, immutable tags and
existing maintainer/CodeQL review requirements are preserved. Renovate targets staging.

Local build, typecheck, lint, release-policy and release-tooling checks passed.
Scope/promotion, candidate and plugin packaging regression checks passed. Full unit
suite passed with pinned pnpm 10.34.5: 750 passed, two optional runtime checks
skipped, zero failures. actionlint 1.7.12 passed (optional shellcheck/pyflakes disabled).
Initial checks caught a broken bundled relative documentation link and an obsolete
candidate-condition expectation; both were corrected. The host's pnpm 11 first
rejected the inspector's pnpm-10 override configuration; rerunning with the declared
version avoided a lockfile change. This is source/fixture evidence, not live provider
acceptance or a new npm publication. Adoption source takes effect on main after its
release PR merges; main remains the default branch.

Hosted adoption PR #39 subsequently exposed generated-project blockers: desktop
rejected Vite advisory GHSA-587h-7wmj-h5pm, and clients rejected duplicate affected
versions in advisory data. The generated dependency/advisory sources are unchanged
by this conventions diff; these failures are retained as release blockers for a
separate focused maintenance PR. Added fail-fast matrices and made portability/
generated jobs wait for primary checks to avoid spending on an already-failing
candidate. Hosted checks must pass before promotion/publication.

GitHub settings could not be applied: the authenticated account reports push access
but admin=false, and the attempted ruleset update returned HTTP 404. Existing rules
are unchanged. PR #39 lists the exact administrator prerequisites, including both
main rulesets, CI gate, merge commits and disabling automatic staging deletion.

## 2026-10-21 correction — lightweight hosted checks on both branches

The owner clarified that large hosted checks are unacceptable on staging **and**
production. Earlier release-matrix proposals above are superseded. Automatic PR
CI now has one Linux CI gate on both branches; no full suite, generated project,
browser or platform matrix expands at promotion. Expensive validation is optional
and explicitly manual, or local. Main has no duplicate push check. CLI candidate
packaging is requested manually on main; publication keeps exact SHA/artifact,
secret/integrity, protected npm approval, provenance and tag checks while using a
single Linux artifact smoke lane instead of the six-job native matrix. Main repo
PRs fetch only the formatter, not the full application dependency graph. Its deploy
scripts no longer repeat full checks/tests, while retaining main/source guards,
affected-service detection and the selected app's necessary build/typecheck/upload.

The corrected lightweight CLI gate passed locally: compile, formatting, source
hygiene, static security/release policy, fast contract tests and release-tooling
negative paths. actionlint passed for automatic, manual-validation and publishing
workflows. The dependency/advisory repair remains a separate staging PR.

## 2026-10-21 — generated dependency/advisory repair

Reproduced three live OSV findings on desktop's pinned Vite 7.3.6:
GHSA-587h-7wmj-h5pm, GHSA-698v-4r3x-3vcv and GHSA-r825-w8mm-5pxw.
The upstream repaired 7.x release is 7.3.7; the desktop recipe now pins it without
a major upgrade. Sources: https://github.com/advisories/GHSA-587h-7wmj-h5pm
and https://github.com/vitejs/vite/releases/tag/v7.3.7.

A real pnpm 10.34.5 clients audit also emitted two Vite 7.3.6 findings for the
extension and desktop dependency paths. Its severity metadata counted both
instances. The audit verifier now permits repeated versions at distinct paths,
preserves both counts and the raw report, and rejects duplicate version/path
entries. New regressions cover count mismatches, unknown high advisories and
exact reviewed-patch requirements with repeated versions. No advisory was added
to an exception list and no severity threshold changed.

Validation used Node 24.21.0 and pnpm 10.34.5. `pnpm test:all` passed: build, lint,
static security policy, live OSV audit of 110 locked/catalog coordinates, 751 unit
passes with two optional skips, frozen patch probes, packed CLI installation and
packlist checks. The 12 focused audit/scaffold checks passed. Fresh real desktop
and clients profiles passed generation, frozen install, lint/type/audit/tests/build
and unsigned macOS Electron packaging; clients also exercised Expo and WXT outputs.
The clients gate still requires its existing reviewed braces/node-forge patches;
raw advisories remain visible. Initial parallel generator runs collided in shadcn's
shared temporary clone directory; rerunning sequentially resolved that setup failure
without changing tests or adding retries. These results do not establish Windows,
Linux, signed macOS distribution or store acceptance. Hosted PR checks provide
separate evidence. This focused repair has no version bump or npm publication.

## 2026-10-23 — Product family naming

Positioned Anhedral CLI as the starter foundation in the README and software factory, alongside Anhedral Platform, Anhedral Agents, and Anhedral Cloud. This documentation change does not publish a package or activate provider services. Validation: Git whitespace checks; canonical software-factory reference refreshed through the normal build.

## 2026-10-23 — Generated audit dependency security recovery

The managed-email recovery release check refreshed OSV and found two advisories
against the existing generated Fallow 3.33.1 pin: GHSA-h4fr-cmh5-qr62 and
GHSA-jfwm-3p3c-6hx5. Both upstream advisories identify 3.34.0 as the patched
version. Pin the generated audit tool to that version; keep audit admission and
all existing security gates enabled. No provider resources or databases changed.

CLI build, lint/typecheck/format/hygiene/release policy, focused dependency/Next
contracts (11 tests) and refreshed OSV audit (61 locked/catalog versions) passed.
Publication of the integrated candidate remains separate.

## 2026-10-23 — Managed authentication email recovery

Recover the scoped email adapter and verification/password-reset flows from the
preserved `4a48ca3` snapshot against the current Next web/native-only Expo stack.
Use an optional, fully validated API binding/scope/capability; empty standalone
setup retains current sessions, partial setup fails closed, and configured setup
requires verification with reset session revocation. All generated session
consumers pass the same server environment, including private files and billing.
The adapter uses deterministic send identities and bounded requests; broker error
bodies and credential/token-bearing transport errors never reach clients.

Next and native signup wait for verification rather than trying to open Account
without a session. Resend and reset flows use exact same-origin/native callbacks.
The framework-independent reset transport is shared through contracts; each
platform owns its controls. Nova Input/Label integrate with the reviewed form PR.

Validation: focused generator/broker/Next tests (8), complete CLI unit suite
(553 passed, one optional skip), unchanged CLI release gate including OSV, patch
regressions, packed CLI and packlist passed again on the final combined Nova/email/tooling source. The
installed generated core fixture passed full checks including Fallow, dependency
audit, types, lint, OpenNext/API builds; iOS/Android Hermes exports passed.
Compiled Worker plus real Better Auth/Drizzle/in-memory SQLite proved signup,
verification, denied unverified login, reset, single-use/expired tokens, session
revocation, incorrect password, unknown-user privacy, foreign callback denial and
exact native return scheme. Default unconfigured auth acceptance also passed.
Browser testing verified the signup prompt, verification link, authenticated
Account and sign-out with the isolated sink. No real email or configured database
was used. Physical-device, inbox delivery and hosted-image activation are separate.

Initial checks retained failures for synthetic email strings in the security
scanner, screen/adapter complexity and cross-platform duplication; fixture
addresses were assembled and shared reset transport extracted without relaxing
checks. Fresh advisory refresh required separately reviewed Fallow, Expo-Zod and
Miniflare-Undici fixes. A local UI HTTP harness initially wrote cookie headers
after committing response headers; fixing that fixture restored sign-in. The
product's compiled-Worker authentication tests already passed independently.

## 2026-10-23 — Nova authentication form recovery

The current Next/native default already contains the recovered native shadcn
foundation and Base Nova Button (#49). Recover the source-owned Base UI Nova
Input and Label from the retained CLI snapshot and use them on generated web
sign-in forms. Preserve the existing MIT notice and upstream provenance hashes;
adapt only the local utility import, client boundary and focus ownership. Input
delegates keyboard focus to the generated global rule rather than adding a
second focus-only border/ring layer. Other historical components remain preserved
in the recovery branch and are not installed as unused starter code.

CLI build/lint/typecheck/format/hygiene and five Next contract tests passed.
The integrated generated web fixture passed Next route/type generation and lint
with these recovered controls. Browser interaction and final integrated release
checks are recorded with the managed-email recovery.

## 2026-10-23 — Expo CLI validation dependency recovery

A fresh installed core fixture failed the unchanged dependency audit on
GHSA-mrhx-c7xc-m3w5: Expo CLI 57.0.32 pulls Zod 3.25.76 although application
contracts already use patched Zod 4.6.6. Add a narrow @expo/cli>zod override to
the existing catalog pin. Expo SDK stays at 57. Audit admission remains enabled.
The actual CLI plugin/MCP schemas and native exports are tested before promotion;
this does not claim upstream Expo has migrated its declared range.

The next audit also identified GHSA-xjj6-f33q-929c in Miniflare's Undici
7.29.1. A same-major, consumer-scoped miniflare>undici 7.30.1 override uses
the upstream patched version and also removes the related moderate Undici
findings. No high/critical advisory is waived. Existing exact reviewed
node-forge/braces patches remain unchanged.

The installed generated core fixture passed the unchanged high/critical audit
gate with only the existing exact verified node-forge patch acceptance. Both
Hermes native exports passed. The actual Expo plugin and MCP schemas passed
positive/negative parsing against scoped Zod 4.6.6; CLI build/lint and 11 focused
contract tests passed, and OSV passed for 62 locked/catalog versions.

Final integrated acceptance: the unchanged full CLI release gate passed, including
553 unit passes/one optional skip, refreshed OSV (62 locked/catalog versions),
exact patch regressions, packed installation and strict packlist (249 files).
Inspector/plugin check passed all 61 tests. Both core and Stripe+RevenueCat
generated profiles passed full local checks and builds. The payment profile also
passed real workerd SSR/RSC, protected account, D1 session/revocation, native
scheme/origin rejection, compiled email acceptance and synthetic billing tests.
The 28 generated browser JavaScript assets contain no managed-email broker
configuration/module or native purchase modules. Browser reset-request confirmation
passed; native exports do not establish physical-device acceptance.

The final strict packlist initially rejected the recovered Input/Label paths;
PR #62 requires and allowlists exactly those two files without widening exclusions.
Nova form recovery is #60; security prerequisites are #58/#59. Storage safeguards
were already recovered/shipped as anhedral-main#201: nine regressions, root
check (26 tasks) and serial root build (five tasks) passed again at Platform
source 822825e9; later observed staging changes did not touch those safeguards.
No Comms source, retained recovery snapshot or stash was changed by this work.
Publication and provider state are verified separately after promotion.

Final React review gives web/native reset forms a token/error-derived route key,
so following a new recovery link resets prior completion, input and error state.
Only the used token/error fields cross the Next server/client boundary.

## 2026-10-23 — Immutable release smoke prerequisite

The first 0.15.0 publication attempt (run 40056207567, source 4557627f) stopped
before npm publishing. Hash and secret checks passed; exact-artifact smoke failed
while spawning pnpm for the installed CLI's normal initialization. Main candidate
CI had pnpm setup, but the isolated release verification and exact-artifact jobs
provisioned only Node. Add the same pinned pnpm action/version to those jobs, with
run_install disabled. Keep normal init, artifact integrity, npm environment/OIDC
and exact-artifact checks intact. A workflow regression covers all three smoke
locations. A fresh main candidate must be reviewed again after this correction.

## 2026-10-24 — Published 0.15.0 artifact identity

Read-only release verification resolved tag `v0.15.0` to source
`2c06f4eb528da0ba404212298fc57e1a2287f22e`. The npm registry serves 0.15.0;
its tarball and the GitHub release tarball both match the release metadata:

- CLI SHA-512: `sha512-1D2XHnw4QSDYXfNigt7YBdv5N8Y8ANOpaoSb38xlqEvv1uq7VHFurx+lAsX0IpB4Jf2R5PISitx2Fs6cDyJ4KQ==`.
- Plugin SHA-512: `sha512-G3/obSaCpHv+AvitX/Xtb34ChmsBc+7NrV7WHDDNEyqZkOin6CH4MSDgqu4lJnCdUn6dxCN06mFckBadwqlwgg==`.

The downloaded plugin ZIP matches both release metadata and plugin metadata.
The npm and GitHub package checks hashed the actual bytes in memory; the tag
was checked against the remote repository. This establishes published artifact
agreement, not independent provenance-signature verification or a rebuilt source
comparison. Release assets and metadata are available at
[the 0.15.0 release](https://github.com/anhedral/anhedral-cli/releases/tag/v0.15.0);
[registry metadata](https://registry.npmjs.org/anhedral/0.15.0) records the npm integrity.

This supersedes unpublished-preview wording, not the dated runtime evidence
above. Publication does not update existing applications, installed plugins or
Platform images. Platform's separately recorded Next generator at `2280c3b` has
a different integrity and must retain its own acceptance evidence until an
explicit artifact adoption is verified. No publication, deployment, provider
mutation or payment operation was performed during this verification.

Documentation correction validation: CLI build, documentation/plugin contract
checks (two passing test entries) and `git diff --check` passed in an isolated
checkout. No runtime behavior changed.

## 2026-10-24 — Addition post-commit installation recovery

Focused addition regressions now inject a failure in the final frozen install,
after the actual staged source transaction commits. They verify PostCommitError,
retained billing source/receipts, removal of stale dependency links, released
transaction lock, preservation of authored/private files and a successful
idempotent retry that still invokes the installer. A second regression rejects
an installer that mutates the reviewed lockfile after source commit.

The dependency runner is injected: these checks exercise the real addition and
transaction paths, not a real pnpm dependency installation or application runtime.
No generator behavior change was required. Build and lint (typecheck, formatting,
source hygiene and release policy) passed; the focused addition, transaction
rollback and CLI-output run passed all 36 test entries. `git diff --check` passed.
No provider, publication, deployment, database or payment operation occurred.

## 2026-10-24 — Recovered embedded inspector contracts

Compared the preserved user-work snapshot at `4a48ca3` with the current CLI.
Its embedded-host fixture and browser regressions had not landed. Recovered them
against the current synthetic core-stack fixture, retaining its lockfile evidence
and supported init options. The installed MCP Apps SDK now exercises project
context updates, advertised desktop unsent drafts for both active/new targets,
unsupported/web-host fallback, failed-composer fallback and actual safe-area layout.
The production preview CSP remains unchanged; embedding is test-fixture-only.
Recovered service-argument descriptions now explain catalog/service identities,
D1's complete-UTC-day analytics windows, pagination and app-only deletion inputs;
obsolete Vercel guidance was removed.

CLI build, root lint/static security, plugin check (61 tests) and the browser suite
(17 tests, including four recovered host tests) passed. Browser execution used
installed Google Chrome via PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH because the pinned
Playwright browser binary is absent. An initial fixture port attempted obsolete
init flags; it was corrected to preserve the current fixture before acceptance.
This is synthetic browser/SDK evidence, not live Codex-host or provider acceptance.
No installed-plugin update, publication, deployment or provider operation occurred.

## 2026-10-24 — Recovered generated-type cache restoration

The historical cache-restoration check in `0f827d9` remains useful for the maintained
core stack. A real installed pre-fix generated workspace failed its warm Next
cache-HIT assertion after generated type files were removed. Worker typecheck also
had no declared outputs. The corrected generator caches Worker binding types,
Next environment types and production route types; it ignores next-env.d.ts so a
generated file cannot become a changing task input. The regression uses a fresh
local-only Turbo cache, requires both application tasks to report HIT in the actual
warm-run JSON summary, and compares every restored file byte-for-byte. It runs in
the generated-profile integration runner and can target an installed local fixture.

The same pre-fix fixture passed after applying only the reviewed output/ignore
settings. A fresh core application generated by the corrected CLI passed its full
check, confirmed cache restoration, dynamic SSR/RSC, workerd service-binding and
D1 authentication/authorization, protected contracts, session revocation, native
scheme transport and origin rejection. Migration fixtures were explicitly local.
CLI build/lint/static security, the unit suite (556 pass, one existing skip), plugin
check (61 pass), packed CLI smoke and packlist policy (249 files) also passed.
This does not update existing customer projects or establish device, store or live
provider acceptance. No remote migration, deployment, payment or publication ran.

## 2026-10-24 — Preserved-work disposition and service-tool guidance

Compared all preserved snapshots against the maintained CLI, its registered
commands/plugin tools, emitted source, packaging and tests. Patch IDs alone were
insufficient because the repository squashes topic PRs. Exact Git tree comparison
established the following dispositions:

| Preserved source                      | Disposition                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Maintainer-policy `f7e51c8`           | Exactly the tree of merged PR #24 (`723a213`): architecture, lifecycle, security/toolchain and review work landed historically. PR #46 later retired the old control-panel/alternative-stack layout. The still-useful cache regression was adapted for the current API/Next stack.                                                                                                                          |
| Former local staging `91ec88f`        | Exactly the tree of merged PR #37 (`fc721c9`). Maintenance guidance, CI scope, Windows PATH ordering, release-artifact/profile fixes, README and artwork changes were already incorporated. Current command resolution, CI scope and preview discovery retain their relevant fixes.                                                                                                                         |
| Older control-panel variant `d7ac371` | Its 28 changed paths belong to the retired apps/control-panel/plugin layout and an independent anhedral.progress.json report/discovery store. Current project inspection/lifecycle, provider records, delivery evidence, catalog and transaction locks own those concerns. Do not restore a parallel writable evidence store or unsupported capabilities. Original variant remains archived.                |
| User-work snapshot `4a48ca3`          | Reviewed all 114 changed paths. Recovered embedded-host browser coverage, service-argument descriptions and per-operation service-tool descriptions. Nova auth controls/packaging (#60/#62), managed auth email (#61), security pins (#58/#59), approved branding (#47), contract checks (#44), UI inspection/substitution (#41/#43) and owned Next/native components (#49) already landed in focused form. |
| User-work UI/generator alternatives   | Generic ui/expo-ui packages, native web adapters, duplicate token JSON, unused component inventory, selectable provider/preset recipes and mobile-web bootstrap variants are superseded by separate DOM/native UI, shared tokens, offline core bootstrap and mandatory Next/Expo/Hono/D1/R2. Preserve originals in the archive; no current runtime consumer requires restoring them.                        |
| Attached completed worktree branches  | Addition recovery, dependency fixes, Nova packlist and product positioning have exactly the trees of merged PRs #67, #59, #62 and #56 respectively. Retiring their refs does not require removing their worktree files.                                                                                                                                                                                     |
| Existing user-work stash              | Shared tracked paths match the recovery snapshot, and all 39 untracked stash files are byte-identical to files in that snapshot. Keep the stash unchanged and independently backed up.                                                                                                                                                                                                                      |

The recovered service-tool descriptions distinguish existence from application
health, explain catalog/service identities, supported Worker/D1 analytics windows,
offset/cursor paging, app-only private data, and reviewed single-use deletion
plans. Obsolete Vercel wording was removed. Input validation, visibility,
permissions, confirmation requirements and provider behavior are unchanged. Plugin
check passed all 61 tests after the description recovery. No additional tests were
added merely to compare documentation strings.

Before branch retirement, retain verified self-contained Git bundles containing
all original refs (including stash), original ref/object inventories and checksums.
The detailed path inventory covers the 142 changed paths in the two independent
snapshots. The approved disposition is to retire accounted-for recovery and
completed-topic refs after the focused patches merge to staging, keeping old
worktrees detached at their original commits so source and ignored material remain
intact. Keep main/staging unchanged on the remote except for reviewed staging PRs.
The old implementations remain recoverable; this is not proof of current device,
store, live-provider or payment acceptance. No publication or deployment occurred.
