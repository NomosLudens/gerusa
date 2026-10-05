import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";

async function localRequest() {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) throw new Error("local_database_not_configured");
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  const sql = createBunPostgresExecutor(databaseUrl);
  return { sql, userId: auth.userId };
}

type JardimMemoryRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  source: string | null;
  source_ref: string | null;
  category: string;
  tags: string[];
  importance: number;
  ease: number;
  interval_days: number;
  review_count: number;
  next_review_at: string;
  last_reviewed_at: string | null;
  archived_at: string | null;
  created_at: string;
};

// SM-2 simplificado para repetição espaçada.
// quality: 0 (errei), 1 (difícil), 2 (ok), 3 (fácil) — mapeado de botões de revisão.
function nextSchedule(
  prev: { ease: number; interval_days: number; review_count: number },
  quality: 0 | 1 | 2 | 3,
) {
  let { ease, interval_days, review_count } = prev;
  // ease entre 1.3 e 2.8
  ease = Math.max(1.3, Math.min(2.8, ease + (0.1 - (3 - quality) * 0.08)));
  if (quality === 0) {
    interval_days = 1;
    review_count = 0;
  } else if (review_count === 0) {
    interval_days = quality >= 2 ? 1 : 1;
  } else if (review_count === 1) {
    interval_days = quality >= 2 ? 3 : 1;
  } else {
    interval_days = Math.max(1, Math.round(interval_days * ease));
  }
  return {
    ease,
    interval_days,
    review_count: review_count + 1,
    next_review_at: new Date(Date.now() + interval_days * 86_400_000).toISOString(),
    last_reviewed_at: new Date().toISOString(),
  };
}

const CreateSchema = z.object({
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(8000),
  source: z.string().trim().max(60).optional(),
  source_ref: z.string().uuid().optional(),
  category: z.string().trim().min(1).max(40).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  importance: z.number().int().min(1).max(3).optional(),
});

export const createMemoria = createServerFn({ method: "POST" })
  .inputValidator((d: z.infer<typeof CreateSchema>) => CreateSchema.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      const rows = await sql.query<JardimMemoryRow>(
        `INSERT INTO jardim_memorias (user_id, title, body, source, source_ref, category, tags, importance)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          userId,
          data.title,
          data.body,
          data.source ?? null,
          data.source_ref ?? null,
          data.category ?? "geral",
          data.tags?.length ? data.tags : "{}",
          data.importance ?? 2,
        ],
      );
      if (!rows[0]) throw new Error("memory_not_persisted");
      return rows[0] as unknown as { id: string };
    } finally {
      sql.close();
    }
  });

export const listMemorias = createServerFn({ method: "POST" })
  .inputValidator((d: { archived?: boolean; limit?: number; category?: string }) =>
    z
      .object({
        archived: z.boolean().optional(),
        limit: z.number().int().min(1).max(200).optional(),
        category: z.string().trim().max(40).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      const rows = await sql.query<JardimMemoryRow>(
        `SELECT * FROM jardim_memorias WHERE user_id=$1 AND archived_at IS ${data.archived ? "NOT NULL" : "NULL"}
         ${data.category ? "AND category=$3" : ""} ORDER BY created_at DESC, id DESC LIMIT $2`,
        data.category ? [userId, data.limit ?? 100, data.category] : [userId, data.limit ?? 100],
      );
      return rows;
    } finally {
      sql.close();
    }
  });

export const dueMemorias = createServerFn({ method: "POST" })
  .inputValidator((d: { limit?: number }) =>
    z.object({ limit: z.number().int().min(1).max(100).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      return await sql.query<JardimMemoryRow>(
        `SELECT * FROM jardim_memorias WHERE user_id=$1 AND archived_at IS NULL AND next_review_at <= $2 ORDER BY next_review_at ASC, id ASC LIMIT $3`,
        [userId, new Date().toISOString(), data.limit ?? 20],
      );
    } finally {
      sql.close();
    }
  });

export const reviewMemoria = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; quality: 0 | 1 | 2 | 3 }) =>
    z.object({ id: z.string().uuid(), quality: z.number().int().min(0).max(3) }).parse(d),
  )
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      const rows = await sql.query<{ ease: number; interval_days: number; review_count: number }>(
        "SELECT ease, interval_days, review_count FROM jardim_memorias WHERE id=$1 AND user_id=$2 LIMIT 1",
        [data.id, userId],
      );
      const prev = rows[0];
      if (!prev) throw new Error("not_found");
      const next = nextSchedule(
        {
          ease: Number(prev.ease),
          interval_days: prev.interval_days,
          review_count: prev.review_count,
        },
        data.quality as 0 | 1 | 2 | 3,
      );
      const updated = await sql.query(
        "UPDATE jardim_memorias SET ease=$3, interval_days=$4, review_count=$5, next_review_at=$6, last_reviewed_at=$7 WHERE id=$1 AND user_id=$2 RETURNING id",
        [
          data.id,
          userId,
          next.ease,
          next.interval_days,
          next.review_count,
          next.next_review_at,
          next.last_reviewed_at,
        ],
      );
      if (!updated[0]) throw new Error("not_found");
      return next;
    } finally {
      sql.close();
    }
  });

export const archiveMemoria = createServerFn({ method: "POST" })
  .inputValidator((d: { id: string; archive: boolean }) =>
    z.object({ id: z.string().uuid(), archive: z.boolean() }).parse(d),
  )
  .handler(async ({ data }) => {
    const { sql, userId } = await localRequest();
    try {
      const rows = await sql.query(
        "UPDATE jardim_memorias SET archived_at=$3 WHERE id=$1 AND user_id=$2 RETURNING id",
        [data.id, userId, data.archive ? new Date().toISOString() : null],
      );
      if (!rows[0]) throw new Error("not_found");
      return { ok: true };
    } finally {
      sql.close();
    }
  });
