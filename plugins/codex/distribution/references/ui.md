# Anhedral UI

Anhedral UI is the source-owned web UI layer of the **Anhedral Stack**, using official shadcn and semantic theme tokens. It is a catalog/installer convention, not another runtime component library.

```sh
anhedral ui list --json
anhedral ui add card --web
anhedral ui diff card --web
anhedral ui doctor --web
```

Init already creates web UI configuration and reviewed Button, Input and Label source. `list` reads the packaged web catalog offline. `init`, `add`, `diff` and `doctor` select an Anhedral Stack web application through the working directory or `--cwd`; `--web` is optional. Current public commands do not select mobile/native targets or arbitrary framework applications.

`--dry-run --json` previews configuration/installation without network or writes. Selected destinations, metadata and attribution paths are preflighted before installation. CLI-owned writes refuse symlinked metadata destinations. Bounded consumer manifest/configuration links remain supported where their targets are regular files. Ambiguous or invalid targets stop before installation.

The pinned official shadcn CLI resolves registry dependencies and copies source. `add` never requests overwrite; review diffs and reconcile customizations explicitly. `diff` delegates to the upstream preview. Installer failure can leave partial upstream changes, so inspect Git before retrying.

`assets/ui/catalog.json` owns the web inventory and pinned installer. `.anhedral-ui.json` records catalog/platform ownership, not automatic updates or runtime certification. Preserve applicable MIT notices under `ANHEDRAL_UI_LICENSES/`, existing components, semantic tokens and source attribution.

Validate browser behavior, keyboard focus and interactions. Typechecking or source completeness alone is not browser acceptance. Backend services are independent additions; UI installation does not require authentication, a database or storage. See [stack additions](capabilities.md).
