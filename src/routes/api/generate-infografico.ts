import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { rateLimit } from "@/lib/rate-limit";

const Body = z.object({ prompt: z.string().trim().min(1).max(4000) });

// Generates a static image (infográfico) — non-streaming for simplicity.
export const Route = createFileRoute("/api/generate-infografico")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const limited = rateLimit(auth.userId, "image", 6, 60);
        if (limited) return limited;

        const key = process.env.OPENROUTER_API_KEY;
        if (!key)
          return Response.json(
            {
              error: "ai_not_configured",
              message: "A IA ainda não está configurada neste ambiente.",
            },
            { status: 503 },
          );

        const raw = await request.json().catch(() => null);
        const parsed = Body.safeParse(raw);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "bad_request", issues: parsed.error.issues }),
            {
              status: 400,
              headers: { "content-type": "application/json" },
            },
          );
        }
        const { prompt } = parsed.data;

        const timeoutMs =
          Number(process.env.OPENROUTER_VISION_TIMEOUT_MS) ||
          Number(process.env.KALLISTIS_PROVIDER_TIMEOUT_MS) ||
          30_000;

        let res: Response;
        try {
          res = await fetch("https://openrouter.ai/api/v1/images/generations", {
            method: "POST",
            signal: AbortSignal.timeout(timeoutMs),
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
              "HTTP-Referer":
                process.env.OPENROUTER_SITE_URL ??
                process.env.APP_PUBLIC_URL ??
                "https://kallistis-kallistis.local",
              "X-Title": process.env.OPENROUTER_APP_NAME ?? "Kallistis Totalidade",
            },
            body: JSON.stringify({
              model:
                process.env.OPENROUTER_IMAGE_MODEL ??
                process.env.OPENROUTER_VISION_MODEL_PRIMARY ??
                "openai/gpt-image-2",
              prompt,
              quality: "low",
              size: "1024x1024",
            }),
          });
        } catch (err) {
          const errorName = err instanceof Error ? err.name : (err as { name?: string })?.name;
          if (errorName === "TimeoutError" || errorName === "AbortError") {
            console.error("Infográfico timeout error", err);
            return new Response(
              JSON.stringify({
                error: "timeout",
                message: "A geração do infográfico excedeu o limite de tempo.",
              }),
              {
                status: 504,
                headers: { "content-type": "application/json" },
              },
            );
          }
          throw err;
        }

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          console.error("Infográfico upstream error", res.status, errBody);
          return new Response("Não foi possível gerar o infográfico agora. Tente novamente.", {
            status: res.status,
          });
        }
        const data = (await res.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
        const item = data.data?.[0];
        const dataUrl = item?.b64_json
          ? `data:image/png;base64,${item.b64_json}`
          : (item?.url ?? null);
        return Response.json({ image: dataUrl });
      },
    },
  },
});
