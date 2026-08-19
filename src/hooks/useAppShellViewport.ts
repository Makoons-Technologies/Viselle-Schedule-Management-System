import { useEffect } from 'react';

/**
 * Size the app shell to the visible viewport and keep document scroll at 0.
 * iOS PWAs paint a dead band below innerHeight; --pwa-bottom-fill extends the
 * tab bar background into that band while keeping buttons in the visible area.
 */
export function useAppShellViewport() {
  useEffect(() => {
    document.documentElement.classList.add('app-shell');

    const standaloneMq = window.matchMedia('(display-mode: standalone)');
    const iosStandalone =
      'standalone' in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
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

      const inner = window.innerHeight;
      document.documentElement.style.setProperty('--app-height', `${Math.round(inner)}px`);

      const standalone = document.documentElement.classList.contains('pwa-standalone');
      const mobile = window.matchMedia('(max-width: 767px)').matches;
      if (!(standalone && mobile)) {
        document.documentElement.style.removeProperty('--pwa-bottom-fill');
        return;
      }

      const vvBottom = vv ? vv.offsetTop + vv.height : inner;
      const gap = Math.min(40, Math.max(0, Math.round(inner - vvBottom)));

      if (gap > 0) {
        document.documentElement.style.setProperty('--pwa-bottom-fill', `${gap}px`);
      } else {
        document.documentElement.style.removeProperty('--pwa-bottom-fill');
      }
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
      document.documentElement.style.removeProperty('--pwa-bottom-fill');
      if (themeMeta && previousTheme) themeMeta.setAttribute('content', previousTheme);
      standaloneMq.removeEventListener('change', syncStandalone);
      vv?.removeEventListener('resize', onViewportSettle);
      vv?.removeEventListener('scroll', onViewportSettle);
      window.removeEventListener('orientationchange', onViewportSettle);
      window.removeEventListener('focusout', onFocusOut);
    };
  }, []);
}
