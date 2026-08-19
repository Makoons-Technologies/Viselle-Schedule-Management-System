import { useEffect } from 'react';

/**
 * Keep the authenticated app on a single inner scroller.
 * iOS PWAs otherwise shift the document after the keyboard, which snags
 * scroll and leaves the bottom nav sitting above the home indicator.
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

    const onViewportSettle = () => {
      const vv = window.visualViewport;
      const keyboardOpen = Boolean(vv && window.innerHeight - vv.height > 80);
      if (!keyboardOpen) resetWindowScroll();
    };

    const onFocusOut = () => {
      window.setTimeout(onViewportSettle, 80);
    };

    const vv = window.visualViewport;
    vv?.addEventListener('resize', onViewportSettle);
    vv?.addEventListener('scroll', onViewportSettle);
    window.addEventListener('orientationchange', onViewportSettle);
    window.addEventListener('focusout', onFocusOut);
    resetWindowScroll();

    return () => {
      document.documentElement.classList.remove('app-shell');
      vv?.removeEventListener('resize', onViewportSettle);
      vv?.removeEventListener('scroll', onViewportSettle);
      window.removeEventListener('orientationchange', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
