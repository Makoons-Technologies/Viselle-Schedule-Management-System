import { useEffect } from 'react';

const KEYBOARD_OPEN_THRESHOLD = 80;
const SETTLE_DELAYS_MS = [50, 150, 350, 700] as const;
const KEYBOARD_CLOSE_DELAYS_MS = [80, 200, 400, 600] as const;

function isKeyboardOpen(): boolean {
  const vv = window.visualViewport;
  return Boolean(vv && window.innerHeight - vv.height > KEYBOARD_OPEN_THRESHOLD);
}

function measureAppHeight(): number {
  const vv = window.visualViewport;
  const inner = window.innerHeight;
  if (!vv) return inner;
  return Math.max(inner, Math.round(vv.height + vv.offsetTop));
}

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

    const resetWindowScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement.scrollTop) document.documentElement.scrollTop = 0;
      if (document.body.scrollTop) document.body.scrollTop = 0;
    };

    const setAppHeight = () => {
      document.documentElement.style.setProperty('--app-height', `${measureAppHeight()}px`);
    };

    const scheduleSettle = (delays: readonly number[]) => {
      for (const delay of delays) {
        window.setTimeout(onViewportSettle, delay);
      }
    };

    const onViewportSettle = () => {
      const keyboardOpen = isKeyboardOpen();
      if (keyboardOpen) {
        keyboardWasOpen = true;
        return;
      }

      if (keyboardWasOpen) {
        keyboardWasOpen = false;
        scheduleSettle(KEYBOARD_CLOSE_DELAYS_MS);
      }

      // Reset scroll before measuring so a post-keyboard offsetTop does not inflate --app-height.
      resetWindowScroll();
      setAppHeight();
    };

    const onFocusOut = (event: FocusEvent) => {
      if (!isEditableFocusTarget(event.target)) return;
      scheduleSettle(KEYBOARD_CLOSE_DELAYS_MS);
    };

    const vv = window.visualViewport;
    onViewportSettle();
    requestAnimationFrame(onViewportSettle);
    scheduleSettle(SETTLE_DELAYS_MS);
    vv?.addEventListener('resize', onViewportSettle);
    vv?.addEventListener('scroll', onViewportSettle);
    window.addEventListener('resize', onViewportSettle);
    window.addEventListener('orientationchange', onViewportSettle);
    window.addEventListener('load', onViewportSettle);
    window.addEventListener('pageshow', onViewportSettle);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      document.documentElement.classList.remove('app-shell');
      document.documentElement.style.removeProperty('--app-height');
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
      vv?.removeEventListener('resize', onViewportSettle);
      vv?.removeEventListener('scroll', onViewportSettle);
      window.removeEventListener('resize', onViewportSettle);
      window.removeEventListener('orientationchange', onViewportSettle);
      window.removeEventListener('load', onViewportSettle);
      window.removeEventListener('pageshow', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
