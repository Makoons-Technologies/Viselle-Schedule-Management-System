import { expect, test } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

test.describe('BEA-78 app-shell title paint', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('title uses system font and no compositor filter/transform', async ({ page }) => {
    await page.addInitScript(() => {
      sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
    });
    await mockAuthMe(page, platformOwnerUser);
    await mockPlatformDashboardApis(page);
    await seedStoredToken(page);

    await page.goto('/platform/dashboard');
    await expect(page.getByTestId('app-shell-title')).toHaveText('Viselle Platform');

    const paint = await page.getByTestId('app-shell-title').evaluate((el) => {
      const style = getComputedStyle(el);
      const header = el.closest('header');
      const row = header?.querySelector(':scope > div');
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        filter: style.filter,
        transform: style.transform,
        willChange: style.willChange,
        backdropFilter: style.backdropFilter,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
      };
    });

    expect(paint.fontFamily.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(paint.fontFamily.toLowerCase()).not.toContain('inter');
    expect(paint.fontSize).toBe('16px');
    expect(paint.filter).toMatch(/^(none)?$/);
    expect(paint.transform).toBe('none');
    expect(paint.willChange).toMatch(/^(auto)?$/);
    expect(paint.backdropFilter === 'none' || paint.backdropFilter === '').toBeTruthy();
    // Whole-pixel 56px title row (h-14). Not calc(3.5rem + safe-area) with items-center.
    expect(paint.rowHeight).toBe(56);
  });
});
