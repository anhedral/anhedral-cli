# Anhedral CLI

An open-source scaffold for Next.js App Router with OpenNext, Expo iOS/Android, DOM shadcn and Anhedral’s native shadcn ports, Hono on Cloudflare Workers/workerd, Drizzle ORM with D1, and a private R2 bucket.

One command creates a complete, editable foundation:

```sh
anhedral init my-app
cd my-app
pnpm dev
```

Open the local URL printed by the development server. Start Expo separately with `pnpm --dir apps/mobile start`.

```sh
anhedral init my-app --dry-run --json
anhedral init my-app --skip-install --no-git
```

The core stack is always included. The CLI has no auth, payment, provider-management or hosting commands. You own the source and are responsible for developing, securing and hosting your application, including any authentication, Stripe or RevenueCat integration you choose to add. Init does not create cloud resources or expose public file routes.

The optional Codex plugin explains the stack, runs initialization and local development, and opens the resulting local app in a browser. It can recommend separate Cloudflare, Stripe or RevenueCat plugins when relevant; it does not manage those services.

Anhedral Platform is a separate B2B managed product. The scaffold requires no Platform account, credentials or service connection.

See [stack standard](docs/stack-standard.md), [workflow](docs/software-factory.md), [native UI](docs/native-ui.md).

## Compatibility

This is a breaking scaffold-only change. Older applications and Platform runtime images keep their pinned CLI and source. Existing source, credentials and cloud resources are never rewritten or removed. Publishing the CLI does not update an installed plugin or hosted image.

For source development, run `pnpm install --frozen-lockfile && pnpm build`, then `node dist/bin.js init my-app`.

Apache-2.0. Generated applications are editable source that consumers may customize and license for their own products.
