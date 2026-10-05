import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ExtractDocxInput = z.object({
  base64: z.string().min(1),
  filename: z
    .string()
    .trim()
    .min(1)
    .max(255)
    .refine((name) => /\.docx$/i.test(name), {
      message: "Apenas arquivos com a extensão .docx são permitidos.",
    }),
});

export const extractDocxTextServer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ExtractDocxInput.parse(d))
  .handler(async ({ data }) => {
    // Limitar tamanho do arquivo (10MB)
    const approxSize = (data.base64.length * 3) / 4;
    if (approxSize > 10 * 1024 * 1024) {
      throw new Error("Arquivo excede o limite máximo de 10 MB.");
    }

    try {
      // Não persistir o arquivo — processado direto do Buffer em memória
      const mammoth = await import("mammoth");
      const buffer = Buffer.from(data.base64, "base64");

      const { value } = await mammoth.extractRawText({ buffer });

      return { text: value };
    } catch (err) {
      // Retorna erro claro em falha. Não loga conteúdo integral do documento.
      console.error(
        `Erro ao extrair DOCX no servidor para o arquivo ${data.filename}:`,
        err instanceof Error ? err.message : err,
      );
      throw new Error("Falha ao extrair texto do arquivo Word no servidor.");
    }
  });
