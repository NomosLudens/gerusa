import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import {
  handleLocalAuthDelete,
  handleLocalAuthGet,
  handleLocalAuthPost,
} from "@/server/local-core/http";
import { createPostgresAuthRepository } from "@/server/local-core/postgres-repositories";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { getRuntimeEnv } from "@/server/runtime/context";
import {
  buildSupabaseSessionCookie,
  clearSupabaseSessionCookie,
  hasSupabaseAuthRuntime,
  resolveSupabaseIdentity,
} from "@/server/runtime/supabase-auth";
import { requireUser } from "@/lib/require-user.server";

const CANONICAL_PUBLIC_ORIGIN = "https://kallistis.app";

function expectedOrigin(): string {
  const value = getRuntimeEnv().publicOrigin;
  if (!value) return CANONICAL_PUBLIC_ORIGIN;
  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (!origins.length) return CANONICAL_PUBLIC_ORIGIN;
  try {
    if (
      origins.some((origin) => {
        const url = new URL(origin);
        return url.protocol !== "http:" && url.protocol !== "https:";
      })
    ) {
      return CANONICAL_PUBLIC_ORIGIN;
    }
    return origins.join(",");
  } catch {
    return CANONICAL_PUBLIC_ORIGIN;
  }
}

async function provisionedSupabaseUser(accessToken: string) {
  const identity = await resolveSupabaseIdentity(accessToken);
  if (!identity) return null;
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) return null;
  const sql = createBunPostgresExecutor(databaseUrl);
  try {
    const rows = await sql.query<{ id: string }>(
      "SELECT id::text AS id FROM public.users WHERE id=$1 AND status='active' LIMIT 1",
      [identity.id],
    );
    return rows[0] ? { id: rows[0].id } : null;
  } finally {
    sql.close();
  }
}

function configuredRuntime() {
  const databaseUrl = getRuntimeDatabaseUrl();
  const lookupKey = process.env.KALLISTIS_CREDENTIAL_LOOKUP_KEY;
  if (!databaseUrl || !lookupKey) return null;
  const sql = createBunPostgresExecutor(databaseUrl);
  return {
    repository: createPostgresAuthRepository(sql),
    lookupKey,
    sql,
  };
}

async function withRuntime<T>(
  handler: (runtime: NonNullable<ReturnType<typeof configuredRuntime>>) => Promise<T>,
): Promise<T | Response> {
  let runtime: ReturnType<typeof configuredRuntime> = null;
  try {
    runtime = configuredRuntime();
    if (!runtime) {
      return Response.json(
        { error: "local_auth_not_configured" },
        { status: 503, headers: { "Cache-Control": "no-store" } },
      );
    }
    return await handler(runtime);
  } catch {
    return Response.json(
      { error: "local_auth_unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  } finally {
    runtime?.sql.close();
  }
}

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (hasSupabaseAuthRuntime()) {
          const auth = await requireUser(request);
          return "error" in auth
            ? auth.error
            : Response.json(
                { user: { id: auth.userId } },
                { headers: { "Cache-Control": "no-store" } },
              );
        }
        return withRuntime((runtime) =>
          handleLocalAuthGet(request, {
            repository: runtime.repository,
            lookupKey: runtime.lookupKey,
            expectedOrigin: expectedOrigin(),
          }),
        );
      },
      POST: async ({ request }) => {
        if (hasSupabaseAuthRuntime()) {
          if (!isSameOriginRequest(request, expectedOrigin()))
            return Response.json({ error: "csrf_rejected" }, { status: 403 });
          const body = (await request.json().catch(() => null)) as { accessToken?: unknown } | null;
          const accessToken = typeof body?.accessToken === "string" ? body.accessToken.trim() : "";
          if (!accessToken)
            return Response.json({ error: "supabase_access_token_required" }, { status: 400 });
          const user = await provisionedSupabaseUser(accessToken);
          if (!user)
            return Response.json({ error: "kallistis_identity_not_provisioned" }, { status: 403 });
          return Response.json(
            { user: { id: user.id } },
            {
              status: 201,
              headers: {
                "set-cookie": buildSupabaseSessionCookie(accessToken),
                "Cache-Control": "no-store",
              },
            },
          );
        }
        return withRuntime((runtime) =>
          handleLocalAuthPost(request, {
            repository: runtime.repository,
            lookupKey: runtime.lookupKey,
            expectedOrigin: expectedOrigin(),
            nextSessionId: randomUUID,
          }),
        );
      },
      DELETE: async ({ request }) => {
        if (hasSupabaseAuthRuntime()) {
          if (!isSameOriginRequest(request, expectedOrigin()))
            return Response.json({ error: "csrf_rejected" }, { status: 403 });
          return new Response(null, {
            status: 204,
            headers: { "set-cookie": clearSupabaseSessionCookie(), "Cache-Control": "no-store" },
          });
        }
        return withRuntime((runtime) =>
          handleLocalAuthDelete(request, {
            repository: runtime.repository,
            lookupKey: runtime.lookupKey,
            expectedOrigin: expectedOrigin(),
          }),
        );
      },
    },
  },
});
