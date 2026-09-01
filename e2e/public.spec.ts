import { expect, test } from '@playwright/test';

test.describe('public marketing', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Scheduling that lets you focus on your clients/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
    await expect(page.locator('header').getByRole('link', { name: 'Contact' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: /The shops Viselle is built for/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'bls.gov/cew' })).toHaveAttribute(
      'href',
      'https://www.bls.gov/cew/',
    );
  });

  test('mobile header does not overlay Contact on the wordmark (BEA-82)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const header = page.locator('header').first();
    const wordmark = header.getByText('Viselle', { exact: true });
    await expect(wordmark).toBeVisible();
    await expect(header.getByRole('link', { name: 'Contact' })).toHaveCount(0);
    await expect(header.getByRole('link', { name: 'Demo' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Get started' })).toBeVisible();
    await expect(header.getByRole('link', { name: 'Sign in' })).toBeVisible();

    const wordmarkBox = await wordmark.boundingBox();
    const demoBox = await header.getByRole('link', { name: 'Demo' }).boundingBox();
    expect(wordmarkBox).toBeTruthy();
    expect(demoBox).toBeTruthy();
    if (wordmarkBox && demoBox) {
      const overlaps =
        wordmarkBox.x < demoBox.x + demoBox.width &&
        wordmarkBox.x + wordmarkBox.width > demoBox.x &&
        wordmarkBox.y < demoBox.y + demoBox.height &&
        wordmarkBox.y + wordmarkBox.height > demoBox.y;
      expect(overlaps).toBe(false);
    }

    await expect(page.locator('footer').getByRole('link', { name: /Contact/i })).toBeVisible();
  });

  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Viselle' })).toBeVisible();
    await expect(page.getByText('Schedule Management System')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
  });
});
