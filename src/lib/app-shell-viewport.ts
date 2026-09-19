const KEYBOARD_OPEN_THRESHOLD = 80;

export const SETTLE_DELAYS_MS = [50, 150, 350, 700] as const;
export const KEYBOARD_CLOSE_DELAYS_MS = [80, 200, 400, 600] as const;
export const FIRST_SHELL_SETTLE_DELAYS_MS = [0, 16, 32, 64, 128, 250, 500, 1000] as const;

/** Matches CSS (`html.standalone-pwa`). `navigator.standalone` can be true when the media query is not. */
export const STANDALONE_PWA_CLASS = 'standalone-pwa';

/** Literal portrait iPhone home-indicator pad. Not `env(safe-area-inset-*)`. */
export const IOS_STANDALONE_HOME_INDICATOR_FALLBACK_PX = 34;

/**
 * Observed iPhone status-bar / Dynamic Island height. Never a `#root` pad,
 * chrome pad, or slab floor — that band is the frost / opaque gap.
 */
export const IOS_STANDALONE_STATUS_BAR_FALLBACK_PX = 47;

/** Always 0. Do not pad chrome or `#root` for the island. */
export const APP_SHELL_CONTENT_INSET_TOP_CSS = '0px';

/** `#root` must not reserve a painted band under the clock. */
export const APP_SHELL_ROOT_SAFE_PAD_TOP_CSS = '0px';

/** Opaque OS status bar + theme-color. Cached at PWA install. */
export const APP_SHELL_STATUS_BAR_STYLE = 'default';

/** Opaque app-shell chrome / theme-color. PWA splash matches the logged-in shell. */
export const APP_SHELL_THEME_COLOR_LIGHT = '#ffffff';
export const APP_SHELL_THEME_COLOR_DARK = '#1c1917';

/** Matches Tailwind `bg-amber-500` on ImpersonationBanner — not a white gap strip. */
export const APP_SHELL_THEME_COLOR_IMPERSONATING = '#f59e0b';

/** html class so page/root background matches the orange banner (no white slab). */
export const APP_SHELL_IMPERSONATING_CLASS = 'app-shell-impersonating';

/** Webview is already inside the safe area — no `viewport-fit=cover` frost over the title. */
export const APP_SHELL_FIT_INSET_CLASS = 'app-shell-fit-inset';

export const APP_SHELL_VIEWPORT_COVER =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=overlays-content';

export const APP_SHELL_VIEWPORT_INSET =
  'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, interactive-widget=overlays-content';

/** 0.5rem tab-bar pad when the webview is already inset. */
export const APP_SHELL_BOTTOMNAV_CONTENT_PAD_PX = 8;

/**
 * pt-1 (4px) + min-h-12 tab links (48px). Used with the home-indicator pad
 * for the in-flow spacer under a `position:fixed` standalone tab bar.
 */
export const APP_SHELL_BOTTOMNAV_CONTENT_HEIGHT_PX = 52;

/** Safari-in-tab tab-bar pad. Literal rem — no `env(safe-area-inset-*)`. */
export const APP_SHELL_BOTTOMNAV_PAD_STYLE = '0.5rem';

/**
 * CSS fallback for --app-height on iOS standalone. `100vh` is the SCREEN
 * (status bar + webview) while an opaque status-bar-style (`default`) already
 * places the webview below the status bar — so 100vh overflows by ~47–59px
 * and clips the tab bar (BEA-83, PRs 46/47). `-webkit-fill-available` is
 * the webview.
 */
export const APP_SHELL_STANDALONE_HEIGHT_FALLBACK = '-webkit-fill-available';

const FIRST_SHELL_SESSION_KEY = 'viselle-pwa-first-shell-viewport';

/** Temporary Windows inspect flag. `?force-pwa=0` turns it off. */
export const FORCE_PWA_QUERY = 'force-pwa';
export const FORCE_PWA_STORAGE_KEY = 'viselle-force-pwa';

/** Largest keyboard-closed height seen this orientation. Survives iOS shrinking 100vh after the keyboard. */
let rememberedClosedHeightPx = 0;
let vhProbe: HTMLDivElement | null = null;

/** Temporary: `?force-pwa` pretends this tab is the installed PWA. */
export function isForcePwaEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(FORCE_PWA_QUERY)) {
      const off = params.get(FORCE_PWA_QUERY) === '0' || params.get(FORCE_PWA_QUERY) === 'false';
      if (off) sessionStorage.removeItem(FORCE_PWA_STORAGE_KEY);
      else sessionStorage.setItem(FORCE_PWA_STORAGE_KEY, '1');
      return !off;
    }
    return sessionStorage.getItem(FORCE_PWA_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  if (isForcePwaEnabled()) return true;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
}

/** Keep `html.standalone-pwa` in sync so CSS does not depend only on `@media (display-mode)`. */
export function applyStandalonePwaClass(root: HTMLElement = document.documentElement): void {
  root.classList.toggle(STANDALONE_PWA_CLASS, isStandaloneWebApp());
}

