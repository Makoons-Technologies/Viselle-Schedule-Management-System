import { expect, test } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  orgOwnerUser,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

test.describe('BEA-79 logged-in homepage flash', () => {
  test('stored session never paints marketing CTAs while /me is in flight', async ({ page }) => {
    await mockAuthMe(page, platformOwnerUser, { delayMs: 1500 });
    await mockPlatformDashboardApis(page);
    await seedStoredToken(page);

    await page.goto('/');

    await expect(page.getByTestId('session-check-shell')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get started' })).toHaveCount(0);
    await expect(page.getByText(/For salons, spas/i)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: /Scheduling that lets you focus/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Sign in' })).toHaveCount(0);

    await expect(page).toHaveURL(/\/platform\/dashboard/, { timeout: 15_000 });
    await expect(page.getByTestId('session-check-shell')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Get started' })).toHaveCount(0);
  });

  test('org owner session redirects to org dashboard without a marketing flash', async ({ page }) => {
    await mockAuthMe(page, orgOwnerUser, { delayMs: 400 });
    await page.route('**/organizations/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ organization: { id: 'org-e2e-1', name: 'E2E Salon', slug: 'e2e-salon' } }),
      });
    });
    await seedStoredToken(page);

    await page.goto('/');

    await expect(page.getByTestId('session-check-shell')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get started' })).toHaveCount(0);
    await expect(page).toHaveURL(/\/orgs\/org-e2e-1\/dashboard/, { timeout: 15_000 });
  });

  test('logged-out visitors still get the real landing page', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Scheduling that lets you focus on your clients/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Get started' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' }).first()).toBeVisible();
    await expect(page.getByTestId('session-check-shell')).toHaveCount(0);
  });
});
