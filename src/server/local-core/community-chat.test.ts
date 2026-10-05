import { describe, expect, it } from "vitest";
import { listCommunityChatMessages } from "./community-chat";
import type { SqlExecutor } from "./postgres";

class RecordingSql implements SqlExecutor {
  statement = "";
  nextRows: readonly Record<string, unknown>[] = [];

  async query<T extends Record<string, unknown>>(statement: string) {
    this.statement = statement;
    return this.nextRows as readonly T[];
  }

  close() {}
}

describe("identidade do Chat Geral", () => {
  it("preserva o avatar reservado do Mestre mesmo quando o nome público é TAL", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "message-1",
        author_user_id: "master-1",
        author_name: "TAL",
        author_avatar_url: "/api/profile/avatar",
        author_updated_at: "2026-09-06T18:00:00Z",
        author_is_system_master: true,
        role: "human",
        content: "olá",
        created_at: "2026-09-06T18:00:00Z",
      },
    ];

    await expect(listCommunityChatMessages(sql)).resolves.toMatchObject([
      {
        authorName: "TAL",
        authorAvatarUrl: "/api/profile/avatar?user_id=master-1&v=2026-09-06T18%3A00%3A00Z",
        isSystemMaster: true,
      },
    ]);
    expect(sql.statement).toContain("public.system_roles");
    expect(sql.statement).toContain("author_is_system_master");
  });

  it("mantém a identidade de cada emissor quando o perfil ADM usa o nome genérico", async () => {
    const sql = new RecordingSql();
    sql.nextRows = [
      {
        id: "player-message",
        author_user_id: "6dbf663a-551c-4b70-9202-324aed5af0e7",
        author_name: "Jogador",
        author_avatar_url: null,
        author_updated_at: null,
        author_is_system_master: false,
        role: "human",
        content: "mensagem Jogador",
        created_at: "2026-09-17T00:00:01Z",
      },
      {
        id: "admin-message",
        author_user_id: "88ed06e0-772e-47eb-ae2a-c920aaa197fe",
        author_name: null,
        author_avatar_url: null,
        author_updated_at: null,
        author_is_system_master: true,
        role: "human",
        content: "mensagem ADM",
        created_at: "2026-09-17T00:00:00Z",
      },
    ];

    await expect(listCommunityChatMessages(sql)).resolves.toMatchObject([
      {
        id: "admin-message",
        authorUserId: "88ed06e0-772e-47eb-ae2a-c920aaa197fe",
        authorName: "ADM",
      },
      {
        id: "player-message",
        authorUserId: "6dbf663a-551c-4b70-9202-324aed5af0e7",
        authorName: "Jogador",
      },
    ]);
  });
});
