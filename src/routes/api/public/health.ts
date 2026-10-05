// Healthcheck público — sem auth, leve, idempotente.
// Usado por uptime monitors, Cloudflare health probes e o painel de status.
// Não toca em banco — apenas confirma que o Worker está respondendo.
import { createFileRoute } from "@tanstack/react-router";

const BOOT_TIME = Date.now();

export const Route = createFileRoute("/api/public/health")({
  server: {
    handlers: {
      GET: async () => {
        const body = {
          status: "ok",
          service: "kallistis",
          time: new Date().toISOString(),
          uptime_ms: Date.now() - BOOT_TIME,
        };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: {
            "content-type": "application/json; charset=utf-8",
            "cache-control": "no-store",
          },
        });
      },
      HEAD: async () =>
        new Response(null, {
          status: 200,
          headers: { "cache-control": "no-store" },
        }),
    },
  },
});
