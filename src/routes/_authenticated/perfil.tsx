import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import {
  useProfile,
  saveProfile,
  uploadAvatar,
  type Gender,
  type TreatmentType,
  saveOnboarding,
} from "@/lib/use-profile";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { ContinuidadeKallistis } from "@/components/continuidade-kallistis";
import { PlayerAvatarPlaceholder } from "@/components/PlayerAvatarPlaceholder";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { RouteErrorBoundary, RouteNotFoundBoundary } from "@/components/loading-states";

export const Route = createFileRoute("/_authenticated/perfil")({
  component: PerfilPage,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});
function PerfilPage() {
  const { profile, onboarding, isSystemMaster, avatarSignedUrl, loading, error, reload } =
    useProfile();
  const [nome, setNome] = useState("");
  const [pronomes, setPronomes] = useState("");
  const [gender, setGender] = useState<Gender | "">("");
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [treatmentType, setTreatmentType] = useState<TreatmentType>("not_informed");
  const [treatmentCustom, setTreatmentCustom] = useState("");
  const [generalCommunity, setGeneralCommunity] = useState(false);
  const [vttPhraseConfigured, setVttPhraseConfigured] = useState(false);
  const [gravewrightUrl, setGravewrightUrl] = useState<string | null>(null);
  const [vttPhraseStatusLoading, setVttPhraseStatusLoading] = useState(true);
  const [vttPhraseStatusError, setVttPhraseStatusError] = useState(false);
  const [vttPhrase, setVttPhrase] = useState<string | null>(null);
  const [vttPhraseSaving, setVttPhraseSaving] = useState(false);
  const [autoGenerateVttPhrase, setAutoGenerateVttPhrase] = useState(false);
  const autoGenerateAttempted = useRef(false);
  const existingPhraseHandled = useRef(false);
  useEffect(() => {
    setAutoGenerateVttPhrase(
      new URLSearchParams(window.location.search).get("gravewright") === "1",
    );
  }, []);
  useEffect(() => {
    if (profile) {
      setNome(profile.display_name ?? "");
      setPronomes(profile.pronouns ?? "");
      setGender(profile.gender ?? "");
    }
    if (onboarding) {
      setTreatmentType(onboarding.treatment_type ?? "not_informed");
      setTreatmentCustom(onboarding.treatment_custom ?? "");
      setGeneralCommunity(onboarding.general_community);
    }
  }, [profile, onboarding]);
  useEffect(() => {
    if (loading) return;
    if (isSystemMaster) {
      setVttPhraseStatusLoading(false);
      return;
    }
    let cancelled = false;
    setVttPhraseStatusLoading(true);
    void fetch("/api/vtt/player-phrase", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const body = (await response.json().catch(() => null)) as {
          configured?: boolean;
          phrase?: string | null;
          gravewright_url?: string | null;
        } | null;
        if (!cancelled && response.ok) {
          setVttPhraseConfigured(body?.configured === true);
          setVttPhrase(body?.phrase ?? null);
          setGravewrightUrl(body?.gravewright_url ?? null);
        } else if (!cancelled) setVttPhraseStatusError(true);
      })
      .catch(() => {
        if (!cancelled) setVttPhraseStatusError(true);
      })
      .finally(() => {
        if (!cancelled) setVttPhraseStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [loading, profile, isSystemMaster]);
  async function salvarTudo() {
    setSaving(true);
    try {
      await saveProfile({
        display_name: nome.trim() || null,
        pronouns: pronomes.trim() || null,
        gender: gender === "" ? null : gender,
      });
      await reload();
      toast.success("Perfil salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar");
    } finally {
      setSaving(false);
    }
  }

  async function selecionarAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;
    setAvatarSaving(true);
    try {
      await uploadAvatar(file);
      await reload();
      toast.success("Avatar salvo");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao salvar avatar");
    } finally {
      setAvatarSaving(false);
    }
  }

  const gerarPalavraVtt = useCallback(async () => {
    if (vttPhraseConfigured && !window.confirm("A palavra atual será substituída. Continuar?"))
      return;
    setVttPhraseSaving(true);
    try {
      const response = await fetch("/api/vtt/player-phrase", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = (await response.json().catch(() => null)) as {
        phrase?: string;
        error?: string;
      } | null;
      if (!response.ok || !body?.phrase) {
        const messages: Record<string, string> = {
          unauthorized:
            "Sua sessão do KALLISTIS expirou ou não está autenticada. Entre novamente com Google e tente gerar a palavra.",
          active_player_slot_required:
            "Esta conta precisa estar vinculada a uma vaga ativa de jogador.",
          vtt_mesa_mapping_required:
            "Peça ao Mestre para vincular sua Mesa a uma campanha do VTT antes de gerar a palavra.",
          kallistis_identity_required:
            "A Mesa ainda precisa ser sincronizada com o Gravewright pelo Mestre.",
          player_membership_required: "Esta identidade ainda não tem acesso de jogador no VTT.",
          gravewright_unavailable:
            "O VTT está indisponível. Nenhuma palavra foi confirmada; tente novamente.",
          vtt_phrase_not_configured:
            "O acesso ao Gravewright ainda não está configurado. Avise o Mestre.",
          gravewright_phrase_sync_failed:
            "O Gravewright não confirmou a frase. Nenhuma frase foi mantida; tente novamente.",
          player_phrase_save_failed: "Não foi possível salvar a frase. Tente novamente.",
          player_phrase_pool_exhausted:
            "Todas as peças individuais já foram distribuídas. Peça uma revisão ao Mestre.",
          player_phrase_allocation_unavailable:
            "Não consegui confirmar quais peças já foram distribuídas. Nenhuma frase foi alterada.",
        };
        const errorCode = body?.error ?? "";
        throw new Error(
          messages[errorCode] ??
            (errorCode
              ? `O Gravewright recusou a peça (código: ${errorCode}). A palavra anterior foi preservada.`
              : "Não foi possível confirmar a peça no Gravewright. A palavra anterior foi preservada."),
        );
      }
      setVttPhrase(body.phrase);
      setVttPhraseConfigured(true);
      toast.success("Frase de entrada salva no KALLISTIS e no Gravewright");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao gerar palavra do VTT");
    } finally {
      setVttPhraseSaving(false);
    }
  }, [vttPhraseConfigured]);

  useEffect(() => {
    if (
      !autoGenerateVttPhrase ||
      isSystemMaster ||
      loading ||
      vttPhraseStatusLoading ||
      autoGenerateAttempted.current
    )
      return;

    if (vttPhraseStatusError) {
      autoGenerateAttempted.current = true;
      toast.error(
        "Não consegui verificar sua frase do Gravewright. Recarregue o Perfil para tentar novamente.",
      );
      return;
    }

    if (vttPhraseConfigured) {
      if (!existingPhraseHandled.current) {
        existingPhraseHandled.current = true;
        document
          .getElementById("gravewright-player-access")
          ?.scrollIntoView({ behavior: "smooth" });
        toast.info("Sua frase do Gravewright já existe. Se você a perdeu, substitua-a aqui.");
      }
      autoGenerateAttempted.current = true;
      return;
    }

    autoGenerateAttempted.current = true;
    void gerarPalavraVtt();
  }, [
    autoGenerateVttPhrase,
    gerarPalavraVtt,
    isSystemMaster,
    loading,
    vttPhraseConfigured,
    vttPhraseStatusError,
    vttPhraseStatusLoading,
  ]);

  useEffect(() => {
    if (vttPhrase) {
      document.getElementById("gravewright-player-access")?.scrollIntoView({ behavior: "smooth" });
    }
  }, [vttPhrase]);

  return (
    <div className="max-w-xl mx-auto px-4 py-8 sm:py-12">
      <h1 className="serif text-2xl text-[color:var(--gold)] tracking-[0.18em] uppercase mb-1">
        Perfil
      </h1>
      <p className="text-sm text-[color:var(--ivory-dim)] mb-8">
        Como Kallistis te chama e a foto que aparece nas suas mensagens.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-[color:var(--ivory-dim)]">
          <Loader2 className="w-4 h-4 animate-spin" /> carregando…
        </div>
      ) : error ? (
        <div className="text-sm text-[color:var(--ivory-dim)]" role="alert">
          Não foi possível carregar o perfil: {error}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="flex items-center gap-5">
            {avatarSignedUrl ? (
              <ProfileAvatar
                source={avatarSignedUrl}
                alt={`Avatar de ${profile?.display_name?.trim() || "seu perfil"}`}
                className="h-24 w-24 shrink-0 rounded-full border border-[color:var(--wine)] object-cover"
                fallback={
                  <PlayerAvatarPlaceholder
                    identity={profile?.display_name}
                    isSystemMaster={isSystemMaster}
                  />
                }
              />
            ) : (
              <PlayerAvatarPlaceholder
                identity={profile?.display_name}
                isSystemMaster={isSystemMaster}
              />
            )}
            <div className="space-y-2 text-xs leading-relaxed text-[color:var(--ivory-dim)]">
              <p>
                {avatarSignedUrl
                  ? "Avatar personalizado deste perfil."
                  : "Avatar ilustrado fixo para este perfil."}
              </p>
              <label
                htmlFor="perfil-avatar"
                className={`inline-flex cursor-pointer items-center rounded-lg border px-3 py-2 text-[color:var(--ivory)] ${avatarSaving ? "pointer-events-none opacity-60" : ""}`}
                style={{ borderColor: "color-mix(in oklab, var(--kallistis) 45%, transparent)" }}
              >
                {avatarSaving ? "Salvando avatar…" : "Escolher avatar"}
                <input
                  id="perfil-avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={selecionarAvatar}
                  disabled={avatarSaving}
                />
              </label>
              <p>PNG, JPG ou WebP até 4 MB.</p>
            </div>
          </section>

          <section className="space-y-4 border border-[color:var(--border)] rounded-xl p-4">
            <div>
              <h2 className="text-sm text-[color:var(--gold)]">Bem-vindo ao KALLISTIS</h2>
              <p className="text-xs text-[color:var(--ivory-dim)] mt-1">
                {isSystemMaster
                  ? "Como Mestre TAL, você tem acesso a todas as Mesas."
                  : "O Mestre define as Mesas da sua personagem; você escolhe apenas o alcance da comunidade."}
              </p>
            </div>
            <div className="rounded-lg border border-[color:var(--border)] px-3 py-2 text-xs text-[color:var(--ivory-dim)]">
              {isSystemMaster
                ? "Mestre TAL: escopo de todas as Mesas."
                : "Suas Mesas são atribuídas pelo Mestre. Você não precisa escolher uma Mesa aqui."}
            </div>
            <label
              className="block text-[10px] tracking-[0.22em] uppercase text-[color:var(--ivory-dim)]"
              htmlFor="tratamento"
            >
              Como prefere ser tratado?
            </label>
            <select
              id="tratamento"
              value={treatmentType}
              onChange={(e) => setTreatmentType(e.target.value as TreatmentType)}
              className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
            >
              <option value="ele_dele">Ele / dele</option>
              <option value="ela_dela">Ela / dela</option>
              <option value="elu_delu">Elu / delu</option>
              <option value="use_name">Use meu nome</option>
              <option value="not_informed">Prefiro não informar</option>
              <option value="other">Outro</option>
            </select>
            {treatmentType === "other" ? (
              <input
                value={treatmentCustom}
                onChange={(e) => setTreatmentCustom(e.target.value)}
                maxLength={120}
                required
                placeholder="Como prefere?"
                className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3"
              />
            ) : null}
            <fieldset className="space-y-2">
              <legend className="block text-[10px] tracking-[0.22em] uppercase text-[color:var(--ivory-dim)]">
                Quer participar da comunidade geral?
              </legend>
              <label className="flex items-center gap-3 text-sm text-[color:var(--ivory-dim)]">
                <input
                  type="radio"
                  name="comunidade-geral"
                  checked={generalCommunity}
                  onChange={() => setGeneralCommunity(true)}
                />{" "}
                Sim. Quero participar da comunidade geral.
              </label>
              <label className="flex items-center gap-3 text-sm text-[color:var(--ivory-dim)]">
                <input
                  type="radio"
                  name="comunidade-geral"
                  checked={!generalCommunity}
                  onChange={() => setGeneralCommunity(false)}
                />{" "}
                Não. Quero ficar somente nos espaços da minha Mesa.
              </label>
            </fieldset>
            <Button
              type="button"
              onClick={async () => {
                if (treatmentType === "other" && !treatmentCustom.trim()) {
                  toast.error("Informe como prefere ser tratado");
                  return;
                }
                setSaving(true);
                try {
                  await saveOnboarding({
                    treatment_type: treatmentType,
                    treatment_custom: treatmentType === "other" ? treatmentCustom.trim() : null,
                    general_community: generalCommunity,
                  });
                  await reload();
                  toast.success(
                    onboarding?.onboarding_completed ? "Preferências salvas" : "Entrada concluída",
                  );
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Falha ao salvar entrada");
                } finally {
                  setSaving(false);
                }
              }}
              disabled={saving}
              className="h-10 px-5"
            >
              {onboarding?.onboarding_completed ? "Salvar preferências" : "Entrar no KALLISTIS"}
            </Button>
          </section>

          <section className="space-y-2">
            <label
              htmlFor="apelido"
              className="block text-[10px] tracking-[0.22em] uppercase text-[color:var(--ivory-dim)]"
            >
              Apelido
            </label>
            <input
              id="apelido"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              maxLength={60}
              placeholder="Como eu te chamo?"
              className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 outline-none focus:border-[color:var(--gold)] text-base"
            />
          </section>

          <section className="space-y-2">
            <label
              htmlFor="pronomes"
              className="block text-[10px] tracking-[0.22em] uppercase text-[color:var(--ivory-dim)]"
            >
              Pronomes
            </label>
            <input
              id="pronomes"
              value={pronomes}
              onChange={(e) => setPronomes(e.target.value)}
              maxLength={80}
              placeholder="Como devo me referir a você?"
              className="w-full rounded-xl bg-card border border-[color:var(--border)] px-4 py-3 outline-none focus:border-[color:var(--gold)] text-base"
            />
          </section>

          <section className="space-y-2">
            <p className="block text-[10px] tracking-[0.22em] uppercase text-[color:var(--ivory-dim)]">
              Pronome de tratamento
            </p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { v: "feminino", label: "Bem-vinda" },
                  { v: "masculino", label: "Bem-vindo" },
                  { v: "neutro", label: "Bem-vinde" },
                ] as { v: Gender; label: string }[]
              ).map(({ v, label }) => {
                const active = gender === v;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setGender(v)}
                    className={
                      "px-3 h-9 rounded-full text-xs uppercase tracking-[0.18em] border transition " +
                      (active
                        ? "border-[color:var(--gold)] bg-[color:var(--wine)] text-[color:var(--ivory)]"
                        : "border-[color:var(--border)] text-[color:var(--ivory-dim)] hover:text-[color:var(--ivory)]")
                    }
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-[color:var(--ivory-dim)] pt-1">
              Define como Kallistis te saúda.
            </p>
          </section>

          <div className="flex justify-end pt-2">
            <Button onClick={salvarTudo} disabled={saving} className="h-10 px-5">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
            </Button>
          </div>

          {!isSystemMaster ? (
            <section
              id="gravewright-player-access"
              className="space-y-3 border-t border-[color:var(--border)] pt-5"
            >
              <div>
                <h2 className="text-sm text-[color:var(--gold)]">
                  Acesso de jogador ao Gravewright
                </h2>
                <p className="mt-1 text-xs leading-relaxed text-[color:var(--ivory-dim)]">
                  Gere uma frase pessoal em Velarim para entrar no Gravewright. Ela é vinculada à
                  sua identidade KALLISTIS, fica criptografada e pode ser consultada novamente neste
                  perfil. Se substituir uma frase, a anterior deixa de funcionar.
                </p>
                {gravewrightUrl ? (
                  <a
                    href={gravewrightUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex min-h-10 items-center text-sm text-[color:var(--gold)] underline underline-offset-4"
                  >
                    Abrir entrada do Gravewright
                  </a>
                ) : null}
                {vttPhraseConfigured && !vttPhrase ? (
                  <p
                    role="status"
                    className="mt-2 text-xs leading-relaxed text-[color:var(--ivory-dim)]"
                  >
                    Sua frase atual foi criada antes de o perfil permitir consultá-la novamente.
                    Gere uma substituta para ver e guardar a nova frase aqui; a anterior deixará de
                    funcionar.
                  </p>
                ) : null}
                {vttPhraseStatusError ? (
                  <p role="alert" className="mt-2 text-xs text-[color:var(--ivory-dim)]">
                    Não foi possível consultar se você já tem uma frase. Recarregue o Perfil para
                    tentar novamente; o botão fica bloqueado enquanto esse estado for desconhecido.
                  </p>
                ) : null}
              </div>
              <Button
                type="button"
                onClick={gerarPalavraVtt}
                disabled={vttPhraseSaving || vttPhraseStatusLoading || vttPhraseStatusError}
                className="h-10 px-5"
              >
                {vttPhraseSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : vttPhraseConfigured ? (
                  "Substituir frase de entrada"
                ) : (
                  "Gerar frase de entrada"
                )}
              </Button>
              {vttPhrase ? (
                <div
                  className="rounded-lg border border-[color:var(--gold)]/50 bg-card p-3"
                  role="status"
                >
                  <p className="text-xs text-[color:var(--ivory-dim)]">
                    Sua frase permanece disponível neste perfil. Você também pode copiá-la para
                    entrar no Gravewright.
                  </p>
                  <code className="mt-2 block select-all break-all text-base tracking-wider text-[color:var(--ivory)]">
                    {vttPhrase}
                  </code>
                  <p className="mt-2 text-xs text-[color:var(--ivory-dim)]">
                    Use a opção “Palavra do jogador” na tela de login do Gravewright.
                  </p>
                </div>
              ) : null}
            </section>
          ) : null}

          <section className="border-t border-[color:var(--border)] pt-8">
            <ContinuidadeKallistis />
          </section>
        </div>
      )}
    </div>
  );
}
