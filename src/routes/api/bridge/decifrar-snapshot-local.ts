// POST /api/bridge/decifrar-snapshot-local — auxiliar exclusivo da ação "Buscar do
// Offline": o navegador já buscou o envelope cifrado do local-server da Kallistis
// Offline (127.0.0.1) e envia esse mesmo envelope aqui para decifrar com a chave
// secreta de servidor (KALLISTIS_BRIDGE_SHARED_KEY), que nunca pode ir ao bundle do
// cliente. Não persiste nada, não é o endpoint de escrita/sync proibido pelo
// contrato do "Olhar de Kairós" — apenas lê e decifra um envelope que o próprio
// usuário já obteve.
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { rateLimit } from "@/lib/rate-limit";
import { decryptKairosEnvelope, type KairosEnvelope } from "@/lib/kairos-crypto.server";

function isKairosEnvelope(value: unknown): value is KairosEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return v.v === 1 && typeof v.iv === "string" && typeof v.data === "string";
}

export const Route = createFileRoute("/api/bridge/decifrar-snapshot-local")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const limited = rateLimit(auth.userId, "kairos-bridge-decrypt", 12, 60);
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

        const body = await request.json().catch(() => null);
        if (!isKairosEnvelope(body)) {
          return Response.json({ error: "invalid_envelope" }, { status: 400 });
        }

        try {
          const snapshot = await decryptKairosEnvelope(sharedSecret, body);
          return Response.json({ snapshot }, { headers: { "cache-control": "no-store" } });
        } catch {
          return Response.json({ error: "decrypt_failed" }, { status: 400 });
        }
      },
    },
  },
});
