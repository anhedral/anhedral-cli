# Archived native port

The exhaustive Anhedral shadcn-to-React-Native port is superseded by the
[source-owned UI catalog and installer](ui.md). Its assets, generator, dependency
set, test harness and parity tooling are no longer part of the active CLI.
Existing generated applications remain consumer-owned and are not rewritten.

New applications start with Next.js. Add an Expo client with `anhedral add expo`,
then its RNR/NativeWind integration with `anhedral add native-ui`. Use
`anhedral ui add` for selected platform components. Programmatic initialization
with the retired `expo` product now fails before writes with this migration path.

## Reviewed extensions

Recover selected components only for a concrete product requirement. Review their
dependencies, provenance and compatibility with the current NativeWind/RNR runtime,
then validate the consuming application on iOS and Android. Do not merge the old
branch wholesale or revive exhaustive registry parity as a release gate.
