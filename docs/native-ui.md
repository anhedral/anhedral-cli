# Native shadcn components for Expo

Anhedral CLI maintains React Native semantic adaptations for the **66 entries** in the [shadcn Components catalog](https://ui.shadcn.com/docs/components), reviewed 2026-10-24. This is the native component baseline; upstream's separate AI Elements, form-library integrations and ecosystem registry packages have independent scopes. New upstream components require a new review rather than inheriting a complete status automatically.

## Source and ownership

Canonical implementations live in `assets/ui/native/`; `registry.json` owns the public component inventory and export names. Shared helpers have an underscore prefix. `src/scaffold/native-ui.ts` copies all required source into each generated application's `packages/native-ui`, with the inventory in `NATIVE_COMPONENTS.json`. The package exposes `@workspace/native-ui`, `@workspace/native-ui/components/<name>` and `@workspace/native-ui/theme`. Styling comes from `@workspace/styling`; no independent native palette or DOM runtime is installed.

Generated source belongs to the application. CLI updates never overwrite an existing product's edited components. Compare the pinned inventory and apply reviewed source changes explicitly. Maintain attribution in `assets/ui/UPSTREAM.json` and `LICENSE.shadcn`.

## Native API and interactions

These are native APIs, not DOM prop or Recharts compatibility shims. Use React Native `style`, `onPress`, accessibility props and typed controlled-value callbacks. Compound Dialog/Select/Tabs/Accordion/menu parts share root context. The original Dialog `triggerLabel`/`title` interface remains supported. Do not import this package into Next.js.

Menus, popovers, sheets and preview cards use native Modal surfaces; hover/context interactions have touch-and-hold and screen-reader activation. Overlays handle native back/escape, restore trigger focus and keep dismissed content out of accessibility traversal. Drawer has a drag handle and accessible dismissal action. Slider and Resizable expose adjustable actions as well as drag handling. Native ScrollView owns platform scroll indicators, so ScrollBar intentionally renders no separate thumb.

Calendar supports local-date single, multiple and range selection, locale labels and disabled bounds/predicates. DatePicker adds a modal trigger. DataTable owns native sorting/filtering/pagination and stable row IDs, with native column renderers. Chart accepts `data: { label: string; value: number }[]` and bar/line/area/pie/radar/radial renderers using Expo-compatible SVG; it does not execute browser chart components. CodeBlock preserves source bytes, renders offline lexical syntax/diff tokens and uses Expo Clipboard. It does not execute code or claim language-server tokenization. MessageScroller follows new content only while the reader is at the bottom. Questionnaire supports single/multiple/text steps, back/skip and validated submission.

## Checks and maintenance

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
