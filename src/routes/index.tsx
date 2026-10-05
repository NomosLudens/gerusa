import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

function LandingPage() {
  return (
    <main className="landing-page">
      <div className="landing-page__grain" aria-hidden="true" />
      <header className="landing-header">
        <a className="landing-brand" href="#inicio" aria-label="Kallistis, início">
          <img
            src="/brand-assets/kallistis-canon-wordmark.png?v=20260830"
            alt="Kallistis"
            className="landing-brand__wordmark"
          />
        </a>
      </header>

      <section id="inicio" className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero__copy">
          <p className="landing-kicker">Um universo vivo para atravessar</p>
          <h1 id="landing-title">
            Mundos partidos. <em>Histórias que permanecem.</em>
          </h1>
          <p className="landing-hero__lead">
            Kallistis é um RPG e uma plataforma para jogar, conversar, criar personagens e preparar
            jornadas guiadas pelo cânone.
          </p>
          <div className="landing-actions">
            <Link to="/auth" className="landing-button landing-button--primary">
              Entrar no Kallistis
            </Link>
            <a href="mailto:contato@kallistis.app" className="landing-button landing-button--quiet">
              Entre em contato
            </a>
          </div>
          <p className="landing-note">
            O acesso é controlado por credencial. Para acesso e informações, escreva para
            contato@kallistis.app.
          </p>
        </div>
        <div className="landing-hero__mark" aria-hidden="true">
          <div className="landing-hero__halo" />
          <img src="/brand-assets/kallistis-canon-crystal.png?v=20260830" alt="" />
        </div>
      </section>

      <section className="landing-intro" aria-labelledby="landing-intro-title">
        <p className="landing-kicker">O que é Kallistis</p>
        <h2 id="landing-intro-title">Um lugar para a mesa continuar existindo.</h2>
        <p>
          Entre o jogo e o registro, Kallistis reúne a campanha, suas vozes e o mundo que vocês
          estão construindo. Um espaço preciso para explorar, criar e lembrar.
        </p>
      </section>

      <section className="landing-pillars" aria-label="Possibilidades do Kallistis">
        <article className="landing-pillar">
          <span className="landing-pillar__index">01</span>
          <h3>Jogar e organizar</h3>
          <p>Campanhas, jornadas e decisões reunidas em um só espaço.</p>
        </article>
        <article className="landing-pillar">
          <span className="landing-pillar__index">02</span>
          <h3>Criar personagens</h3>
          <p>Personagens com presença, continuidade e lugar dentro do mundo.</p>
        </article>
        <article className="landing-pillar">
          <span className="landing-pillar__index">03</span>
          <h3>Consultar o cânone</h3>
          <p>Memória, contexto e linguagem para atravessar a história com clareza.</p>
        </article>
      </section>

      <footer className="landing-footer">
        <div>
          <span className="landing-footer__word">Kallistis</span>
          <span className="landing-footer__domain">kallistis.app</span>
        </div>
        <a href="mailto:contato@kallistis.app">contato@kallistis.app</a>
      </footer>
    </main>
  );
}
