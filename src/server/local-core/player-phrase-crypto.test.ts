import { describe, expect, it } from "vitest";
import { decryptPlayerPhrase, encryptPlayerPhrase } from "./player-phrase-crypto";

const identity = {
  userId: "11111111-1111-4111-8111-111111111111",
  playerCode: "JOGADOR-01",
};

describe("encrypted Gravewright player phrase storage", () => {
  it("round-trips a phrase and binds it to its owning player", async () => {
    const phrase = "mi-valen-mi-kir-mi-silma";
    const envelope = await encryptPlayerPhrase(phrase, "test-only-secret", identity);

    await expect(decryptPlayerPhrase(envelope, "test-only-secret", identity)).resolves.toBe(phrase);
    await expect(
      decryptPlayerPhrase(envelope, "test-only-secret", {
        ...identity,
        playerCode: "JOGADOR-02",
      }),
    ).rejects.toThrow();
    await expect(decryptPlayerPhrase(envelope, "wrong-secret", identity)).rejects.toThrow();
  });
});
