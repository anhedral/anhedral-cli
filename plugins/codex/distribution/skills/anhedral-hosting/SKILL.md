---
name: anhedral-hosting
description: "Deliver and verify Anhedral web/API releases on Cloudflare or explicit Vercel targets, and coordinate separate Expo native delivery."
---

# Anhedral Hosting

Inspect `anhedral.json`, source revision, CLI version/help and existing provider
links. Reuse the owner-selected project, account and audience. Minimal Expo apps
deploy only static web to Cloudflare. Selected Hono, D1 and R2 also use Cloudflare. The usual explicit web
alternative is Next.js on Vercel; Vinext on Cloudflare is also supported. Preserve
existing delivery selections.

1. Run `anhedral doctor --providers --json`. Complete missing provider login with
   [Auth](../anhedral-auth/SKILL.md), then use the selected provider's `connect`
   options to verify account/project and access protection.
2. Review the intended source, checks, bindings and migrations. Choose one release
   path: `ship --dry-run --json` then authorized `ship --json`, or an authorized
   Git deployment followed by `adopt --json`. Do not deploy the same revision twice.
   Ship can create resources, apply reviewed migrations and publish code.
3. If selected, deliver Hono before dependent frontends. Expo exports static web from
   `apps/mobile/dist`; `worker/index.ts` is the Cloudflare asset gateway, named
   `<project>-mobile`. New Expo workspaces use Wrangler for both API and gateway.
   When Hono is selected, the gateway uses its `API` binding for `/api/*`; native
   clients use public, reachable `EXPO_PUBLIC_API_URL`. A minimal app has no backend
   binding or API origin to configure. Validate API routing before
   asset fallback. Explicit Vinext web also uses a binding; Vercel web needs
   server-only HTTPS `API_URL`. For a private
   Cloudflare Access API, configure its scoped service-token policy and Vercel’s
   server-only `API_ACCESS_CLIENT_ID`/`API_ACCESS_CLIENT_SECRET`. API auth uses
   the canonical public web origin. Check web-to-API health and sessions after
   delivery. Inspect retained failure records before retrying a partial release;
   reconcile uncertain effects.
4. Refresh provider evidence with `status --refresh --json` and run meaningful live
   checks/`verify --json`. For private hosting, test anonymous denial and permitted
   access. Return the actual URL, source/release identity and remaining gaps.

Stay within the requested audience, budget and release scope. Stop at missing
access or authorization; do not broaden protection to get a deployment through.
Deployment success is not product acceptance. Rollback restores code, not data
or migrations.

Expo native delivery is separate from its web export. Use the selected EAS profile
and verify actual artifact/source identity; exports alone do not prove native builds.
Preserve legacy web-only hosted releases; the current portal publisher does not
automatically gain universal/full-stack support from this architecture.

For selected capabilities, review database migrations, scoped bindings and file
authorization before delivery. Full-product also needs explicit Cloudflare account
setup for AI, analytics, Images, Stream and RealtimeKit; generated helpers do not
activate these services or complete media acceptance. WXT needs its selected
extension distribution workflow. When Stripe or
RevenueCat is selected, use [Billing](../anhedral-billing/SKILL.md) for deployed
webhooks, shared entitlement enforcement and reconciliation recovery. Cloudflare
delivery does not configure external billing providers or complete store acceptance.

Follow the bundled [delivery and release workflow](../../references/software-factory.md#maintain-and-release-the-cli) for CLI releases; application delivery follows the selected provider sections in the same factory.
