/** Why a calendar drag/resize session ended. */
export type CalendarDragEndReason =
  | 'pointerup'
  | 'pointercancel'
  | 'blur'
  | 'escape'
  | 'unmount'
  | 'visibility';

export type CalendarDragHost = {
  addEventListener(
    type: string,
    listener: (event: Event) => void,
    options?: boolean | AddEventListenerOptions,
  ): void;
  removeEventListener(
    type: string,
    listener: (event: Event) => void,
    options?: boolean | EventListenerOptions,
  ): void;
};

export type AttachCalendarDragListenersOptions = {
  pointerId?: number;
  onMove?: (event: PointerEvent) => void;
  onEnd: (reason: CalendarDragEndReason, event?: Event) => void;
};

function pointerIdOf(event: Event): number | undefined {
  if (event && typeof event === 'object' && 'pointerId' in event) {
    const value = (event as PointerEvent).pointerId;
    return typeof value === 'number' ? value : undefined;
  }
  return undefined;
}

/**
 * Attach drag/resize listeners immediately (do not wait for a React effect).
 * Clears on pointerup, pointercancel, window blur, Escape, and tab hide.
 * The returned function only removes listeners — it does not emit `unmount`
 * (callers that want that reason should invoke `onEnd('unmount')` themselves).
 */
export function attachCalendarDragListeners(
  host: CalendarDragHost,
  options: AttachCalendarDragListenersOptions,
): () => void {
  let cleaned = false;

  const matchesPointer = (event: Event) => {
    if (options.pointerId == null) return true;
    const pointerId = pointerIdOf(event);
    return pointerId == null || pointerId === options.pointerId;
  };

  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    host.removeEventListener('pointermove', onMove);
    host.removeEventListener('pointerup', onPointerUp, true);
    host.removeEventListener('pointercancel', onPointerCancel, true);
    host.removeEventListener('blur', onBlur);
    host.removeEventListener('keydown', onKeyDown, true);
    host.removeEventListener('visibilitychange', onVisibility);
  };

  const end = (reason: CalendarDragEndReason, event?: Event) => {
    if (cleaned) return;
    cleanup();
    options.onEnd(reason, event);
  };

  const onMove = (event: Event) => {
    if (!matchesPointer(event)) return;
    options.onMove?.(event as PointerEvent);
  };

  const onPointerUp = (event: Event) => {
    if (!matchesPointer(event)) return;
    end('pointerup', event);
  };

  const onPointerCancel = (event: Event) => {
    if (!matchesPointer(event)) return;
    end('pointercancel', event);
  };

  const onBlur = (event: Event) => {
    end('blur', event);
  };

  const onKeyDown = (event: Event) => {
    const key = (event as KeyboardEvent).key;
    if (key !== 'Escape' && key !== 'Esc') return;
    if (typeof (event as KeyboardEvent).preventDefault === 'function') {
      (event as KeyboardEvent).preventDefault();
    }
    end('escape', event);
  };

  const onVisibility = (event: Event) => {
    const doc = (event.target ?? (globalThis as { document?: Document }).document) as
      | Document
      | undefined;
    if (doc && doc.visibilityState && doc.visibilityState !== 'hidden') return;
    end('visibility', event);
  };

  host.addEventListener('pointermove', onMove);
  host.addEventListener('pointerup', onPointerUp, true);
  host.addEventListener('pointercancel', onPointerCancel, true);
  host.addEventListener('blur', onBlur);
  host.addEventListener('keydown', onKeyDown, true);
  host.addEventListener('visibilitychange', onVisibility);

  return cleanup;
}

export function clearCalendarDragChrome(doc: { body: { style: { removeProperty: (name: string) => void } } }) {
  doc.body.style.removeProperty('cursor');
  doc.body.style.removeProperty('user-select');
}

export function applyCalendarDragChrome(
  doc: { body: { style: { cursor: string; userSelect: string } } },
  mode: 'move' | 'resize',
) {
  doc.body.style.cursor = mode === 'resize' ? 'ns-resize' : 'grabbing';
  doc.body.style.userSelect = 'none';
}

/** True when the session should persist the in-progress times. */
export function shouldCommitCalendarDrag(reason: CalendarDragEndReason, moved: boolean): boolean {
  return reason === 'pointerup' && moved;
}
