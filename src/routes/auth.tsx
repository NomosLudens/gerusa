import { kallistisWordmark } from "@/lib/brand-assets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validatePasswordRecoveryInput } from "@/lib/auth-recovery-state";
import { restoreLocalSessionFromSupabase, signInLocal } from "@/lib/local-auth-client";
import { supabase } from "@/integrations/supabase/client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

const RECOVERY_FAILURE_MESSAGE =
  "Não foi possível validar a recuperação. Confira os dados e tente novamente.";

type RecoveryResponse = {
  newRecoveryCode?: string;
  sessionEstablished?: boolean;
  message?: string;
};

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [credential, setCredential] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryComplete, setRecoveryComplete] = useState(false);
  const [newRecoveryCode, setNewRecoveryCode] = useState("");
  const [recoverySessionEstablished, setRecoverySessionEstablished] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordConfirmation, setNewPasswordConfirmation] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [confirmingGooglePlayer, setConfirmingGooglePlayer] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerPronouns, setPlayerPronouns] = useState("");
  const [sessionError, setSessionError] = useState("");

  useEffect(() => {
    let active = true;
    void restoreLocalSessionFromSupabase()
      .then((session) => {
        if (!active || !session) return;
        return fetch("/api/auth/google-player-onboarding", {
          credentials: "same-origin",
          cache: "no-store",
        }).then(async (response) => {
          const status = (await response.json().catch(() => null)) as {
            required?: boolean;
            display_name?: string | null;
            pronouns?: string | null;
            error?: string;
          } | null;
          if (!response.ok || !status)
            throw new Error(status?.error ?? "Não foi possível verificar seu perfil de jogador.");
          if (status.required) {
            const { data } = await supabase.auth.getSession();
            const metadata = data.session?.user.user_metadata;
            const googleName =
              typeof metadata?.full_name === "string"
                ? metadata.full_name
                : typeof metadata?.name === "string"
                  ? metadata.name
                  : "";
            if (active) {
              setPlayerName((status.display_name?.trim() || googleName.trim()).slice(0, 60));
              setPlayerPronouns((status.pronouns?.trim() || "").slice(0, 80));
              setConfirmingGooglePlayer(true);
            }
            return;
          }
          if (active) return navigate({ to: "/chat", replace: true });
        });
      })
      .catch((error: unknown) => {
        if (active && error instanceof Error && error.message !== "E-mail ou palavra inválidos")
          setSessionError(error.message);
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await signInLocal(email, credential);
      await navigate({ to: "/chat", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "E-mail ou palavra inválidos");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setLoading(true);
    setSessionError("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth?google_login=1` },
      });
      if (error) throw error;
    } catch {
      setLoading(false);
      toast.error("Não foi possível iniciar o acesso Google. Tente novamente.");
    }
  }

  async function handleGooglePlayerConfirmation(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setSessionError("");
    try {
      const response = await fetch("/api/auth/google-player-onboarding", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ display_name: playerName, pronouns: playerPronouns }),
      });
      const result = (await response.json().catch(() => null)) as {
        player_label?: string;
        error?: string;
      } | null;
      if (!response.ok || !result?.player_label) {
        const message =
          result?.error === "invite_capacity_exhausted"
            ? "Não há vagas de jogador disponíveis. Fale com o Mestre."
            : result?.error === "invite_claim_conflict"
              ? "Seu vínculo mudou durante a confirmação. Atualize a página e tente novamente."
              : "Não foi possível salvar seu perfil. Confira os dados e tente novamente.";
        throw new Error(message);
      }
      await navigate({ to: "/chat", replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao salvar seu perfil.";
      setSessionError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleRecoverySubmit(event: React.FormEvent) {
    event.preventDefault();
    const validationError = validatePasswordRecoveryInput(newPassword, newPasswordConfirmation);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/recovery-code", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ credential, recoveryCode, newPassword }),
      });
      const payload = (await response.json().catch(() => null)) as RecoveryResponse | null;
      if (!response.ok || !payload?.newRecoveryCode) {
        throw new Error(payload?.message ?? RECOVERY_FAILURE_MESSAGE);
      }
      setNewRecoveryCode(payload.newRecoveryCode);
      setRecoverySessionEstablished(Boolean(payload.sessionEstablished));
      setRecoveryComplete(true);
      setCredential("");
      setRecoveryCode("");
      setNewPassword("");
      setNewPasswordConfirmation("");
      toast.success("Senha atualizada. Guarde o novo código de recuperação.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : RECOVERY_FAILURE_MESSAGE);
    } finally {
      setLoading(false);
    }
  }

  async function continueAfterRecovery() {
    setNewRecoveryCode("");
    setRecoveryComplete(false);
    setRecoveryMode(false);
    if (recoverySessionEstablished) await navigate({ to: "/chat", replace: true });
  }

  function openRecovery() {
    setRecoveryMode(true);
    setRecoveryComplete(false);
    setNewRecoveryCode("");
  }

  function closeRecovery() {
    setRecoveryMode(false);
    setRecoveryComplete(false);
    setNewRecoveryCode("");
    setRecoveryCode("");
    setNewPassword("");
    setNewPasswordConfirmation("");
  }

  return (
    <main className="auth-page">
      <Link to="/" className="auth-page__back">
        ← Voltar para Kallistis
      </Link>
      <div className="auth-card">
        <div className="auth-card__brand">
          <img
            src="/brand-assets/kallistis-canon-crystal.png?v=20260830"
            alt="Símbolo Kallistis"
            className="auth-card__crystal"
          />
          <img src={kallistisWordmark.url} alt="Kallistis" className="auth-card__wordmark" />
          <p>Dois mundos, uma escolha impossível.</p>
        </div>
        <div className="auth-card__rule" />
        {checkingSession ? (
          <p className="auth-card__hint">Verificando sua sessão…</p>
        ) : confirmingGooglePlayer ? (
          <form onSubmit={handleGooglePlayerConfirmation} className="auth-card__form">
            <p className="text-sm text-[color:var(--ivory-dim)]">
              Confira o nome sugerido pela conta Google, se houver, e informe seus pronomes. Você
              poderá corrigir os dados antes de concluir a entrada.
            </p>
            <div>
              <Label htmlFor="google-player-name">Nome do jogador</Label>
              <Input
                id="google-player-name"
                name="display-name"
                type="text"
                autoComplete="name"
                maxLength={60}
                required
                value={playerName}
                onChange={(event) => setPlayerName(event.target.value)}
                className="auth-card__input"
              />
            </div>
            <div>
              <Label htmlFor="google-player-pronouns">Pronomes</Label>
              <Input
                id="google-player-pronouns"
                name="pronouns"
                type="text"
                maxLength={80}
                required
                value={playerPronouns}
                onChange={(event) => setPlayerPronouns(event.target.value)}
                className="auth-card__input"
              />
            </div>
            {sessionError ? (
              <p role="alert" className="text-sm text-red-300">
                {sessionError}
              </p>
            ) : null}
            <Button
              type="submit"
              className="auth-card__submit"
              disabled={loading || !playerName.trim() || !playerPronouns.trim()}
              aria-busy={loading}
            >
              {loading ? "Salvando perfil…" : "Confirmar e continuar"}
            </Button>
          </form>
        ) : recoveryComplete ? (
          <div className="auth-card__form">
            <p className="text-sm text-[color:var(--ivory-dim)]">
              Senha alterada com sucesso. O código anterior não funciona mais.
            </p>
            <div className="space-y-2 rounded-xl border border-[color:var(--gold)]/40 p-4">
              <Label htmlFor="new-recovery-code">Seu novo código de recuperação</Label>
              <Input
                id="new-recovery-code"
                value={newRecoveryCode}
                readOnly
                aria-label="Seu novo código de recuperação"
                className="auth-card__input font-mono tracking-[0.14em]"
              />
              <p className="text-xs text-[color:var(--ivory-dim)]">
                Guarde-o em local seguro. Ele será exibido somente agora.
              </p>
            </div>
            <Button
              type="button"
              className="auth-card__submit"
              onClick={() => void continueAfterRecovery()}
            >
              {recoverySessionEstablished ? "Eu guardei o código e continuar" : "Voltar ao login"}
            </Button>
          </div>
        ) : recoveryMode ? (
          <form onSubmit={handleRecoverySubmit} className="auth-card__form">
            <div>
              <Label htmlFor="recovery-credential">Palavra</Label>
              <Input
                id="recovery-credential"
                name="credential"
                type="password"
                required
                autoComplete="current-password"
                value={credential}
                onChange={(event) => setCredential(event.target.value)}
                className="auth-card__input"
              />
            </div>
            <div>
              <Label htmlFor="recovery-code">Código de recuperação</Label>
              <Input
                id="recovery-code"
                name="recovery-code"
                type="text"
                required
                maxLength={19}
                autoComplete="one-time-code"
                value={recoveryCode}
                onChange={(event) => setRecoveryCode(event.target.value)}
                className="auth-card__input font-mono tracking-[0.12em]"
              />
            </div>
            <div>
              <Label htmlFor="auth-new-password">Nova senha</Label>
              <Input
                id="auth-new-password"
                name="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="auth-card__input"
              />
            </div>
            <div>
              <Label htmlFor="auth-new-password-confirmation">Confirmar nova senha</Label>
              <Input
                id="auth-new-password-confirmation"
                name="new-password-confirmation"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                value={newPasswordConfirmation}
                onChange={(event) => setNewPasswordConfirmation(event.target.value)}
                className="auth-card__input"
              />
            </div>
            <Button
              type="submit"
              className="auth-card__submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Validando…" : "Redefinir senha"}
            </Button>
          </form>
        ) : (
          <>
            {sessionError ? (
              <p role="alert" className="mb-3 text-sm text-red-300">
                {sessionError}
              </p>
            ) : null}
            <Button
              type="button"
              variant="outline"
              className="auth-card__submit mb-4"
              onClick={() => void handleGoogleLogin()}
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Abrindo Google…" : "Entrar com Google"}
            </Button>
            <form onSubmit={handleSubmit} className="auth-card__form">
              <div>
                <Label htmlFor="auth-email">E-mail</Label>
                <Input
                  id="auth-email"
                  name="email"
                  type="email"
                  required
                  autoComplete="username"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="auth-card__input"
                />
              </div>
              <div>
                <Label htmlFor="auth-credential">Palavra</Label>
                <Input
                  id="auth-credential"
                  name="credential"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={credential}
                  onChange={(event) => setCredential(event.target.value)}
                  className="auth-card__input"
                />
              </div>
              <Button
                type="submit"
                className="auth-card__submit"
                disabled={loading}
                aria-busy={loading}
              >
                {loading ? "Entrando…" : "Entrar"}
              </Button>
            </form>
          </>
        )}
        {!recoveryComplete && (
          <div className="auth-card__hint">
            {recoveryMode ? (
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={closeRecovery}
              >
                Voltar ao login
              </button>
            ) : (
              <button
                type="button"
                className="underline underline-offset-4"
                onClick={openRecovery}
                disabled={loading}
              >
                Esqueci minha senha
              </button>
            )}
          </div>
        )}
        <p className="auth-card__hint">
          Ainda não tem acesso?{" "}
          <a href="mailto:contato@kallistis.app" target="_blank" rel="noreferrer">
            Escreva para contato@kallistis.app.
          </a>
        </p>
      </div>
    </main>
  );
}
