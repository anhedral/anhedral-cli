import { test, expect } from '@playwright/test';
for (const width of [390, 768, 1440]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`services search and details at ${width}px in ${colorScheme}`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.emulateMedia({ colorScheme });
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      await page.goto('/');
      await page.getByRole('button', { name: /atlas/ }).click();
      await page.getByRole('tab', { name: 'Services', exact: true }).click();
      await expect(page.locator('html')).toHaveAttribute('data-theme', colorScheme);
      await page.emulateMedia({ colorScheme: colorScheme === 'dark' ? 'light' : 'dark' });
      await expect(page.locator('html')).toHaveAttribute(
        'data-theme',
        colorScheme === 'dark' ? 'light' : 'dark',
      );
      await page.emulateMedia({ colorScheme });
      await expect(page.getByRole('heading', { name: 'Apps and services' })).toBeVisible();
      await expect(page.getByText('Live state not checked', { exact: false })).toBeVisible();
      await page.getByRole('textbox', { name: 'Search services' }).fill('database-id');
      await expect(page.locator('.service-card')).toHaveCount(1);
      await expect(page.locator('.service-card')).toContainText('Recorded');
      const details = page.locator('.service-card summary');
      await details.focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('.service-card details')).toHaveAttribute('open', '');
      await expect(page.locator('.service-card')).toContainText('Created by a recorded operation');
      await page.getByRole('textbox', { name: 'Search services' }).fill('missing-service');
      await expect(page.getByRole('heading', { name: 'No matching services' })).toBeVisible();
      await page.getByRole('textbox', { name: 'Search services' }).fill('');
      await page.getByRole('combobox', { name: 'Service category' }).selectOption('Applications');
      await expect(page.locator('.service-card')).toHaveCount(1);
      await expect(page.locator('.service-card')).toContainText('api');
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: `../../../.artifacts/dashboard/services-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.getByRole('tab', { name: 'Services', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Overview', exact: true })).toBeFocused();
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Projects', exact: true })).toBeVisible();
      expect(errors).toEqual([]);
    });
  }
}

test('projects isolate service filters and empty source evidence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /atlas/ }).click();
  await page.getByRole('tab', { name: 'Services', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search services' }).fill('DB');
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: /empty-app/ }).click();
  await page.getByRole('tab', { name: 'Services', exact: true }).click();
  await expect(page.getByRole('textbox', { name: 'Search services' })).toHaveValue('');
  await expect(page.getByRole('heading', { name: 'No services recorded' })).toBeVisible();
});

test('live reads and private data are explicit; deletion cancellation makes no mutation', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /atlas/ }).click();
  await page.getByRole('tab', { name: 'Services', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search services' }).fill('database-id');
  const card = page.locator('.service-card');
  await card.getByRole('button', { name: 'Check live status' }).click();
  await expect(
    card.getByText('Provider confirmed this resource exists.', { exact: false }),
  ).toBeVisible();
  await card.getByRole('button', { name: 'Load analytics' }).click();
  await expect(card.getByRole('heading', { name: 'Analytics', exact: true })).toBeVisible();
  await card.getByRole('button', { name: 'Browse data' }).click();
  await card.getByRole('button', { name: 'Load rows' }).click();
  await expect(card.getByText('Synthetic note')).toBeVisible();
  await expect(card.getByText('[masked]', { exact: true })).toBeVisible();
  await expect(card.getByText('private@example.com')).toHaveCount(0);
  await card.getByRole('button', { name: 'Review service deletion' }).click();
  await expect(card.getByRole('button', { name: 'Delete service and data' })).toBeDisabled();
  await card.getByRole('textbox', { name: 'Type resource name to confirm' }).fill('wrong');
  await expect(card.getByRole('button', { name: 'Delete service and data' })).toBeDisabled();
  await card.getByRole('button', { name: 'Cancel', exact: true }).click();
  await card.getByRole('button', { name: 'Check live status' }).click();
  await expect(
    card.getByText('Provider confirmed this resource exists.', { exact: false }),
  ).toBeVisible();
});

for (const width of [390, 1440]) {
  test(`lifecycle overview keeps evidence and unsent actions distinct at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const calls: string[] = [];
    page.on('request', (request) => {
      if (request.url().endsWith('/api/tool') && request.method() === 'POST')
        calls.push(request.postDataJSON().name);
    });
    await page.goto('/');
    await page.getByRole('button', { name: /atlas/ }).click();
    const lifecycle = page.getByRole('region', { name: 'Init → Auth → Ship' });
    await expect(lifecycle.getByRole('heading', { name: '1. Init' })).toBeVisible();
    await expect(lifecycle.getByText('Access not checked', { exact: true })).toBeVisible();
    await expect(lifecycle.getByText('Delivery not recorded', { exact: true })).toBeVisible();
    await expect(lifecycle.getByRole('button', { name: 'Review provider access' })).toBeVisible();
    expect(calls.every((name) => ['list_projects', 'get_project'].includes(name))).toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({
      path: `../../../.artifacts/dashboard/lifecycle-${width}.png`,
      fullPage: true,
    });
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByRole('button', { name: /empty-app/ }).click();
    await expect(page.getByText('Setup not found', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Review shipping plan' })).toHaveCount(0);
  });
}

test('confirmed deletion removes only the fixture resource and displays its receipt', async ({
  page,
}) => {
  await page.goto('/');
  await page.getByRole('button', { name: /atlas/ }).click();
  await page.getByRole('tab', { name: 'Services', exact: true }).click();
  await page.getByRole('textbox', { name: 'Search services' }).fill('database-id');
  const card = page.locator('.service-card');
  await card.getByRole('button', { name: 'Review service deletion' }).click();
  await card.getByRole('textbox', { name: 'Type resource name to confirm' }).fill('atlas-data');
  await card.getByRole('button', { name: 'Delete service and data' }).click();
  await expect(card.getByText('Provider confirmed deletion.', { exact: false })).toBeVisible();
  await card.getByRole('button', { name: 'Check live status' }).click();
  await expect(card.getByText('Resource not found in the selected account.')).toBeVisible();
});

for (const top of [24, 112]) {
  test(`project detail preserves a ${top}px host safe area after navigation`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    // Exercise the host layout contract without claiming native-host acceptance.
    await page.evaluate((inset) => {
      document.documentElement.style.setProperty('--host-inset-top', `${inset}px`);
      document.documentElement.style.setProperty('--host-inset-bottom', '48px');
    }, top);
    await page.getByRole('button', { name: /atlas/ }).click();
    const detail = page.locator('main.detail');
    await expect(detail).toHaveCSS('padding-top', `${top + 16}px`);
    const topbar = await detail.locator('.topbar').boundingBox();
    expect(topbar).not.toBeNull();
    expect(topbar!.y).toBeGreaterThanOrEqual(top);
    await page.getByRole('tab', { name: 'Services', exact: true }).click();
    await expect(detail).toHaveCSS('padding-top', `${top + 16}px`);
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await expect(page.locator('main.listing')).toHaveCSS('padding-top', `${top + 32}px`);
  });
}
