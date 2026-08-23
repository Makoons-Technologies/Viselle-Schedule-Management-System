import { useEffect, type RefObject } from 'react';

/**
 * Keep two overflow-x panes aligned without killing native momentum.
 *
 * Only user intent (pointer/wheel/touch) on a pane may become the driver.
 * Follower `scroll` events from writing `scrollLeft` never take over, so a
 * late echo cannot snap the coasting pane back.
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

    const syncFrom = (source: HTMLElement, target: HTMLElement) => {
      if (driver && driver !== source) return;
      if (!driver) driver = source;
      if (target.scrollLeft !== source.scrollLeft) {
        target.scrollLeft = source.scrollLeft;
      }
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
