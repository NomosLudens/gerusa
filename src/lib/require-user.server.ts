import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
// Server-only authentication boundary. Supabase Auth is the Worker authority;
// the local Bun session remains available only for local development.
import { requireUser as requireLocalUser } from "@/server/local-core/auth-service";
import { readSessionCookie } from "@/server/local-core/cookies";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { createPostgresAuthRepository } from "@/server/local-core/postgres-repositories";
import {
  hasSupabaseAuthRuntime,
  readSupabaseAccessToken,
  resolveSupabaseIdentity,
} from "@/server/runtime/supabase-auth";

function unavailable(error: string): { error: Response } {
  return {
    error: Response.json({ error }, { status: 503, headers: { "Cache-Control": "no-store" } }),
  };
}

export async function requireUser(
  request: Request,
): Promise<{ userId: string } | { error: Response }> {
  if (hasSupabaseAuthRuntime()) {
    const token = readSupabaseAccessToken(request);
    if (!token) {
      return {
        error: Response.json(
          { error: "unauthorized", reason: "Autenticação obrigatória.", stage: "auth" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    const identity = await resolveSupabaseIdentity(token);
    if (!identity) {
      return {
        error: Response.json(
          { error: "unauthorized", reason: "Sessão Supabase inválida ou expirada.", stage: "auth" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    const databaseUrl = getRuntimeDatabaseUrl();
    if (!databaseUrl) return unavailable("database_unavailable");
    const sql = createBunPostgresExecutor(databaseUrl);
    try {
      const rows = await sql.query<{ id: string }>(
        "SELECT id::text AS id FROM public.users WHERE id=$1 AND status='active' LIMIT 1",
        [identity.id],
      );
      if (!rows[0]) return unavailable("kallistis_identity_not_provisioned");
      return { userId: rows[0].id };
    } catch {
      return unavailable("database_unavailable");
    } finally {
      sql.close();
    }
  }

  if (!readSessionCookie(request.headers.get("cookie"))) {
    return {
      error: Response.json(
        { error: "unauthorized", reason: "Autenticação obrigatória.", stage: "auth" },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        },
      ),
    };
  }
  if (!(globalThis as unknown as { Bun?: unknown }).Bun) {
    return unavailable("supabase_auth_not_configured");
  }
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) return unavailable("local_auth_not_configured");

  let sql: ReturnType<typeof createBunPostgresExecutor>;
  try {
    sql = createBunPostgresExecutor(databaseUrl);
  } catch {
    return unavailable("local_auth_unavailable");
  }

  try {
    const authenticated = await requireLocalUser({
      request,
      repository: createPostgresAuthRepository(sql),
    });
    if (!authenticated) {
      return {
        error: Response.json(
          { error: "unauthorized", reason: "Sessão inválida ou expirada.", stage: "auth" },
          { status: 401, headers: { "Cache-Control": "no-store" } },
        ),
      };
    }
    return { userId: authenticated.user.id };
  } catch {
    return unavailable("local_auth_unavailable");
  } finally {
    sql.close();
  }
}
