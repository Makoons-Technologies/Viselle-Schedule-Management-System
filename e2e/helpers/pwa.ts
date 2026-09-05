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
 * Joseph's iPhone: 100vh (screen) is ~47px taller than the layout webview.
 * This heuristic must not collapse `--app-shell-safe-pad-top` — PR 56/58
 * zeroed the reserved band and frosted y=0 glyphs. The pad lives on `#root`,
 * not a white sibling slab (PR 57 gap) and not the banner box (PR 59 blur).
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
