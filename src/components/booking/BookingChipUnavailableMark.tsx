export function BookingChipUnavailableMark() {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
      <span className="absolute left-1/2 top-1/2 block h-[150%] w-px -translate-x-1/2 -translate-y-1/2 rotate-45 bg-[var(--booking-muted)] opacity-40" />
    </span>
  );
}
