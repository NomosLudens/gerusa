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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let active = true;
    void getLocalSession()
      .then(async (session) => {
        if (session && active) await navigate({ to: await destinationForSession(), replace: true });
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setChecking(false);
      });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    try {
      await signInLocal(email, password);
      await navigate({ to: await destinationForSession(), replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "E-mail ou senha inválidos");
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
          <form onSubmit={submit} className="auth-card__form">
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
              <Label htmlFor="auth-password">Senha</Label>
              <Input
                id="auth-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
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
        )}
        <p className="auth-card__hint">Acesso para professora e alunos da Gerusa.</p>
      </div>
    </main>
  );
}
