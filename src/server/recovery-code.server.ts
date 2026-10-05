import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizeCredential } from "@/server/local-core/credentials";
import { type SqlExecutor } from "@/server/local-core/postgres";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildSupabaseSessionCookie } from "@/server/runtime/supabase-auth";
import { getRuntimeEnv } from "@/server/runtime/context";

export const RECOVERY_FAILURE_MESSAGE =
  "Não foi possível validar a recuperação. Confira os dados e tente novamente.";

const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const RECOVERY_CODE_LENGTH = 16;
const RECOVERY_CODE_PATTERN = /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{16}$/;
const MAX_RECOVERY_ATTEMPTS = 5;
const RECOVERY_LOCK_SECONDS = 15 * 60;

type RecoveryRateLimiter = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

type RecoveryRequest = Request & {
  __cfRecoveryRateLimiter?: RecoveryRateLimiter;
};

type RecoveryCandidate = {
  user_id: string;
  code_hash: string;
  failed_attempts: number;
  locked_until: string | null;
  processing_until: string | null;
};

type RecoveryAdminUser = { email?: string | null };

type RecoveryResult = {
  newRecoveryCode: string;
  accessToken: string | null;
  sessionEstablished: boolean;
};

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const padded = value
      .replaceAll("-", "+")
      .replaceAll("_", "/")
      .padEnd(Math.ceil(value.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

async function hmacSha256Base64Url(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function constantTimeEqualBase64Url(left: string, right: string): boolean {
  const leftBytes = base64UrlToBytes(left);
  const rightBytes = base64UrlToBytes(right);
  if (!leftBytes || !rightBytes || leftBytes.length !== rightBytes.length) return false;
  let difference = 0;
  for (let index = 0; index < leftBytes.length; index += 1) {
    difference |= leftBytes[index] ^ rightBytes[index];
  }
  return difference === 0;
}

export function normalizeRecoveryCode(value: string): string {
  if (typeof value !== "string") throw new TypeError("recovery_code_invalid");
  const normalized = value.replace(/[\s-]/gu, "").toUpperCase();
  if (!RECOVERY_CODE_PATTERN.test(normalized)) throw new TypeError("recovery_code_invalid");
  return normalized;
}

export function generateRecoveryCode(): string {
  const bytes = new Uint8Array(RECOVERY_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let raw = "";
  for (const byte of bytes) raw += RECOVERY_ALPHABET[byte & 31];
  return raw.match(/.{4}/gu)!.join("-");
}

export async function hashRecoveryCode(code: string, pepper: string): Promise<string> {
  return hmacSha256Base64Url(pepper, normalizeRecoveryCode(code));
}

function genericRecoveryResponse(status = 400): Response {
  return Response.json(
    { error: "recovery_failed", message: RECOVERY_FAILURE_MESSAGE },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

function clientForAdmin(): SupabaseClient {
  const runtime = getRuntimeEnv();
  if (!runtime.supabaseUrl || !runtime.supabaseServiceRoleKey) {
    throw new Error("recovery_admin_not_configured");
  }
  return createClient(runtime.supabaseUrl, runtime.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function clientForSignIn(): SupabaseClient {
  const runtime = getRuntimeEnv();
  if (!runtime.supabaseUrl || !runtime.supabasePublishableKey) {
    throw new Error("recovery_auth_not_configured");
  }
  return createClient(runtime.supabaseUrl, runtime.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

function networkKeyFor(request: Request): string | null {
  return (
    [
      request.headers.get("cf-connecting-ip"),
      request.headers.get("x-forwarded-for")?.split(",", 1)[0],
      request.headers.get("x-real-ip"),
    ]
      .map((value) => value?.trim())
      .find(Boolean) ?? null
  );
}

async function consumeRecoveryRateLimit(
  request: Request,
  wordDigest: string,
): Promise<"ok" | "limited" | "unavailable"> {
  const binding = (request as RecoveryRequest).__cfRecoveryRateLimiter;
  const keys = [`recovery:word:${wordDigest}`];
  const networkKey = networkKeyFor(request);
  if (networkKey) keys.push(`recovery:ip:${networkKey}`);
  if (!binding) {
    for (const key of keys) {
      if (!checkRateLimit(key, MAX_RECOVERY_ATTEMPTS, 5 * 60).ok) return "limited";
    }
    return "ok";
  }
  try {
    for (const key of keys) {
      const result = await binding.limit({ key });
      if (!result.success) return "limited";
    }
    return "ok";
  } catch {
    return "unavailable";
  }
}

async function recordEvent(
  sql: SqlExecutor,
  userId: string | null,
  eventType: string,
): Promise<void> {
  await sql.query("INSERT INTO public.auth_recovery_events (user_id, event_type) VALUES ($1, $2)", [
    userId,
    eventType,
  ]);
}

async function recordInvalidAttempt(sql: SqlExecutor, userId: string): Promise<void> {
  const save = async (tx: SqlExecutor) => {
    const rows = await tx.query<{ failed_attempts: number }>(
      `UPDATE public.user_recovery_credentials
          SET failed_attempts = failed_attempts + 1,
              locked_until = CASE
                WHEN failed_attempts + 1 >= $2 THEN now() + ($3 * interval '1 second')
                ELSE locked_until
              END
        WHERE user_id = $1
        RETURNING failed_attempts`,
      [userId, MAX_RECOVERY_ATTEMPTS, RECOVERY_LOCK_SECONDS],
    );
    if (rows[0]) await recordEvent(tx, userId, "RECOVERY_FAILED");
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
}

async function releaseProcessing(sql: SqlExecutor, userId: string): Promise<void> {
  await sql.query(
    "UPDATE public.user_recovery_credentials SET processing_until = NULL WHERE user_id = $1",
    [userId],
  );
}

async function quarantineAfterPartialFailure(sql: SqlExecutor, userId: string): Promise<void> {
  try {
    await sql.query(
      `UPDATE public.user_recovery_credentials
          SET used_at = now(), processing_until = NULL, locked_until = now() + interval '1 day'
        WHERE user_id = $1`,
      [userId],
    );
    await recordEvent(sql, userId, "RECOVERY_FAILED");
  } catch {
    console.error(JSON.stringify({ type: "recovery_partial_failure_quarantine_failed" }));
  }
}

async function rotateAfterSuccessfulPassword(
  sql: SqlExecutor,
  userId: string,
  newCodeHash: string,
): Promise<void> {
  const save = async (tx: SqlExecutor) => {
    const rows = await tx.query(
      `UPDATE public.user_recovery_credentials
          SET code_hash = $2,
              created_at = now(),
              rotated_at = now(),
              used_at = NULL,
              failed_attempts = 0,
              locked_until = NULL,
              processing_until = NULL
        WHERE user_id = $1 AND processing_until IS NOT NULL
        RETURNING user_id`,
      [userId, newCodeHash],
    );
    if (!rows[0]) throw new Error("recovery_rotation_not_claimed");
    await recordEvent(tx, userId, "RECOVERY_SUCCEEDED");
    await recordEvent(tx, userId, "RECOVERY_CODE_ROTATED");
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
}

export async function issueRecoveryCode(sql: SqlExecutor, userId: string): Promise<string> {
  const runtime = getRuntimeEnv();
  if (!runtime.recoveryPepper) throw new Error("recovery_pepper_not_configured");
  const code = generateRecoveryCode();
  const codeHash = await hashRecoveryCode(code, runtime.recoveryPepper);
  const save = async (tx: SqlExecutor) => {
    const user = await tx.query<{ id: string }>(
      "SELECT id::text AS id FROM public.users WHERE id=$1 AND status='active' LIMIT 1",
      [userId],
    );
    if (!user[0]) throw new Error("recovery_target_not_found");
    await tx.query(
      `INSERT INTO public.user_recovery_credentials
          (user_id, code_hash, created_at, rotated_at, used_at, failed_attempts, locked_until, processing_until)
       VALUES ($1, $2, now(), NULL, NULL, 0, NULL, NULL)
       ON CONFLICT (user_id) DO UPDATE SET
          code_hash = EXCLUDED.code_hash,
          created_at = now(),
          rotated_at = now(),
          used_at = NULL,
          failed_attempts = 0,
          locked_until = NULL,
          processing_until = NULL`,
      [userId, codeHash],
    );
    await recordEvent(tx, userId, "RECOVERY_CODE_ADMIN_RESET");
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
  return code;
}

export async function recoverWithCode(
  sql: SqlExecutor,
  request: Request,
  input: { credential: string; recoveryCode: string; newPassword: string },
): Promise<Response> {
  const runtime = getRuntimeEnv();
  if (!runtime.credentialLookupKey || !runtime.recoveryPepper) {
    return Response.json(
      { error: "recovery_not_configured" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (
    typeof input.credential !== "string" ||
    typeof input.recoveryCode !== "string" ||
    typeof input.newPassword !== "string" ||
    input.newPassword.length < 8 ||
    input.newPassword.length > 1024
  ) {
    return genericRecoveryResponse();
  }

  let normalizedCredential: string;
  let normalizedCode: string;
  try {
    normalizedCredential = normalizeCredential(input.credential);
    normalizedCode = normalizeRecoveryCode(input.recoveryCode);
  } catch {
    return genericRecoveryResponse();
  }

  const wordDigest = await hmacSha256Base64Url(runtime.credentialLookupKey, normalizedCredential);
  const rateLimit = await consumeRecoveryRateLimit(request, wordDigest);
  if (rateLimit === "unavailable") {
    return Response.json(
      { error: "recovery_rate_limit_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  if (rateLimit === "limited") {
    try {
      await recordEvent(sql, null, "RECOVERY_RATE_LIMITED");
    } catch {
      // The user-facing result must stay generic even if audit persistence fails.
    }
    return genericRecoveryResponse(429);
  }

  await recordEvent(sql, null, "RECOVERY_REQUESTED").catch(() => undefined);

  const codeHash = await hmacSha256Base64Url(runtime.recoveryPepper, normalizedCode);
  const candidates = await sql.query<RecoveryCandidate>(
    `SELECT c.user_id::text AS user_id,
            rc.code_hash,
            rc.failed_attempts,
            rc.locked_until,
            rc.processing_until
       FROM public.credentials c
       JOIN public.users u ON u.id = c.user_id AND u.status = 'active'
       JOIN public.user_recovery_credentials rc ON rc.user_id = c.user_id
      WHERE c.credential_lookup_digest = $1
        AND c.revoked_at IS NULL
      LIMIT 1`,
    [wordDigest],
  );
  const candidate = candidates[0];
  if (
    !candidate ||
    (candidate.locked_until && new Date(candidate.locked_until).getTime() > Date.now()) ||
    (candidate.processing_until && new Date(candidate.processing_until).getTime() > Date.now())
  ) {
    await recordEvent(sql, null, "RECOVERY_FAILED").catch(() => undefined);
    return genericRecoveryResponse();
  }
  if (!constantTimeEqualBase64Url(candidate.code_hash, codeHash)) {
    await recordInvalidAttempt(sql, candidate.user_id).catch(() => undefined);
    return genericRecoveryResponse();
  }

  const claim = await sql.query(
    `UPDATE public.user_recovery_credentials
        SET processing_until = now() + interval '5 minutes'
      WHERE user_id = $1
        AND code_hash = $2
        AND used_at IS NULL
        AND (locked_until IS NULL OR locked_until <= now())
        AND (processing_until IS NULL OR processing_until <= now())
      RETURNING user_id`,
    [candidate.user_id, candidate.code_hash],
  );
  if (!claim[0]) {
    await recordEvent(sql, candidate.user_id, "RECOVERY_FAILED").catch(() => undefined);
    return genericRecoveryResponse();
  }

  let adminUser: RecoveryAdminUser | null = null;
  try {
    const admin = clientForAdmin();
    const result = await admin.auth.admin.updateUserById(candidate.user_id, {
      password: input.newPassword,
    });
    if (result.error || !result.data.user) throw new Error("recovery_password_update_failed");
    adminUser = result.data.user as RecoveryAdminUser;
  } catch {
    await releaseProcessing(sql, candidate.user_id).catch(() => undefined);
    await recordEvent(sql, candidate.user_id, "RECOVERY_FAILED").catch(() => undefined);
    return genericRecoveryResponse();
  }

  let accessToken: string | null = null;
  if (adminUser.email) {
    try {
      const signIn = await clientForSignIn().auth.signInWithPassword({
        email: adminUser.email,
        password: input.newPassword,
      });
      accessToken = signIn.data.session?.access_token ?? null;
    } catch {
      accessToken = null;
    }
  }

  const newRecoveryCode = generateRecoveryCode();
  const newCodeHash = await hashRecoveryCode(newRecoveryCode, runtime.recoveryPepper);
  try {
    await rotateAfterSuccessfulPassword(sql, candidate.user_id, newCodeHash);
  } catch {
    await quarantineAfterPartialFailure(sql, candidate.user_id);
    return genericRecoveryResponse(503);
  }

  return Response.json(
    {
      ok: true,
      newRecoveryCode,
      sessionEstablished: Boolean(accessToken),
    },
    {
      status: 200,
      headers: {
        "Cache-Control": "no-store",
        ...(accessToken ? { "Set-Cookie": buildSupabaseSessionCookie(accessToken) } : {}),
      },
    },
  );
}
