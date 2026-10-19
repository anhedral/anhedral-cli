# Local verification — 2026-10-18

- `pnpm check` passed: lint, TypeScript for client/server/gateway, Fallow, dependency audit, static export and both Worker dry builds.
- iOS and Android Expo/Hermes exports passed, including native development-client initialization.
- The parent CLI's `pnpm test:reference --browser` exercised real local workerd, a gateway-to-Hono service binding and isolated D1. It verified health, exported routes, signup/login, protected session contracts, invalid-password rejection, logout/revocation, forged identity rejection, native scheme/cookie transport and untrusted scheme rejection. Chrome also verified signup, the account screen, reload, sign-out and no horizontal overflow at a 390px viewport.

Run `pnpm test:reference` from the parent CLI checkout after installing/building this example. Add `--browser` with an available Playwright installation; `ANHEDRAL_PLAYWRIGHT_MODULE` can name its module path and `ANHEDRAL_BROWSER_CHANNEL=chrome` selects installed Chrome. The helper refuses configured private runtime files, creates disposable secrets/state, applies migrations only with `--local`, and removes its owned files/processes afterward.

This is local evidence. Native exports do not verify a compiled/installed application, SecureStore persistence on a device, signing or store acceptance. No real provider resources were provisioned, migrations applied remotely, billing exercised, app deployed or package published.
