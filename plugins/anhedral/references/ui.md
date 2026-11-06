# Web UI

`anhedral init` defaults to standard shadcn components. It creates web `components.json`, the `cn` utility, semantic theme tokens, and editable Button, Input and Label source. These defaults are optional: consumers may extend, replace or remove them and use any UI library. There is no separate Anhedral UI library, catalog, ownership marker or `anhedral ui` command.

Use upstream shadcn directly from the web application:

```sh
cd apps/web
pnpm dlx shadcn@4.22.1 add card
pnpm dlx shadcn@4.22.1 diff card
```

Inspect the consuming project's instructions and existing source first. Review upstream changes and reconcile customized files; do not request automatic overwrite. Upstream installation can change dependencies and source, so inspect Git and run consumer checks afterward. Validate browser behavior, keyboard focus and interactions as well as types.

The shipped starter components remain MIT-licensed shadcn source. Init preserves their notice in `apps/web/LICENSE.shadcn` and provenance in `apps/web/UPSTREAM.json`; customization and rebranding do not remove those notices. This is upstream attribution, not an Anhedral UI license. Preserve applicable licenses for any replacement dependencies too. Existing projects may retain `.anhedral-ui.json` or `ANHEDRAL_UI_LICENSES/`; do not delete authored source or required notices during migration. New initialization does not create those legacy paths.

UI selection does not activate backend services or hosting. See [stack additions](capabilities.md). The MVP is web-only. If Expo returns after MVP, React Native Reusables is the intended native default; it is not a current CLI capability.
