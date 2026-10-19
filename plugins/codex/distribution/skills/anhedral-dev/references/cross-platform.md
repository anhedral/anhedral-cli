# Expo cross-platform runtime

Use the generated scripts and selected CLI version as the runtime contract.
Preserve adopted application profiles; these defaults describe new Expo workspaces.

## Local development and routing

Expo universal clients live in `apps/mobile`; Hono appears in `apps/api` only
when server capabilities are selected. A minimal app has no API binding, origin,
identity provider or database to configure.
Root `pnpm dev` serves exported browser assets through Wrangler on port 3000 and
Hono on 8787 when selected. Use actual server output if ports/configuration differ.
`pnpm --dir apps/mobile start` runs Metro for native. Re-export browser changes
with `pnpm --dir apps/mobile build:web`; the exported browser loop is not HMR.

When Hono is selected, the Cloudflare asset gateway forwards same-origin browser `/api/*` requests through
its `API` service binding to Hono. Native clients use `EXPO_PUBLIC_API_URL`, which
must be reachable from the device; device localhost is not the development host.
Check `/api/health` and authenticated `/api/session` through each relevant transport.
Keep server credentials out of public Expo variables and client bundles.

## Identity and platform acceptance

When selected, Better Auth generates separate browser/native clients, a SecureStore cookie
adapter and an exact trusted native scheme. Follow [Auth](../../anhedral-auth/SKILL.md)
for session configuration and account lifecycle. Explicit Clerk needs its native
integration; do not infer support from browser login alone.

Validate web export and iOS/Android exports separately, then exercise the requested
flows on development builds/devices. Exports, simulated transport checks and EAS
completion establish different evidence from physical-device acceptance.
For optional purchases and shared entitlements, use
[Billing](../../anhedral-billing/SKILL.md).

## Static web and delivery

Keep the generated SDK 57 pin unless upgrading is part of the task. Dynamic static
routes need build-time `generateStaticParams` or a deliberately supported SPA/server
profile; static export does not provide SSR. Cloudflare hosts the web gateway and whichever backend services are selected. Native binaries use the selected build/store
workflow; billing providers and app stores remain external integrations.

Use [Hosting](../../anhedral-hosting/SKILL.md) for delivery. Preserve legacy portal
publishing behavior; a CLI capability does not upgrade the portal publisher.
