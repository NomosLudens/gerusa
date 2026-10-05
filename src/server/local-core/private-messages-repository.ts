import { randomUUID } from "node:crypto";
import type { SqlExecutor } from "./postgres";

export type PrivateMessage = {
  id: string;
  player_user_id: string;
  master_user_id: string;
  sender_user_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};

export type MasterPrivateThread = {
  player_user_id: string;
  player_name: string | null;
  unread_count: number;
  last_message_at: string;
};

export async function listPrivateMessages(
  sql: SqlExecutor,
  playerUserId: string,
  masterUserId: string,
): Promise<PrivateMessage[]> {
  const rows = await sql.query<PrivateMessage>(
    `SELECT id,player_user_id,master_user_id,sender_user_id,body,created_at,read_at
       FROM public.presence_messages
      WHERE player_user_id=$1 AND master_user_id=$2
      ORDER BY created_at ASC,id ASC`,
    [playerUserId, masterUserId],
  );
  return [...rows];
}

export async function sendPrivateMessage(input: {
  sql: SqlExecutor;
  playerUserId: string;
  masterUserId: string;
  senderUserId: string;
  body: string;
}): Promise<PrivateMessage> {
  const { sql, playerUserId, masterUserId, senderUserId } = input;
  const body = input.body.trim();
  if (!body || body.length > 2000) throw new Error("invalid_private_message_body");
  if (playerUserId === masterUserId) throw new Error("private_message_participants_invalid");
  if (senderUserId !== playerUserId && senderUserId !== masterUserId)
    throw new Error("private_message_sender_invalid");
  const rows = await sql.query<PrivateMessage>(
    `INSERT INTO public.presence_messages
       (id,player_user_id,master_user_id,sender_user_id,body)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id,player_user_id,master_user_id,sender_user_id,body,created_at,read_at`,
    [randomUUID(), playerUserId, masterUserId, senderUserId, body],
  );
  if (!rows[0]) throw new Error("private_message_not_persisted");
  return rows[0];
}

export async function markPrivateMessagesRead(
  sql: SqlExecutor,
  playerUserId: string,
  masterUserId: string,
  readerUserId: string,
): Promise<number> {
  let senderUserId: string;
  if (readerUserId === playerUserId) senderUserId = masterUserId;
  else if (readerUserId === masterUserId) senderUserId = playerUserId;
  else throw new Error("private_message_reader_invalid");
  const rows = await sql.query<{ id: string }>(
    `UPDATE public.presence_messages SET read_at=now()
      WHERE player_user_id=$1 AND master_user_id=$2 AND sender_user_id=$3 AND read_at IS NULL
      RETURNING id`,
    [playerUserId, masterUserId, senderUserId],
  );
  return rows.length;
}

export async function getUnreadCount(
  sql: SqlExecutor,
  playerUserId: string,
  masterUserId: string,
  readerUserId: string,
): Promise<number> {
  let senderUserId: string;
  if (readerUserId === playerUserId) senderUserId = masterUserId;
  else if (readerUserId === masterUserId) senderUserId = playerUserId;
  else throw new Error("private_message_reader_invalid");
  const rows = await sql.query<{ count: number | string }>(
    `SELECT count(*)::int AS count FROM public.presence_messages
      WHERE player_user_id=$1 AND master_user_id=$2 AND sender_user_id=$3 AND read_at IS NULL`,
    [playerUserId, masterUserId, senderUserId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function listThreadsForMaster(
  sql: SqlExecutor,
  masterUserId: string,
): Promise<MasterPrivateThread[]> {
  const rows = await sql.query<MasterPrivateThread>(
    `SELECT x.player_user_id,p.display_name AS player_name,
            count(*) FILTER (WHERE x.sender_user_id=x.player_user_id AND x.read_at IS NULL)::int AS unread_count,
            max(x.created_at) AS last_message_at
       FROM public.presence_messages x
       LEFT JOIN public.profiles p ON p.id=x.player_user_id
      WHERE x.master_user_id=$1
      GROUP BY x.player_user_id,p.display_name
      ORDER BY max(x.created_at) DESC,x.player_user_id`,
    [masterUserId],
  );
  return [...rows].map((row) => ({ ...row, unread_count: Number(row.unread_count) }));
}

export async function privateThreadExists(
  sql: SqlExecutor,
  playerUserId: string,
  masterUserId: string,
): Promise<boolean> {
  const rows = await sql.query(
    "SELECT 1 FROM public.presence_messages WHERE player_user_id=$1 AND master_user_id=$2 LIMIT 1",
    [playerUserId, masterUserId],
  );
  return rows.length > 0;
}
