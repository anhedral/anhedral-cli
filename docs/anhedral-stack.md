# Anhedral application stack

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/anhedral-stack.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/anhedral-stack-light.png">
  <img alt="Next.js web and Expo iOS/Android connect to Hono, Drizzle/D1 and private R2. Stripe and RevenueCat are optional payment additions." src="assets/anhedral-stack-light.png" width="1200">
</picture>

Every application starts with **Next.js web + Expo native + Hono + Drizzle/D1 + private R2**. Better Auth,
shared contracts and design tokens support the foundation. Stripe and RevenueCat are
the only optional additions; either can be selected independently.

Hono owns authentication, authorization, data and private files. The Next.js App Router supports SSR and React Server Components through Cloudflare
OpenNext. Web uses DOM shadcn UI; Expo iOS/Android uses the Anhedral native shadcn
port. UI implementations share contracts and tokens, not browser/native primitives.
Web API transport uses the `ANHEDRAL_API` service binding; native clients use the
configured HTTPS API. Stripe checkout and RevenueCat purchases reconcile to
shared server-enforced entitlements.

Source generation is separate from resource provisioning, migrations and deployment.
See the [stack standard](stack-standard.md) and [development workflow](software-factory.md).
The editable [diagram source](https://github.com/anhedral/anhedral-cli/blob/main/docs/assets/render-stack.mjs)
produces both themes from the same layout.
