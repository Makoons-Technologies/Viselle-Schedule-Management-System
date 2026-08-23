const KEYBOARD_OPEN_THRESHOLD = 80;

export const SETTLE_DELAYS_MS = [50, 150, 350, 700] as const;
export const KEYBOARD_CLOSE_DELAYS_MS = [80, 200, 400, 600] as const;
export const FIRST_SHELL_SETTLE_DELAYS_MS = [0, 16, 32, 64, 128, 250, 500, 1000] as const;

const FIRST_SHELL_SESSION_KEY = 'viselle-pwa-first-shell-viewport';

/** Largest keyboard-closed height seen this orientation. Survives iOS shrinking 100vh after the keyboard. */
let rememberedClosedHeightPx = 0;
let vhProbe: HTMLDivElement | null = null;

export function isStandaloneWebApp(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return iosStandalone || window.matchMedia('(display-mode: standalone)').matches;
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

/** Live CSS 100vh in pixels. Can shrink after the iOS keyboard even when the screen did not. */
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

/** CSS value for --app-height. iOS standalone keeps the pre-keyboard floor so the tab bar does not lift. */
export function getAppHeightCSSValue(): string {
  const measured = measureBrowserAppHeight();
  const keyboard = isKeyboardOpen();

  if (keyboard) {
    return `${measured}px`;
  }

  const cssVh = measureCss100vh();
  observeClosedHeight(Math.max(measured, cssVh));

  if (isIosStandaloneWebApp()) {
    if (rememberedClosedHeightPx > 0) {
      return `max(100vh, ${rememberedClosedHeightPx}px)`;
    }
    return '100vh';
  }

  return `${measured}px`;
}

export function setAppHeightCSSProperty(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--app-height', getAppHeightCSSValue());
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
