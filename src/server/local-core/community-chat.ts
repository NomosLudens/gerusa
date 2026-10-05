import type { SqlExecutor } from "./postgres";

export type CommunityChatMessage = {
  id: string;
  authorUserId: string | null;
  authorName: string;
  authorAvatarUrl: string | null;
  isSystemMaster: boolean;
  role: "human" | "kallistis";
  publicNpcName: string | null;
  content: string;
  createdAt: string;
  archivedAt: string | null;
};

type MessageRow = {
  id: string;
  author_user_id: string | null;
  author_name: string | null;
  author_avatar_url: string | null;
  author_updated_at: string | null;
  author_is_system_master: boolean;
  role: "human" | "kallistis";
  content: string;
  created_at: string;
  archived_at: string | null;
};

const PUBLIC_NPC_MOMENT_PREFIX = "[[KALLISTIS_PUBLIC_NPC_MOMENT]]";

function decodePublicNpcMoment(role: MessageRow["role"], rawContent: string) {
  if (role !== "kallistis" || !rawContent.startsWith(PUBLIC_NPC_MOMENT_PREFIX + "\n"))
    return { publicNpcName: null, content: rawContent };
  const remainder = rawContent.slice(PUBLIC_NPC_MOMENT_PREFIX.length + 1);
  const separator = remainder.indexOf("\n");
  if (separator < 1) return { publicNpcName: null, content: rawContent };
  return {
    publicNpcName: remainder.slice(0, separator).trim() || "NPC",
    content: remainder.slice(separator + 1),
  };
}

function mapMessage(row: MessageRow): CommunityChatMessage {
  const avatarUrl = row.author_avatar_url?.trim() || null;
  const moment = decodePublicNpcMoment(row.role, row.content);
  const profileName = row.author_name?.trim() || "";
  const authorName =
    moment.publicNpcName ||
    (row.role === "kallistis"
      ? "KALLISTIS"
      : row.author_is_system_master && profileName.toLocaleLowerCase("pt-BR") === "jogador"
        ? "ADM"
        : row.author_is_system_master && !profileName
          ? "ADM"
          : profileName || "Jogador");
  return {
    id: row.id,
    authorUserId: row.author_user_id,
    authorName,
    authorAvatarUrl:
      row.role === "human" && row.author_user_id && avatarUrl
        ? avatarUrl === "/api/profile/avatar"
          ? `${avatarUrl}?user_id=${encodeURIComponent(row.author_user_id)}&v=${encodeURIComponent(row.author_updated_at ?? "")}`
          : avatarUrl
        : null,
    isSystemMaster: row.role === "human" && row.author_is_system_master,
    role: row.role,
    publicNpcName: moment.publicNpcName,
    content: moment.content,
    createdAt: row.created_at,
    archivedAt: row.archived_at ?? null,
  };
}

export async function listCommunityChatMessages(
  sql: SqlExecutor,
  limit = 100,
  includeArchived = false,
): Promise<CommunityChatMessage[]> {
  const rows = await sql.query<MessageRow>(
    `SELECT m.id, m.author_user_id, p.display_name AS author_name,
            p.avatar_url AS author_avatar_url, p.updated_at AS author_updated_at,
            EXISTS (
              SELECT 1 FROM public.system_roles sr
               WHERE sr.user_id = m.author_user_id AND sr.system_role = 'system_master'
            ) AS author_is_system_master,
            m.role, m.content, m.created_at, m.archived_at
       FROM public.community_chat_messages m
       LEFT JOIN public.profiles p ON p.id = m.author_user_id
      ${includeArchived ? "" : "WHERE m.archived_at IS NULL"}
      ORDER BY m.created_at DESC, m.id DESC
      LIMIT $1`,
    [Math.max(1, Math.min(200, limit))],
  );
  return Array.from(rows).reverse().map(mapMessage);
}

export async function setCommunityChatArchive(
  sql: SqlExecutor,
  archived: boolean,
): Promise<number> {
  const rows = await sql.query<{ id: string }>(
    archived
      ? "UPDATE public.community_chat_messages SET archived_at=now() WHERE archived_at IS NULL RETURNING id"
      : "UPDATE public.community_chat_messages SET archived_at=NULL WHERE archived_at IS NOT NULL RETURNING id",
  );
  return rows.length;
}

export async function insertCommunityChatMessage(
  sql: SqlExecutor,
  input: {
    id: string;
    authorUserId: string | null;
    role: "human" | "kallistis";
    content: string;
    createdAt: string;
  },
): Promise<CommunityChatMessage> {
  const rows = await sql.query<MessageRow>(
    `INSERT INTO public.community_chat_messages (id, author_user_id, role, content, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, author_user_id,
       (SELECT p.display_name FROM public.profiles p WHERE p.id = author_user_id) AS author_name,
       (SELECT p.avatar_url FROM public.profiles p WHERE p.id = author_user_id) AS author_avatar_url,
       (SELECT p.updated_at FROM public.profiles p WHERE p.id = author_user_id) AS author_updated_at,
       EXISTS (
         SELECT 1 FROM public.system_roles sr
          WHERE sr.user_id = author_user_id AND sr.system_role = 'system_master'
       ) AS author_is_system_master,
       role, content, created_at, archived_at`,
    [input.id, input.authorUserId, input.role, input.content, input.createdAt],
  );
  if (!rows[0]) throw new Error("community_chat_message_not_persisted");
  return mapMessage(rows[0]);
}

export async function insertPublicNpcMoment(
  sql: SqlExecutor,
  input: {
    id: string;
    speakerName: string;
    content: string;
    createdAt: string;
  },
): Promise<CommunityChatMessage> {
  return insertCommunityChatMessage(sql, {
    id: input.id,
    authorUserId: null,
    role: "kallistis",
    content: `${PUBLIC_NPC_MOMENT_PREFIX}\n${input.speakerName}\n${input.content}`,
    createdAt: input.createdAt,
  });
}
