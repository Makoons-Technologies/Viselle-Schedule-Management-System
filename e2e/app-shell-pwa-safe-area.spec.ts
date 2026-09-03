import { expect, test, type Page } from '@playwright/test';
import {
  mockAuthMe,
  mockPlatformDashboardApis,
  platformOwnerUser,
  seedStoredToken,
} from './helpers/session';

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

async function openPlatformDashboard(page: Page) {
  await page.addInitScript(() => {
    sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
  });
  await mockAuthMe(page, platformOwnerUser);
  await mockPlatformDashboardApis(page);
  await seedStoredToken(page);
  await page.goto('/platform/dashboard');
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

function collectStyleRules(page: Page) {
  return page.evaluate(() => {
    const texts: string[] = [];
    const walk = (rules: CSSRuleList) => {
      for (const rule of rules) {
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
}

// Chromium is a regression guard only. Joseph's iPhone PWA is the PASS criterion.
test.describe('BEA-83 PWA safe-area chrome', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
    userAgent: IPHONE_UA,
  });

  test('standalone: webview-sized shell, fixed tab bar, literal 34px pad, no 100vh', async ({
    page,
  }) => {
    await emulateIosStandalonePwa(page);
    await openPlatformDashboard(page);

    await expect(page.locator('html')).toHaveClass(/standalone-pwa/);
    await expect(page.locator('html')).toHaveClass(/app-shell/);

    const chrome = page.getByTestId('app-shell-chrome');
    await expect(chrome).toBeHidden();

    const top = await page.getByTestId('app-shell-topbar').evaluate((el) => {
      const style = getComputedStyle(el);
      const row = el.querySelector(':scope > div');
      const title = el.querySelector('[data-testid="app-shell-title"]');
      const titleStyle = title ? getComputedStyle(title) : null;
      const ancestorBackdrop: string[] = [];
      let node: HTMLElement | null = el;
      while (node) {
        const cs = getComputedStyle(node);
        ancestorBackdrop.push(cs.backdropFilter || cs.getPropertyValue('backdrop-filter'));
        node = node.parentElement;
      }
      return {
        paddingTop: style.paddingTop,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        headerTop: el.getBoundingClientRect().top,
        titleFont: titleStyle?.fontFamily ?? '',
        titleFilter: titleStyle?.filter ?? '',
        titleTransform: titleStyle?.transform ?? '',
        titleBackdrop: titleStyle?.backdropFilter ?? '',
        headerBackdrop: style.backdropFilter,
        ancestorBackdrop,
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
    expect(top.headerBackdrop === 'none' || top.headerBackdrop === '').toBeTruthy();
    expect(top.ancestorBackdrop.every((value) => value === 'none' || value === '')).toBeTruthy();

    const nav = page.getByTestId('app-shell-bottomnav');
    await expect(nav).toBeVisible();

    const bottom = await nav.evaluate((el) => {
      const style = getComputedStyle(el);
      const icon = el.querySelector('svg');
      const label = el.querySelector('span');
      const iconBox = icon?.getBoundingClientRect();
      const labelBox = label?.getBoundingClientRect();
      const navBox = el.getBoundingClientRect();
      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;';
      document.body.appendChild(probe);
      const layoutH = Math.round(probe.getBoundingClientRect().height);
      probe.remove();
      return {
        paddingBottom: style.paddingBottom,
        inlinePad: (el as HTMLElement).style.paddingBottom,
        position: style.position,
        bottom: style.bottom,
        safeAreaBottom: getComputedStyle(document.documentElement)
          .getPropertyValue('--safe-area-bottom')
          .trim(),
        navPadVar: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-bottomnav-pad')
          .trim(),
        appHeight: getComputedStyle(document.documentElement).getPropertyValue('--app-height').trim(),
        iconBottom: iconBox?.bottom ?? 0,
        labelBottom: labelBox?.bottom ?? 0,
        navBottom: navBox.bottom,
        viewportHeight: window.innerHeight,
        layoutHeight: layoutH,
        rootHeight: document.getElementById('root')?.getBoundingClientRect().height ?? 0,
      };
    });

    // PRs 46/47: 34px pad sat off-screen because --app-height was 100vh (screen).
    expect(bottom.appHeight).not.toBe('100vh');
    expect(bottom.appHeight.includes('100vh')).toBe(false);
    expect(bottom.appHeight === '-webkit-fill-available' || parseFloat(bottom.appHeight) > 0).toBeTruthy();
    expect(bottom.rootHeight).toBeLessThanOrEqual(bottom.layoutHeight + 0.5);
    expect(bottom.position).toBe('fixed');
    expect(bottom.bottom).toBe('0px');

    // Literal pixel pad — not env() inside max() (PR 46) and not a var-only hope.
    expect(parseFloat(bottom.paddingBottom)).toBeGreaterThanOrEqual(34);
    expect(bottom.safeAreaBottom).toBe('34px');
    expect(bottom.navPadVar).toBe('34px');
    expect(bottom.inlinePad).toBe('34px');
    expect(bottom.inlinePad).not.toContain('safe-area-inset-bottom');
    expect(bottom.inlinePad).not.toContain('max(');
    expect(bottom.iconBottom).toBeLessThanOrEqual(bottom.navBottom - 34 + 0.5);
    expect(bottom.labelBottom).toBeLessThanOrEqual(bottom.navBottom - 34 + 0.5);
    expect(bottom.navBottom).toBeLessThanOrEqual(Math.min(bottom.viewportHeight, bottom.layoutHeight) + 0.5);

    const spacer = page.getByTestId('app-shell-bottomnav-spacer');
    await expect(spacer).toBeAttached();
    const spacerH = await spacer.evaluate((el) => el.getBoundingClientRect().height);
    expect(spacerH).toBeGreaterThanOrEqual(52 + 34);

    const rules = await collectStyleRules(page);
    const joined = rules.join('\n');
    expect(joined.includes('--app-shell-bottomnav-pad: 34px') || joined.includes('--app-shell-bottomnav-pad:34px')).toBe(
      true,
    );
    expect(joined).toMatch(/var\(--app-shell-bottomnav-pad,\s*34px\)/);
    expect(joined).toContain('-webkit-fill-available');
    expect(rules.some((text) => /height:\s*var\(--app-height,\s*100vh\)/.test(text))).toBe(false);

    // The PR 46 pattern WebKit dropped on Joseph's iPhone.
    const maxWithEnv = rules.some(
      (text) =>
        text.includes('app-shell-bottomnav') &&
        text.includes('max(') &&
        text.includes('safe-area-inset-bottom') &&
        text.includes('padding-bottom'),
    );
    expect(maxWithEnv).toBe(false);

    // Do not reintroduce backdrop-filter on chrome (even `none` composites).
    const chromeBackdrop = await page.evaluate(() => {
      const hits: string[] = [];
      const walk = (list: CSSRuleList) => {
        for (const rule of list) {
          if (rule instanceof CSSStyleRule) {
            const sel = rule.selectorText || '';
            if (
              (sel.includes('app-shell-chrome') ||
                sel.includes('app-shell-topbar') ||
                sel.includes('app-shell-title')) &&
              (rule.style.backdropFilter || rule.style.getPropertyValue('backdrop-filter'))
            ) {
              hits.push(rule.cssText);
            }
          }
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
      return hits;
    });
    expect(chromeBackdrop).toEqual([]);
  });

  test('standalone: drawer open must not be required for tab padding', async ({ page }) => {
    await emulateIosStandalonePwa(page);
    await openPlatformDashboard(page);

    const nav = page.getByTestId('app-shell-bottomnav');
    const closedPad = await nav.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expect(closedPad).toBeGreaterThanOrEqual(34);

    await page.getByRole('button', { name: 'Open menu' }).click();
    const drawerFooter = page.getByLabel('Navigation menu').getByText('Powered by Makoons Technologies');
    await expect(drawerFooter).toBeVisible();

    const openPad = await nav.evaluate((el) => parseFloat(getComputedStyle(el).paddingBottom));
    expect(openPad).toBeGreaterThanOrEqual(34);

    const footerPad = await drawerFooter.evaluate((el) => {
      const footer = el.closest('div');
      return footer ? parseFloat(getComputedStyle(footer).paddingBottom) : 0;
    });
    expect(footerPad).toBeGreaterThanOrEqual(12);
  });

  test('Safari in-tab: topbar can still take notch pad; title paint unchanged', async ({ page }) => {
    await openPlatformDashboard(page);

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

    const navPad = await page
      .getByTestId('app-shell-bottomnav')
      .evaluate((el) => getComputedStyle(el).paddingBottom);
    // Non-PWA: no 34px iOS fallback; utility/content floor is 0.5rem.
    expect(parseFloat(navPad)).toBe(8);
  });
});
