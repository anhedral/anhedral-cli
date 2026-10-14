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
        path: `../.artifacts/dashboard/services-${width}-${colorScheme}.png`,
        fullPage: true,
      });
      await page.getByRole('tab', { name: 'Services', exact: true }).focus();
      await page.keyboard.press('ArrowRight');
      await expect(page.getByRole('tab', { name: 'Stack', exact: true })).toBeFocused();
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
