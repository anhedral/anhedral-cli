# Anhedral UI

One CLI routes source installation to official shadcn for Next.js and React Native Reusables for Expo. It owns the catalog and a small native extension registry, rather than a fork of either library. New `anhedral init` applications already have web UI configuration and three starter components.

```sh
anhedral ui list --json
anhedral ui init --web
anhedral ui add button card --web
anhedral ui add button --native
anhedral ui diff button --native
anhedral ui doctor --all
anhedral ui add card --all --dry-run --json
```

All commands accept the global `--cwd`, `--json` and `--quiet` options. `--web`, `--native` and `--all` are mutually exclusive. Without a selector, a single detected Next.js or Expo app is used; ambiguous workspaces require selection. Detection supports an app itself or applications immediately under a workspace's `apps/` directory. Web and native use separate directories.

`list` reads the packaged catalog without network access. `doctor` checks static configuration and exits unsuccessfully for missing setup; it does not claim runtime acceptance. `--dry-run` previews init/add/diff without network or writes. Every selected target is preflighted before installation starts. Upstream installation can still fail after an earlier target succeeds; source installation is not a cross-project transaction, so review Git changes before retrying.

`init --web` delegates new configuration to pinned shadcn with Base UI defaults. Existing `components.json` is validated and preserved. `init --native` requires a prepared Expo/NativeWind 4 project using the [RNR manual setup](https://reactnativereusables.com/docs/installation/manual). It does not create Expo, rewrite Metro/root layouts, choose device permissions or add a second styling engine. Complete RNR's dependencies, CSS variables, Tailwind/Metro configuration, aliases, `cn` helper and portal host first. It can create the conventional native `components.json`, then adds Anhedral metadata and attribution without replacing existing files.

`add` validates canonical names against the catalog. Native chooses a packaged reviewed Anhedral extension when declared, otherwise RNR's NativeWind item, otherwise fails clearly before installing. The extension registry starts empty. Web uses official shadcn items. The pinned shadcn CLI owns registry dependency resolution and copying source. We do not use the universal-only `@shadcn/registry` installer for component projects.

`add` never requests `--overwrite`; upstream protects existing component files. `diff` delegates to shadcn's `add --diff` preview. Commit or inspect consumer changes before updating, and reconcile changes explicitly. Native `diff` availability follows the upstream CLI and registry behavior; it is not a custom merge engine.

## Ownership and provenance

`assets/ui/catalog.json` records the catalog revision, upstream sources, dependency metadata and pinned installer. Availability is not parity or runtime certification. RNR URLs are live upstream endpoints; the catalog's recorded source revision describes the inventory, not an immutable downloaded artifact. Review registry changes before installing into sensitive consumers.

`.anhedral-ui.json` records platform, catalog revision and source ownership; it does not automatically update components. `ANHEDRAL_UI_LICENSES/` retains the relevant MIT notice. No Anhedral runtime package is introduced. Theme through consumer CSS variables and existing tokens. Future native extensions require a focused product need, upstream provenance/license and native consumer evidence; broad parity is not a release prerequisite.

Validate web flows in a browser. Validate native interactions in Android/iOS development builds, including accessibility, overlays, keyboard and lifecycle. Typechecking or an Expo web export does not establish device acceptance. The retired exhaustive port is preserved outside the active CLI; `docs/native-ui.md` records its recovery identity and migration path.

For a generated Anhedral workspace, `anhedral add expo` creates the native application after its core source prerequisites, and `anhedral add native-ui` prepares its NativeWind/RNR integration without replacing product UI. The UI component commands remain independent of backend activation. See [stack additions](capabilities.md).
