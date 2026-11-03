import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { z } from 'zod';
function stripeFixture(search, retrieve) {
  const source = readFileSync(new URL('../assets/stack/stripe.ts.txt', import.meta.url), 'utf8');
  const javascript = ts
    .transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
    })
    .outputText.replace(/^import .*;\n/gm, '')
    .replace(/\bexport /g, '');
  class Routes {
    post() {
      return this;
    }
    get() {
      return this;
    }
  }
  class Stripe {
    constructor() {
      this.subscriptions = { search, retrieve };
    }
    static createFetchHttpClient() {
      return {};
    }
  }
  return new Function(
    'Hono',
    'z',
    'Stripe',
    'requireSession',
    'billingEnvironment',
    javascript + '\nreturn stripeEntitled;',
  )(
    Routes,
    z,
    Stripe,
    () => {},
    () => 'sandbox',
  );
}
const billingEnv = {
  STRIPE_SECRET_KEY: 'sk_' + 'test_fixture',
  STRIPE_PRICE_ID: 'price_fixture',
  PUBLIC_APP_URL: 'https://example.com',
};
test('generated entitlement checks later pages and bounds concurrent canonical reads', async () => {
  let active = 0,
    maximum = 0;
  const pages = [];
  const entitled = stripeFixture(
    async (query) => {
      pages.push(query.page);
      return query.page
        ? { data: [{ id: 'active' }], has_more: false }
        : {
            data: Array.from({ length: 9 }, (_, i) => ({ id: String(i) })),
            has_more: true,
            next_page: 'second',
          };
    },
    async (id) => {
      active++;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active--;
      return {
        metadata: { userId: 'user' },
        livemode: false,
        status: id === 'active' ? 'active' : 'canceled',
        items: {
          data: [{ price: { id: 'price_fixture' }, current_period_end: Date.now() / 1000 + 3600 }],
        },
      };
    },
  );
  assert.equal(await entitled(billingEnv, 'user'), true);
  assert.deepEqual(pages, [undefined, 'second']);
  assert.ok(maximum <= 4);
});
test('generated entitlement returns unavailable for incomplete or over-budget search', async () => {
  let pages = 0;
  const limited = stripeFixture(
    async () => ({ data: [], has_more: true, next_page: String(++pages) }),
    async () => {
      throw Error('unexpected retrieve');
    },
  );
  await assert.rejects(limited(billingEnv, 'user'), /page budget/);
  assert.equal(pages, 5);
  const incomplete = stripeFixture(
    async () => ({ data: [], has_more: true, next_page: null }),
    async () => {},
  );
  await assert.rejects(incomplete(billingEnv, 'user'), /incomplete/);
});
