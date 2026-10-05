const FALLBACK =
  "Não consegui formular essa resposta com segurança. Pode repetir de um jeito mais simples?";

const ASSISTANT_PREFIX = /^(?:Kallistis|Kuan-Yin|Kháris|Kharis|Klio):\s*/i;
const SPEAKER_LINE = /^(?:Usuário|Usuario|Kallistis|Kuan-Yin|Kháris|Kharis|Klio):\s*$/i;
const USER_PREFIX = /^(?:Usuário|Usuario):\s*/i;
const INTERNAL_HEADER =
  /^(?:={2,}\s*)?(?:MAÇÃ DE CRISTAL|MACA DE CRISTAL|FECHO DO JOGO|REGRAS DE SEGURANÇA|REGRAS DE SEGURANCA)(?:\s*={2,})?\s*$/i;
const INTERNAL_TERMS = [
  "Agora: responda dentro do regime",
  "modo AMARELO",
  "modo VERDE",
  "modo VERMELHO",
  "system prompt",
  "prompt interno",
  "instruções internas",
  "instrucoes internas",
  "INJECTION_GUARD",
  "REGRA DE AÇÕES ESTRUTURADAS",
  "REGRA DE ACOES ESTRUTURADAS",
  "MODO FALA KLIO DENTRO DE KHARIS",
  "CHAT_IDENTITY_REINFORCEMENT_BLOCK",
  "LEGAL_ANTIHALLUCINATION_BLOCK",
  "KUANYIN_FACET_BLOCK",
  "KALLISTIS_SYSTEM_PROMPT",
  "KHARIS_SYSTEM_PROMPT",
];

function plain(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function hasInternalTerm(line: string): boolean {
  const normalized = plain(line);
  return INTERNAL_TERMS.some((term) => normalized.includes(plain(term)));
}

function stripInternalBlocks(text: string): string {
  const kept: string[] = [];
  let dropping = false;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (INTERNAL_HEADER.test(trimmed)) {
      dropping = true;
      continue;
    }
    if (dropping) {
      if (!trimmed) dropping = false;
      continue;
    }
    if (hasInternalTerm(trimmed) || SPEAKER_LINE.test(trimmed) || USER_PREFIX.test(trimmed)) {
      continue;
    }
    kept.push(line);
  }
  return kept.join("\n");
}

export function sanitizeAssistantOutput(
  raw: string,
  options: { isLoading?: boolean; status?: "submitted" | "streaming" | "ready" | "error" } = {},
): string {
  let text = (raw ?? "").replace(/\r\n?/g, "\n");

  const lastAssistantTurn = [
    ...text.matchAll(/^\s*(?:Kallistis|Kuan-Yin|Kháris|Kharis|Klio):\s*/gim),
  ].pop();
  if (lastAssistantTurn?.index !== undefined) {
    text = text.slice(lastAssistantTurn.index + lastAssistantTurn[0].length);
  }

  text = stripInternalBlocks(text)
    .split("\n")
    .map((line) => line.replace(ASSISTANT_PREFIX, ""))
    .filter((line) => !hasInternalTerm(line) && !INTERNAL_HEADER.test(line.trim()))
    .join("\n")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/Kallistis(?:svg)+/gi, "Kallistis")
    .replace(/(?:svg){2,}/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  const stillStreaming =
    options.isLoading || options.status === "submitted" || options.status === "streaming";
  return text || (stillStreaming ? "" : FALLBACK);
}
