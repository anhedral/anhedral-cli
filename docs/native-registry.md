# Official shadcn registry → Expo

Pinned source: [shadcn-ui/ui at 617134d5810bba521803b3ed787190bacbb80b35](https://github.com/shadcn-ui/ui/tree/617134d5810bba521803b3ed787190bacbb80b35/apps/v4/registry). Published metadata snapshot dated 2026-10-24; every response has its own SHA-256. Source and published metadata are recorded separately because publication can lag source. Third-party registries are outside this official snapshot.

**27 registries, 6437 style/item entries, 616 distinct type/name pairs, 2073 referenced source files.** A matching component name does not establish variant, example or block parity. Only reviewed coverage entries may be marked ported. Device acceptance is separate. The snapshot also retains eight component stylesheets and the pinned upstream global stylesheet, including its theme metric formulas.

## Maintenance model

Keep a complete, pinned upstream source mirror and published metadata snapshot for review. Maintain the Expo source as a separate native overlay. Preserve upstream web implementations and CLI behavior rather than manually editing every web copy or forking CLI internals. Anhedral CLI can supply both outputs while the upstream mirror stays outside its shipped starter payload. The complete upstream fork is [anhedral/shadcn-ui](https://github.com/anhedral/shadcn-ui), with upstream branches and tags preserved. The reviewed source pin and web CLI version are recorded in assets/ui/UPSTREAM-LOCK.json.

For each upstream update, compare item/file hashes, public APIs, discovered variants, examples and dependencies. Refresh the web baseline from upstream; invalidate any native coverage whose reviewed inputs changed. Port and test the native changes before marking them complete. A successful upstream merge is not evidence that a new feature works on Expo. Device acceptance remains separately recorded.

Refresh a clean upstream checkout with `node scripts/shadcn-registry.mjs --snapshot /absolute/path/to/shadcn-ui`, regenerate with `pnpm native-ui:registry:docs`, and compare a retained previous snapshot with `pnpm native-ui:registry -- --diff /absolute/path/to/previous-inventory.json.gz`. Normal checks are offline. Reviewed native coverage includes source, style and transitive registry dependency fingerprints, so changed inputs cannot retain a ported status silently.

## Platform adaptation checklist

These decisions describe the named native boundary; they do not mark an entire component, style or example complete. Device acceptance remains separate.

| Browser-specific behavior | Native handling | Evidence / remaining work |
| --- | --- | --- |
| HTML chart recipe hosts, click handlers and CSS utility classes | View/Text/Pressable, native event names, inherited text styles and a strict reviewed utility translator | All 210 chart blocks and 21 chart examples retain authored data and callbacks; recipe render/control tests and source hash checks. Unknown hosts, imports and utilities fail. |
| Recharts renderer and pointer-only data exploration | D3 geometry, native SVG primitives, touch selection and adjustable accessibility actions | Series/stack/curve/pie/radar/radial/label tests. This ports the APIs used by the reviewed recipes, not the entire Recharts library or its browser animation engine. |
| ChartStyle CSS injection and color custom properties | Chart configuration/context and scoped native color resolution, including gradient stops | Chart contracts and recipe tests; CSS style elements are omitted on native. |
| SVG DOM text attributes, rem units and CSS text casing | Native SVG attributes, point lengths, real font cuts, inherited casing and open text-on-arc paths | Native chart engine/font tests. Native OS typography acceptance remains pending. |
| SVG CSS luminosity blending | Preserve explicit native label paint and theme contrast; browser compositing is not reproduced | The radial-label source remains visible in the recipe manifest; device contrast review remains pending. |
| Next font loading, CSS font-face and CSS font variables | Expo Font with selected body/heading/serif/mono roles, verified TrueType cuts, errors and retry | All 52 font entries, 347 hashed cuts and retained licenses. Unavailable italic cuts use explicit native synthesis. |
| HSL/OKLCH theme CSS and alpha colors | Shared token source plus gamut-mapped native sRGB colors and theme metrics | All eight registry themes, color/alpha and light/dark tests. This does not certify all eight component style presets. |
| Browser gallery URL parameters and icon-package picker | Explicit native preview options and official Lucide native icons | Native example tests cover the authored bar-corner condition. Other icon-library picker implementations remain web gallery features. |
| Tooltip demonstration hover transitions | Native pointer/touch animation with reduced-motion preference and subscription cleanup | Recipe motion tests. Browser focus pseudo-classes use native focus/accessibility behavior. |
| DOM portals, browser overlay windows and hover/context activation | Native Modal, safe areas, touch-and-hold, native dismissal and focus restoration | Overlay/selection tests; OS focus and screen-reader device acceptance remains pending. |
| Browser media queries, CSS scrollbars and DOM element measurements | Native window/layout events, ScrollView indicators and native measurements | Window breakpoint, scrolling and resize tests; no extra CSS scrollbar thumb is installed. |
| Public cn CSS class helper | StyleSheet flattening through nativeStyles; recipe-local classes are translated before rendering | Native utility tests. Public browser CSS strings are not treated as native styles. |
| Browser toast exit-transition queue | Native toast store/provider and native lifecycle removal | Legacy hook, isolated manager, replacement/cancellation/timer tests. Browser CSS transition delays are not reproduced. |
| HTML form association, DOM input extraction and browser blur-before-submit | Scoped NativeForm, actual RHF/TanStack/Formisch stores, native labels/refs and explicit blur validation | All 28 authored library examples have native translations and behavior tests. Pending whole-item evidence remains explicit below. |
| Next Form and server-action examples | Native value collection, React action state and retained schemas/local callbacks | Both authored forms and four omitted action/schema companions are inventoried. API/database integration remains the original application placeholder; Next transport is web-specific. |
| Named browser palette colors and toast JSON markup | Shared official 244-color palette, native rich toast content and syntax-highlighted JSON | Palette source hash checks, actual submitted values, per-message placement and formatter error tests. |
| Aria trigger/content ownership and DOM slots | Explicit native overlay composition, scalar/range slider adapters and native object/multiple selection | Authored source and behavior tests; nativeButton DOM dispatch and alignItemWithTrigger browser geometry are omitted. Aria table selection slots remain pending. |
| Trigger CSS variables, hash pagination and HTML numeric bounds | Native onLayout measurements, page state/navigation callbacks and numeric min/max/step on blur | Native upstream control tests cover measured popup width, page transitions and bounds. |
| CSS grayscale, generated borders, motion and paragraph utilities | Native SVG saturation filter, native borders, reduced-motion animations and OS text breaking | Image loading/source identity tests and interaction tests. CSS pseudo-element mix-blend compositing remains web-specific and is not reproduced by native borders. |
| Embla browser carousel and resizable DOM geometry | Native ScrollView snap offsets, fractional cards, selection subscriptions and percentage panels | Authored counter/API and named-layout/bounds tests. DOM node access, browser plugins and cyclic cloned-slide animation remain outside these reviewed native APIs. |
| HTML label-for lookup and repeated DOM IDs | Reviewed source pairs become scoped native fields with named focus/activation targets | Label names, input focus, repeated IDs, unmount cleanup and transparent grid scopes are tested; one missing upstream Amount input ID is explicitly repaired. Unknown or ambiguous ownership fails generation. Other recipe/API coverage remains pending. |
| Named/default recipe exports and source generation | Every exported UI root carries its original registry source context; parenthesized and conditional roots remain JSX expressions | Boundary tests cover named functions, aliases, concise arrows, source generations and nested callbacks. This preserves legacy palettes and routes Button styling to the original CVA definitions. |
| Component CVA base classes, variants and defaults | Retain statically analyzed class recipes, including class arrays and finite compound predicates, alongside the source hashes | All 116 current recipes are static and retained. Dynamic expressions, shadowed/nested binding scopes and unsupported declarations remain explicit review data; upstream code is never evaluated. Source hashes continue to invalidate changed inputs. |
| Button preset classes, state selectors, icon descendants and group ancestry | Source-pinned native Button slot rules, native state handlers, icon context and group context | All 120 newer source rules plus the six component class definitions retain the three frozen generations and all authored sizes. The combined variant/size/mode matrix runs through three native state sets. Native text underline position, View background clipping and immediate transitions differ from browser paint/timing; other component preset slots and device acceptance remain pending. |
| Badge preset classes, glyphs and render composition | Source-pinned native CVA rules, native state and glyph contexts, composed native links and explicit consumer text overrides | All 56 newer rules and six component definitions retain all eleven style families. Native styles replace browser class helper exports; transitions and background/underline painting use native renderers. Expanded device acceptance remains separate. |
| Native render hosts, callback styles and view click handlers | One native host receives normalized style arrays/pressable callbacks, with real pressable views, themed text and stable refs | Static/pressable composition, child-first cancellation, pointer/touch/hover motion, text metrics and retained callback ownership are tested. Multi-root render output requires a native container or separate components; DOM attributes/class names use native props/styles. Device keyboard/screen-reader/visual acceptance remains separate. |
| Upstream global theme formulas and CSS metric aliases | Retain the pinned global stylesheet alongside all eight component styles; include it in transitive native review fingerprints | Missing or corrupt globals fail snapshot validation. A global-only change invalidates affected component, example and block evidence. Native component metric implementation is still pending with the presets. |
| Next Image server optimization and browser responsive image loading | Native OS image cache, source HTTPS URLs, native dimensions/cropping and composed SVG grayscale/brightness | Four authored aspect-ratio examples, alt/decorative image names, independent renderer loading, stale-source callbacks, visible errors and retry are tested. Browser srcset, preload and optimization stay web-specific. Unported local assets fail explicitly; source URLs require network availability. |
| HTML anchors, Next Link and browser navigation | Native inline Text links, composed pressable links, OS URL bridge and explicit app route/anchor handlers | Generated Expo roots connect navigate/replace. Screen handles the empty hash; named anchors require a destination handler. Actual Button/breadcrumb examples, cancellation, disabled, hover/press, retry and stale request tests. Browser prefetch/SSR, history/target semantics and device navigation acceptance remain separate. |
| HTML file inputs, web routing and SSR examples | Require explicit native controls, file picking, submit/navigation callbacks and Expo screen composition | Remaining native examples/blocks and provider-independent bindings remain pending in the inventory below; a no-op callback is not completion. |

## Registry coverage

| Registry | Published items | Metadata SHA-256 |
| --- | ---: | --- |
| aria-luma | 215 | `aba69189d7c8edcd92c867842f2d7ae38c4c773ce33a16069c79030d99ff34c7` |
| aria-lyra | 215 | `0c445ec4fd86602cbd0f94b3d788c999d8275af871646388d2d9399f62b25654` |
| aria-maia | 215 | `99af8556c7ebabc43a82359b6b48b1d9aed9c95b01a1f75671957fc99b7f03be` |
| aria-mira | 215 | `ed23d37e9f961bba534b24b2d0e031c96ef5fd0a146051a2dac24354462cc0cb` |
| aria-nova | 215 | `63bd4bb241826dac27f77d0ada6e1b9002ecb6748853669e1cb8c3de6a71cbc2` |
| aria-rhea | 215 | `23c1ab88c10217bc1e52f91cc182a214f395da6efca84554e83463b8644f8feb` |
| aria-sera | 215 | `9490248105e5a2b1a8f6207c0c5a0c652a1a71b863a7f4b548e0e1742d563722` |
| aria-vega | 215 | `edd5ba91ce9082e193d98dcdb339a06724692a667e3027d1a20b50c2b627bfcf` |
| base-luma | 221 | `8a9e6876ef6a4135fb28c0fe8cb449afcff421e44e23b8431a5deb5a7549f884` |
| base-lyra | 221 | `04a51f231f74fd32fcf90af6b296c3e197e199356f16d0e9ce8a6d1b965ed96c` |
| base-maia | 221 | `dcc41f42853a8e9dd77e71455f9eeaaa3a9ee9de6ce11ab53418fa20bcc355b0` |
| base-mira | 221 | `1777ec74e929f887d06ffa8cda6ecb7833db6d38a767247469b8f78a203eff2d` |
| base-nova | 221 | `795beb172183ae853619b3583b09a14ad04e2e2f53840955785a5c7124db8283` |
| base-rhea | 221 | `284dfa59baa06c953f3bd86b0134690cfdf1481806c9d04f8d25c8fe6099c3cb` |
| base-sera | 221 | `fafb4c646544854a137691cdc8b9520a0d265fc0284c654e41215e6b8e9f45ad` |
| base-vega | 221 | `daa1879b48fa4c2d058b57b355efbd4d854148cac65933a4a2de805f17a54b9b` |
| default | 363 | `71bb3ae5c702b175aac0cfb2e4039b2619c58e83fc82c392e98625db3e18b9f0` |
| new-york | 363 | `0f4a9e8ca9860de566fd7dd809561356c90481b2a5aa9e8ce40c988160f0722e` |
| new-york-v4 | 471 | `27939f9c273c8fc5565dfce7cca0e1559886c1ae32c1c836c9e17333597bb66f` |
| radix-luma | 219 | `f6b33850d80c76bf06778f278e347e716ea06db6e47a243f3f0a1a306f215f0b` |
| radix-lyra | 219 | `84e226c2f91c88ed64c5dcf4b3d8420bea8149e4ec1223f2dd8063c9f9fe7d4c` |
| radix-maia | 219 | `f2baa1327b89cd1b17d92b9959064a0ca5802e5956b6d2904aabda5ddb1b0af8` |
| radix-mira | 219 | `5847fdf2cd9f420e6ff7ef155c3f763354b574a27114e01f940de79f111ef97d` |
| radix-nova | 219 | `c41b81c2a0a1de3f46ff3e4a8d57b2e67c9cc0497ced39ac7e4c239ce13d3ff9` |
| radix-rhea | 219 | `d1bdea6d6aa601f5eaa6f3fd91c4096811099cbf38a2c3f70cefd0ef5548a4f8` |
| radix-sera | 219 | `e327c2fef03354dc9d4e911f3577d0f2088601ddba03b98464be8ada4f4b7285` |
| radix-vega | 219 | `fdde2bee0e099cc823e2f2029df515048fc14d3a4f4a437ed6a0795d53486b9e` |

## Public API review

This is export tracking, not proof of complete behavior or visual parity. Native item status remains separate. Browser-only exports have explicit native alternatives in the reviewed policy. All source variant declarations remain in the API ledger.

| Component | Upstream value exports | Native exports present | Browser-specific exports | Unimplemented exports |
| --- | ---: | ---: | --- | --- |
| accordion | 4 | 4 | none | none |
| alert | 4 | 4 | none | none |
| alert-dialog | 12 | 10 | AlertDialogOverlay, AlertDialogPortal | none |
| aspect-ratio | 1 | 1 | none | none |
| attachment | 9 | 9 | none | none |
| avatar | 6 | 6 | none | none |
| badge | 2 | 1 | badgeVariants | none |
| breadcrumb | 7 | 7 | none | none |
| bubble | 4 | 4 | none | none |
| button | 3 | 2 | buttonVariants | none |
| button-group | 4 | 3 | buttonGroupVariants | none |
| calendar | 3 | 3 | none | none |
| card | 7 | 7 | none | none |
| carousel | 6 | 6 | none | none |
| chart | 6 | 5 | ChartStyle | none |
| checkbox | 1 | 1 | none | none |
| code-block | 8 | 8 | none | none |
| collapsible | 3 | 3 | none | none |
| combobox | 17 | 17 | none | none |
| command | 9 | 9 | none | none |
| context-menu | 15 | 14 | ContextMenuPortal | none |
| dialog | 10 | 8 | DialogOverlay, DialogPortal | none |
| direction | 4 | 4 | none | none |
| drawer | 11 | 8 | DrawerOverlay, DrawerPortal, DrawerSwipeHandle | none |
| dropdown-menu | 15 | 15 | none | none |
| empty | 6 | 6 | none | none |
| field | 10 | 10 | none | none |
| form | 8 | 8 | none | none |
| hover-card | 3 | 3 | none | none |
| input | 1 | 1 | none | none |
| input-group | 6 | 6 | none | none |
| input-otp | 4 | 4 | none | none |
| item | 10 | 10 | none | none |
| kbd | 2 | 2 | none | none |
| label | 1 | 1 | none | none |
| marker | 4 | 3 | markerVariants | none |
| menubar | 16 | 15 | MenubarPortal | none |
| message | 6 | 6 | none | none |
| message-scroller | 9 | 9 | none | none |
| native-select | 3 | 3 | none | none |
| navigation-menu | 10 | 8 | NavigationMenuPositioner, navigationMenuTriggerStyle | none |
| pagination | 7 | 7 | none | none |
| popover | 7 | 7 | none | none |
| progress | 5 | 5 | none | none |
| questionnaire | 15 | 15 | none | none |
| radio-group | 2 | 2 | none | none |
| resizable | 3 | 3 | none | none |
| scroll-area | 2 | 2 | none | none |
| select | 14 | 12 | SelectScrollDownButton, SelectScrollUpButton | none |
| separator | 1 | 1 | none | none |
| sheet | 10 | 8 | SheetOverlay, SheetPortal | none |
| sidebar | 24 | 24 | none | none |
| skeleton | 1 | 1 | none | none |
| slider | 1 | 1 | none | none |
| sonner | 1 | 1 | none | none |
| spinner | 1 | 1 | none | none |
| switch | 1 | 1 | none | none |
| table | 8 | 8 | none | none |
| tabs | 5 | 4 | tabsListVariants | none |
| textarea | 1 | 1 | none | none |
| toast | 15 | 15 | none | none |
| toggle | 2 | 1 | toggleVariants | none |
| toggle-group | 2 | 2 | none | none |
| tooltip | 4 | 4 | none | none |
| trace | 8 | 8 | none | none |

## Item checklist

Every row applies to all listed registries. The machine inventory retains each separate style/item, dependency, file, source hash, discovered variant, function/example and browser API. “Pending” means not yet completed; it is never an implicit web-only exemption.

| Item | Type | Registries | Expo status | Evidence / web-specific adaptation |
| --- | --- | --- | --- | --- |
| calendar-01 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-02 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-03 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-04 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-05 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-06 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-07 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-08 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-09 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-10 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-11 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-12 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-13 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-14 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-15 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-16 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-17 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-18 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-19 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-20 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-21 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-22 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-23 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-24 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-25 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-26 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-27 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-28 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-29 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-30 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-31 | block | S1 | pending | Needs item, variant and dependency review. |
| calendar-32 | block | S1 | pending | Needs item, variant and dependency review. |
| chart-area-axes | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-default | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-gradient | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-icons | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-interactive | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-legend | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-linear | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-stacked | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-stacked-expand | block | S2 | pending | Needs item, variant and dependency review. |
| chart-area-step | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-active | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-default | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-horizontal | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-interactive | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-label | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-label-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-mixed | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-multiple | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-negative | block | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-stacked | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-default | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-dots | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-dots-colors | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-dots-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-interactive | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-label | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-label-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-linear | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-multiple | block | S2 | pending | Needs item, variant and dependency review. |
| chart-line-step | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-donut | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-donut-active | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-donut-text | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-interactive | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-label | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-label-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-label-list | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-legend | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-separator-none | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-simple | block | S2 | pending | Needs item, variant and dependency review. |
| chart-pie-stacked | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-default | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-dots | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-grid-circle | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-grid-circle-fill | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-grid-circle-no-lines | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-grid-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-grid-fill | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-grid-none | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-icons | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-label-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-legend | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-lines-only | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-multiple | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radar-radius | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radial-grid | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radial-label | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radial-shape | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radial-simple | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radial-stacked | block | S2 | pending | Needs item, variant and dependency review. |
| chart-radial-text | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-advanced | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-default | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-formatter | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-icons | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-indicator-line | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-indicator-none | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-label-custom | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-label-formatter | block | S2 | pending | Needs item, variant and dependency review. |
| chart-tooltip-label-none | block | S2 | pending | Needs item, variant and dependency review. |
| dashboard-01 | block | S3 | pending | Needs item, variant and dependency review. |
| login-01 | block | S3 | pending | Needs item, variant and dependency review. |
| login-02 | block | S3 | pending | Needs item, variant and dependency review. |
| login-03 | block | S3 | pending | Needs item, variant and dependency review. |
| login-04 | block | S3 | pending | Needs item, variant and dependency review. |
| login-05 | block | S3 | pending | Needs item, variant and dependency review. |
| preview | block | S4 | pending | Needs item, variant and dependency review. |
| preview-02 | block | S4 | pending | Needs item, variant and dependency review. |
| preview-03 | block | S4 | pending | Needs item, variant and dependency review. |
| sidebar-01 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-02 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-03 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-04 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-05 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-06 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-07 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-08 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-09 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-10 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-11 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-12 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-13 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-14 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-15 | block | S3 | pending | Needs item, variant and dependency review. |
| sidebar-16 | block | S3 | pending | Needs item, variant and dependency review. |
| signup-01 | block | S5 | pending | Needs item, variant and dependency review. |
| signup-02 | block | S5 | pending | Needs item, variant and dependency review. |
| signup-03 | block | S5 | pending | Needs item, variant and dependency review. |
| signup-04 | block | S5 | pending | Needs item, variant and dependency review. |
| signup-05 | block | S5 | pending | Needs item, variant and dependency review. |
| example | component | S4 | pending | Needs item, variant and dependency review. |
| accordion-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| accordion-example | example | S4 | pending | Needs item, variant and dependency review. |
| alert-demo | example | S2 | pending | Needs item, variant and dependency review. |
| alert-destructive | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| alert-dialog-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| alert-dialog-example | example | S4 | pending | Needs item, variant and dependency review. |
| alert-example | example | S4 | pending | Needs item, variant and dependency review. |
| aspect-ratio-demo | example | S2 | ported | All published source generations for this item are preserved as authored native modules. Reviewed native Skeleton, Separator or AspectRatio owns geometry, source presentation and native props; browser hosts/CSS translate to native layout values. Device acceptance remains separate. |
| aspect-ratio-example | example | S4 | ported | All published source generations for this item are preserved as authored native modules. Reviewed native Skeleton, Separator or AspectRatio owns geometry, source presentation and native props; browser hosts/CSS translate to native layout values. Device acceptance remains separate. |
| attachment-example | example | S4 | pending | Needs item, variant and dependency review. |
| avatar-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| avatar-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| badge-demo | example | S2 | ported | All eleven Badge source families retain every authored variant and CVA rule, native focus/invalid/link-hover paint, glyph placement, source typography, consumer overrides and controlled native actions. Actual available source examples retain independent provenance; all modern bases render under every newer preset. Typed callbacks return one native host; static text/view and pressable hosts preserve callbacks, refs and source styles. Browser class helper exports, DOM attributes and unrestricted multi-host render output are explicitly adapted to native styles/props/containers. Expanded device, keyboard, screen-reader and visual acceptance remains separate. |
| badge-destructive | example | S2 | ported | All eleven Badge source families retain every authored variant and CVA rule, native focus/invalid/link-hover paint, glyph placement, source typography, consumer overrides and controlled native actions. Actual available source examples retain independent provenance; all modern bases render under every newer preset. Typed callbacks return one native host; static text/view and pressable hosts preserve callbacks, refs and source styles. Browser class helper exports, DOM attributes and unrestricted multi-host render output are explicitly adapted to native styles/props/containers. Expanded device, keyboard, screen-reader and visual acceptance remains separate. |
| badge-example | example | S4 | ported | All eleven Badge source families retain every authored variant and CVA rule, native focus/invalid/link-hover paint, glyph placement, source typography, consumer overrides and controlled native actions. Actual available source examples retain independent provenance; all modern bases render under every newer preset. Typed callbacks return one native host; static text/view and pressable hosts preserve callbacks, refs and source styles. Browser class helper exports, DOM attributes and unrestricted multi-host render output are explicitly adapted to native styles/props/containers. Expanded device, keyboard, screen-reader and visual acceptance remains separate. |
| badge-outline | example | S2 | ported | All eleven Badge source families retain every authored variant and CVA rule, native focus/invalid/link-hover paint, glyph placement, source typography, consumer overrides and controlled native actions. Actual available source examples retain independent provenance; all modern bases render under every newer preset. Typed callbacks return one native host; static text/view and pressable hosts preserve callbacks, refs and source styles. Browser class helper exports, DOM attributes and unrestricted multi-host render output are explicitly adapted to native styles/props/containers. Expanded device, keyboard, screen-reader and visual acceptance remains separate. |
| badge-secondary | example | S2 | ported | All eleven Badge source families retain every authored variant and CVA rule, native focus/invalid/link-hover paint, glyph placement, source typography, consumer overrides and controlled native actions. Actual available source examples retain independent provenance; all modern bases render under every newer preset. Typed callbacks return one native host; static text/view and pressable hosts preserve callbacks, refs and source styles. Browser class helper exports, DOM attributes and unrestricted multi-host render output are explicitly adapted to native styles/props/containers. Expanded device, keyboard, screen-reader and visual acceptance remains separate. |
| breadcrumb-demo | example | S2 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| breadcrumb-dropdown | example | S2 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| breadcrumb-ellipsis | example | S2 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| breadcrumb-example | example | S4 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| breadcrumb-link | example | S2 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| breadcrumb-responsive | example | S2 | pending | Needs item, variant and dependency review. |
| breadcrumb-separator | example | S2 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| bubble-example | example | S4 | pending | Needs item, variant and dependency review. |
| button-as-child | example | S2 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| button-default | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-destructive | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-example | example | S4 | partial | Authored modern and available published legacy sources retain their original destinations, variants and content. Native inline/composed links dispatch through explicit route/anchor handlers or the OS URL bridge; actual source interactions and failures are tested. Complete component preset/API and native device acceptance remain pending. |
| button-ghost | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-demo | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-dropdown | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-input | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-input-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-nested | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-orientation | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-popover | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-select | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-separator | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-size | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-group-split | example | S6 | pending | Needs item, variant and dependency review. |
| button-icon | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-link | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-loading | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-outline | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-rounded | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-secondary | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-size | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| button-with-icon | example | S2 | pending | Needs item, variant and dependency review. |
| calendar-demo | example | S2 | pending | Needs item, variant and dependency review. |
| calendar-example | example | S4 | pending | Needs item, variant and dependency review. |
| calendar-form | example | S1 | pending | Needs item, variant and dependency review. |
| calendar-hijri | example | S6 | pending | Needs item, variant and dependency review. |
| card-demo | example | S2 | pending | Needs item, variant and dependency review. |
| card-example | example | S4 | pending | Needs item, variant and dependency review. |
| card-with-form | example | S2 | pending | Needs item, variant and dependency review. |
| carousel-api | example | S2 | partial | Authored source is ported with native percentage layout, bounds, carousel snapping and selection API tests. Complete component preset/API and device acceptance remain pending. |
| carousel-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| carousel-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| carousel-orientation | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| carousel-plugin | example | S2 | pending | Needs item, variant and dependency review. |
| carousel-size | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| carousel-spacing | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| chart-bar-demo | example | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-demo-axis | example | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-demo-grid | example | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-demo-legend | example | S2 | pending | Needs item, variant and dependency review. |
| chart-bar-demo-tooltip | example | S2 | pending | Needs item, variant and dependency review. |
| chart-example | example | S4 | pending | Needs item, variant and dependency review. |
| chart-tooltip-demo | example | S2 | pending | Needs item, variant and dependency review. |
| checkbox-demo | example | S2 | pending | Needs item, variant and dependency review. |
| checkbox-disabled | example | S2 | pending | Needs item, variant and dependency review. |
| checkbox-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| checkbox-form-multiple | example | S1 | pending | Needs item, variant and dependency review. |
| checkbox-form-single | example | S1 | pending | Needs item, variant and dependency review. |
| checkbox-with-text | example | S2 | pending | Needs item, variant and dependency review. |
| code-block-example | example | S4 | pending | Needs item, variant and dependency review. |
| collapsible-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| collapsible-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| combobox-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| combobox-dropdown-menu | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| combobox-example | example | S4 | pending | Needs item, variant and dependency review. |
| combobox-form | example | S1 | pending | Needs item, variant and dependency review. |
| combobox-popover | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| combobox-responsive | example | S2 | pending | Needs item, variant and dependency review. |
| command-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| command-dialog | example | S2 | pending | Needs item, variant and dependency review. |
| command-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| component-example | example | S4 | pending | Needs item, variant and dependency review. |
| context-menu-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| context-menu-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| data-table-demo | example | S2 | pending | Needs item, variant and dependency review. |
| date-picker-demo | example | S2 | pending | Needs item, variant and dependency review. |
| date-picker-form | example | S1 | pending | Needs item, variant and dependency review. |
| date-picker-with-presets | example | S2 | pending | Needs item, variant and dependency review. |
| date-picker-with-range | example | S2 | pending | Needs item, variant and dependency review. |
| demo | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| dialog-close-button | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| dialog-demo | example | S2 | pending | Needs item, variant and dependency review. |
| dialog-example | example | S4 | pending | Needs item, variant and dependency review. |
| drawer-demo | example | S2 | pending | Needs item, variant and dependency review. |
| drawer-dialog | example | S2 | pending | Needs item, variant and dependency review. |
| drawer-example | example | S4 | pending | Needs item, variant and dependency review. |
| dropdown-menu-checkboxes | example | S2 | pending | Needs item, variant and dependency review. |
| dropdown-menu-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| dropdown-menu-dialog | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| dropdown-menu-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| dropdown-menu-radio-group | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| empty-avatar | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| empty-avatar-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| empty-background | example | S6 | pending | Needs item, variant and dependency review. |
| empty-demo | example | S6 | pending | Needs item, variant and dependency review. |
| empty-example | example | S4 | pending | Needs item, variant and dependency review. |
| empty-icon | example | S6 | pending | Needs item, variant and dependency review. |
| empty-input-group | example | S6 | pending | Needs item, variant and dependency review. |
| empty-outline | example | S6 | pending | Needs item, variant and dependency review. |
| field-checkbox | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-choice-card | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-demo | example | S6 | pending | Needs item, variant and dependency review. |
| field-example | example | S4 | pending | Needs item, variant and dependency review. |
| field-fieldset | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-group | example | S6 | pending | Needs item, variant and dependency review. |
| field-input | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-radio | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-responsive | example | S6 | pending | Needs item, variant and dependency review. |
| field-select | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-slider | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-switch | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| field-textarea | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| form-formisch-array | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-checkbox | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-complex | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-demo | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-input | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-radiogroup | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-select | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-switch | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-formisch-textarea | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-next-complex | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-next-demo | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-array | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-checkbox | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-complex | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-demo | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-input | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-password | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-radiogroup | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-select | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-switch | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-rhf-textarea | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-array | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-checkbox | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-complex | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-demo | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-input | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-radiogroup | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-select | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-switch | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| form-tanstack-textarea | example | S6 | partial | Authored source, validation and submission logic are translated and behavior-tested with native controls. Full component dependency/style parity and native device acceptance remain pending. |
| hover-card-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| hover-card-example | example | S4 | pending | Needs item, variant and dependency review. |
| input-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-disabled | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-example | example | S4 | pending | Needs item, variant and dependency review. |
| input-file | example | S2 | pending | Needs item, variant and dependency review. |
| input-form | example | S1 | pending | Needs item, variant and dependency review. |
| input-group-button | example | S6 | pending | Needs item, variant and dependency review. |
| input-group-button-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-group-custom | example | S6 | pending | Needs item, variant and dependency review. |
| input-group-demo | example | S6 | pending | Needs item, variant and dependency review. |
| input-group-dropdown | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-group-example | example | S4 | pending | Needs item, variant and dependency review. |
| input-group-icon | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-group-label | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-group-spinner | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-group-text | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-group-textarea | example | S6 | pending | Needs item, variant and dependency review. |
| input-group-tooltip | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-otp-controlled | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-otp-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-otp-example | example | S4 | pending | Needs item, variant and dependency review. |
| input-otp-form | example | S1 | pending | Needs item, variant and dependency review. |
| input-otp-pattern | example | S2 | pending | Needs item, variant and dependency review. |
| input-otp-separator | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-with-button | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-with-label | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| input-with-text | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| item-avatar | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| item-demo | example | S6 | pending | Needs item, variant and dependency review. |
| item-dropdown | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| item-example | example | S4 | pending | Needs item, variant and dependency review. |
| item-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| item-header | example | S6 | pending | Needs item, variant and dependency review. |
| item-icon | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| item-image | example | S6 | pending | Needs item, variant and dependency review. |
| item-link | example | S6 | pending | Needs item, variant and dependency review. |
| item-size | example | S6 | pending | Needs item, variant and dependency review. |
| item-variant | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| kbd-button | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| kbd-demo | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| kbd-example | example | S4 | pending | Needs item, variant and dependency review. |
| kbd-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| kbd-input-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| kbd-tooltip | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| label-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| label-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| marker-example | example | S4 | pending | Needs item, variant and dependency review. |
| menubar-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| menubar-example | example | S7 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| message-example | example | S4 | pending | Needs item, variant and dependency review. |
| message-scroller-example | example | S4 | pending | Needs item, variant and dependency review. |
| mode-toggle | example | S2 | pending | Needs item, variant and dependency review. |
| native-select-demo | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| native-select-disabled | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| native-select-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| native-select-groups | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| native-select-invalid | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| navigation-menu-demo | example | S2 | pending | Needs item, variant and dependency review. |
| navigation-menu-example | example | S7 | pending | Needs item, variant and dependency review. |
| pagination-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| pagination-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| popover-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| popover-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| progress-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| progress-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| questionnaire-example | example | S4 | pending | Needs item, variant and dependency review. |
| radio-group-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| radio-group-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| radio-group-form | example | S1 | pending | Needs item, variant and dependency review. |
| resizable-demo | example | S2 | partial | Authored source is ported with native percentage layout, bounds, carousel snapping and selection API tests. Complete component preset/API and device acceptance remain pending. |
| resizable-demo-with-handle | example | S2 | partial | Authored source is ported with native percentage layout, bounds, carousel snapping and selection API tests. Complete component preset/API and device acceptance remain pending. |
| resizable-example | example | S4 | partial | Authored source is ported with native percentage layout, bounds, carousel snapping and selection API tests. Complete component preset/API and device acceptance remain pending. |
| resizable-handle | example | S2 | partial | Authored source is ported with native percentage layout, bounds, carousel snapping and selection API tests. Complete component preset/API and device acceptance remain pending. |
| resizable-vertical | example | S2 | partial | Authored source is ported with native percentage layout, bounds, carousel snapping and selection API tests. Complete component preset/API and device acceptance remain pending. |
| scroll-area-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| scroll-area-example | example | S4 | pending | Needs item, variant and dependency review. |
| scroll-area-horizontal-demo | example | S2 | pending | Needs item, variant and dependency review. |
| select-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| select-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| select-form | example | S1 | pending | Needs item, variant and dependency review. |
| select-scrollable | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| separator-demo | example | S2 | ported | All published source generations for this item are preserved as authored native modules. Reviewed native Skeleton, Separator or AspectRatio owns geometry, source presentation and native props; browser hosts/CSS translate to native layout values. Device acceptance remains separate. |
| separator-example | example | S4 | ported | All Base/Radix/Aria authored sections render under every newer style. Native description term/definition hosts retain scoped combined labels, values and independently accessible embedded controls. Source typography modifiers and flex row defaults are preserved; DOM association attributes do not replace definition values. Device screen-reader/visual acceptance remains separate. |
| sheet-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| sheet-example | example | S4 | pending | Needs item, variant and dependency review. |
| sheet-side | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| sidebar-example | example | S4 | pending | Needs item, variant and dependency review. |
| sidebar-floating-example | example | S4 | pending | Needs item, variant and dependency review. |
| sidebar-icon-example | example | S4 | pending | Needs item, variant and dependency review. |
| sidebar-inset-example | example | S4 | pending | Needs item, variant and dependency review. |
| skeleton-card | example | S2 | ported | All published source generations for this item are preserved as authored native modules. Reviewed native Skeleton, Separator or AspectRatio owns geometry, source presentation and native props; browser hosts/CSS translate to native layout values. Device acceptance remains separate. |
| skeleton-demo | example | S2 | ported | All published source generations for this item are preserved as authored native modules. Reviewed native Skeleton, Separator or AspectRatio owns geometry, source presentation and native props; browser hosts/CSS translate to native layout values. Device acceptance remains separate. |
| skeleton-example | example | S4 | partial | All authored sections render under each newer preset and Skeleton source styles are complete. Card/CardHeader/CardContent source styles remain partial; the composed example cannot inherit completion until those dependencies are reviewed. Device acceptance remains separate. |
| slider-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| slider-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| sonner-demo | example | S2 | pending | Needs item, variant and dependency review. |
| sonner-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| sonner-types | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-badge | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-basic | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-button | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-color | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-custom | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-demo | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-empty | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-input-group | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-item | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| spinner-size | example | S6 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| switch-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| switch-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| switch-form | example | S1 | pending | Needs item, variant and dependency review. |
| table-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| table-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| tabs-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| tabs-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| textarea-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| textarea-disabled | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| textarea-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| textarea-form | example | S1 | pending | Needs item, variant and dependency review. |
| textarea-with-button | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| textarea-with-label | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| textarea-with-text | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toast-demo | example | S1 | pending | Needs item, variant and dependency review. |
| toast-destructive | example | S1 | pending | Needs item, variant and dependency review. |
| toast-example | example | S8 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toast-simple | example | S1 | pending | Needs item, variant and dependency review. |
| toast-with-action | example | S1 | pending | Needs item, variant and dependency review. |
| toast-with-title | example | S1 | pending | Needs item, variant and dependency review. |
| toggle-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-disabled | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-example | example | S4 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-disabled | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-example | example | S4 | pending | Needs item, variant and dependency review. |
| toggle-group-lg | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-outline | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-single | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-sm | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-group-spacing | example | S6 | pending | Needs item, variant and dependency review. |
| toggle-lg | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-outline | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-sm | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| toggle-with-text | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| tooltip-demo | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| tooltip-example | example | S4 | pending | Needs item, variant and dependency review. |
| trace-example | example | S4 | pending | Needs item, variant and dependency review. |
| typography-blockquote | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-demo | example | S2 | pending | Needs item, variant and dependency review. |
| typography-h1 | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-h2 | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-h3 | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-h4 | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-inline-code | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-large | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-lead | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-list | example | S2 | pending | Needs item, variant and dependency review. |
| typography-muted | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-p | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-small | example | S2 | partial | Authored component example source is translated with retained data and callbacks, checked on iOS and Android. Native typography, palette generations, scoped radius, selection, overlays and image lifecycle have behavior coverage. Complete component presets/API and device acceptance remain pending. |
| typography-table | example | S2 | pending | Needs item, variant and dependency review. |
| font-dm-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-eb-garamond | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-figtree | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-geist | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-geist-mono | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-dm-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-eb-garamond | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-figtree | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-geist | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-geist-mono | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-ibm-plex-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-instrument-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-instrument-serif | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-inter | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-jetbrains-mono | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-lora | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-manrope | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-merriweather | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-montserrat | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-noto-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-noto-serif | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-nunito-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-outfit | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-oxanium | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-playfair-display | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-public-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-raleway | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-roboto | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-roboto-slab | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-source-sans-3 | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-heading-space-grotesk | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-ibm-plex-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-instrument-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-instrument-serif | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-inter | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-jetbrains-mono | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-lora | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-manrope | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-merriweather | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-montserrat | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-noto-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-noto-serif | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-nunito-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-outfit | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-oxanium | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-playfair-display | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-public-sans | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-raleway | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-roboto | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-roboto-slab | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-source-sans-3 | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| font-space-grotesk | font | S5 | ported | Native font provider: pinned TTF cuts, retained licenses, CSS weight matching, role mapping, loading/error/retry and all cuts tested. Variable CSS axes map to explicit native cuts; device acceptance is separate. |
| use-highlighted-code | hook | S4 | ported | Full upstream streaming grammar/state API rendered as native Text: thirteen grammars, aliases, ANSI, continued grammar state, replacement and theme tokens tested. Device acceptance is separate. |
| use-mobile | hook | S3 | ported | Native window dimensions replace matchMedia; tested at the breakpoint, on resize and on subscription cleanup. Device acceptance remains separate. |
| use-toast | hook | S1 | ported | Provider-free legacy store/hook and reducer retain single-toast, update, dismissal and callback behavior. Native dismissal removes records immediately because there is no browser CSS exit-transition queue. |
| sidebar-controlled | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-demo | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-footer | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-group | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-group-action | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-group-collapsible | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-header | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-menu | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-menu-action | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-menu-badge | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-menu-collapsible | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-menu-sub | internal | S2 | pending | Needs item, variant and dependency review. |
| sidebar-rsc | internal | S2 | pending | Needs item, variant and dependency review. |
| v0-login-01 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-01 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-02 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-03 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-04 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-05 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-06 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-07 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-08 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-09 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-10 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-11 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-12 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-13 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-14 | internal | S1 | pending | Needs item, variant and dependency review. |
| v0-sidebar-15 | internal | S1 | pending | Needs item, variant and dependency review. |
| utils | lib | S3 | web-specific | cn composes CSS class strings with clsx/Tailwind merge. Native sources use typed variant props and nativeStyles/StyleSheet composition, which is tested with arrays, conditions, registered styles and precedence; no misleading native CSS-string alias is installed. |
| index | style | S3 | pending | Needs item, variant and dependency review. |
| style | style | S3 | pending | Needs item, variant and dependency review. |
| theme-daylight | theme | S1 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-emerald | theme | S1 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-gray | theme | S6 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-midnight | theme | S1 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-neutral | theme | S6 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-slate | theme | S6 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-stone | theme | S6 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| theme-zinc | theme | S6 | ported | Every light/dark color and radius retained in shared styling; HSL/OKLCH converted to native sRGB with alpha, and all tokens tested. Device display acceptance is separate. |
| accordion | ui | S3 | pending | Needs item, variant and dependency review. |
| alert | ui | S3 | pending | Needs item, variant and dependency review. |
| alert-dialog | ui | S3 | pending | Needs item, variant and dependency review. |
| aspect-ratio | ui | S3 | ported | Native aspectRatio replaces CSS custom properties and padding wrappers. All six component definitions retain ratio, geometry and explicit overrides; native one-host asChild/render composition preserves refs, child content and layout callbacks. DOM props are replaced by native View props. Device acceptance is tracked separately. |
| attachment | ui | S5 | pending | Needs item, variant and dependency review. |
| avatar | ui | S3 | pending | Needs item, variant and dependency review. |
| badge | ui | S3 | ported | All eleven Badge source families retain every authored variant and CVA rule, native focus/invalid/link-hover paint, glyph placement, source typography, consumer overrides and controlled native actions. Actual available source examples retain independent provenance; all modern bases render under every newer preset. Typed callbacks return one native host; static text/view and pressable hosts preserve callbacks, refs and source styles. Browser class helper exports, DOM attributes and unrestricted multi-host render output are explicitly adapted to native styles/props/containers. Expanded device, keyboard, screen-reader and visual acceptance remains separate. |
| breadcrumb | ui | S3 | pending | Needs item, variant and dependency review. |
| bubble | ui | S5 | pending | Needs item, variant and dependency review. |
| button | ui | S3 | partial | Source-driven native Button slots retain all eight component presets, six variants and eight sizes, with hover/focus, invalid/expanded/disabled states, icon sizing/placement, group radii and native touch bounds. Default, New York and New York v4 retain their pinned CVA geometry and paint; all eleven style families are tested. Native link composition is tested. Browser paint/transition differences and expanded native device acceptance remain separately accounted for; complete component parity is not asserted. |
| button-group | ui | S3 | pending | Needs item, variant and dependency review. |
| calendar | ui | S3 | pending | Needs item, variant and dependency review. |
| card | ui | S3 | pending | Needs item, variant and dependency review. |
| carousel | ui | S3 | pending | Needs item, variant and dependency review. |
| chart | ui | S3 | pending | Needs item, variant and dependency review. |
| checkbox | ui | S3 | pending | Needs item, variant and dependency review. |
| code-block | ui | S4 | pending | Needs item, variant and dependency review. |
| collapsible | ui | S3 | pending | Needs item, variant and dependency review. |
| combobox | ui | S5 | pending | Needs item, variant and dependency review. |
| command | ui | S3 | pending | Needs item, variant and dependency review. |
| context-menu | ui | S3 | pending | Needs item, variant and dependency review. |
| dialog | ui | S3 | pending | Needs item, variant and dependency review. |
| direction | ui | S5 | pending | Needs item, variant and dependency review. |
| drawer | ui | S3 | pending | Needs item, variant and dependency review. |
| dropdown-menu | ui | S3 | pending | Needs item, variant and dependency review. |
| empty | ui | S3 | pending | Needs item, variant and dependency review. |
| field | ui | S3 | pending | Needs item, variant and dependency review. |
| form | ui | S3 | partial | React Hook Form provider/controller and native control binding retain refs, focus, labels, descriptions, validation messages, resolver integration, field arrays and submission. HTML slot/aria attributes become native control props and hints; device accessibility acceptance is separate. Component preset styles and inherited global metric parity remain pending. |
| hover-card | ui | S3 | pending | Needs item, variant and dependency review. |
| input | ui | S3 | pending | Needs item, variant and dependency review. |
| input-group | ui | S3 | pending | Needs item, variant and dependency review. |
| input-otp | ui | S3 | pending | Needs item, variant and dependency review. |
| item | ui | S3 | pending | Needs item, variant and dependency review. |
| kbd | ui | S3 | pending | Needs item, variant and dependency review. |
| label | ui | S3 | pending | Needs item, variant and dependency review. |
| marker | ui | S5 | pending | Needs item, variant and dependency review. |
| menubar | ui | S9 | pending | Needs item, variant and dependency review. |
| message | ui | S5 | pending | Needs item, variant and dependency review. |
| message-scroller | ui | S5 | pending | Needs item, variant and dependency review. |
| native-select | ui | S5 | pending | Needs item, variant and dependency review. |
| navigation-menu | ui | S9 | pending | Needs item, variant and dependency review. |
| pagination | ui | S3 | pending | Needs item, variant and dependency review. |
| popover | ui | S3 | pending | Needs item, variant and dependency review. |
| progress | ui | S3 | pending | Needs item, variant and dependency review. |
| questionnaire | ui | S4 | pending | Needs item, variant and dependency review. |
| radio-group | ui | S3 | pending | Needs item, variant and dependency review. |
| resizable | ui | S3 | pending | Needs item, variant and dependency review. |
| scroll-area | ui | S3 | pending | Needs item, variant and dependency review. |
| select | ui | S3 | pending | Needs item, variant and dependency review. |
| separator | ui | S3 | ported | Every source generation retains horizontal/vertical dimensions, shrink behavior and decorative defaults. Native labeled separator roles and hidden decorative elements replace DOM/hr semantics; native child/render composition preserves refs/styles/callbacks. Device acceptance is tracked separately. |
| sheet | ui | S3 | pending | Needs item, variant and dependency review. |
| sidebar | ui | S3 | pending | Needs item, variant and dependency review. |
| skeleton | ui | S3 | ported | All eight newer preset styles and three frozen source generations retain their colors/radii and authored overrides. Native-driver pulse preserves source duration/easing/opacity, responds to live reduced motion and cleans up. Native View props replace DOM attributes; device acceptance is tracked separately. |
| slider | ui | S3 | pending | Needs item, variant and dependency review. |
| sonner | ui | S3 | pending | Needs item, variant and dependency review. |
| spinner | ui | S3 | pending | Needs item, variant and dependency review. |
| switch | ui | S3 | pending | Needs item, variant and dependency review. |
| table | ui | S3 | pending | Needs item, variant and dependency review. |
| tabs | ui | S3 | pending | Needs item, variant and dependency review. |
| textarea | ui | S3 | pending | Needs item, variant and dependency review. |
| toast | ui | S10 | pending | Needs item, variant and dependency review. |
| toggle | ui | S3 | pending | Needs item, variant and dependency review. |
| toggle-group | ui | S3 | pending | Needs item, variant and dependency review. |
| tooltip | ui | S3 | pending | Needs item, variant and dependency review. |
| trace | ui | S4 | pending | Needs item, variant and dependency review. |

## Registry sets

Every set expands to the exact registry members below; item rows retain all styles through their set.

| Set | Registries |
| --- | --- |
| S1 | default, new-york |
| S2 | default, new-york, new-york-v4 |
| S3 | aria-luma, aria-lyra, aria-maia, aria-mira, aria-nova, aria-rhea, aria-sera, aria-vega, base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega, default, new-york, new-york-v4, radix-luma, radix-lyra, radix-maia, radix-mira, radix-nova, radix-rhea, radix-sera, radix-vega |
| S4 | aria-luma, aria-lyra, aria-maia, aria-mira, aria-nova, aria-rhea, aria-sera, aria-vega, base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega, radix-luma, radix-lyra, radix-maia, radix-mira, radix-nova, radix-rhea, radix-sera, radix-vega |
| S5 | aria-luma, aria-lyra, aria-maia, aria-mira, aria-nova, aria-rhea, aria-sera, aria-vega, base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega, new-york-v4, radix-luma, radix-lyra, radix-maia, radix-mira, radix-nova, radix-rhea, radix-sera, radix-vega |
| S6 | new-york-v4 |
| S7 | base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega, radix-luma, radix-lyra, radix-maia, radix-mira, radix-nova, radix-rhea, radix-sera, radix-vega |
| S8 | base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega |
| S9 | base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega, default, new-york, new-york-v4, radix-luma, radix-lyra, radix-maia, radix-mira, radix-nova, radix-rhea, radix-sera, radix-vega |
| S10 | base-luma, base-lyra, base-maia, base-mira, base-nova, base-rhea, base-sera, base-vega, default, new-york |

## Unresolved upstream registry references

These upstream metadata gaps remain visible; they are not silently dropped or treated as Expo implementations.

| Registry | Item | Missing registry dependency |
| --- | --- | --- |
| default | combobox-popover | combobox |
| default | combobox-responsive | combobox |
| default | data-table-demo | data-table |
| new-york | combobox-popover | combobox |
| new-york | combobox-responsive | combobox |
| new-york | data-table-demo | data-table |
| new-york-v4 | data-table-demo | data-table |

## Web-specific checklist

| Browser feature | Native policy | Acceptance |
| --- | --- | --- |
| HTML tags, DOM refs and browser events | Replace with typed React Native host components, native refs and event payloads. A name-only or HTML-backed adapter is not an Expo port. | pending item-by-item verification |
| CSS styles, selectors, hover and focus-visible | Preserve each style's design intent with shared-token native StyleSheets, pressed/focus state and responsive layout; document selectors with no native meaning. | pending per-style and variant verification |
| Next routes, Server Components, server actions and HTML form actions | Use explicit application navigation and native submit callbacks; keep authentication and persistence in the application's existing API. Do not ship working-looking provider stubs. | pending block and example verification |
| Recharts DOM/SVG components | Use native SVG with each example's series, scale, axes, stacking, labels and interactions accounted for. Six generic chart renderers do not establish chart-registry parity. | pending chart-by-chart verification |
| window.matchMedia, innerWidth and DOM resize observers | Use subscribed native window dimensions and native layout events, including rotation, split-screen and cleanup. | Dimensions subscription, breakpoint/resize and cleanup tested; device rotation/split-screen acceptance is separate. |
| Browser clipboard, storage, file input and drag/drop | Use Expo/native platform bridges, explicit permission/error handling and touch/accessible alternatives. Do not execute browser APIs on device. | pending item-by-item verification |
| next/font, CSS font variables and web font providers | Track every font and weight; native font loading requires actual Expo-compatible font assets and family mapping. CSS font metadata alone is not a native font port. | All 52 registry items adapted to 347 pinned TTF cuts; CSS variables map to native typography roles, variable axes to static native cuts and unavailable italic cuts to OS synthesis. Device font rendering remains separately pending. |
| Shiki HTML spans and CSS theme variables | Keep grammar/state behavior using the JavaScript regex engine, but render themed native Text rather than HTML. | Native Text adaptation tested for all upstream hook grammars, state and streaming behavior; no HTML/CSS runtime is installed. |
| HTML description lists | Use scoped native term/definition roles and combined term/value accessibility labels. Preserve native IDs and refs; embedded links, inputs and buttons remain independently exposed. A labelled-by reference to only the term must not erase the definition value. | All authored Separator examples and nested/dynamic description-list contracts tested. Device screen-reader and visual matrix acceptance remain separate. |
