import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { readBundledMasterSurface } from "@/server/runtime/versioned-content";

const files: Record<string, string> = {
  router: "KALLISTIS_ROTEADOR_DE_CAMPANHAS_CORRIGIDO.html",
  contexto: "KALLISTIS_CONTEXTO_CAMPANHA_DUAS_MESAS.html",
  "sessao-zero": "KALLISTIS_SESSAO_ZERO_OS_NOMES_ROUBADOS.html",
  mapa: "KALLISTIS_MAPA_INTERATIVO_CALIBRADO(1).html",
  "intencao-da-guarda": "KALLISTIS_GEEK_WIZARDS_INTENCAO_DA_GUARDA.html",
};

async function access(userId: string) {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) return null;
  const sql = createBunPostgresExecutor(databaseUrl);
  try {
    const system = await sql.query(
      "SELECT 1 FROM system_roles WHERE user_id=$1 AND system_role='system_master'",
      [userId],
    );
    const systemMaster = system.length > 0;
    const mesas = systemMaster
      ? await sql.query<{ id: string; name: string }>("SELECT id,name FROM mesas ORDER BY name", [])
      : await sql.query<{ id: string; name: string }>(
          "SELECT m.id,m.name FROM mesas m JOIN mesa_members mm ON mm.mesa_id=m.id WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active' ORDER BY m.name",
          [userId],
        );
    return { systemMaster, mesas };
  } finally {
    sql.close();
  }
}

function forbiddenSurfaceResponse() {
  return new Response(
    `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Acesso ao atlas</title><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#08080e;color:#f3ebdd;font:16px system-ui,sans-serif"><main style="max-width:34rem;padding:2rem"><p style="color:#d9b46a;text-transform:uppercase;letter-spacing:.15em;font-size:.75rem">KALLISTIS</p><h1 style="font-family:Georgia,serif">Atlas disponível para Mestres</h1><p>Esta superfície do atlas é restrita à equipe de Mestre da Mesa.</p><a style="color:#d9b46a" href="/home" target="_top">Voltar ao início</a></main></body></html>`,
    {
      status: 403,
      headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
    },
  );
}

export const Route = createFileRoute("/api/master/surface/$surface")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const state = await access(auth.userId);
        if (!state) return Response.json({ error: "database_unavailable" }, { status: 503 });
        const mesaId = new URL(request.url).searchParams.get("mesaId");
        const isMasterForMesa =
          state.systemMaster ||
          (mesaId ? state.mesas.some((mesa) => mesa.id === mesaId) : state.mesas.length > 0);
        if (!isMasterForMesa) return forbiddenSurfaceResponse();
        if (
          params.surface === "intencao-da-guarda" &&
          !state.mesas.some((mesa) => mesa.id === mesaId && mesa.name === "Geek Wizards")
        )
          return Response.json({ error: "forbidden" }, { status: 403 });
        const file = files[params.surface];
        if (!file) return new Response("Not found", { status: 404 });
        const rawHtml = readBundledMasterSurface(file);
        if (rawHtml === undefined) return new Response("Not found", { status: 404 });
        const mode =
          new URL(request.url).searchParams.get("mode") === "master" ? "master" : "player";
        const html =
          mode === "player"
            ? rawHtml
                .replace(
                  new RegExp('<section class="master-only" id="mestre">[\\s\\S]*?</section>'),
                  "",
                )
                .replace(new RegExp('<div class="note master-only">[\\s\\S]*?</div>'), "")
            : rawHtml;
        const withMasterBridge = mesaId && isMasterForMesa;
        const externalBridge = withMasterBridge
          ? `<script src="/api/master/bridge?mesaId=${encodeURIComponent(mesaId)}"></script>`
          : "";
        return new Response(
          externalBridge ? html.replace("<script>", externalBridge + "<script>") : html,
          {
            headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
          },
        );
      },
    },
  },
});
