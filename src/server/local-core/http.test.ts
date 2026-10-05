import { describe, expect, it } from "vitest";
import { hashCredential, credentialLookupDigest } from "./credentials";
import {
  handleLocalAuthDelete,
  handleLocalAuthGet,
  handleLocalAuthPost,
  MAX_AUTH_REQUEST_BYTES,
  type LocalAuthHttpDependencies,
} from "./http";
import type { LocalAuthRepository, StoredCredential } from "./auth-service";
import type { LocalSession } from "./sessions";

class HttpAuthRepository implements LocalAuthRepository {
  credential: StoredCredential;
  session: LocalSession | null = null;

  constructor(credential: StoredCredential) {
    this.credential = credential;
  }

  async findCredentialByLookupDigest(digest: string) {
    return this.credential.lookupDigest === digest ? this.credential : null;
  }

  async insertSession(session: LocalSession) {
    this.session = session;
  }

  async findAndTouchActiveSessionByTokenDigest(digest: string, now: Date) {
    if (!this.session || this.session.tokenDigest !== digest) return null;
    if (this.session.revokedAt || this.session.expiresAt <= now) return null;
    this.session = { ...this.session, lastSeenAt: now };
    return { user: this.credential.user, session: this.session };
  }

  async revokeSession(id: string, revokedAt: Date) {
    if (this.session?.id === id && !this.session.revokedAt) {
      this.session = { ...this.session, revokedAt };
    }
  }
}

async function fixture() {
  const credential = "Chave HTTP";
  const stored: StoredCredential = {
    user: { id: "user-http", status: "active" },
    credentialHash: await hashCredential(credential),
    lookupDigest: credentialLookupDigest(credential, "http-lookup-key"),
    revokedAt: null,
  };
  const repository = new HttpAuthRepository(stored);
  const dependencies: LocalAuthHttpDependencies = {
    repository,
    lookupKey: "http-lookup-key",
    expectedOrigin: "https://kallistis.app",
    now: () => new Date("2026-08-30T00:00:00Z"),
    nextSessionId: () => "session-http",
  };
  return { repository, dependencies };
}

describe("endpoint de sessão local", () => {
  it("limita o corpo antes de tentar autenticar", async () => {
    const { dependencies } = await fixture();
    const response = await handleLocalAuthPost(
      new Request("https://kallistis.app/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://kallistis.app" },
        body: JSON.stringify({ credential: "x".repeat(MAX_AUTH_REQUEST_BYTES) }),
      }),
      dependencies,
    );
    expect(response.status).toBe(413);
    expect(await response.json()).toEqual({ error: "payload_too_large" });
  });

  it("recusa POST sem prova same-origin antes de autenticar", async () => {
    const { dependencies } = await fixture();
    const response = await handleLocalAuthPost(
      new Request("https://kallistis.app/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://evil.example" },
        body: JSON.stringify({ credential: "Chave HTTP" }),
      }),
      dependencies,
    );
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "csrf_rejected" });
  });

  it("faz login, consulta sessão e revoga no logout", async () => {
    const { dependencies } = await fixture();
    const login = await handleLocalAuthPost(
      new Request("https://kallistis.app/api/auth/session", {
        method: "POST",
        headers: { "content-type": "application/json", origin: "https://kallistis.app" },
        body: JSON.stringify({ credential: " Chave HTTP " }),
      }),
      dependencies,
    );
    expect(login.status).toBe(201);
    const cookie = login.headers.get("set-cookie");
    expect(cookie).toContain("__Host-kallistis_session=");

    const sessionRequest = () =>
      new Request("https://kallistis.app/api/auth/session", { headers: { cookie: cookie! } });
    expect(await (await handleLocalAuthGet(sessionRequest(), dependencies)).json()).toEqual({
      user: { id: "user-http" },
    });

    const logout = await handleLocalAuthDelete(
      new Request("https://kallistis.app/api/auth/session", {
        method: "DELETE",
        headers: { cookie: cookie!, origin: "https://kallistis.app" },
      }),
      dependencies,
    );
    expect(logout.status).toBe(204);
    expect(logout.headers.get("set-cookie")).toContain("Max-Age=0");
    expect((await handleLocalAuthGet(sessionRequest(), dependencies)).status).toBe(401);
  }, 15_000);
});
