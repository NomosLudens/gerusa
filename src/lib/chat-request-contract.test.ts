import { describe, expect, it } from "vitest";
import {
  ChatEnvelope,
  decodedBase64Bytes,
  MAX_CHAT_REQUEST_BYTES,
  MAX_CHAT_TEXT_CHARS,
  MAX_CLIENT_CHAT_MESSAGES,
  readBoundedJson,
  validationStatus,
} from "./chat-request-contract";

type MutableEnvelope = {
  threadId: string;
  messages: Array<{
    id: string;
    role: string;
    parts: Array<{
      type: string;
      text?: string;
      mediaType?: string;
      filename?: string;
      url?: string;
    }>;
  }>;
  assistantMessageId: string;
};

function validEnvelope(): MutableEnvelope {
  return {
    threadId: "11111111-1111-4111-8111-111111111111",
    messages: [
      {
        id: "22222222-2222-4222-8222-222222222222",
        role: "user",
        parts: [{ type: "text", text: "Olá" }],
      },
    ],
    assistantMessageId: "33333333-3333-4333-8333-333333333333",
  };
}

describe("chat request contract", () => {
  it("aceita somente o envelope mínimo usado pelo produto", () => {
    expect(ChatEnvelope.safeParse(validEnvelope()).success).toBe(true);
  });

  it("rejeita estrutura arbitrária e propriedades desconhecidas com 400", () => {
    const result = ChatEnvelope.safeParse({
      ...validEnvelope(),
      messages: [{ role: "system", parts: [{ type: "tool-call", input: { deep: {} } }] }],
      unknown: { deeply: { nested: true } },
    });

    expect(result.success).toBe(false);
    if (!result.success) expect(validationStatus(result.error)).toBe(400);
  });

  it("rejeita parts extras e URL externa de anexo", () => {
    const envelope = validEnvelope();
    envelope.messages[0].parts = [
      { type: "text", text: "primeira" },
      { type: "text", text: "segunda" },
      {
        type: "file",
        mediaType: "image/png",
        filename: "externa.png",
        url: "https://example.com/externa.png",
      },
    ];

    const result = ChatEnvelope.safeParse(envelope);
    expect(result.success).toBe(false);
    if (!result.success) expect(validationStatus(result.error)).toBe(400);
  });

  it("exige assinatura compatível com o MIME e rejeita base64 inválido", () => {
    const fixtures = [
      ["image/png", "iVBORw0KGgo="],
      ["image/jpeg", "/9j/4A=="],
      ["image/gif", "R0lGODlh"],
      ["image/webp", "UklGRgAAAABXRUJQ"],
      ["application/pdf", "JVBERi0="],
    ] as const;
    for (const [mediaType, encoded] of fixtures) {
      const valid = validEnvelope();
      valid.messages[0].parts = [
        { type: "file", mediaType, url: `data:${mediaType};base64,${encoded}` },
      ];
      expect(ChatEnvelope.safeParse(valid).success, mediaType).toBe(true);
    }
    expect(decodedBase64Bytes("data:image/png;base64,iVBORw0KGgo=")).toBe(8);

    for (const url of [
      "data:image/png;base64,aGVsbG8=",
      "data:image/png;base64,aGVsbG8",
      "data:image/png;base64,aGVsbG8===",
      "data:image/png;base64,aGVsbG8$",
      "data:image/jpeg;base64,iVBORw0KGgo=",
    ]) {
      const invalid = validEnvelope();
      invalid.messages[0].parts = [
        { type: "file", mediaType: "image/png", filename: "imagem.png", url },
      ];
      expect(ChatEnvelope.safeParse(invalid).success, url).toBe(false);
    }
  });

  it("classifica texto acima do limite como 413 antes do provider", () => {
    const envelope = validEnvelope();
    envelope.messages[0].parts[0].text = "x".repeat(MAX_CHAT_TEXT_CHARS + 1);
    const result = ChatEnvelope.safeParse(envelope);

    expect(result.success).toBe(false);
    if (!result.success) expect(validationStatus(result.error)).toBe(413);
  });

  // Regressão: PR #155 fez a requisição chegar ao servidor, mas o SDK injetava
  // automaticamente `id` e `trigger` no corpo. Como o ChatEnvelope usa .strict(),
  // esses campos causavam rejeição imediata antes do runtime da Kallistis.
  // A correção: prepareSendMessagesRequest garante que somente os campos do
  // envelope sejam enviados.
  describe("contrato do transporte web → ChatEnvelope", () => {
    const THREAD_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const ASSISTANT_MSG_ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    const USER_MSG_ID = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

    // Simula o que prepareSendMessagesRequest entrega ao fetch: apenas os
    // campos do body estático + messages. O SDK não inclui id/trigger quando
    // prepareSendMessagesRequest é definido.
    function buildTransportPayload(extra: Record<string, unknown> = {}) {
      // body estático equivalente ao que DefaultChatTransport recebe:
      const staticBody = {
        facet: "kallistis" as const,
        surface: "kallistis" as const,
        threadId: THREAD_ID,
      };
      // messages controladas pelo prepareSendMessagesRequest (slice já aplicado)
      const messages = [
        {
          id: USER_MSG_ID,
          role: "user" as const,
          parts: [{ type: "text" as const, text: "Olá Kallistis. Quem sou eu?" }],
        },
      ];
      // fetch adiciona presencaNota e assistantMessageId
      return {
        ...staticBody,
        messages,
        assistantMessageId: ASSISTANT_MSG_ID,
        ...extra,
      };
    }

    it("o payload do transporte passa no ChatEnvelope.strict()", () => {
      const payload = buildTransportPayload();
      const result = ChatEnvelope.safeParse(payload);
      expect(result.success).toBe(true);
    });

    it("o payload contém todos os campos obrigatórios do envelope", () => {
      const payload = buildTransportPayload();
      expect(payload).toMatchObject({
        threadId: expect.any(String),
        facet: "kallistis",
        surface: "kallistis",
        messages: expect.any(Array),
        assistantMessageId: expect.any(String),
      });
    });

    it("o payload não contém id nem trigger (metadados do SDK)", () => {
      const payload = buildTransportPayload();
      expect(Object.keys(payload)).not.toContain("id");
      expect(Object.keys(payload)).not.toContain("trigger");
      expect(Object.keys(payload)).not.toContain("messageId");
    });

    it("o payload com id/trigger seria rejeitado pelo ChatEnvelope.strict()", () => {
      // Documenta por que prepareSendMessagesRequest é necessário:
      // sem ele o SDK enviaria algo como { id: "...", trigger: "submit-message", ... }
      const sdkRawBody = buildTransportPayload({
        id: "chat-id-do-sdk",
        trigger: "submit-message",
      });
      const result = ChatEnvelope.safeParse(sdkRawBody);
      expect(result.success).toBe(false);
    });
  });

  it("rejeita Content-Length acima do limite sem ler o corpo", async () => {
    const response = await readBoundedJson(
      new Request("https://example.com/api/chat", {
        method: "POST",
        headers: { "content-length": String(MAX_CHAT_REQUEST_BYTES + 1) },
        body: "{}",
      }),
    );

    expect(response).toEqual({ ok: false, status: 413 });
  });
});
