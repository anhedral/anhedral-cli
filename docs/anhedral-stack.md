# Application foundation

Start with Next.js, Anhedral UI and OpenNext for Cloudflare Workers. Only the web application is generated. Anhedral UI uses official shadcn web components and React Native Reusables native components, with a small optional Anhedral native extension layer.

Grow the application deliberately: Hono for a separate API, Drizzle/D1 and Better Auth for persistence and identity, then optional storage, clients, payments, realtime and AI. Expo, Anhedral UI for Expo, WXT/Side Panel, GPUI, Stripe and RevenueCat are choices rather than automatic scaffold output. The exact “if needed” conditions remain open.

Use `anhedral add` to compose the selected [capabilities](capabilities.md) after previewing their source changes. Consumers implement features and operate their services. The CLI has no Platform identity, payment broker or provider-management dependency. See [stack standard](stack-standard.md) and [UI commands](ui.md).

## Stack diagram

The diagram follows the core dependency sequence and groups optional additions by purpose. WXT owns the optional Chrome Side Panel entrypoint; RevenueCat requires Expo and Stripe.

Regenerate the dark and light SVGs with `node docs/assets/render-stack.mjs`. Add `--png` to export PNGs using the optional `sharp` documentation renderer. Set `DOCS_NODE_MODULES` to a directory containing `sharp` when it is installed outside this checkout. Artwork generation uses the checked-in vendor logo data and runs offline.
