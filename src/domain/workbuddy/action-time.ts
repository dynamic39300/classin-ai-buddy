export function isActionExpired(expiresAt: string, checkedAt: string): boolean {
  const expiry = Date.parse(expiresAt);
  const check = Date.parse(checkedAt);
  return !Number.isFinite(expiry) || !Number.isFinite(check) || check >= expiry;
}

export function addMinutesToTimestamp(iso: string, minutes: number): string {
  const timestamp = Date.parse(iso);
  if (!Number.isFinite(timestamp) || !Number.isFinite(minutes)) throw new Error('Action renewal requires a valid clock and TTL.');
  return new Date(timestamp + minutes * 60_000).toISOString();
}
