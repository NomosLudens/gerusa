import { credentialLookupDigest, normalizeCredential, verifyCredential } from "./credentials";
import { buildSessionCookie, readSessionCookie } from "./cookies";
import { createSession, hashSessionToken, type LocalSession } from "./sessions";

export type LocalUser = { id: string; status: "active" | "disabled" };
export type StoredCredential = {
  user: LocalUser;
  credentialHash: string;
  lookupDigest: string;
  revokedAt: Date | null;
};

export interface LocalAuthRepository {
  findCredentialByLookupDigest(digest: string): Promise<StoredCredential | null>;
  insertSession(session: LocalSession): Promise<void>;
  findAndTouchActiveSessionByTokenDigest(
    digest: string,
    now: Date,
  ): Promise<AuthenticatedUser | null>;
  revokeSession(id: string, revokedAt: Date): Promise<void>;
}

export type AuthenticatedUser = { user: LocalUser; session: LocalSession };

export async function authenticateCredential(input: {
  repository: LocalAuthRepository;
  credential: string;
  lookupKey: string | Uint8Array;
  sessionId: string;
  now?: Date;
}): Promise<{ token: string; authenticated: AuthenticatedUser } | null> {
  let normalized: string;
  try {
    normalized = normalizeCredential(input.credential);
  } catch {
    return null;
  }
  const digest = credentialLookupDigest(normalized, input.lookupKey);
  const stored = await input.repository.findCredentialByLookupDigest(digest);
  if (!stored || stored.revokedAt || stored.user.status !== "active") return null;
  if (!(await verifyCredential(normalized, stored.credentialHash))) return null;
  const { token, session } = createSession({
    id: input.sessionId,
    userId: stored.user.id,
    now: input.now,
  });
  await input.repository.insertSession(session);
  return { token, authenticated: { user: stored.user, session } };
}

export async function requireUser(input: {
  request: Request;
  repository: LocalAuthRepository;
  now?: Date;
}): Promise<AuthenticatedUser | null> {
  const token = readSessionCookie(input.request.headers.get("cookie"));
  if (!token) return null;
  return input.repository.findAndTouchActiveSessionByTokenDigest(
    hashSessionToken(token),
    input.now ?? new Date(),
  );
}

export async function revokeSession(input: {
  repository: LocalAuthRepository;
  sessionId: string;
  now?: Date;
}): Promise<void> {
  await input.repository.revokeSession(input.sessionId, input.now ?? new Date());
}

export function sessionCookie(token: string): string {
  return buildSessionCookie(token, 30 * 24 * 60 * 60);
}

export function ownsResource(userId: string, ownerId: string): boolean {
  return userId.length > 0 && userId === ownerId;
}
