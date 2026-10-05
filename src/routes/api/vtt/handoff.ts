import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { createVttHandoff } from "@/server/local-core/vtt-handoff";

const headers = { "Cache-Control": "no-store" };
const input = z.object({ mesaId: z.string().uuid() }).strict();

export const Route = createFileRoute("/api/vtt/handoff")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, origin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const databaseUrl = getRuntimeDatabaseUrl();
        const gravewrightOrigin = process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim();
        if (!databaseUrl || !gravewrightOrigin)
          return Response.json({ error: "vtt_not_configured" }, { status: 503, headers });
        const parsed = input.safeParse(await request.json().catch(() => null));
        if (!parsed.success)
          return Response.json({ error: "invalid_mesa" }, { status: 400, headers });
        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          const handoff = await createVttHandoff(sql, {
            userId: auth.userId,
            mesaId: parsed.data.mesaId,
            gravewrightOrigin,
          });
          if (!handoff)
            return Response.json({ error: "vtt_access_denied" }, { status: 403, headers });
          return Response.json({ url: handoff.url, expiresAt: handoff.expiresAt }, { headers });
        } finally {
          sql.close();
        }
      },
    },
  },
});
