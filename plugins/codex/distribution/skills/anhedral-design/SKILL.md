---
name: anhedral-design
description: "Design accessible Next.js web and Expo native interfaces with shared tokens."
---

# Anhedral Design

Use DOM shadcn components in apps/web and the Anhedral-maintained native shadcn port using StyleSheet and shared tokens in apps/mobile. Share design tokens and public contracts; do not use react-native-web or import native UI into Next.js. Preserve accessible component semantics, keyboard focus, responsive layout, reduced motion and native platform conventions. Reuse shared typography/colors/spacing rather than app-local palettes.

Build real loading, empty, error and success states. Keep API and provider implementation details out of user flows unless they inform a meaningful decision. Do not introduce alternative frontend frameworks or UI runtimes. Existing non-generated applications keep their own architecture.

Verify web interaction and the target device separately; web build success does not prove native accessibility or behavior. Auth/private-file screens and optional Stripe/RevenueCat flows must reflect server results rather than optimistic entitlement claims.
