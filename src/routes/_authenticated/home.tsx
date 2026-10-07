import { createFileRoute, Link } from "@tanstack/react-router";
import { useProfile } from "@/lib/use-profile";

export const Route = createFileRoute("/_authenticated/home")({ component: StudentHome });

function StudentHome() {
  const { profile, mesas, loading, error } = useProfile();
  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#10070b] px-4 py-6 pb-24 text-[#f5e9df] sm:px-8 sm:py-10">
      <main className="mx-auto max-w-4xl space-y-7">
        <header className="flex items-center gap-4 rounded-2xl border border-[#742233]/45 bg-[#180b11] p-5">
          <img src="/gerusa-logo.png" alt="" className="h-14 w-14 rounded-full" />
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-[#d5a56c]">Jornada do aluno</p>
            <h1 className="serif mt-1 text-3xl">Olá, {profile?.display_name || "aventureiro"}.</h1>
            {profile?.pronouns ? (
              <p className="mt-1 text-sm text-[#e7c9b7]/65">{profile.pronouns}</p>
            ) : null}
          </div>
        </header>
        {loading ? <p className="text-sm text-[#e7c9b7]/70">Carregando seu perfil…</p> : null}
        {error ? (
          <p role="alert" className="rounded-xl border border-red-400/30 p-4 text-sm text-red-200">
            Não foi possível carregar seu perfil.
          </p>
        ) : null}
        <section className="space-y-3" aria-label="Suas campanhas">
          <h2 className="serif text-2xl">Suas mesas e campanhas</h2>
          {mesas.length ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {mesas.map((mesa) => (
                <article
                  key={mesa.id}
                  className="rounded-xl border border-[#742233]/45 bg-[#180b11] p-5"
                >
                  <p className="text-xs uppercase tracking-[0.15em] text-[#d5a56c]">
                    {mesa.member_role === "mestre" ? "Professora" : "Aluno"}
                  </p>
                  <h3 className="serif mt-1 text-xl">{mesa.name}</h3>
                  <p className="mt-2 text-sm text-[#e7c9b7]/65">
                    {mesa.campaigns?.map((campaign) => campaign.name).join(" · ") ||
                      "Campanha em preparação"}
                  </p>
                </article>
              ))}
            </div>
          ) : !loading ? (
            <p className="rounded-xl border border-[#742233]/35 p-4 text-sm text-[#e7c9b7]/70">
              Você ainda não está vinculado a uma mesa.
            </p>
          ) : null}
        </section>
        <section className="grid gap-3 sm:grid-cols-2">
          <Link
            to="/conversa"
            className="rounded-xl border border-[#8a3045]/60 bg-[#4c1425] p-5 transition hover:bg-[#641a30]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[#f0c59a]">Conversa</p>
            <h2 className="serif mt-1 text-2xl">Falar com Gerusa</h2>
            <p className="mt-2 text-sm text-[#f5e9df]/75">Seu histórico fica salvo na sua conta.</p>
          </Link>
          <Link
            to="/perfil"
            className="rounded-xl border border-[#742233]/45 bg-[#180b11] p-5 transition hover:bg-[#220d15]"
          >
            <p className="text-xs uppercase tracking-[0.16em] text-[#d5a56c]">Conta</p>
            <h2 className="serif mt-1 text-2xl">Meu perfil</h2>
            <p className="mt-2 text-sm text-[#e7c9b7]/70">Confira seu nome e seus dados.</p>
          </Link>
        </section>
      </main>
    </div>
  );
}
