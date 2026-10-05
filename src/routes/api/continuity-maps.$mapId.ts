import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  getPublishedContinuityMap,
  renderContinuityMapHtml,
} from "@/server/local-core/continuity-maps";
import { createRuntimeStorage } from "@/server/runtime/storage";
import { readBundledContinuityMapAsset } from "@/server/runtime/versioned-content";

const mapIdSchema = z.string().uuid();

export const Route = createFileRoute("/api/continuity-maps/$mapId")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const parsed = mapIdSchema.safeParse(params.mapId);
        if (!parsed.success) return new Response("Not found", { status: 404 });
        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl) return new Response("Database unavailable", { status: 503 });
        const sql = createBunPostgresExecutor(databaseUrl);
        try {
          const map = await getPublishedContinuityMap(sql, auth.userId, parsed.data);
          if (!map) return new Response("Not found", { status: 404 });
          let html: string;
          const staticAsset = map.asset_key
            ? readBundledContinuityMapAsset(map.asset_key)
            : undefined;
          if (staticAsset !== undefined) html = staticAsset;
          else if (
            map.asset_key &&
            /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
              map.asset_key,
            )
          ) {
            const asset = await createRuntimeStorage().get(
              `private/continuity-map-assets/uploads/${map.asset_key}.html`,
            );
            if (!asset) return new Response("Documento indisponível", { status: 503 });
            html = new TextDecoder().decode(asset.bytes);
          } else html = renderContinuityMapHtml(map);
          return new Response(html, {
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "text/html; charset=utf-8",
              "Content-Security-Policy":
                "default-src 'none'; style-src 'unsafe-inline'; script-src 'none'; object-src 'none'; img-src 'self' data:; media-src 'self' data:; connect-src 'none'; form-action 'none'; base-uri 'none'; frame-ancestors 'self'",
              "X-Content-Type-Options": "nosniff",
            },
          });
        } finally {
          sql.close();
        }
      },
    },
  },
});
