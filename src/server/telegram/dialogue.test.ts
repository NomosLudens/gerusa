import { describe, expect, it } from "vitest";
import {
  ensureKhoraMention,
  KAIROS_GUARDIAN_TURN_SYSTEM,
  KAIROS_KHORA_TURN_SYSTEM,
  normalizeTelegramUsername,
  resolveTelegramChannelContext,
} from "./dialogue";

const allowed = new Set(["8993019248"]);

function resolve(input: Partial<Parameters<typeof resolveTelegramChannelContext>[0]> = {}) {
  return resolveTelegramChannelContext({
    chatType: "private",
    chatId: 8993019248,
    fromId: 8993019248,
    fromIsBot: false,
    text: "Olá",
    hasVoice: false,
    allowedHumanIds: allowed,
    dialogueChatId: "-1001234567890",
    khoraBotId: "777000111",
    khoraBotUsername: "KhoraBot",
    ...input,
  });
}

describe("contexto natural da Câmara da Travessia", () => {
  it("preserva o canal privado autorizado", () => {
    expect(resolve()).toEqual({ kind: "private", text: "Olá" });
    expect(resolve({ text: "", hasVoice: true })).toEqual({ kind: "private", text: "" });
  });

  it("ignora bot e usuário não autorizado no privado", () => {
    expect(resolve({ fromIsBot: true })).toMatchObject({ kind: "ignored" });
    expect(resolve({ fromId: 123 })).toMatchObject({ kind: "ignored" });
  });

  it("aceita texto natural do Guardião no grupo autorizado", () => {
    expect(
      resolve({
        chatType: "supergroup",
        chatId: -1001234567890,
        text: "A memória é permanência ou reconstrução?",
      }),
    ).toEqual({
      kind: "dialogue",
      sender: "guardian",
      text: "A memória é permanência ou reconstrução?",
    });
  });

  it("mantém /dialogo como compatibilidade e normaliza o payload", () => {
    expect(
      resolve({
        chatType: "supergroup",
        chatId: -1001234567890,
        text: "/dialogo@KallistisBot  tema",
      }),
    ).toMatchObject({ kind: "dialogue", sender: "guardian", text: "tema" });
  });

  it("ignora texto vazio, voz, grupo errado e humano não autorizado", () => {
    expect(resolve({ chatType: "supergroup", chatId: -1001234567890, text: "   " })).toMatchObject({
      kind: "ignored",
      reason: "dialogue_empty",
    });
    expect(
      resolve({ chatType: "supergroup", chatId: -1001234567890, text: "", hasVoice: true }),
    ).toMatchObject({ kind: "ignored", reason: "dialogue_text_only" });
    expect(resolve({ chatType: "supergroup", chatId: -100999, text: "tema" })).toMatchObject({
      kind: "ignored",
      reason: "dialogue_chat_not_allowed",
    });
    expect(
      resolve({ chatType: "supergroup", chatId: -1001234567890, fromId: 123, text: "tema" }),
    ).toMatchObject({ kind: "ignored", reason: "dialogue_user_not_allowed" });
  });

  it("não desperta Kallistis quando o humano fala diretamente com a Khora", () => {
    expect(
      resolve({
        chatType: "group",
        chatId: -1001234567890,
        text: "@khorabot, o que significa continuidade?",
        khoraBotUsername: "KhoraBot",
      }),
    ).toEqual({ kind: "ignored", reason: "dialogue_addressed_to_khora" });
    expect(
      resolve({
        chatType: "group",
        chatId: -1001234567890,
        text: "A palavra @KhoraBotExtra não é a Khora.",
      }),
    ).toMatchObject({ kind: "dialogue", sender: "guardian" });
  });

  it("aceita somente o ID exato da Khora, sem reply ou marcador", () => {
    expect(
      resolve({
        chatType: "group",
        chatId: -1001234567890,
        fromId: 777000111,
        fromIsBot: true,
        text: "Talvez a memória permaneça porque se reconstrói.",
      }),
    ).toEqual({
      kind: "dialogue",
      sender: "khora",
      text: "Talvez a memória permaneça porque se reconstrói.",
    });
    expect(
      resolve({
        chatType: "group",
        chatId: -1001234567890,
        fromId: 888,
        fromIsBot: true,
        text: "resposta parecida",
      }),
    ).toEqual({ kind: "ignored", reason: "dialogue_bot_not_allowed" });
    expect(
      resolve({
        chatType: "group",
        chatId: -1001234567890,
        fromId: 777000111,
        fromIsBot: false,
        text: "resposta parecida",
      }),
    ).toEqual({ kind: "ignored", reason: "dialogue_user_not_allowed" });
    expect(
      resolve({
        chatType: "group",
        chatId: -100999,
        fromId: 777000111,
        fromIsBot: true,
        text: "resposta",
      }),
    ).toEqual({ kind: "ignored", reason: "dialogue_chat_not_allowed" });
  });

  it("insere a menção natural somente quando necessário", () => {
    expect(normalizeTelegramUsername("@@KhoraBot")).toBe("@KhoraBot");
    expect(ensureKhoraMention("Antônio trouxe uma questão.", "KhoraBot")).toBe(
      "@KhoraBot, Antônio trouxe uma questão.",
    );
    expect(ensureKhoraMention("@khorabot, Antônio trouxe uma questão.", "KhoraBot")).toBe(
      "@khorabot, Antônio trouxe uma questão.",
    );
    expect(ensureKhoraMention("@KhoraBotExtra trouxe outra questão.", "KhoraBot")).toBe(
      "@KhoraBot, @KhoraBotExtra trouxe outra questão.",
    );
  });

  it("mantém Kairós apenas como instrução interna sem marcadores visíveis", () => {
    expect(KAIROS_GUARDIAN_TURN_SYSTEM).toContain("um único turno");
    expect(KAIROS_GUARDIAN_TURN_SYSTEM).toContain("username técnico");
    expect(KAIROS_KHORA_TURN_SYSTEM).toContain("Sintetize a travessia");
    expect(KAIROS_GUARDIAN_TURN_SYSTEM).not.toContain("[KAIROS:");
    expect(KAIROS_KHORA_TURN_SYSTEM).not.toContain("[KAIROS:");
  });
});
