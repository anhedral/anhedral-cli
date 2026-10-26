# Stack standard

New applications begin with Next.js App Router, OpenNext for Cloudflare Workers and Anhedral UI. Init writes `apps/web`, shared tokens and workspace tooling. It does not generate Expo, Hono, database/contracts packages, authentication, private R2 or managed services.

## Progressive composition

Add Hono when a separate API is useful, then Drizzle/D1 and Better Auth when persistence and identity are useful. Add private R2, payments, realtime and AI for actual product requirements. Additional clients may use Expo, WXT with the Side Panel API, or GPUI for a native desktop application. Anhedral UI for Expo and RevenueCat remain conditional choices. The precise “if needed” conditions remain open; these are optional additions, without commercial tier labels.

These choices are architectural guidance, not implemented CLI addition commands. The public CLI implements `init` and the `ui` command family. Retired `auth`, top-level `add`, `ship`, `inspect` and provider-management commands remain unavailable. The programmatic generator retains explicit legacy recipes for compatibility tests; they are not the new-project default or the new UI architecture.

When a backend is introduced, Hono owns privileged data and application authorization. Next server actions adapt forms and call that API. Share framework-independent contracts and tokens without cross-importing application source. Keep R2 private; implement identity, ownership and limits before exposing files. Database migrations are deliberate operations and never part of startup or build.

## Anhedral UI

Anhedral UI is thin orchestration over official shadcn web and React Native Reusables native source. Its maintained surface is a versioned component catalog, CLI routing, setup metadata and a small reviewed native extension registry. Native resolution prefers an Anhedral extension, then RNR, then reports unavailable. The extension registry is initially empty. Do not revive the exhaustive native shadcn fork or require every component to reach parity before shipping a useful feature.

New web applications include a bounded Button/Input/Label starter and MIT attribution. Additional components are installed by the pinned shadcn CLI. Native currently supports the RNR NativeWind 4 registry only, in an already configured Expo application. Keep matching React/React Native/Expo dependencies and test the consuming app. The UI layer has no dependency on Hono, D1 or Better Auth.

Components belong to the consumer's source tree. Retain upstream licenses, use semantic theme tokens, review diffs and preserve local edits. No runtime UI package or automatic overwrite/update is introduced. Catalog availability means an upstream source exists; it does not assert API parity, accessibility or device acceptance. See [UI commands](ui.md).

## Operations and compatibility

Init writes editable source and can install dependencies and initialize Git. It never provisions providers, creates credentials, deploys or registers a managed project. Consumers own application security and operations; Platform is a separate managed product. Existing applications, native port work and Platform runtime artifacts retain their explicit reviewed pins until separately adopted. A CLI build or release does not update them.
