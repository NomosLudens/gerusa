import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const html = readFileSync(join(root, "public/jogar/character-forge.html"), "utf8");
const bridge = readFileSync(
  join(root, "public/jogar/character-forge-bridge.1f028ffaf8ca6bbf.js"),
  "utf8",
);
const activeBridge = readFileSync(
  join(root, "public/jogar/character-forge-bridge.pr31a-kallistis-v3.js"),
  "utf8",
);
const mutationRoute = readFileSync(join(root, "src/routes/api/chat/mutations.ts"), "utf8");
const continuityManager = readFileSync(
  join(root, "src/components/CampaignContinuityManager.tsx"),
  "utf8",
);
const compact = (source: string) => source.replace(/\s+/g, "");

describe("PR5C Character Forge delivery contract", () => {
  it("serves one fingerprinted bridge inside body", () => {
    const refs = [...html.matchAll(/<script[^>]+src="([^"]*character-forge-bridge[^"]*)"/g)].map(
      (m) => m[1],
    );
    expect(refs).toHaveLength(1);
    expect(refs[0]).toMatch(/^\/jogar\/character-forge-bridge\.pr31a-kallistis-v3\.js\?v=[\w-]+$/);
    expect(html.match(/character-forge-bridge\.js(?:["?])/g)).toBeNull();
    expect(html.indexOf(refs[0])).toBeLessThan(html.indexOf("</body>"));
    expect(html).toContain("delete CANON.magias");
    expect(html).toContain("4 Formas conhecidas · até Grau 1");
    expect(html).toContain("G4 no M11");
    expect(html).not.toContain("2 magias Grau 0 + 2 magias Grau 1");
  });

  it("mantém o Modo Mestre dependente da role e preserva Consultar no chat de criação", () => {
    expect(html).toContain("let TAL_EDIT_MODE = false");
    expect(html).toContain("window.KALLISTIS_SET_TAL_MODE");
    expect(compact(html)).toContain(
      compact('const visibleTabs = TAL_EDIT_MODE ? [...TABS,["mestre","Modo Mestre"]] : TABS;'),
    );
    expect(html).not.toContain('targetDossier ? "dossie"');
    expect(activeBridge).toContain('const requestedAdminMode = query.get("mode") === "tal"');
    expect(activeBridge).toContain('request("/api/profile")');
    expect(activeBridge).toContain(
      "profile.is_system_master === true || profile.is_master === true",
    );
    expect(activeBridge).toContain("window.KALLISTIS_SET_TAL_MODE?.(authorized)");
    expect(activeBridge).toContain('"Consultar"');
    expect(activeBridge).toContain("/chat?scope=character_creation");
    expect(activeBridge).toContain(
      "await window.KALLISTIS_SERVER_BRIDGE.assist(p, input.value.trim());",
    );
  });

  it("não duplica opções de status canônico na continuidade", () => {
    expect(continuityManager.match(/<option>CAMPAIGN_CANON<\/option>/g)).toHaveLength(1);
  });

  it("validates imports before any local persistence and blocks stale recreation", () => {
    expect(html).toContain("function validarImportacao");
    expect(html.indexOf("validarImportacao(d)")).toBeLessThan(
      html.indexOf("DB.personagens.push(d)"),
    );
    expect(html).toContain("Povo desconhecido");
    expect(html).toContain("Number.isFinite(v)");
    expect(bridge).toContain("missingServerIds");
    expect(bridge).toContain("if (!p._serverId || remoteIds.has(p._serverId)) return true;");
    expect(bridge).toContain("if (current && current._serverId) await refresh(current);");
    expect(bridge).toContain("if (!p || p._serverMissing");
    expect(bridge).toContain("function canonicalSnapshotForServer");
    expect(bridge).toContain("snapshot: canonicalSnapshotForServer(p)");
    expect(bridge).toContain("snapshot: canonicalSnapshotForServer(extra.snapshot)");
    expect(bridge).toContain("snapshot: canonicalSnapshotForServer(target)");
    expect(bridge).not.toContain("snapshot: p,");
    expect(bridge).not.toContain("cleanTarget.id = p._serverId || p.id");
    expect(bridge).not.toContain("prompt(");
  });

  it("exposes side-by-side comparison and safe player discard", () => {
    expect(bridge).toContain("Comparar fichas");
    expect(bridge).toContain('action(p, "discard", "Descartado pelo jogador")');
    expect(bridge).toContain("data-character-discard");
    expect(bridge).toContain('["draft", "rejected"]');
    expect(activeBridge).toContain('action(p, "discard", "Descartado pelo jogador")');
    expect(activeBridge).toContain("(!p._serverId || x._serverId !== p._serverId)");
  });

  it("keeps protected character states read-only", () => {
    expect(compact(html)).toContain(
      compact('["submitted","approved","archived"].includes(c._serverStatus)'),
    );
    expect(html).toContain("Ficha protegida: estado ");
    expect(compact(html)).toContain(compact('protectedStatus?null:el("button"'));
    expect(activeBridge).toContain(
      '["submitted", "approved", "archived"].includes(p._serverStatus)',
    );
    expect(compact(activeBridge)).toContain(compact("if (!protectedStatus && p._serverMutation"));
    expect(mutationRoute).toContain('if (!["draft", "rejected"].includes(character.status))');
  });

  it("shows submission and approval state separately from creation completeness", () => {
    expect(html).toContain("function characterListStatus(p)");
    expect(compact(html)).toContain(
      compact('p._serverStatus==="submitted") return "Ficha enviada · aguardando o Mestre"'),
    );
    expect(compact(html)).toContain(
      compact('p._serverStatus==="approved") return "Ficha aprovada"'),
    );
    expect(compact(html)).toContain(
      compact('p._serverStatus==="rejected") return "Devolvida para ajustes"'),
    );
    expect(compact(html)).toContain(compact('return p.completo?"Pronta para enviar":"Em criação"'));
    expect(html).toMatch(/characterListStatus\(p\),?\s*\]\.join\(" · "\)/);
  });

  it("shows the latest Master rejection note to the player", () => {
    expect(activeBridge).toContain('p._serverStatus === "rejected"');
    expect(activeBridge).toContain('event.eventType === "character_rejected"');
    expect(activeBridge).toContain('el("b", null, "Nota do Mestre")');
    expect(activeBridge).toContain("rejection.payload.note.trim()");
    expect(activeBridge).toContain("O Mestre devolveu a ficha sem observação.");
  });

  it("only renders review controls in verified Master mode", () => {
    expect(activeBridge).toContain('if (adminMode && p._serverStatus === "submitted")');
  });

  it("makes local/server synchronization explicit and conflict-safe", () => {
    expect(activeBridge).toContain("hasLocalSyncWork");
    expect(activeBridge).toContain("_serverSyncBaseVersion");
    expect(activeBridge).toContain("stale_character_version");
    expect(activeBridge).toContain("server_record_missing");
    expect(activeBridge).toContain("discardLocalChanges");
    expect(activeBridge).toContain("if (adminMode && !p._serverId) return;");
    expect(activeBridge).toContain("Alteração local pendente");
    expect(activeBridge).toContain("Conflito de sincronização");
  });
});
