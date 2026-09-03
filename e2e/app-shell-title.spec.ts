import { expect, test, type Page } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  mockPlatformLogin,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

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

function readTitlePaint(page: Page) {
  return page.getByTestId('app-shell-title').evaluate((el) => {
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
}

function expectCrispTitlePaint(paint: Awaited<ReturnType<typeof readTitlePaint>>) {
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
  expect(paint.rowHeight).toBe(56);
  expect(paint.titleTop % 1).toBe(0);
}

// Chromium is a regression guard only. Joseph's iPhone PWA is the PASS criterion.
test.describe('BEA-78 app-shell title paint', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: IPHONE_UA,
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

    expectCrispTitlePaint(await readTitlePaint(page));
  });

  test('login-success toast dismiss does not put transform/filter on the title', async ({ page }) => {
    await emulateIosStandalonePwa(page);
    await page.addInitScript(() => {
      sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
    });
    await mockPlatformLogin(page, platformOwnerUser);
    await mockAuthMe(page, platformOwnerUser);
    await mockPlatformDashboardApis(page);

    await page.goto('/login');
    await page.getByLabel('Email').fill('platform-e2e@viselle.test');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/platform\/dashboard/);
    await expect(page.getByTestId('app-shell-title')).toHaveText('Viselle Platform');
    await expect(page.locator('html')).toHaveClass(/standalone-pwa/);
    await expect(page.locator('html')).toHaveClass(/app-shell/);

    const toast = page.locator('[data-sonner-toast]').filter({ hasText: 'Welcome back!' });
    await expect(toast).toBeVisible();

    const toastPaint = await toast.evaluate((el) => {
      const style = getComputedStyle(el);
      const toaster = el.closest('[data-sonner-toaster]');
      const toasterStyle = toaster ? getComputedStyle(toaster) : null;
      return {
        transform: style.transform,
        filter: style.filter,
        willChange: style.willChange,
        animationName: style.animationName,
        toasterY: toaster?.getAttribute('data-y-position') ?? '',
        toasterTransform: toasterStyle?.transform ?? '',
        toastTop: el.getBoundingClientRect().top,
        titleTop: document.querySelector('[data-testid="app-shell-title"]')?.getBoundingClientRect().top ?? 0,
        titleBottom: document.querySelector('[data-testid="app-shell-title"]')?.getBoundingClientRect().bottom ?? 0,
      };
    });

    expect(toastPaint.transform).toBe('none');
    expect(toastPaint.filter).toMatch(/^(none)?$/);
    expect(toastPaint.willChange).toMatch(/^(auto)?$/);
    expect(toastPaint.animationName === 'none' || toastPaint.animationName === '').toBeTruthy();
    expect(toastPaint.toasterY).toBe('bottom');
    expect(toastPaint.toasterTransform).toBe('none');
    // Must not sit on the title row (Joseph: smear when the top banner leaves).
    expect(toastPaint.toastTop).toBeGreaterThan(toastPaint.titleBottom + 8);

    await expect(toast).toHaveCount(0, { timeout: 8_000 });

    expectCrispTitlePaint(await readTitlePaint(page));

    const nav = page.getByTestId('app-shell-bottomnav');
    await expect(nav).toBeVisible();
    const navPad = await nav.evaluate((el) => ({
      position: getComputedStyle(el).position,
      paddingBottom: (el as HTMLElement).style.paddingBottom,
    }));
    expect(navPad.position).toBe('fixed');
    expect(navPad.paddingBottom).toBe('34px');
  });

  test('styles neutralize sonner toast transform without touching chrome backdrop-filter', async ({ page }) => {
    await emulateIosStandalonePwa(page);
    await page.addInitScript(() => {
      sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
    });
    await mockAuthMe(page, platformOwnerUser);
    await mockPlatformDashboardApis(page);
    await seedStoredToken(page);
    await page.goto('/platform/dashboard');

    const rules = await page.evaluate(() => {
      const texts: string[] = [];
      const walk = (list: CSSRuleList) => {
        for (const rule of list) {
          texts.push(rule.cssText);
          const nested = (rule as CSSGroupingRule).cssRules;
          if (nested) walk(nested);
        }
      };
      for (const sheet of document.styleSheets) {
        try {
          walk(sheet.cssRules);
        } catch {
          // Cross-origin sheets are not readable.
        }
      }
      return texts;
    });

    const sonnerToastRules = rules.filter((text) => text.includes('data-sonner-toast'));
    expect(sonnerToastRules.some((text) => /transform:\s*none/i.test(text))).toBe(true);
    expect(sonnerToastRules.some((text) => /transition:\s*none/i.test(text))).toBe(true);

    const chromeBackdrop = rules.filter((text) => {
      const sel = text.slice(0, text.indexOf('{') === -1 ? text.length : text.indexOf('{'));
      return (
        (sel.includes('app-shell-chrome') || sel.includes('app-shell-topbar') || sel.includes('app-shell-title')) &&
        /backdrop-filter/i.test(text)
      );
    });
    expect(chromeBackdrop).toEqual([]);
  });
});
