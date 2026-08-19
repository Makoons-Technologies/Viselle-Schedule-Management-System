import { useEffect } from 'react';

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
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
      vv?.removeEventListener('resize', onViewportSettle);
      vv?.removeEventListener('scroll', onViewportSettle);
      window.removeEventListener('orientationchange', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
