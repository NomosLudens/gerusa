import { useEffect, useMemo, useState, type ReactNode } from "react";

import { kallistisCrystal, kallistisWordmark } from "@/lib/brand-assets";
import { deriveCharacterDisplayState } from "@/lib/character-display-state";

type JsonObject = Record<string, unknown>;
type KallistisCapability = {
  id: string;
  type: string;
  name: string;
  canonical_definition: { summary: string };
  character_manifestation_description: string;
};

type CharacterRecord = {
  id: string;
  name: string;
  playerName: string;
  ownerDisplayName?: string;
  status: string;
  snapshot: JsonObject;
  kallistis?: {
    manifestation: string;
    fulgor_current: number;
    fulgor_max: 5;
    capabilities: KallistisCapability[];
  };
  version: number;
  updatedAt: string;
};

const ATTRIBUTE_ORDER = ["Corpo", "Agilidade", "Intelecto", "Presença", "Vontade", "Sintonia"];
const SKILL_ORDER = [
  "Atletismo",
  "Combate",
  "Pontaria",
  "Furtividade",
  "Percepção",
  "Sobrevivência",
  "Investigação",
  "Conhecimento",
  "Ofício",
  "Influência",
  "Empatia",
  "Cuidado",
  "Magia",
  "Evocação",
  "Velarim",
];

const ARMOR_PROTECTION: Record<string, number> = {
  "Roupas reforçadas": 1,
  Leve: 2,
  Média: 3,
  Pesada: 4,
};

const asRecord = (value: unknown): JsonObject =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as JsonObject) : {};

const asList = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

const asText = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

const asNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const displayValue = (value: unknown): string => {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "Sim" : "Não";
  return "";
};

const displayList = (value: unknown): string[] =>
  asList(value)
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const object = asRecord(item);
      return asText(object.nome || object.name || object.titulo || object.label);
    })
    .filter(Boolean);

const firstText = (...values: unknown[]): string => {
  for (const value of values) {
    const candidate = asText(value);
    if (candidate) return candidate;
  }
  return "";
};

function activeTrail(snapshot: JsonObject): JsonObject {
  const trails = asList(snapshot.trilhas);
  const activeIndex = asNumber(snapshot.trilhaAtiva) ?? 0;
  return asRecord(trails[activeIndex] ?? trails[0]);
}

function escala(attribute: number): number {
  return attribute <= 4 ? 1 : 2 ** (attribute - 4);
}

function canonicalDerived(snapshot: JsonObject) {
  // Espelho read-only das fórmulas derivadas já existentes no Character Forge.
  // Não persiste, normaliza ou altera o snapshot canônico.
  const base = asRecord(snapshot.atributosBase);
  const trail = activeTrail(snapshot);
  const gains = asRecord(trail.atributosGanhos);
  const attributes = Object.fromEntries(
    ATTRIBUTE_ORDER.map((attribute) => [
      attribute,
      (asNumber(base[attribute]) ?? 0) + (asNumber(gains[attribute]) ?? 0),
    ]),
  ) as Record<string, number>;
  const body = attributes.Corpo ?? 0;
  const will = attributes.Vontade ?? 0;
  const tuning = attributes.Sintonia ?? 0;
  const agility = attributes.Agilidade ?? 0;
  const armor = asRecord(snapshot.equipamento);
  const armorName = firstText(armor.armadura, armor.armor);
  const extras = displayList(armor.extras);
  const peopleChoices = asRecord(snapshot.escolhasPovo);
  const modules = displayList(peopleChoices.modulos);
  const armorProtection =
    (ARMOR_PROTECTION[armorName] ?? 0) +
    (snapshot.povo === "Nomos" && modules.includes("Blindagem leve") ? 1 : 0);
  const shield = extras.includes("Escudo") ? 1 : 0;
  const protection = armorProtection + shield;
  const milestone = asNumber(trail.marco) ?? 1;

  return {
    attributes,
    milestone,
    vitalidade: Math.floor((10 + body * 3) * escala(body)),
    lucidez: 8 + will * 3,
    fluxo: 3 + tuning + Math.ceil(milestone / 2),
    guarda: 10 + agility + protection,
    fortitude: 10 + body + will,
    integridade: 10 + will + tuning,
    protection,
    carga:
      6 + body + (snapshot.povo === "Nomos" && modules.includes("Compartimento protegido") ? 2 : 0),
    movimento: "6 células / 2 zonas",
  };
}

