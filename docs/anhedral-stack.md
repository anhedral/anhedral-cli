# Anhedral application stack

```mermaid
flowchart TB
  expo[Expo: web / iOS / Android] --> gateway[Cloudflare static web gateway]
  expo --> api[Hono API Worker]
  gateway --> api
  api --> auth[Better Auth sessions]
  api --> db[Drizzle / D1]
  auth --> db
  api --> files[Private R2: owner-authorized files]
  api -. optional .-> stripe[Stripe: web payments]
  api -. optional .-> rc[RevenueCat: native entitlements]
  expo -. native SDK .-> rc
```

All application data and authorization belongs behind Hono. Native clients use the configured HTTPS API; browser API transport goes through the gateway. Source generation is separate from resource provisioning, migration and deployment. Stripe and RevenueCat are the only optional additions. See [stack standard](stack-standard.md) and [workflow](software-factory.md).
