import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MOBILE_SHELL_MEDIA } from '@/lib/viewport';

/**
 * Edge strip where we claim horizontal swipes for the drawer and block the
 * browser's back/forward navigation gesture (iOS Safari / Chrome).
 */
const EDGE_WIDTH_PX = 28;
const LOCK_AXIS_PX = 8;
const OPEN_DISTANCE_PX = 56;
const OPEN_VELOCITY = 0.35;
const CLOSE_RATIO = 0.32;
const CLOSE_VELOCITY = 0.4;

type AxisLock = 'none' | 'horizontal' | 'vertical';

interface TouchSession {
  startX: number;
  startY: number;
  startT: number;
  lastX: number;
  lastT: number;
  velocityX: number;
  axis: AxisLock;
  mode: 'edge-open' | 'panel-close';
  panelWidth: number;
}

export interface MobileDrawerGestures {
  /** Attach to the drawer panel (SheetContent). */
  panelRef: RefObject<HTMLDivElement | null>;
  panelStyle: CSSProperties | undefined;
  panelClassName: string | undefined;
  overlayStyle: CSSProperties | undefined;
  /** Mount the closed sheet so an edge swipe can translate it with the finger. */
  forceMount: boolean;
}

function isNearHorizontalEdge(clientX: number): boolean {
  return clientX <= EDGE_WIDTH_PX || clientX >= window.innerWidth - EDGE_WIDTH_PX;
}

function isInsidePanel(panel: HTMLDivElement | null, target: Node | null): boolean {
  return !!(panel && target && panel.contains(target));
}

function isScrollableDrawerNav(element: Element): boolean {
  return element.scrollHeight > element.clientHeight + 1;
}

function drawerNavWantsVerticalScroll(element: Element, dy: number): boolean {
  if (Math.abs(dy) < LOCK_AXIS_PX) return false;
  if (!isScrollableDrawerNav(element)) return false;
  if (dy < 0) return element.scrollTop > 0;
  return element.scrollTop + element.clientHeight < element.scrollHeight - 1;
}

/**
 * Native-feeling mobile drawer gestures:
 * - swipe right from a left edge strip to open
 * - drag the open panel left past a threshold (or with velocity) to close
 * Edge touchstarts call preventDefault so the browser does not steal them as
 * history back/forward. Desktop (md+) is a no-op.
 */
