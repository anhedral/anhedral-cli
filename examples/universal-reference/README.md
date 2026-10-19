# Universal reference application

A generated Expo application for web, iOS and Android, backed by one Hono API, D1 and Better Auth. The home screen checks the API; `/sign-in` creates/signs into an account; `/account` verifies the session through Hono and supports sign-out. The browser gateway forwards `/api/*` to the API Worker. Native requests use the configured product origin and a SecureStore-backed session adapter.

Recreate this example from a built CLI checkout into a fresh destination:

```sh
node dist/bin.js init /tmp/universal-reference --better-auth --no-git
```

The configuration records this retained example's root as `.` for portability. No provider resources are provisioned by initialization. Its dependency lockfile is retained; installed modules and generated exports are ignored.

From this example directory:

```sh
pnpm install --frozen-lockfile
pnpm db:generate
# Review the generated SQL, then apply only to the local fixture.
pnpm db:migrate
pnpm dev
```

Before starting the API, copy `apps/api/.dev.vars.example` to the ignored `apps/api/.dev.vars`; supply a generated `BETTER_AUTH_SECRET` and set `BETTER_AUTH_URL` to the browser gateway origin, normally `http://localhost:3000`. Keep runtime values out of source. The gateway's `API` service binding targets `universal-reference-api`. The browser uses same-origin cookies. Web source changes require another static export/restart; this preview does not supply web HMR.

For native development, copy `apps/mobile/.env.example` to ignored `apps/mobile/.env.local` and set public `EXPO_PUBLIC_API_URL` to the product origin reachable from the device. A physical phone cannot use the development computer's `localhost`. HTTP is accepted only in development. Start Metro with `pnpm --dir apps/mobile start`, or launch with its `ios`/`android` scripts. Native sign-in requires a development build containing the SecureStore plugin and the configured `universal-reference` URL scheme.

Verification commands:

```sh
pnpm check
pnpm --dir apps/mobile exec expo export --platform ios --output-dir .output/ios
pnpm --dir apps/mobile exec expo export --platform android --output-dir .output/android
```

`check` runs lint, types, Fallow, dependency audit and build. The generated workspace has no product test suite or `test:live` script. Native JavaScript/Hermes exports establish bundler compatibility, not an installed native application, device session persistence, signing or store acceptance. Local workerd/D1/browser checks are separate from deployed provider verification. This example implements no billing or purchases.

See [architecture](docs/architecture.md) and [verification](docs/verification.md). From the parent CLI checkout, `pnpm test:reference` runs the isolated workerd/D1 acceptance flow after this example is built.
