const KEYBOARD_OPEN_THRESHOLD = 80;

export const SETTLE_DELAYS_MS = [50, 150, 350, 700] as const;
export const KEYBOARD_CLOSE_DELAYS_MS = [80, 200, 400, 600] as const;
export const FIRST_SHELL_SETTLE_DELAYS_MS = [0, 16, 32, 64, 128, 250, 500, 1000] as const;

/** Matches CSS (`html.standalone-pwa`). `navigator.standalone` can be true when the media query is not. */
export const STANDALONE_PWA_CLASS = 'standalone-pwa';

/** Portrait iPhone home-indicator height when `env(safe-area-inset-bottom)` reports 0. */
export const IOS_STANDALONE_HOME_INDICATOR_FALLBACK_PX = 34;

/**
 * Notch / Dynamic Island height used when `env(safe-area-inset-top)` is 0 but
 * the webview is still edge-to-edge (`viewport-fit=cover`). Matches the PR 41
 * Joseph PASS (title at y=57 below a 47px slab). Do not invent a larger band.
 */
export const IOS_STANDALONE_STATUS_BAR_FALLBACK_PX = 47;

/** Opaque app-shell chrome / theme-color. Marketing splash stays `#2a0f1e`. */
export const APP_SHELL_THEME_COLOR_LIGHT = '#ffffff';
export const APP_SHELL_THEME_COLOR_DARK = '#1c1917';

/** 0.5rem floor matching the old `pb-safe-or-2` content inset. */
export const APP_SHELL_BOTTOMNAV_CONTENT_PAD_PX = 8;

/**
 * pt-1 (4px) + min-h-12 tab links (48px). Used with the home-indicator pad
 * for the in-flow spacer under a `position:fixed` standalone tab bar.
 */
export const APP_SHELL_BOTTOMNAV_CONTENT_HEIGHT_PX = 52;

/**
 * Safari-in-tab only. WebKit drops `max()` when `env(safe-area-inset-bottom)`
 * is an argument (PR 46 FAIL). Standalone uses a literal pixel string instead.
 */
export const APP_SHELL_BOTTOMNAV_PAD_STYLE = 'max(0.5rem, var(--safe-area-bottom))';

/**
 * CSS fallback for --app-height on iOS standalone. `100vh` is the SCREEN
 * (status bar + webview) while `black` status-bar-style already places the
 * webview below the status bar — so 100vh overflows by ~47–59px and clips
 * the tab bar (BEA-83, PRs 46/47). `-webkit-fill-available` is the webview.
 */
export const APP_SHELL_STANDALONE_HEIGHT_FALLBACK = '-webkit-fill-available';

const FIRST_SHELL_SESSION_KEY = 'viselle-pwa-first-shell-viewport';

/** Largest keyboard-closed height seen this orientation. Survives iOS shrinking 100vh after the keyboard. */
let rememberedClosedHeightPx = 0;
let vhProbe: HTMLDivElement | null = null;

export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** Keep `html.standalone-pwa` in sync so CSS does not depend only on `@media (display-mode)`. */
export function applyStandalonePwaClass(root: HTMLElement = document.documentElement): void {
  root.classList.toggle(STANDALONE_PWA_CLASS, isStandaloneWebApp());
}

