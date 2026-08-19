import { useEffect } from 'react';

/**
 * Size the app shell to the visible viewport and keep document scroll at 0.
 * Installed PWAs have no browser toolbar — zero the bottom inset so we don't
 * paint an empty strip under the tab bar.
 */
export function useAppShellViewport() {
  useEffect(() => {
    document.documentElement.classList.add('app-shell');

    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const iosStandalone = 'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
    const syncStandalone = () => {
      document.documentElement.classList.toggle('pwa-standalone', standaloneMq.matches || iosStandalone);
    };
    syncStandalone();

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

      const standalone = document.documentElement.classList.contains('pwa-standalone');
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      if (standalone && mobile) {
        // Let CSS `position:fixed; inset:0` fill the webview. A JS pixel height
        // shorter than the actual screen paints a dead band under the tab bar.
        document.documentElement.style.removeProperty('--app-height');
        document.documentElement.style.setProperty('--pwa-bottom-shift', '0px');
        return;
      }

      document.documentElement.style.setProperty('--app-height', `${Math.round(window.innerHeight)}px`);
      document.documentElement.style.setProperty('--pwa-bottom-shift', '0px');
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

    standaloneMq.addEventListener('change', syncStandalone);

    return () => {
      document.documentElement.classList.remove('app-shell', 'pwa-standalone');
      document.documentElement.style.removeProperty('--app-height');
      document.documentElement.style.removeProperty('--pwa-bottom-shift');
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
      standaloneMq.removeEventListener('change', syncStandalone);
      vv?.removeEventListener('resize', onViewportSettle);
      vv?.removeEventListener('scroll', onViewportSettle);
      window.removeEventListener('orientationchange', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
