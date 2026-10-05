import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("ChatView canonical identity", () => {
  const source = readFileSync(new URL("./ChatView.tsx", import.meta.url), "utf8").replaceAll(
    "\r\n",
    "\n",
  );

  it("facet=khora não altera a identidade visual do chat", () => {
    expect(source).not.toContain("visualFacet");
    expect(source).not.toContain('search.facet === "khora"');
    expect(source).toContain("const theme = FACET_THEMES.kallistis");
  });
  it("envia uma nova mensagem UI com texto e anexos sem messageId", () => {
    expect(source).toContain("const id = crypto.randomUUID();");
    expect(source).toContain('const parts: UIMessage["parts"] = [');
    expect(source).toContain('{ type: "text" as const, text }');
    expect(source).toContain(
      'void sendMessage({\n        id,\n        role: "user",\n        parts,\n      });',
    );
    expect(source).not.toContain("messageId: id");
    expect(source).toContain('setInput("");');
    expect(source).toContain("setAttachments([]);");
  });

  it("mantém ações claras para conversa e criação de personagem por chat", () => {
    expect(source).toContain("Chat Geral");
    expect(source).not.toContain("Chat KALLISTIS");
    expect(source).toContain("Criar personagem");
    expect(source).toContain('search: { scope: "general" }');
    expect(source).toContain('search: { scope: "character_creation" }');
    expect(source).not.toContain("persistPlayerExperience");
  });
});
