import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { getLocalSession } from "@/lib/local-auth-client";

export const Route = createFileRoute("/")({ component: GerusaHome });

function GerusaHome() {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [error, setError] = useState("");
  const [setupAvailable, setSetupAvailable] = useState(false);

  useEffect(() => {
    void fetch("/api/setup/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((result: { available?: boolean }) => setSetupAvailable(result.available === true))
      .catch(() => undefined);
  }, []);

  async function startStory() {
    if (opening) return;
    setOpening(true);
    setError("");
    try {
      const setup = await fetch("/api/setup/status", { cache: "no-store" });
      const status = (await setup.json().catch(() => ({}))) as { available?: boolean };
      if (setup.ok && status.available) {
        await navigate({ to: "/setup" });
        return;
      }
      const session = await getLocalSession();
      if (!session?.user) {
        await navigate({ to: "/auth" });
        return;
      }
      const profile = await fetch("/api/profile", { cache: "no-store" });
      const identity = (await profile.json().catch(() => ({}))) as { is_master?: boolean };
      await navigate({ to: identity.is_master ? "/mestre" : "/home" });
    } catch {
      setError("A conversa não abriu agora. Tente novamente.");
      setOpening(false);
    }
  }

  return (
    <main className="gerusa-page">
      <div className="gerusa-glow" aria-hidden="true" />
      <header className="gerusa-header">
        <a className="gerusa-wordmark" href="#inicio" aria-label="Gerusa, início">
          <img src="/gerusa-logo.png" alt="" />
          <span>GERUSA</span>
        </a>
        <p>
          Mestra de RPG <i>·</i> observadora de pessoas
        </p>
      </header>

      <section className="gerusa-hero" id="inicio" aria-labelledby="gerusa-title">
        <div className="gerusa-portrait">
          <img
            src="/gerusa.png"
            alt="Gerusa Poulain, mestra de RPG, em seu escritório à luz de velas, ao lado de livros, caderno e dados"
          />
          <span className="portrait-caption">
            Anotações importantes. E outras que ainda não parecem.
          </span>
        </div>

        <div className="gerusa-copy">
          <p className="gerusa-eyebrow">
            <span /> Caderno aberto · dados à mão
          </p>
          <p className="gerusa-quote">“Interessante.”</p>
          <h1 id="gerusa-title">
            Gerusa <em>Poulain</em>
          </h1>
          <p className="gerusa-role">Mestra de RPG</p>
          <p className="gerusa-intro">
            Gosto de histórias sobre pessoas — especialmente quando elas têm certeza de que sabem o
            que estão fazendo.
          </p>
          <p className="gerusa-detail">
            Escolhas deixam marcas. Detalhes pequenos costumam voltar. E os dados, naturalmente, têm
            seus próprios cúmplices.
          </p>
          <button
            className="gerusa-cta"
            type="button"
            disabled={opening}
            onClick={() => void startStory()}
            aria-describedby="gerusa-note"
          >
            {opening
              ? "Abrindo conversa…"
              : setupAvailable
                ? "Configurar a Gerusa"
                : "Iniciar uma história"}{" "}
            <span aria-hidden="true">↗</span>
          </button>
          <p className="gerusa-note" id="gerusa-note" role={error ? "alert" : undefined}>
            {error ||
              (setupAvailable ? "Primeiro acesso da professora." : "Uma conversa, sem pressa.")}
          </p>
          <p className="gerusa-signature">Por enquanto, podemos começar com uma boa pergunta.</p>
        </div>
      </section>

      <footer className="gerusa-footer">
        <span>
          Histórias <i>·</i> pessoas <i>·</i> consequências
        </span>
        <span>
          GERUSA POULAIN <b>♡</b>
        </span>
      </footer>
    </main>
  );
}
