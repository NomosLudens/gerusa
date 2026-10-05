// Server function só para o admin: importar contexto/identidade/memória relacional
// já analisado (ex.: condensado de outro app em PDF) para a conta de um membro
// já criado (workspace_members.member_id). Sem reinterpretação aqui — o conteúdo
// colado já chega pronto, a função só grava e Kallistis assimila como está.
// Escrita usa supabaseAdmin (service role) DEPOIS de confirmar, com o client
// do próprio chamador (RLS ligado), que ele é owner_id do member_id alvo.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const MAX_CONTEUDO = 60_000;

async function assertOwnerOfMember(
  supabase: import("@supabase/supabase-js").SupabaseClient,
  ownerId: string,
  memberId: string,
) {
  const { data, error } = await supabase
    .from("workspace_members")
    .select("member_id")
    .eq("owner_id", ownerId)
    .eq("member_id", memberId)
    .maybeSingle();
  if (error || !data) throw new Error("Este perfil não pertence ao seu workspace.");
}

const contextoSchema = z.object({
  memberId: z.string().uuid(),
  titulo: z.string().trim().min(1).max(120),
  conteudo: z.string().trim().min(1).max(MAX_CONTEUDO),
  tipo: z.enum(["identidade", "memoria_relacional"]),
});

export const importarContextoMembro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => contextoSchema.parse(data))
  .handler(async ({ data, context }) => {
    await assertOwnerOfMember(context.supabase, context.userId, data.memberId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("contexto_externo")
      .insert({
        user_id: data.memberId,
        titulo: data.titulo,
        conteudo: data.conteudo,
        tipo: data.tipo,
      } as never)
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Falha ao importar contexto.");
    return { id: (row as { id: string }).id };
  });
