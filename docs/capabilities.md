# Anhedral Stack additions

Initialize a blank Turborepo with `anhedral init <directory>`. Run additions in the workspace root or use `--cwd`. Each addition is optional. The catalog in `anhedral stack list --json` drives discovery, shell completion, planning, and source checks. Use `anhedral init all my-app` to generate every client and service in one workspace. Preview it with `anhedral init all my-app --dry-run --json`.

The workspace uses [Turborepo](https://turborepo.dev/docs).

`init`, `init all` and `add` query registry metadata for the selected templates and write exact versions to their manifests, including pnpm at initialization and Electron when adding desktop. Each npm package starts at the CLI catalog floor and stays within its supported SemVer range. Selection checks the running Node version and the dependencies and peers declared together in a package. Expo follows its SDK template’s React and React Native versions. The web RealtimeKit bindings must agree on the core SDK. For UI releases with a missing core declaration, the CLI uses a verified compatibility mapping. Workspace references, security overrides and the signed OJ runtime keep their own version policies.

`add` preserves existing pins. `--skip-install` still resolves new ones. `--dry-run` previews source changes offline. Use `--catalog-pins --skip-install` for reproducible source generation without a registry. A failed lookup or incompatible combination stops the command before it writes project files. The default npm registry is public npm. Set `npm_config_registry` to use a mirror that serves the public stack without credentials.

| Add | Requires | Generated source | Official documentation |
| --- | --- | --- | --- |
| web | Workspace | TanStack Start web Worker, OJ and editable shadcn UI | [TanStack Start](https://tanstack.com/start/latest/docs/framework/react/overview) |
| mobile | Workspace | Expo application for iOS and Android | [Expo](https://docs.expo.dev/) |
| desktop | Workspace | Electron app with a React, TypeScript and Vite renderer | [Electron](https://www.electronjs.org/docs/latest/), [electron-vite](https://electron-vite.org/guide/) |
| web-extension | Workspace | WXT popup, Chrome MV3 by default | [WXT](https://wxt.dev/guide/introduction.html) |
| cli | Workspace | TypeScript executable using Commander and the project name | [Commander](https://github.com/tj/commander.js#readme) |
| api | Workspace | Hono API Worker with a health route | [Hono](https://hono.dev/docs/) |
| db | api | Drizzle PostgreSQL schema and migration commands | [Drizzle ORM](https://orm.drizzle.team/docs/overview), [Neon Postgres](https://neon.com/docs/connect/connect-from-any-app) |
| auth | db | Better Auth tables, session routes and server guard | [Better Auth](https://www.better-auth.com/docs/introduction) |
| backend | Workspace | Selects api, db and auth together | See api, db and auth |
| storage | auth | Private, user-scoped R2 file operations | [Cloudflare R2](https://developers.cloudflare.com/r2/) |
| payment | auth | Stripe checkout, signed webhooks and entitlement checks | [Stripe](https://docs.stripe.com/) |
| in-app-purchases | mobile and auth | RevenueCat purchases/restore and API-side entitlement lookup | [RevenueCat](https://www.revenuecat.com/docs/) |
| client-sync | auth | Per-account Durable Object with hibernating WebSockets | [Durable Object WebSockets](https://developers.cloudflare.com/durable-objects/best-practices/websockets/) |
| rtc | auth | Cloudflare RealtimeKit private meetings and participant tokens | [RealtimeKit](https://developers.cloudflare.com/realtime/realtimekit/) |

```sh
anhedral init fieldnotes
cd fieldnotes
anhedral add cli
pnpm --dir apps/cli build
node apps/cli/dist/index.js --help
anhedral add client-sync --with-dependencies --dry-run --json
anhedral add client-sync --with-dependencies
anhedral add web mobile
```

For a full preview from `/work`, `anhedral init all fieldnotes --dry-run --human` prints

```text
Full workspace preview for /work/fieldnotes
Apps: web, mobile, desktop, web-extension, cli, api
Services: db, auth, storage, payment, in-app-purchases, client-sync, rtc
No files written.
```

A single command accepts additions in any order. Missing prerequisites require an explicit selection or `--with-dependencies`. The second half of a combination installs its integration. For example, web and API get a Worker service binding in either order. The web sign-in route appears when web and auth are both installed. Existing web-foundation projects keep their identity, customer routes and migrations. The CLI recognizes their bundled API/database/auth and provider identifiers.

## Client and cloud setup

- Web and API run on Cloudflare Workers. The web Worker forwards same-origin API requests through its service binding. Configure a public HTTPS API origin for external clients. The desktop binary, native mobile builds, browser extension and Node CLI run on their target platforms.
- Start a client with `pnpm --dir apps/<target> dev`. Run `pnpm --dir apps/api dev` for the standalone API. Web development starts an auxiliary API Worker when both are installed. API settings for mobile, desktop, extension and CLI are respectively `EXPO_PUBLIC_API_ORIGIN`, `VITE_API_ORIGIN`, `WXT_API_ORIGIN` and `API_ORIGIN`. For browser clients allow the specific trusted app origins in `AUTH_TRUSTED_ORIGINS`. For a custom Electron or extension content security policy, allow the API’s WebSocket origin in `connect-src`. Extension authors can request a specific host permission if their workflow needs it.
- Start Electron with `pnpm dev:desktop`. The first launch downloads the pinned Electron runtime. Edit `apps/desktop/ui/main.tsx` for the renderer and `apps/desktop/src/main/index.ts` for the main process. Run `pnpm --dir apps/desktop build` to create a runnable app for the current OS and architecture under `apps/desktop/release/`. The build uses Electron Packager. Distribution signing and installers are separate steps. [Packaging docs](https://packages.electronjs.org/packager/main/)
- For desktop API calls, set `VITE_API_ORIGIN` before development or build. In the API Worker, allow the exact renderer origins in `AUTH_TRUSTED_ORIGINS`, e.g. `http://127.0.0.1:1420` for development and `app://fieldnotes-desktop` for a packaged project named `fieldnotes`. The generated main process declares the packaged hostname.
- The shared API client provides session, file, access, room and sync helpers when the corresponding services are present. Mobile supports account sign-in and secure token storage. A generated Commander app with API supports `health --api-url <origin>`. With auth, use `login --email <email>` with a password on stdin, `whoami` and `logout`. Sessions are stored per API origin. Enable an auth method and configure private Worker secrets first.
- Set `SYNC_API_ORIGIN` to the externally reachable HTTPS Hono API origin (local Wrangler supports loopback HTTP). The client exchanges its cookie or bearer session for a short-lived single-use socket ticket. The API chooses the Durable Object from the authenticated user ID. Tickets travel in the WebSocket subprotocol. Idle sockets use Cloudflare hibernation. Clients renew their session before the server’s five-minute delivery window expires. Each signed-in app instance opens one socket. The Expo adapter reconnects on foreground. Browser clients reconnect when visible or online.
- After a successful commit, call `publishChange(env, userId, { type: 'message.created', id: conversationId })`. Pass `subscribe(request, refresh, abortSignal)` a callback that invalidates the affected queries. It receives no event on connection and reconnect, when it should refetch current account state from Hono. The generated storage routes publish file events after a successful write or deletion. Abort the subscription at logout. Delivery is best-effort while connected. A disconnected app recovers by reading canonical state on its next connection.
- RTC stores room membership in Postgres and uses Cloudflare RealtimeKit for calls. Configure the API Worker’s `RTC_ACCOUNT_ID`, `RTC_APP_ID`, `RTC_PRESET`, and private `RTC_API_TOKEN`. Generate and review the RTC schema migration. `createRoom(request, memberIds)` authorizes the creator and named accounts. Pass `getToken={() => joinToken(request, roomId)}` to the web or mobile Call component. Use an Expo native development build for calls and purchases.
- Native subscriptions use separate public iOS/Android SDK keys, a private RevenueCat API v1 key and an entitlement identifier. Call `connectPurchases` with the signed-in application user ID before purchase or restore and when switching accounts. Set `BILLING_PROVIDER` to `stripe`, `revenuecat` or `either` for server-side access checks. Keep sandbox and production provider projects separate.
- Bind the private R2 bucket in the generated Wrangler files and configure secrets on the API Worker. Run reviewed migrations deliberately. Build/deploy the API Worker before the web Worker. Managed Platform hosting still requires an independently reviewed runtime profile. Progressive composition metadata is local source provenance.

### One account across four clients

For TanStack Start, Expo, Electron and WXT with one API, database, identity, private storage and event channel, run:

```sh
anhedral init my-app
cd my-app
anhedral add web mobile desktop web-extension api db auth storage client-sync
```

In a signed-in view, import the generated app’s `subscribeToChanges` from `src/sync.js` (`ui/sync.js` in Electron). Call it once for the lifetime of the signed-in account. Expo uses its secure session token, web uses the same-origin session cookie, and Electron/WXT accept a token supplier as the third argument. For example, an app with an existing query cache can use:

```ts
const connection = new AbortController();
const subscribed = subscribeToChanges(
  (event) => queryClient.invalidateQueries(
    event?.type === 'message.created'
      ? { queryKey: ['account', userId, 'conversation', event.id] }
      : { queryKey: ['account', userId] },
  ),
  connection.signal,
  getToken,
);
// When the account signs out or the view unmounts:
connection.abort();
await subscribed;
```

Use account-prefixed query keys so a full account refresh includes conversations and sidebars. A server mutation can notify the affected account after its database write:

```ts
const saved = await withDatabase(c.env.DATABASE_URL, (db) =>
  db.insert(messages).values(authorizedMessage).returning(),
);
c.executionCtx.waitUntil(publishChange(c.env, c.get('userId'), {
  type: 'message.created', id: saved[0].conversationId,
}));
```

## Updating an existing app

Run these commands from the project root. Use the plan ID from your preview.

```sh
anhedral stack update --dry-run --human
anhedral stack update --expect-plan <planId>
pnpm install --frozen-lockfile
pnpm check
```

The preview uses the same registry resolver as `init` and `add`. It shows each proposed pin change with its manifest, current version and proposed version. Use `--json` for every eligible pin, lockfile status and before/after digests. Only exact pins owned by installed templates are eligible. Custom ranges, workspace links and unrelated dependencies retain their declarations.

The CLI resolves the shared pnpm lockfile in a temporary workspace, including custom workspace packages and reviewed patches. Existing [Cloudflare D1](https://developers.cloudflare.com/d1/) projects keep their database, migrations and Better Auth identity when adding or updating capabilities. Earlier [Tauri](https://v2.tauri.app/start/) projects retain their desktop runtime. Their updates resolve the existing Tauri CLI and managed Rust pins and require Cargo for the Rust lockfile. Apply checks the reviewed plan again and writes the manifests, lockfiles and any managed source updates in one transaction. If the inputs or resolutions change, preview again. The frozen install refreshes your local dependencies after apply.

Workspaces with an active custom pnpm hook need their own tooling to resolve that hook’s lockfile. Use `--offline` for the existing source-only update workflow. It skips dependency and release lookups and leaves lockfiles as they are.

Updates refresh the managed web and API adapters for the installed additions. Product routes, feature implementations and migrations stay application-owned. The updater preserves local adapter edits when the release still supplies the same baseline. If both changed differently, the preview identifies the conflicting file before any writes.

## Source protection

Adding a capability also upgrades a canonical earlier TanStack Start foundation to the pinned OJ launchers and runtime helpers in the same source transaction, including when that capability is already installed. The exact earlier canonical document also receives the OJ-compatible side-effect CSS import; safe customized documents stay untouched, while edited documents retaining the earlier stylesheet URL import require reconciliation. Customized launchers or generated configuration require reconciliation before any writes. Additions never reinitialize an application. They plan all selected changes before writing, reject collisions and preserve unrelated JSON/JSONC settings. Composition adapters are fingerprinted in `anhedral.json`; modified adapters require reconciliation instead of silent replacement. Add product routes in `apps/api/src/index.ts`, custom types in `custom-environment.ts`, and auth method configuration in `auth-features.ts`/`auth.ts`.

Journaled transactions preserve recovery evidence and refuse ambiguous recreated files. Dependency installation follows source commit; a post-commit install failure keeps source for repair/retry. Reviewed dependency patches precede the frozen install. `--skip-install` writes source only. `add --dry-run` performs no writes or network requests. Repeating an addition preserves source; normal installation may still retry dependencies.

There is no implicit capability removal or resource/data deletion. Existing applications retain their source and identity.

## Local setup and validation

After adding web, `pnpm dev` runs the web Worker. After backend is added, Vite also runs its auxiliary Hono Worker in the same process with the configured PostgreSQL database and optional local R2. Copy `apps/api/.dev.vars.example` to `.dev.vars`; configure `PUBLIC_APP_URL` and a private `BETTER_AUTH_SECRET`. Never put server secrets in web/public variables.

Set the private Worker secret `DATABASE_URL` to the pooled Neon URL using the hostname with `-pooler` and the query parameter `sslmode=verify-full`. Postgres.js on Workers uses Cloudflare’s verified TLS socket. Its socket does not expose the certificate bytes required by an explicit `channel_binding=require` policy. The Node migration process can use Neon’s direct URL with channel binding. Set `DATABASE_URL_UNPOOLED` in the migration shell to the direct connection string for the target database. For local development, point both at a disposable loopback PostgreSQL database. Review initial SQL, then run `pnpm db:migrate --local`. For later schema additions, run `pnpm db:generate`, inspect the SQL and apply it explicitly. Remote migration requires deliberate `--remote` selection. Builds, startup and ordinary checks never migrate a configured database.

Better Auth methods start disabled. Configure credentials, email/policy, schema and client flows before enabling chosen methods. The sign-in page is an example, not automatic activation. R2 remains private and file routes enforce authenticated ownership.

Stripe adds source/schema, not a live payment service. Generate and review its billing migration before webhook tests. Configure test credentials, allowed prices and signed webhooks deliberately. Server-side canonical provider state controls entitlements; redirects, client claims and webhook ordering do not grant access. Live mode and real charges require separate activation.

## Source and hosting contracts

`anhedral.json` records nonsecret generator/capability versions and identity. Source provenance never grants hosting authority. The public deployment manifest uses runtime profile `anhedral-stack` for the web foundation and selected backend/R2/Stripe composition. Artifact identity, resource provisioning, secrets, migrations, runtime checks and production approval remain server-owned. See [the workflow](software-factory.md#platform-cli-access-and-source-upload).

Backend, storage and Stripe include local tests. Storage tests use ephemeral Worker bindings. Payment tests generate and apply SQL only to a disposable fixture and sign webhook events locally. The workspace scopes security overrides to the affected transitive dependency versions.

Run `pnpm check` in generated applications. Framework/runtime, provider and browser acceptance are distinct; source installation alone establishes none of them.
