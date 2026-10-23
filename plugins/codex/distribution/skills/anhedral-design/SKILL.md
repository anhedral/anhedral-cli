---
name: anhedral-design
description: "Design accessible Expo interfaces using the shared Anhedral styling and native components."
---

# Anhedral Design

Use the generated Expo interface, React Native Reusables, NativeWind and shared styling tokens. Preserve accessible component semantics, keyboard focus, responsive layout, reduced motion and native platform conventions. Reuse shared typography/colors/spacing rather than app-local palettes.

Build real loading, empty, error and success states. Keep API and provider implementation details out of user flows unless they inform a meaningful decision. Do not introduce alternative frontend frameworks or UI runtimes. Existing non-generated applications keep their own architecture.

Verify web interaction and the target device separately; static export/build success does not prove native accessibility or behavior. Auth/private-file screens and optional Stripe/RevenueCat flows must reflect server results rather than optimistic entitlement claims.
