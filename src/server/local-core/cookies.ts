export const SESSION_COOKIE_NAME = "__Host-gerusa_session";

function cookieDate(date: Date): string {
  return date.toUTCString();
}

export function buildSessionCookie(token: string, maxAgeSeconds: number): string {
  if (!token || !Number.isInteger(maxAgeSeconds) || maxAgeSeconds <= 0) {
    throw new TypeError("Invalid session cookie");
  }
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${maxAgeSeconds}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; Expires=${cookieDate(new Date(0))}; HttpOnly; Secure; SameSite=Lax`;
}

export function readSessionCookie(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const [name, ...valueParts] = part.trim().split("=");
    if (name !== SESSION_COOKIE_NAME) continue;
    const value = valueParts.join("=");
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  }
  return null;
}
