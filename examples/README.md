# Application examples

Generate an exact current core reference instead of maintaining divergent source snapshots:

```sh
node dist/bin.js init /tmp/anhedral-core-reference --skip-install --no-git
node dist/bin.js init /tmp/anhedral-billing-reference --stripe --revenuecat --skip-install --no-git
```

These commands write source without provider activation, migration or deployment. Use a new destination. Tests generate isolated references from the maintained emitter; old alternative-stack examples remain in Git history.
