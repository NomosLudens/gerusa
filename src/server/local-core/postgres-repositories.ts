import type { PlayerExperience } from "../../lib/identity-routing";
import type { LocalAuthRepository, LocalUser, StoredCredential } from "./auth-service";
import type {
  Campaign,
  CampaignMesa,
  CampaignRepository,
  ChatScope,
  ChatResponseMode,
  ChatMessage,
  ChatRepository,
  ChatThread,
  GardenMemory,
  MemoryCandidate,
  MemoryRepository,
  MutationRepository,
  PendingCharacterBiographyMutation,
  PendingCharacterCreateMutation,
  PendingCharacterMutation,
  SedimentationRepository,
  Sediment,
  SedimentInput,
} from "./data-contracts";
import { chatScopeMarker } from "./data-contracts";
import type { SqlExecutor } from "./postgres";
import type { LocalSession } from "./sessions";
import { isSystemMaster } from "./player-access";

const pgArray = (values: unknown) =>
  `{${(Array.isArray(values) ? values : [])
    .map((value) => `"${String(value).replaceAll('"', '\\"')}"`)
    .join(",")}}`;

export type AgendaScope = "PRIVATE" | "MESA" | "GLOBAL" | "PLAYER";
export type AgendaEventRecord = {
  id: string;
  created_by: string;
  scope_type: AgendaScope;
  mesa_id: string | null;
  target_user_id: string | null;
  titulo: string;
  descricao: string | null;
  tipo: string;
  inicio: string;
  fim: string | null;
  local: string | null;
  source_type: string | null;
  source_ref: string | null;
};
export type AgendaEventContent = Pick<
  AgendaEventRecord,
  "titulo" | "descricao" | "tipo" | "inicio" | "fim" | "local"
>;
export type AgendaEventInput = AgendaEventContent & {
  scope_type: AgendaScope;
  mesa_id: string | null;
  target_user_id: string | null;
  source_type: string | null;
  source_ref: string | null;
};
export type AgendaMesaOption = { id: string; name: string };
export type AgendaPlayerOption = {
  id: string;
  display_name: string | null;
  mesa_id: string;
  mesa_name: string;
};
export type AgendaContext = {
  canCreateMesa: boolean;
  canCreatePlayer: boolean;
  canCreateGlobal: boolean;
  mesas: AgendaMesaOption[];
  players: AgendaPlayerOption[];
};
const agendaColumns =
  "id, created_by, scope_type, mesa_id, target_user_id, titulo, descricao, tipo, inicio, fim, local, source_type, source_ref";

async function agendaMesaExists(sql: SqlExecutor, mesaId: string) {
  return (await sql.query("SELECT 1 FROM public.mesas WHERE id=$1 LIMIT 1", [mesaId])).length > 0;
}

async function agendaIsMesaMaster(sql: SqlExecutor, userId: string, mesaId: string) {
  return (
    (
      await sql.query(
        "SELECT 1 FROM public.mesa_members WHERE user_id=$1 AND mesa_id=$2 AND member_role='mestre' AND membership_status='active' LIMIT 1",
        [userId, mesaId],
      )
    ).length > 0
  );
}

async function agendaIsActivePlayer(sql: SqlExecutor, userId: string, mesaId: string) {
  return (
    (
      await sql.query(
        "SELECT 1 FROM public.users u JOIN public.mesa_members mm ON mm.user_id=u.id WHERE u.id=$1 AND u.status='active' AND mm.mesa_id=$2 AND mm.member_role='jogador' AND mm.membership_status='active' LIMIT 1",
        [userId, mesaId],
      )
    ).length > 0
  );
}

