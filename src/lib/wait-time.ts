export function daysToReadable(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  const weeks = Math.round(days / 7);
  return `~${weeks} week${weeks === 1 ? "" : "s"}`;
}
