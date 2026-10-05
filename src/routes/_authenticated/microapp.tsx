import { createFileRoute, useSearch } from "@tanstack/react-router";

const HTML_APPS = {
  "character-forge": {
    title: "Character Forge",
    src: "/jogar/character-forge.html",
  },
  velarim: {
    title: "Velarim",
    src: "/jogar/velarim.html",
  },
  "canon-explorer": {
    title: "Canon Explorer",
    src: "/jogar/canon-explorer.html",
  },
} as const;

type HtmlAppId = keyof typeof HTML_APPS;

function MicroappPage() {
  const search = useSearch({ from: "/_authenticated/microapp" }) as {
    app?: string;
    mode?: string;
    characterId?: string;
  };
  const app = search.app && search.app in HTML_APPS ? HTML_APPS[search.app as HtmlAppId] : null;

  if (!app) {
    return (
      <div className="grid min-h-[calc(100dvh-3.5rem)] place-items-center">
        Superfície não encontrada.
      </div>
    );
  }

  return (
    <main className="h-[calc(100dvh-3.5rem)] overflow-hidden bg-background">
      <iframe
        title={app.title}
        src={
          app.src +
          (search.mode === "tal" && search.characterId
            ? `?mode=tal&characterId=${encodeURIComponent(search.characterId)}&source=master-characters-hub`
            : search.characterId
              ? `?characterId=${encodeURIComponent(search.characterId)}`
              : "")
        }
        className="h-full w-full border-0"
      />
    </main>
  );
}

export const Route = createFileRoute("/_authenticated/microapp")({ component: MicroappPage });
