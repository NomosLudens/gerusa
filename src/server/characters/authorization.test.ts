import { describe, expect, it } from "vitest";
import type { SqlExecutor } from "@/server/local-core/postgres";
import { canEditCharacter, canReviewCharacter } from "./authorization";

function fakeSql({
  globalReviewer,
  linkedToMesa,
}: {
  globalReviewer: boolean;
  linkedToMesa: boolean;
}) {
  return {
    async query<T>(text: string): Promise<T[]> {
      if (text.includes("public.system_roles")) return (globalReviewer ? [{ ok: 1 }] : []) as T[];
      if (text.includes("public.character_mesas")) return (linkedToMesa ? [{ ok: 1 }] : []) as T[];
      return [] as T[];
    },
  } as unknown as SqlExecutor;
}

describe("autorização de Mestre por mesa", () => {
  it("permite ao Mestre revisar uma personagem vinculada à sua mesa", async () => {
    await expect(
      canReviewCharacter(
        fakeSql({ globalReviewer: false, linkedToMesa: true }),
        "mesa-mestre",
        "character-1",
      ),
    ).resolves.toBe(true);
  });

  it("não permite ao Mestre revisar uma personagem de outra mesa", async () => {
    await expect(
      canReviewCharacter(
        fakeSql({ globalReviewer: false, linkedToMesa: false }),
        "mesa-mestre",
        "character-1",
      ),
    ).resolves.toBe(false);
  });

  it("preserva o escopo global do reviewer do sistema", async () => {
    await expect(
      canReviewCharacter(
        fakeSql({ globalReviewer: true, linkedToMesa: false }),
        "tal",
        "character-1",
      ),
    ).resolves.toBe(true);
  });
});

describe("edição administrativa da ficha", () => {
  const character = { id: "character-1", ownerUserId: "jogador-1" };

  it("mantém a edição do próprio dono sem depender de papel administrativo", async () => {
    await expect(
      canEditCharacter(
        fakeSql({ globalReviewer: false, linkedToMesa: false }),
        "jogador-1",
        character,
      ),
    ).resolves.toBe(true);
  });

  it("permite ao TAL editar uma ficha de outro jogador", async () => {
    await expect(
      canEditCharacter(fakeSql({ globalReviewer: true, linkedToMesa: false }), "tal", character),
    ).resolves.toBe(true);
  });

  it("bloqueia um terceiro sem papel global", async () => {
    await expect(
      canEditCharacter(
        fakeSql({ globalReviewer: false, linkedToMesa: true }),
        "outro-jogador",
        character,
      ),
    ).resolves.toBe(false);
  });
});