export function useMobileDrawerGestures(
  open: boolean,
  setOpen: (open: boolean) => void,
  enabled = true,
): MobileDrawerGestures {
  const isMobile = useMediaQuery(MOBILE_SHELL_MEDIA);
  const active = enabled && isMobile;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<TouchSession | null>(null);
  const pendingCloseRef = useRef<Pick<TouchSession, 'startX' | 'startY' | 'startT' | 'lastX' | 'lastT' | 'panelWidth'> | null>(
    null,
  );
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [keepMounted, setKeepMounted] = useState(false);
  const keepMountedTimerRef = useRef(0);
  const [suppressEnter, setSuppressEnter] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;
  const peeking = !open && (isDragging || dragOffset > 0 || keepMounted);

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    pendingCloseRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
    window.clearTimeout(keepMountedTimerRef.current);
    setKeepMounted(false);
    setSuppressEnter(false);
  }, []);

  // Snap transform when the controlled open state changes outside an active drag.
  useEffect(() => {
    if (sessionRef.current) return;
    setDragOffset(0);
    setIsDragging(false);
  }, [open]);

  // Prefer CSS containment for trackpad / browsers that honor it for history nav.
  useEffect(() => {
    if (!active) return;
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overscrollBehaviorX;
    const prevBody = body.style.overscrollBehaviorX;
    html.style.overscrollBehaviorX = 'none';
    body.style.overscrollBehaviorX = 'none';
    return () => {
      html.style.overscrollBehaviorX = prevHtml;
      body.style.overscrollBehaviorX = prevBody;
    };
  }, [active]);

  useEffect(() => {
    if (!active) {
      clearSession();
      return;
    }

    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;
      const touch = event.touches[0];
      const target = event.target as Node | null;
      const panel = panelRef.current;
      const insidePanel = isInsidePanel(panel, target);

      // Do not skip nav links / the drawer scroller — that blocked drag-to-dismiss
      // (QA BEA-70). Vertical list scroll still wins once the axis locks.
      const nearEdge = isNearHorizontalEdge(touch.clientX);

      // iOS 13.4+: edge touchstart blocks swipe-back/forward — never on open-panel taps.
      if (nearEdge && event.cancelable && !(openRef.current && insidePanel)) {
        event.preventDefault();
      }

      if (openRef.current) {
        if (!insidePanel) return;
        pendingCloseRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startT: event.timeStamp,
          lastX: touch.clientX,
          lastT: event.timeStamp,
          panelWidth: panel?.getBoundingClientRect().width || 288,
        };
        return;
      }

      // Only the left edge opens the drawer; right edge is blocked above only.
      if (touch.clientX > EDGE_WIDTH_PX) return;
      sessionRef.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startT: event.timeStamp,
        lastX: touch.clientX,
        lastT: event.timeStamp,
        velocityX: 0,
        axis: 'none',
        mode: 'edge-open',
        panelWidth: 288,
      };
    };

    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 1) return;

      const touch = event.touches[0];

      if (!sessionRef.current && pendingCloseRef.current && openRef.current) {
        const pending = pendingCloseRef.current;
        const dx = touch.clientX - pending.startX;
        const dy = touch.clientY - pending.startY;
        if (Math.abs(dx) < LOCK_AXIS_PX && Math.abs(dy) < LOCK_AXIS_PX) return;

        // Horizontal dismiss wins when the gesture is clearly sideways so a
        // scrollable nav list does not swallow drag-left-to-close.
        if (Math.abs(dx) <= Math.abs(dy) * 1.15) {
          const scrollEl = panelRef.current?.querySelector('[data-mobile-drawer-scroll]');
          if (scrollEl instanceof HTMLElement && drawerNavWantsVerticalScroll(scrollEl, dy)) {
            pendingCloseRef.current = null;
            return;
          }
          pendingCloseRef.current = null;
          return;
        }

        sessionRef.current = {
          ...pending,
          velocityX: 0,
          axis: 'horizontal',
          mode: 'panel-close',
        };
        pendingCloseRef.current = null;
        setIsDragging(true);
      }

      const session = sessionRef.current;
      if (!session) return;

      const dx = touch.clientX - session.startX;
      const dy = touch.clientY - session.startY;
      const dt = event.timeStamp - session.lastT;
      if (dt > 0) {
        session.velocityX = (touch.clientX - session.lastX) / dt;
      }
      session.lastX = touch.clientX;
      session.lastT = event.timeStamp;

      if (session.axis === 'none') {
        if (Math.abs(dx) < LOCK_AXIS_PX && Math.abs(dy) < LOCK_AXIS_PX) return;

        const scrollEl = panelRef.current?.querySelector('[data-mobile-drawer-scroll]');
        if (scrollEl instanceof HTMLElement && drawerNavWantsVerticalScroll(scrollEl, dy)) {
          sessionRef.current = null;
          setIsDragging(false);
          setDragOffset(0);
          return;
        }

        // Prefer vertical when ambiguous so nav list scroll still works.
        session.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'horizontal' : 'vertical';
        if (session.axis === 'vertical') {
          sessionRef.current = null;
          setIsDragging(false);
          setDragOffset(0);
          return;
        }
        setIsDragging(true);
      }

      if (session.axis !== 'horizontal') return;
      if (event.cancelable) event.preventDefault();

      const width = panelRef.current?.getBoundingClientRect().width || session.panelWidth;
      session.panelWidth = width;

      if (session.mode === 'edge-open') {
        setKeepMounted(true);
        setIsDragging(true);
        setDragOffset(Math.min(width, Math.max(0, dx)));
        return;
      }

      setDragOffset(Math.min(0, dx));
    };

    const onTouchEnd = (event: TouchEvent) => {
      pendingCloseRef.current = null;

      const session = sessionRef.current;
      if (!session) return;

      const touch = event.changedTouches[0];
      const dx = touch.clientX - session.startX;
      const wasHorizontal = session.axis === 'horizontal';
      const velocityX = session.velocityX;
      const width = session.panelWidth || panelRef.current?.getBoundingClientRect().width || 288;

      sessionRef.current = null;

      if (!wasHorizontal) {
        setDragOffset(0);
        setIsDragging(false);
        return;
      }

      if (session.mode === 'edge-open') {
        const shouldOpen = dx >= OPEN_DISTANCE_PX || velocityX >= OPEN_VELOCITY;
        setIsDragging(false);
        if (shouldOpen) {
          setSuppressEnter(true);
          setDragOffset(0);
          setOpen(true);
          window.clearTimeout(keepMountedTimerRef.current);
          keepMountedTimerRef.current = window.setTimeout(() => {
            setSuppressEnter(false);
            setKeepMounted(false);
          }, 220);
        } else {
          setDragOffset(0);
          window.clearTimeout(keepMountedTimerRef.current);
          keepMountedTimerRef.current = window.setTimeout(() => {
            setKeepMounted(false);
          }, 220);
        }
        return;
      }

      const shouldClose = Math.abs(Math.min(0, dx)) >= width * CLOSE_RATIO || velocityX <= -CLOSE_VELOCITY;
      if (shouldClose) {
        setOpen(false);
        setDragOffset(0);
        setIsDragging(false);
      } else {
        // Snap back open
        setDragOffset(0);
        setIsDragging(false);
      }
    };

    const onTouchCancel = () => {
      pendingCloseRef.current = null;
      if (!sessionRef.current) return;
      sessionRef.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    // touchstart must be non-passive so edge preventDefault can cancel history gestures.
    const pointerAsTouch = (event: PointerEvent): TouchEvent => {
      const point = { clientX: event.clientX, clientY: event.clientY };
      return {
        touches: [point],
        changedTouches: [point],
        target: event.target,
        timeStamp: event.timeStamp,
        cancelable: event.cancelable,
        preventDefault: () => {
          if (event.cancelable) event.preventDefault();
        },
      } as unknown as TouchEvent;
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.button !== 0) return;
      onTouchStart(pointerAsTouch(event));
    };
    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      if (!sessionRef.current && !pendingCloseRef.current) return;
      onTouchMove(pointerAsTouch(event));
    };
    const onPointerUp = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      onTouchEnd(pointerAsTouch(event));
    };

    // touchstart must be non-passive so edge preventDefault can cancel history gestures.
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });
    document.addEventListener('pointerdown', onPointerDown, { passive: false });
    document.addEventListener('pointermove', onPointerMove, { passive: false });
    document.addEventListener('pointerup', onPointerUp, { passive: true });
    document.addEventListener('pointercancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('pointermove', onPointerMove);
      document.removeEventListener('pointerup', onPointerUp);
      document.removeEventListener('pointercancel', onTouchCancel);
    };
  }, [active, clearSession, setOpen]);

  const width = panelRef.current?.getBoundingClientRect().width || 288;
  const panelStyle: CSSProperties | undefined = (() => {
    if (!active) return undefined;
    if (peeking) {
      return {
        transform: `translate3d(${dragOffset - width}px, 0, 0)`,
        transition: isDragging ? 'none' : 'transform 200ms ease-out',
      };
    }
    if (isDragging || dragOffset !== 0) {
      return {
        transform: `translate3d(${dragOffset}px, 0, 0)`,
        transition: isDragging ? 'none' : 'transform 200ms ease-out',
      };
    }
    return undefined;
  })();

  const dismissProgress = open && dragOffset < 0 ? Math.min(1, Math.abs(dragOffset) / width) : 0;
  const revealProgress = !open && dragOffset > 0 ? Math.min(1, dragOffset / width) : 0;

  const overlayStyle: CSSProperties | undefined = (() => {
    if (!active) return undefined;
    if (isDragging && open && dragOffset < 0) {
      return { opacity: Math.max(0, 1 - dismissProgress) };
    }
    if (peeking) {
      return {
        opacity: revealProgress,
        pointerEvents: revealProgress > 0.05 ? 'auto' : 'none',
        animation: 'none',
        transition: isDragging ? 'none' : 'opacity 200ms ease-out',
      };
    }
    return undefined;
  })();

  return {
    panelRef,
    panelStyle,
    panelClassName:
      active && (isDragging || suppressEnter)
        ? '!duration-0 !animate-none data-[state=closed]:!opacity-100 data-[state=closed]:!translate-x-0'
        : peeking
          ? '!animate-none data-[state=closed]:!opacity-100 data-[state=closed]:!translate-x-0'
          : undefined,
    overlayStyle,
    forceMount: peeking,
  };
}
