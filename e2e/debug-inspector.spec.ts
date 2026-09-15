import { expect, test } from '@playwright/test';
import { DEBUG_INSPECTOR_SESSION_KEY } from '../src/lib/debug-inspector';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

test.describe('staging debug inspector', () => {
  test('stays off on localhost without the staging host or env flag', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('debug-inspector-fab')).toHaveCount(0);
  });
});

test.describe('staging debug inspector (session override)', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: IPHONE_UA,
  });

  test('FAB pick + panel shows element data on a phone viewport', async ({ page }) => {
    await page.addInitScript((key: string) => {
      sessionStorage.setItem(key, '1');
    }, DEBUG_INSPECTOR_SESSION_KEY);

    await page.goto('/');
    const fab = page.getByTestId('debug-inspector-fab');
    await expect(fab).toBeVisible();
    await expect(fab).toHaveAttribute('aria-label', 'Inspect');

    const fabBox = await fab.boundingBox();
    expect(fabBox).toBeTruthy();
    expect(fabBox!.y + fabBox!.height).toBeLessThan(844 - 24);

    await fab.click();
    await expect(fab).toHaveAttribute('aria-label', 'Cancel inspect');

    await page.getByRole('heading', { name: /Scheduling that lets you focus on your clients/i }).click();

    const panel = page.getByTestId('debug-inspector-panel');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Staging inspector');
    await expect(panel).toContainText('h1');
    await expect(panel).toContainText('Breadcrumbs');
    await expect(panel).toContainText('Computed CSS');
    await expect(panel.locator('text=display')).toBeVisible();
    await expect(panel).toContainText('Scheduling that lets you focus');

    await page.getByTestId('debug-inspector-close').click();
    await expect(panel).toHaveCount(0);
    await expect(fab).toHaveAttribute('aria-label', 'Inspect');
  });
});
