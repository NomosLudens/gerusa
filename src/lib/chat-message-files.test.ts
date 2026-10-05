import { describe, expect, it } from "vitest";
import type { UIMessage } from "ai";
import { replaceFilePartsWithMarkers, serializedMessagesContain } from "./chat-message-files";

describe("chat message file pruning", () => {
  it("remove base64 antigo antes do próximo payload HTTP", () => {
    const base64 = "data:image/png;base64,AAAABBBBCCCC";
    const turn1: UIMessage = {
      id: "u1",
      role: "user",
      parts: [
        { type: "text", text: "veja" },
        { type: "file", mediaType: "image/png", filename: "foto.png", url: base64 },
      ],
    };
    const assistant: UIMessage = {
      id: "a1",
      role: "assistant",
      parts: [{ type: "text", text: "li" }],
    };
    const pruned = replaceFilePartsWithMarkers([turn1, assistant]);
    const turn2: UIMessage = {
      id: "u2",
      role: "user",
      parts: [{ type: "text", text: "agora texto" }],
    };
    expect(serializedMessagesContain([...pruned, turn2], base64)).toBe(false);
    expect(JSON.stringify(pruned)).toContain("[Anexo anterior já processado: foto.png]");
  });
});
