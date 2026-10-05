import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

type MesaUser = {
  id: string;
  display_name: string | null;
  email?: string | null;
  status: "active" | "disabled";
};
type MesaMember = {
  id: string;
  display_name: string | null;
  email?: string | null;
  role: "mestre" | "jogador";
};
type ManagedMesa = {
  id: string;
  slug: string;
  name: string;
  vtt_available: boolean;
  vtt_campaign_id: string | null;
  members: MesaMember[];
};
type MesaAdminState = { users: MesaUser[]; mesas: ManagedMesa[] };
type ExistingCampaign = { id: string; name: string };
type Step = "name" | "members" | "review";

const inputClass =
  "mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm";
const choiceClass =
  "flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--ivory-dim)]";

function labelFor(user: MesaUser | MesaMember) {
  const name = user.display_name?.trim();
  if (name && user.email) return `${name} · ${user.email}`;
  if (name || user.email) return name || user.email || "Perfil sem nome";
  return `Perfil sem nome · ${user.id.slice(0, 8)}`;
}

function errorLabel(error: unknown) {
  const code = error instanceof Error ? error.message : "";
  const labels: Record<string, string> = {
    master_required: "Escolha pelo menos um Mestre.",
    member_role_conflict: "A mesma pessoa não pode ser Mestre e jogador.",
    member_not_found_or_inactive: "Uma das pessoas escolhidas não está ativa.",
    mesa_not_found: "Mesa não encontrada.",
    gravewright_unavailable: "Mesa salva; Gravewright está indisponível para sincronização.",
    vtt_not_configured: "Mesa salva; provisionamento VTT ainda não está configurado.",
    gravewright_invalid_response: "Mesa salva; Gravewright devolveu uma resposta inválida.",
    gravewright_campaign_list_invalid_response: "Gravewright devolveu uma lista inválida.",
    gravewright_link_invalid_response: "Gravewright devolveu um vínculo inválido.",
    invalid_campaign_id: "Campanha Gravewright inválida.",
    vtt_campaign_not_found: "Campanha Gravewright não encontrada ou inelegível.",
    vtt_mapping_conflict: "A Mesa já possui outro vínculo VTT; revisão necessária.",
    vtt_campaign_already_mapped: "A campanha VTT já está vinculada a outra Mesa.",
  };
  return labels[code] ?? (code || "Não foi possível concluir a operação.");
}

