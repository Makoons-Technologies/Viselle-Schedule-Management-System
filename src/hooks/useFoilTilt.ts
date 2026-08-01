import { useEffect, useRef, useState } from 'react';

export type FoilTilt = { x: number; y: number };

const DEFAULT_TILT: FoilTilt = { x: 0.5, y: 0.5 };

/**
 * Maps device orientation (or pointer position) to a 0–1 foil highlight.
 * Falls back to pointer parallax when DeviceOrientation is unavailable or denied.
 */
export function useFoilTilt(enabled = true) {
  const [tilt, setTilt] = useState<FoilTilt>(DEFAULT_TILT);
  const [source, setSource] = useState<'orientation' | 'pointer' | 'idle'>('idle');
  const pointerActive = useRef(false);
  const sourceRef = useRef(source);
  sourceRef.current = source;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    let orientationAttached = false;
    let cancelled = false;

    const onOrientation = (event: DeviceOrientationEvent) => {
      if (pointerActive.current) return;
      const gamma = event.gamma ?? 0;
      const beta = event.beta ?? 0;
      const x = clamp01((gamma + 45) / 90);
      const y = clamp01((beta + 20) / 90);
      setTilt({ x, y });
      setSource('orientation');
    };

    const attachOrientation = () => {
      if (orientationAttached || cancelled) return;
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
      orientationAttached = true;
    };

    const requestPermission = async () => {
      const DOE = window.DeviceOrientationEvent as
        | (typeof DeviceOrientationEvent & {
            requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
          })
        | undefined;

      if (DOE && typeof DOE.requestPermission === 'function') {
        // iOS requires a user gesture — attach later via enableMotion().
        return;
      }

      if (typeof window.DeviceOrientationEvent !== 'undefined') {
        attachOrientation();
      }
    };

    void requestPermission();

    return () => {
      cancelled = true;
      if (orientationAttached) {
        window.removeEventListener('deviceorientation', onOrientation);
      }
    };
  }, [enabled]);

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

  /** Call from a user gesture on iOS to request orientation permission. */
  const enableMotion = async () => {
    const DOE = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
        })
      | undefined;
    if (!DOE || typeof DOE.requestPermission !== 'function') return;

    try {
      const result = await DOE.requestPermission();
      if (result !== 'granted') return;
      const onOrientation = (event: DeviceOrientationEvent) => {
        if (pointerActive.current) return;
        const gamma = event.gamma ?? 0;
        const beta = event.beta ?? 0;
        setTilt({
          x: clamp01((gamma + 45) / 90),
          y: clamp01((beta + 20) / 90),
        });
        setSource('orientation');
      };
      window.addEventListener('deviceorientation', onOrientation, { passive: true });
    } catch {
      // Permission denied — pointer fallback remains.
    }
  };

  return { tilt, source, onPointerMove, onPointerLeave, enableMotion };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}
