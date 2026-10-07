import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/setup")({ component: SetupPage });

function SetupPage() {
  const navigate = useNavigate();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    let active = true;
    void fetch("/api/setup/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { available?: boolean }) => {
        if (active) setAvailable(result.available === true);
      })
      .catch(() => {
        if (active) setAvailable(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const identifier = String(form.get("identifier") ?? "").trim();
    const secret = String(form.get("secret") ?? "");
    const confirmSecret = String(form.get("confirmSecret") ?? "");
    if (secret.length < 12) {
      toast.error("Use uma senha com pelo menos 12 caracteres.");
      return;
    }
    if (secret !== confirmSecret) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/setup/initialize", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name, identifier, secret, confirmSecret }),
      });
      if (!response.ok)
        throw new Error(
          response.status === 409
            ? "A configuração inicial já foi concluída."
            : "Não foi possível criar a conta agora.",
        );
      const result = (await response.json()) as { recoveryCode?: string };
      if (!result.recoveryCode)
        throw new Error(
          "A conta foi criada, mas não foi possível exibir o código de recuperação. Guarde esta tela e procure o suporte.",
        );
      setRecoveryCode(result.recoveryCode);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
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
          <h1 className="serif text-3xl text-[#f4e8dc]">Comece sua Gerusa</h1>
          <p>Crie a conta da professora para preparar as histórias e acompanhar seus alunos.</p>
        </div>
        <div className="auth-card__rule" />
        {recoveryCode ? (
          <section className="space-y-4" aria-live="polite">
            <h2 className="serif text-2xl">Guarde seu código de recuperação</h2>
            <p className="text-sm">
              Ele será mostrado somente agora e permite redefinir a senha se você a esquecer.
              Guarde-o em um local seguro, separado da senha.
            </p>
            <p className="break-all rounded-lg border border-[#8a3045] bg-[#10070b] p-4 font-mono text-sm tracking-wide">
              {recoveryCode}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="auth-card__submit"
                onClick={() => {
                  void navigator.clipboard
                    .writeText(recoveryCode)
                    .then(() => setCopied(true))
                    .catch(() => toast.error("Selecione e copie o código manualmente."));
                }}
              >
                {copied ? "Copiado" : "Copiar código"}
              </Button>
              <Button type="button" variant="outline" onClick={() => window.print()}>
                Imprimir
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigate({ to: "/mestre", replace: true })}
              >
                Já guardei · Ir ao Mestre
              </Button>
            </div>
          </section>
        ) : available === null ? (
          <p className="auth-card__hint">Verificando a configuração…</p>
        ) : !available ? (
          <div>
            <p role="status" className="auth-card__hint">
              A configuração inicial já foi concluída.
            </p>
            <Link to="/auth" className="auth-card__hint underline">
              Ir para entrar
            </Link>
          </div>
        ) : (
          <form onSubmit={submit} className="auth-card__form">
            <div>
              <Label htmlFor="setup-name">Nome da professora</Label>
              <Input
                id="setup-name"
                name="name"
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
                className="auth-card__input"
              />
            </div>
            <div>
              <Label htmlFor="setup-identifier">E-mail</Label>
              <Input
                id="setup-identifier"
                name="identifier"
                type="email"
                required
                autoComplete="email"
                className="auth-card__input"
              />
            </div>
            <div>
              <Label htmlFor="setup-secret">Senha (mínimo 12 caracteres)</Label>
              <Input
                id="setup-secret"
                name="secret"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="auth-card__input"
              />
            </div>
            <div>
              <Label htmlFor="setup-confirm">Confirme a senha</Label>
              <Input
                id="setup-confirm"
                name="confirmSecret"
                type="password"
                required
                minLength={12}
                autoComplete="new-password"
                className="auth-card__input"
              />
            </div>
            <Button type="submit" className="auth-card__submit" disabled={busy}>
              {busy ? "Criando conta…" : "Criar minha conta"}
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
