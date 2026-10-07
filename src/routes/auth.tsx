import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getLocalSession, signInLocal } from "@/lib/local-auth-client";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({ component: AuthPage });

async function destinationForSession() {
  const profile = await fetch("/api/profile", { credentials: "same-origin", cache: "no-store" });
  const payload = (await profile.json().catch(() => null)) as { is_master?: boolean } | null;
  return profile.ok && payload?.is_master ? "/mestre" : "/home";
}

function AuthPage() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    let active = true;
    void getLocalSession()
      .then(async (session) => {
        if (session && active) await navigate({ to: await destinationForSession(), replace: true });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) {
          void fetch("/api/setup/status", { cache: "no-store" })
            .then((response) => response.json())
            .then((data: { available?: boolean }) => {
              if (active) setSetupAvailable(data.available === true);
            })
            .catch(() => undefined)
            .finally(() => {
              if (active) setChecking(false);
            });
        }
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await signInLocal(identifier, secret);
      await navigate({ to: await destinationForSession(), replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Acesso ou senha inválidos");
    } finally {
      setLoading(false);
    }
  }

  async function recover(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/recover", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ identifier, recoveryCode, newPassword }),
      });
      if (!response.ok) throw new Error("E-mail ou código inválido.");
      toast.success("Senha redefinida. Entre com a nova senha.");
      setRecovering(false);
      setRecoveryCode("");
      setNewPassword("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-page">
      <Link to="/" className="auth-page__back">
        ← Voltar à Gerusa
      </Link>
      <div className="auth-card">
        <div className="auth-card__brand">
          <img src="/gerusa-logo.png" alt="Símbolo Gerusa" className="auth-card__crystal" />
          <h1 className="serif text-3xl text-[#f4e8dc]">Gerusa Poulain</h1>
          <p>Uma boa história começa com quem está à mesa.</p>
        </div>
        <div className="auth-card__rule" />
        {checking ? (
          <p className="auth-card__hint">Verificando sua sessão…</p>
        ) : (
          <form onSubmit={recovering ? recover : submit} className="auth-card__form">
            <div>
              <Label htmlFor="auth-email">
                {recovering ? "E-mail da professora" : "E-mail ou nome de acesso"}
              </Label>
              <Input
                id="auth-email"
                name="identifier"
                type="text"
                required
                autoComplete="username"
                value={identifier}
                onChange={(event) => setIdentifier(event.target.value)}
                className="auth-card__input"
              />
            </div>
            {recovering ? (
              <>
                <div>
                  <Label htmlFor="recovery-code">Código de recuperação</Label>
                  <Input
                    id="recovery-code"
                    type="text"
                    required
                    autoComplete="off"
                    value={recoveryCode}
                    onChange={(event) => setRecoveryCode(event.target.value)}
                    className="auth-card__input"
                  />
                </div>
                <div>
                  <Label htmlFor="new-password">Nova senha (mínimo 12 caracteres)</Label>
                  <Input
                    id="new-password"
                    type="password"
                    required
                    minLength={12}
                    autoComplete="new-password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="auth-card__input"
                  />
                </div>
              </>
            ) : (
              <div>
                <Label htmlFor="auth-password">Senha ou PIN de 6 dígitos</Label>
                <Input
                  id="auth-password"
                  name="secret"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={secret}
                  onChange={(event) => setSecret(event.target.value)}
                  className="auth-card__input"
                />
              </div>
            )}
            <Button
              type="submit"
              className="auth-card__submit"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? "Aguarde…" : recovering ? "Redefinir senha" : "Entrar"}
            </Button>
          </form>
        )}
        <p className="auth-card__hint">Acesso para professora e alunos da Gerusa.</p>
        {!checking ? (
          <button
            type="button"
            onClick={() => setRecovering((value) => !value)}
            className="auth-card__hint block underline"
          >
            {recovering ? "Voltar ao login" : "Esqueci a senha da professora"}
          </button>
        ) : null}
        {setupAvailable ? (
          <Link className="auth-card__hint block underline" to="/setup">
            Primeiro acesso da professora
          </Link>
        ) : null}
      </div>
    </main>
  );
}