async function assertAgendaCreateAuthorized(
  sql: SqlExecutor,
  userId: string,
  input: AgendaEventInput,
) {
  if (input.scope_type === "PRIVATE") {
    if (input.mesa_id !== null || input.target_user_id !== null)
      throw new Error("agenda_private_scope_incoherent");
    return;
  }

  if (input.scope_type === "GLOBAL") {
    if (input.mesa_id !== null || input.target_user_id !== null)
      throw new Error("agenda_global_scope_incoherent");
    if (!(await isSystemMaster(sql, userId)))
      throw new Error("agenda_global_creation_not_authorized");
    return;
  }

  if (!input.mesa_id || !isUuid(input.mesa_id) || !(await agendaMesaExists(sql, input.mesa_id)))
    throw new Error("agenda_mesa_not_found");

  if (
    !(await isSystemMaster(sql, userId)) &&
    !(await agendaIsMesaMaster(sql, userId, input.mesa_id))
  )
    throw new Error("agenda_mesa_creation_not_authorized");

  if (input.scope_type === "MESA") {
    if (input.target_user_id !== null) throw new Error("agenda_mesa_scope_incoherent");
    return;
  }

  if (!input.target_user_id || !isUuid(input.target_user_id))
    throw new Error("agenda_player_target_required");
  if (!(await agendaIsActivePlayer(sql, input.target_user_id, input.mesa_id)))
    throw new Error("agenda_player_target_not_authorized");
  if (input.target_user_id === userId) throw new Error("agenda_player_target_must_be_player");
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function createAgendaRepository(sql: SqlExecutor) {
  return {
    async listVisibleAgendaEvents(userId: string, inicio: string, fim: string) {
      return [
        ...(await sql.query<AgendaEventRecord>(
          "SELECT " +
            agendaColumns +
            " FROM public.agenda_events e WHERE e.inicio >= $1 AND e.inicio < $2 AND (" +
            "e.scope_type = 'GLOBAL' " +
            "OR (e.scope_type = 'PRIVATE' AND e.created_by = $3) " +
            "OR (e.scope_type = 'MESA' AND (EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=$3 AND sr.system_role='system_master') OR EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.user_id=$3 AND mm.mesa_id::text=e.mesa_id AND mm.membership_status='active'))) " +
            "OR (e.scope_type = 'PLAYER' AND (EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=$3 AND sr.system_role='system_master') OR EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.user_id=$3 AND mm.mesa_id::text=e.mesa_id AND mm.membership_status='active' AND (mm.member_role='mestre' OR e.target_user_id=$3))))) " +
            "ORDER BY e.inicio ASC, e.id ASC",
          [inicio, fim, userId],
        )),
      ];
    },

    async listAgendaContext(userId: string): Promise<AgendaContext> {
      const global = await isSystemMaster(sql, userId);
      const mesas = await sql.query<AgendaMesaOption>(
        global
          ? "SELECT id::text AS id,name FROM public.mesas ORDER BY name,id"
          : "SELECT m.id::text AS id,m.name FROM public.mesas m JOIN public.mesa_members mm ON mm.mesa_id=m.id WHERE mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active' ORDER BY m.name,m.id",
        global ? [] : [userId],
      );
      const players = await sql.query<AgendaPlayerOption>(
        global
          ? "SELECT DISTINCT u.id::text AS id,p.display_name,mm.mesa_id::text AS mesa_id,m.name AS mesa_name FROM public.users u JOIN public.profiles p ON p.id=u.id JOIN public.mesa_members mm ON mm.user_id=u.id AND mm.member_role='jogador' AND mm.membership_status='active' JOIN public.mesas m ON m.id=mm.mesa_id WHERE u.status='active' ORDER BY p.display_name NULLS LAST,mm.mesa_id::text"
          : "SELECT DISTINCT u.id::text AS id,p.display_name,mm.mesa_id::text AS mesa_id,m.name AS mesa_name FROM public.users u JOIN public.profiles p ON p.id=u.id JOIN public.mesa_members mm ON mm.user_id=u.id AND mm.member_role='jogador' AND mm.membership_status='active' JOIN public.mesas m ON m.id=mm.mesa_id JOIN public.mesa_members admin ON admin.mesa_id=mm.mesa_id AND admin.user_id=$1 AND admin.member_role='mestre' AND admin.membership_status='active' WHERE u.status='active' ORDER BY p.display_name NULLS LAST,mm.mesa_id::text",
        global ? [] : [userId],
      );
      return {
        canCreateMesa: mesas.length > 0,
        canCreatePlayer: players.length > 0,
        canCreateGlobal: global,
        mesas: [...mesas],
        players: [...players],
      };
    },

    async createAgendaEvent(userId: string, input: AgendaEventInput) {
      const save = async (tx: SqlExecutor) => {
        await assertAgendaCreateAuthorized(tx, userId, input);
        const targetUserId = input.scope_type === "PRIVATE" ? userId : input.target_user_id;
        const rows = await tx.query<AgendaEventRecord>(
          "INSERT INTO public.agenda_events (created_by, scope_type, mesa_id, target_user_id, titulo, descricao, tipo, inicio, fim, local, source_type, source_ref) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING " +
            agendaColumns,
          [
            userId,
            input.scope_type,
            input.scope_type === "GLOBAL" || input.scope_type === "PRIVATE" ? null : input.mesa_id,
            targetUserId,
            input.titulo,
            input.descricao,
            input.tipo,
            input.inicio,
            input.fim,
            input.local,
            input.source_type,
            input.source_ref,
          ],
        );
        if (!rows[0]) throw new Error("agenda_event_not_persisted");
        return rows[0];
      };
      return sql.transaction ? sql.transaction(save) : save(sql);
    },

    async updateAgendaEvent(userId: string, id: string, input: AgendaEventContent) {
      const rows = await sql.query<AgendaEventRecord>(
        "UPDATE public.agenda_events SET titulo=$3, descricao=$4, tipo=$5, inicio=$6, fim=$7, local=$8, updated_at=now() WHERE id=$1 AND (" +
          "(scope_type='PRIVATE' AND created_by=$2) " +
          "OR (scope_type IN ('MESA','PLAYER') AND (EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=$2 AND sr.system_role='system_master') OR EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.user_id=$2 AND mm.member_role='mestre' AND mm.membership_status='active' AND mm.mesa_id::text=agenda_events.mesa_id))) " +
          "OR (scope_type='GLOBAL' AND EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=$2 AND sr.system_role='system_master'))) RETURNING " +
          agendaColumns,
        [
          id,
          userId,
          input.titulo,
          input.descricao,
          input.tipo,
          input.inicio,
          input.fim,
          input.local,
        ],
      );
      if (!rows[0]) throw new Error("agenda_event_not_found_or_forbidden");
      return rows[0];
    },

    async deleteAgendaEvent(userId: string, id: string) {
      await sql.query(
        "DELETE FROM public.agenda_events WHERE id=$1 AND (" +
          "(scope_type='PRIVATE' AND created_by=$2) " +
          "OR (scope_type IN ('MESA','PLAYER') AND (EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=$2 AND sr.system_role='system_master') OR EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.user_id=$2 AND mm.member_role='mestre' AND mm.membership_status='active' AND mm.mesa_id::text=agenda_events.mesa_id))) " +
          "OR (scope_type='GLOBAL' AND EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id=$2 AND sr.system_role='system_master')))",
        [id, userId],
      );
    },
  };
}

type CredentialRow = {
  user_id: string;
  user_status: "active" | "disabled";
  credential_hash: string;
  credential_lookup_digest: string;
  credential_revoked_at: string | null;
};

type SessionRow = {
  id: string;
  user_id: string;
  token_digest: string;
  created_at: string;
  expires_at: string;
  last_seen_at: string;
  revoked_at: string | null;
};

type AuthenticatedSessionRow = SessionRow & {
  user_status: LocalUser["status"];
};

function date(value: string): Date {
  return new Date(value);
}

function mapSession(row: SessionRow): LocalSession {
  return {
    id: row.id,
    userId: row.user_id,
    tokenDigest: row.token_digest,
    createdAt: date(row.created_at),
    expiresAt: date(row.expires_at),
    lastSeenAt: date(row.last_seen_at),
    revokedAt: row.revoked_at ? date(row.revoked_at) : null,
  };
}

export function createPostgresAuthRepository(sql: SqlExecutor): LocalAuthRepository {
  return {
    async findCredentialByLookupDigest(digest) {
      const rows = await sql.query<CredentialRow>(
        `SELECT c.user_id, u.status AS user_status, c.credential_hash,
                c.credential_lookup_digest, c.revoked_at AS credential_revoked_at
           FROM credentials c
           JOIN users u ON u.id = c.user_id
          WHERE c.credential_lookup_digest = $1
          LIMIT 1`,
        [digest],
      );
      const row = rows[0];
      if (!row) return null;
      const stored: StoredCredential = {
        user: { id: row.user_id, status: row.user_status },
        credentialHash: row.credential_hash,
        lookupDigest: row.credential_lookup_digest,
        revokedAt: row.credential_revoked_at ? date(row.credential_revoked_at) : null,
      };
      return stored;
    },
    async insertSession(value) {
      await sql.query(
        `INSERT INTO sessions (id, user_id, token_digest, created_at, expires_at, last_seen_at, revoked_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          value.id,
          value.userId,
          value.tokenDigest,
          value.createdAt,
          value.expiresAt,
          value.lastSeenAt,
          value.revokedAt,
        ],
      );
    },
    async findAndTouchActiveSessionByTokenDigest(digest, now) {
      const rows = await sql.query<AuthenticatedSessionRow>(
        `UPDATE sessions s
            SET last_seen_at = $2
           FROM users u
          WHERE s.user_id = u.id
            AND s.token_digest = $1
            AND s.revoked_at IS NULL
            AND s.expires_at > $2
            AND s.last_seen_at > $2 - interval '7 days'
            AND u.status = 'active'
       RETURNING s.id, s.user_id, s.token_digest, s.created_at, s.expires_at,
                 s.last_seen_at, s.revoked_at, u.status AS user_status`,
        [digest, now],
      );
      const row = rows[0];
      if (!row || row.user_status !== "active") return null;
      return { user: { id: row.user_id, status: row.user_status }, session: mapSession(row) };
    },
    async revokeSession(id, revokedAt) {
      await sql.query("UPDATE sessions SET revoked_at = $2 WHERE id = $1 AND revoked_at IS NULL", [
        id,
        revokedAt,
      ]);
    },
  };
}

export type ProfileRecord = {
  id: string;
  display_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  gender: "feminino" | "masculino" | "neutro" | null;
  created_at: string;
  updated_at: string;
};

export type ProfileInput = {
  display_name: string | null;
  pronouns: string | null;
  avatar_url: string | null;
  gender: "feminino" | "masculino" | "neutro" | null;
};

export type ProfileAvatarRecord = {
  data: Uint8Array;
  mime_type: "image/png" | "image/jpeg" | "image/webp";
  size: number;
};

export async function getProfileForUser(
  sql: SqlExecutor,
  userId: string,
): Promise<ProfileRecord | null> {
  const rows = await sql.query<ProfileRecord>(
    `SELECT id, display_name, pronouns, avatar_url, gender, created_at, updated_at
       FROM public.profiles
      WHERE id = $1
      LIMIT 1`,
    [userId],
  );
  return rows[0] ?? null;
}

export async function upsertProfileForUser(
  sql: SqlExecutor,
  userId: string,
  input: ProfileInput,
): Promise<ProfileRecord> {
  const rows = await sql.query<ProfileRecord>(
    `INSERT INTO public.profiles (id, display_name, pronouns, avatar_url, gender)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE SET
       display_name = EXCLUDED.display_name,
       pronouns = EXCLUDED.pronouns,
       avatar_url = EXCLUDED.avatar_url,
       gender = EXCLUDED.gender,
       updated_at = now()
     RETURNING id, display_name, pronouns, avatar_url, gender, created_at, updated_at`,
    [userId, input.display_name, input.pronouns, input.avatar_url, input.gender],
  );
  if (!rows[0]) throw new Error("profile_not_persisted");
  return rows[0];
}

export async function getProfileAvatarForUser(
  sql: SqlExecutor,
  userId: string,
): Promise<ProfileAvatarRecord | null> {
  const rows = await sql.query<{
    avatar_data: Uint8Array | null;
    avatar_mime_type: ProfileAvatarRecord["mime_type"] | null;
    avatar_size: number | null;
  }>(
    `SELECT avatar_data, avatar_mime_type, avatar_size
       FROM public.profiles
      WHERE id = $1 AND avatar_data IS NOT NULL
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  if (!row?.avatar_data || !row.avatar_mime_type || !row.avatar_size) return null;
  return { data: row.avatar_data, mime_type: row.avatar_mime_type, size: Number(row.avatar_size) };
}

export async function saveProfileAvatarForUser(
  sql: SqlExecutor,
  userId: string,
  avatar: ProfileAvatarRecord,
): Promise<ProfileRecord> {
  const rows = await sql.query<ProfileRecord>(
    `INSERT INTO public.profiles (id, avatar_url, avatar_data, avatar_mime_type, avatar_size)
     VALUES ($1, '/api/profile/avatar', $2, $3, $4)
     ON CONFLICT (id) DO UPDATE SET
       avatar_url = EXCLUDED.avatar_url,
       avatar_data = EXCLUDED.avatar_data,
       avatar_mime_type = EXCLUDED.avatar_mime_type,
       avatar_size = EXCLUDED.avatar_size,
       updated_at = now()
     RETURNING id, display_name, avatar_url, gender, created_at, updated_at`,
    [userId, avatar.data, avatar.mime_type, avatar.size],
  );
  if (!rows[0]) throw new Error("profile_avatar_not_persisted");
  return rows[0];
}

export async function removeProfileAvatarForUser(sql: SqlExecutor, userId: string): Promise<void> {
  await sql.query(
    `UPDATE public.profiles
        SET avatar_url = NULL, avatar_data = NULL, avatar_mime_type = NULL, avatar_size = NULL, updated_at = now()
      WHERE id = $1`,
    [userId],
  );
}

export type MesaRecord = { id: string; slug: string; name: string };
export type MesaMembershipRecord = MesaRecord & {
  member_role: "mestre" | "jogador";
  membership_status: "active" | "invited" | "left";
};
export type HermesIdentityRecord = {
  profile: Pick<ProfileRecord, "id" | "display_name" | "pronouns"> | null;
  systemRole: string | null;
  activeMembershipCount: number;
  mesa: MesaMembershipRecord | null;
};

type HermesIdentityRow = {
  profile_id: string | null;
  display_name: string | null;
  pronouns: string | null;
  system_role: string | null;
  mesa_id: string | null;
  mesa_slug: string | null;
  mesa_name: string | null;
  member_role: MesaMembershipRecord["member_role"] | null;
  membership_status: MesaMembershipRecord["membership_status"] | null;
};

export async function getHermesIdentityForUser(
  sql: SqlExecutor,
  userId: string,
): Promise<HermesIdentityRecord> {
  const rows = await sql.query<HermesIdentityRow>(
    `SELECT p.id AS profile_id, p.display_name, p.pronouns, sr.system_role,
            mm.mesa_id, m.slug AS mesa_slug, m.name AS mesa_name,
            mm.member_role, mm.membership_status
       FROM public.users u
       LEFT JOIN public.profiles p ON p.id = u.id
       LEFT JOIN public.system_roles sr ON sr.user_id = u.id
       LEFT JOIN public.mesa_members mm
         ON mm.user_id = u.id AND mm.membership_status = 'active'
       LEFT JOIN public.mesas m ON m.id = mm.mesa_id
      WHERE u.id = $1
      ORDER BY m.name ASC, m.id ASC`,
    [userId],
  );
  const row = rows[0];
  const activeMemberships = rows
    .filter(
      (candidate) =>
        candidate.mesa_id &&
        candidate.mesa_slug &&
        candidate.mesa_name &&
        candidate.member_role &&
        candidate.membership_status,
    )
    .map((candidate) => ({
      id: candidate.mesa_id!,
      slug: candidate.mesa_slug!,
      name: candidate.mesa_name!,
      member_role: candidate.member_role!,
      membership_status: candidate.membership_status!,
    }));

  return {
    profile: row?.profile_id
      ? {
          id: row.profile_id,
          display_name: row.display_name ?? null,
          pronouns: row.pronouns?.trim() || null,
        }
      : null,
    systemRole: row?.system_role ?? null,
    activeMembershipCount: activeMemberships.length,
    mesa: activeMemberships.length === 1 ? activeMemberships[0] : null,
  };
}

export type OnboardingRecord = {
  treatment_type:
    | "ele_dele"
    | "ela_dela"
    | "elu_delu"
    | "use_name"
    | "not_informed"
    | "other"
    | null;
  treatment_custom: string | null;
  general_community: boolean;
  onboarding_completed: boolean;
  mesa: MesaMembershipRecord | null;
};

type OnboardingRow = OnboardingRecord & {
  mesa_id: string | null;
  mesa_slug: string | null;
  mesa_name: string | null;
  member_role: "mestre" | "jogador" | null;
  membership_status: "active" | "invited" | "left" | null;
};
export async function getOnboardingForUser(
  sql: SqlExecutor,
  userId: string,
): Promise<OnboardingRecord> {
  const rows = await sql.query<OnboardingRow>(
    `SELECT p.treatment_type, p.treatment_custom, p.onboarding_completed,
            COALESCE(pref.general_community, false) AS general_community,
            m.id AS mesa_id, m.slug AS mesa_slug, m.name AS mesa_name,
            mm.member_role, mm.membership_status
       FROM public.profiles p
       LEFT JOIN public.user_preferences pref ON pref.user_id = p.id
       LEFT JOIN public.mesa_members mm ON mm.user_id = p.id AND mm.membership_status = 'active'
       LEFT JOIN public.mesas m ON m.id = mm.mesa_id
      WHERE p.id = $1
      LIMIT 1`,
    [userId],
  );
  const row = rows[0];
  return {
    treatment_type: row?.treatment_type ?? null,
    treatment_custom: row?.treatment_custom ?? null,
    general_community: row?.general_community ?? false,
    onboarding_completed: row?.onboarding_completed ?? false,
    mesa:
      row?.mesa_id && row.mesa_slug && row.mesa_name && row.member_role && row.membership_status
        ? {
            id: row.mesa_id,
            slug: row.mesa_slug,
            name: row.mesa_name,
            member_role: row.member_role,
            membership_status: row.membership_status,
          }
        : null,
  };
}

export async function listMesas(sql: SqlExecutor): Promise<MesaRecord[]> {
  return [
    ...(await sql.query<MesaRecord>(`SELECT id, slug, name FROM public.mesas ORDER BY name ASC`)),
  ];
}

export async function saveOnboardingForUser(
  sql: SqlExecutor,
  userId: string,
  input: {
    mesa_slug: string | null;
    treatment_type: OnboardingRecord["treatment_type"];
    treatment_custom: string | null;
    general_community: boolean;
  },
): Promise<OnboardingRecord> {
  if (input.treatment_type === "other" && !input.treatment_custom?.trim())
    throw new Error("treatment_custom_required");
  if (input.treatment_type !== "other" && input.treatment_custom)
    throw new Error("treatment_custom_not_allowed");
  const save = async (tx: SqlExecutor) => {
    await tx.query(
      `INSERT INTO public.profiles (id, treatment_type, treatment_custom, onboarding_completed) VALUES ($1, $2, $3, true) ON CONFLICT (id) DO UPDATE SET treatment_type = EXCLUDED.treatment_type, treatment_custom = EXCLUDED.treatment_custom, onboarding_completed = true, updated_at = now()`,
      [userId, input.treatment_type, input.treatment_custom],
    );
    await tx.query(
      `INSERT INTO public.user_preferences (user_id, general_community) VALUES ($1, $2) ON CONFLICT (user_id) DO UPDATE SET general_community = EXCLUDED.general_community, updated_at = now()`,
      [userId, input.general_community],
    );
  };
  if (sql.transaction) await sql.transaction(save);
  else await save(sql);
  return getOnboardingForUser(sql, userId);
}

export type ContextoRecord = {
  id: string;
  titulo: string;
  conteudo: string;
  tipo: "identidade" | "memoria_relacional";
  ativo: boolean;
  created_at: string;
  updated_at: string;
  mesa_id: string | null;
  campaign_id: string | null;
  mesa_name: string | null;
  campaign_name: string | null;
};
export type ActiveContextoRecord = Pick<
  ContextoRecord,
  "id" | "titulo" | "conteudo" | "tipo" | "mesa_id" | "campaign_id"
>;
export type ContextoScope = { mesaId: string | null; campaignId: string | null };
export type ContextoMesaOption = { id: string; name: string };

const globalContextScope: ContextoScope = { mesaId: null, campaignId: null };
export async function listContextos(sql: SqlExecutor, userId: string): Promise<ContextoRecord[]> {
  const rows = await sql.query<ContextoRecord>(
    `SELECT ce.id, ce.titulo, ce.conteudo, ce.tipo, ce.ativo, ce.created_at, ce.updated_at,
            ce.mesa_id, ce.campaign_id, m.name AS mesa_name, c.name AS campaign_name
       FROM public.contexto_externo ce
       LEFT JOIN public.mesas m ON m.id = ce.mesa_id
       LEFT JOIN public.campaigns c ON c.id = ce.campaign_id
      WHERE ce.user_id = $1
      ORDER BY ce.updated_at DESC, ce.id ASC`,
    [userId],
  );
  return [...rows];
}
export async function createContexto(
  sql: SqlExecutor,
  userId: string,
  titulo: string,
  conteudo: string,
  scope: ContextoScope = globalContextScope,
): Promise<{ id: string }> {
  if (scope.mesaId && scope.campaignId) throw new Error("context_scope_invalid");
  const rows = await sql.query<{ id: string }>(
    `INSERT INTO public.contexto_externo (user_id, titulo, conteudo, mesa_id, campaign_id)
     SELECT $1, $2, $3, $4, $5
      WHERE ($4::uuid IS NULL AND $5::uuid IS NULL)
         OR ($4::uuid IS NOT NULL AND $5::uuid IS NULL AND EXISTS (
              SELECT 1 FROM public.mesa_members mm
               WHERE mm.user_id = $1 AND mm.mesa_id = $4 AND mm.membership_status = 'active'
            ))
         OR ($4::uuid IS NULL AND $5::uuid IS NOT NULL AND EXISTS (
              SELECT 1
                FROM public.campaigns c
                JOIN public.mesa_members mm ON mm.mesa_id = c.mesa_id
               WHERE c.id = $5 AND c.status = 'active'
                 AND mm.user_id = $1 AND mm.membership_status = 'active'
            ))
     RETURNING id`,
    [userId, titulo, conteudo, scope.mesaId, scope.campaignId],
  );
  if (!rows[0]?.id) throw new Error("context_scope_not_authorized");
  return rows[0];
}
export async function toggleContexto(
  sql: SqlExecutor,
  userId: string,
  id: string,
  ativo: boolean,
): Promise<void> {
  await sql.query(
    `UPDATE public.contexto_externo SET ativo = $3, updated_at = now() WHERE id = $1 AND user_id = $2`,
    [id, userId, ativo],
  );
}
export async function deleteContexto(sql: SqlExecutor, userId: string, id: string): Promise<void> {
  await sql.query("DELETE FROM public.contexto_externo WHERE id = $1 AND user_id = $2", [
    id,
    userId,
  ]);
}
export async function listActiveContextos(
  sql: SqlExecutor,
  userId: string,
  scope: ContextoScope = globalContextScope,
): Promise<ActiveContextoRecord[]> {
  const rows = await sql.query<ActiveContextoRecord>(
    `SELECT ce.id, ce.titulo, ce.conteudo, ce.tipo, ce.mesa_id, ce.campaign_id
       FROM public.contexto_externo ce
      WHERE ce.user_id = $1
        AND ce.ativo = true
        AND (
          (ce.mesa_id IS NULL AND ce.campaign_id IS NULL)
          OR ($2::uuid IS NOT NULL AND ce.mesa_id = $2 AND ce.campaign_id IS NULL)
          OR ($3::uuid IS NOT NULL AND ce.campaign_id = $3 AND ce.mesa_id IS NULL)
        )
      ORDER BY CASE
        WHEN ce.tipo = 'identidade' AND ce.mesa_id IS NULL AND ce.campaign_id IS NULL THEN -1
        WHEN $3::uuid IS NOT NULL AND ce.campaign_id = $3 THEN 0
        WHEN $2::uuid IS NOT NULL AND ce.mesa_id = $2 THEN 1
        ELSE 2
      END, ce.updated_at DESC, ce.id ASC
      LIMIT 10`,
    [userId, scope.mesaId, scope.campaignId],
  );
  return [...rows];
}

export async function listAuthorizedContextoMesas(
  sql: SqlExecutor,
  userId: string,
): Promise<ContextoMesaOption[]> {
  const rows = await sql.query<ContextoMesaOption>(
    `SELECT m.id, m.name
       FROM public.mesas m
       JOIN public.mesa_members mm ON mm.mesa_id = m.id
      WHERE mm.user_id = $1 AND mm.membership_status = 'active'
      ORDER BY m.name ASC, m.id ASC`,
    [userId],
  );
  return [...rows];
}

type ChatThreadRow = {
  id: string;
  user_id: string;
  surface: string;
  facet: string;
  title: string | null;
  created_at: string;
  last_sedimentado_at: string | null;
  campaign_id: string | null;
  campaign_name: string | null;
  campaign_mesa_id: string | null;
  response_mode: ChatResponseMode;
  roleplay_target_id: string | null;
  player_experience: PlayerExperience | null;
  active_character_id: string | null;
};

type ChatMessageRow = {
  id: string;
  thread_id: string;
  user_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  derived_from: string[];
  source_channel: string | null;
};

const mapThread = (row: ChatThreadRow): ChatThread => ({
  id: row.id,
  userId: row.user_id,
  surface: row.surface,
  facet: row.facet,
  title: row.title,
  createdAt: row.created_at,
  lastSedimentadoAt: row.last_sedimentado_at,
  campaignId: row.campaign_id ?? null,
  campaignName: row.campaign_name ?? null,
  mesaId: row.campaign_mesa_id ?? null,
  scope:
    row.title === chatScopeMarker("character_creation")
      ? "character_creation"
      : row.title === chatScopeMarker("master")
        ? "master"
        : "general",
  responseMode: row.response_mode ?? "ASSISTENTE",
  roleplayTargetId: row.roleplay_target_id ?? null,
  playerExperience: row.player_experience ?? null,
  activeCharacterId: row.active_character_id ?? null,
});

const mapMessage = (row: ChatMessageRow): ChatMessage => ({
  id: row.id,
  threadId: row.thread_id,
  userId: row.user_id,
  role: row.role,
  content: row.content,
  createdAt: row.created_at,
  derivedFrom: row.derived_from,
  sourceChannel: row.source_channel,
});

export function createPostgresChatRepository(sql: SqlExecutor): ChatRepository {
  return {
    async findCanonicalThread(userId) {
      const rows = await sql.query<ChatThreadRow>(
        "SELECT t.id, t.user_id, t.surface, t.facet, t.title, t.created_at, t.last_sedimentado_at, " +
          "t.campaign_id, c.name AS campaign_name, c.mesa_id AS campaign_mesa_id, t.response_mode, t.roleplay_target_id, t.player_experience, t.active_character_id " +
          "FROM public.chat_threads t " +
          "LEFT JOIN public.campaigns c ON c.id = t.campaign_id " +
          "LEFT JOIN public.mesa_members mm ON mm.mesa_id = c.mesa_id AND mm.user_id = $1 AND mm.membership_status = 'active' " +
          "WHERE t.user_id = $1 AND t.surface = 'kallistis' AND t.facet = 'kallistis' " +
          "AND t.title <> '" +
          chatScopeMarker("master") +
          "' " +
          "AND (t.campaign_id IS NULL OR " +
          systemMasterPredicate("$1") +
          " OR mm.user_id IS NOT NULL) " +
          "ORDER BY t.created_at ASC, t.id ASC LIMIT 1",
        [userId],
      );
      return rows[0] ? mapThread(rows[0]) : null;
    },
    async findScopedThread(userId, scope: ChatScope) {
      const masterScope = scope === "master";
      const rows = await sql.query<ChatThreadRow>(
        "SELECT t.id, t.user_id, t.surface, t.facet, t.title, t.created_at, t.last_sedimentado_at, " +
          "t.campaign_id, c.name AS campaign_name, c.mesa_id AS campaign_mesa_id, t.response_mode, t.roleplay_target_id, t.player_experience, t.active_character_id " +
          "FROM public.chat_threads t " +
          "LEFT JOIN public.campaigns c ON c.id = t.campaign_id " +
          "LEFT JOIN public.mesa_members mm ON mm.mesa_id = c.mesa_id AND mm.user_id = $1 AND mm.membership_status = 'active' " +
          "WHERE t.user_id = $1 AND t.surface = 'kallistis' AND t.facet = 'kallistis' AND t.title = $2 " +
          "AND (t.campaign_id IS NULL OR " +
          systemMasterPredicate("$1") +
          " OR mm.user_id IS NOT NULL) " +
          (masterScope
            ? "AND (" +
              systemMasterPredicate("$1") +
              " OR (t.campaign_id IS NULL AND EXISTS (SELECT 1 FROM public.mesa_members master_mm WHERE master_mm.user_id = $1 AND master_mm.member_role='mestre' AND master_mm.membership_status='active')) OR mm.member_role = 'mestre') "
            : "") +
          "ORDER BY t.created_at DESC, t.id DESC LIMIT 1",
        [userId, chatScopeMarker(scope)],
      );
      return rows[0] ? mapThread(rows[0]) : null;
    },
    async createThread(thread) {
      const rows = await sql.query<ChatThreadRow>(
        "INSERT INTO public.chat_threads (id, user_id, surface, facet, title, created_at, last_sedimentado_at, campaign_id, response_mode, roleplay_target_id, player_experience, active_character_id) " +
          "VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) " +
          "RETURNING id, user_id, surface, facet, title, created_at, last_sedimentado_at, campaign_id, response_mode, roleplay_target_id, player_experience, active_character_id",
        [
          thread.id,
          thread.userId,
          thread.surface,
          thread.facet,
          thread.title,
          thread.createdAt,
          thread.lastSedimentadoAt,
          thread.campaignId ?? null,
          thread.responseMode ?? "ASSISTENTE",
          thread.roleplayTargetId ?? null,
          thread.playerExperience ?? null,
          thread.activeCharacterId ?? null,
        ],
      );
      if (!rows[0]) throw new Error("Chat thread was not persisted");
      return mapThread(rows[0]);
    },
    async getThreadById(userId, threadId) {
      const rows = await sql.query<ChatThreadRow>(
        "SELECT t.id, t.user_id, t.surface, t.facet, t.title, t.created_at, t.last_sedimentado_at, " +
          "t.campaign_id, c.name AS campaign_name, c.mesa_id AS campaign_mesa_id, t.response_mode, t.roleplay_target_id, t.player_experience, t.active_character_id " +
          "FROM public.chat_threads t " +
          "LEFT JOIN public.campaigns c ON c.id = t.campaign_id " +
          "LEFT JOIN public.mesa_members mm ON mm.mesa_id = c.mesa_id AND mm.user_id = $2 AND mm.membership_status = 'active' " +
          "WHERE t.id = $1 AND t.user_id = $2 " +
          "AND (t.campaign_id IS NULL OR " +
          systemMasterPredicate("$2") +
          " OR mm.user_id IS NOT NULL) " +
          "AND (t.title <> '" +
          chatScopeMarker("master") +
          "'" +
          " OR " +
          systemMasterPredicate("$2") +
          " OR (t.campaign_id IS NULL AND EXISTS (SELECT 1 FROM public.mesa_members master_mm WHERE master_mm.user_id = $2 AND master_mm.member_role='mestre' AND master_mm.membership_status='active'))" +
          " OR mm.member_role = 'mestre') LIMIT 1",
        [threadId, userId],
      );
      return rows[0] ? mapThread(rows[0]) : null;
    },
    async insertMessage(message) {
      const rows = await sql.query<{ id: string }>(
        `INSERT INTO chat_messages (id, thread_id, user_id, role, content, created_at, derived_from, source_channel)
         SELECT $1, t.id, $2, $4, $5, $6,
                CASE
                  WHEN $7::text = '' THEN '{}'::uuid[]
                  WHEN left($7::text, 1) = '{' THEN $7::text::uuid[]
                  ELSE string_to_array($7::text, ',')::uuid[]
                END,
                $8
           FROM chat_threads t WHERE t.id = $3 AND t.user_id = $2
         ON CONFLICT (id) DO UPDATE SET content = EXCLUDED.content,
           derived_from = EXCLUDED.derived_from, source_channel = EXCLUDED.source_channel
          WHERE chat_messages.user_id = EXCLUDED.user_id
            AND chat_messages.thread_id = EXCLUDED.thread_id
         RETURNING id`,
        [
          message.id,
          message.userId,
          message.threadId,
          message.role,
          message.content,
          message.createdAt,
          message.derivedFrom,
          message.sourceChannel,
        ],
      );
      if (!rows[0]?.id) throw new Error("Chat thread not found or not owned by user");
    },
    async listThreadMessages(userId, threadId, limit) {
      const rows = await sql.query<ChatMessageRow>(
        `SELECT m.id, m.thread_id, m.user_id, m.role, m.content, m.created_at, m.derived_from, m.source_channel
           FROM chat_messages m JOIN chat_threads t ON t.id = m.thread_id AND t.user_id = $1
          WHERE m.user_id = $1 AND m.thread_id = $2 AND m.role IN ('user', 'assistant')
          ORDER BY m.created_at DESC, m.id DESC LIMIT $3`,
        [userId, threadId, limit],
      );
      return rows.map(mapMessage);
    },
    async updateThreadSedimentationCursor(userId, threadId, at) {
      const rows = await sql.query<{ id: string }>(
        "UPDATE chat_threads SET last_sedimentado_at = $3 WHERE id = $1 AND user_id = $2 RETURNING id",
        [threadId, userId, at],
      );
      if (!rows[0]?.id) throw new Error("Chat thread not found or not owned by user");
    },
    async updatePlayerExperience(userId, threadId, playerExperience, activeCharacterId) {
      const rows = await sql.query<ChatThreadRow>(
        "UPDATE public.chat_threads SET player_experience=$3, active_character_id=$4 WHERE id=$1 AND user_id=$2 RETURNING id, user_id, surface, facet, title, created_at, last_sedimentado_at, campaign_id, response_mode, roleplay_target_id, player_experience, active_character_id",
        [threadId, userId, playerExperience, activeCharacterId],
      );
      return rows[0] ? mapThread(rows[0]) : null;
    },
  };
}

type MutationRow = {
  id: string;
  operation_id: string;
  user_id: string;
  thread_id: string;
  character_id: string | null;
  operation: "character_biography_update" | "character_create";
  expected_version: number | null;
  before_biography: string | null;
  next_biography: string | null;
  status: PendingCharacterBiographyMutation["status"];
  created_at: string;
  expires_at: string;
  confirmed_at: string | null;
  payload: Record<string, unknown>;
};

const mutationColumns =
  "id, operation_id, user_id, thread_id, character_id, operation, expected_version, before_biography, next_biography, status, created_at, expires_at, confirmed_at, payload";

function mapMutation(row: MutationRow): PendingCharacterMutation {
  const base = {
    id: row.id,
    operationId: row.operation_id,
    userId: row.user_id,
    threadId: row.thread_id,
    status: row.status,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    confirmedAt: row.confirmed_at,
    payload: row.payload ?? {},
  };
  if (row.operation === "character_create") {
    const created: PendingCharacterCreateMutation = {
      ...base,
      characterId: null,
      operation: "character_create",
      expectedVersion: null,
      beforeBiography: null,
      nextBiography: null,
    };
    return created;
  }
  const biography: PendingCharacterBiographyMutation = {
    ...base,
    characterId: row.character_id as string,
    operation: "character_biography_update",
    expectedVersion: Number(row.expected_version),
    beforeBiography: row.before_biography ?? "",
    nextBiography: row.next_biography ?? "",
  };
  return biography;
}

export function createPostgresMutationRepository(sql: SqlExecutor): MutationRepository {
  return {
    async createCharacterBiographyPreview(input) {
      const rows = await sql.query<MutationRow>(
        `INSERT INTO public.chat_mutation_confirmations
          (id, operation_id, user_id, thread_id, character_id, operation, expected_version, before_biography, next_biography, expires_at)
         SELECT $1, $2, $3, t.id, c.id, 'character_biography_update', $6, $7, $8, $9
           FROM public.chat_threads t
           JOIN public.characters c ON c.id = $5 AND c.owner_user_id = $3
          WHERE t.id = $4 AND t.user_id = $3
         RETURNING ${mutationColumns}`,
        [
          input.id,
          input.operationId,
          input.userId,
          input.threadId,
          input.characterId,
          input.expectedVersion,
          input.beforeBiography,
          input.nextBiography,
          input.expiresAt,
        ],
      );
      if (!rows[0]) throw new Error("mutation_target_not_found_or_forbidden");
      return mapMutation(rows[0]) as PendingCharacterBiographyMutation;
    },
    async createCharacterCreatePreview(input) {
      const rows = await sql.query<MutationRow>(
        `INSERT INTO public.chat_mutation_confirmations
          (id, operation_id, user_id, thread_id, character_id, operation, expected_version, before_biography, next_biography, expires_at, payload)
         SELECT $1, $2, $3, t.id, NULL, 'character_create', NULL, NULL, NULL, $6, $5::jsonb
           FROM public.chat_threads t
          WHERE t.id = $4 AND t.user_id = $3
         RETURNING ${mutationColumns}`,
        [
          input.id,
          input.operationId,
          input.userId,
          input.threadId,
          { ...input.payload, plannedCharacterId: input.plannedCharacterId },
          input.expiresAt,
        ],
      );
      if (!rows[0]) throw new Error("mutation_target_not_found_or_forbidden");
      return mapMutation(rows[0]) as PendingCharacterCreateMutation;
    },
    async getPendingMutation(userId, id) {
      const rows = await sql.query<MutationRow>(
        `SELECT ${mutationColumns} FROM public.chat_mutation_confirmations WHERE id=$1 AND user_id=$2 LIMIT 1`,
        [id, userId],
      );
      return rows[0] ? mapMutation(rows[0]) : null;
    },
    async listPendingMutations(userId, threadId) {
      const rows = await sql.query<MutationRow>(
        `SELECT ${mutationColumns}
           FROM public.chat_mutation_confirmations
          WHERE user_id=$1 AND thread_id=$2 AND status='pending' AND expires_at > now()
          ORDER BY created_at ASC, id ASC`,
        [userId, threadId],
      );
      return rows.map(mapMutation);
    },
    async claimPendingMutation(userId, id) {
      const rows = await sql.query<MutationRow>(
        `UPDATE public.chat_mutation_confirmations
            SET status='executing'
          WHERE id=$1 AND user_id=$2 AND status='pending' AND expires_at > now()
        RETURNING ${mutationColumns}`,
        [id, userId],
      );
      return rows[0] ? mapMutation(rows[0]) : null;
    },
    async releasePendingMutation(userId, id) {
      await sql.query(
        "UPDATE public.chat_mutation_confirmations SET status='pending' WHERE id=$1 AND user_id=$2 AND status='executing'",
        [id, userId],
      );
    },
    async completePendingMutation(userId, id) {
      const rows = await sql.query(
        "UPDATE public.chat_mutation_confirmations SET status='confirmed', confirmed_at=now() WHERE id=$1 AND user_id=$2 AND status='executing' RETURNING id",
        [id, userId],
      );
      if (!rows[0]?.id) throw new Error("mutation_not_executing");
    },
    async cancelPendingMutation(userId, id) {
      const rows = await sql.query(
        "UPDATE public.chat_mutation_confirmations SET status='cancelled' WHERE id=$1 AND user_id=$2 AND status='pending' AND expires_at > now() RETURNING id",
        [id, userId],
      );
      return Boolean(rows[0]?.id);
    },
  };
}

type CampaignRow = {
  id: string;
  mesa_id: string;
  mesa_name: string;
  name: string;
  status: Campaign["status"];
  created_at: string;
  updated_at: string;
};

type CampaignMesaRow = {
  id: string;
  slug: string;
  name: string;
  member_role: CampaignMesa["memberRole"];
};

const mapCampaign = (row: CampaignRow): Campaign => ({
  id: row.id,
  mesaId: row.mesa_id,
  mesaName: row.mesa_name,
  name: row.name,
  status: row.status,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function systemMasterPredicate(userParameter: string): string {
  return (
    "EXISTS (SELECT 1 FROM public.system_roles sr WHERE sr.user_id = " +
    userParameter +
    " AND sr.system_role = 'system_master')"
  );
}

export function createPostgresCampaignRepository(sql: SqlExecutor): CampaignRepository {
  return {
    async listAuthorized(userId) {
      const rows = await sql.query<CampaignRow>(
        "SELECT c.id, c.mesa_id, m.name AS mesa_name, c.name, c.status, c.created_at, c.updated_at " +
          "FROM public.campaigns c " +
          "JOIN public.mesas m ON m.id = c.mesa_id " +
          "WHERE c.status = 'active' AND (" +
          systemMasterPredicate("$1") +
          " OR EXISTS (SELECT 1 FROM public.mesa_members mm " +
          "WHERE mm.mesa_id = c.mesa_id AND mm.user_id = $1 AND mm.membership_status = 'active')) " +
          "ORDER BY c.created_at ASC, c.id ASC",
        [userId],
      );
      return rows.map(mapCampaign);
    },
    async listMasterAuthorized(userId) {
      const rows = await sql.query<CampaignRow>(
        "SELECT c.id, c.mesa_id, m.name AS mesa_name, c.name, c.status, c.created_at, c.updated_at " +
          "FROM public.campaigns c JOIN public.mesas m ON m.id=c.mesa_id " +
          "WHERE c.status='active' AND (" +
          systemMasterPredicate("$1") +
          " OR EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.mesa_id=c.mesa_id AND mm.user_id=$1 AND mm.member_role='mestre' AND mm.membership_status='active')) " +
          "ORDER BY c.created_at ASC, c.id ASC",
        [userId],
      );
      return rows.map(mapCampaign);
    },
    async listMasterMesas(userId) {
      const rows = await sql.query<CampaignMesaRow>(
        "SELECT m.id, m.slug, m.name, " +
          "CASE WHEN " +
          systemMasterPredicate("$1") +
          " THEN 'mestre' ELSE mm.member_role END AS member_role " +
          "FROM public.mesas m " +
          "LEFT JOIN public.mesa_members mm ON mm.mesa_id = m.id " +
          "AND mm.user_id = $1 AND mm.membership_status = 'active' " +
          "WHERE " +
          systemMasterPredicate("$1") +
          " OR mm.member_role = 'mestre' " +
          "ORDER BY m.name ASC, m.id ASC",
        [userId],
      );
      return rows.map((row) => ({
        id: row.id,
        slug: row.slug,
        name: row.name,
        memberRole: row.member_role,
      }));
    },
    async getAuthorized(userId, campaignId) {
      const rows = await sql.query<CampaignRow>(
        "SELECT c.id, c.mesa_id, m.name AS mesa_name, c.name, c.status, c.created_at, c.updated_at " +
          "FROM public.campaigns c " +
          "JOIN public.mesas m ON m.id = c.mesa_id " +
          "WHERE c.id = $1 AND c.status = 'active' AND (" +
          systemMasterPredicate("$2") +
          " OR EXISTS (SELECT 1 FROM public.mesa_members mm " +
          "WHERE mm.mesa_id = c.mesa_id AND mm.user_id = $2 AND mm.membership_status = 'active')) " +
          "LIMIT 1",
        [campaignId, userId],
      );
      return rows[0] ? mapCampaign(rows[0]) : null;
    },
    async getMasterAuthorized(userId, campaignId) {
      const rows = await sql.query<CampaignRow>(
        "SELECT c.id, c.mesa_id, m.name AS mesa_name, c.name, c.status, c.created_at, c.updated_at " +
          "FROM public.campaigns c JOIN public.mesas m ON m.id = c.mesa_id " +
          "WHERE c.id = $1 AND c.status = 'active' AND (" +
          systemMasterPredicate("$2") +
          " OR EXISTS (SELECT 1 FROM public.mesa_members mm WHERE mm.mesa_id=c.mesa_id AND mm.user_id=$2 AND mm.member_role='mestre' AND mm.membership_status='active')) LIMIT 1",
        [campaignId, userId],
      );
      return rows[0] ? mapCampaign(rows[0]) : null;
    },
    async create(userId, mesaId, name) {
      const rows = await sql.query<{ id: string }>(
        "INSERT INTO public.campaigns (mesa_id, name) " +
          "SELECT $2, $3 " +
          "WHERE (" +
          systemMasterPredicate("$1") +
          " OR EXISTS (SELECT 1 FROM public.mesa_members mm " +
          "WHERE mm.mesa_id = $2 AND mm.user_id = $1 AND mm.membership_status = 'active' " +
          "AND mm.member_role = 'mestre')) " +
          "RETURNING id",
        [userId, mesaId, name],
      );
      const campaignId = rows[0]?.id;
      return campaignId ? this.getAuthorized(userId, campaignId) : null;
    },
  };
}

type CandidateRow = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  status: MemoryCandidate["status"];
  created_at: string;
};
type GardenRow = {
  id: string;
  user_id: string;
  title: string;
  body: string;
  campaign_id: string | null;
  created_at: string;
};
type SedimentRow = {
  id: string;
  user_id: string;
  thread_id: string;
  nivel: string;
  status: Sediment["status"];
  source_ids: string[];
  hipotese: string;
  resumo: string | null;
  confianca: number;
  promovido_para: string | null;
  created_at: string;
};

export function createPostgresMemoryRepository(sql: SqlExecutor): MemoryRepository {
  return {
    async listCandidates(userId) {
      const rows = await sql.query<CandidateRow>(
        "SELECT id, user_id, title, content, status, created_at FROM memory_candidates WHERE user_id = $1 ORDER BY created_at DESC, id DESC",
        [userId],
      );
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        content: row.content,
        status: row.status,
        createdAt: row.created_at,
      }));
    },
    async listMemories(userId, campaignId) {
      const rows = await sql.query<GardenRow>(
        "SELECT id, user_id, title, body, campaign_id, created_at FROM jardim_memorias WHERE user_id = $1 AND archived_at IS NULL AND (campaign_id IS NULL OR campaign_id = $2) ORDER BY created_at DESC, id DESC LIMIT 8",
        [userId, campaignId ?? null],
      );
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        title: row.title,
        body: row.body,
        campaignId: row.campaign_id ?? null,
        createdAt: row.created_at,
      }));
    },
    async listSediments(userId, threadId) {
      const rows = await sql.query<SedimentRow>(
        "SELECT id, user_id, thread_id, nivel, status, source_ids, hipotese, resumo, confianca, promovido_para, created_at FROM sedimentos WHERE user_id = $1 AND thread_id = $2 ORDER BY created_at ASC, id ASC",
        [userId, threadId],
      );
      return rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        threadId: row.thread_id,
        level: row.nivel,
        status: row.status,
        sourceIds: row.source_ids,
        hypothesis: row.hipotese,
        summary: row.resumo,
        confidence: row.confianca,
        promotedTo: row.promovido_para,
        createdAt: row.created_at,
      }));
    },
  };
}

