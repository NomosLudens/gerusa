import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { rateLimit } from "@/lib/rate-limit";
import {
  isAllowedAudioType,
  transcribeAudioBlob,
  revisarTranscricaoTexto,
} from "@/lib/transcribe.server";

const MAX_AUDIO_BYTES = 25 * 1024 * 1024; // 25MB

export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const limited = rateLimit(auth.userId, "transcribe", 10, 60);
        if (limited) return limited;

        const inForm = await request.formData();
        const file = inForm.get("file");
        if (!(file instanceof Blob)) return new Response("file required", { status: 400 });
        if (file.size > MAX_AUDIO_BYTES) return new Response("file too large", { status: 413 });
        const baseType = file.type.split(";")[0];
        if (baseType && !isAllowedAudioType(baseType)) {
          return new Response("unsupported media type", { status: 415 });
        }

        try {
          const { text, model, fallback } = await transcribeAudioBlob(
            file,
            baseType || "audio/webm",
            inForm.get("sttModel"),
            inForm.get("sttFallbackModel"),
          );
          // Revisão por LLM só quando o cliente pede.
          const revise = inForm.get("revise") === "1";
          const finalText = revise && text.trim() ? await revisarTranscricaoTexto(text) : text;

          const headers = new Headers();
          headers.set("X-STT-Model", model);
          if (fallback) headers.set("X-STT-Fallback", "1");
          if (revise && text.trim()) headers.set("X-Transcript-Revised", "1");

          return Response.json({ text: finalText }, { headers });
        } catch (err) {
          if (err instanceof Error && err.name === "TranscriptionNotConfiguredError") {
            return Response.json(
              {
                error: "ai_not_configured",
                message: err.message,
              },
              { status: 503 },
            );
          }
          return new Response(err instanceof Error ? err.message : "transcription failed", {
            status: 502,
          });
        }
      },
    },
  },
});
