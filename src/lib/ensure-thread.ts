import { getLocalSession } from "@/lib/local-auth-client";

export type ChatFacet = "kallistis";
export type ChatScope = "general" | "character_creation" | "master";

function threadUrl(newThread: boolean, scope: ChatScope, campaignId?: string): string {
  const params = new URLSearchParams();
  if (newThread) params.set("new", "1");
  params.set("scope", scope);
  if (campaignId) params.set("campaignId", campaignId);
  const query = params.toString();
  return query ? `/api/chat/thread?${query}` : "/api/chat/thread";
}

export async function ensureThread(
  scope: ChatScope = "general",
  campaignId?: string,
): Promise<string> {
  const session = await getLocalSession();
  if (!session?.user) throw new Error("Usuário não autenticado para abrir o chat.");

  const response = await fetch(threadUrl(false, scope, campaignId), {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `Falha ao abrir o chat (HTTP ${response.status})`);
  }
  const body = (await response.json()) as { thread?: { id?: string } };
  if (!body.thread?.id) throw new Error("O chat não retornou uma thread válida.");
  return body.thread.id;
}

export async function createNewThread(
  scope: ChatScope = "general",
  campaignId?: string,
): Promise<string> {
  const session = await getLocalSession();
  if (!session?.user) throw new Error("Usuário não autenticado para abrir o chat.");
  const response = await fetch(threadUrl(true, scope, campaignId), {
    method: "POST",
    credentials: "same-origin",
    headers: { "content-type": "application/json" },
  });
  if (!response.ok) {
    const detail = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(detail?.error ?? `Falha ao criar conversa (HTTP ${response.status})`);
  }
  const body = (await response.json()) as { thread?: { id?: string } };
  if (!body.thread?.id) throw new Error("O chat não retornou uma thread válida.");
  return body.thread.id;
}
