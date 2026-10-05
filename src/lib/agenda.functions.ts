import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  createAgendaRepository,
  type AgendaContext,
  type AgendaEventRecord,
  type AgendaScope,
} from "@/server/local-core/postgres-repositories";
import { assertValidDateRange } from "./agenda-validation";

export type TipoEvento = "compromisso" | "aula" | "reuniao" | "evento" | "prazo" | "outro";
export type AgendaEvento = Pick<
  AgendaEventRecord,
  | "id"
  | "titulo"
  | "descricao"
  | "tipo"
  | "inicio"
  | "fim"
  | "local"
  | "scope_type"
  | "mesa_id"
  | "target_user_id"
  | "source_type"
  | "source_ref"
>;
const TIPO_EVENTO = z.enum(["compromisso", "aula", "reuniao", "evento", "prazo", "outro"]);
const AGENDA_SCOPE = z.enum(["PRIVATE", "MESA", "GLOBAL", "PLAYER"]);
const Range = z.object({
  inicio: z.string().datetime({ offset: true }),
  fim: z.string().datetime({ offset: true }),
});
const Fields = {
  titulo: z.string().trim().min(1).max(160),
  tipo: TIPO_EVENTO,
  inicio: z.string().datetime({ offset: true }),
  fim: z.string().datetime({ offset: true }).nullable().optional(),
  local: z.string().trim().max(200).nullable().optional(),
  descricao: z.string().trim().max(4000).nullable().optional(),
};
const CreateInput = z.object({
  ...Fields,
  scope_type: AGENDA_SCOPE.default("PRIVATE"),
  mesa_id: z.string().uuid().nullable().optional(),
  target_user_id: z.string().uuid().nullable().optional(),
});
const Update = z.object({ id: z.string().uuid(), ...Fields });
async function runtime() {
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  const url = getRuntimeDatabaseUrl();
  if (!url) throw new Error("local_database_not_configured");
  return { auth: auth.userId, sql: createBunPostgresExecutor(url) };
}
function eventInput(data: z.infer<typeof CreateInput>) {
  return {
    titulo: data.titulo,
    tipo: data.tipo,
    inicio: data.inicio,
    fim: data.fim ?? null,
    local: data.local ?? null,
    descricao: data.descricao ?? null,
    scope_type: data.scope_type as AgendaScope,
    mesa_id: data.mesa_id ?? null,
    target_user_id: data.target_user_id ?? null,
    source_type: null,
    source_ref: null,
  };
}
export const listarContextoAgenda = createServerFn({ method: "GET" }).handler(
  async (): Promise<AgendaContext> => {
    const { auth, sql } = await runtime();
    try {
      return await createAgendaRepository(sql).listAgendaContext(auth);
    } finally {
      sql.close();
    }
  },
);
export const listarEventosAgenda = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => Range.parse(d))
  .handler(async ({ data }) => {
    const { auth, sql } = await runtime();
    try {
      assertValidDateRange(data.inicio, data.fim, "intervalo de listagem");
      return await createAgendaRepository(sql).listVisibleAgendaEvents(auth, data.inicio, data.fim);
    } finally {
      sql.close();
    }
  });
export const criarEventoAgenda = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CreateInput.parse(d))
  .handler(async ({ data }) => {
    const { auth, sql } = await runtime();
    try {
      assertValidDateRange(data.inicio, data.fim, "evento");
      return await createAgendaRepository(sql).createAgendaEvent(auth, eventInput(data));
    } finally {
      sql.close();
    }
  });
export const atualizarEventoAgenda = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Update.parse(d))
  .handler(async ({ data }) => {
    const { auth, sql } = await runtime();
    try {
      assertValidDateRange(data.inicio, data.fim, "evento");
      const { id, ...rest } = data;
      return await createAgendaRepository(sql).updateAgendaEvent(auth, id, {
        titulo: rest.titulo,
        tipo: rest.tipo,
        inicio: rest.inicio,
        fim: rest.fim ?? null,
        local: rest.local ?? null,
        descricao: rest.descricao ?? null,
      });
    } finally {
      sql.close();
    }
  });
export const deletarEventoAgenda = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { auth, sql } = await runtime();
    try {
      await createAgendaRepository(sql).deleteAgendaEvent(auth, data.id);
      return { ok: true };
    } finally {
      sql.close();
    }
  });
