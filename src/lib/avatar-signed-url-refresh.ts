export const AVATAR_SIGNED_URL_REFRESH_MS = 50 * 60 * 1000;

export function shouldRefreshAvatarSignedUrl(
  lastSignedAtMs: number | null,
  nowMs: number,
  thresholdMs = AVATAR_SIGNED_URL_REFRESH_MS,
): boolean {
  return lastSignedAtMs !== null && nowMs - lastSignedAtMs >= thresholdMs;
}
