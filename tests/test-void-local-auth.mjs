// Run against an isolated generated API workerd preview after local D1 migrations.
// node tests/test-void-local-auth.mjs http://127.0.0.1:8787
import { verifyLocalAuth } from './support/verify-local-auth.mjs';

await verifyLocalAuth(process.argv[2]);
console.log(
  'PASS: actual Worker readiness version, local shared Better Auth/D1 signup, login, authenticated session, incorrect password and session revocation.',
);
