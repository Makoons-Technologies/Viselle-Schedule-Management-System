import { expect, test, devices } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

test.describe('BEA-78 app-shell title paint', () => {
  test.use({
    ...devices['iPhone 14'],
  });

  test('title uses system font and no compositor filter/transform', async ({ page }) => {
    await page.addInitScript(() => {
      document.documentElement.style.setProperty('--safe-area-top', '47px');
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
      const headerStyle = header ? getComputedStyle(header) : null;
      const headerRect = header?.getBoundingClientRect();
      const titleRect = el.getBoundingClientRect();
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontSynthesis: style.fontSynthesis,
        webkitFontSmoothing: style.webkitFontSmoothing,
        filter: style.filter,
        transform: style.transform,
        isolation: style.isolation,
        backdropFilter: style.backdropFilter,
        webkitBackdropFilter: (style as CSSStyleDeclaration & { webkitBackdropFilter?: string })
          .webkitBackdropFilter,
        headerHeight: headerRect?.height ?? 0,
        headerPaddingTop: headerStyle?.paddingTop ?? '',
        titleTop: titleRect.top,
        titleHeight: titleRect.height,
      };
    });

    expect(paint.fontFamily.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(paint.fontFamily.toLowerCase()).not.toContain('inter');
    expect(paint.fontSize).toBe('16px');
    expect(paint.filter).toMatch(/^(none)?$/);
    expect(paint.transform).toBe('none');
    expect(paint.backdropFilter === 'none' || paint.backdropFilter === '').toBeTruthy();
    // Title sits in the 56px row below the 47px notch, not centered through it.
    expect(paint.headerPaddingTop).toBe('47px');
    expect(paint.headerHeight).toBe(103);
    expect(paint.titleTop).toBeGreaterThanOrEqual(47);
  });
});
