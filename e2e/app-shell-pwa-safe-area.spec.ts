import { expect, test, type Page } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function openPlatformOrganizations(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
  });
  await mockAuthMe(page, platformOwnerUser);
  await mockPlatformDashboardApis(page);
  await seedStoredToken(page);
  await page.goto('/platform/organizations');
  await expect(page.getByTestId('app-shell-title')).toHaveText('Viselle Platform');
}

async function emulateIosStandalonePwa(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'standalone', {
      configurable: true,
      get: () => true,
    });
    const original = window.matchMedia.bind(window);
    window.matchMedia = ((query: string) => {
      if (query.includes('display-mode: standalone')) {
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false;
          },
        } as MediaQueryList;
      }
      return original(query);
    }) as typeof window.matchMedia;
  });
}

test.describe('BEA-83 PWA safe-area chrome', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: IPHONE_UA,
  });

  test('standalone: no extra top pad; bottom nav uses safe-area inset', async ({ page }) => {
    await emulateIosStandalonePwa(page);
    await openPlatformOrganizations(page);

    await expect(page.locator('html')).toHaveClass(/standalone-pwa/);
    await expect(page.locator('html')).toHaveClass(/app-shell/);

    const chrome = page.getByTestId('app-shell-chrome');
    await expect(chrome).toBeHidden();

    const top = await page.getByTestId('app-shell-topbar').evaluate((el) => {
      const style = getComputedStyle(el);
      const row = el.querySelector(':scope > div');
      const title = el.querySelector('[data-testid="app-shell-title"]');
      const titleStyle = title ? getComputedStyle(title) : null;
      return {
        paddingTop: style.paddingTop,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        headerTop: el.getBoundingClientRect().top,
        titleFont: titleStyle?.fontFamily ?? '',
        titleFilter: titleStyle?.filter ?? '',
        titleTransform: titleStyle?.transform ?? '',
        titleBackdrop: titleStyle?.backdropFilter ?? '',
      };
    });

    // Opaque status bar already insets; extra BEA-78 notch pad is the leftover strip.
    expect(top.paddingTop).toBe('0px');
    expect(top.headerTop).toBe(0);
    expect(top.rowHeight).toBe(56);
    expect(top.titleFont.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(top.titleFont.toLowerCase()).not.toContain('inter');
    expect(top.titleFilter).toMatch(/^(none)?$/);
    expect(top.titleTransform).toBe('none');
    expect(top.titleBackdrop === 'none' || top.titleBackdrop === '').toBeTruthy();

    const nav = page.getByTestId('app-shell-bottomnav');
    await expect(nav).toBeVisible();

    const bottom = await nav.evaluate((el) => {
      const style = getComputedStyle(el);
      const icon = el.querySelector('svg');
      const iconBox = icon?.getBoundingClientRect();
      const navBox = el.getBoundingClientRect();
      return {
        paddingBottom: style.paddingBottom,
        safeAreaBottom: getComputedStyle(document.documentElement).getPropertyValue('--safe-area-bottom').trim(),
        iconBottom: iconBox?.bottom ?? 0,
        navBottom: navBox.bottom,
        viewportHeight: window.innerHeight,
      };
    });

    // iOS standalone fallback when env() is 0 (Chromium here; real iPhone when env lies).
    expect(parseFloat(bottom.paddingBottom)).toBeGreaterThanOrEqual(34);
    expect(bottom.safeAreaBottom).toBe('34px');
    expect(bottom.iconBottom).toBeLessThanOrEqual(bottom.navBottom - 34 + 0.5);
    expect(bottom.navBottom).toBeLessThanOrEqual(bottom.viewportHeight + 0.5);

    const cssUsesEnv = await page.evaluate(() => {
      const sheets = [...document.styleSheets];
      for (const sheet of sheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) {
          if (rule.cssText.includes('app-shell-bottomnav') && rule.cssText.includes('safe-area-inset-bottom')) {
            return true;
          }
        }
      }
      return false;
    });
    expect(cssUsesEnv).toBe(true);
  });

  test('Safari in-tab: topbar can still take notch pad; title paint unchanged', async ({ page }) => {
    await openPlatformOrganizations(page);

    await expect(page.locator('html')).not.toHaveClass(/standalone-pwa/);

    const top = await page.getByTestId('app-shell-topbar').evaluate((el) => {
      const style = getComputedStyle(el);
      const row = el.querySelector(':scope > div');
      const title = el.querySelector('[data-testid="app-shell-title"]');
      const titleStyle = title ? getComputedStyle(title) : null;
      return {
        paddingTop: style.paddingTop,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        titleFont: titleStyle?.fontFamily ?? '',
        titleFilter: titleStyle?.filter ?? '',
        titleTransform: titleStyle?.transform ?? '',
      };
    });

    // Chromium reports env() as 0 — pad stays 0. Title row must remain 56px (BEA-78).
    expect(top.paddingTop).toBe('0px');
    expect(top.rowHeight).toBe(56);
    expect(top.titleFont.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(top.titleFilter).toMatch(/^(none)?$/);
    expect(top.titleTransform).toBe('none');

    const navPad = await page.getByTestId('app-shell-bottomnav').evaluate((el) => getComputedStyle(el).paddingBottom);
    // Non-PWA: no 34px iOS fallback; utility floor is 0.5rem.
    expect(parseFloat(navPad)).toBe(8);
  });
});