function atomicResult(rows: readonly Record<string, unknown>[]): Record<string, unknown> {
  const result = rows[0]?.result;
  if (!result || typeof result !== "object")
    throw new Error("Atomic PostgreSQL operation returned no result");
  return result as Record<string, unknown>;
}

export function createPostgresSedimentationRepository(sql: SqlExecutor): SedimentationRepository {
  return {
    async insertSediment(input: SedimentInput) {
      const rows = await sql.query<{ id: string }>(
        `INSERT INTO sedimentos
          (user_id, thread_id, nivel, status, source_kind, source_ids, hipotese, resumo, confianca)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING id`,
        [
          input.userId,
          input.threadId,
          input.level,
          input.status,
          input.sourceKind,
          pgArray(input.sourceIds),
          input.hypothesis,
          input.summary,
          input.confidence,
        ],
      );
      if (!rows[0]?.id) throw new Error("Sediment was not persisted");
      return rows[0].id;
    },
    async getSediment(userId, sedimentId) {
      const rows = await sql.query<SedimentRow>(
        `SELECT id, user_id, thread_id, nivel, status, source_ids, hipotese, resumo, confianca,
                promovido_para, created_at
           FROM sedimentos
          WHERE user_id = $1 AND id = $2
          LIMIT 1`,
        [userId, sedimentId],
      );
      const row = rows[0];
      return row
        ? {
            id: row.id,
            userId: row.user_id,
            threadId: row.thread_id,
            level: row.nivel,
            status: row.status,
            sourceIds: row.source_ids,
            hypothesis: row.hipotese,
            summary: row.resumo,
            confidence: row.confianca,
            promotedTo: row.promovido_para,
            createdAt: row.created_at,
          }
        : null;
    },
    async discardSediment(userId, sedimentId, at) {
      const rows = await sql.query<{ id: string }>(
        `UPDATE sedimentos
            SET status = 'descartado', revisado_at = $3
          WHERE id = $1 AND user_id = $2 AND status = 'em_revisao'
          RETURNING id`,
        [sedimentId, userId, at],
      );
      return Boolean(rows[0]?.id);
    },
    async approveMemoryCandidate(userId, candidateId, input) {
      const rows = await sql.query<Record<string, unknown>>(
        "SELECT approve_memory_candidate_atomic($1, $2, $3, $4, $5, $6, $7, $8) AS result",
        [
          userId,
          candidateId,
          input.title,
          input.content,
          input.domain,
          input.sensitivity,
          pgArray(input.tags),
          input.importance,
        ],
      );
      return atomicResult(rows);
    },
    async confirmSediment(userId, sedimentId, input) {
      const rows = await sql.query<Record<string, unknown>>(
        "SELECT confirm_sediment_atomic($1, $2, $3, $4, $5, $6) AS result",
        [userId, sedimentId, input.title, input.content, input.importance, pgArray(input.tags)],
      );
      return atomicResult(rows);
    },
    async promoteSedimentBatch(userId, threadId, sourceIds, input) {
      const rows = await sql.query<Record<string, unknown>>(
        "SELECT promote_sediment_batch_atomic($1, $2, $3, $4, $5, $6, $7, $8, $9) AS result",
        [
          userId,
          threadId,
          input.nextLevel,
          pgArray(sourceIds),
          input.hypothesis,
          input.summary,
          input.confidence,
          input.parentStatus ?? "confirmado",
          input.newStatus ?? "em_revisao",
        ],
      );
      return atomicResult(rows);
    },
  };
}
