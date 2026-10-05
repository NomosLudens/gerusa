import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";

export type MemoryDomain = "memory";
export type MemorySource = "chat" | "manual" | "system";
export type MemorySensitivity = "low" | "medium" | "high";
export type MemoryCandidateStatus = "pending" | "approved" | "rejected" | "archived";
const CandidateInput = z.object({
  source: z.enum(["chat", "manual", "system"]).default("manual"),
  sourceId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(180),
  content: z.string().trim().min(1).max(8000),
  reason: z.string().trim().max(1000).optional(),
  sensitivity: z.enum(["low", "medium", "high"]).default("medium"),
  metadata: z.record(z.unknown()).optional(),
});
const ListInput = z.object({
  status: z.enum(["pending", "approved", "rejected", "archived"]).default("pending"),
  limit: z.number().int().min(1).max(200).default(100),
});
const ReviewInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1).max(180).optional(),
  content: z.string().trim().min(1).max(8000).optional(),
  sensitivity: z.enum(["low", "medium", "high"]).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(16).optional(),
});
const IdInput = z.object({ id: z.string().uuid() });
type CandidateRow = {
  id: string;
  user_id: string;
  source: string;
  source_id: string | null;
  title: string;
  content: string;
  reason: string | null;
  sensitivity: string;
  status: MemoryCandidateStatus;
  reviewed_at: string | null;
  reviewed_by: string | null;
  approved_memory_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
function clean(v: string) {
  return v
    .replace(/<[^>]*>/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}
function normalize(row: CandidateRow) {
  return {
    id: row.id,
    userId: row.user_id,
    domain: "memory" as const,
    source: row.source,
    sourceId: row.source_id,
    title: row.title,
    content: row.content,
    reason: row.reason,
    sensitivity: row.sensitivity,
    status: row.status,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    approvedMemoryId: row.approved_memory_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
async function local() {
  const url = getRuntimeDatabaseUrl();
  if (!url) throw new Error("local_database_not_configured");
  const auth = await requireUser(getRequest());
  if ("error" in auth) throw new Error("local_auth_unavailable");
  return { sql: createBunPostgresExecutor(url), userId: auth.userId };
}
export const createMemoryCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => CandidateInput.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await local();
    try {
      const rows = await sql.query<CandidateRow>(
        `INSERT INTO memory_candidates (user_id, domain, source, source_id, title, content, reason, sensitivity, metadata) VALUES ($1,'memory',$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [
          userId,
          data.source,
          data.sourceId ?? null,
          clean(data.title),
          clean(data.content),
          data.reason ? clean(data.reason) : null,
          data.sensitivity,
          data.metadata ?? {},
        ],
      );
      if (!rows[0]) throw new Error("candidate_not_persisted");
      return normalize(rows[0]);
    } finally {
      sql.close();
    }
  });
export const listMemoryCandidates = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ListInput.parse(d ?? {}))
  .handler(async ({ data }) => {
    const { sql, userId } = await local();
    try {
      const rows = await sql.query<CandidateRow>(
        "SELECT * FROM memory_candidates WHERE user_id=$1 AND status=$2 ORDER BY created_at DESC, id DESC LIMIT $3",
        [userId, data.status, data.limit],
      );
      return rows.map(normalize);
    } finally {
      sql.close();
    }
  });
export const approveMemoryCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => ReviewInput.parse(d))
  .handler(async ({ data }) => {
    const { sql, userId } = await local();
    try {
      const rows = await sql.query<CandidateRow>(
        "SELECT * FROM memory_candidates WHERE id=$1 AND user_id=$2 AND status='pending' LIMIT 1",
        [data.id, userId],
      );
      const row = rows[0];
      if (!row) throw new Error("candidate_not_found_or_reviewed");
      const sensitivity = data.sensitivity ?? row.sensitivity;
      const tags = data.tags ?? [row.source, "memory", sensitivity];
      const importance = sensitivity === "high" ? 3 : sensitivity === "low" ? 1 : 2;
      const result = await sql.query<{ result: { memory_id: string } }>(
        "SELECT approve_memory_candidate_atomic($1,$2,$3,$4,'memory',$5,$6,$7) AS result",
        [
          userId,
          row.id,
          clean(data.title ?? row.title),
          clean(data.content ?? row.content),
          sensitivity,
          tags,
          importance,
        ],
      );
      const updated = await sql.query<CandidateRow>(
        "SELECT * FROM memory_candidates WHERE id=$1 AND user_id=$2",
        [row.id, userId],
      );
      return { candidate: normalize(updated[0] ?? row), memoryId: result[0]?.result?.memory_id };
    } finally {
      sql.close();
    }
  });
async function updateCandidate(id: string, status: "rejected" | "archived") {
  const { sql, userId } = await local();
  try {
    const rows = await sql.query<CandidateRow>(
      "UPDATE memory_candidates SET status=$3, reviewed_at=now(), reviewed_by=$2 WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING *",
      [id, userId, status],
    );
    if (!rows[0]) throw new Error("candidate_not_found_or_reviewed");
    return normalize(rows[0]);
  } finally {
    sql.close();
  }
}
export const rejectMemoryCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(({ data }) => updateCandidate(data.id, "rejected"));
export const archiveMemoryCandidate = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => IdInput.parse(d))
  .handler(({ data }) => updateCandidate(data.id, "archived"));
