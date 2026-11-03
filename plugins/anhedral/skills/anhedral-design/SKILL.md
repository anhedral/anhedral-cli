---
name: anhedral-design
description: "Extend the Anhedral Stack's source-owned web UI through official shadcn components and semantic tokens."
---

# Anhedral Design

Read consumer instructions and source. Anhedral UI is the Anhedral Stack's source-owned web UI layer over official shadcn. Do not introduce another runtime UI library or advertise native/alternate-framework paths.

Read ../../references/ui.md. Use `anhedral ui list`, `init`, `add`, `diff` and `doctor`; select the current web application with `--cwd` or optional `--web`. Preview with `--dry-run --json`. Current public UI commands operate on Anhedral Stack web projects only. Initialization already includes configuration and three reviewed starter components.

Preserve consumer edits, semantic tokens and MIT attribution. The CLI never requests overwrite. Inspect diffs before updates, use existing components before custom primitives, and keep visible keyboard focus and browser interactions intact. Read version-matched framework guidance and validate actual browser behavior; source/type checks alone are not acceptance.

UI does not require backend services. Add the backend, storage or Stripe only for a demonstrated application need through the current Anhedral Stack additions. Keep business/auth/resource work in Hono, communicate through scoped API bindings and never cross-import application source. See ../../references/capabilities.md.
