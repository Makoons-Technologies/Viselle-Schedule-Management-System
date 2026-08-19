import { useEffect } from 'react';

/**
 * Size the app shell to the visible viewport and keep document scroll at 0.
 * iOS PWAs otherwise overshoot (clipped tab bar) or undershoot (maroon lip),
 * and the keyboard can leave leftover window scroll.
 */
export function useAppShellViewport() {
  useEffect(() => {
    document.documentElement.classList.add('app-shell');

    const resetWindowScroll = () => {
      if (window.scrollX !== 0 || window.scrollY !== 0) {
        window.scrollTo(0, 0);
      }
      if (document.documentElement.scrollTop) document.documentElement.scrollTop = 0;
      if (document.body.scrollTop) document.body.scrollTop = 0;
    };

    const setAppHeight = () => {
      const vv = window.visualViewport;
      const keyboardOpen = Boolean(vv && window.innerHeight - vv.height > 80);
      if (keyboardOpen) return;
      // Layout viewport (innerHeight), not visualViewport.height — that value is
      // already inset on iOS PWAs and stacked with safe-area padding to float the tabs.
      document.documentElement.style.setProperty('--app-height', `${Math.round(window.innerHeight)}px`);
    };

    const onViewportSettle = () => {
      setAppHeight();
      const vv = window.visualViewport;
      const keyboardOpen = Boolean(vv && window.innerHeight - vv.height > 80);
      if (!keyboardOpen) resetWindowScroll();
    };

    const onFocusOut = () => {
      window.setTimeout(onViewportSettle, 80);
    };

    const vv = window.visualViewport;
    setAppHeight();
    resetWindowScroll();
    vv?.addEventListener('resize', onViewportSettle);
    vv?.addEventListener('scroll', onViewportSettle);
    window.addEventListener('orientationchange', onViewportSettle);
    window.addEventListener('focusout', onFocusOut);

    return () => {
      document.documentElement.classList.remove('app-shell');
      document.documentElement.style.removeProperty('--app-height');
      vv?.removeEventListener('resize', onViewportSettle);
      vv?.removeEventListener('scroll', onViewportSettle);
      window.removeEventListener('orientationchange', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
