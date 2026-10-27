# Archived native port

The exhaustive Anhedral shadcn-to-React-Native port is superseded by the
[source-owned UI catalog and installer](ui.md). Its assets, generator, dependency
set, test harness and parity tooling are no longer part of the active CLI.
Existing generated applications remain consumer-owned and are not rewritten.

New applications start with Next.js. Add an Expo client with `anhedral add expo`,
then its RNR/NativeWind integration with `anhedral add native-ui`. Use
`anhedral ui add` for selected platform components. Programmatic initialization
with the retired `expo` product now fails before writes with this migration path.

## Recovery

The October 26, 2026 local archive preserves the unfinished port, including all
uncommitted tracked and untracked source, at commit
`4033cab2f068ebc021803d6730e9e04cbc274081` under
`refs/archive/2026-10-26/old-port`. The clean pre-cleanup staging baseline is
`630315094dc6bcf71414aa002bedf0dbba09fb86`. These are source identities, not release
or native acceptance certifications.

The independently restorable archive contains `repository.bundle`, source tarballs,
binary diffs, original Git status, per-file SHA-256 manifests, selected ignored
local evidence and restoration scripts/results. It is retained outside the npm
package and plugin. The archive is local; these refs are not promised on GitHub.
The maintainer's archive location and verification results are recorded in the
existing development notes.

From a supplied archive directory, restore into a new directory:

```sh
git clone --no-checkout /path/to/archive/repository.bundle restored-native-port
git -C restored-native-port checkout --detach 4033cab2f068ebc021803d6730e9e04cbc274081
```

The bundle also retains available refs and stashes. Inspect `git bundle list-heads`
and fetch selected refs explicitly into a separate recovery repository when needed;
ordinary cloning imports branch/tag refs, not every archival or stash ref.

Use the archive's `verify_restore.py` to verify source and evidence against their
manifests. Read `evidence-exclusions.json` for omitted reproducible caches and native
binaries; original ignored material remains in the retained old checkout.

Recover selected components only for a concrete product requirement. Review their
dependencies, provenance and compatibility with the current NativeWind/RNR runtime,
then validate the consuming application on iOS and Android. Do not merge the old
branch wholesale or revive exhaustive registry parity as a release gate.