export function AdminMesasPanel() {
  const [state, setState] = useState<MesaAdminState | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [name, setName] = useState("");
  const [createMasterIds, setCreateMasterIds] = useState<string[]>([]);
  const [createPlayerIds, setCreatePlayerIds] = useState<string[]>([]);
  const [manageMasterIds, setManageMasterIds] = useState<string[]>([]);
  const [managePlayerIds, setManagePlayerIds] = useState<string[]>([]);
  const [step, setStep] = useState<Step>("name");
  const [selectedMesaId, setSelectedMesaId] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [existingCampaigns, setExistingCampaigns] = useState<ExistingCampaign[]>([]);
  const [existingCampaignId, setExistingCampaignId] = useState("");
  const [existingCampaignsOpen, setExistingCampaignsOpen] = useState(false);
  const [existingCampaignsLoading, setExistingCampaignsLoading] = useState(false);
  const [existingCampaignLinking, setExistingCampaignLinking] = useState(false);

  async function load(options?: { quiet?: boolean }) {
    if (options?.quiet) setRefreshing(true);
    else setLoading(true);
    try {
      const response = await fetch("/api/admin/mesas", {
        credentials: "same-origin",
        cache: "no-store",
      });
      const data = (await response.json().catch(() => null)) as
        | (MesaAdminState & { error?: string })
        | null;
      if (!response.ok) throw new Error(data?.error ?? "Falha ao carregar Mesas");
      setState({ users: data?.users ?? [], mesas: data?.mesas ?? [] });
      setSelectedMesaId((current) => current || data?.mesas?.[0]?.id || "");
    } catch (error) {
      toast.error(errorLabel(error));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const selectedMesa = state?.mesas.find((mesa) => mesa.id === selectedMesaId);
  const playerCandidates = useMemo(
    () => (state?.users ?? []).filter((user) => !createMasterIds.includes(user.id)),
    [state?.users, createMasterIds],
  );
  const managePlayerCandidates = useMemo(
    () => (state?.users ?? []).filter((user) => !manageMasterIds.includes(user.id)),
    [state?.users, manageMasterIds],
  );

  useEffect(() => {
    if (!selectedMesa) return;
    setManageMasterIds(
      selectedMesa.members.filter((member) => member.role === "mestre").map((member) => member.id),
    );
    setManagePlayerIds(
      selectedMesa.members.filter((member) => member.role === "jogador").map((member) => member.id),
    );
    setExistingCampaigns([]);
    setExistingCampaignId("");
    setExistingCampaignsOpen(false);
  }, [selectedMesaId]);

  function toggle(setter: (value: (current: string[]) => string[]) => void, id: string) {
    setter((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  }

  function resetCreation() {
    setName("");
    setCreateMasterIds([]);
    setCreatePlayerIds([]);
    setStep("name");
  }

  async function createMesa() {
    if (!name.trim() || !createMasterIds.length || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/admin/mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          name: name.trim(),
          master_user_ids: createMasterIds,
          player_user_ids: createPlayerIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        ok?: boolean;
        error?: string;
        provisioning?: { status?: string };
      } | null;
      if (!response.ok || data?.ok !== true) throw new Error(data?.error ?? "mesa_create_failed");
      await load({ quiet: true });
      resetCreation();
      if (response.status === 202 || data.provisioning?.status === "pending")
        toast.warning("Mesa criada; sincronização com Gravewright pendente.");
      else toast.success("Mesa criada e provisionada no Gravewright.");
    } catch (error) {
      toast.error(errorLabel(error));
    } finally {
      setWorking(false);
    }
  }

  async function saveMemberships() {
    if (!selectedMesaId || !manageMasterIds.length || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/admin/mesa-memberships", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "replace_mesa",
          mesa_id: selectedMesaId,
          master_user_ids: manageMasterIds,
          player_user_ids: managePlayerIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        provisioning?: Array<{ status?: string; error?: string }>;
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "Falha ao salvar memberships");
      await load({ quiet: true });
      if (data?.provisioning?.some((entry) => entry.status === "pending"))
        toast.warning("Membros salvos no KALLISTIS; sincronização com Gravewright pendente.");
      else toast.success("Membros salvos e sincronizados com Gravewright.");
    } catch (error) {
      toast.error(errorLabel(error));
    } finally {
      setWorking(false);
    }
  }

  async function retryProvisioning() {
    if (!selectedMesaId || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/admin/mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "provision", mesa_id: selectedMesaId }),
      });
      const data = (await response.json().catch(() => null)) as {
        provisioning?: { error?: string };
        error?: string;
      } | null;
      if (response.ok && response.status !== 202) {
        await load({ quiet: true });
        toast.success("Mesa sincronizada com o Gravewright.");
        return;
      }
      throw new Error(data?.provisioning?.error ?? data?.error ?? "gravewright_provision_failed");
    } catch (error) {
      toast.error(errorLabel(error));
    } finally {
      setWorking(false);
    }
  }

  async function loadExistingCampaigns() {
    if (!selectedMesaId || existingCampaignsLoading || existingCampaignLinking) return;
    setExistingCampaignsLoading(true);
    setExistingCampaignsOpen(true);
    try {
      const response = await fetch("/api/admin/mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "list_existing_campaigns", mesa_id: selectedMesaId }),
      });
      const data = (await response.json().catch(() => null)) as {
        campaigns?: ExistingCampaign[];
        error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "gravewright_campaign_list_failed");
      setExistingCampaigns(Array.isArray(data?.campaigns) ? data.campaigns : []);
    } catch (error) {
      setExistingCampaigns([]);
      toast.error(errorLabel(error));
    } finally {
      setExistingCampaignsLoading(false);
    }
  }

  async function linkExistingCampaign() {
    if (!selectedMesaId || !existingCampaignId || existingCampaignLinking) return;
    setExistingCampaignLinking(true);
    try {
      const response = await fetch("/api/admin/mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "link_existing",
          mesa_id: selectedMesaId,
          campaign_id: existingCampaignId,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        mapping?: { campaign_name?: string };
        error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "gravewright_mapping_failed");
      await load({ quiet: true });
      setExistingCampaignsOpen(false);
      toast.success(`Campanha vinculada: ${data?.mapping?.campaign_name ?? existingCampaignId}.`);
    } catch (error) {
      toast.error(errorLabel(error));
    } finally {
      setExistingCampaignLinking(false);
    }
  }

  return (
    <section
      className="space-y-5 border border-[color:var(--gold)]/40 rounded-xl p-4"
      aria-label="Mesas"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm text-[color:var(--gold)]">Mesas</h2>
          <p className="mt-1 text-xs leading-relaxed text-[color:var(--ivory-dim)]">
            Crie e administre Mesas no KALLISTIS. O Mestre e os jogadores precisam ser escolhidos
            explicitamente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load({ quiet: true })}
          disabled={loading || refreshing}
          className="rounded-lg border border-[color:var(--border)] p-2 text-[color:var(--ivory-dim)]"
          aria-label="Atualizar Mesas"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-[color:var(--ivory-dim)]">
          <Loader2 className="h-4 w-4 animate-spin" /> carregando Mesas…
        </div>
      ) : !state ? (
        <p className="text-sm text-[color:var(--ivory-dim)]">Não foi possível carregar as Mesas.</p>
      ) : (
        <>
          <div className="space-y-4 rounded-xl border border-[color:var(--border)] p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm text-[color:var(--ivory)]">Criar nova Mesa</p>
                <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
                  Etapa {step === "name" ? "1" : step === "members" ? "2" : "3"} de 3 · nada é salvo
                  antes da revisão.
                </p>
              </div>
              {step !== "name" ? (
                <button
                  type="button"
                  onClick={resetCreation}
                  className="text-xs text-[color:var(--gold)]"
                >
                  Cancelar
                </button>
              ) : null}
            </div>
            {step === "name" ? (
              <>
                <label
                  className="block text-xs text-[color:var(--ivory-dim)]"
                  htmlFor="admin-mesa-name"
                >
                  Nome da Mesa
                  <input
                    id="admin-mesa-name"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    maxLength={120}
                    placeholder="Ex.: Companhia da Fresta"
                    className={inputClass}
                  />
                </label>
                <Button
                  type="button"
                  onClick={() => setStep("members")}
                  disabled={!name.trim()}
                  className="h-10 px-5"
                >
                  Escolher participantes
                </Button>
              </>
            ) : null}
            {step === "members" ? (
              <>
                <fieldset className="space-y-2">
                  <legend className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                    Mestre(s) — escolha obrigatória
                  </legend>
                  {state.users.map((user) => (
                    <label key={user.id} className={choiceClass}>
                      <input
                        type="checkbox"
                        checked={createMasterIds.includes(user.id)}
                        onChange={() => toggle(setCreateMasterIds, user.id)}
                      />
                      <span>{labelFor(user)}</span>
                    </label>
                  ))}
                </fieldset>
                <fieldset className="space-y-2">
                  <legend className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                    Jogadores — opcional
                  </legend>
                  {playerCandidates.map((user) => (
                    <label key={user.id} className={choiceClass}>
                      <input
                        type="checkbox"
                        checked={createPlayerIds.includes(user.id)}
                        onChange={() => toggle(setCreatePlayerIds, user.id)}
                      />
                      <span>{labelFor(user)}</span>
                    </label>
                  ))}
                </fieldset>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("name")}
                    className="h-10 px-4"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => setStep("review")}
                    disabled={!createMasterIds.length}
                    className="h-10 px-4"
                  >
                    Revisar Mesa
                  </Button>
                </div>
              </>
            ) : null}
            {step === "review" ? (
              <>
                <div className="rounded-lg border border-[color:var(--border)] p-3 text-sm">
                  <p className="text-[color:var(--ivory)]">{name.trim()}</p>
                  <p className="mt-2 text-xs text-[color:var(--ivory-dim)]">
                    Mestres:{" "}
                    {createMasterIds
                      .map((id) =>
                        labelFor(
                          state.users.find((user) => user.id === id) ?? {
                            id,
                            display_name: null,
                            status: "active",
                          },
                        ),
                      )
                      .join(", ")}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
                    Jogadores:{" "}
                    {createPlayerIds.length
                      ? createPlayerIds
                          .map((id) =>
                            labelFor(
                              state.users.find((user) => user.id === id) ?? {
                                id,
                                display_name: null,
                                status: "active",
                              },
                            ),
                          )
                          .join(", ")
                      : "nenhum selecionado"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep("members")}
                    className="h-10 px-4"
                  >
                    Voltar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => void createMesa()}
                    disabled={working}
                    className="h-10 px-4"
                  >
                    {working ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Criar Mesa e provisionar"
                    )}
                  </Button>
                </div>
              </>
            ) : null}
          </div>
          <div className="space-y-4 rounded-xl border border-[color:var(--border)] p-3">
            <div>
              <p className="text-sm text-[color:var(--ivory)]">Gerenciar Mesa existente</p>
              <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
                Altere Mestres, jogadores e papéis; a remoção preserva o histórico como saída.
              </p>
            </div>
            {state.mesas.length === 0 ? (
              <p className="text-sm text-[color:var(--ivory-dim)]">Nenhuma Mesa cadastrada.</p>
            ) : (
              <>
                <select
                  aria-label="Mesa para gerenciar"
                  value={selectedMesaId}
                  onChange={(event) => setSelectedMesaId(event.target.value)}
                  className={inputClass}
                >
                  {state.mesas.map((mesa) => (
                    <option key={mesa.id} value={mesa.id}>
                      {mesa.name}
                    </option>
                  ))}
                </select>
                {selectedMesa ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs">
                      <span className="text-[color:var(--ivory-dim)]">Gravewright</span>
                      <span
                        className={
                          selectedMesa.vtt_available ? "text-emerald-300" : "text-amber-300"
                        }
                      >
                        {selectedMesa.vtt_available
                          ? `disponível · ${selectedMesa.vtt_campaign_id ?? "campaign vinculada"}`
                          : "sincronização pendente"}
                      </span>
                    </div>
                    <fieldset className="space-y-2">
                      <legend className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                        Mestre(s)
                      </legend>
                      {state.users.map((user) => (
                        <label key={user.id} className={choiceClass}>
                          <input
                            type="checkbox"
                            checked={manageMasterIds.includes(user.id)}
                            onChange={() => toggle(setManageMasterIds, user.id)}
                          />
                          <span>{labelFor(user)}</span>
                        </label>
                      ))}
                    </fieldset>
                    <fieldset className="space-y-2">
                      <legend className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                        Jogadores
                      </legend>
                      {managePlayerCandidates.map((user) => (
                        <label key={user.id} className={choiceClass}>
                          <input
                            type="checkbox"
                            checked={managePlayerIds.includes(user.id)}
                            onChange={() => toggle(setManagePlayerIds, user.id)}
                          />
                          <span>{labelFor(user)}</span>
                        </label>
                      ))}
                    </fieldset>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        onClick={() => void saveMemberships()}
                        disabled={working || !manageMasterIds.length}
                        className="h-10 px-4"
                      >
                        {working ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          "Salvar memberships"
                        )}
                      </Button>
                      {!selectedMesa.vtt_available ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void loadExistingCampaigns()}
                          disabled={existingCampaignsLoading || existingCampaignLinking}
                          className="h-10 px-4"
                        >
                          {existingCampaignsLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Vincular campanha existente"
                          )}
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => void retryProvisioning()}
                        disabled={working}
                        className="h-10 px-4"
                      >
                        Tentar sincronização
                      </Button>
                    </div>
                    {existingCampaignsOpen ? (
                      <div className="space-y-3 rounded-lg border border-[color:var(--gold)]/40 p-3">
                        <p className="text-xs text-[color:var(--ivory-dim)]">
                          Selecione uma Campaign Gravewright existente. Esta operação cria somente o
                          vínculo persistente.
                        </p>
                        {existingCampaigns.length === 0 && !existingCampaignsLoading ? (
                          <p className="text-sm text-[color:var(--ivory-dim)]">
                            Nenhuma campanha elegível encontrada.
                          </p>
                        ) : null}
                        {existingCampaigns.length > 0 ? (
                          <select
                            aria-label="Campanha Gravewright existente"
                            value={existingCampaignId}
                            onChange={(event) => setExistingCampaignId(event.target.value)}
                            className={inputClass}
                          >
                            <option value="">Selecione uma campanha</option>
                            {existingCampaigns.map((campaign) => (
                              <option key={campaign.id} value={campaign.id}>
                                {campaign.name} · {campaign.id}
                              </option>
                            ))}
                          </select>
                        ) : null}
                        <Button
                          type="button"
                          onClick={() => void linkExistingCampaign()}
                          disabled={!existingCampaignId || existingCampaignLinking}
                          className="h-10 px-4"
                        >
                          {existingCampaignLinking ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            "Confirmar vínculo"
                          )}
                        </Button>
                      </div>
                    ) : null}
                  </>
                ) : null}
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
