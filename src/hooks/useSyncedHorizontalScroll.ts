import { useEffect, type RefObject } from 'react';
import { getScrollLeft, setScrollLeft } from '@/lib/scroll-helpers';

/**
 * Keep two overflow-x panes aligned without killing native momentum.
 *
 * Writing `scrollLeft` back onto the pane the user (or trackpad inertia) is
 * still driving cancels compositor scrolling. Only pointer/wheel/touch on a
 * pane may become the driver; follower echoes never take over.
 */
export function useSyncedHorizontalScroll(
  firstRef: RefObject<HTMLElement | null>,
  secondRef: RefObject<HTMLElement | null>,
) {
  useEffect(() => {
    const first = firstRef.current;
    const second = secondRef.current;
    if (!first || !second) return;

    let driver: HTMLElement | null = null;
    let syncing = false;

    const bindDriver = (el: HTMLElement) => {
      const mark = () => {
        driver = el;
      };
      el.addEventListener('pointerdown', mark, { passive: true });
      el.addEventListener('wheel', mark, { passive: true });
      el.addEventListener('touchstart', mark, { passive: true });
      return () => {
        el.removeEventListener('pointerdown', mark);
        el.removeEventListener('wheel', mark);
        el.removeEventListener('touchstart', mark);
      };
    };

    const syncFrom = (source: HTMLElement | null, target: HTMLElement | null) => {
      if (!source || !target || syncing) return;
      if (driver && driver !== source) return;
      if (!driver) driver = source;
      const left = getScrollLeft(source);
      if (getScrollLeft(target) === left) return;
      syncing = true;
      setScrollLeft(target, left);
      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const onFirstScroll = () => syncFrom(first, second);
    const onSecondScroll = () => syncFrom(second, first);

    const unbindFirst = bindDriver(first);
    const unbindSecond = bindDriver(second);
    first.addEventListener('scroll', onFirstScroll, { passive: true });
    second.addEventListener('scroll', onSecondScroll, { passive: true });

    return () => {
      unbindFirst();
      unbindSecond();
      first.removeEventListener('scroll', onFirstScroll);
      second.removeEventListener('scroll', onSecondScroll);
    };
  }, [firstRef, secondRef]);
}
