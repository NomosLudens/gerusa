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
    const mesas = await sql.query<{ id: string; name: string }>(
      "SELECT m.id,m.name FROM mesas m JOIN mesa_members mm ON mm.mesa_id=m.id WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active' ORDER BY m.name",
      [userId],
    );
    return { systemMaster: system.length > 0, mesas };
  } finally {
    sql.close();
  }
}

export const Route = createFileRoute("/_authenticated/surface/$surface")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const state = await access(auth.userId);
        if (!state) return Response.json({ error: "database_unavailable" }, { status: 503 });
        if (!state.systemMaster && state.mesas.length === 0)
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
        const campaigns = state.mesas.map((mesa) => ({
          id: mesa.id,
          title: mesa.name,
          role: "Mestre",
          guides: [
            {
              id: "contexto",
              session: "",
              title: "Contexto da campanha",
              type: "guide",
              html: "/api/master/surface/contexto",
            },
            {
              id: "sessao-zero",
              session: "",
              title: "Sessão Zero",
              type: "guide",
              html: "/api/master/surface/sessao-zero?mesaId=" + encodeURIComponent(mesa.id),
            },
            {
              id: "mapa",
              session: "",
              title: "Mapa interativo",
              type: "guide",
              html: "/api/master/surface/mapa?mesaId=" + encodeURIComponent(mesa.id),
            },
          ],
        }));
        const bridge = `<script>window.KALLISTIS_CONTEXT=${JSON.stringify({ master: { id: auth.userId }, campaigns })};window.KALLISTIS_HOST={currentUser:{id:${JSON.stringify(auth.userId)}},availableMesas:${JSON.stringify(campaigns)}};</script>`;
        return new Response(html.replace("<script>", bridge + "<script>"), {
          headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" },
        });
      },
    },
  },
});
