import { describe, expect, it } from "vitest";
import { playerAvatarSlot, playerAvatarStyle } from "./PlayerAvatarPlaceholder";

describe("player avatar placeholders", () => {
  it("assigns the numbered player to its matching art cell", () => {
    expect(playerAvatarSlot("JOGADOR-01")).toBe(0);
    expect(playerAvatarSlot("JOGADOR-12")).toBe(11);
  });

  it("keeps unknown identities deterministic and reserves the last cell for RAAR", () => {
    expect(playerAvatarSlot("Tony")).toBe(playerAvatarSlot("Tony"));
    expect(playerAvatarSlot("MESTRE RAAR", true)).toBe(11);
  });

  it("returns a complete cropped sprite style", () => {
    expect(playerAvatarStyle(4)).toMatchObject({
      backgroundSize: "400% 300%",
      backgroundPosition: "0% 50%",
      backgroundRepeat: "no-repeat",
    });
  });
});
