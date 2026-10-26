# Anhedral CLI

Start with one Next.js application configured for OpenNext on Cloudflare Workers, with Anhedral UI included as editable source. Add architecture when a product needs it.

```sh
anhedral init my-app
cd my-app
pnpm dev
```

Init creates only `apps/web` plus shared tooling and tokens. It includes three reviewed web starter components (Button, Input and Label), official shadcn configuration and Anhedral UI metadata. It creates no Expo app, API, database, authentication or cloud resources.

```sh
anhedral init my-app --dry-run --json
anhedral init my-app --skip-install --no-git
anhedral ui list
anhedral ui add card --web
anhedral ui diff card --web
anhedral ui doctor --web
```

Anhedral UI is a small catalog and CLI over official shadcn on web and React Native Reusables on native. Components are copied into your application. Native resolution prefers a reviewed Anhedral extension when one exists, then RNR; unsupported components are reported. The extension registry starts empty. There is no Anhedral component runtime, whole-library fork or automatic source replacement.

For an existing Expo app, complete the upstream React Native Reusables NativeWind 4 setup first, then use `anhedral ui init --native`. Ambiguous workspaces require `--web`, `--native`, `--all` or an application-specific `--cwd`. UI installation does not require Hono, a database or authentication.

Hono, Drizzle/D1, private R2, Better Auth, Expo, WXT and its Side Panel API, GPUI, Stripe, RevenueCat, realtime and AI are future application choices, added strategically. Their “if needed” conditions remain open. This CLI does not yet install those additions or manage provider accounts, deployments or billing. Anhedral Platform is a separate managed product; no Platform account is required here.

See [stack standard](docs/stack-standard.md), [workflow](docs/software-factory.md) and [UI commands](docs/ui.md).

## Compatibility

This changes the default generated layout. Existing applications, Platform runtime images and installed plugins keep their reviewed pins until explicitly upgraded. The retained legacy native source and full-stack recipes are compatibility material; new init does not copy them. Publishing does not update an existing application or installed plugin.

For source development, run `pnpm install --frozen-lockfile && pnpm build`, then `node dist/bin.js init my-app`.

Apache-2.0. Generated applications are editable source that consumers may customize and license for their own products. Retain the applicable MIT notices for copied upstream UI source.
