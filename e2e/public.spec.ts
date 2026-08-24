import { expect, test } from '@playwright/test';

test.describe('public marketing', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Scheduling that lets you focus on your clients/i }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign in' })).toBeVisible();
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
