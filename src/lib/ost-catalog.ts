export type OstCategory =
  | "Abertura, manifesto e identidade de KALLISTIS"
  | "Cosmogonia, lore e Fratura"
  | "Exploração, ambiente e contemplação"
  | "Travessia, deslocamento e transição"
  | "Tensão, investigação e estranhamento"
  | "Combate"
  | "Perseguição, urgência e colapso"
  | "Ritual, sagrado e transcendência"
  | "Nomos, máquina e desumanização"
  | "Personagens, povos e identidades"
  | "Refúgio, alteridade e pertencimento"
  | "Revelação, escolha e clímax narrativo";

export type OstTrack = {
  id: string;
  title: string;
  subtitle: string | null;
  artist: string;
  src: string;
  category: OstCategory;
  categories: readonly OstCategory[];
  autoplayAllowed: boolean;
  explicitUserActionRequired: boolean;
};

type CuratedTrack = {
  id: string;
  title: string;
  fileName: string;
  categories: readonly OstCategory[];
};

const CATEGORY = {
  opening: "Abertura, manifesto e identidade de KALLISTIS",
  cosmology: "Cosmogonia, lore e Fratura",
  exploration: "Exploração, ambiente e contemplação",
  travel: "Travessia, deslocamento e transição",
  tension: "Tensão, investigação e estranhamento",
  combat: "Combate",
  pursuit: "Perseguição, urgência e colapso",
  ritual: "Ritual, sagrado e transcendência",
  nomos: "Nomos, máquina e desumanização",
  identities: "Personagens, povos e identidades",
  refuge: "Refúgio, alteridade e pertencimento",
  revelation: "Revelação, escolha e clímax narrativo",
} satisfies Record<string, OstCategory>;

