import type { Page } from '@playwright/test';

/** Matches `html.standalone-pwa` + `navigator.standalone`. */
export async function emulateIosStandalonePwa(page: Page) {
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

/**
 * Force the live content-inset token (Joseph iPhone frost height) without
 * a `#root` band. Uses !important so viewport settle cannot stamp 0px.
 */
export async function forceContentInsetTop(page: Page, px: number) {
  await page.addStyleTag({
    content: `:root, html { --app-shell-content-inset-top: ${px}px !important; --safe-area-top: ${px}px !important; }`,
  });
}

/**
 * Joseph's iPhone: 100vh (screen) is ~47px taller than the layout webview.
 * `#root` / `--app-shell-safe-pad-top` stay 0 (PR 60 gap). Do not zero
 * `--app-shell-content-inset-top` (PR 61 frosted banner text).
 */
export async function emulateStandaloneWebviewInsetBelowStatusBar(page: Page) {
  await page.addInitScript(() => {
    const SCREEN = 844;
    const LAYOUT = 797;
    const offsetDesc = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: function () {
        if (this instanceof HTMLElement && this.style.height === '100vh') {
          return SCREEN;
        }
        return offsetDesc?.get ? offsetDesc.get.call(this) : 0;
      },
    });
    const origRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function () {
      const rect = origRect.call(this);
      if (
        this instanceof HTMLElement &&
        this.style.position === 'fixed' &&
        (this.style.inset === '0px' || this.style.inset === '0') &&
        this.style.visibility === 'hidden'
      ) {
        return new DOMRect(rect.x, rect.y, rect.width, LAYOUT);
      }
      return rect;
    };
    const applyClientHeight = () => {
      if (!document.documentElement) return;
      Object.defineProperty(document.documentElement, 'clientHeight', {
        configurable: true,
        get: () => LAYOUT,
      });
    };
    applyClientHeight();
    document.addEventListener('DOMContentLoaded', applyClientHeight);
  });
}
