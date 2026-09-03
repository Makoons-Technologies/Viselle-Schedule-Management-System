import { expect, test } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

// Chromium is a regression guard only. Joseph's iPhone PWA is the PASS criterion.
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
      const headerStyle = header ? getComputedStyle(header) : null;
      const ancestorFlags: Array<{ tag: string; backdrop: string; filter: string; transform: string; opacity: string }> =
        [];
      let node: HTMLElement | null = el;
      while (node) {
        const cs = getComputedStyle(node);
        ancestorFlags.push({
          tag: node.tagName.toLowerCase(),
          backdrop: cs.backdropFilter || '',
          filter: cs.filter || '',
          transform: cs.transform || '',
          opacity: cs.opacity || '',
        });
        node = node.parentElement;
      }
      return {
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        fontSynthesis: style.fontSynthesis,
        textRendering: style.textRendering,
        webkitTextFill: style.getPropertyValue('-webkit-text-fill-color'),
        filter: style.filter,
        transform: style.transform,
        willChange: style.willChange,
        backdropFilter: style.backdropFilter,
        isolation: style.isolation,
        headerBackdrop: headerStyle?.backdropFilter ?? '',
        headerFilter: headerStyle?.filter ?? '',
        headerTransform: headerStyle?.transform ?? '',
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        titleTop: el.getBoundingClientRect().top,
        ancestorFlags,
      };
    });

    expect(paint.fontFamily.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(paint.fontFamily.toLowerCase()).not.toContain('inter');
    expect(paint.fontSize).toBe('16px');
    expect(paint.fontSynthesis).toMatch(/none/);
    expect(paint.textRendering).not.toBe('geometricPrecision');
    expect(paint.filter).toMatch(/^(none)?$/);
    expect(paint.transform).toBe('none');
    expect(paint.willChange).toMatch(/^(auto)?$/);
    expect(paint.isolation).toMatch(/^(auto)?$/);
    expect(paint.backdropFilter === 'none' || paint.backdropFilter === '').toBeTruthy();
    expect(paint.headerBackdrop === 'none' || paint.headerBackdrop === '').toBeTruthy();
    expect(paint.headerFilter).toMatch(/^(none)?$/);
    expect(paint.headerTransform).toBe('none');
    expect(
      paint.ancestorFlags.every(
        (node) =>
          (node.backdrop === 'none' || node.backdrop === '') &&
          (node.filter === 'none' || node.filter === '') &&
          (node.transform === 'none' || node.transform === '') &&
          node.opacity === '1',
      ),
    ).toBeTruthy();
    // Whole-pixel 56px title row (h-14). Title line box is 20px (h-5).
    expect(paint.rowHeight).toBe(56);
    expect(paint.titleTop % 1).toBe(0);
  });
});
