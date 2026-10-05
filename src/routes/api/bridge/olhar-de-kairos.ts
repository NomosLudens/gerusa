// GET /api/bridge/olhar-de-kairos — snapshot único e cifrado para a Kallistis Offline puxar.
//
// Escopo deliberado: leitura-only, um único GET, sem fila, sem cursor de
// sincronização. NÃO é um mecanismo de sync genérico — não aceita parâmetros de
// tipo/origem, não escreve nada, não recebe envelopes de volta.
//
// A Kallistis Offline só conhece a faceta Kallistis — nada da faceta Kuan-Yin (contexto
// de negócio, exclusivo do app online) entra neste snapshot.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { rateLimit } from "@/lib/rate-limit";
import { lerContextoVivo } from "@/lib/contexto-vivo.server";
import { lerContextosAtivos } from "@/lib/contexto-externo.server";
import { encryptKairosSnapshot } from "@/lib/kairos-crypto.server";

const MAX_MENSAGENS = 25;
const MAX_REUNIOES = 5;
const MAX_IDENTIDADE = 5;
const MAX_SEDIMENTOS = 20;
const MAX_TRANSCRICAO_CHARS = 4000;

export const Route = createFileRoute("/api/bridge/olhar-de-kairos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const authHeader = request.headers.get("authorization") ?? "";
        const token = authHeader.toLowerCase().startsWith("bearer ")
          ? authHeader.slice(7).trim()
          : "";
        if (!token) return new Response("Unauthorized", { status: 401 });

        const supabaseUrl = process.env.SUPABASE_URL!;
        const publishableKey =
          process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY!;
        const supabaseAsUser = createClient<Database>(supabaseUrl, publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
          global: { headers: { Authorization: `Bearer ${token}` } },
        });
        const { data: userRes, error: userErr } = await supabaseAsUser.auth.getUser(token);
        if (userErr || !userRes.user) return new Response("Unauthorized", { status: 401 });
        const userId = userRes.user.id;

        const limited = rateLimit(userId, "kairos-bridge", 12, 60);
        if (limited) return limited;

        const sharedSecret = process.env.KALLISTIS_BRIDGE_SHARED_KEY;
        if (!sharedSecret) {
          return Response.json(
            {
              error: "misconfigured",
              message: "KALLISTIS_BRIDGE_SHARED_KEY não está configurada neste deployment.",
            },
            { status: 503 },
          );
        }

        const [contextoVivo, contextosAtivos, sedimentos, reunioes, threadsKallistis] =
          await Promise.all([
            lerContextoVivo(supabaseAsUser, userId),
            lerContextosAtivos(supabaseAsUser, userId),
            supabaseAsUser
              .from("sedimentos")
              .select("nivel, resumo, hipotese, status, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(MAX_SEDIMENTOS)
              .then((r) => r.data ?? []),
            supabaseAsUser
              .from("reunioes")
              .select("titulo, transcricao, resumo, created_at")
              .eq("user_id", userId)
              .order("created_at", { ascending: false })
              .limit(MAX_REUNIOES)
              .then((r) => r.data ?? []),
            supabaseAsUser
              .from("chat_threads")
              .select("id")
              .eq("user_id", userId)
              .eq("facet", "kallistis")
              .then((r) => r.data ?? []),
          ]);

        const identidade = contextosAtivos
          .filter((c) => c.tipo === "identidade")
          .slice(0, MAX_IDENTIDADE);

        const threadIds = threadsKallistis.map((t) => t.id);
        const mensagens = threadIds.length
          ? await supabaseAsUser
              .from("chat_messages")
              .select("id, role, content, created_at")
              .eq("user_id", userId)
              .in("thread_id", threadIds)
              .order("created_at", { ascending: false })
              .limit(MAX_MENSAGENS)
              .then((r) => (r.data ?? []).slice().reverse())
          : [];

        const snapshot = {
          contexto_vivo: contextoVivo,
          identidade,
          sedimentos,
          reunioes: reunioes.map((r) => ({
            titulo: r.titulo,
            resumo: r.resumo,
            created_at: r.created_at,
            transcricao: (r.transcricao ?? "").slice(0, MAX_TRANSCRICAO_CHARS),
          })),
          mensagens,
        };

        const envelope = await encryptKairosSnapshot(sharedSecret, snapshot);
        return new Response(JSON.stringify(envelope), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
    },
  },
});
