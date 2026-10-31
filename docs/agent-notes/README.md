# Development notes

## 2026-10-31 — Public CLI boundary review candidate

Keep consumer manifests and Platform client messages public. Hosting policy,
artifact allowlists and isolated-builder enforcement remain server-owned.
Release and upload checks share credential patterns. Public content hashes track
only this repository's reviewed contracts; private checkout revisions are omitted.
Publication remains paused pending review. Node 24 build, type/format/hygiene,
release/security policies, OSV, full unit suite, dependency patch installs and
packed installation/packlist checks passed. The optional native-device test is
not run. Focused checks cover public contract drift, credential rejection and
local plugin pointer preparation. Exact package/plugin review artifacts remain
local; no tag, package publication, provider activation or database change occurs.

Keep this rolling log focused on public CLI changes and unresolved limitations.
Record private operational evidence outside the public repository. Historical
commits remain unchanged. Keep this file within 100 lines and the repository
within its 20 tracked Markdown file budget.
