import { expect, test } from '@playwright/test';
import { e2eCredentials, hasE2eCredentials, signedInHomeUrl } from './helpers/credentials';

test.describe('authenticated smoke', () => {
  test.skip(
    !hasE2eCredentials(),
    'Set PLAYWRIGHT_EMAIL and PLAYWRIGHT_PASSWORD in .env.e2e (non-production only).',
  );

  test('signs in and lands on dashboard or calendar', async ({ page }) => {
    const { email, password } = e2eCredentials();

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(signedInHomeUrl, { timeout: 20_000 });
    await expect(
      page
        .getByRole('heading', { name: /Platform Dashboard|My Schedule/i })
        .or(page.getByRole('link', { name: /^(Dashboard|Calendar)$/ })),
    ).toBeVisible();
  });
});
