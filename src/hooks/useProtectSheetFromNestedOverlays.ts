import { useCallback, useEffect, useRef } from 'react';

/**
 * Nested Radix Dialogs (portaled) often dismiss a parent Sheet on close:
 * React clears `nestedOpen` before Dialog teardown finishes, so a Sheet
 * `onOpenChange(false)` from that teardown would otherwise slip through.
 */
export function useProtectSheetFromNestedOverlays(nestedOpen: boolean) {
  const nestedOpenRef = useRef(nestedOpen);
  const teardownGuardRef = useRef(false);
  const teardownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (nestedOpen) {
      nestedOpenRef.current = true;
      teardownGuardRef.current = false;
      if (teardownTimerRef.current != null) {
        clearTimeout(teardownTimerRef.current);
        teardownTimerRef.current = null;
      }
      return;
    }

    teardownGuardRef.current = true;
    teardownTimerRef.current = setTimeout(() => {
      nestedOpenRef.current = false;
      teardownGuardRef.current = false;
      teardownTimerRef.current = null;
    }, 100);

    return () => {
      if (teardownTimerRef.current != null) {
        clearTimeout(teardownTimerRef.current);
        teardownTimerRef.current = null;
      }
    };
  }, [nestedOpen]);

  const shouldBlockSheetClose = useCallback(
    () => nestedOpenRef.current || teardownGuardRef.current || nestedOpen,
    [nestedOpen],
  );

  const handleSheetOpenChange = useCallback(
    (next: boolean, onOpenChange: (open: boolean) => void) => {
      if (!next && shouldBlockSheetClose()) return;
      onOpenChange(next);
    },
    [shouldBlockSheetClose],
  );

  const preventSheetDismissWhileNested = useCallback(
    (event: { preventDefault: () => void }) => {
      if (shouldBlockSheetClose()) event.preventDefault();
    },
    [shouldBlockSheetClose],
  );

  return { handleSheetOpenChange, preventSheetDismissWhileNested, shouldBlockSheetClose };
}
