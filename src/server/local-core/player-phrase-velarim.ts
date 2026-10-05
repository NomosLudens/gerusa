import { randomInt } from "node:crypto";

// Puzzle pieces follow the author-approved `mi-<termo>` pattern. Their roots
// come from the current Velarim canon; `mi-raar` is reserved and excluded.
export const VELARIM_PLAYER_PHRASE_PIECES = [
  "mi-silma",
  "mi-manesh",
  "mi-vesilma",
  "mi-silmol",
  "mi-silmov",
  "mi-velar",
  "mi-nooveth",
  "mi-mira",
  "mi-veth",
  "mi-mirveth",
  "mi-mirvethin",
  "mi-mirvethari",
  "mi-vethari",
  "mi-mirin",
  "mi-mirim",
  "mi-thuvel",
  "mi-kav",
  "mi-anir",
  "mi-valen",
  "mi-kir",
  "mi-tharen",
  "mi-luumeh",
  "mi-krav",
  "mi-manuv",
] as const;

export function generateVelarimPlayerPhrase(usedPieces: Iterable<string> = []): string {
  const used = new Set(usedPieces);
  const available = VELARIM_PLAYER_PHRASE_PIECES.filter((piece) => !used.has(piece));
  if (available.length === 0) throw new Error("player_phrase_pool_exhausted");
  return available[randomInt(available.length)];
}
