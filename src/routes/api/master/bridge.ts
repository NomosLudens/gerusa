import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";

export const Route = createFileRoute("/api/master/bridge")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const url = getRuntimeDatabaseUrl();
        if (!url) return new Response("database_unavailable", { status: 503 });
        const sql = createBunPostgresExecutor(url);
        try {
          const mesaId = new URL(request.url).searchParams.get("mesaId");
          const system = await sql.query(
            "SELECT 1 FROM system_roles WHERE user_id=$1 AND system_role='system_master'",
            [auth.userId],
          );
          const mesas = system.length
            ? await sql.query<{ id: string; name: string }>(
                "SELECT id,name FROM mesas ORDER BY name",
                [],
              )
            : await sql.query<{ id: string; name: string }>(
                "SELECT m.id,m.name FROM mesas m JOIN mesa_members mm ON mm.mesa_id=m.id WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active' ORDER BY m.name",
                [auth.userId],
              );
          if (!system.length && (!mesaId || !mesas.some((m) => m.id === mesaId)))
            return Response.json({ error: "forbidden" }, { status: 403 });
          const campaigns = mesas.map((m) => ({
            id: m.id,
            title: m.name,
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
                html: "/api/master/surface/sessao-zero?mesaId=" + encodeURIComponent(m.id),
              },
              {
                id: "mapa",
                session: "",
                title: "Mapa interativo",
                type: "guide",
                html: "/api/master/surface/mapa?mesaId=" + encodeURIComponent(m.id),
              },
              ...(m.name === "Geek Wizards"
                ? [
                    {
                      id: "intencao-da-guarda",
                      session: "",
                      title: "A Intenção da Guarda",
                      type: "guide",
                      html:
                        "/api/master/surface/intencao-da-guarda?mesaId=" + encodeURIComponent(m.id),
                    },
                  ]
                : []),
            ],
          }));
          const js = `window.KALLISTIS_CONTEXT=${JSON.stringify({ master: { id: auth.userId }, campaigns })};window.KALLISTIS_HOST={currentUser:{id:${JSON.stringify(auth.userId)}},availableMesas:${JSON.stringify(campaigns)},mesaId:${JSON.stringify(mesaId)},getUserSurfaceState:async function(k){return (await fetch('/api/master/state?surfaceKey='+encodeURIComponent(k))).json()},putUserSurfaceState:async function(k,s){return fetch('/api/master/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({surfaceKey:k,state:s})})},getMesaSurfaceState:async function(k){return (await fetch('/api/master/state?surfaceKey='+encodeURIComponent(k)+'&mesaId='+encodeURIComponent(${JSON.stringify(mesaId)}))).json()},putMesaSurfaceState:async function(k,s){return fetch('/api/master/state',{method:'PUT',headers:{'content-type':'application/json'},body:JSON.stringify({surfaceKey:k,mesaId:${JSON.stringify(mesaId)},state:s})})}};`;
          return new Response(js, {
            headers: {
              "content-type": "application/javascript; charset=utf-8",
              "cache-control": "no-store",
            },
          });
        } finally {
          sql.close();
        }
      },
    },
  },
});
