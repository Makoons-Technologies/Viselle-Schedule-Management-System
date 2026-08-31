/** Null-safe overflow helpers. A throw mid-fling cancels compositor momentum. */

export function isHtmlElement(value: EventTarget | null | undefined): value is HTMLElement {
  return value instanceof HTMLElement;
}

export function getScrollTop(el: HTMLElement | null | undefined): number {
  return el?.scrollTop ?? 0;
}

export function setScrollTop(el: HTMLElement | null | undefined, top: number): void {
  if (!el) return;
  if (el.scrollTop !== top) el.scrollTop = top;
}

export function getScrollLeft(el: HTMLElement | null | undefined): number {
  return el?.scrollLeft ?? 0;
}

export function setScrollLeft(el: HTMLElement | null | undefined, left: number): void {
  if (!el) return;
  if (el.scrollLeft !== left) el.scrollLeft = left;
}

export function scrollElementTo(
  el: HTMLElement | null | undefined,
  options: ScrollToOptions,
): void {
  if (!el) return;
  el.scrollTo(options);
}

/** Nearest overflow-y ancestor (the app shell `<main>` on calendar). */
export function findVerticalScroller(from: Element | null | undefined): HTMLElement | null {
  if (!from) return null;
  const main = from.closest('main');
  if (main instanceof HTMLElement) return main;
  let node: HTMLElement | null = from instanceof HTMLElement ? from : from.parentElement;
  while (node) {
    const overflowY = getComputedStyle(node).overflowY;
    if (
      node.scrollHeight > node.clientHeight + 1 &&
      (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay')
    ) {
      return node;
    }
    node = node.parentElement;
  }
  return null;
}
