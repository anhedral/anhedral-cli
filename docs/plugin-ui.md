# Anhedral project inspector

Anhedral is headless-first: describe the application to Codex, review the selected stack, develop its features, authenticate to your providers and ship through the CLI. The optional project inspector displays the same local evidence available from `anhedral inspect --json`. Opening or refreshing it performs no provider calls, credential checks, provisioning, deployment or migrations.

Building or packaging the plugin does not install or publish it. Actual Codex host rendering and composer behavior require separate verification; protocol tests do not establish those behaviors.

## Screens and evidence

| Screen | Information | Evidence boundary |
| --- | --- | --- |
| Overview | Project identity, stack selection, per-target latest attempt and last success | Recorded results; not live health or feature acceptance |
| Stack | Workspace package dependencies, declared bindings, environment names and cron expressions | Package dependencies do not prove network calls; declarations do not prove resource existence |
| Setup | Local prerequisites, selected providers, capability limits and setup guidance | Authentication, selected-account permission and billing remain not checked |
| Delivery | Separate Cloudflare, Vercel and mobile records; integration pending outcomes and latest operation | One provider's success does not establish another's; old running records do not prove a process is active |

The inspector has no live analytics reader, database-row reader, or schedule-execution reader. These unsupported tabs have been removed. Credentials do not activate an unimplemented reader. Environment names come from example files and reveal no values or proof of secret validity. Mobile download URLs may contain access tokens and are excluded; validated Expo build-page links may be displayed. Missing record timestamps and project identity are unavailable rather than invented.

Every section is bounded and validated independently. A corrupt provider journal must not hide another target's valid evidence. Read time is explicitly distinct from receipt time. Configured, recorded and unknown states must remain distinguishable. General secret files, provider credential vaults, runtime state, raw diagnostics and absolute source paths are excluded from the UI projection.

## Interactions

New project opens a new composer with this prompt, without sending: “Create a new project using [@Anhedral](plugin://anhedral@anhedral). Start by explaining the stack and asking me what it should be about.” Setup and delivery actions prepare unsent drafts for the current conversation. The user reviews and sends the request before Codex acts. Unsupported hosts offer copyable text. Project selection updates authorized model context; it does not execute commands.

Refresh reloads local files only. Rename and forget affect only local catalog metadata, never project source or provider resources. There is no project-creation or registration dialog. Register an explicitly authorized directory through the local operator command. MCP tool inputs accept project IDs rather than arbitrary filesystem paths.

## Local development

The UI toolchain requires Node 22.13+ within Node 22, or Node 24+. The CLI retains its separately documented engines.

```sh
pnpm install --frozen-lockfile
pnpm --dir plugin-app install --frozen-lockfile
pnpm build
pnpm plugin:check
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" node plugin-app/dist/server.mjs register "$PWD" "Anhedral"
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" pnpm plugin:preview
```

Open `http://127.0.0.1:4317/`. The preview binds only to loopback, validates Host/Origin, bounds requests and uses a restrictive content security policy. `anhedral inspect [directory] --json` provides the shared read-only projection directly. `anhedral registry capabilities --json` explains the supported automation and owner steps.

`src/project-inspector.ts` owns projection; `plugin-app/server/snapshot.ts` adds catalog identity. The browser only renders its validated schema. The MCP server exposes `open_projects`, `list_projects`, `get_project`, local metadata tools and model-only source/catalog context tools. They remain useful without UI rendering. Standard MCP Apps resources and bridge messages provide the optional panel, host themes and inline/fullscreen modes. Native host-specific draft support is a separate acceptance gate.

The private catalog retains its existing on-disk location for registered users. List views read bounded summaries; only a selected project loads detailed inspection. The server does not automatically discover other projects. A remote server cannot inspect these local directories without a separately reviewed architecture; never publish the local catalog through a tunnel.

## Recovery and release review

Interrupted catalog writers can be inspected and recovered with the same private catalog directory:

```sh
ANHEDRAL_PLUGIN_DATA="$PWD/.artifacts/plugin-preview" node plugin-app/dist/server.mjs recover-catalog-lock
```

Only a proven dead same-host owner permits recovery. Live, foreign, malformed and uncertain owners remain blocked. Recovery changes catalog access only, not provider work or delivery state.

Build/package checks bind the runtime and self-contained browser HTML to source and CLI version. Exact ZIP protocol tests exercise resources, schemas and headless tools. Before publication, verify native host entrypoints, unsent drafts, theme/reload behavior, all four sections, keyboard navigation and narrow screens against the exact rebuilt ZIP. Publication remains a separate reviewed action.

The design follows the official [optional UI guidance](https://developers.openai.com/plugins/concepts/plugins#optional-ui) and [MCP Apps foundation](https://developers.openai.com/plugins/build/chatgpt-ui#start-with-mcp-apps).
