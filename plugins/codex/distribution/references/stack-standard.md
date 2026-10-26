# Stack standard

Anhedral CLI scaffolds Next.js App Router with OpenNext, Expo iOS/Android, DOM shadcn and Anhedral’s native shadcn ports, Hono on Cloudflare Workers/workerd, Drizzle ORM with D1, and a private R2 bucket. The result is editable source owned and operated by its consumer. TypeScript, pnpm, Turborepo, shared API contracts and design tokens support that foundation.

| Source | Responsibility |
| --- | --- |
| apps/web | Next.js App Router, SSR/RSC and DOM shadcn UI; OpenNext configuration |
| apps/mobile | Native-only Expo and Anhedral-maintained native shadcn components |
| apps/api | Hono Worker, server-owned database and storage access |
| packages/contracts | Framework-independent validation and HTTP transport |
| packages/db | Drizzle/D1 schema and explicit migration tooling |
| packages/native-ui | Editable native shadcn port |
| packages/styling | Shared design tokens |

Web adapts requests to Hono through the ANHEDRAL_API service binding; local development uses a loopback API origin. Native uses EXPO_PUBLIC_API_URL. Apps do not import another app’s source. Share contracts and tokens, not browser/native primitives. Next server actions adapt forms and call Hono; database access belongs to the API.

## Scope

`anhedral init` is the sole product command. It writes source and configuration, optionally installs dependencies and initializes local Git. `--dry-run --json` previews the same stack. `--skip-install --no-git` generates source without network. Init never contacts provider management APIs, creates cloud resources, installs credentials, deploys, or registers a managed project.

Authentication, authorization, email, Stripe, RevenueCat, hosting, provider connections, analytics and release operations are consumer-owned application work. They are not selectable CLI additions. Anhedral Platform supplies a separate B2B managed product; the open-source scaffold has no Platform account or service dependency.

## Private storage and data

The API declares a D1 DB binding and private R2 FILES binding. Configure real resource identities yourself when deploying. Local development uses Wrangler/workerd resources. Keep public R2 access disabled and storage credentials server-side. The starter exposes no object HTTP routes: implement identity, authorization, ownership and limits before adding file APIs. A private bucket alone does not authorize an application user.

Drizzle begins with an empty schema. Generate and review SQL, then explicitly apply local migrations. Remote migrations require deliberate target selection. Builds and startup never migrate a configured database.

## UI maintenance

Use official shadcn components on web and the editable Anhedral native ports in packages/native-ui. Shared tokens live in packages/styling. The pinned upstream inventory, native APIs and device acceptance gaps are documented in native-ui.md. CLI updates do not overwrite existing applications.

The shadcn fork is the upstream review and provenance source, not a whole-repository runtime dependency. Init distributes reviewed component source and its license/provenance records. Applications import their local UI source and explicitly review updates against their own edits; updating the CLI does not update an existing application's components.

React Native supplies native rendering and accessibility primitives. Expo SDK packages supply device capabilities such as clipboard, documents, audio, camera, location and notifications. Use those packages directly in application features. A native UI adapter is appropriate when it adds presentation or interaction, such as a Copy button using Expo Clipboard or an attachment control using Expo DocumentPicker. Keep application permission policy, background work, uploads and push registration outside generic UI components. An in-app toast and an OS push notification are separate responsibilities.

The mobile application selects the tested Expo/React Native/React runtime. Native UI peers must agree with that runtime; do not install a second React or React Native copy. Declare SDK dependencies where they are imported, and verify native autolinking/configuration in the consuming app. The copied UI includes the dependencies required by its reviewed source; additional application capabilities are installed only when needed, using Expo's compatibility-aware installer from apps/mobile. Do not install the entire SDK or add a second Anhedral abstraction for every Expo API. Review platform support and permission/config-plugin requirements for each package.

Treat @expo/ui as an optional source of platform controls, not a replacement mandate for the native shadcn port. Select its SwiftUI/Compose controls only where their behavior fits the feature and the scaffold's tested SDK. Share tokens and contracts across Next and Expo, while retaining separate DOM and native implementations.

Validate UI changes in the relevant browser and Android/iOS development builds. Changes to native dependencies or configuration require rebuilding the native client. Check keyboard/focus, accessibility, overlays and lifecycle behavior on each platform; test device-only capabilities on physical devices. An Expo web render, matching component name or successful compile does not establish native parity.

## Breaking scope change

The scaffold-only release removes operational commands, the local project catalog/MCP dashboard, generated Better Auth/managed email, and Stripe/RevenueCat additions. Existing source and cloud resources are never migrated or deleted. Platform retains its old runtime artifacts until it explicitly adopts the new generator and replaces any dependency on removed commands such as inspect. A CLI release does not update installed plugins, runtime images or existing apps.
