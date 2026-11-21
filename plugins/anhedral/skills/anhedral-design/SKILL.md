---
name: anhedral-design
description: "Design Anhedral Stack web applications with standard shadcn defaults or the consumer's chosen UI library."
---

# Web design

This compatibility-named skill provides web design guidance, not a separate Anhedral UI library or installer. It registers no remote tools, account connection or bundled CLI runtime.

Read consumer instructions and source, then ../../references/ui.md. Init includes standard shadcn configuration and editable Button, Input and Label components. Consumers may use any UI library; preserve their existing choice and authored source. There is no Anhedral UI catalog or `anhedral ui` command.

For the default shadcn setup, run the upstream CLI from `apps/web`, for example `pnpm dlx shadcn@4.22.1 add card` or `pnpm dlx shadcn@4.22.1 diff card`. Inspect upstream help and source changes before applying. Do not request automatic overwrite. Review dependencies and diffs and reconcile customized files explicitly.

Preserve semantic tokens, existing components and required upstream notices, including the starter's `LICENSE.shadcn` and `UPSTREAM.json`. Keep visible keyboard focus and browser interactions intact. Read version-matched framework guidance and validate actual browser behavior; source/type checks alone are not acceptance. Existing legacy UI metadata does not require a destructive migration.

UI does not require backend services. Add backend, storage or Stripe only for a demonstrated application need through current Anhedral Stack additions. Keep business/auth/resource work in Hono, communicate through scoped API bindings and never cross-import application source. See ../../references/capabilities.md. Expo and React Native Reusables are post-MVP direction, not current CLI options.
