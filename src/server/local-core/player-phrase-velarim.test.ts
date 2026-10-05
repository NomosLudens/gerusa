import { describe, expect, it } from "vitest";
import { generateVelarimPlayerPhrase, VELARIM_PLAYER_PHRASE_PIECES } from "./player-phrase-velarim";

describe("Velarim player phrase puzzle", () => {
  it("provides 24 distinct pieces and excludes the phrase already in use", () => {
    expect(VELARIM_PLAYER_PHRASE_PIECES).toHaveLength(24);
    expect(new Set(VELARIM_PLAYER_PHRASE_PIECES).size).toBe(24);
    expect(VELARIM_PLAYER_PHRASE_PIECES).not.toContain("mi-raar");
  });

  it("assigns one approved piece to a player", () => {
    const phrase = generateVelarimPlayerPhrase();

    expect(VELARIM_PLAYER_PHRASE_PIECES).toContain(phrase);
    expect(phrase).not.toContain("mi-raar");
    expect(phrase).toMatch(/^mi-[a-z']+$/);
  });

  it("does not assign a piece already used by another player", () => {
    const availablePiece = VELARIM_PLAYER_PHRASE_PIECES[0];
    const usedPieces = VELARIM_PLAYER_PHRASE_PIECES.slice(1);

    expect(generateVelarimPlayerPhrase(usedPieces)).toBe(availablePiece);
    expect(() => generateVelarimPlayerPhrase(VELARIM_PLAYER_PHRASE_PIECES)).toThrow(
      "player_phrase_pool_exhausted",
    );
  });
});
