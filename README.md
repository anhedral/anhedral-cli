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

Add the rest strategically through the CLI:

```sh
anhedral stack list
anhedral add hono
anhedral add database-auth
anhedral add expo native-ui --dry-run --json
anhedral add side-panel --with-dependencies --dry-run --json
```

The catalog includes private R2, Stripe, events, RTC, AI, Expo, native UI, RevenueCat, WXT, Side Panel and GPUI. Missing prerequisites require an explicit selection or `--with-dependencies`. “If needed” decisions remain open. Additions preserve edited source and do not provision providers, install credentials, migrate databases or deploy. Anhedral Platform remains a separate managed product; no Platform account is required.

See [stack standard](docs/stack-standard.md), [workflow](docs/software-factory.md) and [UI commands](docs/ui.md) and [stack additions](docs/capabilities.md).

## Compatibility

This changes the default generated layout. Existing applications, Platform runtime images and installed plugins keep their reviewed pins until explicitly upgraded. The retained legacy native source and full-stack recipes are compatibility material; new init does not copy them. Publishing does not update an existing application or installed plugin.

For source development, run `pnpm install --frozen-lockfile && pnpm build`, then `node dist/bin.js init my-app`.

Apache-2.0. Generated applications are editable source that consumers may customize and license for their own products. Retain the applicable MIT notices for copied upstream UI source.