/** iPhone / iPad WebKit — including Safari-in-tab. */
export function isIosWebKit(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iPadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/i.test(ua) || iPadOs;
}

/** iOS standalone cold start under-reports innerHeight/visualViewport (WebKit #254868). */
export function isIosStandaloneWebApp(): boolean {
  return isStandaloneWebApp() && isIosWebKit();
}

const IOS_INSET_HTML_RELOAD_KEY = 'viselle-ios-inset-html';

/**
 * iOS locks `viewport-fit` on the first HTML parse and ignores later meta edits.
 * Old documents parsed with cover keep frosting "Viselle Platform" until reload.
 */
export function reloadIosStandaloneIfLegacyCoverHtml(): boolean {
  if (!isIosStandaloneWebApp() || typeof document === 'undefined') return false;
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta?.getAttribute('data-viselle-fit') === 'inset') return false;
  try {
    if (sessionStorage.getItem(IOS_INSET_HTML_RELOAD_KEY) === '1') return false;
    sessionStorage.setItem(IOS_INSET_HTML_RELOAD_KEY, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Installed iPhone PWA must load a fresh document so WebKit re-parses viewport. */
export function goSignedInHome(path: string, navigate: (to: string) => void): void {
  if (isIosStandaloneWebApp()) {
    window.location.replace(path);
    return;
  }
  navigate(path);
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

/** Literal pixel pad for the tab bar. Never `env(safe-area-inset-*)`. */
export function resolveBottomNavPadPx(): number {
  if (isIosStandaloneWebApp() && !isAppShellFitInset()) {
    return IOS_STANDALONE_HOME_INDICATOR_FALLBACK_PX;
  }
  return APP_SHELL_BOTTOMNAV_CONTENT_PAD_PX;
}

export function getStandaloneBottomNavPadCSSValue(): string {
  if (typeof document !== 'undefined' && isAppShellFitInset()) {
    return `${APP_SHELL_BOTTOMNAV_CONTENT_PAD_PX}px`;
  }
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
 * iOS standalone must NOT use `100vh`. With an opaque status-bar-style
 * (`default`), the webview is already below the status bar, but `100vh` is
 * still the full device height. The shell overflows by the status-bar
 * (~47–59px), the 34px home-indicator pad lands in the clipped overflow, and
 * only the top of the tab icons show (BEA-83, Joseph 2026-09-03). Size to
 * the layout viewport / `-webkit-fill-available` instead.
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

export function isAppShellFitInset(root: HTMLElement = document.documentElement): boolean {
  return root.classList.contains(APP_SHELL_FIT_INSET_CLASS);
}

/** Marketing keeps cover. Logged-in shell drops it so iOS frost cannot sit on the title. */
export function applyAppShellViewportFit(
  cover: boolean,
  root: HTMLElement = document.documentElement,
): void {
  // iOS ignores runtime viewport changes and will frost the title if cover
  // was in the first parse. Never turn cover back on for WebKit.
  const allowCover = cover && !isIosWebKit();
  const meta = document.querySelector('meta[name="viewport"]');
  if (meta) {
    meta.setAttribute('content', allowCover ? APP_SHELL_VIEWPORT_COVER : APP_SHELL_VIEWPORT_INSET);
    if (!allowCover) meta.setAttribute('data-viselle-fit', 'inset');
  }
  root.classList.toggle(APP_SHELL_FIT_INSET_CLASS, !allowCover);
}


/**
 * True when `100vh` (device screen) is taller than the layout webview by a
 * status-bar. Used only for height math — never as a reason to pad chrome.
 */
export function isStandaloneWebviewInsetBelowStatusBar(): boolean {
  if (!isIosStandaloneWebApp()) return false;
  const screenH = measureCss100vh();
  const layoutH = measureLayoutViewportHeight();
  if (screenH < 400 || layoutH < 400) return false;
  return screenH - layoutH >= 40;
}

/** `#root` / reserved-band pad — always 0. */
export function resolveRootSafePadTopPx(): number {
  return 0;
}

export function applyAppShellImpersonatingClass(
  impersonating: boolean,
  root: HTMLElement = document.documentElement,
): void {
  root.classList.toggle(APP_SHELL_IMPERSONATING_CLASS, impersonating);
}

export function resolveAppShellThemeColor(options: {
  dark: boolean;
  impersonating: boolean;
}): string {
  if (options.impersonating) return APP_SHELL_THEME_COLOR_IMPERSONATING;
  return options.dark ? APP_SHELL_THEME_COLOR_DARK : APP_SHELL_THEME_COLOR_LIGHT;
}

export function setSafeAreaCSSProperties(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--app-shell-safe-pad-top', APP_SHELL_ROOT_SAFE_PAD_TOP_CSS);
  root.style.setProperty('--app-shell-content-inset-top', APP_SHELL_CONTENT_INSET_TOP_CSS);
  root.style.removeProperty('--safe-area-top');
  root.style.removeProperty('--safe-area-bottom');
  root.style.setProperty('--app-shell-bottomnav-pad', `${resolveBottomNavPadPx()}px`);
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
