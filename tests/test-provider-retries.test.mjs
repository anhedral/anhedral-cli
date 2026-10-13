import assert from 'node:assert/strict';
import { test } from 'node:test';
import { providerApi, ProviderRequestError } from '../dist/providers/api.js';
const environment = { NEON_API_KEY: 'private-management-token' };
const immediate = { delay: async () => {} };
for (const status of [429, 502, 503, 504]) {
  test(`GET retries HTTP ${status} then returns the verified response`, async () => {
    let attempts = 0;
    let canceled = 0;
    const delays = [];
    const api = providerApi(
      'neon',
      {},
      environment,
      async (_url, options) => {
        assert.equal(options.method, 'GET');
        attempts++;
        return attempts === 1
          ? new Response(
              new ReadableStream({
                cancel() {
                  canceled++;
                },
              }),
              { status },
            )
          : new Response('{"id":"project-1"}');
      },
      {
        delay: async (milliseconds) => {
          delays.push(milliseconds);
        },
      },
    );
    assert.deepEqual(await api('/projects'), { id: 'project-1' });
    assert.equal(attempts, 2);
    assert.equal(canceled, 1);
    assert.deepEqual(delays, [100]);
  });
}
for (const status of [400, 401, 403, 404, 408, 409, 500]) {
  test(`GET does not retry HTTP ${status}`, async () => {
    let attempts = 0;
    const api = providerApi(
      'neon',
      {},
      environment,
      async () => {
        attempts++;
        return new Response('private remote diagnostic', { status });
      },
      immediate,
    );
    await assert.rejects(
      api('/projects'),
      (error) =>
        error instanceof ProviderRequestError &&
        error.status === status &&
        !error.message.includes('private'),
    );
    assert.equal(attempts, 1);
  });
}
test('GET exhausts bounded attempts without exposing transport errors', async () => {
  let attempts = 0;
  const delays = [];
  const api = providerApi(
    'neon',
    {},
    environment,
    async () => {
      attempts++;
      throw new Error(environment.NEON_API_KEY);
    },
    {
      delay: async (milliseconds) => {
        delays.push(milliseconds);
      },
    },
  );
  await assert.rejects(
    api('/projects'),
    (error) =>
      /did not complete/.test(error.message) && !error.message.includes(environment.NEON_API_KEY),
  );
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [100, 200]);
});
for (const method of ['POST', 'PATCH']) {
  for (const status of [429, 503]) {
    test(`${method} never replays HTTP ${status}, even with idempotency support`, async () => {
      let attempts = 0;
      const api = providerApi(
        'neon',
        {},
        environment,
        async () => {
          attempts++;
          return new Response('private', { status });
        },
        immediate,
      );
      await assert.rejects(
        api('/projects', method, { name: 'example' }, 'operation'),
        (error) => error instanceof ProviderRequestError && !error.rejected,
      );
      assert.equal(attempts, 1);
    });
  }
  test(`${method} never retries unknown transport outcomes`, async () => {
    let attempts = 0;
    const api = providerApi(
      'neon',
      {},
      environment,
      async () => {
        attempts++;
        throw new Error('private outcome');
      },
      immediate,
    );
    await assert.rejects(api('/projects', method, { name: 'example' }), /Inspect remote status/);
    assert.equal(attempts, 1);
  });
}
test('bounded Retry-After is respected and excessive provider waits are not shortened', async () => {
  const delays = [];
  let attempts = 0;
  const api = providerApi(
    'neon',
    {},
    environment,
    async () => {
      attempts++;
      return attempts === 1
        ? new Response('', { status: 429, headers: { 'Retry-After': '1' } })
        : new Response('{}');
    },
    {
      delay: async (milliseconds) => {
        delays.push(milliseconds);
      },
    },
  );
  await api('/projects');
  assert.deepEqual(delays, [1000]);
  attempts = 0;
  const excessive = providerApi(
    'neon',
    {},
    environment,
    async () => {
      attempts++;
      return new Response('', { status: 429, headers: { 'Retry-After': '3600' } });
    },
    {
      delay: async () => {
        throw new Error('must not sleep');
      },
    },
  );
  await assert.rejects(excessive('/projects'), /HTTP 429/);
  assert.equal(attempts, 1);
});
test('Retry-After HTTP dates and invalid values stay bounded', async () => {
  for (const value of [
    new Date(Date.now() - 60000).toUTCString(),
    'garbage',
    '-100',
    '999999999999999999999999',
  ]) {
    const delays = [];
    let attempts = 0;
    const api = providerApi(
      'neon',
      {},
      environment,
      async () => {
        attempts++;
        return attempts === 1
          ? new Response('', { status: 503, headers: { 'Retry-After': value } })
          : new Response('{}');
      },
      {
        delay: async (milliseconds) => {
          delays.push(milliseconds);
        },
      },
    );
    if (value === '999999999999999999999999') {
      await assert.rejects(api('/projects'), /HTTP 503/);
      assert.equal(attempts, 1);
    } else {
      await api('/projects');
      assert.equal(
        delays.every((delay) => delay >= 0 && delay <= 2000),
        true,
      );
    }
  }
});
test('invalid and oversized successful JSON responses are not retried', async () => {
  for (const body of ['{invalid', 'x'.repeat(2 * 1024 * 1024 + 1)]) {
    let attempts = 0;
    const api = providerApi(
      'neon',
      {},
      environment,
      async () => {
        attempts++;
        return new Response(body);
      },
      immediate,
    );
    await assert.rejects(api('/projects'), /invalid or oversized JSON/);
    assert.equal(attempts, 1);
  }
});
test('error body cancellation failures never replace sanitized provider errors', async () => {
  const api = providerApi(
    'neon',
    {},
    environment,
    async () =>
      new Response(
        new ReadableStream({
          cancel() {
            return Promise.reject(new Error(environment.NEON_API_KEY));
          },
        }),
        { status: 403 },
      ),
    immediate,
  );
  await assert.rejects(
    api('/projects'),
    (error) =>
      error instanceof ProviderRequestError &&
      error.rejected &&
      !error.message.includes(environment.NEON_API_KEY),
  );
});
test('GET response-body stalls are bounded and canceled', async () => {
  let attempts = 0;
  let canceled = 0;
  const api = providerApi(
    'neon',
    {},
    environment,
    async () => {
      attempts++;
      return new Response(
        new ReadableStream({
          cancel() {
            canceled++;
          },
        }),
      );
    },
    {
      ...immediate,
      attemptTimeoutMs: 10,
      totalTimeoutMs: 50,
      maxAttempts: 2,
      baseDelayMs: 0,
      maxDelayMs: 0,
    },
  );
  const started = Date.now();
  await assert.rejects(api('/projects'), /did not complete|deadline exceeded/);
  assert.equal(attempts, 2);
  assert.equal(canceled, 2);
  assert.ok(Date.now() - started < 500);
});
test('POST transport stalls have one bounded attempt and an aborted signal', async () => {
  let attempts = 0;
  let signal;
  const api = providerApi(
    'neon',
    {},
    environment,
    async (_url, options) => {
      attempts++;
      signal = options.signal;
      return new Promise(() => {});
    },
    { ...immediate, totalTimeoutMs: 15 },
  );
  await assert.rejects(api('/projects', 'POST', { name: 'example' }), /Inspect remote status/);
  assert.equal(attempts, 1);
  assert.equal(signal.aborted, true);
});
test('a stalled injected delay cannot exceed the overall deadline', async () => {
  let attempts = 0;
  const api = providerApi(
    'neon',
    {},
    environment,
    async () => {
      attempts++;
      throw new Error('private');
    },
    { baseDelayMs: 0, totalTimeoutMs: 20, delay: async () => new Promise(() => {}) },
  );
  await assert.rejects(api('/projects'), /deadline exceeded/);
  assert.equal(attempts, 1);
});
for (const token of ['bad\0token', ' spaced', 'bad\ttoken', 'bad\ntoken', 'nonascii-é']) {
  test('unsafe credential bytes are rejected before network', () =>
    assert.throws(
      () =>
        providerApi('neon', {}, { NEON_API_KEY: token }, async () => {
          throw new Error('must not call');
        }),
      /supply NEON_API_KEY/,
    ));
}
for (const options of [
  { maxAttempts: 6 },
  { maxAttempts: 0 },
  { maxAttempts: 1.5 },
  { totalTimeoutMs: Infinity },
  { attemptTimeoutMs: 0 },
  { baseDelayMs: -1 },
  { maxDelayMs: 3000 },
  { baseDelayMs: 1000, maxDelayMs: 100 },
]) {
  test('retry options cannot remove bounds', () =>
    assert.throws(
      () => providerApi('neon', {}, environment, async () => {}, options),
      /bounded provider retry policy/,
    ));
}

test('GET can recover from one transport interruption without changing the request', async () => {
  const calls = [];
  const api = providerApi(
    'neon',
    {},
    environment,
    async (url, options) => {
      calls.push({ url, method: options.method, headers: options.headers });
      if (calls.length === 1) throw new Error('private transport detail');
      return new Response('{"id":"project-1"}');
    },
    immediate,
  );
  assert.deepEqual(await api('/projects'), { id: 'project-1' });
  assert.deepEqual(calls[0], calls[1]);
});
test('GET retries a broken response transport but never leaks stream diagnostics', async () => {
  let attempts = 0;
  const api = providerApi(
    'neon',
    {},
    environment,
    async () => {
      attempts++;
      if (attempts === 1)
        return new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error(environment.NEON_API_KEY));
            },
          }),
        );
      return new Response('{}');
    },
    immediate,
  );
  assert.deepEqual(await api('/projects'), {});
  assert.equal(attempts, 2);
});
