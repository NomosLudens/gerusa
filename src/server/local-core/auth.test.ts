import { describe, expect, it } from "vitest";
import {
  authenticateCredential,
  requireUser,
  revokeSession,
  type LocalAuthRepository,
  type StoredCredential,
} from "./auth-service";
import { buildSessionCookie, clearSessionCookie, readSessionCookie } from "./cookies";
import {
  credentialLookupDigest,
  hashCredential,
  normalizeCredential,
  verifyCredential,
} from "./credentials";
import { isSameOriginRequest } from "./csrf";
import { createSession, hashSessionToken, isSessionActive, type LocalSession } from "./sessions";

class UnitAuthRepository implements LocalAuthRepository {
  credential: StoredCredential | null = null;
  sessions = new Map<string, LocalSession>();

  async findCredentialByLookupDigest(digest: string) {
    return this.credential && this.credential.lookupDigest === digest ? this.credential : null;
  }

  async insertSession(session: LocalSession) {
    this.sessions.set(session.tokenDigest, session);
  }

  async findAndTouchActiveSessionByTokenDigest(digest: string, now: Date) {
    const session = this.sessions.get(digest);
    const user =
      session && this.credential?.user.id === session.userId ? this.credential.user : null;
    if (!session || !user || user.status !== "active") return null;
    if (session.revokedAt || session.expiresAt <= now) return null;
    const lastSeenAt = now;
    const updated = { ...session, lastSeenAt };
    this.sessions.set(digest, updated);
    return { user, session: updated };
  }

  async revokeSession(id: string, revokedAt: Date) {
    for (const [digest, session] of this.sessions) {
      if (session.id === id) this.sessions.set(digest, { ...session, revokedAt });
    }
  }
}

describe("credencial local", () => {
  it("normaliza somente as bordas", () => {
    expect(normalizeCredential("  Ab C  ")).toBe("Ab C");
  });

  it("verifica a credencial correta, rejeita a errada e usa salt", async () => {
    const first = await hashCredential("Chave sintética A");
    const second = await hashCredential("Chave sintética A");
    expect(first).not.toBe(second);
    expect(await verifyCredential("Chave sintética A", first)).toBe(true);
    expect(await verifyCredential("chave sintética A", first)).toBe(false);
    expect(await verifyCredential("Chave sintética A", "not-a-hash")).toBe(false);
  }, 15_000);

  it("não deriva lookup sem chave de runtime", () => {
    expect(() => credentialLookupDigest("teste", "")).toThrow();
  });
});

describe("sessão e cookie", () => {
  it("gera segredo opaco com entropia suficiente e armazena somente seu digest", () => {
    const result = createSession({
      id: "session-a",
      userId: "user-a",
      now: new Date("2026-08-30T00:00:00Z"),
    });
    expect(result.token).toHaveLength(43);
    expect(result.session.tokenDigest).toBe(hashSessionToken(result.token));
    expect(result.session.tokenDigest).not.toBe(result.token);
    expect(isSessionActive(result.session, new Date("2026-08-30T00:01:00Z"))).toBe(true);
    expect(isSessionActive({ ...result.session, revokedAt: new Date() })).toBe(false);
    expect(
      isSessionActive({ ...result.session, expiresAt: new Date("2026-08-29T23:59:00Z") }),
    ).toBe(false);
  });

  it("centraliza flags do cookie e a remoção", () => {
    const cookie = buildSessionCookie("opaque-token", 3600);
    expect(cookie).toContain("__Host-kallistis_session=opaque-token");
    expect(cookie).toContain("Path=/");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(readSessionCookie(`${cookie}; other=value`)).toBe("opaque-token");
    expect(clearSessionCookie()).toContain("Max-Age=0");
  });
});

describe("serviço de auth e CSRF", () => {
  it("autentica, cria sessão e exige a mesma sessão no request", async () => {
    const repository = new UnitAuthRepository();
    const hash = await hashCredential("Chave sintética B");
    repository.credential = {
      user: { id: "user-b", status: "active" },
      credentialHash: hash,
      revokedAt: null,
      lookupDigest: credentialLookupDigest("Chave sintética B", "lookup-test-key"),
    };
    const loggedIn = await authenticateCredential({
      repository,
      credential: "  Chave sintética B ",
      lookupKey: "lookup-test-key",
      sessionId: "session-b",
      now: new Date("2026-08-30T00:00:00Z"),
    });
    expect(loggedIn?.authenticated.user.id).toBe("user-b");
    const request = new Request("https://kallistis.app/api/auth/session", {
      headers: { cookie: `__Host-kallistis_session=${loggedIn?.token}` },
    });
    expect(
      (await requireUser({ request, repository, now: new Date("2026-08-30T00:01:00Z") }))?.user.id,
    ).toBe("user-b");
    expect(
      await authenticateCredential({
        repository,
        credential: "Chave errada",
        lookupKey: "lookup-test-key",
        sessionId: "session-c",
      }),
    ).toBeNull();
  }, 15_000);

  it("aceita mesma origem, rejeita origem estrangeira e explicita ausência", () => {
    expect(
      isSameOriginRequest(
        new Request("https://kallistis.app/api/x", { method: "GET" }),
        "https://kallistis.app",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Request("https://kallistis.app/api/x", {
          method: "POST",
          headers: { origin: "https://kallistis.app" },
        }),
        "https://kallistis.app",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Request("https://kallistis.app/api/x", {
          method: "POST",
          headers: { origin: "https://evil.example" },
        }),
        "https://kallistis.app",
      ),
    ).toBe(false);
    expect(
      isSameOriginRequest(
        new Request("https://kallistis-recovery.khykwyvbfb.workers.dev/api/x", {
          method: "POST",
          headers: { origin: "https://kallistis-recovery.khykwyvbfb.workers.dev" },
        }),
        "https://kallistis.app,https://kallistis-recovery.khykwyvbfb.workers.dev",
      ),
    ).toBe(true);
    expect(
      isSameOriginRequest(
        new Request("https://kallistis.app/api/x", { method: "POST" }),
        "https://kallistis.app",
      ),
    ).toBe(false);
  });

  it("usa uma operação atômica no repositório para validar a sessão", async () => {
    const repository = new UnitAuthRepository();
    const hash = await hashCredential("Chave atômica");
    repository.credential = {
      user: { id: "user-atomic", status: "active" },
      credentialHash: hash,
      revokedAt: null,
      lookupDigest: credentialLookupDigest("Chave atômica", "lookup-atomic"),
    };
    const loggedIn = await authenticateCredential({
      repository,
      credential: "Chave atômica",
      lookupKey: "lookup-atomic",
      sessionId: "session-atomic",
    });
    expect(loggedIn).not.toBeNull();
    const request = new Request("https://kallistis.app/api/auth/session", {
      headers: { cookie: `__Host-kallistis_session=${loggedIn?.token}` },
    });
    expect(await requireUser({ request, repository })).not.toBeNull();
    await revokeSession({ repository, sessionId: "session-atomic" });
    expect(await requireUser({ request, repository })).toBeNull();
  }, 15_000);
});
