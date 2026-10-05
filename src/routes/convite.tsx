import { kallistisApple, kallistisWordmark } from "@/lib/brand-assets";
import { establishServerSession, restoreLocalSessionFromSupabase } from "@/lib/local-auth-client";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

type PlayerInviteStatus = "VALID_UNCLAIMED" | "INVALID" | "ALREADY_CLAIMED" | "REVOKED";

export const Route = createFileRoute("/convite")({
  component: ConvitePage,
  validateSearch: (search: Record<string, unknown>) => ({
    c: typeof search.c === "string" ? search.c : "",
    invite_state: typeof search.invite_state === "string" ? search.invite_state : "",
    return_to: typeof search.return_to === "string" ? search.return_to : "",
    // Kept only for the already-published Mesa invite flow.
    token: typeof search.token === "string" ? search.token : "",
  }),
});

function errorMessage(error: unknown, fallback: string): string {
  const code = error instanceof Error ? error.message : "";
  switch (code) {
    case "google_auth_required":
    case "GOOGLE_AUTH_FAILED":
      return "Não foi possível confirmar sua autenticação Google.";
    case "invite_capacity_exhausted":
    case "INVITE_CAPACITY_EXHAUSTED":
      return "Os convites disponíveis já foram utilizados. Entre em contato com o Mestre.";
    case "invite_claim_conflict":
    case "invite_already_claimed":
    case "INVITE_CLAIM_CONFLICT":
      return "Este acesso acabou de ser ocupado. Reabra o convite para continuar.";
    case "invite_state_invalid_or_expired":
      return "Este chamado expirou. Abra novamente o convite para continuar.";
    case "invite_server_failure":
    case "database_unavailable":
    case "INVITE_SERVER_FAILURE":
      return "Não foi possível concluir o chamado agora. Tente novamente em instantes.";
    default:
      return code || fallback;
  }
}

function statusMessage(status: PlayerInviteStatus): string {
  switch (status) {
    case "INVALID":
      return "Este convite não está disponível.";
    case "ALREADY_CLAIMED":
      return "Este convite já foi utilizado.";
    case "REVOKED":
      return "Este convite foi revogado.";
    default:
      return "Este convite ainda pode ser reivindicado.";
  }
}

