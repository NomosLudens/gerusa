import { buildCharacterDraft } from "./chat-creation";
import {
  ATTRIBUTE_NAMES,
  CHARACTER_RULESET,
  SKILL_NAMES,
  characterOfficeRules,
  buildCharacterSkillProvenance,
  mechanicalFingerprint,
  validateCharacterSnapshot,
  type CharacterSnapshot,
} from "./character-canon";

type CharacterPreset = {
  id: string;
  name: string;
  title: string;
  archetype: string;
  people: string;
  heritage: string;
  origin: string;
  office: string;
  role: string;
  key: string;
  optionalSkill?: string;
  freeSkill?: string;
  heritageTechnique?: { office: string; name: string };
  attributes: Record<string, number>;
  skills: Record<string, number>;
  concept: { identity: string; objective: string; loss: string };
  personality: string;
  appearance: string;
  links: string[];
  promise: string;
  wound: string;
  question: string;
  equipment: {
    weapon: string;
    armor: string;
    tool: string;
    consumables: string[];
    extras?: string[];
  };
  otherOrigin?: { benefit: string; debt: string };
  evocation?: Record<string, string>;
  knownForms?: Array<{ formId: string; maxGrade: number }>;
};

const presets: readonly CharacterPreset[] = [
  {
    id: "kael-dorn",
    name: "Kael Dorn",
    title: "A Muralha que Anda",
    archetype: "Protetor / tanque",
    people: "Livres",
    heritage: "Comunidade Escolhida",
    origin: "Criado na Luz",
    office: "Guardião",
    role: "Bastião",
    key: "Escudo de Juramento",
    freeSkill: "Influência",
    attributes: { Corpo: 3, Agilidade: 1, Intelecto: 1, Presença: 2, Vontade: 2, Sintonia: 0 },
    skills: {
      Combate: 3,
      Cuidado: 2,
      Atletismo: 2,
      Percepção: 2,
      Sobrevivência: 1,
      Empatia: 1,
      Influência: 1,
      Ofício: 1,
    },
    concept: {
      identity: "Veterano protetor",
      objective: "Manter todos vivos",
      loss: "Teme que sua proteção ensine os outros a depender dele",
    },
    personality:
      "Calmo, paternal e difícil de provocar. É um profissional de proteção, pragmático e treinado; acredita que precisa ficar entre o perigo e os demais, mesmo quando ninguém pediu.",
    appearance:
      "Homem de meia-idade, cabelo grisalho, cicatriz curta no queixo, armadura funcional e escudo com reparos. Verifica portas, saídas e posições defensivas quase sem perceber.",
    links: [
      "Pessoa: a jovem batedora que Kael treinou e ainda trata como aprendiz.",
      "Comunidade: uma companhia de escolta que lhe ensinou a voltar com todos.",
      "Lugar: toda rota pela qual garantiu passagem segura.",
    ],
    promise: "Ninguém sob minha guarda será apagado como se nunca tivesse existido.",
    wound:
      "Perdeu alguém enquanto obedecia a uma ordem de recuo taticamente correta e ainda confunde prudência com abandono.",
    question: "Proteger alguém também pode significar deixá-lo enfrentar o próprio risco?",
    equipment: {
      weapon: "Espada",
      armor: "Média",
      tool: "Equipamento de escalada",
      consumables: ["Tônico de Vitalidade", "Fio de Retorno"],
      extras: ["Escudo"],
    },
  },
  {
    id: "raska-venn",
    name: "Raska Venn",
    title: "A Soldada",
    archetype: "Soldada / combatente disciplinada",
    people: "Kragor",
    heritage: "Escudo do Clã",
    origin: "Criado na Escuridão",
    office: "Duelista",
    role: "Vanguarda",
    key: "Sabre de Fresta",
    optionalSkill: "Atletismo",
    attributes: { Corpo: 3, Agilidade: 2, Intelecto: 1, Presença: 1, Vontade: 2, Sintonia: 0 },
    skills: {
      Combate: 3,
      Atletismo: 2,
      Percepção: 2,
      Sobrevivência: 2,
      Pontaria: 1,
      Ofício: 1,
      Influência: 1,
      Cuidado: 1,
    },
    concept: {
      identity: "Soldada de linha",
      objective: "Provar que disciplina pode proteger sem desumanizar",
      loss: "Teme obedecer outra ordem que sabe estar errada",
    },
    personality:
      "Direta, organizada e seca. Conta munição, memoriza saídas e respeita competência. Responde a perguntas emocionais como se fossem relatórios.",
    appearance:
      "Kragor de pele verde escura, musculatura compacta, laterais do cabelo raspadas e tiras de tecido no punho da espada, uma por cada companheiro que voltou vivo.",
    links: [
      "Pessoa: um antigo companheiro que desertou para não cumprir uma ordem.",
      "Comunidade: soldados rasos e guardas que executam decisões tomadas por outros.",
      "Verdade: uma ordem não transfere a responsabilidade pelo que faço.",
    ],
    promise: "Nunca permitirei que obediência seja usada para apagar responsabilidade.",
    wound:
      "Executou uma ordem legítima demais para parecer criminosa e errada demais para esquecer.",
    question: "Em que momento disciplina deixa de ser virtude e vira covardia moral?",
    equipment: {
      weapon: "Espada",
      armor: "Leve",
      tool: "Equipamento de escalada",
      consumables: ["Tônico de Vitalidade", "Carga de Reparo"],
    },
  },
  {
    id: "syr-vaelis",
    name: "Syr Vaelis",
    title: "O Olho Antes do Disparo",
    archetype: "Precisão / observação",
    people: "Aelvari",
    heritage: "Vidente Cauteloso",
    origin: "Trocado",
    office: "Atirador",
    role: "Artilharia",
    key: "Arco de Quartzo",
    attributes: { Corpo: 1, Agilidade: 3, Intelecto: 2, Presença: 1, Vontade: 2, Sintonia: 0 },
    skills: {
      Pontaria: 3,
      Percepção: 2,
      Furtividade: 2,
      Investigação: 2,
      Sobrevivência: 1,
      Atletismo: 1,
      Conhecimento: 1,
      Influência: 1,
    },
    concept: {
      identity: "Observador aelvari",
      objective: "Enxergar a verdade antes de agir",
      loss: "Teme que esperar por certeza custe a vida de alguém",
    },
    personality:
      "Silencioso, metódico e gentil. Prefere entender antes de responder, guarda detalhes e lembra onde cada pessoa estava durante uma conversa. Seu conflito é a hesitação.",
    appearance:
      "Aelvari alto, feições finas, cabelos muito claros presos atrás da cabeça e olhos que mudam de foco ao acompanhar probabilidades. Organiza o equipamento quase como um ritual.",
    links: [
      "Pessoa: alguém que tomou uma decisão imediata quando Syr hesitou.",
      "Comunidade: Trocados que não sabem qual mundo deveria parecer familiar.",
      "Lugar: um ponto elevado onde aprendeu que ver mais não significa compreender tudo.",
    ],
    promise: "Nenhuma pessoa será reduzida a um alvo antes que eu saiba quem estou mirando.",
    wound: "Esperou por mais informação diante de uma oportunidade perfeita, e ela não voltou.",
    question: "Quanto de certeza é suficiente antes que a prudência se torne omissão?",
    equipment: {
      weapon: "Arco",
      armor: "Roupas reforçadas",
      tool: "Kit de exploração",
      consumables: ["Munição de Quartzo", "Fio de Retorno"],
    },
  },
  {
    id: "nom-7-ilion",
    name: "Nom-7 Ilion",
    title: "A Pergunta que Não Estava no Projeto",
    archetype: "Tecelão / controle / análise",
    people: "Nomos",
    heritage: "Processador",
    origin: "Criado na Luz",
    office: "Tecelão",
    role: "Artilharia",
    key: "Bastão de Convergência",
    attributes: { Corpo: 0, Agilidade: 1, Intelecto: 2, Presença: 1, Vontade: 2, Sintonia: 3 },
    skills: {
      Magia: 3,
      Conhecimento: 2,
      Velarim: 2,
      Investigação: 2,
      Percepção: 1,
      Empatia: 1,
      Influência: 1,
      Ofício: 1,
    },
    concept: {
      identity: "Nomos curioso sobre a própria identidade",
      objective: "Descobrir quais escolhas realmente são suas",
      loss: "Teme que sua personalidade seja apenas uma instrução antiga",
    },
    personality:
      "Curioso, educado e literal. Ilion faz perguntas que outros evitam e tem um humor crescente, ainda não inteiramente voluntário.",
    appearance:
      "Corpo de placas escuras foscas, juntas visíveis e linhas internas de luz âmbar. Mostra reparos e escolhas acumuladas, sem aparência cromada ou militar.",
    links: [
      "Pessoa: quem primeiro tratou Ilion como pessoa antes de perguntar sua função.",
      "Comunidade: Nomos que escolheram nomes próprios.",
      "Verdade: origem explica uma pessoa; não a encerra.",
    ],
    promise: "Nenhuma consciência será reduzida à função para a qual foi criada.",
    wound: "Possui uma memória cuja origem não consegue verificar e teme que ela não seja sua.",
    question: "Uma escolha continua sendo minha se alguém previu que eu a faria?",
    equipment: {
      weapon: "Bastão ritual",
      armor: "Roupas reforçadas",
      tool: "Foco de magia",
      consumables: ["Sal de Memória", "Selo de Contenção"],
    },
    knownForms: [
      { formId: "HAJ", maxGrade: 1 },
      { formId: "THUVEL", maxGrade: 1 },
      { formId: "THUR", maxGrade: 1 },
      { formId: "LUUMEH", maxGrade: 1 },
    ],
  },
  {
    id: "maera-dhor",
    name: "Maera Dhor",
    title: "Aquela que Fecha a Ferida sem Apagá-la",
    archetype: "Curadora / suporte",
    people: "Dóreos",
    heritage: "Guardião de Obra",
    origin: "Criado na Escuridão",
    office: "Curador",
    role: "Amparo",
    key: "Kit de Retorno",
    attributes: { Corpo: 0, Agilidade: 1, Intelecto: 3, Presença: 2, Vontade: 2, Sintonia: 1 },
    skills: {
      Cuidado: 3,
      Empatia: 2,
      Conhecimento: 2,
      Investigação: 2,
      Percepção: 1,
      Influência: 1,
      Ofício: 1,
      Magia: 1,
    },
    concept: {
      identity: "Curadora dórea",
      objective: "Manter as pessoas inteiras",
      loss: "Teme confundir cura com devolver tudo ao que era antes",
    },
    personality:
      "Prática, firme e pouco impressionável. Não promete que tudo ficará bem; diz o que é possível e o que precisa ser feito. Demonstra afeto consertando, cozinhando ou ficando ao lado em silêncio.",
    appearance:
      "Dórea baixa e robusta, tranças grossas com pequenas peças de metal gravadas e mãos marcadas por reagentes e ferramentas.",
    links: [
      "Pessoa: um paciente que sobreviveu e escolheu uma vida que Maera desaprova.",
      "Comunidade: artesãos e restauradores que sabem que reparos deixam marcas.",
      "Verdade: cicatriz não é sinônimo de fracasso.",
    ],
    promise: "Não permitirei que alguém seja restaurado ao preço de perder quem se tornou.",
    wound: "Salvou uma vida e perdeu uma relação; ainda tenta decidir se fez a escolha certa.",
    question: "Curar significa devolver, preservar ou permitir transformação?",
    equipment: {
      weapon: "Faca",
      armor: "Roupas reforçadas",
      tool: "Kit de cura",
      consumables: ["Tônico de Vitalidade", "Estabilizador de Fluxo"],
    },
  },
  {
    id: "iri-kesh",
    name: "Iri Kesh",
    title: "O Pacto de Duas Respirações",
    archetype: "Evocador / companheiro protetor",
    people: "Teriantes",
    heritage: "Protetor de Bando",
    origin: "Trocado",
    office: "Evocador",
    role: "Bastião",
    key: "Chave de Vínculo",
    optionalSkill: "Empatia",
    attributes: { Corpo: 1, Agilidade: 0, Intelecto: 1, Presença: 2, Vontade: 2, Sintonia: 3 },
    skills: {
      Evocação: 3,
      Empatia: 2,
      Magia: 2,
      Velarim: 2,
      Percepção: 1,
      Cuidado: 1,
      Conhecimento: 1,
      Sobrevivência: 1,
    },
    concept: {
      identity: "Teriante evocador",
      objective: "Provar que vínculo não é posse",
      loss: "Teme que o medo de perder transforme proteção em controle",
    },
    personality:
      "Instintivo, leal e atento ao humor do grupo. Percebe tensão antes de entender sua causa; fala pouco nos conflitos e mais depois. Não trata a evocação como mascote.",
    appearance:
      "Teriante de traços lupinos discretos, orelhas móveis e olhos atentos. Usa roupas de viagem, tiras e pequenos objetos presos pela utilidade ou pelo cheiro familiar.",
    links: [
      "Pessoa: alguém que libertou Iri de uma relação possessiva.",
      "Comunidade: um bando escolhido, não necessariamente de sangue.",
      "Promessa: vínculos existem enquanto as partes continuam podendo escolher.",
    ],
    promise: "Ninguém que caminhe comigo será tratado como propriedade.",
    wound: "Chamou controle de cuidado e demorou a perceber a diferença.",
    question: "Como proteger sem ocupar o espaço de escolha de quem amo?",
    equipment: {
      weapon: "Lança curta",
      armor: "Roupas reforçadas",
      tool: "Âncora de Evocação",
      consumables: ["Tônico de Vitalidade", "Fio de Retorno"],
    },
    evocation: {
      nome: "Guardião de Quartzo",
      porte: "Menor",
      modelo: "Guardião de Quartzo",
      forma: "Guardião",
      ancora: "Fragmento mineral carregado em contato com o peito.",
      impulso: "Colocar-se entre Iri e aquilo que ameaça o grupo.",
      pacto: "Você pode me proteger, mas nunca decidir por mim quem é meu inimigo.",
      aparencia: "Aparência individual não definida no preset.",
      consciencia: "Não especificada no material do preset.",
    },
  },
  {
    id: "nira-vess",
    name: "Nira Vess",
    title: "A Engenheira do Talvez",
    archetype: "Artífice / inventora / utilidade",
    people: "Nimari",
    heritage: "Negociador de Risco",
    origin: "Outro",
    office: "Artífice",
    role: "Artilharia",
    key: "Ferramentas Modulares",
    attributes: { Corpo: 1, Agilidade: 2, Intelecto: 3, Presença: 1, Vontade: 2, Sintonia: 0 },
    skills: {
      Ofício: 3,
      Investigação: 2,
      Conhecimento: 2,
      Percepção: 2,
      Pontaria: 1,
      Atletismo: 1,
      Sobrevivência: 1,
      Velarim: 1,
    },
    concept: {
      identity: "Artífice nimari",
      objective: "Transformar impossibilidades em rotas",
      loss: "Teme tratar pessoas como problemas que também podem ser desmontados",
    },
    personality:
      "Rápida, falante e curiosa. Pensa depressa e aceita trabalhar com informação imperfeita; não confunde improvisar com deixar de pensar.",
    appearance:
      "Nimari de roupas cheias de bolsos, marcas de giz nas mangas e ferramentas organizadas por frequência de uso.",
    links: [
      "Pessoa: alguém que pergunta ‘e se der errado?’ antes de ajudar.",
      "Comunidade: pessoas que vivem de rotas, passagens e pequenos consertos.",
      "Lugar: uma passagem clandestina que Nira prometeu nunca revelar.",
    ],
    promise: "Nenhuma rota segura será fechada apenas para tornar o mundo mais fácil de controlar.",
    wound: "Uma solução tecnicamente perfeita que criou tornou a vida de outra pessoa pior.",
    question: "Toda coisa que pode ser resolvida deve ser resolvida?",
    equipment: {
      weapon: "Faca",
      armor: "Roupas reforçadas",
      tool: "Ferramentas de Artífice",
      consumables: ["Carga de Reparo", "Estabilizador de Fluxo"],
    },
    otherOrigin: {
      benefit: "Acesso a uma rota clandestina.",
      debt: "Deve um favor a quem manteve a rota aberta.",
    },
  },
  {
    id: "elya-prisma",
    name: "Elya Prisma",
    title: "A Luz que Tenta Não Ser Vista",
    archetype: "Batedora / infiltração / exploração",
    people: "Vitrálios",
    heritage: "Lapidador de Si",
    origin: "Criado na Luz",
    office: "Batedor",
    role: "Vanguarda",
    key: "Bússola de Frestas",
    attributes: { Corpo: 1, Agilidade: 3, Intelecto: 2, Presença: 1, Vontade: 2, Sintonia: 0 },
    skills: {
      Sobrevivência: 3,
      Furtividade: 2,
      Percepção: 2,
      Atletismo: 2,
      Pontaria: 1,
      Investigação: 1,
      Combate: 1,
      Conhecimento: 1,
    },
    concept: {
      identity: "Vitrálio batedora",
      objective: "Escolher quando ser vista",
      loss: "Teme que seu corpo revele mais do que consentiu mostrar",
    },
    personality:
      "Irônica, concentrada e competitiva. É ótima em infiltração física e planeja movimento, cobertura e distância para compensar a luminosidade que a denuncia.",
    appearance:
      "Corpo cristalino consciente, facetado e parcialmente transparente. O prisma interno muda de intensidade com emoções fortes; usa tecidos opacos e foscos para quebrar reflexos.",
    links: [
      "Pessoa: alguém diante de quem Elya nunca precisou esconder a própria cor.",
      "Comunidade: viajantes que dependem de quem chega primeiro e volta para contar.",
      "Lugar: uma rota que permanece segura enquanto ninguém a transforma em propriedade.",
    ],
    promise: "Ninguém terá o direito de transformar transparência em obrigação de exposição.",
    wound: "Uma emoção íntima sua foi percebida publicamente quando não podia esconder sua luz.",
    question: "Intimidade ainda existe quando meu corpo revela o que sinto?",
    equipment: {
      weapon: "Arco",
      armor: "Roupas reforçadas",
      tool: "Kit de exploração",
      consumables: ["Munição de Quartzo", "Fio de Retorno"],
    },
  },
  {
    id: "zhaer-korr",
    name: "Zhaer Korr",
    title: "O Bobo que Não Desvia o Olhar",
    archetype: "Satirista / apoio / confronto verbal",
    people: "Draken",
    heritage: "Condutor",
    origin: "Criado na Escuridão",
    office: "Satirista",
    role: "Amparo",
    key: "Instrumento de Memória",
    attributes: { Corpo: 0, Agilidade: 1, Intelecto: 2, Presença: 3, Vontade: 1, Sintonia: 2 },
    skills: {
      Empatia: 3,
      Velarim: 2,
      Influência: 2,
      Percepção: 2,
      Conhecimento: 1,
      Furtividade: 1,
      Cuidado: 1,
      Ofício: 1,
    },
    concept: {
      identity: "Satirista draken",
      objective: "Tornar o poder incapaz de esconder suas contradições",
      loss: "Teme que provocar seja mais fácil do que construir depois",
    },
    personality:
      "Carismático, insolente e observador. Usa sátira com precisão; quando a cena fica grave, o humor desaparece primeiro nele.",
    appearance:
      "Draken de escamas escuras com reflexos quentes, adornos mínimos e um instrumento de percussão usado como foco, memória rítmica e provocação.",
    links: [
      "Pessoa: uma autoridade que aceitou ser contrariada e mudou de posição.",
      "Comunidade: artistas, cronistas e inconvenientes profissionais.",
      "Verdade: ridicularizar uma mentira não substitui provar que é falsa.",
    ],
    promise: "Nenhum poder terá o silêncio como prova de que todos concordam.",
    wound: "Transformou a dor real de alguém numa boa frase; lembraram da frase, não da pessoa.",
    question: "Quando a sátira revela a verdade e quando me protege da responsabilidade de agir?",
    equipment: {
      weapon: "Funda",
      armor: "Roupas reforçadas",
      tool: "Instrumentos de frequência",
      consumables: ["Ampola de Repouso", "Sal de Memória"],
    },
  },
  {
    id: "sella-var",
    name: "Sella Var",
    title: "A Espada sem Bandeira",
    archetype: "Espadachim / mobilidade / duelo",
    people: "Livres",
    heritage: "Múltiplos Caminhos",
    origin: "Trocado",
    office: "Duelista",
    role: "Vanguarda",
    key: "Sabre de Fresta",
    optionalSkill: "Furtividade",
    freeSkill: "Empatia",
    heritageTechnique: { office: "Batedor", name: "Primeiro a Ver" },
    attributes: { Corpo: 2, Agilidade: 3, Intelecto: 1, Presença: 2, Vontade: 1, Sintonia: 0 },
    skills: {
      Combate: 3,
      Furtividade: 2,
      Atletismo: 2,
      Percepção: 2,
      Influência: 1,
      Sobrevivência: 1,
      Pontaria: 1,
      Empatia: 1,
    },
    concept: {
      identity: "Espadachim sem bandeira",
      objective: "Escolher por quem vale a pena lutar",
      loss: "Teme que liberdade seja um nome bonito para o medo de pertencer",
    },
    personality:
      "Rápida, espirituosa e desconfiada de instituições. Cria intimidade com facilidade e compromisso com dificuldade; improvisa bem e evita admitir que precisa de rotina.",
    appearance:
      "Livre jovem, cabelo curto e desalinhado, roupas leves reforçadas, espada simples bem cuidada e nenhum símbolo permanente de grupo.",
    links: [
      "Pessoa: alguém que continua guardando um lugar para Sella voltar.",
      "Comunidade: gente entre fronteiras que não cabe em uma única identidade.",
      "Verdade: partir só é liberdade quando permanecer também era possível.",
    ],
    promise: "Ninguém será obrigado a pertencer para merecer proteção.",
    wound:
      "Abandonou um grupo antes que pudesse ser abandonada e ainda conta como se fosse simples.",
    question: "Quantas vezes posso partir antes de perceber que impeço a existência de um lar?",
    equipment: {
      weapon: "Sabre",
      armor: "Roupas reforçadas",
      tool: "Equipamento de escalada",
      consumables: ["Tônico de Vitalidade", "Fio de Retorno"],
    },
  },
];

