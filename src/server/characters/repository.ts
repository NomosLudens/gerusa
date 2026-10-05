import { randomUUID } from "node:crypto";
import type { SqlExecutor } from "@/server/local-core/postgres";
import type {
  CharacterEvent,
  CharacterProgressionRequest,
  CharacterRecord,
  CharacterVersion,
  CharacterCreationMessage,
  CharacterMesa,
} from "./contracts";
import {
  mechanicalFingerprint,
  progressionComplete,
  validateProgressionSnapshot,
  validateCharacterSnapshot,
  validateMagicChoices,
  snapshotsEqual,
  epicHorizonForMarco,
  type EpicManifestationStatus,
  type CharacterSnapshot,
} from "./character-canon";
import {
  canEditCharacter,
  canReviewCharacter,
  isCharacterReviewer,
  reviewerForNewCharacter,
} from "./authorization";
import { isSystemMaster } from "@/server/local-core/player-access";
import { projectKallistisCharacter } from "./presentation";

type CharacterRow = Record<string, unknown>;
const date = (v: unknown): string => String(v ?? "");
const json = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const epicStatus = (v: unknown): EpicManifestationStatus | null =>
  typeof v === "string" && v ? (v as EpicManifestationStatus) : null;
function epicManifestation(snapshot: CharacterSnapshot): Record<string, unknown> | null {
  const trails = Array.isArray(snapshot.trilhas) ? snapshot.trilhas : [];
  const trail = trails[Number(snapshot.trilhaAtiva) || 0];
  if (!trail || typeof trail !== "object") return null;
  const items = Array.isArray((trail as Record<string, unknown>).manifestacoesEpicas)
    ? ((trail as Record<string, unknown>).manifestacoesEpicas as unknown[])
    : [];
  const item = items[items.length - 1];
  return item && typeof item === "object" ? (item as Record<string, unknown>) : null;
}
function reviewSnapshot(
  snapshot: CharacterSnapshot,
  status: EpicManifestationStatus,
  feedback: string,
) {
  const next = structuredClone(snapshot);
  const trails = Array.isArray(next.trilhas) ? next.trilhas : [];
  const trail = trails[Number(next.trilhaAtiva) || 0];
  if (!trail || typeof trail !== "object") return next;
  const record = trail as Record<string, unknown>;
  const items = Array.isArray(record.manifestacoesEpicas) ? [...record.manifestacoesEpicas] : [];
  const last = items[items.length - 1];
  if (last && typeof last === "object") {
    items[items.length - 1] = {
      ...(last as Record<string, unknown>),
      statusHomologacao: status,
      masterFeedback: feedback,
      reviewRequired: status === "HOMOLOGADA_PROVISORIAMENTE",
      mechanicallyActive: false,
      aprovadaPeloMestre: status === "HOMOLOGADA" || status === "HOMOLOGADA_PROVISORIAMENTE",
    };
  }
  record.manifestacoesEpicas = items;
  return next;
}
function activateReviewedSnapshot(snapshot: CharacterSnapshot) {
  const next = reviewSnapshot(
    snapshot,
    (epicManifestation(snapshot)?.statusHomologacao as EpicManifestationStatus) || "HOMOLOGADA",
    String(epicManifestation(snapshot)?.masterFeedback || ""),
  );
  const item = epicManifestation(next);
  if (item) item.mechanicallyActive = true;
  return next;
}
function mapCharacter(r: CharacterRow, mesas: CharacterMesa[] = []): CharacterRecord {
  return {
    id: String(r.id),
    ownerUserId: String(r.owner_user_id),
    masterUserId: String(r.master_user_id),
    status: r.status as CharacterRecord["status"],
    ruleset: String(r.ruleset),
    name: String(r.name ?? ""),
    playerName: String(r.player_name ?? ""),
    ownerDisplayName: String(r.owner_display_name ?? ""),
    snapshot: json(r.snapshot),
    kallistis: projectKallistisCharacter(json(r.snapshot)),
    mesas,
    version: Number(r.version),
    mechanicalFingerprint: String(r.mechanical_fingerprint ?? ""),
    createdAt: date(r.created_at),
    updatedAt: date(r.updated_at),
    submittedAt: r.submitted_at ? date(r.submitted_at) : null,
    approvedAt: r.approved_at ? date(r.approved_at) : null,
    rejectedAt: r.rejected_at ? date(r.rejected_at) : null,
    archivedAt: r.archived_at ? date(r.archived_at) : null,
    publishedSnapshot: r.published_snapshot ? json(r.published_snapshot) : null,
    publishedVersion: r.published_version == null ? null : Number(r.published_version),
  };
}
async function tx<T>(sql: SqlExecutor, fn: () => Promise<T>): Promise<T> {
  if (sql.transaction) {
    const originalQuery = sql.query;
    return sql.transaction(async (transaction) => {
      sql.query = transaction.query.bind(transaction);
      try {
        return await fn();
      } finally {
        sql.query = originalQuery;
      }
    });
  }
  await sql.query("BEGIN");
  try {
    const result = await fn();
    await sql.query("COMMIT");
    return result;
  } catch (e) {
    await sql.query("ROLLBACK").catch(() => undefined);
    throw e;
  }
}
const select = `SELECT c.id, c.owner_user_id, c.master_user_id, c.status, c.ruleset, c.name, c.player_name, COALESCE((SELECT p.display_name FROM public.profiles p WHERE p.id = c.owner_user_id), '') AS owner_display_name, c.snapshot, c.version, c.mechanical_fingerprint, c.created_at, c.updated_at, c.submitted_at, c.approved_at, c.rejected_at, c.archived_at, c.published_snapshot, c.published_version FROM public.characters c`;

async function authenticatedPlayerName(sql: SqlExecutor, ownerUserId: string): Promise<string> {
  const rows = await sql.query<{ display_name: string | null }>(
    "SELECT display_name FROM public.profiles WHERE id = $1 LIMIT 1",
    [ownerUserId],
  );
  return (
    String(rows[0]?.display_name ?? "")
      .trim()
      .slice(0, 160) || "Jogador"
  );
}

