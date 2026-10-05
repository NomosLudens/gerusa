import {
  authenticateCredential,
  requireUser,
  revokeSession,
  sessionCookie,
  type LocalAuthRepository,
} from "./auth-service";
import { clearSessionCookie } from "./cookies";
import { isSameOriginRequest } from "./csrf";

export type LocalAuthHttpDependencies = {
  repository: LocalAuthRepository;
  lookupKey: string | Uint8Array;
  expectedOrigin: string;
  now?: () => Date;
  nextSessionId?: () => string;
};

export const MAX_AUTH_REQUEST_BYTES = 8 * 1024;

async function readJsonBody(
  request: Request,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const declaredLength = request.headers.get("content-length");
  if (declaredLength) {
    const length = Number(declaredLength);
    if (Number.isFinite(length) && length > MAX_AUTH_REQUEST_BYTES) {
      return { ok: false, status: 413 };
    }
  }
  try {
    const text = await request.text();
    if (new TextEncoder().encode(text).byteLength > MAX_AUTH_REQUEST_BYTES) {
      return { ok: false, status: 413 };
    }
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400 };
  }
}

function noStoreHeaders(headers: HeadersInit = {}): Headers {
  const result = new Headers(headers);
  result.set("Cache-Control", "no-store");
  return result;
}

function forbiddenCsrf(): Response {
  return Response.json({ error: "csrf_rejected" }, { status: 403, headers: noStoreHeaders() });
}

function currentNow(input: LocalAuthHttpDependencies): Date {
  return input.now ? input.now() : new Date();
}

export async function handleLocalAuthPost(
  request: Request,
  input: LocalAuthHttpDependencies,
): Promise<Response> {
  if (!isSameOriginRequest(request, input.expectedOrigin)) return forbiddenCsrf();

  const parsedBody = await readJsonBody(request);
  if (!parsedBody.ok) {
    return Response.json(
      { error: parsedBody.status === 413 ? "payload_too_large" : "invalid_json" },
      { status: parsedBody.status, headers: noStoreHeaders() },
    );
  }
  const body = parsedBody.value;
  const credential =
    body &&
    typeof body === "object" &&
    typeof (body as { credential?: unknown }).credential === "string"
      ? (body as { credential: string }).credential
      : null;
  if (!credential) {
    return Response.json(
      { error: "invalid_credential" },
      { status: 400, headers: noStoreHeaders() },
    );
  }

  const authenticated = await authenticateCredential({
    repository: input.repository,
    credential,
    lookupKey: input.lookupKey,
    sessionId: input.nextSessionId ? input.nextSessionId() : crypto.randomUUID(),
    now: currentNow(input),
  });
  if (!authenticated) {
    return Response.json(
      { error: "invalid_credential" },
      { status: 401, headers: noStoreHeaders() },
    );
  }

  return Response.json(
    { user: { id: authenticated.authenticated.user.id } },
    {
      status: 201,
      headers: noStoreHeaders({ "Set-Cookie": sessionCookie(authenticated.token) }),
    },
  );
}

export async function handleLocalAuthGet(
  request: Request,
  input: LocalAuthHttpDependencies,
): Promise<Response> {
  const authenticated = await requireUser({
    request,
    repository: input.repository,
    now: currentNow(input),
  });
  if (!authenticated) {
    return Response.json({ error: "unauthorized" }, { status: 401, headers: noStoreHeaders() });
  }
  return Response.json({ user: { id: authenticated.user.id } }, { headers: noStoreHeaders() });
}

export async function handleLocalAuthDelete(
  request: Request,
  input: LocalAuthHttpDependencies,
): Promise<Response> {
  if (!isSameOriginRequest(request, input.expectedOrigin)) return forbiddenCsrf();
  const authenticated = await requireUser({
    request,
    repository: input.repository,
    now: currentNow(input),
  });
  if (authenticated) {
    await revokeSession({
      repository: input.repository,
      sessionId: authenticated.session.id,
      now: currentNow(input),
    });
  }
  return new Response(null, {
    status: 204,
    headers: noStoreHeaders({ "Set-Cookie": clearSessionCookie() }),
  });
}
