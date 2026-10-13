import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostLayout } from '../web/host-layout.ts';

test('desktop fullscreen reserves room for the floating host composer', () => {
  assert.equal(hostLayout({ platform: 'desktop', displayMode: 'fullscreen' }).top, 112);
  assert.deepEqual(
    hostLayout({
      platform: 'desktop',
      displayMode: 'fullscreen',
      safeAreaInsets: { top: 160, right: 20, bottom: 80, left: 10 },
    }),
    { top: 160, right: 20, bottom: 80, left: 10 },
  );
});

test('inline, side panels and previews do not inherit fullscreen clearance', () => {
  for (const displayMode of ['inline', 'pip'] as const)
    assert.equal(hostLayout({ platform: 'desktop', displayMode }).top, 0);
  assert.deepEqual(hostLayout(undefined), { top: 0, right: 0, bottom: 0, left: 0 });
  assert.equal(hostLayout({ platform: 'web', displayMode: 'fullscreen' }).top, 0);
});

test('mobile safe areas and invalid inset values are handled independently', () => {
  assert.deepEqual(
    hostLayout({
      platform: 'mobile',
      displayMode: 'fullscreen',
      safeAreaInsets: { top: 48, right: -10, bottom: Number.NaN, left: Number.POSITIVE_INFINITY },
    }),
    { top: 48, right: 0, bottom: 0, left: 0 },
  );
});
