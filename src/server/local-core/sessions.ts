import { createHash, randomBytes } from "node:crypto";

export const SESSION_IDLE_TIMEOUT_MS = 7 * 24 * 60 * 60 * 1000;
export const SESSION_ABSOLUTE_TIMEOUT_MS = 30 * 24 * 60 * 60 * 1000;
export const SESSION_TOKEN_BYTES = 32;

export type LocalSession = {
  id: string;
  userId: string;
  tokenDigest: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
  revokedAt: Date | null;
};

export function createSessionToken(): string {
  return randomBytes(SESSION_TOKEN_BYTES).toString("base64url");
}

export function hashSessionToken(token: string): string {
  if (typeof token !== "string" || token.length === 0)
    throw new TypeError("Session token is required");
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function createSession(input: { id: string; userId: string; now?: Date }): {
  token: string;
  session: LocalSession;
} {
  const now = input.now ? new Date(input.now) : new Date();
  const token = createSessionToken();
  if (input.id.length === 0 || input.userId.length === 0)
    throw new TypeError("Session identity is required");
  if (!Number.isFinite(now.getTime())) throw new TypeError("Session clock is invalid");
  return {
    token,
    session: {
      id: input.id,
      userId: input.userId,
      tokenDigest: hashSessionToken(token),
      createdAt: now,
      expiresAt: new Date(now.getTime() + SESSION_ABSOLUTE_TIMEOUT_MS),
      lastSeenAt: now,
      revokedAt: null,
    },
  };
}

export function isSessionActive(
  session: Pick<LocalSession, "expiresAt" | "lastSeenAt" | "revokedAt">,
  now = new Date(),
): boolean {
  if (session.revokedAt !== null) return false;
  const current = now.getTime();
  return (
    session.expiresAt.getTime() > current &&
    session.lastSeenAt.getTime() + SESSION_IDLE_TIMEOUT_MS > current
  );
}

export function touchSession(session: LocalSession, now = new Date()): LocalSession {
  if (!isSessionActive(session, now)) throw new Error("Session is not active");
  return { ...session, lastSeenAt: new Date(now) };
}