const CURATED_TRACKS: readonly CuratedTrack[] = [
  {
    id: "alma-de-bronze-coracao-de-nomos",
    title: "Alma de Bronze — Coração de Nomos",
    fileName: "Alma de Bronze — Coração de Nomos.mp3",
    categories: [CATEGORY.nomos, CATEGORY.identities, CATEGORY.refuge, CATEGORY.revelation],
  },
  {
    id: "antes-do-primeiro-dia",
    title: "Antes do Primeiro Dia",
    fileName: "Antes do Primeiro Dia.mp3",
    categories: [CATEGORY.ritual],
  },
  {
    id: "caminhos-entre-frestas",
    title: "Caminhos entre Frestas",
    fileName: "Caminhos entre Frestas.mp3",
    categories: [CATEGORY.cosmology, CATEGORY.exploration, CATEGORY.travel],
  },
  {
    id: "cancao-de-kael-memoria-mito-e-fe",
    title: "Canção de Kael — Memória, Mito e Fé",
    fileName: "Canção de Kael — Memória, Mito e Fé.mp3",
    categories: [
      CATEGORY.cosmology,
      CATEGORY.exploration,
      CATEGORY.ritual,
      CATEGORY.identities,
      CATEGORY.refuge,
      CATEGORY.revelation,
    ],
  },
  {
    id: "combate-sem-chao-firme",
    title: "Combate sem Chão Firme",
    fileName: "Combate sem Chão Firme.mp3",
    categories: [CATEGORY.combat, CATEGORY.pursuit],
  },
  {
    id: "dois-mundos-sob-a-fratura",
    title: "Dois Mundos sob a Fratura",
    fileName: "Dois Mundos sob a Fratura.mp3",
    categories: [CATEGORY.cosmology, CATEGORY.travel],
  },
  {
    id: "garantia-expirada",
    title: "Garantia Expirada",
    fileName: "Garantia Expirada.mp3",
    categories: [CATEGORY.tension, CATEGORY.nomos],
  },
  {
    id: "kaline",
    title: "Kaline",
    fileName: "Kaline.mp3",
    categories: [CATEGORY.exploration, CATEGORY.identities, CATEGORY.refuge],
  },
  {
    id: "kallistis-trailer",
    title: "KALLISTIS — Trailer",
    fileName: "KALLISTIS — Trailer.mp3",
    categories: [CATEGORY.opening],
  },
  {
    id: "levanta-ruge",
    title: "LEVANTA! RUGE!",
    fileName: "LEVANTA! RUGE!.mp3",
    categories: [CATEGORY.opening, CATEGORY.combat, CATEGORY.pursuit],
  },
  {
    id: "mi-nam-mi-raar",
    title: "MI NAM. MI RAAR",
    fileName: "MI NAM. MI RAAR.mp3",
    categories: [CATEGORY.opening, CATEGORY.identities, CATEGORY.refuge, CATEGORY.revelation],
  },
  {
    id: "mi-nam-mi-raar-tema-do-trailer",
    title: "MI NAM. MI RAAR — Tema do Trailer",
    fileName: "MI NAM. MI RAAR — Tema do Trailer.mp3",
    categories: [CATEGORY.opening],
  },
  {
    id: "motivo-de-cristal-a-ultima-diferenca",
    title: "Motivo de Cristal — A Última Diferença",
    fileName: "Motivo de Cristal — A Última Diferença.mp3",
    categories: [
      CATEGORY.opening,
      CATEGORY.cosmology,
      CATEGORY.exploration,
      CATEGORY.tension,
      CATEGORY.ritual,
      CATEGORY.revelation,
    ],
  },
  {
    id: "nao-consta-linha-de-montagem",
    title: "Não Consta — Linha de Montagem",
    fileName: "Não Consta — Linha de Montagem.mp3",
    categories: [CATEGORY.tension, CATEGORY.nomos],
  },
  {
    id: "o-instante-em-que-tudo-partiu",
    title: "O Instante em que Tudo Partiu",
    fileName: "O Instante em que Tudo Partiu.mp3",
    categories: [CATEGORY.cosmology, CATEGORY.tension, CATEGORY.pursuit, CATEGORY.revelation],
  },
  {
    id: "o-mundo-nao-sera-um",
    title: "O Mundo Não Será Um",
    fileName: "O Mundo Não Será Um.mp3",
    categories: [
      CATEGORY.opening,
      CATEGORY.cosmology,
      CATEGORY.combat,
      CATEGORY.identities,
      CATEGORY.refuge,
      CATEGORY.revelation,
    ],
  },
  {
    id: "oracao-da-pedralma-versao-i",
    title: "Oração da Pedr’alma — Versão I",
    fileName: "Oração da Pedr’alma — Versão I.mp3",
    categories: [CATEGORY.ritual],
  },
  {
    id: "oracao-da-pedralma-versao-ii",
    title: "Oração da Pedr’alma — Versão II",
    fileName: "Oração da Pedr’alma — Versão II.mp3",
    categories: [CATEGORY.ritual],
  },
  {
    id: "perseguicao-fraturada",
    title: "Perseguição Fraturada",
    fileName: "Perseguição Fraturada.mp3",
    categories: [CATEGORY.combat, CATEGORY.pursuit],
  },
  {
    id: "quando-o-mundo-era-inteiro",
    title: "Quando o Mundo Era Inteiro",
    fileName: "Quando o Mundo Era Inteiro.mp3",
    categories: [CATEGORY.cosmology],
  },
  {
    id: "quando-velarim-ainda-responde",
    title: "Quando Velarim Ainda Responde",
    fileName: "Quando Velarim Ainda Responde.mp3",
    categories: [
      CATEGORY.cosmology,
      CATEGORY.exploration,
      CATEGORY.travel,
      CATEGORY.tension,
      CATEGORY.ritual,
      CATEGORY.identities,
      CATEGORY.refuge,
    ],
  },
  {
    id: "refugio-dos-outros-onde-os-trocados-respiram",
    title: "Refúgio dos Outros — Onde os Trocados Respiram",
    fileName: "Refúgio dos Outros — Onde os Trocados Respiram.mp3",
    categories: [
      CATEGORY.exploration,
      CATEGORY.travel,
      CATEGORY.tension,
      CATEGORY.identities,
      CATEGORY.refuge,
      CATEGORY.revelation,
    ],
  },
  {
    id: "ritual-das-cinzas",
    title: "Ritual das Cinzas",
    fileName: "Ritual das Cinzas.mp3",
    categories: [CATEGORY.tension, CATEGORY.ritual],
  },
  {
    id: "ritual-de-ferro",
    title: "Ritual de Ferro",
    fileName: "Ritual de Ferro.mp3",
    categories: [CATEGORY.combat],
  },
  {
    id: "tempo-da-escolha",
    title: "Tempo da Escolha",
    fileName: "Tempo da Escolha.mp3",
    categories: [
      CATEGORY.opening,
      CATEGORY.combat,
      CATEGORY.pursuit,
      CATEGORY.nomos,
      CATEGORY.revelation,
    ],
  },
  {
    id: "travessia",
    title: "Travessia",
    fileName: "Travessia.mp3",
    categories: [CATEGORY.exploration, CATEGORY.travel],
  },
  {
    id: "vastas-planicies-silenciosas",
    title: "Vastas Planícies Silenciosas",
    fileName: "Vastas Planícies Silenciosas.mp3",
    categories: [CATEGORY.exploration, CATEGORY.travel],
  },
  {
    id: "vethari-na-mirveth-reconhecer-sem-apagar",
    title: "Vethari na Mirveth — Reconhecer sem Apagar",
    fileName: "Vethari na Mirveth — Reconhecer sem Apagar.mp3",
    categories: [CATEGORY.identities, CATEGORY.refuge],
  },
];

export const OST_CATALOG: readonly OstTrack[] = CURATED_TRACKS.map((track) => ({
  id: track.id,
  title: track.title,
  subtitle: null,
  artist: "",
  src: "/audio/ost/" + track.fileName + "?v=curated-1263d115",
  category: track.categories[0],
  categories: track.categories,
  autoplayAllowed: false,
  explicitUserActionRequired: true,
}));

export const OST_CATEGORIES: readonly ("Todas" | OstCategory)[] = [
  "Todas",
  ...Object.values(CATEGORY),
];

export function getOstTrack(trackId: string): OstTrack {
  return OST_CATALOG.find((track) => track.id === trackId) ?? OST_CATALOG[0];
}
