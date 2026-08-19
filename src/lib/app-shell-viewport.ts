const KEYBOARD_OPEN_THRESHOLD = 80;

export const SETTLE_DELAYS_MS = [50, 150, 350, 700] as const;
export const KEYBOARD_CLOSE_DELAYS_MS = [80, 200, 400, 600] as const;
export const FIRST_SHELL_SETTLE_DELAYS_MS = [0, 16, 32, 64, 128, 250, 500, 1000] as const;

const FIRST_SHELL_SESSION_KEY = 'viselle-pwa-first-shell-viewport';

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

/** CSS value for --app-height. iOS standalone uses 100vh; browser mode uses measured pixels. */
export function getAppHeightCSSValue(): string {
  if (isIosStandaloneWebApp() && !isKeyboardOpen()) {
    return '100vh';
  }
  return `${measureBrowserAppHeight()}px`;
}

export function setAppHeightCSSProperty(root: HTMLElement = document.documentElement): void {
  root.style.setProperty('--app-height', getAppHeightCSSValue());
}

export function resetWindowScroll(): void {
  if (window.scrollX !== 0 || window.scrollY !== 0) {
    window.scrollTo(0, 0);
  }
  if (document.documentElement.scrollTop) document.documentElement.scrollTop = 0;
  if (document.body.scrollTop) document.body.scrollTop = 0;
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
