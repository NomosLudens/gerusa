import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AdminMesasPanel } from "@/components/AdminMesasPanel";
import { PlayerAvatarPlaceholder } from "@/components/PlayerAvatarPlaceholder";
import { TalResponsibleMasterPanel } from "@/components/TalResponsibleMasterPanel";
import { CommunityChatModerationPanel } from "@/components/CommunityChatModerationPanel";
import { PLAYER_ACCESS_APPS } from "@/lib/player-access";
import {
  listContinuityMapDocumentOptions,
  listContinuityMapMesaOptions,
  publishContinuityMapDocument,
  removeContinuityMap,
  type ContinuityMap,
  type ContinuityMapDocument,
  type ContinuityMapMesaOption,
} from "@/lib/continuity-maps.functions";

type AccessUser = {
  id: string;
  display_name: string | null;
  status: string;
  allowed_app_ids: string[];
  mesa_ids?: string[];
};
type AdminMesa = { id: string; slug: string; name: string };
type AdminCharacter = {
  id: string;
  name: string;
  playerName: string;
  ownerDisplayName?: string;
  status: string;
  mesas: AdminMesa[];
  snapshot?: { completo?: boolean };
  publishedSnapshot?: { completo?: boolean } | null;
};
type ReadyPreset = {
  id: string;
  name: string;
  title: string;
  archetype: string;
  people: string;
  office: string;
  role: string;
};

