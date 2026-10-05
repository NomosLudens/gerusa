import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor, type SqlExecutor } from "@/server/local-core/postgres";
import { createRuntimeStorage } from "@/server/runtime/storage";

const headers = { "Cache-Control": "no-store" };
const maxUploadBytes = 10 * 1024 * 1024;
const acceptedMime = new Map([
  ["image/jpeg", ".jpg"],
  ["image/png", ".png"],
  ["image/webp", ".webp"],
]);
const typeValues = ["NPC", "LOCAL", "OBJETO", "PISTA", "EVENTO", "DIARIO", "IMAGEM"] as const;
const canonicalValues = [
  "PLAYED_CONFIRMED",
  "RECOVERED_SESSION_NOTE",
  "CAMPAIGN_CANON",
  "CAMPAIGN_LOCK",
  "PLANNED",
  "OPEN",
] as const;
const editorialValues = ["DRAFT", "READY", "REVEALED", "ARCHIVED"] as const;
type EntryRow = {
  id: string;
  entry_type: (typeof typeValues)[number];
  title: string;
  canonical_status: (typeof canonicalValues)[number];
  editorial_status: (typeof editorialValues)[number];
  public_content: string;
  private_notes: string;
  media_asset_id: string | null;
  created_at: string;
  updated_at: string;
};

