# Source-only full-stack example

This example contains application and service foundations for inspecting the generated project structure. It does not implement a finished product or connect its services.

- CLI source: development checkout `anhedral@0.11.1`.
- Project metadata: one root `anhedral.json`, with identity, standard, setup, providers, cloudflare and registry sections.
- Workspace: pnpm/Turborepo; applications in `apps`, shared implementation in `packages`.
- Services: Vinext, Hono, D1, Better Auth, R2, KV, realtime, Queues/DLQ, cron, Workflows, Workers AI, Resend, Stripe, Sentry, PostHog and Basin.
- Delivery declaration: Wrangler, required by the selected Queues and Basin recipes.
- Provider resources: not provisioned. Account and audience: unconfigured.
- Dependencies: not installed; no resolved lockfile or runtime/build acceptance is claimed.
- Git: no nested repository was initialized. The example belongs to the CLI checkout.

The normal initializer could not reach `ui.shadcn.com` from this environment. The source was composed with the CLI's real recipe composer over the official upstream Next monorepo template archive from shadcn-ui/ui commit `c2477f311c19982ef6e246085438e6cfec3e35ea`, obtained through GitHub. The archive blob is `02d6cc4a5b96fd012508b843b6d04100b79954b5`; its MIT notice is retained in `LICENSE.template.md`. No test bootstrap was used.

The setup plan’s root is stored as `.` so this checked-in example does not contain a machine-specific home path.

The upstream registry component download was unavailable. The landing page uses the included `@workspace/ui/components/service-card` component rather than referencing a missing downloaded Button component. The obsolete upstream `.eslintrc.js` was removed; generated flat ESLint configurations own linting.

Equivalent normal initialization command, run from the CLI checkout into an unused directory:

```sh
node dist/bin.js init examples/full-stack \
  --vinext --hono --d1 --better-auth \
  --r2 --kv --realtime --queues --cron --workflows --workers-ai \
  --resend --stripe --sentry --posthog --basin \
  --skip-install --no-git
```

The example already exists, so use another destination to repeat that command. The normal initializer also resolves its dependency lock and applies any required exact-version dependency patches; those network-dependent steps did not complete for this source snapshot.

Local validation checked JSON syntax, generated TypeScript/TSX syntax, workspace names and references, declared targets and registry provenance. Doctor's only failed structural check is the intentionally unresolved lockfile. No dependency install, migration, provider authentication, provisioning or deployment was run.