function skillEntries(snapshot: JsonObject, trail: JsonObject) {
  const base = asRecord(snapshot.periciasBase);
  const provenance = asRecord(snapshot.periciasProveniencia);
  const result = SKILL_ORDER.map((skill) => {
    const baseValue = asNumber(base[skill]);
    const detail = asRecord(provenance[skill]);
    const bonus = asNumber(detail.bonus);
    const finalValue =
      asNumber(detail.final) ?? (baseValue === null ? null : Math.min(5, baseValue + (bonus ?? 0)));
    return {
      name: skill,
      value: finalValue,
      base: baseValue,
      bonus,
      source: asText(detail.fontes),
    };
  });

  if (Object.keys(base).length || Object.keys(provenance).length) return result;
  return displayList(trail.pericias).map((skill) => ({
    name: skill,
    value: null,
    base: null,
    bonus: null,
    source: "",
  }));
}

function portraitSource(snapshot: JsonObject): string {
  const portrait = snapshot.retrato;
  if (typeof portrait === "string" && portrait.startsWith("data:image/")) return portrait;
  const portraitObject = asRecord(portrait);
  const portraitData = firstText(portraitObject.data, portraitObject.src);
  if (portraitData.startsWith("data:image/")) return portraitData;

  for (const item of asList(snapshot.galeria)) {
    const image = asRecord(item);
    const data = firstText(image.data, image.src, image.url);
    if (data.startsWith("data:image/")) return data;
  }
  return "";
}

function objectFieldValue(value: unknown): string {
  const scalar = displayValue(value);
  if (scalar) return scalar;
  if (Array.isArray(value)) return displayList(value).join(", ");
  const object = asRecord(value);
  return Object.entries(object)
    .map(([key, raw]) => {
      const nested = displayValue(raw);
      return nested ? fieldLabel(key) + ": " + nested : "";
    })
    .filter(Boolean)
    .join(" · ");
}

function objectFields(value: unknown): Array<[string, string]> {
  const object = asRecord(value);
  return Object.entries(object)
    .map(([key, raw]) => [key, objectFieldValue(raw)] as [string, string])
    .filter(([, value]) => Boolean(value));
}

function fieldLabel(key: string): string {
  return (
    {
      custo: "Custo",
      efeito: "Efeito",
      descricao: "Descrição",
      alcance: "Alcance",
      tags: "Tags",
      forma: "Forma",
      porte: "Porte",
      ancora: "Âncora",
      impulso: "Impulso",
      pacto: "Pacto",
      consciencia: "Consciência",
      aparencia: "Aparência",
    }[key] ?? key
  );
}

function readableItem(value: unknown): { name: string; details: Array<[string, string]> } | null {
  if (typeof value === "string") {
    const name = value.trim();
    return name ? { name, details: [] } : null;
  }
  const item = asRecord(value);
  const name = firstText(item.nome, item.name, item.titulo, item.label);
  if (!name) return null;
  return {
    name,
    details: objectFields(item).filter(
      ([key]) => !["nome", "name", "titulo", "label"].includes(key),
    ),
  };
}

function InfoLine({ label, value }: { label: string; value: unknown }) {
  const text = objectFieldValue(value);
  if (!text) return null;
  return (
    <div className="character-sheet__info-line">
      <span>{label}</span>
      <strong>{text}</strong>
    </div>
  );
}

function Section({
  title,
  children,
  className = "",
}: {
  eyebrow?: string;
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={["character-sheet__section", className].filter(Boolean).join(" ")}>
      <h2>{title}</h2>
      {children}
    </section>
  );
}

