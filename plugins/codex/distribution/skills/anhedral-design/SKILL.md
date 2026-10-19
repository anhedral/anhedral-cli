---
name: anhedral-design
description: "Design accessible Anhedral universal Expo interfaces and explicit web alternatives with shared tokens, native primitives and purposeful platform-appropriate effects."
---

# Anhedral Design

Start with the user flow, existing design system and repository layout rules.
Choose hierarchy, typography, spacing, density and responsive behavior before
effects. Preserve established identity unless a redesign is requested.

- For Expo universal web/iOS/Android, default to React Native Reusables with
  shadcn conventions, native primitives, NativeWind and shared design tokens. Adapt component source to the product rather than mixing in
  DOM-only shadcn components. Check browser keyboard behavior and native
  touch, safe areas and platform APIs. DOM shadcn components are not native UI.
  Explicit Next.js on Vercel or Vinext on Cloudflare apps use shared shadcn
  primitives; inspect `components.json`
  and installed APIs, and run additions from the consuming app.
- Design loading, empty, error and success states. Keep semantic controls, visible
  keyboard focus, accessible names, focus restoration, readable contrast and
  usable touch targets. Check long content, narrow screens and zoom.
- Use React Bits and vgpu only in compatible web surfaces, with explicit native
  alternatives; inspect platform support before adopting DOM/GPU effects.
  Keep effects subordinate to content. Inspect dependencies/licenses, preserve
  notices, provide reduced-motion/unsupported-device fallbacks, pause offscreen
  work and release resources. Read version-matched vgpu guidance for GPU work.
- Review the rendered result at relevant desktop/mobile sizes and with keyboard
  input. Exercise forms, overlays, scroll and the changed interaction; distinguish
  browser emulation from real-device/GPU acceptance.

Use [design references](references/design-resources.md) for Vercel interface
quality, shadcn Typeset/components/MCP, React Bits, Tailwind and vgpu. Read only
relevant sources. Use installed specialist tools when available, without requiring
additional plugins for ordinary UI work. Continue implementation with
[Dev](../anhedral-dev/SKILL.md).

When billing is selected, use [Billing](../anhedral-billing/SKILL.md) for payment
and entitlement behavior. Design pending/stale access, purchase failure,
restore/manage and account-switch states around server-verified access; browser
Checkout and native store purchases need platform-appropriate controls.

For optional WXT side panels, design for the narrow, resizable browser panel and
its open/close lifecycle. The browser side panel API provides the surface; verify
target-browser support and preserve keyboard focus and state appropriately.
