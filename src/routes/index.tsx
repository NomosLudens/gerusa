import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: GerusaHome });

function GerusaHome() {
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
          <button className="gerusa-cta" type="button" disabled aria-describedby="gerusa-note">
            Iniciar uma história <span aria-hidden="true">↗</span>
          </button>
          <p className="gerusa-note" id="gerusa-note">
            Conversas serão habilitadas no próximo gate.
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
