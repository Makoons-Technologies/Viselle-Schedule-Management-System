import { useEffect } from 'react';
import {
  FIRST_SHELL_SETTLE_DELAYS_MS,
  KEYBOARD_CLOSE_DELAYS_MS,
  SETTLE_DELAYS_MS,
  applyStandalonePwaClass,
  isKeyboardOpen,
  nudgeStandaloneViewportRecalc,
  resetRememberedAppHeight,
  resetWindowScroll,
  setAppHeightCSSProperty,
  shouldRunFirstShellViewportBurst,
} from '@/lib/app-shell-viewport';

function isEditableFocusTarget(target: EventTarget | null): target is HTMLElement {
  return target instanceof HTMLElement && target.matches('input, textarea, select, [contenteditable="true"]');
}

/** Size the app shell to the visible viewport and keep document scroll at 0. */
export function useAppShellViewport() {
  useEffect(() => {
    document.documentElement.classList.add('app-shell');
    applyStandalonePwaClass();

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute('content');
    const statusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    const previousStatusBarStyle = statusBarMeta?.getAttribute('content');
    const syncThemeColor = () => {
      if (!themeMeta) return;
      const dark = document.documentElement.classList.contains('dark');
      themeMeta.setAttribute('content', dark ? '#1c1917' : '#ffffff');
    };
    syncThemeColor();
    // Opaque status bar. index.html must also default to `black` — iOS reads
    // this at PWA launch and often ignores runtime changes (BEA-78).
    statusBarMeta?.setAttribute('content', 'black');

    let keyboardWasOpen = false;
    const settleTimers: number[] = [];

    const scheduleSettle = (delays: readonly number[]) => {
      for (const delay of delays) {
        settleTimers.push(window.setTimeout(onViewportSettle, delay));
      }
    };

    const syncAppHeight = () => {
      setAppHeightCSSProperty();
    };

    const onViewportSettle = () => {
      const keyboardOpen = isKeyboardOpen();
      if (keyboardOpen) {
        keyboardWasOpen = true;
        // Shrink to the visual viewport while the keyboard is up so the tab bar is not stranded.
        syncAppHeight();
        return;
      }

      if (keyboardWasOpen) {
        keyboardWasOpen = false;
        nudgeStandaloneViewportRecalc();
        scheduleSettle(KEYBOARD_CLOSE_DELAYS_MS);
      }

      // Window scroller only, and only when it actually moved. Nested
      // overflow-x (calendar) must keep native momentum.
      resetWindowScroll();
      syncAppHeight();
    };

    const onVisualViewportResize = () => {
      const keyboardOpen = isKeyboardOpen();
      if (keyboardOpen) {
        keyboardWasOpen = true;
        syncAppHeight();
        return;
      }
      if (keyboardWasOpen) {
        keyboardWasOpen = false;
        nudgeStandaloneViewportRecalc();
        scheduleSettle(KEYBOARD_CLOSE_DELAYS_MS);
        return;
      }
      // Height only. resetWindowScroll here snaps calendar overflow-x mid-flick
      // (~64ms settle / iOS chrome hide) — QA BEA-67 snap-back.
      syncAppHeight();
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!isEditableFocusTarget(event.target)) return;
      scheduleSettle(KEYBOARD_CLOSE_DELAYS_MS);
    };

    const onOrientationChange = () => {
      resetRememberedAppHeight();
      onViewportSettle();
      scheduleSettle(SETTLE_DELAYS_MS);
    };

    const vv = window.visualViewport;
    onViewportSettle();
    requestAnimationFrame(onViewportSettle);

    if (shouldRunFirstShellViewportBurst()) {
      nudgeStandaloneViewportRecalc();
      scheduleSettle(FIRST_SHELL_SETTLE_DELAYS_MS);
      let frames = 0;
      const rafBurst = () => {
        onViewportSettle();
        if (++frames < 8) requestAnimationFrame(rafBurst);
      };
      requestAnimationFrame(rafBurst);
    } else {
      scheduleSettle(SETTLE_DELAYS_MS);
    }

    // visualViewport resize (iOS chrome / overscroll) must not reset window scroll.
    vv?.addEventListener('resize', onVisualViewportResize);
    window.addEventListener('resize', onViewportSettle);
    window.addEventListener('orientationchange', onOrientationChange);
    window.addEventListener('load', onViewportSettle);
    window.addEventListener('pageshow', onViewportSettle);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      document.documentElement.classList.remove('app-shell');
      document.documentElement.style.removeProperty('--app-height');
      document.documentElement.style.removeProperty('--safe-area-bottom');
      document.documentElement.style.removeProperty('--app-shell-bottomnav-pad');
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
      if (statusBarMeta && previousStatusBarStyle) {
        statusBarMeta.setAttribute('content', previousStatusBarStyle);
      }
      for (const id of settleTimers) window.clearTimeout(id);
      vv?.removeEventListener('resize', onVisualViewportResize);
      window.removeEventListener('resize', onViewportSettle);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('load', onViewportSettle);
      window.removeEventListener('pageshow', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
