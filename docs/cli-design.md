# CLI behavior and design

Anhedral uses three primary commands: `init` scaffolds source, `auth` checks or guides provider authentication, and `ship` provisions/configures the supported stack and coordinates delivery. `add`, `registry`, and `doctor` support development. Hosting selection and advanced release operations remain available through focused command help.

The comparison below uses current upstream documentation and source inspected on October 12, 2026. These projects solve different problems; the useful comparison is how they make commands discoverable, changes reviewable, and failures understandable.

| Reference | Useful practice | Anhedral behavior |
| --- | --- | --- |
| [shadcn CLI](https://ui.shadcn.com/docs/cli) and its [command source](https://github.com/shadcn-ui/ui/tree/main/packages/shadcn/src/commands) | Source ownership, command-specific help, working-directory selection, and previews before changing files | Bundled recipes scaffold owned source; focused help, `--cwd`, and `add --dry-run`, `--diff`, and `--view` support review |
| [shadcn monorepos](https://ui.shadcn.com/docs/monorepo) | Resolve application and shared-package destinations coherently | The registry resolves dependencies and workspace references into `apps/*` and `packages/*`; additions preserve edited source and record provenance |
| [GitHub CLI help](https://cli.github.com/manual/gh_help) | Discover commands through focused help topics | `anhedral help <command>` and `<command> --help` show the same options, examples, and relevant prerequisites |
| [uv command reference](https://docs.astral.sh/uv/reference/cli/) | Consistent output controls and discoverable options | `--quiet` suppresses human output; `--json` retains one machine-readable result; errors remain on stderr |
| [CLI Guidelines](https://clig.dev/) | Explain outcomes, suggest corrections, and show the next action | Human summaries describe selected parts, pending setup, release evidence, and next steps; command/flag typos receive bounded suggestions |

Shadcn's entry point uses Commander and registers separate commands; its initialization separates preflight checks, configuration, templates, registry work, and source updates. Anhedral separates its command metadata, argument handling, human output, registry resolution, staged transactions, and provider operations. The existing provider verification and mutation boundaries remain in the operation modules. See [shadcn's entry point](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/index.ts) and [initialization implementation](https://github.com/shadcn-ui/ui/blob/main/packages/shadcn/src/commands/init.ts).

## Command definitions

`src/command-schema.ts` declares command descriptions, option flags and aliases, required or optional values, and repeatable options. Command help and argument validation consume this same metadata; help text is never parsed to infer flag behavior. Singleton command options reject duplicates, required values reject missing input, and boolean options reject inline values without echoing those values. `--allow-email` remains repeatable; `add --diff` and `--view` accept an optional path. Command dispatch and domain-specific value validation remain in the operation handlers.

## Daily use

```sh
anhedral init client-app --hono --neon --dry-run
anhedral init client-app --hono --neon
anhedral auth --cwd client-app
anhedral ship --cwd client-app --dry-run

anhedral add resend --cwd client-app --dry-run
anhedral add resend --cwd client-app --diff
anhedral add resend --cwd client-app --view packages/email/src/index.ts
anhedral add resend --cwd client-app

anhedral help ship
anhedral registry view neon
anhedral doctor --cwd client-app --json
```

Complete the selected provider settings and connect the intended hosting account before delivery, as described in [provider configuration](provider-configuration.md). The commands above are examples, not authorization to deploy an application.

`--cwd` / `-c` selects the working directory and resolves relative directory arguments from it. `add <items...>` uses the current project; the earlier `add <directory> <items...>` form remains supported. Use `--cwd` or an explicit `./directory` when a directory name is also a stack item. `new` remains a compatibility alias for scaffolding an explicit destination; documentation and help lead with `init`.

## Output contract

- Human output summarizes the operation and relevant next steps. Interactive scaffolding reports its current stage on stderr. Redirected output has no animated terminal effects or progress messages.
- `--json` emits a complete result on stdout. Failures emit a JSON error, code, and next action on stderr with a nonzero exit status. Login prompts and scaffolding tool output are suppressed in machine mode.
- `--quiet` / `-q` suppresses human results and progress, retaining errors. Combining it with `--json` retains the JSON result.
- `--verbose` exposes local scaffolding tool output in human mode. Machine and quiet modes keep tool output suppressed.
- Help and version checks do not require an existing project or a usable working directory. Unknown commands and flags fail before setup or provider operations; suggestions do not execute corrections.

## Source previews

`add --diff [path]` shows an applicable unified patch. `add --view [path]` shows generated source. Both imply a dry run and use the existing staged transaction; neither installs the preview. Without a path, they show the changed generated files. Conflict reporting still applies; previewing a conflict does not permit overwriting edited source.

Previews exclude private environment files and `.anhedral/` state. Public `env.example` (Void), `.env.example`, and `.dev.vars.example` templates can be inspected. Binary, nonregular, or files over 256 KiB are marked unavailable. The combined preview has a 1 MiB limit; select a file for larger additions. Diffs use a linear single-contextual-hunk implementation, including explicit handling of final newlines and new empty files.

A selection that needs a new upstream web bootstrap cannot produce source previews offline. The CLI explains this and directs the user to the selection-only `--dry-run` plan, which marks `filesChecked: false`. It does not fabricate files or run a networked generator during that preview.

## Deliberate boundaries

The public CLI accepts only bundled registry options. It does not accept external URLs, local third-party registries, or arbitrary remote content. It does not force overwrites, infer paid activation, or claim that scaffolding and authentication establish complete product behavior. Provider enrollment, permissions, DNS, billing eligibility, signing, and feature development remain explicit where required.

Contract and local-flow tests establish command behavior, source preservation, machine output, and provider request/response handling. Live account provisioning and deployment require separate authorized verification. Release remains a separate review decision.

## Read-only project inspection

`anhedral inspect [directory] --json` returns the shared versioned project-inspector contract used by the optional plugin UI. It reads bounded allowlisted local source and receipt files only, with independent errors for unavailable evidence. It does not contact providers, inspect credential values, migrate state or change files. It preserves per-target latest attempt and last successful release as separate facts. Authentication, permission and live provider health remain explicitly unknown. Read time does not make an old receipt fresh.
