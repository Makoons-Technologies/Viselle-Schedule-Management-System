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
    await page.getByRole('button', { name: 'Sources' }).click();
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

  test('pricing and docs routes render logged out', async ({ page }) => {
    await page.goto('/pricing');
    await expect(page.getByRole('heading', { name: /Plans & pricing/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Scheduling plans/i })).toBeVisible();
    await expect(page.getByText('$20', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('$49', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('$99', { exact: false }).first()).toBeVisible();

    await page.goto('/docs');
    await expect(page.getByRole('heading', { name: 'Docs' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Public booking API' })).toBeVisible();
    await expect(page.getByRole('main').getByRole('link', { name: 'llms.txt' })).toBeVisible();
  });

  test('blog and versus switcher pages render logged out', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.getByRole('heading', { name: 'Resources' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Viselle vs GlossGenius' })).toBeVisible();

    await page.goto('/versus/glossgenius');
    await expect(page.getByRole('heading', { name: 'Viselle vs GlossGenius' })).toBeVisible();
    await expect(page.getByLabel('Compare Viselle').getByRole('link', { name: 'vs Square' })).toBeVisible();

    await page.goto('/versus/square');
    await expect(page.getByRole('heading', { name: 'Viselle vs Square Appointments' })).toBeVisible();
    await expect(page.getByText(/not a card-present POS/i)).toBeVisible();
  });

  test('homepage trial CTA, steps, FAQ, and vertical chips', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('link', { name: 'Start free trial' }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: 'Request a demo' }).first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Live booking page today/i })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Questions owners actually ask/i })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Salon' })).toBeVisible();
    await page.getByRole('button', { name: 'Nail' }).click();
    await expect(page.getByText(/Nail studios use Viselle/i)).toBeVisible();
    await expect(page.getByText(/How much does Viselle cost/i)).toBeVisible();
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
