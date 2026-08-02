import { useCallback, useEffect, useRef, useState } from 'react';

export type FoilTilt = { x: number; y: number };

const DEFAULT_TILT: FoilTilt = { x: 0.5, y: 0.5 };

type DeviceOrientationPermission = 'granted' | 'denied' | 'default';

type DeviceOrientationConstructor = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<DeviceOrientationPermission>;
};

function getOrientationCtor(): DeviceOrientationConstructor | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.DeviceOrientationEvent as DeviceOrientationConstructor | undefined;
}

/** True when iOS (or similar) requires a user gesture before orientation events. */
export function deviceOrientationNeedsGesture(): boolean {
  const DOE = getOrientationCtor();
  return Boolean(DOE && typeof DOE.requestPermission === 'function');
}

/**
 * Maps device orientation (or pointer position) to a 0–1 foil highlight.
 * Falls back to pointer parallax when DeviceOrientation is unavailable or denied.
 *
 * On iOS, call `enableMotion()` from a user gesture as early as possible
 * (page chrome / first tap) — not only when flipping the card.
 */
export function useFoilTilt(enabled = true) {
  const [tilt, setTilt] = useState<FoilTilt>(DEFAULT_TILT);
  const [source, setSource] = useState<'orientation' | 'pointer' | 'idle'>('idle');
  const [needsPermission, setNeedsPermission] = useState(() => deviceOrientationNeedsGesture());
  const [motionReady, setMotionReady] = useState(false);
  const pointerActive = useRef(false);
  const sourceRef = useRef(source);
  const orientationAttached = useRef(false);
  const permissionRequested = useRef(false);
  sourceRef.current = source;

  const onOrientation = useCallback((event: DeviceOrientationEvent) => {
    if (pointerActive.current) return;
    const gamma = event.gamma ?? 0;
    const beta = event.beta ?? 0;
    setTilt({
      x: clamp01((gamma + 45) / 90),
      y: clamp01((beta + 20) / 90),
    });
    setSource('orientation');
  }, []);

  const attachOrientation = useCallback(() => {
    if (orientationAttached.current || typeof window === 'undefined') return;
    window.addEventListener('deviceorientation', onOrientation, { passive: true });
    orientationAttached.current = true;
    setMotionReady(true);
    setNeedsPermission(false);
  }, [onOrientation]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Non-iOS: attach immediately on mount (no permission prompt).
    if (!deviceOrientationNeedsGesture() && typeof window.DeviceOrientationEvent !== 'undefined') {
      attachOrientation();
    }

    return () => {
      if (orientationAttached.current) {
        window.removeEventListener('deviceorientation', onOrientation);
        orientationAttached.current = false;
      }
    };
  }, [enabled, attachOrientation, onOrientation]);

  const onPointerMove = (clientX: number, clientY: number, rect: DOMRect) => {
    pointerActive.current = true;
    const x = clamp01((clientX - rect.left) / Math.max(rect.width, 1));
    const y = clamp01((clientY - rect.top) / Math.max(rect.height, 1));
    setTilt({ x, y });
    setSource('pointer');
  };

  const onPointerLeave = () => {
    pointerActive.current = false;
    if (sourceRef.current !== 'orientation') {
      setTilt(DEFAULT_TILT);
      setSource('idle');
    }
  };

  /**
   * Request orientation permission (iOS) or attach listener.
   * Safe to call repeatedly; only requests once.
   * Must be invoked from a user gesture on iOS.
   */
  const enableMotion = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') return;
    if (orientationAttached.current) {
      setNeedsPermission(false);
      setMotionReady(true);
      return;
    }

    const DOE = getOrientationCtor();
    if (DOE && typeof DOE.requestPermission === 'function') {
      if (permissionRequested.current) return;
      permissionRequested.current = true;
      try {
        const result = await DOE.requestPermission();
        if (result === 'granted') {
          attachOrientation();
        } else {
          setNeedsPermission(false);
        }
      } catch {
        setNeedsPermission(false);
      }
      return;
    }

    if (typeof window.DeviceOrientationEvent !== 'undefined') {
      attachOrientation();
    }
  }, [enabled, attachOrientation]);

  return {
    tilt,
    source,
    needsPermission,
    motionReady,
    onPointerMove,
    onPointerLeave,
    enableMotion,
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