function ItemCard({ item }: { item: unknown }) {
  const readable = readableItem(item);
  if (!readable) return null;
  return (
    <article className="character-sheet__card">
      <h3>{readable.name}</h3>
      {readable.details.map(([key, value]) => (
        <InfoLine key={readable.name + "-" + key} label={fieldLabel(key)} value={value} />
      ))}
    </article>
  );
}

function Quote({ label, value }: { label: string; value: unknown }) {
  const text = asText(value);
  if (!text) return null;
  return (
    <div className="character-sheet__quote">
      <span>{label}</span>
      <p>{text}</p>
    </div>
  );
}

function CharacterContent({ character }: { character: CharacterRecord }) {
  const snapshot = asRecord(character.snapshot);
  const trail = activeTrail(snapshot);
  const kallistis = character.kallistis;
  const derived = useMemo(() => canonicalDerived(snapshot), [snapshot]);
  const skills = useMemo(() => skillEntries(snapshot, trail), [snapshot, trail]);
  const portrait = portraitSource(snapshot);
  const concept = asRecord(snapshot.conceito);
  const resources = asRecord(snapshot.reservas);
  const equipment = asRecord(snapshot.equipamento);
  const origin = asRecord(snapshot.origemTrocado);
  const peopleChoices = asRecord(snapshot.escolhasPovo);
  const evoked = asList(trail.vinculosEvocados);
  const links = asList(snapshot.vinculos);
  const name = firstText(snapshot.nome, character.name) || "Personagem sem nome";
  const player = firstText(snapshot.jogador, character.playerName, character.ownerDisplayName);
  const trailName = [firstText(trail.oficio), firstText(trail.papel)].filter(Boolean).join(" · ");

  const resourceRows = [
    ["Vitalidade", "vitalidade", derived.vitalidade],
    ["Lucidez", "lucidez", derived.lucidez],
    ["Fluxo", "fluxo", derived.fluxo],
    ["Fôlego", "folego", 3],
    ["Determinação", "determinacao", 1],
    ...(Object.prototype.hasOwnProperty.call(resources, "sombra")
      ? ([["Sombra", "sombra", 6]] as const)
      : []),
  ] as const;

  const narrativeHasContent = [concept.identidade, concept.objetivo, concept.perda].some((value) =>
    Boolean(asText(value)),
  );
  const originHasContent = [
    snapshot.origem,
    snapshot.origemDetalhe,
    snapshot.origemBeneficio,
    snapshot.dividaComunitaria,
    ...Object.values(origin),
  ].some((value) => Boolean(displayValue(value)));
  const peopleHasContent =
    [snapshot.povo, snapshot.heranca, snapshot.pericaLivre, ...Object.values(peopleChoices)].some(
      (value) => Boolean(displayValue(value)),
    ) || ["traco", "dom", "dissonancia"].some((key) => Boolean(readableItem(snapshot[key])));
  const equipmentHasContent =
    ["arma", "armadura", "ferramenta"].some((key) => Boolean(readableItem(equipment[key]))) ||
    displayList(equipment.consumiveis).length > 0 ||
    displayList(equipment.extras).length > 0;

  return (
    <article className="character-sheet__paper">
      <div className="character-sheet__watermark" aria-hidden="true">
        <img src={kallistisCrystal.url} alt="" />
      </div>

      <div className="character-sheet__page character-sheet__page--one">
        <header className="character-sheet__header">
          <div className="character-sheet__brand">
            <img className="character-sheet__crystal" src={kallistisCrystal.url} alt="" />
            <img
              className="character-sheet__wordmark"
              src={kallistisWordmark.url}
              alt="KALLISTIS"
            />
          </div>
          <div className="character-sheet__header-meta">
            <span>FICHA DE PERSONAGEM</span>
            <small>leitura · fonte canônica</small>
          </div>
        </header>

        <div className="character-sheet__identity">
          {portrait ? <img className="character-sheet__portrait" src={portrait} alt="" /> : null}
          <div className="character-sheet__identity-copy">
            <p className="character-sheet__eyebrow">PERSONAGEM</p>
            <h1>{name}</h1>
            <p className="character-sheet__subtitle">
              {[
                firstText(snapshot.povo),
                firstText(snapshot.origem),
                trailName,
                derived.milestone ? "Marco " + derived.milestone : "",
              ]
                .filter(Boolean)
                .join("  ·  ") || "Identidade canônica"}
            </p>
            {player ? <p className="character-sheet__player">Jogador · {player}</p> : null}
          </div>
          <div className="character-sheet__identity-stamp">
            <span>
              {
                deriveCharacterDisplayState({
                  status: character.status,
                  completo: character.snapshot.completo === true,
                }).playerLabel
              }
            </span>
            <small>versão {character.version}</small>
          </div>
        </div>

        <div className="character-sheet__columns character-sheet__columns--lead">
          <Section eyebrow="Estado" title="Recursos">
            <div className="character-sheet__resource-grid">
              {resourceRows.map(([label, key, maximum]) => {
                const current = asNumber(resources[key]) ?? maximum;
                const progress = maximum > 0 ? Math.max(0, Math.min(1, current / maximum)) : 0;
                return (
                  <div className="character-sheet__meter" key={key}>
                    <div>
                      <span>{label}</span>
                      <strong>
                        {current} <small>/ {maximum}</small>
                      </strong>
                    </div>
                    <i style={{ width: progress * 100 + "%" }} />
                  </div>
                );
              })}
            </div>
          </Section>

          <Section eyebrow="Identidade singular" title="Manifestação Pessoal · Fulgor">
            <Quote label="Manifestação Pessoal" value={snapshot.manifestacao_pessoal} />
            <div className="character-sheet__subcard">
              <span>Fulgor</span>
              <strong>
                {Number.isInteger(snapshot.fulgor)
                  ? Math.max(0, Math.min(5, Number(snapshot.fulgor)))
                  : 0}{" "}
                / 5{snapshot.fulgor === 5 ? " · FULGOR PLENO" : ""}
              </strong>
            </div>
            <p className="character-sheet__fineprint">
              Marcador narrativo sem bônus ou modificador mecânico.
            </p>
          </Section>

          <Section eyebrow="Prontidão" title="Defesas">
            <div className="character-sheet__stat-grid">
              {[
                ["Guarda", derived.guarda],
                ["Fortitude", derived.fortitude],
                ["Integridade", derived.integridade],
                ["Proteção", derived.protection],
                ["Carga", derived.carga],
              ].map(([label, value]) => (
                <div className="character-sheet__stat" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            <p className="character-sheet__fineprint">Movimento · {derived.movimento}</p>
          </Section>
        </div>

        <Section
          eyebrow="Fundação"
          title="Atributos"
          className="character-sheet__section--attributes"
        >
          <div className="character-sheet__attribute-grid">
            {ATTRIBUTE_ORDER.map((attribute) => (
              <div className="character-sheet__attribute" key={attribute}>
                <span>{attribute}</span>
                <strong>{derived.attributes[attribute] ?? "—"}</strong>
              </div>
            ))}
          </div>
        </Section>

        <div className="character-sheet__columns">
          <Section eyebrow="Domínio" title="Perícias" className="character-sheet__section--skills">
            <div className="character-sheet__skill-list">
              {skills.map((skill) => (
                <div className="character-sheet__skill" key={skill.name}>
                  <span>{skill.name}</span>
                  <strong>{skill.value ?? "—"}</strong>
                  {skill.source ? <small title={skill.source}>fonte canônica</small> : null}
                </div>
              ))}
            </div>
          </Section>

          <Section
            eyebrow="Traço ativo"
            title={trailName || "Trilha"}
            className="character-sheet__section--trail"
          >
            <div className="character-sheet__info-list">
              <InfoLine label="Ofício" value={trail.oficio} />
              <InfoLine label="Papel" value={trail.papel} />
              <InfoLine label="Marco" value={trail.marco} />
              <InfoLine label="Chave" value={firstText(trail.chaveNome, trail.chave)} />
              <InfoLine label="Técnica inicial" value={asList(trail.tecnicas)[0]} />
              <InfoLine label="Perícia livre" value={snapshot.pericaLivre} />
              <InfoLine
                label="Proficiências"
                value={firstText(trail.proficiencias, snapshot.proficiencias)}
              />
            </div>
            {displayList(trail.especializacoes).length ? (
              <div className="character-sheet__tag-row">
                {displayList(trail.especializacoes).map((item) => (
                  <span key={item}>{item}</span>
                ))}
              </div>
            ) : null}
            {readableItem(snapshot.tecnicaHeranca) ? (
              <div className="character-sheet__subcard">
                <span>Técnica de herança</span>
                <strong>{readableItem(snapshot.tecnicaHeranca)?.name}</strong>
              </div>
            ) : null}
          </Section>
        </div>
      </div>

      <div className="character-sheet__page character-sheet__page--two">
        {peopleHasContent ? (
          <Section
            eyebrow="Pertencimento"
            title="Povo & herança"
            className="character-sheet__section--people"
          >
            <div className="character-sheet__info-list character-sheet__info-list--three">
              <InfoLine label="Povo" value={snapshot.povo} />
              <InfoLine label="Herança" value={snapshot.heranca} />
              <InfoLine label="Perícia livre" value={snapshot.pericaLivre} />
            </div>
            {["traco", "dom", "dissonancia"].some((key) => Boolean(readableItem(snapshot[key]))) ? (
              <div className="character-sheet__card-grid">
                {["traco", "dom", "dissonancia"].map((key) => {
                  const item = readableItem(snapshot[key]);
                  return item ? <ItemCard key={key} item={snapshot[key]} /> : null;
                })}
              </div>
            ) : null}
            {Object.entries(peopleChoices).length ? (
              <div className="character-sheet__card-grid">
                {Object.entries(peopleChoices).map(([key, value]) => (
                  <InfoLine key={key} label={key} value={value} />
                ))}
              </div>
            ) : null}
          </Section>
        ) : null}

        {originHasContent ? (
          <Section eyebrow="Percurso" title="Origem" className="character-sheet__section--origin">
            <div className="character-sheet__info-list character-sheet__info-list--three">
              <InfoLine label="Origem" value={snapshot.origem} />
              <InfoLine label="Detalhe" value={snapshot.origemDetalhe} />
              <InfoLine label="Benefício" value={snapshot.origemBeneficio} />
              <InfoLine label="Dívida comunitária" value={snapshot.dividaComunitaria} />
              {Object.entries(origin).map(([key, value]) => (
                <InfoLine key={key} label={key} value={value} />
              ))}
            </div>
          </Section>
        ) : null}

        {equipmentHasContent ? (
          <Section
            eyebrow="Inventário"
            title="Equipamento"
            className="character-sheet__section--equipment"
          >
            <div className="character-sheet__equipment-grid">
              {["arma", "armadura", "ferramenta"].map((key) => {
                const item = readableItem(equipment[key]);
                return item ? (
                  <div className="character-sheet__card" key={key}>
                    <span className="character-sheet__card-label">{key}</span>
                    <h3>{item.name}</h3>
                    {item.details.map(([detailKey, value]) => (
                      <InfoLine
                        key={key + "-" + detailKey}
                        label={fieldLabel(detailKey)}
                        value={value}
                      />
                    ))}
                  </div>
                ) : null;
              })}
            </div>
            {displayList(equipment.consumiveis).length ? (
              <div className="character-sheet__item-group">
                <span className="character-sheet__card-label">Consumíveis</span>
                <div className="character-sheet__tag-row">
                  {displayList(equipment.consumiveis).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
            {displayList(equipment.extras).length ? (
              <div className="character-sheet__item-group">
                <span className="character-sheet__card-label">Extras</span>
                <div className="character-sheet__tag-row">
                  {displayList(equipment.extras).map((item) => (
                    <span key={item}>{item}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </Section>
        ) : null}

        {narrativeHasContent ? (
          <Section eyebrow="Núcleo" title="Conceito" className="character-sheet__section--concept">
            <div className="character-sheet__quote-grid">
              <Quote label="Identidade" value={concept.identidade} />
              <Quote label="Objetivo" value={concept.objetivo} />
              <Quote label="Perda" value={concept.perda} />
            </div>
          </Section>
        ) : null}

        {[
          ["Promessa", snapshot.promessa],
          ["Ferida", snapshot.ferida],
          ["Pergunta", snapshot.pergunta],
        ].some(([, value]) => Boolean(asText(value))) ? (
          <Section
            eyebrow="Horizonte"
            title="Promessa · ferida · pergunta"
            className="character-sheet__section--promise"
          >
            <div className="character-sheet__quote-grid">
              <Quote label="Promessa" value={snapshot.promessa} />
              <Quote label="Ferida" value={snapshot.ferida} />
              <Quote label="Pergunta" value={snapshot.pergunta} />
            </div>
          </Section>
        ) : null}

        {links.length ? (
          <Section eyebrow="Laços" title="Vínculos" className="character-sheet__section--links">
            <div className="character-sheet__card-grid">
              {links.map((link, index) => (
                <ItemCard key={"link-" + index} item={link} />
              ))}
            </div>
          </Section>
        ) : null}

        {evoked.length ? (
          <Section
            eyebrow="Evocação"
            title="Vínculos evocados"
            className="character-sheet__section--evoked"
          >
            <div className="character-sheet__card-grid">
              {evoked.map((link, index) => (
                <ItemCard key={"evoked-" + index} item={link} />
              ))}
            </div>
          </Section>
        ) : null}

        {kallistis?.capabilities?.length ? (
          <Section
            eyebrow="Capacidades"
            title="Regra oficial · Como isso se manifesta"
            className="character-sheet__section--techniques"
          >
            <div className="character-sheet__card-grid">
              {kallistis.capabilities.map((capability) => (
                <article
                  className="character-sheet__card"
                  key={capability.type + ":" + capability.id}
                >
                  <span className="character-sheet__card-label">{capability.type}</span>
                  <h3>{capability.name}</h3>
                  <div className="character-sheet__info-line">
                    <span>Regra oficial</span>
                    <strong>{capability.canonical_definition.summary}</strong>
                  </div>
                  <div className="character-sheet__personal-manifestation">
                    <span>Como isso se manifesta</span>
                    <p>
                      {capability.character_manifestation_description ||
                        "Não descrita para esta personagem."}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </Section>
        ) : null}

        {[
          ["Apelido", snapshot.apelido],
          ["Pronomes", snapshot.pronomes],
        ].some(([, value]) => Boolean(asText(value))) ||
        [
          snapshot.biografia,
          snapshot.aparencia,
          snapshot.descricao,
          snapshot.notasNarrativasPublicas,
        ].some((value) => Boolean(asText(value))) ? (
          <Section eyebrow="Registro" title="Biografia" className="character-sheet__section--bio">
            <div className="character-sheet__info-list character-sheet__info-list--three">
              <InfoLine label="Apelido" value={snapshot.apelido} />
              <InfoLine label="Pronomes" value={snapshot.pronomes} />
            </div>
            <div className="character-sheet__quote-grid">
              <Quote label="Biografia" value={snapshot.biografia} />
              <Quote label="Aparência" value={snapshot.aparencia} />
              <Quote label="Descrição" value={snapshot.descricao} />
              <Quote label="Notas narrativas públicas" value={snapshot.notasNarrativasPublicas} />
            </div>
          </Section>
        ) : null}
        <footer className="character-sheet__footer">
          <span>KALLISTIS · ficha visual read-only</span>
          <span>{character.id}</span>
        </footer>
      </div>
    </article>
  );
}

function LoadingState() {
  return (
    <div className="character-sheet__state">
      <p className="character-sheet__eyebrow">KALLISTIS</p>
      <h1>Carregando ficha canônica</h1>
      <p>Consultando uma única personagem persistida.</p>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="character-sheet__state">
      <p className="character-sheet__eyebrow">Ficha indisponível</p>
      <h1>Não foi possível abrir esta personagem</h1>
      <p>{message}</p>
      <button
        type="button"
        className="character-sheet__button"
        onClick={() => window.location.reload()}
      >
        Tentar novamente
      </button>
    </div>
  );
}

export function CharacterVisualSheet({ characterId }: { characterId: string }) {
  const [character, setCharacter] = useState<CharacterRecord | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [printError, setPrintError] = useState<string | null>(null);
  const [printRequested, setPrintRequested] = useState(false);

  useEffect(() => {
    document.body.classList.add("character-sheet-print-context");
    return () => document.body.classList.remove("character-sheet-print-context");
  }, []);

  useEffect(() => {
    setPrintRequested(new URLSearchParams(window.location.search).get("print") === "1");
  }, []);

  useEffect(() => {
    if (!printRequested || !character) return;

    if (typeof window.print !== "function") {
      setPrintError(
        "Esta aba não oferece impressão nativa. Use Ctrl/Cmd+P no navegador para salvar a ficha em PDF.",
      );
    }
  }, [character, printRequested]);

  const printSheet = () => {
    if (typeof window.print !== "function") return;

    setPrintError(null);
    try {
      window.focus();
      window.print();
    } catch {
      setPrintError(
        "Não foi possível abrir a impressão nesta aba. Use Ctrl/Cmd+P no navegador para salvar a ficha em PDF.",
      );
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    const readCharacter = async () => {
      setCharacter(null);
      setError(null);

      const getCharacter = async (path: string) => {
        const response = await fetch(path, {
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => ({}))) as {
          character?: CharacterRecord;
          error?: string;
        };
        return { response, payload };
      };

      try {
        let result = await getCharacter(
          "/api/characters?characterId=" + encodeURIComponent(characterId),
        );
        if (result.response.status === 404) {
          result = await getCharacter(
            "/api/master/characters?characterId=" + encodeURIComponent(characterId),
          );
        }
        if (!result.response.ok || !result.payload.character) {
          throw new Error(result.payload.error || "character_not_found");
        }
        if (result.payload.character.id !== characterId) {
          throw new Error("character_id_mismatch");
        }
        if (!cancelled) setCharacter(result.payload.character);
      } catch (cause) {
        if (cancelled || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : "character_sheet_failed");
      }
    };

    void readCharacter();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [characterId]);

  return (
    <div className="character-sheet-route">
      <div className="character-sheet__screenbar character-sheet__no-print">
        <button
          type="button"
          className="character-sheet__button"
          onClick={() => window.history.back()}
        >
          Voltar
        </button>
        <div className="character-sheet__screenbar-title">
          <span>Ficha visual</span>
          <small>somente leitura</small>
        </div>
        <div className="character-sheet__print-action">
          <a
            className="character-sheet__button character-sheet__button--primary"
            href="?print=1"
            onClick={printSheet}
            title="Abre a impressão nativa do navegador"
          >
            Imprimir / salvar PDF
          </a>
          <small className="character-sheet__print-tip">
            Para PDF limpo, desative “Cabeçalhos e rodapés” na janela de impressão.
          </small>
        </div>
      </div>
      {printError ? (
        <p className="character-sheet__print-notice character-sheet__no-print" role="status">
          {printError}
        </p>
      ) : null}
      <div className="character-sheet">
        {error ? (
          <ErrorState message={error} />
        ) : character ? (
          <CharacterContent character={character} />
        ) : (
          <LoadingState />
        )}
      </div>
    </div>
  );
}
