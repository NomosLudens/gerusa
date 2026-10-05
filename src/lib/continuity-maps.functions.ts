import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  canPublishContinuityMap,
  deleteContinuityMap,
  listContinuityMapDocuments,
  listContinuityMapMesas,
  listContinuityMapsForSession,
  upsertContinuityMapDocument,
  upsertContinuityMap,
  type ContinuityMapMesa,
  type ContinuityMapDocumentOption,
  type ContinuityMapRecord,
} from "@/server/local-core/continuity-maps";

export type ContinuityMap = ContinuityMapRecord;
export type ContinuityMapMesaOption = ContinuityMapMesa;
export type ContinuityMapDocument = ContinuityMapDocumentOption;

async function localRequest() {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) throw new Error("local_database_not_configured");
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  const sql = createBunPostgresExecutor(databaseUrl);
  return { sql, userId: auth.userId };
}

export const listContinuityMapMesaOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { sql, userId } = await localRequest();
  try {
    if (!(await canPublishContinuityMap(sql, userId)))
      return [] as readonly ContinuityMapMesaOption[];
    return (await listContinuityMapMesas(sql, userId)) as readonly ContinuityMapMesaOption[];
  } finally {
    sql.close();
  }
});

export const listContinuityMapDocumentOptions = createServerFn({ method: "GET" }).handler(
  async () => {
    const { sql, userId } = await localRequest();
    try {
      if (!(await canPublishContinuityMap(sql, userId)))
        return [] as readonly ContinuityMapDocument[];
      return (await listContinuityMapDocuments(sql, userId)) as readonly ContinuityMapDocument[];
    } finally {
      sql.close();
    }
  },
);

const SessionIdInput = z.object({ sessao_id: z.string().uuid() });
export const listContinuityMapsForSessionFn = createServerFn({ method: "GET" })
  .inputValidator((d: unknown) => SessionIdInput.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      if (!(await canPublishContinuityMap(sql, userId))) return [] as readonly ContinuityMap[];
      return (await listContinuityMapsForSession(
        sql,
        userId,
        data.sessao_id,
      )) as readonly ContinuityMap[];
    } finally {
      sql.close();
    }
  });

const PublishMapInput = z.object({
  sessao_id: z.string().uuid(),
  mesa_id: z.string().uuid(),
  titulo: z.string().trim().min(1).max(160),
  conteudo_publico: z.string().trim().min(1).max(12000),
});
const PublishDocumentInput = z.object({
  mesa_id: z.string().uuid(),
  asset_key: z.string().trim().min(1).max(120),
});

export const publishContinuityMap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PublishMapInput.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      if (!(await canPublishContinuityMap(sql, userId, data.mesa_id)))
        throw new Error("continuity_map_forbidden");
      return (await upsertContinuityMap(sql, userId, {
        sessionId: data.sessao_id,
        mesaId: data.mesa_id,
        title: data.titulo,
        publicContent: data.conteudo_publico,
      })) as ContinuityMap;
    } finally {
      sql.close();
    }
  });

export const publishContinuityMapDocument = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => PublishDocumentInput.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      if (!(await canPublishContinuityMap(sql, userId, data.mesa_id)))
        throw new Error("continuity_map_forbidden");
      return (await upsertContinuityMapDocument(sql, userId, {
        mesaId: data.mesa_id,
        assetKey: data.asset_key,
      })) as ContinuityMap;
    } finally {
      sql.close();
    }
  });

const MapIdInput = z.object({ mapa_id: z.string().uuid() });
export const removeContinuityMap = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => MapIdInput.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      if (!(await canPublishContinuityMap(sql, userId)))
        throw new Error("continuity_map_forbidden");
      await deleteContinuityMap(sql, userId, data.mapa_id);
      return { ok: true };
    } finally {
      sql.close();
    }
  });
