export function formatMembershipPoints(points: number): string {
  const value = Math.max(0, Math.floor(points));
  return value === 1 ? '1 point' : `${value} points`;
}
