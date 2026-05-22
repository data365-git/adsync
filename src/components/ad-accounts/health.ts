export type HealthDot = "green" | "amber" | "red";

export function healthDot(
  lastSyncedAt: Date | string | null | undefined,
  now = new Date(),
): HealthDot {
  if (!lastSyncedAt) return "red";
  const syncedAt =
    lastSyncedAt instanceof Date ? lastSyncedAt : new Date(lastSyncedAt);
  const ageMs = now.getTime() - syncedAt.getTime();
  if (ageMs < 60 * 60 * 1000) return "green";
  if (ageMs < 24 * 60 * 60 * 1000) return "amber";
  return "red";
}
