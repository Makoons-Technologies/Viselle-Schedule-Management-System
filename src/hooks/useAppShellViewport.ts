import { useEffect } from 'react';

function measureAppHeight(): number {
  const vv = window.visualViewport;
  const inner = window.innerHeight;
  if (!vv) return inner;
  return Math.max(inner, Math.round(vv.height + vv.offsetTop));
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
      document.documentElement.style.setProperty('--app-height', `${measureAppHeight()}px`);
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
    onViewportSettle();
    requestAnimationFrame(onViewportSettle);
    for (const delay of [50, 150, 350, 700]) {
      window.setTimeout(onViewportSettle, delay);
    }
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
