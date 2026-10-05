// Readiness check — confirma que dependências críticas estão acessíveis.
// Mais pesado que /health: consulta PostgreSQL/OpenRouter/schema. Use em smoke tests de deploy,
// não em monitores de alta frequência.
import { createFileRoute } from "@tanstack/react-router";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { getRuntimeDatabaseUrl, getRuntimeEnv } from "@/server/runtime/context";

type Check = { ok: boolean; ms?: number; error?: string };

function databaseUrl() {
  return getRuntimeDatabaseUrl();
}

async function checkPostgres(): Promise<Check> {
  const url = databaseUrl();
  if (!url) return { ok: false, error: "database_not_configured" };

  const t0 = Date.now();
  const sql = createBunPostgresExecutor(url);
  try {
    await sql.query("SELECT 1");
    return { ok: true, ms: Date.now() - t0 };
  } catch {
    return { ok: false, ms: Date.now() - t0, error: "database_unavailable" };
  } finally {
    sql.close();
  }
}

async function checkPostgresSchema(): Promise<Check> {
  const url = databaseUrl();
  if (!url) return { ok: false, error: "database_not_configured" };

  const t0 = Date.now();
  const sql = createBunPostgresExecutor(url);
  try {
    await sql.query("SELECT count(*)::int AS total FROM public.users");
    return { ok: true, ms: Date.now() - t0 };
  } catch {
    return { ok: false, ms: Date.now() - t0, error: "schema_ledger_unavailable" };
  } finally {
    sql.close();
  }
}

// Detalhes de schema/latência/mensagens de erro só vazam para quem apresenta o
// segredo de deploy (KALLISTIS_READY_SECRET via header `x-ready-secret`). Sem o
// segredo configurado ou sem o header correto, resposta pública fica em {status}.
function hasReadySecret(request: Request): boolean {
  const configured = getRuntimeEnv().readySecret;
  if (!configured) return false;
  const provided = request.headers.get("x-ready-secret");
  return provided === configured;
}

export const Route = createFileRoute("/api/public/ready")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const checks: Record<string, Check> = {};

        checks.postgres = await checkPostgres();
        checks.postgres_schema = await checkPostgresSchema();
        checks.openrouter_config = {
          ok: Boolean(getRuntimeEnv().openrouterApiKey),
          ...(getRuntimeEnv().openrouterApiKey ? {} : { error: "ai_not_configured" }),
        };

        const coreChecks = [checks.postgres, checks.postgres_schema];
        const allCoreOk = coreChecks.every((check) => check.ok);
        const status = allCoreOk ? "ready" : "degraded";
        const detailed = hasReadySecret(request);

        return new Response(
          JSON.stringify(
            detailed
              ? {
                  status,
                  time: new Date().toISOString(),
                  checks,
                  capabilities: {
                    ai: checks.openrouter_config.ok ? "ready" : "unconfigured",
                  },
                }
              : { status },
          ),
          {
            status: allCoreOk ? 200 : 503,
            headers: {
              "content-type": "application/json; charset=utf-8",
              "cache-control": "no-store",
            },
          },
        );
      },
    },
  },
});