export function MasterAdministrationPanel({ isSystemMaster }: { isSystemMaster: boolean }) {
  const [accessUsers, setAccessUsers] = useState<AccessUser[]>([]);
  const [adminMesas, setAdminMesas] = useState<AdminMesa[]>([]);
  const [selectedAccessUserId, setSelectedAccessUserId] = useState("");
  const [selectedAccessAppIds, setSelectedAccessAppIds] = useState<string[]>([]);
  const [selectedMesaIds, setSelectedMesaIds] = useState<string[]>([]);
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessStatusSaving, setAccessStatusSaving] = useState(false);
  const [selectedRecoveryUserId, setSelectedRecoveryUserId] = useState("");
  const [adminRecoveryCode, setAdminRecoveryCode] = useState("");
  const [recoveryCodeSaving, setRecoveryCodeSaving] = useState(false);
  const [revocationReason, setRevocationReason] = useState("saiu_da_mesa");
  const [adminCharacters, setAdminCharacters] = useState<AdminCharacter[]>([]);
  const [characterTemplates, setCharacterTemplates] = useState<AdminCharacter[]>([]);
  const [readyPresets, setReadyPresets] = useState<ReadyPreset[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [selectedCharacterMesaIds, setSelectedCharacterMesaIds] = useState<string[]>([]);
  const [characterMesaSaving, setCharacterMesaSaving] = useState(false);
  const [masterCreatePlayerId, setMasterCreatePlayerId] = useState("");
  const [masterCreateMesaId, setMasterCreateMesaId] = useState("");
  const [masterCreateName, setMasterCreateName] = useState("");
  const [masterCreateSaving, setMasterCreateSaving] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [templateAssigning, setTemplateAssigning] = useState(false);
  const [createdTemplateId, setCreatedTemplateId] = useState("");
  const [continuityMesas, setContinuityMesas] = useState<ContinuityMapMesaOption[]>([]);
  const [continuityDocuments, setContinuityDocuments] = useState<ContinuityMapDocument[]>([]);
  const [continuityDocumentsLoading, setContinuityDocumentsLoading] = useState(false);
  const [selectedContinuityMesaId, setSelectedContinuityMesaId] = useState("");
  const [selectedContinuityAssetKey, setSelectedContinuityAssetKey] = useState("");
  const [continuityDocumentAction, setContinuityDocumentAction] = useState<string | null>(null);
  const [continuityUploadFile, setContinuityUploadFile] = useState<File | null>(null);
  const continuityUploadInputRef = useRef<HTMLInputElement>(null);

  const listContinuityMesasFn = useServerFn(listContinuityMapMesaOptions);
  const listContinuityDocumentsFn = useServerFn(listContinuityMapDocumentOptions);
  const publishContinuityDocumentFn = useServerFn(publishContinuityMapDocument);
  const removeContinuityMapFn = useServerFn(removeContinuityMap);

  useEffect(() => {
    if (!isSystemMaster) return;
    setAccessLoading(true);
    void fetch("/api/admin/app-access", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { users?: AccessUser[]; mesas?: AdminMesa[] };
        if (!response.ok) throw new Error("Não foi possível carregar os acessos");
        const users = data.users ?? [];
        setAccessUsers(users);
        setAdminMesas(data.mesas ?? []);
        setMasterCreatePlayerId((current) => current || users[0]?.id || "");
        setMasterCreateMesaId((current) => current || data.mesas?.[0]?.id || "");
        if (users[0]) {
          setSelectedAccessUserId(users[0].id);
          setSelectedAccessAppIds(users[0].allowed_app_ids);
          setSelectedMesaIds(users[0].mesa_ids ?? []);
        }
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Falha ao carregar acessos"),
      )
      .finally(() => setAccessLoading(false));
  }, [isSystemMaster]);

  useEffect(() => {
    if (!isSystemMaster) return;
    setContinuityDocumentsLoading(true);
    void Promise.all([listContinuityMesasFn(), listContinuityDocumentsFn()])
      .then(([mesas, documents]) => {
        const nextMesas = [...mesas];
        const nextDocuments = [...documents];
        setContinuityMesas(nextMesas);
        setContinuityDocuments(nextDocuments);
        setSelectedContinuityMesaId(
          (current) => current || nextMesas[0]?.id || nextDocuments[0]?.mesaId || "",
        );
        setSelectedContinuityAssetKey((current) => current || nextDocuments[0]?.assetKey || "");
      })
      .catch((error) =>
        toast.error(
          error instanceof Error ? error.message : "Falha ao carregar os HTMLs da continuidade",
        ),
      )
      .finally(() => setContinuityDocumentsLoading(false));
  }, [isSystemMaster, listContinuityDocumentsFn, listContinuityMesasFn]);

  useEffect(() => {
    if (!isSystemMaster) return;
    void fetch("/api/admin/character-mesas", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as {
          characters?: AdminCharacter[];
          templates?: AdminCharacter[];
          presets?: ReadyPreset[];
        };
        if (!response.ok) throw new Error("Não foi possível carregar as personagens");
        const characters = data.characters ?? [];
        setCharacterTemplates(data.templates ?? []);
        setReadyPresets(data.presets ?? []);
        setSelectedTemplateId(
          data.presets?.[0]
            ? `preset:${data.presets[0].id}`
            : ((data.templates ?? [])[0]?.id ?? ""),
        );
        setAdminCharacters(characters);
        if (characters[0]) {
          setSelectedCharacterId(characters[0].id);
          setSelectedCharacterMesaIds(characters[0].mesas.map((mesa) => mesa.id));
        }
      })
      .catch((error) =>
        toast.error(error instanceof Error ? error.message : "Falha ao carregar personagens"),
      );
  }, [isSystemMaster]);

  if (!isSystemMaster) return null;

  const selectedAccessUser = accessUsers.find((user) => user.id === selectedAccessUserId);
  const selectedAccessRevoked = selectedAccessUser?.status === "disabled";
  const selectedContinuityDocument = continuityDocuments.find(
    (documento) =>
      documento.mesaId === selectedContinuityMesaId &&
      documento.assetKey === selectedContinuityAssetKey,
  );
  const continuityDocumentsForMesa = continuityDocuments.filter(
    (documento) => documento.mesaId === selectedContinuityMesaId,
  );

  function selectUser(userId: string) {
    const user = accessUsers.find((candidate) => candidate.id === userId);
    setSelectedAccessUserId(userId);
    setSelectedAccessAppIds(user?.allowed_app_ids ?? []);
    setSelectedMesaIds(user?.mesa_ids ?? []);
  }
  function toggleValue(setter: Dispatch<SetStateAction<string[]>>, value: string) {
    setter((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  }
  function selectCharacter(characterId: string) {
    const character = adminCharacters.find((candidate) => candidate.id === characterId);
    setSelectedCharacterId(characterId);
    setSelectedCharacterMesaIds(character?.mesas.map((mesa) => mesa.id) ?? []);
  }

  async function saveAccesses() {
    if (!selectedAccessUserId) return;
    setAccessSaving(true);
    try {
      const response = await fetch("/api/admin/app-access", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: selectedAccessUserId,
          allowed_app_ids: selectedAccessAppIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "Falha ao salvar acessos");
      setAccessUsers((current) =>
        current.map((user) =>
          user.id === selectedAccessUserId
            ? { ...user, allowed_app_ids: selectedAccessAppIds }
            : user,
        ),
      );
      toast.success("Acessos do jogador salvos");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar acessos");
    } finally {
      setAccessSaving(false);
    }
  }
  async function savePlayerMesas() {
    if (!selectedAccessUserId) return;
    setAccessSaving(true);
    try {
      const response = await fetch("/api/admin/mesa-memberships", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user_id: selectedAccessUserId, mesa_ids: selectedMesaIds }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        provisioning?: Array<{ status?: string }>;
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "Falha ao salvar Mesas");
      setAccessUsers((current) =>
        current.map((user) =>
          user.id === selectedAccessUserId ? { ...user, mesa_ids: selectedMesaIds } : user,
        ),
      );
      if (data?.provisioning?.some((entry) => entry.status === "pending"))
        toast.warning("Mesas salvas no KALLISTIS; Gravewright está pendente de sincronização.");
      else toast.success("Mesas do jogador salvas e sincronizadas com Gravewright");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar Mesas");
    } finally {
      setAccessSaving(false);
    }
  }
  async function generateRecoveryCode() {
    setRecoveryCodeSaving(true);
    try {
      const response = await fetch("/api/admin/recovery-code", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(selectedRecoveryUserId ? { user_id: selectedRecoveryUserId } : {}),
      });
      const data = (await response.json().catch(() => null)) as {
        recoveryCode?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.recoveryCode) {
        throw new Error(data?.error ?? "Falha ao gerar código de recuperação");
      }
      setAdminRecoveryCode(data.recoveryCode);
      toast.success("Código gerado. Ele será exibido somente nesta tela.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao gerar código de recuperação");
    } finally {
      setRecoveryCodeSaving(false);
    }
  }
  async function changeAccessStatus(action: "revoke" | "restore") {
    const user = accessUsers.find((candidate) => candidate.id === selectedAccessUserId);
    if (!user) return;
    if (
      action === "revoke" &&
      !window.confirm(
        `Revogar acesso de ${user.display_name?.trim() || "este jogador"}?\n\nO jogador perderá imediatamente o acesso ao KALLISTIS. Personagens e histórico serão preservados.`,
      )
    )
      return;
    setAccessStatusSaving(true);
    try {
      const response = await fetch("/api/admin/player-access-status", {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          user_id: user.id,
          action,
          reason: action === "revoke" ? revocationReason : null,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        status?: "active" | "revoked";
        error?: string;
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "Falha ao alterar acesso");
      setAccessUsers((current) =>
        current.map((candidate) =>
          candidate.id === user.id
            ? { ...candidate, status: data?.status === "revoked" ? "disabled" : "active" }
            : candidate,
        ),
      );
      toast.success(action === "revoke" ? "Acesso revogado" : "Acesso restaurado");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao alterar acesso");
    } finally {
      setAccessStatusSaving(false);
    }
  }
  async function saveCharacterMesas() {
    if (!selectedCharacterId) return;
    setCharacterMesaSaving(true);
    try {
      const response = await fetch("/api/admin/character-mesas", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          character_id: selectedCharacterId,
          mesa_ids: selectedCharacterMesaIds,
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        character?: AdminCharacter;
        error?: string;
        gravewright_sync?: { status?: string };
      } | null;
      if (!response.ok || !data?.character)
        throw new Error(data?.error ?? "Falha ao salvar Mesas da personagem");
      setAdminCharacters((current) =>
        current.map((character) =>
          character.id === selectedCharacterId ? data.character! : character,
        ),
      );
      if (data.gravewright_sync?.status === "pending")
        toast.warning("Mesas salvas; personagem pendente de sincronização com Gravewright.");
      else if (data.gravewright_sync?.status === "synced")
        toast.success("Mesas e personagem sincronizados com Gravewright");
      else toast.success("Mesas da personagem salvas");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao salvar Mesas da personagem");
    } finally {
      setCharacterMesaSaving(false);
    }
  }
  async function retryCharacterSync() {
    if (!selectedCharacterId || characterMesaSaving) return;
    setCharacterMesaSaving(true);
    try {
      const response = await fetch("/api/admin/character-mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "sync_character", character_id: selectedCharacterId }),
      });
      const data = (await response.json().catch(() => null)) as {
        error?: string;
        gravewright_sync?: { status?: string };
      } | null;
      if (!response.ok) throw new Error(data?.error ?? "Falha ao sincronizar personagem");
      if (data?.gravewright_sync?.status === "synced")
        toast.success("Personagem sincronizado com Gravewright");
      else toast.warning("Sincronização ainda pendente; verifique vínculo de Mesa e memberships.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao sincronizar personagem");
    } finally {
      setCharacterMesaSaving(false);
    }
  }
  async function createCharacter() {
    if (!masterCreatePlayerId || !masterCreateMesaId) return;
    setMasterCreateSaving(true);
    try {
      const response = await fetch("/api/admin/character-mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "create",
          owner_user_id: masterCreatePlayerId,
          name: masterCreateName.trim(),
          mesa_ids: [masterCreateMesaId],
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        character?: AdminCharacter;
        error?: string;
        gravewright_sync?: { status?: string };
      } | null;
      if (!response.ok || !data?.character)
        throw new Error(data?.error ?? "Falha ao criar personagem");
      setAdminCharacters((current) => [data.character!, ...current]);
      setSelectedCharacterId(data.character.id);
      setSelectedCharacterMesaIds(data.character.mesas.map((mesa) => mesa.id));
      setMasterCreateName("");
      toast.success("Rascunho criado para o jogador");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar personagem");
    } finally {
      setMasterCreateSaving(false);
    }
  }
  async function createCharacterTemplate() {
    setTemplateSaving(true);
    try {
      const response = await fetch("/api/admin/character-mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "create_template", name: templateName.trim() }),
      });
      const data = (await response.json().catch(() => null)) as {
        character?: AdminCharacter;
        error?: string;
      } | null;
      if (!response.ok || !data?.character)
        throw new Error(data?.error ?? "Falha ao criar ficha-base");
      setAdminCharacters((current) => [data.character!, ...current]);
      setCreatedTemplateId(data.character.id);
      setTemplateName("");
      toast.success("Rascunho-base criado. Complete e aprove a ficha antes de atribuí-la.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao criar ficha-base");
    } finally {
      setTemplateSaving(false);
    }
  }
  async function assignCharacterTemplate() {
    if (!selectedTemplateId || !masterCreatePlayerId || !masterCreateMesaId) return;
    setTemplateAssigning(true);
    try {
      const response = await fetch("/api/admin/character-mesas", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "assign_template",
          template_id: selectedTemplateId,
          owner_user_id: masterCreatePlayerId,
          mesa_ids: [masterCreateMesaId],
        }),
      });
      const data = (await response.json().catch(() => null)) as {
        character?: AdminCharacter;
        error?: string;
        gravewright_sync?: { status?: string };
      } | null;
      if (!response.ok || !data?.character)
        throw new Error(data?.error ?? "Falha ao atribuir personagem pronta");
      setAdminCharacters((current) => [data.character!, ...current]);
      setSelectedCharacterId(data.character.id);
      setSelectedCharacterMesaIds(data.character.mesas.map((mesa) => mesa.id));
      if (data.gravewright_sync?.status === "pending")
        toast.warning("Personagem atribuída no KALLISTIS; sincronização com Gravewright pendente.");
      else
        toast.success(
          selectedTemplateId.startsWith("preset:")
            ? "Cópia atribuída e sincronizada com Gravewright."
            : "Cópia atribuída e sincronizada com Gravewright.",
        );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao atribuir personagem pronta");
    } finally {
      setTemplateAssigning(false);
    }
  }
  async function publishHtml() {
    if (!selectedContinuityMesaId || !selectedContinuityAssetKey) return;
    const actionKey = `publish:${selectedContinuityMesaId}:${selectedContinuityAssetKey}`;
    setContinuityDocumentAction(actionKey);
    try {
      const document = await publishContinuityDocumentFn({
        data: { mesa_id: selectedContinuityMesaId, asset_key: selectedContinuityAssetKey },
      });
      setContinuityDocuments((current) =>
        current.map((item) =>
          item.mesaId === document.mesa_id && item.assetKey === document.asset_key
            ? { ...item, mapId: document.id, publishedAt: document.published_at }
            : item,
        ),
      );
      toast.success("HTML liberado para os jogadores da Mesa");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao liberar HTML");
    } finally {
      setContinuityDocumentAction(null);
    }
  }
  async function uploadHtml() {
    if (!continuityUploadFile || !selectedContinuityMesaId) return;
    setContinuityDocumentAction(`upload:${selectedContinuityMesaId}`);
    try {
      const form = new FormData();
      form.append("mesa_id", selectedContinuityMesaId);
      form.append("file", continuityUploadFile, continuityUploadFile.name);
      const response = await fetch("/api/continuity-maps/documents", {
        method: "POST",
        credentials: "same-origin",
        body: form,
      });
      const data = (await response.json().catch(() => null)) as {
        document?: ContinuityMap;
        error?: string;
      } | null;
      if (!response.ok || !data?.document?.asset_key)
        throw new Error(data?.error ?? "Falha ao enviar HTML");
      const document = data.document;
      const assetKey = document.asset_key;
      if (!assetKey) throw new Error("Falha ao enviar HTML");
      const mesaName = continuityMesas.find((mesa) => mesa.id === document.mesa_id)?.name ?? "Mesa";
      setContinuityDocuments((current) => [
        ...current,
        {
          mesaId: document.mesa_id,
          mesaName,
          assetKey,
          title: document.titulo,
          mapId: document.id,
          publishedAt: document.published_at,
        },
      ]);
      setSelectedContinuityAssetKey(assetKey);
      setContinuityUploadFile(null);
      if (continuityUploadInputRef.current) continuityUploadInputRef.current.value = "";
      toast.success("HTML enviado e liberado para os jogadores");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao enviar HTML");
    } finally {
      setContinuityDocumentAction(null);
    }
  }
  async function removeHtml(document: ContinuityMapDocument) {
    if (
      !document.mapId ||
      !window.confirm(`Retirar “${document.title}” da Mesa ${document.mesaName}?`)
    )
      return;
    setContinuityDocumentAction(`remove:${document.mapId}`);
    try {
      await removeContinuityMapFn({ data: { mapa_id: document.mapId } });
      setContinuityDocuments((current) =>
        current.map((item) =>
          item.mapId === document.mapId ? { ...item, mapId: null, publishedAt: null } : item,
        ),
      );
      toast.success("HTML retirado da visão dos jogadores");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Falha ao retirar HTML");
    } finally {
      setContinuityDocumentAction(null);
    }
  }

  return (
    <section
      className="mt-8 space-y-5 rounded-2xl border border-white/10 bg-[#0C0B12]/45 p-4 sm:p-5"
      aria-label="Administração operacional do Mestre"
    >
      <header className="border-b border-white/10 pb-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[color:var(--gold)]">
          Administração da Mesa
        </p>
        <h2 className="mt-1 text-xl font-semibold">Governança operacional</h2>
        <p className="mt-1 text-xs text-[#F3EBDD]/55">
          Ações que afetam Mesas, jogadores, personagens, acessos e publicações.
        </p>
      </header>
      <CommunityChatModerationPanel />
      <AdminMesasPanel />
      {adminMesas.length ? (
        <TalResponsibleMasterPanel mesas={adminMesas} initiallyTal={isSystemMaster} />
      ) : null}
      <section className="space-y-5 rounded-xl border border-[color:var(--gold)]/40 p-4">
        <div>
          <h3 className="text-sm text-[color:var(--gold)]">Código de recuperação</h3>
          <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
            Gere um novo código apenas quando o jogador tiver perdido o código anterior. O valor
            aparece uma vez e não pode ser consultado depois.
          </p>
        </div>
        <label className="block text-xs text-[color:var(--ivory-dim)]" htmlFor="recovery-target">
          Conta destinatária
          <select
            id="recovery-target"
            value={selectedRecoveryUserId}
            onChange={(event) => {
              setSelectedRecoveryUserId(event.target.value);
              setAdminRecoveryCode("");
            }}
            className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
          >
            <option value="">Minha conta (Mestre)</option>
            {accessUsers
              .filter((user) => user.status === "active")
              .map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name || "Perfil sem nome"}
                </option>
              ))}
          </select>
        </label>
        <Button
          type="button"
          onClick={() => void generateRecoveryCode()}
          disabled={recoveryCodeSaving}
          className="h-10 px-5"
        >
          {recoveryCodeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Gerar novo código"}
        </Button>
        {adminRecoveryCode ? (
          <div className="space-y-2 rounded-xl border border-[color:var(--gold)]/40 p-4">
            <p className="text-xs text-[color:var(--ivory-dim)]">Código exibido uma única vez:</p>
            <p
              className="font-mono text-lg tracking-[0.14em] text-[color:var(--ivory)]"
              aria-label="Código de recuperação gerado"
            >
              {adminRecoveryCode}
            </p>
            <p className="text-xs text-[color:var(--ivory-dim)]">
              Entregue pelo canal seguro do Mestre. Não copie para logs ou relatórios.
            </p>
          </div>
        ) : null}
      </section>
      <section
        className="space-y-5 rounded-xl border border-[color:var(--gold)]/40 p-4"
        aria-label="Criar personagem para jogador"
      >
        <div
          className="space-y-3 rounded-lg border border-white/10 p-3"
          aria-label="Banco de personagens prontos"
        >
          <div>
            <h3 className="text-sm text-[color:var(--gold)]">Banco de personagens prontos</h3>
            <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
              Escolha um dos dez presets iniciais ou uma ficha completa aprovada. A atribuição cria
              uma cópia própria e exige que o jogador já pertença à Mesa.
            </p>
          </div>
          {readyPresets.length || characterTemplates.length ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs text-[color:var(--ivory-dim)]">
                Personagem pronta
                <select
                  value={selectedTemplateId}
                  onChange={(event) => setSelectedTemplateId(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
                >
                  {readyPresets.map((preset) => (
                    <option key={`preset:${preset.id}`} value={`preset:${preset.id}`}>
                      {preset.name} — {preset.title} ({preset.people} · {preset.office} ·{" "}
                      {preset.role})
                    </option>
                  ))}
                  {characterTemplates.map((character) => (
                    <option key={character.id} value={character.id}>
                      {character.name || "Ficha aprovada"} — ficha do banco
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[color:var(--ivory-dim)]">
                Jogador
                <select
                  value={masterCreatePlayerId}
                  onChange={(event) => setMasterCreatePlayerId(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
                >
                  {accessUsers
                    .filter((user) => user.status === "active")
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.display_name || "Perfil sem nome"}
                      </option>
                    ))}
                </select>
              </label>
              <label className="text-xs text-[color:var(--ivory-dim)]">
                Mesa
                <select
                  value={masterCreateMesaId}
                  onChange={(event) => setMasterCreateMesaId(event.target.value)}
                  className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
                >
                  {adminMesas.map((mesa) => (
                    <option key={mesa.id} value={mesa.id}>
                      {mesa.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : (
            <p className="text-sm text-[color:var(--ivory-dim)]">
              Nenhum preset disponível. Crie uma ficha-base, complete no Forge e envie para
              aprovação.
            </p>
          )}
          {(readyPresets.length > 0 || characterTemplates.length > 0) && (
            <Button
              type="button"
              onClick={() => void assignCharacterTemplate()}
              disabled={
                templateAssigning ||
                !selectedTemplateId ||
                !masterCreatePlayerId ||
                !masterCreateMesaId
              }
              className="h-10 px-5"
            >
              {templateAssigning ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Atribuir cópia ao jogador"
              )}
            </Button>
          )}
          <div className="flex flex-wrap items-end gap-3 border-t border-white/10 pt-3">
            <label className="min-w-56 flex-1 text-xs text-[color:var(--ivory-dim)]">
              Nova ficha-base
              <input
                value={templateName}
                onChange={(event) => setTemplateName(event.target.value)}
                maxLength={160}
                placeholder="Nome para localizar no banco"
                className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
              />
            </label>
            <Button
              type="button"
              onClick={() => void createCharacterTemplate()}
              disabled={templateSaving}
              className="h-10 px-5"
            >
              {templateSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar ficha-base"}
            </Button>
            {createdTemplateId && (
              <a
                className="self-center text-sm underline text-[color:var(--gold)]"
                href={`/microapp?mode=tal&characterId=${encodeURIComponent(createdTemplateId)}&source=master-characters-hub`}
              >
                Abrir rascunho no Forge
              </a>
            )}
          </div>
        </div>
        <div>
          <h3 className="text-sm text-[color:var(--gold)]">Criar personagem para um jogador</h3>
          <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
            Cria um rascunho vazio atribuído ao jogador e à Mesa escolhidos.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="text-xs text-[color:var(--ivory-dim)]">
            Jogador
            <select
              value={masterCreatePlayerId}
              onChange={(event) => setMasterCreatePlayerId(event.target.value)}
              className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
            >
              {accessUsers
                .filter((user) => user.status === "active")
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.display_name || "Perfil sem nome"}
                  </option>
                ))}
            </select>
          </label>
          <label className="text-xs text-[color:var(--ivory-dim)]">
            Mesa
            <select
              value={masterCreateMesaId}
              onChange={(event) => setMasterCreateMesaId(event.target.value)}
              className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
            >
              {adminMesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-[color:var(--ivory-dim)]">
            Nome inicial (opcional)
            <input
              value={masterCreateName}
              onChange={(event) => setMasterCreateName(event.target.value)}
              maxLength={160}
              placeholder="Sem nome"
              className="mt-2 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 text-sm"
            />
          </label>
        </div>
        <Button
          type="button"
          onClick={() => void createCharacter()}
          disabled={masterCreateSaving || !masterCreatePlayerId || !masterCreateMesaId}
          className="h-10 px-5"
        >
          {masterCreateSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Criar rascunho e atribuir"
          )}
        </Button>
      </section>
      <section
        className="space-y-5 rounded-xl border border-[color:var(--gold)]/40 p-4"
        aria-label="Acesso dos jogadores"
      >
        <div>
          <h3 className="text-sm text-[color:var(--gold)]">Acesso dos jogadores</h3>
          <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
            Escolha quais abas e Mesas cada jogador pode acessar.
          </p>
        </div>
        {accessLoading ? (
          <div className="text-sm text-[color:var(--ivory-dim)]">Carregando perfis…</div>
        ) : accessUsers.length === 0 ? (
          <div className="text-sm text-[color:var(--ivory-dim)]">
            Nenhum perfil de jogador disponível.
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2">
              <PlayerAvatarPlaceholder
                identity={selectedAccessUser?.display_name}
                sizeClassName="h-12 w-12"
              />
              <p className="text-xs text-[color:var(--ivory-dim)]">
                Mini arte do jogador selecionado
              </p>
            </div>
            <select
              aria-label="Jogador"
              value={selectedAccessUserId}
              onChange={(event) => selectUser(event.target.value)}
              className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
            >
              {accessUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.display_name || "Perfil sem nome"}
                </option>
              ))}
            </select>
            <div className="rounded-lg border border-[color:var(--border)] px-3 py-3 text-sm">
              <p className="text-[color:var(--ivory-dim)]">
                Estado do acesso:{" "}
                <strong className="text-[color:var(--ivory)]">
                  {selectedAccessRevoked ? "revogado" : "ativo"}
                </strong>
              </p>
              {!selectedAccessRevoked ? (
                <select
                  aria-label="Motivo da revogação"
                  value={revocationReason}
                  onChange={(event) => setRevocationReason(event.target.value)}
                  className="mt-3 w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
                >
                  <option value="saiu_da_mesa">Saiu da Mesa</option>
                  <option value="expulso">Expulso</option>
                  <option value="suspensao_temporaria">Suspensão temporária</option>
                  <option value="outro">Outro</option>
                </select>
              ) : null}
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  void changeAccessStatus(selectedAccessRevoked ? "restore" : "revoke")
                }
                disabled={accessStatusSaving || !selectedAccessUserId}
                className="mt-3 h-10 px-5"
              >
                {accessStatusSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectedAccessRevoked ? (
                  "Restaurar acesso"
                ) : (
                  "Revogar acesso"
                )}
              </Button>
            </div>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                Abas permitidas
              </legend>
              {PLAYER_ACCESS_APPS.map((app) => (
                <label
                  key={app.id}
                  className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--ivory-dim)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedAccessAppIds.includes(app.id)}
                    onChange={() => toggleValue(setSelectedAccessAppIds, app.id)}
                    disabled={selectedAccessRevoked}
                  />
                  {app.label}
                </label>
              ))}
            </fieldset>
            <Button
              type="button"
              onClick={() => void saveAccesses()}
              disabled={accessSaving || selectedAccessRevoked || !selectedAccessUserId}
              className="h-10 px-5"
            >
              {accessSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Salvar acessos"}
            </Button>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                Mesas atribuídas pelo Mestre
              </legend>
              {adminMesas.map((mesa) => (
                <label
                  key={mesa.id}
                  className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--ivory-dim)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedMesaIds.includes(mesa.id)}
                    onChange={() => toggleValue(setSelectedMesaIds, mesa.id)}
                    disabled={selectedAccessRevoked}
                  />
                  {mesa.name}
                </label>
              ))}
            </fieldset>
            <Button
              type="button"
              onClick={() => void savePlayerMesas()}
              disabled={accessSaving || selectedAccessRevoked || !selectedAccessUserId}
              className="h-10 px-5"
            >
              {accessSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar Mesas do jogador"
              )}
            </Button>
          </>
        )}
      </section>
      <section
        className="space-y-5 rounded-xl border border-[color:var(--gold)]/40 p-4"
        aria-label="Mapa da Continuidade"
      >
        <div>
          <h3 className="text-sm text-[color:var(--gold)]">Mapa da Continuidade</h3>
          <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
            Libere e retire HTMLs sem spoilers para os jogadores de cada Mesa.
          </p>
        </div>
        {continuityDocumentsLoading ? (
          <div className="text-sm text-[color:var(--ivory-dim)]">Carregando documentos…</div>
        ) : continuityMesas.length === 0 ? (
          <div className="text-sm text-[color:var(--ivory-dim)]">
            Nenhuma Mesa disponível para publicação.
          </div>
        ) : (
          <>
            <label
              htmlFor="master-continuity-mesa"
              className="block text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]"
            >
              Mesa
            </label>
            <select
              id="master-continuity-mesa"
              value={selectedContinuityMesaId}
              onChange={(event) => {
                const mesaId = event.target.value;
                setSelectedContinuityMesaId(mesaId);
                setSelectedContinuityAssetKey(
                  continuityDocuments.find((documento) => documento.mesaId === mesaId)?.assetKey ??
                    "",
                );
              }}
              className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
            >
              {continuityMesas.map((mesa) => (
                <option key={mesa.id} value={mesa.id}>
                  {mesa.name}
                </option>
              ))}
            </select>
            <div className="space-y-3 rounded-xl border border-[color:var(--border)] p-3">
              <p className="text-sm text-[color:var(--ivory)]">Enviar outro HTML</p>
              <div className="flex flex-wrap items-center gap-2">
                <label
                  htmlFor="master-continuity-upload"
                  className="inline-flex h-10 cursor-pointer items-center rounded-lg border border-[color:var(--border)] px-4 text-sm text-[color:var(--ivory)]"
                >
                  Escolher HTML
                  <input
                    ref={continuityUploadInputRef}
                    id="master-continuity-upload"
                    type="file"
                    accept=".html,.htm,text/html"
                    className="sr-only"
                    onChange={(event) => setContinuityUploadFile(event.target.files?.[0] ?? null)}
                  />
                </label>
                <span className="max-w-full truncate text-xs text-[color:var(--ivory-dim)]">
                  {continuityUploadFile?.name ?? "Nenhum arquivo escolhido"}
                </span>
                <Button
                  type="button"
                  onClick={() => void uploadHtml()}
                  disabled={
                    !continuityUploadFile ||
                    !selectedContinuityMesaId ||
                    continuityDocumentAction !== null
                  }
                  className="h-10 px-4"
                >
                  {continuityDocumentAction?.startsWith("upload:") ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Enviar HTML e liberar"
                  )}
                </Button>
              </div>
              <p className="text-[11px] text-[color:var(--ivory-dim)]">
                HTML autocontido de até 2 MB, sem scripts, iframes ou recursos externos.
              </p>
            </div>
            {continuityDocumentsForMesa.length > 0 ? (
              <>
                <label
                  htmlFor="master-continuity-document"
                  className="block text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]"
                >
                  HTML preparado
                </label>
                <select
                  id="master-continuity-document"
                  value={selectedContinuityAssetKey}
                  onChange={(event) => setSelectedContinuityAssetKey(event.target.value)}
                  className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
                >
                  {continuityDocumentsForMesa.map((documento) => (
                    <option key={documento.assetKey} value={documento.assetKey}>
                      {documento.title}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={() => void publishHtml()}
                  disabled={
                    !selectedContinuityDocument ||
                    Boolean(selectedContinuityDocument.mapId) ||
                    continuityDocumentAction !== null
                  }
                  className="h-10 px-5"
                >
                  {selectedContinuityDocument?.mapId
                    ? "HTML já liberado"
                    : "Liberar HTML para jogadores"}
                </Button>
              </>
            ) : (
              <div className="text-sm text-[color:var(--ivory-dim)]">
                Nenhum HTML preparado para esta Mesa. Envie um arquivo acima.
              </div>
            )}
            <div className="space-y-2">
              {continuityDocuments.map((documento) => (
                <div
                  key={`${documento.mesaId}:${documento.assetKey}`}
                  className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[color:var(--ivory)]">{documento.mesaName}</p>
                    <p className="text-xs text-[color:var(--ivory-dim)]">{documento.title}</p>
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.16em] text-[color:var(--ivory-dim)]">
                    {documento.mapId ? "liberado" : "não liberado"}
                  </span>
                  {documento.mapId ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void removeHtml(documento)}
                      disabled={continuityDocumentAction !== null}
                      className="h-9 px-3 text-xs"
                    >
                      {continuityDocumentAction === `remove:${documento.mapId}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Retirar"
                      )}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </>
        )}
      </section>
      <section
        className="space-y-5 rounded-xl border border-[color:var(--gold)]/40 p-4"
        aria-label="Mesas das personagens"
      >
        <div>
          <h3 className="text-sm text-[color:var(--gold)]">Mesas das personagens</h3>
          <p className="mt-1 text-xs text-[color:var(--ivory-dim)]">
            O Mestre define uma ou várias Mesas para cada personagem.
          </p>
        </div>
        {adminCharacters.length === 0 ? (
          <div className="text-sm text-[color:var(--ivory-dim)]">
            Nenhuma personagem disponível.
          </div>
        ) : (
          <>
            <select
              value={selectedCharacterId}
              onChange={(event) => selectCharacter(event.target.value)}
              className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
              aria-label="Personagem"
            >
              {adminCharacters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name || "Personagem sem nome"} —{" "}
                  {character.playerName || character.ownerDisplayName || "sem jogador"}
                </option>
              ))}
            </select>
            <fieldset className="grid gap-2 sm:grid-cols-2">
              <legend className="mb-2 block text-[10px] uppercase tracking-[0.22em] text-[color:var(--ivory-dim)]">
                Mesas da personagem
              </legend>
              {adminMesas.map((mesa) => (
                <label
                  key={mesa.id}
                  className="flex items-center gap-3 rounded-lg border border-[color:var(--border)] px-3 py-2 text-sm text-[color:var(--ivory-dim)]"
                >
                  <input
                    type="checkbox"
                    checked={selectedCharacterMesaIds.includes(mesa.id)}
                    onChange={() => toggleValue(setSelectedCharacterMesaIds, mesa.id)}
                  />
                  {mesa.name}
                </label>
              ))}
            </fieldset>
            <Button
              type="button"
              onClick={() => void saveCharacterMesas()}
              disabled={characterMesaSaving || !selectedCharacterId}
              className="h-10 px-5"
            >
              {characterMesaSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Salvar Mesas da personagem"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void retryCharacterSync()}
              disabled={characterMesaSaving || !selectedCharacterId}
              className="ml-2 h-10 px-5"
            >
              Tentar sincronização com Gravewright
            </Button>
          </>
        )}
      </section>
    </section>
  );
}
