import { expect, test, type Page } from '@playwright/test';
import { emulateIosStandalonePwa, emulateStandaloneWebviewInsetBelowStatusBar } from './helpers/pwa';
import {
  impersonatedOrgOwnerUser,
  mockAuthMe,
  mockOrgDashboardApis,
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

    const statusBar = page.locator('meta[name="apple-mobile-web-app-status-bar-style"]');
    await expect(statusBar).toHaveAttribute('content', 'black');
    const themeColor = page.locator('meta[name="theme-color"]');
    await expect(themeColor).toHaveAttribute('content', '#ffffff');

    const slab = await page.getByTestId('app-shell-status-slab').evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        height: el.getBoundingClientRect().height,
        top: el.getBoundingClientRect().top,
        filter: style.filter,
        transform: style.transform,
        backdrop: style.backdropFilter,
        isolation: style.isolation,
        willChange: style.willChange,
        background: style.backgroundColor,
        slabVar: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-status-slab')
          .trim(),
        chromePad: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-chrome-pad-top')
          .trim(),
      };
    });

    // Empty white slab collapsed (PR 57 gap). Lead topbar owns max(env, 47) pad.
    expect(slab.height).toBe(0);
    expect(slab.top).toBe(0);
    expect(slab.slabVar).toBe('0px');
    expect(parseFloat(slab.chromePad)).toBeGreaterThanOrEqual(47);
    expect(slab.filter).toMatch(/^(none)?$/);
    expect(slab.transform).toBe('none');
    expect(slab.backdrop === 'none' || slab.backdrop === '').toBeTruthy();
    expect(slab.isolation).toMatch(/^(auto)?$/);
    expect(slab.willChange).toMatch(/^(auto)?$/);

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
        titleTop: title?.getBoundingClientRect().top ?? 0,
        titleFont: titleStyle?.fontFamily ?? '',
        titleFilter: titleStyle?.filter ?? '',
        titleTransform: titleStyle?.transform ?? '',
        titleBackdrop: titleStyle?.backdropFilter ?? '',
        headerBackdrop: style.backdropFilter,
        ancestorBackdrop,
      };
    });

    // Topbar is lead chrome: background at y=0, title row 56px below frost.
    expect(parseFloat(top.paddingTop)).toBeGreaterThanOrEqual(47);
    expect(top.headerTop).toBe(0);
    expect(top.titleTop).toBeGreaterThanOrEqual(47);
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
                sel.includes('app-shell-status-slab') ||
                sel.includes('app-shell-impersonation-banner') ||
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

    // BEA-83 leftover-chrome fix must not come back as a standalone 0-pad on the title.
    expect(joined.includes('--app-shell-topbar-pad-top')).toBe(false);
    // Empty slab is collapsed in CSS. Do not reintroduce a 47px white floor.
    expect(joined).not.toMatch(/html\.standalone-pwa\.app-shell\s*\{[^}]*--app-shell-status-slab:\s*47px/);
    expect(joined).not.toMatch(/--app-shell-chrome-pad-top:\s*47px/);
    expect(
      rules.some((text) => text.includes('app-shell-status-slab') && /min-height:\s*47px/.test(text)),
    ).toBe(false);
    expect(joined).toMatch(/--app-shell-chrome-pad-top:\s*env\(safe-area-inset-top/);
  });

  test('standalone: inset webview keeps empty slab at 0; topbar still pads below frost', async ({
    page,
  }) => {
    await emulateIosStandalonePwa(page);
    await emulateStandaloneWebviewInsetBelowStatusBar(page);
    await openPlatformDashboard(page);

    const geometry = await page.evaluate(() => {
      const vh = document.createElement('div');
      vh.setAttribute('aria-hidden', 'true');
      vh.style.cssText =
        'position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none;';
      document.body.appendChild(vh);
      const screenH = vh.offsetHeight;
      vh.remove();
      const layout = document.createElement('div');
      layout.setAttribute('aria-hidden', 'true');
      layout.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;';
      document.body.appendChild(layout);
      const layoutH = Math.round(layout.getBoundingClientRect().height);
      layout.remove();
      const slab = document.querySelector('[data-testid="app-shell-status-slab"]');
      const title = document.querySelector('[data-testid="app-shell-title"]');
      const header = document.querySelector('[data-testid="app-shell-topbar"]');
      const titleStyle = title ? getComputedStyle(title) : null;
      const headerStyle = header ? getComputedStyle(header) : null;
      const row = header?.querySelector(':scope > div');
      return {
        screenH,
        layoutH,
        clientH: document.documentElement.clientHeight,
        slabVar: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-status-slab')
          .trim(),
        chromePad: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-chrome-pad-top')
          .trim(),
        slabHeight: slab?.getBoundingClientRect().height ?? 0,
        slabMinHeight: slab ? getComputedStyle(slab).minHeight : '',
        titleTop: title?.getBoundingClientRect().top ?? 0,
        headerTop: header?.getBoundingClientRect().top ?? 0,
        headerPad: headerStyle?.paddingTop ?? '',
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        titleFilter: titleStyle?.filter ?? '',
        titleTransform: titleStyle?.transform ?? '',
        titleBackdrop: titleStyle?.backdropFilter ?? '',
        headerFilter: headerStyle?.filter ?? '',
        headerTransform: headerStyle?.transform ?? '',
        headerBackdrop: headerStyle?.backdropFilter ?? '',
        titleFont: titleStyle?.fontFamily ?? '',
      };
    });

    // Inset heuristic still fires, but it must not create a white slab gap
    // and must not put title glyphs in the frost band (PR 56/58).
    expect(geometry.screenH - geometry.layoutH).toBeGreaterThanOrEqual(40);
    expect(geometry.slabVar).toBe('0px');
    expect(geometry.slabHeight).toBe(0);
    expect(geometry.slabMinHeight === '0px' || geometry.slabMinHeight === 'auto').toBeTruthy();
    expect(parseFloat(geometry.chromePad)).toBeGreaterThanOrEqual(47);
    expect(parseFloat(geometry.headerPad)).toBeGreaterThanOrEqual(47);
    expect(geometry.headerTop).toBe(0);
    expect(geometry.titleTop).toBeGreaterThanOrEqual(47);
    expect(geometry.rowHeight).toBe(56);
    expect(geometry.titleFont.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(geometry.titleFilter).toMatch(/^(none)?$/);
    expect(geometry.titleTransform).toBe('none');
    expect(geometry.titleBackdrop === 'none' || geometry.titleBackdrop === '').toBeTruthy();
    expect(geometry.headerFilter).toMatch(/^(none)?$/);
    expect(geometry.headerTransform).toBe('none');
    expect(geometry.headerBackdrop === 'none' || geometry.headerBackdrop === '').toBeTruthy();
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

  test('Safari in-tab: empty slab; title row 56px; no standalone 47 floor', async ({ page }) => {
    await openPlatformDashboard(page);

    await expect(page.locator('html')).not.toHaveClass(/standalone-pwa/);

    const slabH = await page
      .getByTestId('app-shell-status-slab')
      .evaluate((el) => el.getBoundingClientRect().height);
    // Chromium reports env() as 0 and is not iOS standalone — no 47px fallback.
    expect(slabH).toBe(0);

    const top = await page.getByTestId('app-shell-topbar').evaluate((el) => {
      const style = getComputedStyle(el);
      const row = el.querySelector(':scope > div');
      const title = el.querySelector('[data-testid="app-shell-title"]');
      const titleStyle = title ? getComputedStyle(title) : null;
      return {
        paddingTop: style.paddingTop,
        headerTop: el.getBoundingClientRect().top,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
        titleFont: titleStyle?.fontFamily ?? '',
        titleFilter: titleStyle?.filter ?? '',
        titleTransform: titleStyle?.transform ?? '',
        chromePad: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-chrome-pad-top')
          .trim(),
      };
    });

    expect(parseFloat(top.paddingTop) || 0).toBe(0);
    expect(top.headerTop).toBe(0);
    expect(top.rowHeight).toBe(56);
    expect(parseFloat(top.chromePad) || 0).toBe(0);
    expect(top.titleFont.toLowerCase()).toMatch(/-apple-system|blinkmacsystemfont|sf pro|system-ui/);
    expect(top.titleFilter).toMatch(/^(none)?$/);
    expect(top.titleTransform).toBe('none');

    const navPad = await page
      .getByTestId('app-shell-bottomnav')
      .evaluate((el) => getComputedStyle(el).paddingBottom);
    // Non-PWA: no 34px iOS fallback; utility/content floor is 0.5rem.
    expect(parseFloat(navPad)).toBe(8);
  });

  test('standalone: ImpersonationBanner paints under status bar; text stays below frost', async ({
    page,
  }) => {
    await emulateIosStandalonePwa(page);
    await page.addInitScript(() => {
      sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
    });
    await mockAuthMe(page, impersonatedOrgOwnerUser);
    await mockOrgDashboardApis(page);
    await seedStoredToken(page);
    await page.goto('/orgs/org-e2e-1/dashboard');

    const banner = page.getByTestId('impersonation-banner');
    await expect(banner).toBeVisible();
    await expect(page.getByTestId('impersonation-banner-text')).toContainText(
      'Viewing as grokbot-subdomain-owner@viselle.test',
    );

    const geometry = await page.evaluate(() => {
      const bannerEl = document.querySelector('[data-testid="impersonation-banner"]');
      const textEl = document.querySelector('[data-testid="impersonation-banner-text"]');
      const header = document.querySelector('[data-testid="app-shell-topbar"]');
      const title = document.querySelector('[data-testid="app-shell-title"]');
      const slab = document.querySelector('[data-testid="app-shell-status-slab"]');
      const bannerStyle = bannerEl ? getComputedStyle(bannerEl) : null;
      const textStyle = textEl ? getComputedStyle(textEl) : null;
      const headerStyle = header ? getComputedStyle(header) : null;
      const row = header?.querySelector(':scope > div');
      return {
        slabHeight: slab?.getBoundingClientRect().height ?? 0,
        slabVar: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-status-slab')
          .trim(),
        chromePad: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-chrome-pad-top')
          .trim(),
        bannerTop: bannerEl?.getBoundingClientRect().top ?? -1,
        bannerPad: bannerStyle?.paddingTop ?? '',
        textTop: textEl?.getBoundingClientRect().top ?? -1,
        bannerBg: bannerStyle?.backgroundColor ?? '',
        bannerFilter: bannerStyle?.filter ?? '',
        bannerTransform: bannerStyle?.transform ?? '',
        bannerBackdrop: bannerStyle?.backdropFilter ?? '',
        bannerIsolation: bannerStyle?.isolation ?? '',
        textFilter: textStyle?.filter ?? '',
        textTransform: textStyle?.transform ?? '',
        headerTop: header?.getBoundingClientRect().top ?? -1,
        headerPad: headerStyle?.paddingTop ?? '',
        titleTop: title?.getBoundingClientRect().top ?? -1,
        rowHeight: row?.getBoundingClientRect().height ?? 0,
      };
    });

    expect(geometry.slabHeight).toBe(0);
    expect(geometry.slabVar).toBe('0px');
    expect(parseFloat(geometry.chromePad)).toBeGreaterThanOrEqual(47);
    expect(geometry.bannerTop).toBe(0);
    expect(parseFloat(geometry.bannerPad)).toBeGreaterThanOrEqual(47);
    expect(geometry.textTop).toBeGreaterThanOrEqual(47);
    expect(geometry.bannerBg.toLowerCase()).not.toMatch(/rgba?\(255,\s*255,\s*255|#fff/);
    expect(geometry.bannerFilter).toMatch(/^(none)?$/);
    expect(geometry.bannerTransform).toBe('none');
    expect(geometry.bannerBackdrop === 'none' || geometry.bannerBackdrop === '').toBeTruthy();
    expect(geometry.bannerIsolation).toMatch(/^(auto)?$/);
    expect(geometry.textFilter).toMatch(/^(none)?$/);
    expect(geometry.textTransform).toBe('none');
    expect(parseFloat(geometry.headerPad) || 0).toBe(0);
    expect(geometry.headerTop).toBeGreaterThan(geometry.textTop);
    expect(geometry.titleTop).toBeGreaterThan(geometry.headerTop);
    expect(geometry.rowHeight).toBe(56);
  });

  test('standalone inset + ImpersonationBanner: no white slab gap; banner text below frost', async ({
    page,
  }) => {
    await emulateIosStandalonePwa(page);
    await emulateStandaloneWebviewInsetBelowStatusBar(page);
    await page.addInitScript(() => {
      sessionStorage.setItem('viselle.a2hs-banner.dismissed', '1');
    });
    await mockAuthMe(page, impersonatedOrgOwnerUser);
    await mockOrgDashboardApis(page);
    await seedStoredToken(page);
    await page.goto('/orgs/org-e2e-1/dashboard');

    await expect(page.getByTestId('impersonation-banner')).toBeVisible();

    const geometry = await page.evaluate(() => {
      const bannerEl = document.querySelector('[data-testid="impersonation-banner"]');
      const textEl = document.querySelector('[data-testid="impersonation-banner-text"]');
      const slab = document.querySelector('[data-testid="app-shell-status-slab"]');
      return {
        slabHeight: slab?.getBoundingClientRect().height ?? 0,
        slabVar: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-status-slab')
          .trim(),
        chromePad: getComputedStyle(document.documentElement)
          .getPropertyValue('--app-shell-chrome-pad-top')
          .trim(),
        bannerTop: bannerEl?.getBoundingClientRect().top ?? -1,
        bannerPad: bannerEl ? getComputedStyle(bannerEl).paddingTop : '',
        textTop: textEl?.getBoundingClientRect().top ?? -1,
      };
    });

    expect(geometry.slabHeight).toBe(0);
    expect(geometry.slabVar).toBe('0px');
    expect(parseFloat(geometry.chromePad)).toBeGreaterThanOrEqual(47);
    expect(geometry.bannerTop).toBe(0);
    expect(parseFloat(geometry.bannerPad)).toBeGreaterThanOrEqual(47);
    expect(geometry.textTop).toBeGreaterThanOrEqual(47);
  });
});
