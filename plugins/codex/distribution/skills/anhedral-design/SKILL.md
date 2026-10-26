---
name: anhedral-design
description: "Explain and extend the scaffold's shared tokens, DOM shadcn UI and Anhedral native shadcn ports."
---

# Anhedral Design

Read the generated app's instructions and source. Web uses Next.js App Router and DOM shadcn components; native uses Expo and the editable Anhedral native shadcn port in packages/native-ui. Share contracts and tokens, not platform primitives. Keep theme tokens in packages/styling and use existing components before introducing custom primitives.

Use the generated apps/web ui:add and ui:view scripts for official web shadcn components. Native APIs and device acceptance differ; inspect the copied native component source and ../../references/native-ui.md before adapting it. Preserve keyboard focus, accessibility labels, loading/error states and platform-specific interaction. Read version-matched framework guidance and test the requested user flow.

Treat the upstream shadcn fork as a reviewed source/provenance input. Import the application's editable UI source and retain its licenses; review later component updates against consumer edits rather than replacing them automatically. See ../../references/stack-standard.md for dependency and acceptance boundaries.

Use React Native primitives and Expo SDK APIs directly where they fit. Compose a UI adapter when it adds presentation or interaction, such as a Copy button using Expo Clipboard. Keep application permission policy, uploads, background work and push registration in application services; an in-app toast is separate from OS notifications. Install only needed feature packages using Expo's compatibility-aware installer from apps/mobile, checking platform support, config plugins and native autolinking. Keep native-ui peers aligned with the mobile app's tested Expo/React Native/React runtime. Consider @expo/ui selectively for appropriate platform controls, without rewriting the native port wholesale.

Use Android/iOS development builds for native behavior and rebuild them when native dependencies or configuration change. Test keyboard, accessibility, overlays and lifecycle on each target; use physical devices for capabilities simulators cannot prove. Browser rendering and matching export names do not establish native parity.

This skill describes a foundation. Application authentication, billing, integrations and hosting are consumer-owned work; choose separate provider plugins or official SDKs when requested.