function ConvitePage() {
  const {
    c,
    invite_state: inviteState,
    return_to: returnTo,
    token: legacyToken,
  } = Route.useSearch();
  const isTokenlessInvite = !c && !inviteState && !legacyToken;
  const isPlayerInvite = Boolean(c || inviteState || isTokenlessInvite);
  const [loggedIn, setLoggedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PlayerInviteStatus | null>(null);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const [playerLabel, setPlayerLabel] = useState("");
  const [claimCompleted, setClaimCompleted] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [pronouns, setPronouns] = useState("");
  const [legacyInvite, setLegacyInvite] = useState<{
    player_name: string;
    mesa_name: string;
  } | null>(null);
  const [legacyAccepted, setLegacyAccepted] = useState(false);
  const claimStarted = useRef(false);

  useEffect(() => {
    if (inviteState) {
      if (claimStarted.current) return;
      claimStarted.current = true;
      void finishGoogleClaim(inviteState);
      return;
    }

    if (c) {
      void fetch(`/api/invite?c=${encodeURIComponent(c)}`, {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then(async (response) => {
          const data = (await response.json().catch(() => null)) as {
            status?: PlayerInviteStatus;
          } | null;
          if (!response.ok || !data?.status)
            throw new Error("Não foi possível validar este convite");
          setStatus(data.status);
          if (data.status !== "VALID_UNCLAIMED") setError(statusMessage(data.status));
        })
        .catch((reason) => setError(errorMessage(reason, "Não foi possível validar este convite")))
        .finally(() => setLoading(false));
      return;
    }

    if (legacyToken) {
      void Promise.all([
        restoreLocalSessionFromSupabase().then((session) => setLoggedIn(Boolean(session?.user))),
        fetch(`/api/invite?token=${encodeURIComponent(legacyToken)}`, {
          credentials: "same-origin",
          cache: "no-store",
        }).then(async (response) => {
          const data = (await response.json().catch(() => null)) as {
            invite?: typeof legacyInvite;
            error?: string;
          } | null;
          if (!response.ok || !data?.invite)
            throw new Error(data?.error ?? "Este convite não está disponível");
          setLegacyInvite(data.invite);
        }),
      ])
        .catch((reason) => setError(errorMessage(reason, "Este convite não está disponível")))
        .finally(() => setLoading(false));
      return;
    }

    setLoading(false);
  }, [c, inviteState, legacyToken]);

  async function startGoogleLogin() {
    if ((!c && !isTokenlessInvite) || working) return;
    setWorking(true);
    setError("");
    try {
      const body: Record<string, unknown> = { action: "start_google" };
      if (c || isTokenlessInvite) {
        const normalizedDisplayName = displayName.trim();
        const normalizedPronouns = pronouns.trim();
        if (!normalizedDisplayName || !normalizedPronouns) {
          throw new Error("Informe como devemos chamar você e quais são seus pronomes.");
        }
        if (normalizedDisplayName.length > 60 || normalizedPronouns.length > 80) {
          throw new Error("Confira o tamanho do nome e dos pronomes informados.");
        }
        if (c) body.token = c;
        body.display_name = normalizedDisplayName;
        body.pronouns = normalizedPronouns;
      }
      const response = await fetch("/api/invite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json().catch(() => null)) as {
        state?: string;
        oauth_url?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.state || !data.oauth_url)
        throw new Error(data?.error ?? "Não foi possível iniciar o acesso Google");
      window.location.assign(data.oauth_url);
    } catch (reason) {
      setWorking(false);
      setError(errorMessage(reason, "Não foi possível iniciar o acesso Google"));
    }
  }

  async function finishGoogleClaim(oauthState: string) {
    setLoading(true);
    setError("");
    try {
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        throw sessionError ?? new Error("Sessão Google não encontrada");
      }
      await establishServerSession(data.session.access_token);
      const response = await fetch("/api/invite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "claim_google", state: oauthState }),
      });
      const result = (await response.json().catch(() => null)) as {
        player_label?: string;
        error?: string;
      } | null;
      if (!response.ok || !result?.player_label)
        throw new Error(result?.error ?? "Não foi possível concluir o chamado");
      if (returnTo === "convite-jogo") {
        window.location.replace("/convite-jogo/?accepted=1");
        return;
      }
      setPlayerLabel(result.player_label);
      setClaimCompleted(true);
    } catch (reason) {
      setError(errorMessage(reason, "Não foi possível concluir o convite Google"));
    } finally {
      setLoading(false);
    }
  }

  async function aceitarConviteLegado() {
    if (!legacyToken || working) return;
    setWorking(true);
    try {
      const response = await fetch("/api/invite", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token: legacyToken }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Não foi possível aceitar o convite");
      setError("");
      setLegacyAccepted(true);
    } catch (reason) {
      setError(errorMessage(reason, "Não foi possível aceitar o convite"));
    } finally {
      setWorking(false);
    }
  }

  return (
    <main className="min-h-[100dvh] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg text-center space-y-5">
        <img src={kallistisApple.url} alt="K∧LINE" className="mx-auto h-20 w-20 apple-glow" />
        <img src={kallistisWordmark.url} alt="K∧LINE" className="mx-auto mt-2 h-6 w-auto" />
        <div className="space-y-5 rounded-3xl border border-[color:var(--border)] bg-card/70 p-6">
          <p className="text-xs uppercase tracking-[0.3em] text-[color:var(--gold)]">KALLISTIS</p>
          <h1 className="serif text-3xl text-[color:var(--ivory)]">O CHAMADO</h1>
          {loading ? (
            <p className="text-sm text-[color:var(--ivory-dim)]">Abrindo o chamado…</p>
          ) : null}

          {!loading && isTokenlessInvite && claimCompleted ? (
            <>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                O chamado foi aceito.
              </p>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                Seu acesso a KALLISTIS está pronto.
              </p>
              <Link
                to="/chat"
                className="inline-flex rounded-full bg-[color:var(--gold)] px-5 py-3 text-sm font-medium text-[color:var(--obsidian)]"
              >
                Entrar em KALLISTIS
              </Link>
            </>
          ) : null}

          {!loading && isTokenlessInvite && !claimCompleted && !error ? (
            <>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                Há lugares que não aparecem nos mapas. Há histórias que só existem depois que alguém
                decide atravessar.
              </p>
              <p className="text-sm text-[color:var(--ivory-dim)]">Seu lugar está reservado.</p>
              <div className="space-y-3 text-left">
                <label
                  className="block text-xs text-[color:var(--ivory-dim)]"
                  htmlFor="invite-name"
                >
                  COMO DEVEM CHAMAR VOCÊ?
                  <input
                    id="invite-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    maxLength={60}
                    required
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-card px-4 py-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
                  />
                </label>
                <label
                  className="block text-xs text-[color:var(--ivory-dim)]"
                  htmlFor="invite-pronouns"
                >
                  QUAIS SÃO SEUS PRONOMES?
                  <input
                    id="invite-pronouns"
                    value={pronouns}
                    onChange={(event) => setPronouns(event.target.value)}
                    maxLength={80}
                    required
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-card px-4 py-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void startGoogleLogin()}
                disabled={working || !displayName.trim() || !pronouns.trim()}
                className="inline-flex rounded-full bg-[color:var(--gold)] px-5 py-3 text-sm font-medium text-[color:var(--obsidian)] disabled:opacity-60"
              >
                {working ? "Abrindo Google…" : "ACEITAR O CHAMADO"}
              </button>
            </>
          ) : null}

          {!loading && c && playerLabel ? (
            <>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                PASSAGEM RECONHECIDA
              </p>
              <p className="text-2xl text-[color:var(--gold)]">{playerLabel}</p>
              <Link
                to="/chat"
                className="inline-flex rounded-full bg-[color:var(--gold)] px-4 py-2 text-sm font-medium text-[color:var(--obsidian)]"
              >
                Entrar em KALLISTIS
              </Link>
            </>
          ) : null}

          {!loading && c && !playerLabel && !error && status === "VALID_UNCLAIMED" ? (
            <>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                SEU LUGAR EM KALLISTIS ESTÁ RESERVADO
              </p>
              <div className="space-y-3 text-left">
                <label
                  className="block text-xs text-[color:var(--ivory-dim)]"
                  htmlFor="invite-name"
                >
                  COMO DEVEM CHAMAR VOCÊ?
                  <input
                    id="invite-name"
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    autoComplete="name"
                    maxLength={60}
                    required
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-card px-4 py-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
                  />
                </label>
                <label
                  className="block text-xs text-[color:var(--ivory-dim)]"
                  htmlFor="invite-pronouns"
                >
                  QUAIS SÃO SEUS PRONOMES?
                  <input
                    id="invite-pronouns"
                    value={pronouns}
                    onChange={(event) => setPronouns(event.target.value)}
                    maxLength={80}
                    required
                    className="mt-1 w-full rounded-xl border border-[color:var(--border)] bg-card px-4 py-3 text-sm text-[color:var(--ivory)] outline-none focus:border-[color:var(--gold)]"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => void startGoogleLogin()}
                disabled={working}
                className="inline-flex rounded-full bg-[color:var(--gold)] px-4 py-2 text-sm font-medium text-[color:var(--obsidian)]"
              >
                {working ? "Abrindo Google…" : "CONTINUAR COM GOOGLE"}
              </button>
            </>
          ) : null}

          {!loading && !isPlayerInvite && !error && legacyAccepted ? (
            <>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                Convite aceito. Você já pode entrar em {legacyInvite?.mesa_name}.
              </p>
              <Link
                to="/perfil"
                className="inline-flex rounded-full bg-[color:var(--gold)] px-4 py-2 text-sm font-medium text-[color:var(--obsidian)]"
              >
                Abrir meu perfil
              </Link>
            </>
          ) : null}

          {!loading && !isPlayerInvite && !error && !legacyAccepted && legacyInvite ? (
            <>
              <p className="text-sm leading-relaxed text-[color:var(--ivory-dim)]">
                {legacyInvite.player_name}, você foi convidado para{" "}
                <span className="text-[color:var(--gold)]">{legacyInvite.mesa_name}</span>.
              </p>
              <p className="text-xs text-[color:var(--ivory-dim)]">
                Use a palavra de acesso recebida pelo canal seguro da Mesa.
              </p>
              {loggedIn ? (
                <button
                  type="button"
                  onClick={() => void aceitarConviteLegado()}
                  disabled={working}
                  className="inline-flex rounded-full bg-[color:var(--gold)] px-4 py-2 text-sm font-medium text-[color:var(--obsidian)]"
                >
                  {working ? "Aceitando…" : "Aceitar convite"}
                </button>
              ) : (
                <Link
                  to="/auth"
                  className="inline-flex rounded-full bg-[color:var(--gold)] px-4 py-2 text-sm font-medium text-[color:var(--obsidian)]"
                >
                  Entrar no KALLISTIS
                </Link>
              )}
            </>
          ) : null}

          {error ? (
            <p className="text-sm leading-relaxed text-red-300" role="alert">
              {errorMessage(new Error(error), "Não foi possível concluir o chamado")}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
