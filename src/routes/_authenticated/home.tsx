import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Map,
  ScrollText,
  Feather,
  Flower2,
  Mic,
  Sparkle,
  Sprout,
  UserCircle,
} from "lucide-react";
import { getHomeApps, useAuthz } from "@/lib/use-authz";
import { groupAppsForNavigation, type AppRegistryItem } from "@/lib/app-registry";
import { useProfile, welcomeGreeting } from "@/lib/use-profile";
import {
  InlineListSkeleton,
  RouteErrorBoundary,
  RouteNotFoundBoundary,
} from "@/components/loading-states";
import { SemaforoPresence } from "@/components/SemaforoPresence";
import { PrivateMasterChannel } from "@/components/PrivateMasterChannel";
import { usePresencaRegime } from "@/lib/use-presenca-regime";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomeCockpit,
  errorComponent: RouteErrorBoundary,
  notFoundComponent: () => <RouteNotFoundBoundary />,
});

const APP_ICONS: Record<string, typeof Sparkle> = {
  "kallistis-chat": Sparkle,
  "kallistis-presente": Mic,
  agenda: CalendarDays,
  "registro-vivo": Feather,
  jardim: Flower2,
  revisao: Sprout,
  perfil: UserCircle,
};

function HomeCockpit() {
  const { onboarding, isSystemMaster } = useProfile();
  const authz = useAuthz();
  const homeGroups = groupAppsForNavigation(getHomeApps(authz));

  return (
    <div className="min-h-[calc(100dvh-3.5rem)] bg-[#08080E] text-[#F3EBDD]">
      <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 pb-24 sm:px-6 sm:py-10">
        <header className="space-y-3">
          <p className="text-[10px] uppercase tracking-[0.32em] text-[color:var(--gold)]">
            KALLISTIS
          </p>
          <div className="space-y-2">
            <h1 className="serif text-3xl sm:text-4xl">
              {welcomeGreeting(onboarding?.treatment_type ?? null)}
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed text-[#F3EBDD]/60">
              Uma entrada enxuta para conversar, organizar o dia e cuidar da memória.
            </p>
          </div>
        </header>

        <PresenceHomeBlock isSystemMaster={isSystemMaster} />

        <ContinuityHomeBlock />
        <section className="space-y-6 fade-up" aria-label="Núcleo canônico da KALLISTIS">
          {authz.loading && <InlineListSkeleton rows={4} />}

          {!authz.loading && homeGroups.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-[#111016] p-5">
              <p className="serif text-xl text-[#F3EBDD]">Nenhuma superfície disponível</p>
              <p className="mt-1 text-sm text-[#F3EBDD]/55">
                Nenhuma superfície canônica disponível para este perfil.
              </p>
            </div>
          )}

          {homeGroups.map((group) => (
            <section key={group.id} className="space-y-3">
              <div>
                <h2 className="serif text-2xl text-[#F3EBDD]">{group.label}</h2>
                <p className="text-xs text-[#F3EBDD]/45">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {group.apps.map((app) => (
                  <AppHubCard key={app.id} app={app} />
                ))}
              </div>
            </section>
          ))}
        </section>
      </div>
    </div>
  );
}

type HomeContinuityMap = {
  id: string;
  mesaName: string;
  title: string;
};

function ContinuityHomeBlock() {
  const continuityPathByMesa: Record<string, string> = {
    "Geek Wizards": "/campanha/geek-wizards",
    "Taverna dos Pandas": "/campanha/taverna-dos-pandas",
  };
  const [maps, setMaps] = useState<HomeContinuityMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/continuity-maps", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return [];
        const payload = (await response.json()) as { maps?: HomeContinuityMap[] };
        return Array.isArray(payload.maps) ? payload.maps : [];
      })
      .then((next) => {
        if (cancelled) return;
        setMaps(next);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setMaps([]);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="space-y-3" aria-label="Mapas e continuidade">
      <div>
        <h2 className="serif text-2xl text-[#F3EBDD]">Mapas e continuidade</h2>
        <p className="text-xs text-[#F3EBDD]/45">
          O mundo da campanha, seus mapas e os caminhos já registrados para esta Mesa.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Link
          to="/mapas"
          className="lift-card group flex min-h-32 items-start gap-4 rounded-2xl border border-white/5 bg-[#111016] p-4 transition hover:border-[color:var(--gold)]/45 hover:bg-[#14121A]"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
            <Map className="h-5 w-5" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="serif block text-xl leading-tight text-[#F3EBDD]">
              Atlas dos Mapas
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-[#F3EBDD]/60">
              Explore o mapa interativo do Cinturão das Frestas.
            </span>
            <span className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)]">
              Abrir mapa
            </span>
          </span>
        </Link>
        {maps.map((map) => {
          const campaignPath = continuityPathByMesa[map.mesaName];
          if (!campaignPath) return null;
          return (
            <Link
              key={map.id}
              to={campaignPath as never}
              className="lift-card group flex min-h-32 items-start gap-4 rounded-2xl border border-white/5 bg-[#111016] p-4 transition hover:border-[color:var(--gold)]/45 hover:bg-[#14121A]"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
                <ScrollText className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="serif block text-xl leading-tight text-[#F3EBDD]">
                  {map.mesaName}
                </span>
                <span className="mt-2 block text-sm leading-relaxed text-[#F3EBDD]/60">
                  Continuidade da Mesa
                </span>
                <span className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)]">
                  Abrir continuidade
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      {loading ? <p className="text-xs text-[#F3EBDD]/45">Carregando continuidade…</p> : null}
      {!loading && maps.length === 0 ? (
        <p className="text-xs text-[#F3EBDD]/45">
          Nenhum mapa de continuidade disponível para esta conta.
        </p>
      ) : null}
    </section>
  );
}

function PresenceHomeBlock({ isSystemMaster }: { isSystemMaster: boolean }) {
  const presence = usePresencaRegime();
  if (isSystemMaster) return <MasterHomeBlock />;
  return (
    <section className="space-y-2" aria-label="Presença e canal privado">
      <SemaforoPresence defaultOpen controlled={presence} />
      <PrivateMasterChannel mesaId={presence.mesaId} />
    </section>
  );
}

function MasterHomeBlock() {
  return (
    <section className="space-y-2" aria-label="Acesso de Mestre">
      <div className="rounded-xl border border-[color:var(--gold)]/20 bg-[#0C0B12]/80 p-4">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--gold)]">
          Acesso de Mestre
        </p>
        <h2 className="mt-1 serif text-xl">Central do Mestre</h2>
        <p className="mt-2 text-sm leading-relaxed text-[#F3EBDD]/60">
          Você está conectado como TAL, com acesso às Mesas e às ferramentas operacionais do Mestre.
        </p>
        <Link
          to="/mestre"
          className="mt-4 inline-flex min-h-11 items-center rounded-lg border border-[color:var(--gold)]/40 px-4 text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)]"
        >
          Abrir Central do Mestre
        </Link>
      </div>
    </section>
  );
}

function AppHubCard({ app }: { app: AppRegistryItem }) {
  const Icon = APP_ICONS[app.id] ?? Sparkle;

  return (
    <Link
      to={app.path as never}
      className="lift-card group flex min-h-32 items-start gap-4 rounded-2xl border border-white/5 bg-[#111016] p-4 transition hover:border-[color:var(--gold)]/45 hover:bg-[#14121A]"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[color:var(--gold)]/20 bg-[color:var(--gold)]/10 text-[color:var(--gold)]">
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="serif block text-xl leading-tight text-[#F3EBDD]">
          {app.shortLabel ?? app.label}
        </span>
        <span className="mt-2 block text-sm leading-relaxed text-[#F3EBDD]/60">
          {app.homeDescription ?? app.description}
        </span>
        <span className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-[color:var(--gold)] transition group-hover:text-[color:var(--gold)]">
          Abrir
        </span>
      </span>
    </Link>
  );
}