export function hydratePlayer(snapshot: CharacterSnapshot, displayName: string): CharacterSnapshot {
  const next = structuredClone(snapshot);
  next.jogador = displayName.trim().slice(0, 160) || "Jogador";
  return next;
}
async function withMesas(sql: SqlExecutor, rows: readonly CharacterRow[]) {
  if (!rows.length) return [] as CharacterRecord[];
  const ids = rows.map((row) => String(row.id));
  const placeholders = ids.map((_, index) => `$${index + 1}`).join(",");
  const links = await sql.query<CharacterRow>(
    `SELECT cm.character_id, m.id, m.slug, m.name
       FROM public.character_mesas cm
       JOIN public.mesas m ON m.id = cm.mesa_id
      WHERE cm.character_id IN (${placeholders})
      ORDER BY m.name ASC`,
    ids,
  );
  const grouped = new Map<string, CharacterMesa[]>();
  links.forEach((row) => {
    const characterId = String(row.character_id);
    const current = grouped.get(characterId) ?? [];
    current.push({ id: String(row.id), slug: String(row.slug), name: String(row.name) });
    grouped.set(characterId, current);
  });
  return rows.map((row) => mapCharacter(row, grouped.get(String(row.id)) ?? []));
}
async function availableMesas(sql: SqlExecutor, userId: string, mesaIds: readonly string[]) {
  const unique = [...new Set(mesaIds.map(String))];
  if (!unique.length) return [] as CharacterMesa[];
  if (!(await isSystemMaster(sql, userId))) throw new Error("mesa_assignment_forbidden");
  const placeholders = unique.map((_, index) => `$${index + 1}`).join(",");
  const rows = await sql.query<CharacterRow>(
    `SELECT m.id, m.slug, m.name
       FROM public.mesas m
      WHERE m.id IN (${placeholders})
      ORDER BY m.name ASC`,
    unique,
  );
  if (rows.length !== unique.length) throw new Error("mesa_not_available");
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
  }));
}
async function syncMesas(sql: SqlExecutor, characterId: string, mesas: readonly CharacterMesa[]) {
  await sql.query(`DELETE FROM public.character_mesas WHERE character_id = $1`, [characterId]);
  for (const mesa of mesas) {
    await sql.query(`INSERT INTO public.character_mesas (character_id, mesa_id) VALUES ($1, $2)`, [
      characterId,
      mesa.id,
    ]);
  }
}
export type CharacterRepository = ReturnType<typeof createPostgresCharacterRepository>;
export function createPostgresCharacterRepository(sql: SqlExecutor) {
  return {
    async list(userId: string, includeArchived = false) {
      const rows = await sql.query<CharacterRow>(
        `${select} WHERE owner_user_id = $1 ${includeArchived ? "" : "AND status <> 'archived'"} ORDER BY updated_at DESC, id`,
        [userId],
      );
      return withMesas(sql, rows);
    },
    async get(userId: string, id: string) {
      const rows = await sql.query<CharacterRow>(
        `${select} WHERE owner_user_id = $1 AND id = $2 LIMIT 1`,
        [userId, id],
      );
      return rows[0] ? (await withMesas(sql, rows))[0] : null;
    },
    async submittedForReviewer(userId: string) {
      const globalReviewer = await isCharacterReviewer(sql, userId);
      const accessClause = globalReviewer
        ? ""
        : `AND EXISTS (
             SELECT 1
               FROM public.character_mesas accessible_cm
               JOIN public.mesa_members accessible_mm ON accessible_mm.mesa_id = accessible_cm.mesa_id
              WHERE accessible_cm.character_id = c.id
                AND accessible_mm.user_id = $1
                AND accessible_mm.member_role = 'mestre'
                AND accessible_mm.membership_status = 'active'
           )`;
      const rows = await sql.query<CharacterRow>(
        `${select} WHERE c.status='submitted' ${accessClause} ORDER BY c.submitted_at ASC, c.id`,
        globalReviewer ? [] : [userId],
      );
      return withMesas(sql, rows);
    },
    async listMesas(userId: string) {
      const rows = await sql.query<CharacterRow>(
        `SELECT m.id, m.slug, m.name
           FROM public.mesas m
           JOIN public.mesa_members mm ON mm.mesa_id = m.id
          WHERE mm.user_id = $1 AND mm.membership_status = 'active'
          ORDER BY m.name ASC`,
        [userId],
      );
      return rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
      }));
    },
    async listMasterMesas(userId: string) {
      if (await isSystemMaster(sql, userId)) {
        const rows = await sql.query<CharacterRow>(
          `SELECT id, slug, name FROM public.mesas ORDER BY name ASC`,
        );
        return rows.map((row) => ({
          id: String(row.id),
          slug: String(row.slug),
          name: String(row.name),
        }));
      }
      const rows = await sql.query<CharacterRow>(
        `SELECT m.id, m.slug, m.name
           FROM public.mesas m
           JOIN public.mesa_members mm ON mm.mesa_id = m.id
          WHERE mm.user_id = $1
            AND mm.member_role = 'mestre'
            AND mm.membership_status = 'active'
          ORDER BY m.name ASC`,
        [userId],
      );
      return rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
      }));
    },
    async listAllMesas() {
      const rows = await sql.query<CharacterRow>(
        `SELECT id, slug, name FROM public.mesas ORDER BY name ASC`,
      );
      return rows.map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        name: String(row.name),
      }));
    },
    async listForMaster(includeArchived = false) {
      const rows = await sql.query<CharacterRow>(
        `${select} ${includeArchived ? "" : "WHERE status <> 'archived'"} ORDER BY updated_at DESC, id`,
      );
      return withMesas(sql, rows);
    },
    async listForAuthorizedMaster(userId: string, includeArchived = false) {
      const systemMaster = await isSystemMaster(sql, userId);
      const statusClause = includeArchived ? "" : "AND c.status <> 'archived'";
      const accessClause = systemMaster
        ? ""
        : `AND EXISTS (
             SELECT 1
               FROM public.character_mesas accessible_cm
               JOIN public.mesa_members accessible_mm ON accessible_mm.mesa_id = accessible_cm.mesa_id
              WHERE accessible_cm.character_id = c.id
                AND accessible_mm.user_id = $1
                AND accessible_mm.member_role = 'mestre'
                AND accessible_mm.membership_status = 'active'
           )`;
      const rows = await sql.query<CharacterRow>(
        `${select} WHERE TRUE ${statusClause} ${accessClause} ORDER BY c.updated_at DESC, c.id`,
        systemMaster ? [] : [userId],
      );
      return withMesas(sql, rows);
    },
    async getForAuthorizedMaster(userId: string, id: string) {
      const systemMaster = await isSystemMaster(sql, userId);
      const accessClause = systemMaster
        ? ""
        : `AND EXISTS (
             SELECT 1
               FROM public.character_mesas accessible_cm
               JOIN public.mesa_members accessible_mm ON accessible_mm.mesa_id = accessible_cm.mesa_id
              WHERE accessible_cm.character_id = c.id
                AND accessible_mm.user_id = $2
                AND accessible_mm.member_role = 'mestre'
                AND accessible_mm.membership_status = 'active'
           )`;
      const parameters = systemMaster ? [id] : [id, userId];
      const rows = await sql.query<CharacterRow>(
        `${select} WHERE c.id = $1 AND c.status <> 'archived' ${accessClause} LIMIT 1`,
        parameters,
      );
      return rows[0] ? (await withMesas(sql, rows))[0] : null;
    },
    async getForManualExportAuthorizedMaster(userId: string, id: string) {
      const systemMaster = await isSystemMaster(sql, userId);
      const accessClause = systemMaster
        ? ""
        : `AND (
             c.master_user_id = $2
             OR EXISTS (
               SELECT 1
                 FROM public.character_mesas accessible_cm
                 JOIN public.mesa_members accessible_mm ON accessible_mm.mesa_id = accessible_cm.mesa_id
                WHERE accessible_cm.character_id = c.id
                  AND accessible_mm.user_id = $2
                  AND accessible_mm.member_role = 'mestre'
                  AND accessible_mm.membership_status = 'active'
             )
           )`;
      const parameters = systemMaster ? [id] : [id, userId];
      const rows = await sql.query<CharacterRow>(
        `${select} WHERE c.id = $1 AND c.status <> 'archived' ${accessClause} LIMIT 1`,
        parameters,
      );
      return rows[0] ? (await withMesas(sql, rows))[0] : null;
    },
    async pendingProgressionForReviewer(userId: string) {
      const globalReviewer = await isCharacterReviewer(sql, userId);
      const accessClause = globalReviewer
        ? ""
        : `AND EXISTS (
             SELECT 1
               FROM public.character_mesas accessible_cm
               JOIN public.mesa_members accessible_mm ON accessible_mm.mesa_id = accessible_cm.mesa_id
              WHERE accessible_cm.character_id = c.id
                AND accessible_mm.user_id = $1
                AND accessible_mm.member_role = 'mestre'
                AND accessible_mm.membership_status = 'active'
           )`;
      const rows = await sql.query<CharacterRow>(
        `SELECT p.id,p.character_id,c.name,c.player_name,p.from_marco,p.to_marco,p.status,p.created_at,p.proposed_snapshot,p.epic_manifestation_status,p.epic_manifestation_feedback,p.epic_manifestation_reviewed_by_user_id,p.epic_manifestation_reviewed_at
           FROM public.character_progression_requests p
           JOIN public.characters c ON c.id=p.character_id
          WHERE c.status='approved' AND p.status='requested' ${accessClause}
          ORDER BY p.created_at ASC,p.id ASC`,
        globalReviewer ? [] : [userId],
      );
      return rows.map((r) => ({
        id: String(r.id),
        characterId: String(r.character_id),
        characterName: String(r.name ?? "Personagem"),
        playerName: String(r.player_name ?? "Jogador"),
        fromMarco: Number(r.from_marco),
        toMarco: Number(r.to_marco),
        status: String(r.status),
        createdAt: date(r.created_at),
        proposedSnapshot: r.proposed_snapshot ? json(r.proposed_snapshot) : null,
        epicManifestationStatus: epicStatus(r.epic_manifestation_status),
        epicManifestationFeedback: r.epic_manifestation_feedback
          ? String(r.epic_manifestation_feedback)
          : null,
        epicManifestationReviewedByUserId: r.epic_manifestation_reviewed_by_user_id
          ? String(r.epic_manifestation_reviewed_by_user_id)
          : null,
        epicManifestationReviewedAt: r.epic_manifestation_reviewed_at
          ? date(r.epic_manifestation_reviewed_at)
          : null,
      }));
    },
    async epicPrecedentsForReviewer(userId: string) {
      const globalReviewer = await isCharacterReviewer(sql, userId);
      const accessClause = globalReviewer
        ? ""
        : `AND EXISTS (
             SELECT 1 FROM public.character_mesas precedent_cm
             JOIN public.mesa_members precedent_mm ON precedent_mm.mesa_id = precedent_cm.mesa_id
             WHERE precedent_cm.character_id = c.id
               AND precedent_mm.user_id = $1
               AND precedent_mm.member_role = 'mestre'
               AND precedent_mm.membership_status = 'active'
           )`;
      const rows = await sql.query<CharacterRow>(
        `SELECT p.id,p.character_id,c.name,c.player_name,p.to_marco,p.proposed_snapshot,p.epic_manifestation_status
           FROM public.character_progression_requests p
           JOIN public.characters c ON c.id=p.character_id
          WHERE c.status='approved'
            AND p.epic_manifestation_status IN ('HOMOLOGADA','HOMOLOGADA_PROVISORIAMENTE')
            ${accessClause}
          ORDER BY p.created_at DESC,p.id DESC
          LIMIT 50`,
        globalReviewer ? [] : [userId],
      );
      return rows.map((r) => ({
        id: String(r.id),
        characterId: String(r.character_id),
        characterName: String(r.name ?? "Personagem"),
        playerName: String(r.player_name ?? "Jogador"),
        toMarco: Number(r.to_marco),
        epicManifestationStatus: epicStatus(r.epic_manifestation_status),
        proposedSnapshot: r.proposed_snapshot ? json(r.proposed_snapshot) : null,
      }));
    },
    async create(
      userId: string,
      id: string,
      snapshot: CharacterSnapshot,
      ruleset: string,
      fingerprint: string,
      mesaIds?: readonly string[],
      ownerUserId = userId,
    ) {
      const validation =
        snapshot.completo === true
          ? validateCharacterSnapshot(snapshot, true)
          : { ok: validateMagicChoices(snapshot).length === 0 };
      if (!validation.ok) throw new Error("character_invalid");
      if (ownerUserId !== userId) {
        const owner = await sql.query(
          `SELECT 1 FROM public.users u
            WHERE u.id = $1 AND u.status = 'active'
              AND NOT EXISTS (
                SELECT 1 FROM public.system_roles sr
                 WHERE sr.user_id = u.id AND sr.system_role = 'system_master'
              )
            LIMIT 1`,
          [ownerUserId],
        );
        if (!owner.length) throw new Error("player_not_found");
      }
      const mesas = mesaIds === undefined ? null : await availableMesas(sql, userId, mesaIds);
      const playerName = await authenticatedPlayerName(sql, ownerUserId);
      const storedSnapshot = hydratePlayer(snapshot, playerName);
      const storedFingerprint = mechanicalFingerprint(storedSnapshot);
      const now = new Date().toISOString();
      return tx(sql, async () => {
        const existing = await sql.query<CharacterRow>(`${select} WHERE id = $1 FOR UPDATE`, [id]);
        if (existing[0]) return (await withMesas(sql, existing))[0];
        const result = await sql.query<CharacterRow>(
          `INSERT INTO public.characters (id, owner_user_id, master_user_id, status, ruleset, name, player_name, snapshot, version, mechanical_fingerprint, created_at, updated_at) VALUES ($1,$2,$3,'draft',$4,$5,$6,$7::jsonb,1,$8,$9,$9) RETURNING id, owner_user_id, master_user_id, status, ruleset, name, player_name, snapshot, version, mechanical_fingerprint, created_at, updated_at, submitted_at, approved_at, rejected_at, archived_at, published_snapshot, published_version`,
          [
            id,
            ownerUserId,
            await reviewerForNewCharacter(sql, ownerUserId),
            ruleset,
            String(storedSnapshot.nome ?? ""),
            String(storedSnapshot.jogador ?? ""),
            storedSnapshot,
            storedFingerprint,
            now,
          ],
        );
        await sql.query(
          `INSERT INTO public.character_versions (character_id, version, snapshot, reason, actor_user_id) VALUES ($1,1,$2::jsonb,'create',$3)`,
          [id, storedSnapshot, userId],
        );
        await sql.query(
          `INSERT INTO public.character_events (character_id, actor_user_id, event_type, payload, version_before, version_after) VALUES ($1,$2,'character_draft_created','{}'::jsonb,NULL,1)`,
          [id, userId],
        );
        if (mesas) await syncMesas(sql, id, mesas);
        return (await withMesas(sql, [result[0]]))[0];
      });
    },
    async assignApprovedTemplate(
      userId: string,
      templateId: string,
      ownerUserId: string,
      mesaIds: readonly string[],
    ) {
      if (!(await isSystemMaster(sql, userId))) throw new Error("character_assignment_forbidden");
      const owner = await sql.query(
        `SELECT 1 FROM public.users u
          WHERE u.id=$1 AND u.status='active'
            AND NOT EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=u.id AND sr.system_role='system_master')
          LIMIT 1`,
        [ownerUserId],
      );
      if (!owner.length) throw new Error("player_not_found");
      const mesas = await availableMesas(sql, userId, mesaIds);
      if (!mesas.length) throw new Error("mesa_not_available");
      const membership = await sql.query(
        `SELECT 1 FROM public.mesa_members
          WHERE user_id=$1 AND mesa_id=$2 AND member_role='jogador' AND membership_status='active'
          LIMIT 1`,
        [ownerUserId, mesas[0]!.id],
      );
      if (!membership.length) throw new Error("player_not_in_mesa");
      return tx(sql, async () => {
        const templates = await sql.query<CharacterRow>(
          `${select}
            WHERE c.id=$1 AND c.owner_user_id=$2 AND c.status='approved'
              AND c.published_snapshot IS NOT NULL
              AND c.published_snapshot->>'completo'='true'
              AND NOT EXISTS (SELECT 1 FROM public.character_mesas cm WHERE cm.character_id=c.id)
            FOR UPDATE`,
          [templateId, userId],
        );
        const source = templates[0];
        if (!source) throw new Error("character_template_not_found");
        const snapshot = hydratePlayer(
          json(source.published_snapshot),
          await authenticatedPlayerName(sql, ownerUserId),
        );
        const validation = validateCharacterSnapshot(snapshot, true);
        if (!validation.ok) throw new Error("character_template_invalid");
        const id = randomUUID();
        const now = new Date().toISOString();
        const fingerprint = mechanicalFingerprint(snapshot);
        const rows = await sql.query<CharacterRow>(
          `INSERT INTO public.characters
            (id,owner_user_id,master_user_id,status,ruleset,name,player_name,snapshot,version,mechanical_fingerprint,created_at,updated_at,approved_at,published_snapshot,published_version)
           VALUES ($1,$2,$3,'approved',$4,$5,$6,$7::jsonb,1,$8,$9,$9,$9,$7::jsonb,1)
           RETURNING id,owner_user_id,master_user_id,status,ruleset,name,player_name,snapshot,version,mechanical_fingerprint,created_at,updated_at,submitted_at,approved_at,rejected_at,archived_at,published_snapshot,published_version`,
          [
            id,
            ownerUserId,
            userId,
            String(source.ruleset),
            String(snapshot.nome ?? ""),
            String(snapshot.jogador ?? ""),
            snapshot,
            fingerprint,
            now,
          ],
        );
        await sql.query(
          `INSERT INTO public.character_versions (character_id,version,snapshot,reason,actor_user_id) VALUES ($1,1,$2::jsonb,'assigned_template',$3)`,
          [id, snapshot, userId],
        );
        await sql.query(
          `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'character_assigned_from_template',$3::jsonb,NULL,1)`,
          [id, userId, { templateId, mesaIds: mesas.map((mesa) => mesa.id) }],
        );
        await syncMesas(sql, id, mesas);
        return (await withMesas(sql, rows))[0]!;
      });
    },
    async assignReadySnapshot(
      userId: string,
      sourceId: string,
      sourceName: string,
      sourceRuleset: string,
      sourceSnapshot: CharacterSnapshot,
      ownerUserId: string,
      mesaIds: readonly string[],
    ) {
      if (!(await isSystemMaster(sql, userId))) throw new Error("character_assignment_forbidden");
      const owner = await sql.query(
        `SELECT 1 FROM public.users u
          WHERE u.id=$1 AND u.status='active'
            AND NOT EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=u.id AND sr.system_role='system_master')
          LIMIT 1`,
        [ownerUserId],
      );
      if (!owner.length) throw new Error("player_not_found");
      const mesas = await availableMesas(sql, userId, mesaIds);
      if (!mesas.length) throw new Error("mesa_not_available");
      const membership = await sql.query(
        `SELECT 1 FROM public.mesa_members
          WHERE user_id=$1 AND mesa_id=$2 AND member_role='jogador' AND membership_status='active'
          LIMIT 1`,
        [ownerUserId, mesas[0]!.id],
      );
      if (!membership.length) throw new Error("player_not_in_mesa");
      const snapshot = hydratePlayer(
        sourceSnapshot,
        await authenticatedPlayerName(sql, ownerUserId),
      );
      const validation = validateCharacterSnapshot(snapshot, true);
      if (!validation.ok)
        throw new Error(`character_template_invalid:${validation.errors.join(",")}`);
      if (validateMagicChoices(snapshot).length)
        throw new Error("character_template_invalid:magic");
      const id = randomUUID();
      const now = new Date().toISOString();
      const fingerprint = mechanicalFingerprint(snapshot);
      return tx(sql, async () => {
        const rows = await sql.query<CharacterRow>(
          `INSERT INTO public.characters
            (id,owner_user_id,master_user_id,status,ruleset,name,player_name,snapshot,version,mechanical_fingerprint,created_at,updated_at,approved_at,published_snapshot,published_version)
           VALUES ($1,$2,$3,'approved',$4,$5,$6,$7::jsonb,1,$8,$9,$9,$9,$7::jsonb,1)
           RETURNING id,owner_user_id,master_user_id,status,ruleset,name,player_name,snapshot,version,mechanical_fingerprint,created_at,updated_at,submitted_at,approved_at,rejected_at,archived_at,published_snapshot,published_version`,
          [
            id,
            ownerUserId,
            userId,
            sourceRuleset,
            String(snapshot.nome ?? sourceName),
            String(snapshot.jogador ?? ""),
            snapshot,
            fingerprint,
            now,
          ],
        );
        await sql.query(
          `INSERT INTO public.character_versions (character_id,version,snapshot,reason,actor_user_id) VALUES ($1,1,$2::jsonb,'assigned_preset',$3)`,
          [id, snapshot, userId],
        );
        await sql.query(
          `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'character_assigned_from_preset',$3::jsonb,NULL,1)`,
          [
            id,
            userId,
            { presetId: sourceId, presetName: sourceName, mesaIds: mesas.map((mesa) => mesa.id) },
          ],
        );
        await syncMesas(sql, id, mesas);
        return (await withMesas(sql, rows))[0]!;
      });
    },
    async save(
      userId: string,
      id: string,
      snapshot: CharacterSnapshot,
      fingerprint: string,
      expectedVersion: number,
      mesaIds?: readonly string[],
    ) {
      if (validateMagicChoices(snapshot).length) throw new Error("character_invalid");
      const authorizationRows = await sql.query<CharacterRow>(`${select} WHERE id = $1 LIMIT 1`, [
        id,
      ]);
      if (
        !authorizationRows[0] ||
        !(await canEditCharacter(sql, userId, {
          id,
          ownerUserId: String(authorizationRows[0].owner_user_id),
        }))
      )
        throw new Error("character_not_found");
      const ownerUserId = String(authorizationRows[0].owner_user_id);
      const playerName = await authenticatedPlayerName(sql, ownerUserId);
      const storedSnapshot = hydratePlayer(snapshot, playerName);
      const storedFingerprint = mechanicalFingerprint(storedSnapshot);
      const mesas = mesaIds === undefined ? null : await availableMesas(sql, userId, mesaIds);
      return tx(sql, async () => {
        const rows = await sql.query<CharacterRow>(`${select} WHERE id = $1 FOR UPDATE`, [id]);
        const current = rows[0] ? mapCharacter(rows[0]) : null;
        if (!current) throw new Error("character_not_found");
        if (current.version !== expectedVersion) throw new Error("stale_character_version");
        if (!["draft", "rejected"].includes(current.status))
          throw new Error("character_not_editable");
        if (mesaIds === undefined) {
          const equal = await sql.query<{ same: boolean }>(
            `SELECT snapshot = $1::jsonb AS same FROM public.characters WHERE id = $2`,
            [storedSnapshot, id],
          );
          if (equal[0]?.same) return current;
        }
        await sql.query(
          `UPDATE public.characters SET name=$2, player_name=$3, snapshot=$4::jsonb, version=version+1, mechanical_fingerprint=$5, updated_at=now() WHERE id=$1`,
          [
            id,
            String(storedSnapshot.nome ?? ""),
            String(storedSnapshot.jogador ?? ""),
            storedSnapshot,
            storedFingerprint,
          ],
        );
        const v = current.version + 1;
        await sql.query(
          `INSERT INTO public.character_versions (character_id,version,snapshot,reason,actor_user_id) VALUES ($1,$2,$3::jsonb,'save',$4)`,
          [id, v, storedSnapshot, userId],
        );
        await sql.query(
          `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'character_draft_saved','{}'::jsonb,$3,$4)`,
          [id, userId, current.version, v],
        );
        if (mesas) await syncMesas(sql, id, mesas);
        const final = await sql.query<CharacterRow>(`${select} WHERE id = $1`, [id]);
        return (await withMesas(sql, final))[0];
      });
    },
    async setMesas(userId: string, id: string, mesaIds: readonly string[]) {
      if (!(await isSystemMaster(sql, userId))) throw new Error("mesa_assignment_forbidden");
      const mesas = await availableMesas(sql, userId, mesaIds);
      return tx(sql, async () => {
        const rows = await sql.query<CharacterRow>(`${select} WHERE id = $1 FOR UPDATE`, [id]);
        if (!rows[0]) throw new Error("character_not_found");
        await syncMesas(sql, id, mesas);
        return (await withMesas(sql, rows))[0];
      });
    },
    async transition(
      userId: string,
      id: string,
      action: "submit" | "reject" | "approve" | "archive" | "discard" | "delete",
      note = "",
    ) {
      if (action === "delete" && !(await isSystemMaster(sql, userId)))
        throw new Error("character_delete_forbidden");
      return tx(sql, async () => {
        const rows = await sql.query<CharacterRow>(`${select} WHERE id=$1 FOR UPDATE`, [id]);
        const c = rows[0] ? mapCharacter(rows[0]) : null;
        if (!c) throw new Error("character_not_found");
        const reviewer = await canReviewCharacter(sql, userId, c.id);
        let next: CharacterRecord["status"];
        let event: string;
        if (
          action === "submit" &&
          (c.ownerUserId === userId || (await isSystemMaster(sql, userId))) &&
          ["draft", "rejected"].includes(c.status)
        ) {
          next = "submitted";
          event = c.status === "rejected" ? "character_resubmitted" : "character_submitted";
        } else if (action === "reject" && reviewer && c.status === "submitted") {
          next = "rejected";
          event = "character_rejected";
        } else if (action === "approve" && reviewer && c.status === "submitted") {
          next = "approved";
          event = "character_approved";
        } else if (
          action === "discard" &&
          c.ownerUserId === userId &&
          ["draft", "rejected"].includes(c.status)
        ) {
          next = "archived";
          event = "character_discarded";
        } else if (
          action === "delete" &&
          (await isSystemMaster(sql, userId)) &&
          ["draft", "rejected", "approved"].includes(c.status)
        ) {
          next = "archived";
          event = "character_deleted";
        } else if (
          action === "archive" &&
          reviewer &&
          ["draft", "rejected", "approved"].includes(c.status)
        ) {
          next = "archived";
          event = "character_archived";
        } else throw new Error("invalid_character_transition");
        const stamp =
          action === "submit"
            ? ", submitted_at=now()"
            : action === "approve"
              ? ", approved_at=now()"
              : action === "reject"
                ? ", rejected_at=now()"
                : ", archived_at=now()";
        const publication =
          action === "approve" ? ", published_snapshot=snapshot, published_version=version" : "";
        await sql.query(
          `UPDATE public.characters SET status=$2, updated_at=now()${stamp}${publication} WHERE id=$1`,
          [id, next],
        );
        await sql.query(
          `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,$3,$4::jsonb,$5,$5)`,
          [id, userId, event, note ? { note } : {}, c.version],
        );
        const final = await sql.query<CharacterRow>(`${select} WHERE id=$1`, [id]);
        return mapCharacter(final[0]);
      });
    },
    async events(userId: string, id: string) {
      const rows = await sql.query<CharacterRow>(
        `SELECT e.id,e.character_id,e.actor_user_id,e.event_type,e.payload,e.version_before,e.version_after,e.created_at FROM public.character_events e JOIN public.characters c ON c.id=e.character_id WHERE c.owner_user_id=$1 AND c.id=$2 ORDER BY e.created_at ASC,e.id ASC`,
        [userId, id],
      );
      return rows.map((r) => ({
        id: String(r.id),
        characterId: String(r.character_id),
        actorUserId: String(r.actor_user_id),
        eventType: String(r.event_type),
        payload: json(r.payload),
        versionBefore: r.version_before === null ? null : Number(r.version_before),
        versionAfter: r.version_after === null ? null : Number(r.version_after),
        createdAt: date(r.created_at),
      })) as CharacterEvent[];
    },
    async versions(userId: string, id: string) {
      const rows = await sql.query<CharacterRow>(
        `SELECT v.version,v.snapshot,v.reason,v.actor_user_id,v.created_at FROM public.character_versions v JOIN public.characters c ON c.id=v.character_id WHERE c.owner_user_id=$1 AND c.id=$2 ORDER BY v.version ASC`,
        [userId, id],
      );
      return rows.map((r) => ({
        version: Number(r.version),
        snapshot: json(r.snapshot),
        reason: String(r.reason),
        actorUserId: String(r.actor_user_id),
        createdAt: date(r.created_at),
      })) as CharacterVersion[];
    },
    async messages(userId: string, id: string) {
      const rows = await sql.query<CharacterRow>(
        `SELECT m.id,m.character_id,m.user_id,m.role,m.content,m.created_at FROM public.character_creation_messages m JOIN public.characters c ON c.id=m.character_id WHERE c.owner_user_id=$1 AND c.id=$2 ORDER BY m.created_at ASC,m.id ASC`,
        [userId, id],
      );
      return rows.map((r) => ({
        id: String(r.id),
        characterId: String(r.character_id),
        userId: String(r.user_id),
        role: r.role as "user" | "assistant",
        content: String(r.content),
        createdAt: date(r.created_at),
      })) as CharacterCreationMessage[];
    },
    async addMessage(userId: string, id: string, role: "user" | "assistant", content: string) {
      await sql.query(
        `INSERT INTO public.character_creation_messages (id,character_id,user_id,role,content) SELECT $1,c.id,$2,$3,$4 FROM public.characters c WHERE c.id=$5 AND c.owner_user_id=$2`,
        [randomUUID(), userId, role, content.slice(0, 12000), id],
      );
    },
    async progressionList(userId: string, id: string) {
      const rows = await sql.query<CharacterRow>(
        `SELECT p.* FROM public.character_progression_requests p JOIN public.characters c ON c.id=p.character_id WHERE c.owner_user_id=$1 AND c.id=$2 ORDER BY p.created_at ASC,p.id ASC`,
        [userId, id],
      );
      return rows.map((r) => ({
        id: String(r.id),
        characterId: String(r.character_id),
        trailId: String(r.trail_id),
        fromMarco: Number(r.from_marco),
        toMarco: Number(r.to_marco),
        status: r.status as CharacterProgressionRequest["status"],
        note: String(r.note ?? ""),
        requestedByUserId: r.requested_by_user_id ? String(r.requested_by_user_id) : null,
        authorizedByUserId: r.authorized_by_user_id ? String(r.authorized_by_user_id) : null,
        appliedByUserId: r.applied_by_user_id ? String(r.applied_by_user_id) : null,
        createdAt: date(r.created_at),
        authorizedAt: r.authorized_at ? date(r.authorized_at) : null,
        startedAt: r.started_at ? date(r.started_at) : null,
        appliedAt: r.applied_at ? date(r.applied_at) : null,
        proposedSnapshot: r.proposed_snapshot ? json(r.proposed_snapshot) : null,
        epicManifestationStatus: epicStatus(r.epic_manifestation_status),
        epicManifestationFeedback: r.epic_manifestation_feedback
          ? String(r.epic_manifestation_feedback)
          : null,
        epicManifestationReviewedByUserId: r.epic_manifestation_reviewed_by_user_id
          ? String(r.epic_manifestation_reviewed_by_user_id)
          : null,
        epicManifestationReviewedAt: r.epic_manifestation_reviewed_at
          ? date(r.epic_manifestation_reviewed_at)
          : null,
      })) as CharacterProgressionRequest[];
    },
    async progression(
      userId: string,
      id: string,
      action:
        | "request"
        | "enable"
        | "start"
        | "apply"
        | "reject"
        | "approve_epic"
        | "provisionally_approve_epic"
        | "return_epic"
        | "reject_epic",
      expectedVersion?: number,
      targetSnapshot?: CharacterSnapshot,
      feedback = "",
    ) {
      return tx(sql, async () => {
        const rows = await sql.query<CharacterRow>(`${select} WHERE id=$1 FOR UPDATE`, [id]);
        const c = rows[0] ? mapCharacter(rows[0]) : null;
        if (!c) throw new Error("character_not_found");
        const reviewer = await canReviewCharacter(sql, userId, c.id);
        const trail = (Array.isArray(c.snapshot.trilhas) ? c.snapshot.trilhas : [])[
          Number(c.snapshot.trilhaAtiva) || 0
        ] as Record<string, unknown> | undefined;
        const trailId = String(trail?.id || "");
        const from = Number(trail?.marco || 1);
        if (!trailId || from < 1 || from >= 15) throw new Error("progression_unavailable");
        const existing = await sql.query<CharacterRow>(
          `SELECT * FROM public.character_progression_requests WHERE character_id=$1 AND trail_id=$2 AND status IN ('requested','authorized','in_progress') FOR UPDATE`,
          [id, trailId],
        );
        if (
          action === "request" &&
          c.ownerUserId === userId &&
          c.status === "approved" &&
          !existing[0]
        ) {
          if (from >= 10) {
            if (!targetSnapshot) throw new Error("progression_proposal_required");
            const nextTrail = (Array.isArray(targetSnapshot.trilhas) ? targetSnapshot.trilhas : [])[
              Number(targetSnapshot.trilhaAtiva) || 0
            ] as Record<string, unknown> | undefined;
            if (Number(nextTrail?.marco) !== from + 1 || String(nextTrail?.id || "") !== trailId)
              throw new Error("progression_proposal_invalid");
            if (!validateCharacterSnapshot(targetSnapshot, true).ok)
              throw new Error("progression_proposal_invalid");
            if (!validateProgressionSnapshot(c.snapshot, targetSnapshot, trailId, from + 1).ok)
              throw new Error("progression_proposal_invalid");
            if (!progressionComplete(targetSnapshot, from + 1))
              throw new Error("progression_proposal_invalid");
            const proposal = epicManifestation(targetSnapshot);
            if (
              !proposal ||
              String(proposal.statusHomologacao) !== "EM_ANALISE" ||
              proposal.mechanicallyActive !== false
            )
              throw new Error("progression_proposal_invalid");
            if (String(proposal.horizonte).toUpperCase() !== epicHorizonForMarco(from + 1))
              throw new Error("progression_proposal_invalid");
          }
          const out = await sql.query<CharacterRow>(
            `INSERT INTO public.character_progression_requests (character_id,trail_id,from_marco,to_marco,status,requested_by_user_id,proposed_snapshot,epic_manifestation_status) VALUES ($1,$2,$3,$3+1,'requested',$4,$5::jsonb,$6) RETURNING *`,
            [
              id,
              trailId,
              from,
              userId,
              from >= 10 ? targetSnapshot : null,
              from >= 10 ? "EM_ANALISE" : null,
            ],
          );
          await sql.query(
            `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,$3,$4::jsonb,$5,$5)`,
            [
              id,
              userId,
              from >= 10 ? "epic_manifestation_submitted" : "progression_requested",
              {
                trailId,
                fromMarco: from,
                toMarco: from + 1,
                status: from >= 10 ? "EM_ANALISE" : undefined,
              },
              c.version,
            ],
          );
          return out[0];
        }
        if (
          ["approve_epic", "provisionally_approve_epic", "return_epic", "reject_epic"].includes(
            action,
          )
        ) {
          if (!reviewer || c.status !== "approved" || !existing[0]?.proposed_snapshot)
            throw new Error("invalid_progression_transition");
          const proposal = json(existing[0].proposed_snapshot);
          if (from < 10 || !epicManifestation(proposal))
            throw new Error("epic_manifestation_review_invalid");
          if (["return_epic", "reject_epic"].includes(action) && !feedback.trim())
            throw new Error("epic_feedback_required");
          const status: EpicManifestationStatus =
            action === "approve_epic"
              ? "HOMOLOGADA"
              : action === "provisionally_approve_epic"
                ? "HOMOLOGADA_PROVISORIAMENTE"
                : action === "return_epic"
                  ? "DEVOLVIDA_PARA_AJUSTE"
                  : "NAO_HOMOLOGADA";
          const reviewed = reviewSnapshot(proposal, status, feedback.trim());
          const technicalStatus = ["approve_epic", "provisionally_approve_epic"].includes(action)
            ? "authorized"
            : "rejected";
          await sql.query(
            `UPDATE public.character_progression_requests SET status=$2,authorized_by_user_id=CASE WHEN $2='authorized' THEN $3 ELSE authorized_by_user_id END,authorized_at=CASE WHEN $2='authorized' THEN now() ELSE authorized_at END,epic_manifestation_status=$4,epic_manifestation_feedback=$5,epic_manifestation_reviewed_by_user_id=$3,epic_manifestation_reviewed_at=now(),proposed_snapshot=$6::jsonb WHERE id=$1`,
            [existing[0].id, technicalStatus, userId, status, feedback.trim() || null, reviewed],
          );
          await sql.query(
            `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,$3,$4::jsonb,$5,$5)`,
            [
              id,
              userId,
              action === "approve_epic"
                ? "epic_manifestation_approved"
                : action === "provisionally_approve_epic"
                  ? "epic_manifestation_provisionally_approved"
                  : action === "return_epic"
                    ? "epic_manifestation_returned"
                    : "epic_manifestation_rejected",
              { trailId, status, feedback: feedback.trim() || null },
              c.version,
            ],
          );
        } else if (action === "enable" && reviewer && c.status === "approved" && existing[0]) {
          if (existing[0].proposed_snapshot) throw new Error("epic_review_required");
          await sql.query(
            `UPDATE public.character_progression_requests SET status='authorized',authorized_by_user_id=$2,authorized_at=now() WHERE id=$1`,
            [existing[0].id, userId],
          );
          await sql.query(
            `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'progression_enabled',$3::jsonb,$4,$4)`,
            [id, userId, { trailId }, c.version],
          );
        } else if (
          action === "start" &&
          c.ownerUserId === userId &&
          existing[0]?.status === "authorized"
        ) {
          if (
            existing[0].proposed_snapshot &&
            !["HOMOLOGADA", "HOMOLOGADA_PROVISORIAMENTE"].includes(
              String(existing[0].epic_manifestation_status),
            )
          )
            throw new Error("epic_review_required");
          await sql.query(
            `UPDATE public.character_progression_requests SET status='in_progress',started_at=now() WHERE id=$1`,
            [existing[0].id],
          );
          await sql.query(
            `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'progression_started',$3::jsonb,$4,$4)`,
            [id, userId, { trailId, fromMarco: from, toMarco: from + 1 }, c.version],
          );
        } else if (
          action === "apply" &&
          c.ownerUserId === userId &&
          existing[0] &&
          ["authorized", "in_progress"].includes(String(existing[0].status))
        ) {
          if (c.version !== expectedVersion) throw new Error("stale_character_version");
          if (!targetSnapshot) throw new Error("snapshot_required");
          if (
            from >= 10 &&
            (!existing[0].proposed_snapshot ||
              !snapshotsEqual(targetSnapshot, json(existing[0].proposed_snapshot)))
          )
            throw new Error("progression_proposal_mismatch");
          const storedProposal = from >= 10 ? json(existing[0].proposed_snapshot) : null;
          if (
            from >= 10 &&
            !["HOMOLOGADA", "HOMOLOGADA_PROVISORIAMENTE"].includes(
              String(existing[0].epic_manifestation_status),
            )
          )
            throw new Error("epic_review_required");
          const effectiveSnapshot =
            from >= 10
              ? activateReviewedSnapshot(storedProposal as CharacterSnapshot)
              : targetSnapshot;
          const nextTrail = (Array.isArray(targetSnapshot.trilhas) ? targetSnapshot.trilhas : [])[
            Number(targetSnapshot.trilhaAtiva) || 0
          ] as Record<string, unknown> | undefined;
          if (Number(nextTrail?.marco) !== from + 1) throw new Error("progression_target_invalid");
          const validation = validateCharacterSnapshot(effectiveSnapshot, true);
          if (!validation.ok) throw new Error("progression_target_invalid");
          if (String(nextTrail?.id || "") !== trailId)
            throw new Error("progression_target_invalid");
          if (!validateProgressionSnapshot(c.snapshot, effectiveSnapshot, trailId, from + 1).ok)
            throw new Error("progression_patch_invalid");
          if (!progressionComplete(effectiveSnapshot, from + 1))
            throw new Error("progression_gain_missing");
          const fp = mechanicalFingerprint(effectiveSnapshot);
          await sql.query(
            `UPDATE public.characters SET snapshot=$3::jsonb,version=version+1,mechanical_fingerprint=$4,updated_at=now() WHERE id=$1 AND owner_user_id=$2`,
            [id, userId, effectiveSnapshot, fp],
          );
          await sql.query(
            `INSERT INTO public.character_versions (character_id,version,snapshot,reason,actor_user_id) VALUES ($1,$2,$3::jsonb,'progression',$4)`,
            [id, c.version + 1, effectiveSnapshot, userId],
          );
          await sql.query(
            `UPDATE public.character_progression_requests SET status='applied',applied_by_user_id=$2,applied_at=now() WHERE id=$1`,
            [existing[0].id, userId],
          );
          await sql.query(
            `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'progression_applied',$3::jsonb,$4,$5)`,
            [id, userId, { trailId, fromMarco: from, toMarco: from + 1 }, c.version, c.version + 1],
          );
        } else if (action === "reject" && reviewer && existing[0]) {
          await sql.query(
            `UPDATE public.character_progression_requests SET status='rejected' WHERE id=$1`,
            [existing[0].id],
          );
          await sql.query(
            `INSERT INTO public.character_events (character_id,actor_user_id,event_type,payload,version_before,version_after) VALUES ($1,$2,'progression_rejected','{}'::jsonb,$3,$3)`,
            [id, userId, c.version],
          );
        } else throw new Error("invalid_progression_transition");
        const final = await sql.query<CharacterRow>(`${select} WHERE id=$1`, [id]);
        return mapCharacter(final[0]);
      });
    },
  };
}