function db() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}
async function isSystemMaster(sql: SqlExecutor, userId: string) {
  return (
    (
      await sql.query(
        "SELECT 1 FROM public.system_roles WHERE user_id=$1 AND system_role='system_master'",
        [userId],
      )
    ).length > 0
  );
}
async function masterMesas(sql: SqlExecutor, userId: string, systemMaster: boolean) {
  return sql.query<{ id: string; slug: string; name: string }>(
    systemMaster
      ? "SELECT id::text,slug,name FROM public.mesas ORDER BY name,id"
      : "SELECT m.id::text,m.slug,m.name FROM public.mesas m JOIN public.mesa_members mm ON mm.mesa_id=m.id WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active' ORDER BY m.name,m.id",
    systemMaster ? [] : [userId],
  );
}
async function canManageMesaPublication(
  sql: SqlExecutor,
  userId: string,
  mesaId: string,
  systemMaster?: boolean,
) {
  if (systemMaster ?? (await isSystemMaster(sql, userId))) return true;
  return (
    (
      await sql.query(
        "SELECT 1 FROM public.mesa_members WHERE user_id=$1 AND mesa_id=$2 AND member_role='mestre' AND membership_status='active'",
        [userId, mesaId],
      )
    ).length > 0
  );
}
function canEditGlobalEntry(systemMaster: boolean) {
  return systemMaster;
}
async function canSeeMesa(sql: SqlExecutor, userId: string, mesaId: string) {
  return (
    (
      await sql.query(
        "SELECT 1 FROM public.mesa_members WHERE user_id=$1 AND mesa_id=$2 AND membership_status='active'",
        [userId, mesaId],
      )
    ).length > 0 || (await canManageMesaPublication(sql, userId, mesaId))
  );
}
function mediaUrl(path: string | null) {
  return path ? "/api/gallery/file?path=" + encodeURIComponent(path) : null;
}
function serializeMaster(row: EntryRow, publicationMesaIds: readonly string[]) {
  return {
    id: row.id,
    type: row.entry_type,
    title: row.title,
    canonicalStatus: row.canonical_status,
    editorialStatus: row.editorial_status,
    publicContent: row.public_content,
    privateNotes: row.private_notes,
    mediaAssetId: row.media_asset_id,
    mediaUrl: mediaUrl(row.media_asset_id),
    publicationMesaIds,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
function serializePlayer(row: EntryRow, publishedAt: string) {
  return {
    id: row.id,
    type: row.entry_type,
    title: row.title,
    publicContent: row.public_content,
    mediaUrl: mediaUrl(row.media_asset_id),
    publishedAt,
  };
}
const entrySchema = z
  .object({
    title: z.string().trim().min(1).max(160),
    type: z.enum(typeValues),
    canonicalStatus: z.enum(canonicalValues),
    editorialStatus: z.enum(editorialValues),
    publicContent: z.string().max(30000),
    privateNotes: z.string().max(30000),
    mediaAssetId: z.string().trim().max(500).nullable().optional(),
  })
  .strict();
async function readJson(request: Request) {
  const value = await request.json().catch(() => null);
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

export const Route = createFileRoute("/api/campaign-continuity")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = db();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const params = new URL(request.url).searchParams;
          if (params.get("view") === "master") {
            const systemMaster = await isSystemMaster(sql, auth.userId);
            const mesas = await masterMesas(sql, auth.userId, systemMaster);
            if (!systemMaster && !mesas.length)
              return Response.json({ error: "forbidden" }, { status: 403, headers });
            const rows = await sql.query<EntryRow>(
              systemMaster
                ? "SELECT id::text,entry_type,title,canonical_status,editorial_status,public_content,private_notes,media_asset_id,created_at,updated_at FROM public.campaign_continuity_entries WHERE archived_at IS NULL ORDER BY updated_at DESC,id"
                : "SELECT e.id::text,e.entry_type,e.title,e.canonical_status,e.editorial_status,e.public_content,e.private_notes,e.media_asset_id,e.created_at,e.updated_at FROM public.campaign_continuity_entries e WHERE e.archived_at IS NULL AND EXISTS (SELECT 1 FROM public.campaign_continuity_publications p JOIN public.mesa_members mm ON mm.mesa_id=p.mesa_id WHERE p.entry_id=e.id AND mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active') ORDER BY e.updated_at DESC,e.id",
              systemMaster ? [] : [auth.userId],
            );
            const publications = await sql.query<{ entry_id: string; mesa_id: string }>(
              systemMaster
                ? "SELECT entry_id::text,mesa_id::text FROM public.campaign_continuity_publications WHERE visibility='revealed'"
                : "SELECT p.entry_id::text,p.mesa_id::text FROM public.campaign_continuity_publications p JOIN public.mesa_members mm ON mm.mesa_id=p.mesa_id WHERE p.visibility='revealed' AND mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active'",
              systemMaster ? [] : [auth.userId],
            );
            const byEntry = new Map<string, string[]>();
            for (const publication of publications)
              byEntry.set(publication.entry_id, [
                ...(byEntry.get(publication.entry_id) ?? []),
                publication.mesa_id,
              ]);
            return Response.json(
              {
                mesas,
                entries: rows.map((row) => serializeMaster(row, byEntry.get(row.id) ?? [])),
              },
              { headers },
            );
          }
          const slug = params.get("mesaSlug")?.trim();
          if (!slug)
            return Response.json({ error: "mesa_slug_required" }, { status: 400, headers });
          const mesas = await sql.query<{ id: string; slug: string; name: string }>(
            "SELECT id::text,slug,name FROM public.mesas WHERE slug=$1",
            [slug],
          );
          const mesa = mesas[0];
          if (!mesa || !(await canSeeMesa(sql, auth.userId, mesa.id)))
            return Response.json({ error: "mesa_not_found" }, { status: 404, headers });
          const rows = await sql.query<EntryRow & { published_at: string }>(
            "SELECT e.id::text,e.entry_type,e.title,e.canonical_status,e.editorial_status,e.public_content,e.private_notes,e.media_asset_id,e.created_at,e.updated_at,p.published_at FROM public.campaign_continuity_entries e JOIN public.campaign_continuity_publications p ON p.entry_id=e.id WHERE p.mesa_id=$1 AND p.visibility='revealed' AND e.archived_at IS NULL ORDER BY p.published_at DESC,e.title,e.id",
            [mesa.id],
          );
          const vtt = await sql.query(
            "SELECT 1 FROM public.vtt_campaign_mappings vm " +
              "JOIN public.mesa_members mm ON mm.mesa_id = vm.mesa_id " +
              "WHERE vm.mesa_id = $1 AND vm.active = true AND mm.user_id = $2 " +
              "AND mm.membership_status = 'active' LIMIT 1",
            [mesa.id, auth.userId],
          );
          return Response.json(
            {
              mesa,
              vttAvailable: vtt.length > 0,
              entries: rows.map((row) => serializePlayer(row, row.published_at)),
            },
            { headers },
          );
        } catch (error) {
          console.error("campaign_continuity_get_failed", error);
          return Response.json(
            { error: "campaign_continuity_unavailable" },
            { status: 503, headers },
          );
        } finally {
          sql.close();
        }
      },
      POST: async ({ request }) => {
        if (
          !isSameOriginRequest(
            request,
            process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app",
          )
        )
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = db();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          if (
            request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")
          ) {
            const form = await request.formData();
            const mesaId = String(form.get("mesaId") ?? "");
            if (!(await canManageMesaPublication(sql, auth.userId, mesaId)))
              return Response.json({ error: "forbidden" }, { status: 403, headers });
            const file = form.get("file");
            if (
              !(file instanceof File) ||
              !acceptedMime.has(file.type) ||
              file.size < 1 ||
              file.size > maxUploadBytes
            )
              return Response.json({ error: "invalid_image_upload" }, { status: 400, headers });
            const relativePath = "campaign-uploads/" + randomUUID() + acceptedMime.get(file.type)!;
            await createRuntimeStorage().put(
              relativePath,
              new Uint8Array(await file.arrayBuffer()),
              file.type,
            );
            return Response.json(
              {
                mediaAssetId: relativePath,
                url: mediaUrl(relativePath),
                bytes: file.size,
                contentType: file.type,
              },
              { status: 201, headers },
            );
          }
          const body = await readJson(request);
          const action = String(body?.action ?? "create");
          const systemMaster = await isSystemMaster(sql, auth.userId);
          if (!systemMaster && !(await masterMesas(sql, auth.userId, systemMaster)).length)
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          if (action === "create") {
            if (!(await canEditGlobalEntry(systemMaster)))
              return Response.json({ error: "forbidden" }, { status: 403, headers });
            const parsed = entrySchema.safeParse({
              title: body?.title,
              type: body?.type,
              canonicalStatus: body?.canonicalStatus,
              editorialStatus: body?.editorialStatus,
              publicContent: body?.publicContent,
              privateNotes: body?.privateNotes,
              mediaAssetId: body?.mediaAssetId,
            });
            if (!parsed.success)
              return Response.json({ error: "invalid_campaign_entry" }, { status: 400, headers });
            const rows = await sql.query<EntryRow>(
              "INSERT INTO public.campaign_continuity_entries (entry_type,title,canonical_status,editorial_status,public_content,private_notes,media_asset_id,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id::text,entry_type,title,canonical_status,editorial_status,public_content,private_notes,media_asset_id,created_at,updated_at",
              [
                parsed.data.type,
                parsed.data.title,
                parsed.data.canonicalStatus,
                parsed.data.editorialStatus,
                parsed.data.publicContent,
                parsed.data.privateNotes,
                parsed.data.mediaAssetId ?? null,
                auth.userId,
              ],
            );
            return Response.json(
              { entry: serializeMaster(rows[0]!, []) },
              { status: 201, headers },
            );
          }
          const entryId = typeof body?.entryId === "string" ? body.entryId : "";
          if (!entryId)
            return Response.json({ error: "entry_id_required" }, { status: 400, headers });
          const currentEntry = await sql.query<{ public_content: string }>(
            "SELECT public_content FROM public.campaign_continuity_entries WHERE id=$1 AND archived_at IS NULL",
            [entryId],
          );
          if (!currentEntry.length)
            return Response.json({ error: "entry_not_found" }, { status: 404, headers });
          if (action === "publish" && !currentEntry[0]!.public_content.trim())
            return Response.json({ error: "public_content_required" }, { status: 400, headers });
          if (
            (action === "update" || action === "archive") &&
            !(await canEditGlobalEntry(systemMaster))
          )
            return Response.json({ error: "forbidden" }, { status: 403, headers });
          const requestedMesaIds = Array.isArray(body?.mesaIds)
            ? body.mesaIds.filter((id: unknown): id is string => typeof id === "string")
            : [];
          const accessibleIds = new Set(
            (await masterMesas(sql, auth.userId, systemMaster)).map((mesa) => mesa.id),
          );
          if (action === "update") {
            const parsed = entrySchema.safeParse({
              title: body?.title,
              type: body?.type,
              canonicalStatus: body?.canonicalStatus,
              editorialStatus: body?.editorialStatus,
              publicContent: body?.publicContent,
              privateNotes: body?.privateNotes,
              mediaAssetId: body?.mediaAssetId,
            });
            if (!parsed.success)
              return Response.json({ error: "invalid_campaign_entry" }, { status: 400, headers });
            const rows = await sql.query<EntryRow>(
              "UPDATE public.campaign_continuity_entries SET entry_type=$2,title=$3,canonical_status=$4,editorial_status=CASE WHEN EXISTS (SELECT 1 FROM public.campaign_continuity_publications WHERE entry_id=$1 AND visibility='revealed') THEN 'REVEALED' ELSE $5 END,public_content=$6,private_notes=$7,media_asset_id=$8,updated_at=now() WHERE id=$1 AND archived_at IS NULL RETURNING id::text,entry_type,title,canonical_status,editorial_status,public_content,private_notes,media_asset_id,created_at,updated_at",
              [
                entryId,
                parsed.data.type,
                parsed.data.title,
                parsed.data.canonicalStatus,
                parsed.data.editorialStatus,
                parsed.data.publicContent,
                parsed.data.privateNotes,
                parsed.data.mediaAssetId ?? null,
              ],
            );
            return Response.json({ entry: serializeMaster(rows[0]!, []) }, { headers });
          }
          if (action === "publish" || action === "hide") {
            const mesaIds = requestedMesaIds.filter((id) => accessibleIds.has(id));
            if (!mesaIds.length)
              return Response.json({ error: "mesa_ids_required" }, { status: 400, headers });
            for (const mesaId of mesaIds)
              await sql.query(
                "INSERT INTO public.campaign_continuity_publications (entry_id,mesa_id,visibility,published_by,published_at,updated_at) VALUES ($1,$2,$3,$4,CASE WHEN $3='revealed' THEN now() ELSE NULL END,now()) ON CONFLICT (entry_id,mesa_id) DO UPDATE SET visibility=EXCLUDED.visibility,published_by=EXCLUDED.published_by,published_at=CASE WHEN EXCLUDED.visibility='revealed' THEN now() ELSE public.campaign_continuity_publications.published_at END,updated_at=now()",
                [entryId, mesaId, action === "publish" ? "revealed" : "hidden", auth.userId],
              );
            await sql.query(
              "UPDATE public.campaign_continuity_entries SET editorial_status=CASE WHEN EXISTS (SELECT 1 FROM public.campaign_continuity_publications WHERE entry_id=$1 AND visibility='revealed') THEN 'REVEALED' ELSE 'READY' END,updated_at=now() WHERE id=$1",
              [entryId],
            );
            return Response.json({ ok: true }, { headers });
          }
          if (action === "archive") {
            await sql.query(
              "UPDATE public.campaign_continuity_entries SET archived_at=now(),editorial_status='ARCHIVED',updated_at=now() WHERE id=$1",
              [entryId],
            );
            return Response.json({ ok: true }, { headers });
          }
          return Response.json({ error: "invalid_campaign_action" }, { status: 400, headers });
        } catch (error) {
          console.error("campaign_continuity_write_failed", error);
          return Response.json(
            { error: "campaign_continuity_write_failed" },
            { status: 503, headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
