import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/cadastro")({ component: CadastroPage });

function CadastroPage() {
  const navigate = useNavigate();
  const [inviteToken, setInviteToken] = useState("");
  const [invite, setInvite] = useState<{ available: boolean; mesaName?: string } | null>(null);
  const [checkingInvite, setCheckingInvite] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [mesaName, setMesaName] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentUsername, setStudentUsername] = useState("");
  const [studentPin, setStudentPin] = useState("");
  const [studentAge, setStudentAge] = useState("");

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get("convite") ?? "";
    if (!token) return;
    setInviteToken(token);
    setCheckingInvite(true);
    void fetch(`/api/student-invites?token=${encodeURIComponent(token)}`, { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json().catch(() => ({}))) as {
          available?: boolean;
          mesaName?: string;
        };
        if (!response.ok) throw new Error("Não foi possível validar o convite.");
        setInvite({ available: result.available === true, mesaName: result.mesaName });
      })
      .catch(() => setInvite({ available: false }))
      .finally(() => setCheckingInvite(false));
  }, []);

  async function registerTeacher(event: React.FormEvent) {
    event.preventDefault();
    if (teacherPassword !== confirmPassword) {
      setNotice("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/auth/register-teacher", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: teacherName,
          email: teacherEmail,
          password: teacherPassword,
          confirmPassword,
          mesaName,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        recoveryCode?: string;
        error?: string;
      };
      if (!response.ok || !result.recoveryCode)
        throw new Error(
          result.error === "email_unavailable"
            ? "Já existe uma conta com esse e-mail. Tente entrar ou use a recuperação de senha."
            : result.error === "registration_rate_limited"
              ? "Muitas tentativas neste acesso. Aguarde um pouco e tente novamente."
              : "Não foi possível criar a conta agora.",
        );
      setRecoveryCode(result.recoveryCode);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  async function registerStudent(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice("");
    try {
      const response = await fetch("/api/student-invites", {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token: inviteToken,
          name: studentName,
          username: studentUsername,
          pin: studentPin,
          age: studentAge || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok)
        throw new Error(
          result.error === "username_unavailable"
            ? "Esse nome de acesso já está em uso. Escolha outro."
            : result.error === "invite_unavailable"
              ? "Este convite expirou ou já foi usado. Peça outro à professora."
              : result.error === "registration_rate_limited"
                ? "Muitas tentativas neste acesso. Aguarde um pouco e tente novamente."
                : "Não foi possível criar a conta do aluno.",
        );
      await navigate({ to: "/home", replace: true });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setBusy(false);
    }
  }

  async function copyRecoveryCode() {
    try {
      await navigator.clipboard.writeText(recoveryCode);
      setNotice("Código de recuperação copiado. Guarde-o separado da senha.");
    } catch {
      setNotice("Selecione e copie o código manualmente, e guarde-o separado da senha.");
    }
  }

  return (
    <main className="auth-page">
      <Link to="/auth" className="auth-page__back">
        ← Voltar ao acesso
      </Link>
      <div className="auth-card">
        <div className="auth-card__brand">
          <img src="/gerusa-logo.png" alt="Símbolo Gerusa" className="auth-card__crystal" />
          <h1 className="serif text-3xl text-[#f4e8dc]">Criar conta na Gerusa</h1>
          <p>
            {inviteToken
              ? "A professora convidou você para uma Mesa."
              : "Professora, comece sua própria Mesa."}
          </p>
        </div>
        <div className="auth-card__rule" />

        {recoveryCode ? (
          <section className="space-y-4" aria-live="polite">
            <h2 className="serif text-2xl">Guarde seu código de recuperação</h2>
            <p className="text-sm">
              Ele permite redefinir sua senha e será mostrado somente agora. Guarde-o separado da
              senha.
            </p>
            <p className="break-all rounded-lg border border-[#8a3045] bg-[#10070b] p-4 font-mono text-sm tracking-wide">
              {recoveryCode}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                className="auth-card__submit"
                onClick={() => void copyRecoveryCode()}
              >
                Copiar código
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => void navigate({ to: "/mestre", replace: true })}
              >
                Já guardei · Abrir painel
              </Button>
            </div>
          </section>
        ) : inviteToken ? (
          checkingInvite ? (
            <p className="auth-card__hint">Verificando o convite…</p>
          ) : invite?.available ? (
            <form onSubmit={registerStudent} className="auth-card__form">
              <p className="rounded-lg border border-[#742233]/50 bg-[#220d15] p-3 text-sm">
                Convite válido para <strong>{invite.mesaName}</strong>. Escolha seu nome de acesso e
                PIN.
              </p>
              <label>
                <Label htmlFor="student-name">Seu nome</Label>
                <Input
                  id="student-name"
                  required
                  minLength={2}
                  maxLength={60}
                  autoComplete="name"
                  value={studentName}
                  onChange={(event) => setStudentName(event.target.value)}
                  className="auth-card__input"
                />
              </label>
              <label>
                <Label htmlFor="student-username">Nome de acesso (3 a 32 caracteres)</Label>
                <Input
                  id="student-username"
                  required
                  minLength={3}
                  maxLength={32}
                  pattern="[a-z0-9][a-z0-9_-]{2,31}"
                  autoCapitalize="none"
                  autoComplete="username"
                  value={studentUsername}
                  onChange={(event) => setStudentUsername(event.target.value.toLowerCase())}
                  className="auth-card__input"
                />
              </label>
              <label>
                <Label htmlFor="student-pin">PIN de 6 dígitos</Label>
                <Input
                  id="student-pin"
                  required
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  minLength={6}
                  maxLength={6}
                  autoComplete="new-password"
                  value={studentPin}
                  onChange={(event) =>
                    setStudentPin(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="auth-card__input"
                />
              </label>
              <label>
                <Label htmlFor="student-age">Idade (opcional)</Label>
                <Input
                  id="student-age"
                  type="number"
                  min={5}
                  max={120}
                  value={studentAge}
                  onChange={(event) => setStudentAge(event.target.value)}
                  className="auth-card__input"
                />
              </label>
              <Button type="submit" className="auth-card__submit" disabled={busy}>
                {busy ? "Criando conta…" : "Criar conta de estudante"}
              </Button>
            </form>
          ) : (
            <p role="alert" className="auth-card__hint">
              Este convite não está disponível. Peça à professora um novo link de acesso.
            </p>
          )
        ) : (
          <form onSubmit={registerTeacher} className="auth-card__form">
            <label>
              <Label htmlFor="teacher-name">Seu nome</Label>
              <Input
                id="teacher-name"
                required
                minLength={2}
                maxLength={60}
                autoComplete="name"
                value={teacherName}
                onChange={(event) => setTeacherName(event.target.value)}
                className="auth-card__input"
              />
            </label>
            <label>
              <Label htmlFor="teacher-email">E-mail para entrar</Label>
              <Input
                id="teacher-email"
                required
                type="email"
                maxLength={254}
                autoComplete="email"
                value={teacherEmail}
                onChange={(event) => setTeacherEmail(event.target.value)}
                className="auth-card__input"
              />
            </label>
            <label>
              <Label htmlFor="mesa-name">Nome da sua Mesa/turma</Label>
              <Input
                id="mesa-name"
                required
                minLength={2}
                maxLength={120}
                value={mesaName}
                onChange={(event) => setMesaName(event.target.value)}
                className="auth-card__input"
              />
            </label>
            <label>
              <Label htmlFor="teacher-password">Senha (mínimo 12 caracteres)</Label>
              <Input
                id="teacher-password"
                required
                type="password"
                minLength={12}
                maxLength={256}
                autoComplete="new-password"
                value={teacherPassword}
                onChange={(event) => setTeacherPassword(event.target.value)}
                className="auth-card__input"
              />
            </label>
            <label>
              <Label htmlFor="confirm-password">Confirme a senha</Label>
              <Input
                id="confirm-password"
                required
                type="password"
                minLength={12}
                maxLength={256}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="auth-card__input"
              />
            </label>
            <p className="auth-card__hint">
              Sua conta terá uma Mesa própria. Não enviamos e-mail: o endereço será usado para login
              e recuperação.
            </p>
            <Button type="submit" className="auth-card__submit" disabled={busy}>
              {busy ? "Criando conta…" : "Criar conta de professora"}
            </Button>
          </form>
        )}

        {notice ? (
          <p role="status" className="mt-4 rounded-lg border border-[#8a3045]/70 p-3 text-sm">
            {notice}
          </p>
        ) : null}
        {!inviteToken && !recoveryCode ? (
          <p className="auth-card__hint mt-4 text-center">
            Já tem conta?{" "}
            <Link to="/auth" className="underline">
              Entrar
            </Link>
          </p>
        ) : null}
      </div>
    </main>
  );
}
