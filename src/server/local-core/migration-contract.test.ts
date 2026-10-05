import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const migrationsDirectory = fileURLToPath(new URL("../../../db/migrations", import.meta.url));

describe("migrations locais", () => {
  it("mantêm a ordem mínima, sem autoridade Supabase", () => {
    const agenda = readFileSync(migrationsDirectory + "/0035_agenda_multiscope.sql", "utf8");
    expect(agenda).toContain("scope_type IN ('PRIVATE','MESA','GLOBAL','PLAYER')");
    expect(agenda).toContain("target_user_id = created_by");
    const names = [
      "0001_identity.sql",
      "0002_chat.sql",
      "0003_memory.sql",
      "0004_memory_atomic.sql",
      "0005_runtime_grants.sql",
      "0006_runtime_chat_grants.sql",
      "0025_campaigns.sql",
      "0027_memory_campaign_scope.sql",
      "0026_contexto_externo_scopes.sql",
      "0046_auth_identity_bridge.sql",
    ];
    for (const name of names)
      expect(readFileSync(`${migrationsDirectory}/${name}`, "utf8")).toBeTruthy();
    const atomic = readFileSync(`${migrationsDirectory}/0004_memory_atomic.sql`, "utf8");
    expect(atomic).not.toMatch(/auth\.uid|auth\.users|service_role/i);
    expect(atomic).toContain("FOR UPDATE");
    expect(atomic).toContain("array_length(p_source_ids, 1), 0) <> 5");
    expect(atomic).toContain("p_user_id");
    const memory = readFileSync(`${migrationsDirectory}/0003_memory.sql`, "utf8");
    expect(memory).toContain("'rascunho', 'em_revisao', 'confirmado', 'descartado'");
    expect(memory).toContain("domain IN ('memory')");
    expect(memory).toContain("source IN ('chat', 'manual', 'system')");
    const grants = readFileSync(`${migrationsDirectory}/0005_runtime_grants.sql`, "utf8");
    expect(grants).toContain("GRANT USAGE ON SCHEMA public TO kallistis");
    expect(grants).not.toContain("DELETE");
    const registroDelete = readFileSync(
      `${migrationsDirectory}/0055_registro_vivo_runtime_delete_grant.sql`,
      "utf8",
    );
    expect(registroDelete).toContain("GRANT DELETE ON TABLE public.registro_vivo TO kallistis");
    expect(registroDelete).not.toMatch(/TO\s+(anon|authenticated|PUBLIC)/i);
    expect(registroDelete).not.toContain("SECURITY DEFINER");
    const chatGrants = readFileSync(`${migrationsDirectory}/0006_runtime_chat_grants.sql`, "utf8");
    expect(chatGrants).toContain("GRANT INSERT ON TABLE public.chat_threads TO kallistis");
    expect(chatGrants).not.toMatch(/GRANT ALL|SUPERUSER|ALL TABLES|ALL SEQUENCES/i);
    const campaigns = readFileSync(`${migrationsDirectory}/0025_campaigns.sql`, "utf8");
    expect(campaigns).toContain("CREATE TABLE IF NOT EXISTS public.campaigns");
    expect(campaigns).toContain("REFERENCES public.mesas(id)");
    expect(campaigns).toContain("ADD COLUMN IF NOT EXISTS campaign_id");
    expect(campaigns).not.toContain("CREATE TABLE IF NOT EXISTS public.campaign_members");
    const contexts = readFileSync(
      `${migrationsDirectory}/0026_contexto_externo_scopes.sql`,
      "utf8",
    );
    expect(contexts).toContain("ADD COLUMN IF NOT EXISTS mesa_id");
    expect(contexts).toContain("ADD COLUMN IF NOT EXISTS campaign_id");
    expect(contexts).toContain("contexto_externo_scope_exclusive");
    expect(contexts).toContain("REFERENCES public.campaigns(id)");
    const memoryScope = readFileSync(
      `${migrationsDirectory}/0027_memory_campaign_scope.sql`,
      "utf8",
    );
    expect(memoryScope).toContain("ADD COLUMN IF NOT EXISTS campaign_id");
    expect(memoryScope).toContain("REFERENCES public.campaigns(id)");
    expect(memoryScope).toContain("CREATE OR REPLACE FUNCTION public.confirm_sediment_atomic");
    expect(memoryScope).toContain("t.campaign_id");
    expect(memoryScope).toContain("campaign_id)");
  });
});
