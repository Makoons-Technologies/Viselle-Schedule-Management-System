import { useEffect } from 'react';

function readHeight(value: string): number {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;left:0;top:0;width:0;height:${value};visibility:hidden;pointer-events:none`;
  document.documentElement.appendChild(el);
  const height = el.getBoundingClientRect().height;
  el.remove();
  return height;
}

/**
 * Size the app shell to the visible viewport and keep document scroll at 0.
 * iOS PWAs paint a dead band below the CSS viewport; --pwa-bottom-shift pulls
 * the tab bar into that band so labels sit on the screen edge.
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
        document.documentElement.style.setProperty('--pwa-bottom-shift', '0px');
        return;
      }

      const probe = document.createElement('div');
      probe.style.cssText = 'position:fixed;left:0;bottom:0;width:0;height:0;visibility:hidden;pointer-events:none';
      document.body.appendChild(probe);
      const fixedBottom = probe.getBoundingClientRect().bottom;
      probe.remove();

      const vvBottom = vv ? vv.offsetTop + vv.height : inner;
      const visualGap = Math.max(0, inner - vvBottom);
      const lvhGap = Math.max(0, readHeight('100lvh') - inner, readHeight('-webkit-fill-available') - inner);
      const screenGapRaw = window.screen.height - Math.max(fixedBottom, inner);
      const screenGap = screenGapRaw > 0 && screenGapRaw <= 96 ? screenGapRaw : 0;
      const gap = Math.min(96, Math.round(Math.max(visualGap, lvhGap, screenGap)));

      if (gap > 0) {
        document.documentElement.style.setProperty('--pwa-bottom-shift', `${gap}px`);
      } else {
        document.documentElement.style.removeProperty('--pwa-bottom-shift');
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
