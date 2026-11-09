// The only generated stack uses OJ, TanStack Start and local workerd.
if (process.argv[2] && process.argv[2] !== 'anhedral-stack')
  throw Error('Only anhedral-stack is supported.');
await import('../scripts/runtime/tanstack-runtime-smoke.mjs');