/** iOS standalone cold start under-reports innerHeight/visualViewport (WebKit #254868). */
export function isIosStandaloneWebApp(): boolean {
  if (!isStandaloneWebApp() || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOs;
}

export function isKeyboardOpen(): boolean {
  const vv = window.visualViewport;
  return Boolean(vv && window.innerHeight - vv.height > KEYBOARD_OPEN_THRESHOLD);
}

export function measureBrowserAppHeight(): number {
  const vv = window.visualViewport;
  const inner = window.innerHeight;
  if (!vv) return inner;
  return Math.max(inner, Math.round(vv.height + vv.offsetTop));
}

/** Live CSS 100vh in pixels. Do not use this to size the iOS standalone shell. */
export function measureCss100vh(): number {
  if (typeof document === 'undefined' || !document.body) return 0;
  if (!vhProbe) {
    vhProbe = document.createElement('div');
    vhProbe.setAttribute('aria-hidden', 'true');
    vhProbe.style.cssText =
      'position:fixed;top:0;left:0;width:0;height:100vh;visibility:hidden;pointer-events:none;';
    document.body.appendChild(vhProbe);
  }
  return vhProbe.offsetHeight;
}

/**
 * Layout viewport — the webview box `position:fixed;inset:0` actually gets.
 * On iOS standalone + opaque status bar this is shorter than `100vh` (the
 * screen) and more honest than cold-start `innerHeight` (WebKit #254868).
 */
export function measureLayoutViewportHeight(): number {
  if (typeof document === 'undefined') return 0;
  const client = document.documentElement?.clientHeight || 0;
  const parent = document.body || document.documentElement;
  if (!parent) return client;
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText = 'position:fixed;inset:0;visibility:hidden;pointer-events:none;';
  parent.appendChild(el);
  const probe = Math.round(el.getBoundingClientRect().height);
  el.remove();
  return Math.max(client, probe);
}

/** CSS `-webkit-fill-available` in pixels (the webview, not the device screen). */
export function measureCssFillAvailable(): number {
  if (typeof document === 'undefined') return 0;
  const parent = document.body || document.documentElement;
  if (!parent) return 0;
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    'position:fixed;top:0;left:0;width:0;height:-webkit-fill-available;visibility:hidden;pointer-events:none;';
  parent.appendChild(el);
  const px = el.offsetHeight || 0;
  el.remove();
  return px;
}

/** Literal pixel pad for the tab bar. Never `max()`+`env()` — WebKit drops that. */
export function resolveBottomNavPadPx(): number {
  return Math.max(APP_SHELL_BOTTOMNAV_CONTENT_PAD_PX, resolveSafeAreaBottomPx(measureCssEnvInset('bottom')));
}

export function getStandaloneBottomNavPadCSSValue(): string {
  return `${IOS_STANDALONE_HOME_INDICATOR_FALLBACK_PX}px`;
}

export function getKeyboardInsetPx(): number {
  if (!isKeyboardOpen()) return 0;
  const vv = window.visualViewport;
  const layout = measureLayoutViewportHeight();
  const visual = vv ? Math.round(vv.height + vv.offsetTop) : measureBrowserAppHeight();
  return Math.max(0, layout - visual);
}

export function resetRememberedAppHeight(): void {
  rememberedClosedHeightPx = 0;
}

export function getRememberedClosedHeightPx(): number {
  return rememberedClosedHeightPx;
}

function observeClosedHeight(px: number): void {
  if (px > rememberedClosedHeightPx) {
    rememberedClosedHeightPx = px;
  }
}

/**
 * CSS value for --app-height.
 *
 * iOS standalone must NOT use `100vh`. With `apple-mobile-web-app-status-bar-style:
 * black`, the webview is already below the status bar, but `100vh` is still the
 * full device height. The shell overflows by the status-bar (~47–59px), the
 * 34px home-indicator pad lands in the clipped overflow, and only the top of
 * the tab icons show (BEA-83, Joseph 2026-09-03). Size to the layout viewport
 * / `-webkit-fill-available` instead.
 */
export function getAppHeightCSSValue(): string {
  const measured = measureBrowserAppHeight();
  const keyboard = isKeyboardOpen();

  if (keyboard) {
    return `${measured}px`;
  }

  if (isIosStandaloneWebApp()) {
    const layout = measureLayoutViewportHeight();
    const fill = measureCssFillAvailable();
    const h = Math.max(measured, layout, fill);
    if (h >= 400) {
      observeClosedHeight(h);
    }
    if (rememberedClosedHeightPx > 0) {
      return `${rememberedClosedHeightPx}px`;
    }
    return h >= 400 ? `${h}px` : APP_SHELL_STANDALONE_HEIGHT_FALLBACK;
  }

  observeClosedHeight(measured);
  return `${measured}px`;
}

export function setAppHeightCSSProperty(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--app-height', getAppHeightCSSValue());
  setSafeAreaCSSProperties(root);
  root.style.setProperty('--app-shell-keyboard-inset', `${getKeyboardInsetPx()}px`);
}

/**
 * Measure live `env(safe-area-inset-*)`. iOS standalone can leave :root tokens at 0px
 * while 100vh still paints under the home indicator (BEA-83).
 */
export function measureCssEnvInset(edge: 'top' | 'right' | 'bottom' | 'left'): number {
  if (typeof document === 'undefined' || !document.body) return 0;
  const el = document.createElement('div');
  el.setAttribute('aria-hidden', 'true');
  el.style.cssText =
    `position:fixed;visibility:hidden;pointer-events:none;padding-${edge}:env(safe-area-inset-${edge},0px)`;
  document.body.appendChild(el);
  const px = parseFloat(getComputedStyle(el).getPropertyValue(`padding-${edge}`)) || 0;
  el.remove();
  return px;
}

/** iOS standalone always keeps at least the home-indicator floor, even if env() is a lie > 0. */
export function resolveSafeAreaBottomPx(measuredPx: number): number {
  if (isIosStandaloneWebApp()) {
    return Math.max(measuredPx, IOS_STANDALONE_HOME_INDICATOR_FALLBACK_PX);
  }
  return measuredPx;
}

/**
 * True when `100vh` (device screen) is taller than the layout webview by a
 * status-bar. Kept as a probe for tests; it must NOT zero lead-chrome pad.
 * PR 56/58 used this to collapse the empty slab and put the first glyphs
 * (title, then ImpersonationBanner) under iOS frost on Joseph's PWA.
 */
export function isStandaloneWebviewInsetBelowStatusBar(): boolean {
  if (!isIosStandaloneWebApp()) return false;
  const screenH = measureCss100vh();
  const layoutH = measureLayoutViewportHeight();
  if (screenH < 400 || layoutH < 400) return false;
  return screenH - layoutH >= 40;
}

/**
 * Top safe-area **padding** for the first chrome surface (ImpersonationBanner
 * when present, otherwise Topbar). Background of that surface paints through
 * the pad (full-bleed under the status bar). Glyphs start below the frost.
 *
 * Do not put this value on an empty white `.app-shell-status-slab` — that is
 * the Joseph 2026-09-05 gap (PR 57) when the next sibling is orange.
 * Do not zero it when the webview “looks inset” (PR 56/58) — Joseph's PWA
 * still frosts y=0 of the webview after delete+reinstall.
 *
 * iOS standalone: max(env, 47). Safari-in-tab / desktop: live env() only.
 */
export function resolveSafeAreaTopPx(measuredPx: number): number {
  if (!isIosStandaloneWebApp()) {
    return measuredPx;
  }
  return Math.max(measuredPx, IOS_STANDALONE_STATUS_BAR_FALLBACK_PX);
}

export function setSafeAreaCSSProperties(root: HTMLElement = document.documentElement): void {
  const topPx = resolveSafeAreaTopPx(measureCssEnvInset('top'));
  const bottomPx = resolveSafeAreaBottomPx(measureCssEnvInset('bottom'));
  const navPadPx = Math.max(APP_SHELL_BOTTOMNAV_CONTENT_PAD_PX, bottomPx);
  root.style.setProperty('--safe-area-top', `${topPx}px`);
  root.style.setProperty('--app-shell-chrome-pad-top', `${topPx}px`);
  // Empty sibling slab stays collapsed. Lead chrome owns paint + pad.
  root.style.setProperty('--app-shell-status-slab', '0px');
  root.style.setProperty('--safe-area-bottom', `${bottomPx}px`);
  root.style.setProperty('--app-shell-bottomnav-pad', `${navPadPx}px`);
}

/**
 * Pin the layout viewport to (0, 0) without touching nested overflow panes.
 * Reading/assigning `document.body.scrollTop` when `body` is null throws
 * (`Cannot read properties of null (reading 'scrollTop')`) and aborts
 * compositor fling. `window.scrollTo` during a gesture does the same.
 */
export function resetWindowScroll(): void {
  try {
    const windowX = window.scrollX ?? 0;
    const windowY = window.scrollY ?? 0;
    if (windowX === 0 && windowY === 0) return;
    // Window scroller only. Do not assign documentElement/body.scrollTop —
    // that cancels nested overflow-x momentum on iOS/WebKit, and body can
    // be null during early settle (`reading 'scrollTop'`).
    window.scrollTo(0, 0);
  } catch {
    // Viewport settle must never throw.
  }
}

/** Brief scroll nudge can trigger iOS standalone viewport "docking" without rotating. */
export function nudgeStandaloneViewportRecalc(): void {
  if (!isIosStandaloneWebApp()) return;
  window.scrollTo(0, 1);
  requestAnimationFrame(() => {
    window.scrollTo(0, 0);
  });
}

/** Once per PWA session after the authenticated shell mounts (post-login redirect). */
export function shouldRunFirstShellViewportBurst(): boolean {
  if (!isIosStandaloneWebApp()) return false;
  try {
    if (sessionStorage.getItem(FIRST_SHELL_SESSION_KEY)) return false;
    sessionStorage.setItem(FIRST_SHELL_SESSION_KEY, '1');
    return true;
  } catch {
    return true;
  }
}
