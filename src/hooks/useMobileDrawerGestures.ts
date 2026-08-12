import { useCallback, useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';

/** Matches Tailwind `md` — desktop sidebar shows at 768px+. */
const MOBILE_MAX = '(max-width: 767px)';

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
}

function isNearHorizontalEdge(clientX: number): boolean {
  return clientX <= EDGE_WIDTH_PX || clientX >= window.innerWidth - EDGE_WIDTH_PX;
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
  const isMobile = useMediaQuery(MOBILE_MAX);
  const active = enabled && isMobile;
  const panelRef = useRef<HTMLDivElement | null>(null);
  const sessionRef = useRef<TouchSession | null>(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const openRef = useRef(open);
  openRef.current = open;

  const clearSession = useCallback(() => {
    sessionRef.current = null;
    setDragOffset(0);
    setIsDragging(false);
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
      const nearEdge = isNearHorizontalEdge(touch.clientX);

      // iOS 13.4+: preventing default on edge touchstart blocks swipe-back/forward.
      if (nearEdge && event.cancelable) {
        event.preventDefault();
      }

      if (openRef.current) {
        const panel = panelRef.current;
        if (!panel || !target || !panel.contains(target)) return;
        sessionRef.current = {
          startX: touch.clientX,
          startY: touch.clientY,
          startT: event.timeStamp,
          lastX: touch.clientX,
          lastT: event.timeStamp,
          velocityX: 0,
          axis: 'none',
          mode: 'panel-close',
          panelWidth: panel.getBoundingClientRect().width || 288,
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
      const session = sessionRef.current;
      if (!session || event.touches.length !== 1) return;

      const touch = event.touches[0];
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

      if (session.mode === 'edge-open') {
        // Track distance only; open happens on release (avoids remount races).
        return;
      }

      const width = panelRef.current?.getBoundingClientRect().width || session.panelWidth;
      session.panelWidth = width;
      setDragOffset(Math.min(0, dx));
    };

    const onTouchEnd = (event: TouchEvent) => {
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
        setDragOffset(0);
        if (shouldOpen) setOpen(true);
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
      if (!sessionRef.current) return;
      sessionRef.current = null;
      setDragOffset(0);
      setIsDragging(false);
    };

    // touchstart must be non-passive so edge preventDefault can cancel history gestures.
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchCancel);
    };
  }, [active, clearSession, setOpen]);

  const panelStyle: CSSProperties | undefined =
    active && (isDragging || dragOffset !== 0)
      ? {
          transform: `translate3d(${dragOffset}px, 0, 0)`,
          transition: isDragging ? 'none' : 'transform 200ms ease-out',
        }
      : undefined;

  const width = panelRef.current?.getBoundingClientRect().width || 288;
  const dismissProgress = open && dragOffset < 0 ? Math.min(1, Math.abs(dragOffset) / width) : 0;

  const overlayStyle: CSSProperties | undefined =
    active && isDragging && open && dragOffset < 0
      ? { opacity: Math.max(0, 1 - dismissProgress) }
      : undefined;

  return {
    panelRef,
    panelStyle,
    panelClassName: active && isDragging ? '!duration-0 !animate-none' : undefined,
    overlayStyle,
  };
}