export type ReadyCharacterPreset = Pick<
  CharacterPreset,
  "id" | "name" | "title" | "archetype" | "people" | "office" | "role"
>;

export function listReadyCharacterPresets(): ReadyCharacterPreset[] {
  return presets.map(({ id, name, title, archetype, people, office, role }) => ({
    id,
    name,
    title,
    archetype,
    people,
    office,
    role,
  }));
}

export function createReadyCharacterPresetSnapshot(id: string): {
  preset: ReadyCharacterPreset;
  snapshot: CharacterSnapshot;
  fingerprint: string;
} | null {
  const preset = presets.find((item) => item.id === id);
  if (!preset) return null;
  const snapshot = buildCharacterDraft(preset.name, preset.people, preset.office, "", "KALLISTIS");
  const trail = (snapshot.trilhas as Array<Record<string, unknown>>)[0]!;
  const officeRules = characterOfficeRules(preset.office);
  if (!officeRules) throw new Error(`unknown_character_preset_office:${preset.office}`);
  snapshot.ruleset = CHARACTER_RULESET;
  snapshot.heranca = preset.heritage;
  snapshot.origem = preset.origin;
  snapshot.conceito = {
    identidade: preset.concept.identity,
    objetivo: preset.concept.objective,
    perda: preset.concept.loss,
  };
  snapshot.aparencia = preset.appearance;
  snapshot.descricao = preset.title;
  snapshot.biografia = preset.personality;
  snapshot.completo = true;
  snapshot.atributosBase = Object.fromEntries(
    ATTRIBUTE_NAMES.map((attribute) => [attribute, preset.attributes[attribute] ?? 0]),
  );
  snapshot.periciasBase = Object.fromEntries(
    SKILL_NAMES.map((skill) => [skill, preset.skills[skill] ?? 0]),
  );
  snapshot.tecnicaHeranca = preset.heritageTechnique
    ? { oficio: preset.heritageTechnique.office, nome: preset.heritageTechnique.name }
    : null;
  snapshot.pericaLivre = preset.freeSkill ?? "";
  snapshot.origemTrocado =
    preset.origin === "Trocado"
      ? {
          nascimento: "Não revelado no preset.",
          criacao: "Não definida no preset.",
          descricao: "A procedência entre mundos fica em aberto para a mesa.",
        }
      : { nascimento: "", criacao: "", descricao: "" };
  if (preset.otherOrigin) {
    snapshot.origemBeneficio = preset.otherOrigin.benefit;
    snapshot.dividaComunitaria = preset.otherOrigin.debt;
  }
  trail.papel = preset.role;
  trail.chave = preset.key;
  trail.tecnicas = [officeRules.initialTechnique];
  trail.pericias = [...officeRules.fixedSkills];
  trail.pericaEscolhida = preset.optionalSkill ?? "";
  trail.knownForms = preset.knownForms ?? [];
  trail.vinculosEvocados = preset.evocation ? [preset.evocation] : [];
  snapshot.periciasProveniencia = buildCharacterSkillProvenance(snapshot);
  snapshot.vinculos = [...preset.links];
  snapshot.promessa = preset.promise;
  snapshot.ferida = preset.wound;
  snapshot.pergunta = preset.question;
  snapshot.equipamento = {
    arma: preset.equipment.weapon,
    armadura: preset.equipment.armor,
    ferramenta: preset.equipment.tool,
    consumiveis: [...preset.equipment.consumables],
    extras: [...(preset.equipment.extras ?? [])],
    proficienciaConfirmada: true,
  };
  const validation = validateCharacterSnapshot(snapshot, true);
  if (!validation.ok)
    throw new Error(`invalid_character_preset:${id}:${validation.errors.join(",")}`);
  return {
    preset: {
      id: preset.id,
      name: preset.name,
      title: preset.title,
      archetype: preset.archetype,
      people: preset.people,
      office: preset.office,
      role: preset.role,
    },
    snapshot,
    fingerprint: mechanicalFingerprint(snapshot),
  };
}
