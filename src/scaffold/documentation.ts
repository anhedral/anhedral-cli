import { capabilityReferences } from '../capability-references.js';
import type { StandardOptions } from '../registry/types.js';
import { put } from './files.js';
export function writeSetupDocumentation(root: string, options: StandardOptions): void {
  for (const [file, source] of Object.entries(capabilityReferences())) put(root, file, source);
  put(
    root,
    'README.md',
    `# ${options.name}

Next.js on Cloudflare Workers through OpenNext, with Anhedral UI from the start.
Init starts with apps/web. Review anhedral.json for explicitly composed API/data source.
Use anhedral stack status to inspect later source additions.
No providers are provisioned by source generation.

## Develop

Use the Node/pnpm versions in package.json. Run pnpm install if generation skipped
installation, then pnpm dev. Open the URL printed by Next.js.

## Anhedral UI

The initial page uses editable Button, Input and Label source from the reviewed
shadcn baseline. Application-local source belongs to you. Shared tokens live in
packages/styling; preserve attribution in ANHEDRAL_UI_LICENSES and UPSTREAM.json.
Anhedral UI is a CLI/catalog/theme convention, not a runtime component package.

Use anhedral ui list, anhedral ui add card --web, anhedral ui diff button --web,
and anhedral ui doctor --web. Use --cwd apps/web to select this application or
--all explicitly for multiple clients. --dry-run previews init/add without network
or writes. Updates are opt-in; never overwrite customized components silently.

Native UI uses the React Native Reusables NativeWind registry in compatible Expo
projects, preferring reviewed Anhedral extensions when present. It requires Expo,
not a backend. Use anhedral add expo, then add native-ui, for the reviewed client/setup recipes.
Standalone UI commands do not create native clients or backend services; existing
Expo applications need the upstream NativeWind/RNR setup before native ui init.

## Add strategically

Add Hono when a dedicated API is justified, then Drizzle/D1/Better Auth when the
product needs data and authentication. Use anhedral add <capability> --dry-run --json
to review changes, then apply them. Missing parents require explicit selection or
--with-dependencies. See docs/anhedral/capabilities.md for the complete catalog and
source-protection contract. No provision or deployment command is implemented here.
Consumers own integrations, deployment and application distribution. Run pnpm check
and review your changes before deployment. Builds/startup never migrate databases.

Hono owns privileged API operations when selected. Clients and Next server actions
call the API; applications never import one another's source. Keep database and
storage credentials server-side. Implement identity, authorization and ownership
checks before exposing data or files; private storage is not user authorization.
Review generated SQL and apply migrations explicitly through the selected database tooling.
`,
  );
  put(
    root,
    'AGENTS.md',
    `# Minimal application foundation

Start with Next.js/OpenNext/Workers and source-owned Anhedral UI. Do not add an API,
database, authentication, R2 or native client without a concrete feature need.
Use anhedral add and stack list/status/doctor to compose selected capabilities.
Preview additions first, preserve edited source, and configure selected auth methods
explicitly. Source installation is not provider activation. Use anhedral ui
add/list/diff/doctor to manage platform-specific source; web uses
official shadcn and native uses RNR/NativeWind with reviewed Anhedral extensions.
UI requires its application platform, not Hono or a database. Share tokens, not
DOM/native primitives. Preserve consumer edits, attribution and upstream metadata.
Never automatically overwrite installed components. Read version-matched framework
guides and run pnpm check. Never migrate a configured database during checks/builds.
Hono owns privileged operations when present. Clients call its API; applications
must not import another application's source. Keep database/storage secrets on
the server and implement authorization before exposing private data or files.
`,
  );
  put(
    root,
    'docs/architecture.md',
    '# Architecture\n\nNext.js → OpenNext → Cloudflare Workers, with Anhedral UI. Record feature-driven additions here.\n',
  );
  put(
    root,
    'docs/verification.md',
    '# Verification\n\nRecord commands, outcomes and environment. Source generation is not deployment acceptance.\n',
  );
}
