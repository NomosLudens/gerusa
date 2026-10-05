import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getRequest } from "@tanstack/react-start/server";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";

const kinds = [
  "nota",
  "evento",
  "sentimento",
  "ideia",
  "dor",
  "ganho",
  "sonho",
  "pergunta",
] as const;

const CreateSchema = z.object({
  kind: z.enum(kinds),
  body: z.string().trim().min(1).max(8000),
  mood: z.number().int().min(-3).max(3).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  occurred_at: z.string().datetime().optional(),
});

const ListSchema = z.object({
  limit: z.number().int().min(1).max(200).optional(),
  kind: z.enum(kinds).optional(),
  since: z.string().datetime().optional(),
});

type RegistroRow = {
  id: string;
  user_id: string;
  kind: (typeof kinds)[number];
  body: string;
  mood: number | null;
  tags: string[];
  occurred_at: string;
  created_at: string;
  updated_at: string;
};

async function localRequest() {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) throw new Error("local_database_not_configured");
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  return { sql: createBunPostgresExecutor(databaseUrl), userId: auth.userId };
}

export const createRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof CreateSchema>) => CreateSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      const rows = await sql.query<RegistroRow>(
        `INSERT INTO public.registro_vivo
          (user_id, kind, body, mood, tags, occurred_at)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING id, user_id, kind, body, mood, tags, occurred_at, created_at, updated_at`,
        [
          userId,
          data.kind,
          data.body,
          data.mood ?? null,
          data.tags?.length ? data.tags : "{}",
          data.occurred_at ?? new Date().toISOString(),
        ],
      );
      if (!rows[0]) throw new Error("registro_not_persisted");
      return rows[0];
    } finally {
      sql.close();
    }
  });

export const listRegistros = createServerFn({ method: "POST" })
  .inputValidator((data: z.infer<typeof ListSchema>) => ListSchema.parse(data))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      let statement = `SELECT id, user_id, kind, body, mood, tags, occurred_at, created_at, updated_at
                          FROM public.registro_vivo
                         WHERE user_id=$1`;
      const parameters: unknown[] = [userId];
      if (data.kind) {
        parameters.push(data.kind);
        statement += ` AND kind=$${parameters.length}`;
      }
      if (data.since) {
        parameters.push(data.since);
        statement += ` AND occurred_at >= $${parameters.length}`;
      }
      parameters.push(data.limit ?? 50);
      statement += ` ORDER BY occurred_at DESC, id DESC LIMIT $${parameters.length}`;
      return [...(await sql.query<RegistroRow>(statement, parameters))];
    } finally {
      sql.close();
    }
  });

export const deleteRegistro = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string }) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      await sql.query("SELECT public.delete_registro_vivo($1,$2)", [data.id, userId]);
      return { ok: true };
    } finally {
      sql.close();
    }
  });
