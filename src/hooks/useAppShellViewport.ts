import { useEffect } from 'react';
import {
  FIRST_SHELL_SETTLE_DELAYS_MS,
  KEYBOARD_CLOSE_DELAYS_MS,
  SETTLE_DELAYS_MS,
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

    const themeMeta = document.querySelector('meta[name="theme-color"]');
    const previousTheme = themeMeta?.getAttribute('content');
    const syncThemeColor = () => {
      if (!themeMeta) return;
      const dark = document.documentElement.classList.contains('dark');
      themeMeta.setAttribute('content', dark ? '#1c1917' : '#ffffff');
    };
    syncThemeColor();

    let keyboardWasOpen = false;
    const settleTimers: number[] = [];

    const scheduleSettle = (delays: readonly number[]) => {
      for (const delay of delays) {
        settleTimers.push(window.setTimeout(onViewportSettle, delay));
      }
    };

    const onViewportSettle = () => {
      const keyboardOpen = isKeyboardOpen();
      if (keyboardOpen) {
        keyboardWasOpen = true;
        // Shrink to the visual viewport while the keyboard is up so the tab bar is not stranded.
        setAppHeightCSSProperty();
        return;
      }

      if (keyboardWasOpen) {
        keyboardWasOpen = false;
        nudgeStandaloneViewportRecalc();
        scheduleSettle(KEYBOARD_CLOSE_DELAYS_MS);
      }

      // Reset window scroll only when the layout viewport changed — not on visualViewport
      // pan/scroll, which fights <main> scrolling and feels like a snag.
      resetWindowScroll();
      setAppHeightCSSProperty();
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

    // Do not listen to visualViewport "scroll": iOS fires it during overscroll and
    // resetting window scroll / --app-height mid-gesture snags the main page.
    vv?.addEventListener('resize', onViewportSettle);
    window.addEventListener('resize', onViewportSettle);
    window.addEventListener('orientationchange', onOrientationChange);
    window.addEventListener('load', onViewportSettle);
    window.addEventListener('pageshow', onViewportSettle);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      document.documentElement.classList.remove('app-shell');
      document.documentElement.style.removeProperty('--app-height');
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
      for (const id of settleTimers) window.clearTimeout(id);
      vv?.removeEventListener('resize', onViewportSettle);
      window.removeEventListener('resize', onViewportSettle);
      window.removeEventListener('orientationchange', onOrientationChange);
      window.removeEventListener('load', onViewportSettle);
      window.removeEventListener('pageshow', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
