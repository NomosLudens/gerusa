import { describe, expect, it } from "vitest";
import {
  buildGravewrightCharacterExport,
  containsSensitiveExportKey,
  exportFilename,
} from "./gravewright-export";

const structurallyValidSnapshot = {
  nome: "Aelra",
  jogador: "Jogador",
  povo: "Nomos",
  trilhas: [{ oficio: "Guardião", marco: 1 }],
  trilhaAtiva: 0,
  atributosBase: { Corpo: 2, Agilidade: 1, Intelecto: 1, Presença: 1, Vontade: 1, Sintonia: 0 },
  server_secret: "must not cross the boundary",
  access_token: "must not cross the boundary",
};

function character(overrides: Record<string, unknown> = {}) {
  return {
    id: "character-1",
    name: "Aelra",
    status: "submitted" as const,
    snapshot: structuredClone(structurallyValidSnapshot),
    mesas: [],
    ownerUserId: "user-1",
    ownerDisplayName: "Jogador",
    playerName: "Jogador",
    publishedSnapshot: null,
    publishedVersion: null,
    ...overrides,
  };
}

describe("exportação manual de personagem para Gravewright", () => {
  it("exports a pending structurally valid runtime snapshot without a Mesa", () => {
    const input = character();
    const before = structuredClone(input);
    const output = buildGravewrightCharacterExport({ character: input });

    expect(output).toMatchObject({
      schema: "kallistis.gravewright.character",
      schema_version: 1,
      export_mode: "manual_runtime_snapshot",
      source_state: "submitted",
      canonical: false,
      mesa: null,
      player: {
        kallistis_user_id: "user-1",
        display_name: "Jogador",
        email: null,
      },
      character: {
        kallistis_character_id: "character-1",
        published_version: null,
      },
    });
    expect(output.character.snapshot).toEqual({
      nome: "Aelra",
      jogador: "Jogador",
      povo: "Nomos",
      trilhas: [{ oficio: "Guardião", marco: 1 }],
      trilhaAtiva: 0,
      atributosBase: { Corpo: 2, Agilidade: 1, Intelecto: 1, Presença: 1, Vontade: 1, Sintonia: 0 },
    });
    expect(containsSensitiveExportKey(output)).toBe(false);
    expect(input).toEqual(before);
  });

  it("exports a draft structurally valid snapshot and preserves its source state", () => {
    const output = buildGravewrightCharacterExport({
      character: character({ status: "draft" }),
    });

    expect(output).toMatchObject({
      export_mode: "manual_runtime_snapshot",
      source_state: "draft",
      canonical: false,
      mesa: null,
    });
  });

  it("preserves the true published state when the model says it is canonical", () => {
    const publishedSnapshot = structuredClone(structurallyValidSnapshot);
    const output = buildGravewrightCharacterExport({
      character: character({
        status: "approved",
        mesas: [{ id: "mesa-1", slug: "geek-wizards", name: "Geek Wizards" }],
        publishedSnapshot,
        publishedVersion: 3,
      }),
    });

    expect(output).toMatchObject({
      source_state: "approved",
      canonical: true,
      mesa: { id: "mesa-1", name: "Geek Wizards" },
      character: { published_version: 3 },
    });
  });

  it("blocks a snapshot that is not structurally valid and exposes validation details", () => {
    expect(() =>
      buildGravewrightCharacterExport({
        character: character({ snapshot: { nome: "Sem trilha" } }),
      }),
    ).toThrow("character_structurally_incomplete");
  });

  it("sanitizes the suggested filename", () => {
    expect(exportFilename("Élara / Mestre", "character-1")).toBe(
      "kallistis-elara-mestre-character-1.json",
    );
  });
});
