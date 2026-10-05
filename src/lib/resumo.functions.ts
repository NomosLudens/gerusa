import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ResumirInput = z.object({
  texto: z.string().min(20),
  tipo: z.enum(["reuniao", "livro"]),
});

export const resumirConteudo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResumirInput.parse(d))
  .handler(async ({ data }) => {
    // Imports server-only dinâmicos: este módulo é referenciado por rotas de
    // cliente via RPC, então import estático de `*.server.*` quebra o build.
    const { createOpenRouterProvider } = await import("@/lib/openrouter.server");
    const { AI_MODELS } = await import("@/lib/ai-models.server");
    let gateway: ReturnType<typeof createOpenRouterProvider>;
    try {
      gateway = createOpenRouterProvider();
    } catch (err) {
      console.error("AI provider configuration error", err instanceof Error ? err.message : err);
      throw new Error("A IA ainda não está configurada neste ambiente.");
    }

    const system =
      data.tipo === "reuniao"
        ? "Resuma a transcrição da reunião em markdown: tópicos discutidos, decisões, tarefas, citações importantes."
        : "Faça um fichamento acadêmico do texto em markdown: tese central, estrutura, conceitos-chave, citações relevantes, perguntas para revisão.";

    const { text } = await generateText({
      model: gateway(AI_MODELS.fast),
      system,
      prompt: data.texto.slice(0, 60000),
    });
    return { resumo: text };
  });
