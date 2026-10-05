import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  createContexto,
  deleteContexto,
  listAuthorizedContextoMesas,
  listContextos,
  toggleContexto as toggleContextoRepo,
  createPostgresCampaignRepository,
} from "@/server/local-core/postgres-repositories";

const MAX_CONTEUDO = 60_000;
const createSchema = z.object({
  titulo: z.string().trim().min(1).max(120),
  conteudo: z.string().trim().min(1).max(MAX_CONTEUDO),
  scope: z.enum(["global", "mesa", "campaign"]).default("global"),
  mesaId: z.string().uuid().nullable().optional(),
  campaignId: z.string().uuid().nullable().optional(),
});
const toggleSchema = z.object({ id: z.string().uuid(), ativo: z.boolean() });
const idSchema = z.object({ id: z.string().uuid() });

async function localContextRuntime() {
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) throw new Error("local_database_not_configured");
  return { sql: createBunPostgresExecutor(databaseUrl), userId: auth.userId };
}

export const listarContextos = createServerFn({ method: "GET" }).handler(async () => {
  const { sql, userId } = await localContextRuntime();
  try {
    return await listContextos(sql, userId);
  } finally {
    sql.close();
  }
});
export const listarContextoOpcoes = createServerFn({ method: "GET" }).handler(async () => {
  const { sql, userId } = await localContextRuntime();
  try {
    const [mesas, campaigns] = await Promise.all([
      listAuthorizedContextoMesas(sql, userId),
      createPostgresCampaignRepository(sql).listAuthorized(userId),
    ]);
    return { mesas, campaigns };
  } finally {
    sql.close();
  }
});
export const criarContexto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => createSchema.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localContextRuntime();
    try {
      const scope = {
        mesaId: data.scope === "mesa" ? (data.mesaId ?? null) : null,
        campaignId: data.scope === "campaign" ? (data.campaignId ?? null) : null,
      };
      return await createContexto(sql, userId, data.titulo, data.conteudo, scope);
    } finally {
      sql.close();
    }
  });
export const toggleContexto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => toggleSchema.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localContextRuntime();
    try {
      await toggleContextoRepo(sql, userId, data.id, data.ativo);
      return { ok: true };
    } finally {
      sql.close();
    }
  });
export const apagarContexto = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => idSchema.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localContextRuntime();
    try {
      await deleteContexto(sql, userId, data.id);
      return { ok: true };
    } finally {
      sql.close();
    }
  });
