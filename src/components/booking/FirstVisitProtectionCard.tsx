import { useEffect, useRef, useState } from 'react';
import type { BookingTheme } from '@/components/booking/booking-theme';
import {
  firstVisitProtectionClientCopy,
  firstVisitProtectionHeadline,
} from '@/lib/first-visit-protection';
import type { FirstVisitCardSession } from '@/lib/stripe-first-visit';
import { cn } from '@/lib/utils';
import type { FirstVisitProtectionMode } from '@/types/api';

interface FirstVisitProtectionCardProps {
  mode: FirstVisitProtectionMode;
  depositCents?: number | null;
  theme: BookingTheme;
  session?: FirstVisitCardSession | null;
  sessionError?: string | null;
  sessionLoading?: boolean;
  collectionReady?: boolean;
}

export function FirstVisitProtectionCard({
  mode,
  depositCents,
  theme,
  session,
  sessionError,
  sessionLoading,
  collectionReady,
}: FirstVisitProtectionCardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mountError, setMountError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !session) return;
    setMountError(null);
    try {
      session.mount(container);
    } catch (err) {
      setMountError(err instanceof Error ? err.message : 'Could not show the card form');
    }
    return () => session.unmount();
  }, [session]);

  return (
    <div className={cn('space-y-3 border px-4 py-4', theme.choiceShape, theme.choice)}>
      <div>
        <p className="text-sm font-semibold text-neutral-900">{firstVisitProtectionHeadline(mode, depositCents)}</p>
        <p className={cn('mt-1 text-xs leading-relaxed', theme.mutedText)}>
          {firstVisitProtectionClientCopy(mode, depositCents)}
        </p>
      </div>
      {sessionLoading && (
        <p className={cn('text-xs', theme.mutedText)}>Preparing card form…</p>
      )}
      {session && <div ref={containerRef} className="min-h-[120px]" />}
      {!session && !sessionLoading && collectionReady === false && (
        <p className={cn('text-xs', theme.mutedText)}>
          This studio still needs to finish Stripe setup before a card can be collected.
        </p>
      )}
      {(sessionError || mountError) && (
        <p className="text-xs text-red-600">{sessionError ?? mountError}</p>
      )}
    </div>
  );
}
