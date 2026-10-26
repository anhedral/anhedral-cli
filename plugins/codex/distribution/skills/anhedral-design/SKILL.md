---
name: anhedral-design
description: "Use Anhedral UI as a thin source-owned layer over official shadcn web and React Native Reusables native."
---

# Anhedral Design

Read consumer instructions and source. Anhedral UI is a catalog and CLI over official shadcn on web and React Native Reusables on native, plus a small reviewed Anhedral native extension registry. Do not create another runtime component library, browser emulation layer or exhaustive shadcn native fork.

Read ../../references/ui.md. Use `anhedral ui list`, `init`, `add`, `diff` and `doctor`. Select --web/--native/--all when multiple apps exist. Preview with --dry-run --json. Native prefers declared Anhedral extensions, then RNR, then reports unavailable; the initial extension registry is empty. Availability does not establish API parity or device acceptance.

New web apps already include Anhedral UI with three reviewed starter components. For existing Expo projects, complete upstream RNR NativeWind 4 setup first; native UI init does not create a mobile app or rewrite native configuration. UI has no Hono/database/auth prerequisite. Do not add a second styling engine.

Components are consumer-owned source. Preserve edits and MIT attribution; inspect diffs before updates. CLI commands never request overwrite. Share semantic tokens and contracts, while keeping DOM/native implementations separate. Use existing components and conventions before custom primitives. Read installed version-matched framework guides and validate the user flow.

Use Expo APIs directly for device features and keep permission, upload, background and notification policy in application services. Install only required packages with Expo's compatibility-aware installer. Test native keyboard, accessibility, overlays and lifecycle in Android/iOS development builds; browser rendering and typechecking are not native acceptance. Do not revive the legacy port's whole-catalog gate.
