import { useEffect, type RefObject } from 'react';

/** After the last scroll event, keep treating that pane as the driver until inertia ends. */
const DRIVER_IDLE_MS = 180;

/**
 * Keep two overflow-x panes aligned without killing native momentum.
 *
 * Writing `scrollLeft` back onto the pane the user (or trackpad inertia) is
 * still driving cancels compositor scrolling. The first pane that emits a
 * scroll event becomes the driver; its follower is puppeted until events stop.
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
    let idleTimer = 0;

    const syncFrom = (source: HTMLElement, target: HTMLElement) => {
      if (driver && driver !== source) return;
      driver = source;
      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        driver = null;
      }, DRIVER_IDLE_MS);
      if (target.scrollLeft !== source.scrollLeft) {
        target.scrollLeft = source.scrollLeft;
      }
    };

    const onFirstScroll = () => syncFrom(first, second);
    const onSecondScroll = () => syncFrom(second, first);

    first.addEventListener('scroll', onFirstScroll, { passive: true });
    second.addEventListener('scroll', onSecondScroll, { passive: true });

    return () => {
      first.removeEventListener('scroll', onFirstScroll);
      second.removeEventListener('scroll', onSecondScroll);
      window.clearTimeout(idleTimer);
    };
  }, [firstRef, secondRef]);
}
