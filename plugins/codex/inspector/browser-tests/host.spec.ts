import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    // Test fallbacks without changing the operator's system clipboard.
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: async () => {} },
      configurable: true,
    });
  });
});

test('embedded project selection updates context and both composer actions stay unsent', async ({
  page,
}) => {
  await page.goto('/host-fixture?drafts');
  const app = page.frameLocator('iframe');
  await app.getByRole('button', { name: /atlas/ }).click();
  await expect
    .poll(() => page.evaluate(() => JSON.stringify((window as any).hostFixture.contexts)))
    .toContain('get_project_context');
  await app.getByRole('button', { name: 'Continue in Codex' }).click();
  await expect(app.getByRole('status')).toContainText('Draft added to the composer');
  const messages = await page.evaluate(() => (window as any).hostFixture.messages);
  expect(messages).toHaveLength(1);
  expect(messages[0]._meta['openai/message']).toEqual({ target: 'active', send: false });
  expect(messages[0].content[0].text).toContain('atlas');
  expect(JSON.stringify(messages[0])).toMatch(/[a-f0-9]{8}-[a-f0-9-]{27,}/);
  await expect(app.locator('html')).toHaveCSS('--host-inset-top', '112px');
  await expect(app.locator('html')).toHaveCSS('--host-inset-bottom', '48px');
  const topbar = await app.locator('.topbar').boundingBox();
  expect(topbar?.y).toBeGreaterThanOrEqual(112);
  await app.getByRole('button', { name: 'Projects', exact: true }).click();
  await app.getByRole('button', { name: 'Create project', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as any).hostFixture.messages.length)).toBe(2);
  const last = await page.evaluate(() => (window as any).hostFixture.messages[1]);
  expect(last._meta['openai/message']).toEqual({ target: 'new', send: false });
});

for (const query of ['', '?platform=web&drafts', '?drafts&failDraft']) {
  test(`unsupported or failing composer retains a visible draft (${query || 'no capability'})`, async ({
    page,
  }) => {
    await page.goto(`/host-fixture${query}`);
    const app = page.frameLocator('iframe');
    await app.getByRole('button', { name: /atlas/ }).click();
    await app.getByRole('button', { name: 'Continue in Codex' }).click();
    await expect(app.getByRole('textbox', { name: 'Unsent conversation draft' })).toHaveValue(
      /atlas/,
    );
    const messages = await page.evaluate(() => (window as any).hostFixture.messages);
    expect(messages).toHaveLength(query.includes('failDraft') ? 1 : 0);
    if (messages.length) expect(messages[0]._meta['openai/message'].send).toBe(false);
    if (query.includes('platform=web'))
      await expect(app.locator('html')).toHaveCSS('--host-inset-top', '24px');
  });
}
