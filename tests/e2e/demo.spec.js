import { expect, test } from '@playwright/test';

test('the demo shows vanilla and jQuery sticky state transitions', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible();
  await expect(page.locator('#vanilla-status')).toHaveText('unpinned');
  await expect(page.locator('#jquery-status')).toHaveText('unpinned');
  await expect(page.locator('.offset-guide')).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 1400));

  await expect(page.locator('#vanilla-status')).toHaveText('pinned');
  await expect(page.locator('#jquery-status')).toHaveText('pinned');

  await page.getByLabel('Offset').fill('48');
  await expect(page.locator('#offset-value')).toHaveText('48px');

  await page.getByLabel('Expand header height').check();

  await expect(page.locator('.demo-header--vanilla')).toHaveClass(/is-expanded/);

  await page.getByLabel('Simulate no native sticky support').check();

  await page.evaluate(() => window.scrollTo(0, 1400));
  await expect
    .poll(() =>
      page.evaluate(() => Number.parseFloat(getComputedStyle(document.body).paddingTop))
    )
    .toBeGreaterThan(0);
});
