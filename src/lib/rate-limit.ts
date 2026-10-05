// Rate limit em memória, best-effort por isolate do Worker.
// Não é distribuído: em produção com múltiplos isolates a janela é por isolate.
// O relatório de segurança deixa claro que é mitigação inicial — para abuso
// global usar Cloudflare Rate Limiting ou Durable Object por usuário.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; retryAfter: number };

export function checkRateLimit(key: string, limit: number, windowSec: number): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const resetAt = now + windowSec * 1000;
    buckets.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt };
  }
  if (existing.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt };
}

// Garbage collection leve para não vazar memória entre janelas.
let lastSweep = Date.now();
function sweepExpired() {
  const now = Date.now();
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

export function rateLimit(
  userId: string,
  feature: string,
  limit: number,
  windowSec = 60,
): Response | null {
  sweepExpired();
  const r = checkRateLimit(`${feature}:${userId}`, limit, windowSec);
  if (r.ok) return null;
  return new Response(
    JSON.stringify({
      error: "rate_limited",
      message: `Muitas requisições em ${feature}. Tente novamente em ${r.retryAfter}s.`,
    }),
    {
      status: 429,
      headers: {
        "content-type": "application/json",
        "retry-after": String(r.retryAfter),
      },
    },
  );
}

export type ChatRateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type CloudflareChatRequest = Request & {
  __cfChatRateLimiter?: ChatRateLimitBinding;
  __cfPreAuthChatRateLimiter?: ChatRateLimitBinding;
  __requestId?: string;
};

const CHAT_RATE_LIMIT = 10;
const CHAT_PRE_AUTH_RATE_LIMIT = 20;

function networkKeyFor(request: Request): string | null {
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-forwarded-for")?.split(",", 1)[0],
    request.headers.get("x-real-ip"),
  ];
  return candidates.map((value) => value?.trim()).find(Boolean) ?? null;
}

export function requestIdFor(request: Request): string {
  return (request as CloudflareChatRequest).__requestId ?? crypto.randomUUID();
}

export async function distributedChatRateLimit(
  request: Request,
  userId: string,
): Promise<Response | null> {
  const binding = (request as CloudflareChatRequest).__cfChatRateLimiter;
  const requestId = requestIdFor(request);
  if (!binding) {
    console.warn(
      JSON.stringify({
        level: "warn",
        type: "rate_limit_binding_missing_fallback_memory",
        operation: "chat",
        request_id: requestId,
      }),
    );
    return rateLimit(userId, "chat", CHAT_RATE_LIMIT);
  }

  let success: boolean;
  try {
    ({ success } = await binding.limit({ key: `chat:${userId}` }));
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        type: "rate_limit_binding_failed",
        operation: "chat",
        request_id: requestId,
      }),
    );
    return Response.json(
      {
        error: "rate_limit_unavailable",
        reason: "O controle de uso do chat está indisponível.",
        requestId,
      },
      { status: 503 },
    );
  }
  if (success) return null;

  return Response.json(
    {
      error: "rate_limited",
      reason: "Limite de uso do chat atingido. Tente novamente em até 60 segundos.",
      requestId,
    },
    {
      status: 429,
      headers: { "retry-after": "60" },
    },
  );
}

export async function distributedPreAuthChatRateLimit(request: Request): Promise<Response | null> {
  const binding = (request as CloudflareChatRequest).__cfPreAuthChatRateLimiter;
  const requestId = requestIdFor(request);
  const networkKey = networkKeyFor(request);
  if (!binding) {
    console.warn(
      JSON.stringify({
        level: "warn",
        type: "rate_limit_binding_missing_fallback_memory",
        operation: "chat_pre_auth",
        request_id: requestId,
      }),
    );
    return rateLimit(networkKey ?? "unknown", "chat-preauth", CHAT_PRE_AUTH_RATE_LIMIT);
  }
  if (!networkKey) {
    console.error(
      JSON.stringify({
        level: "error",
        type: "rate_limit_pre_auth_unavailable",
        operation: "chat_pre_auth",
        request_id: requestId,
      }),
    );
    return Response.json(
      {
        error: "rate_limit_unavailable",
        reason: "O controle de uso pré-autenticação está indisponível.",
        requestId,
      },
      { status: 503 },
    );
  }

  try {
    const { success } = await binding.limit({ key: `chat-preauth:${networkKey}` });
    if (success) return null;
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        type: "rate_limit_binding_failed",
        operation: "chat_pre_auth",
        request_id: requestId,
      }),
    );
    return Response.json(
      {
        error: "rate_limit_unavailable",
        reason: "O controle de uso do chat está indisponível.",
        requestId,
      },
      { status: 503 },
    );
  }

  return Response.json(
    {
      error: "rate_limited",
      reason: "Muitas tentativas de autenticação para o chat. Tente novamente em até 60 segundos.",
      requestId,
    },
    { status: 429, headers: { "retry-after": "60" } },
  );
}
