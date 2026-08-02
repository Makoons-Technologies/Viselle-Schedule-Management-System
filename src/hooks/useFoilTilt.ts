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
 * Best-effort DeviceOrientation permission request.
 * Safe to call on mount (no-ops / soft-fails without a gesture on iOS).
 * Call again from pointerdown/touchstart for iOS Safari.
 */
export async function requestDeviceOrientationPermission(): Promise<'granted' | 'denied' | 'unavailable'> {
  if (typeof window === 'undefined') return 'unavailable';

  const DOE = getOrientationCtor();
  if (DOE && typeof DOE.requestPermission === 'function') {
    try {
      const result = await DOE.requestPermission();
      return result === 'granted' ? 'granted' : 'denied';
    } catch {
      // No user gesture yet (common on iOS) — caller may retry.
      return 'unavailable';
    }
  }

  if (typeof window.DeviceOrientationEvent !== 'undefined') {
    return 'granted';
  }

  return 'unavailable';
}

/**
 * Maps device orientation (or pointer position) to a 0–1 foil highlight.
 * Falls back to pointer parallax when DeviceOrientation is unavailable or denied.
 *
 * On iOS, call `enableMotion()` from a user gesture as early as possible
 * (card mount contact / first tap) — not only when flipping the card.
 */
export function useFoilTilt(enabled = true) {
  const [tilt, setTilt] = useState<FoilTilt>(DEFAULT_TILT);
  const [source, setSource] = useState<'orientation' | 'pointer' | 'idle'>('idle');
  const [needsPermission, setNeedsPermission] = useState(() => deviceOrientationNeedsGesture());
  const [motionReady, setMotionReady] = useState(false);
  const pointerActive = useRef(false);
  const sourceRef = useRef(source);
  const orientationAttached = useRef(false);
  const permissionInFlight = useRef(false);
  const permanentlyDenied = useRef(false);
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

  /**
   * Request orientation permission (iOS) or attach listener.
   * Safe to call repeatedly; retries after soft failures (no gesture).
   * Must be invoked from a user gesture on iOS for the prompt to appear.
   */
  const enableMotion = useCallback(async () => {
    if (!enabled || typeof window === 'undefined') return;
    if (orientationAttached.current) {
      setNeedsPermission(false);
      setMotionReady(true);
      return;
    }
    if (permanentlyDenied.current || permissionInFlight.current) return;

    const DOE = getOrientationCtor();
    if (DOE && typeof DOE.requestPermission === 'function') {
      permissionInFlight.current = true;
      try {
        const result = await DOE.requestPermission();
        if (result === 'granted') {
          attachOrientation();
        } else {
          permanentlyDenied.current = true;
          setNeedsPermission(false);
        }
      } catch {
        // Likely missing user gesture — keep needsPermission so first contact / fallback can retry.
        setNeedsPermission(true);
      } finally {
        permissionInFlight.current = false;
      }
      return;
    }

    if (typeof window.DeviceOrientationEvent !== 'undefined') {
      attachOrientation();
    } else {
      setNeedsPermission(false);
    }
  }, [enabled, attachOrientation]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    // Non-iOS / already-granted: attach immediately on mount.
    if (!deviceOrientationNeedsGesture() && typeof window.DeviceOrientationEvent !== 'undefined') {
      attachOrientation();
    } else {
      // Best effort on mount (succeeds if previously granted; soft-fails without gesture on iOS).
      void enableMotion();
    }

    return () => {
      if (orientationAttached.current) {
        window.removeEventListener('deviceorientation', onOrientation);
        orientationAttached.current = false;
      }
    };
  }, [enabled, attachOrientation, onOrientation, enableMotion]);

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

/**
 * Auto-request DeviceOrientation when a marketing / card experience mounts,
 * and again on the earliest user gesture (required on iOS Safari).
 */
export function useAutoMotionPermission(enabled = true) {
  const requestedViaGesture = useRef(false);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    void requestDeviceOrientationPermission();

    const onFirstGesture = () => {
      if (requestedViaGesture.current) return;
      requestedViaGesture.current = true;
      void requestDeviceOrientationPermission();
    };

    window.addEventListener('pointerdown', onFirstGesture, { capture: true, once: true });
    window.addEventListener('touchstart', onFirstGesture, { capture: true, once: true, passive: true });
    return () => {
      window.removeEventListener('pointerdown', onFirstGesture, true);
      window.removeEventListener('touchstart', onFirstGesture, true);
    };
  }, [enabled]);
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
