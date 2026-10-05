// Naturaliza texto para TTS. O texto visual nunca muda; apenas a fala muda.
import { sanitizeAssistantOutput } from "./sanitize-assistant-output";

export type SpeechProfile = "kallistis" | "klio" | "kharis";

export type PrepareSpeechOptions = {
  profile?: SpeechProfile;
  maxChars?: number;
};

const BRAND_MAP: Record<string, string> = {
  "K∧LINE": "Kallistis",
  "K-LINE": "Kallistis",
  "Kuan-Yin": "Kuan Yin",
  Klio: "Clio",
  Kháris: "Karis",
  TTS: "texto em voz",
  PWA: "aplicativo instalado",
};

const TECH_MAP: Record<string, string> = {
  endpoint: "ponto de acesso",
  deploy: "publicacao",
  build: "compilacao",
  typecheck: "verificacao de tipos",
  "service worker": "servico do aplicativo instalado",
  chunk: "trecho",
};

const ACRONYM_MAP: Record<string, string> = {
  API: "A P I",
  PR: "P R",
  HTML: "H T M L",
  CSS: "C S S",
  URL: "U R L",
  PDF: "P D F",
};

const PROFILE_MAX_CHARS: Record<SpeechProfile, number> = {
  kallistis: 2600,
  klio: 1200,
  kharis: 1500,
};

const MONTHS = [
  "janeiro",
  "fevereiro",
  "marco",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const UNIDADES = [
  "",
  "um",
  "dois",
  "tres",
  "quatro",
  "cinco",
  "seis",
  "sete",
  "oito",
  "nove",
  "dez",
  "onze",
  "doze",
  "treze",
  "catorze",
  "quinze",
  "dezesseis",
  "dezessete",
  "dezoito",
  "dezenove",
];

const DEZENAS = [
  "",
  "",
  "vinte",
  "trinta",
  "quarenta",
  "cinquenta",
  "sessenta",
  "setenta",
  "oitenta",
  "noventa",
];

const CENTENAS = [
  "",
  "cento",
  "duzentos",
  "trezentos",
  "quatrocentos",
  "quinhentos",
  "seiscentos",
  "setecentos",
  "oitocentos",
  "novecentos",
];

export function prepareTextForSpeech(text: string, options: PrepareSpeechOptions = {}): string {
  if (!text) return "";

  const profile = options.profile ?? "kallistis";
  let result = sanitizeAssistantOutput(text);

  result = result.replace(/```[\s\S]*?```/g, "Inclui um bloco tecnico na resposta visual.");
  result = removeMarkdownTables(result);
  result = result.replace(/\*\*(.+?)\*\*/g, "$1");
  result = result.replace(/_(.+?)_/g, "$1");
  result = result.replace(/`([^`]+)`/g, (_, code: string) => code.trim());
  result = result.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
  result = result.replace(/https?:\/\/\S+/g, "link na tela");
  result = result.replace(/\b[0-9a-f]{8}-[0-9a-f-]{27,}\b/gi, "identificador");
  result = result.replace(/\b[0-9a-f]{24,}\b/gi, "identificador");
  result = result.replace(/^#{1,6}\s+(.+)$/gm, "$1.");
  result = result.replace(/^[-*]\s+/gm, "");
  result = result.replace(/^\s*\d+[.)]\s+/gm, "");
  result = result.replace(/\n\n+/g, ". ");
  result = result.replace(/\n/g, ". ");

  result = applyBrandAndTechnicalWords(result);
  result = convertCommonValues(result);
  result = applySpeechProfile(result, profile);
  result = normalizeSpeechPunctuation(result);

  const maxChars = options.maxChars ?? PROFILE_MAX_CHARS[profile];
  if (result.length > maxChars) {
    return splitSpeechChunks(result, maxChars, { profile })[0] ?? result.slice(0, maxChars);
  }
  return result;
}

function removeMarkdownTables(text: string): string {
  return text
    .split("\n")
    .filter((line) => {
      const trimmed = line.trim();
      if (!trimmed.includes("|")) return true;
      if (/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(trimmed)) return false;
      return !/^\|.*\|$/.test(trimmed);
    })
    .join("\n");
}

function applyBrandAndTechnicalWords(text: string): string {
  let result = text;
  result = result.replace(/K∧LINE/g, BRAND_MAP["K∧LINE"]);
  result = result.replace(/K-LINE/g, BRAND_MAP["K-LINE"]);
  result = result.replace(/Kuan-Yin/g, BRAND_MAP["Kuan-Yin"]);
  result = result.replace(/\bKlio\b/g, BRAND_MAP.Klio);
  result = result.replace(/Kháris/g, BRAND_MAP["Kháris"]);
  result = result.replace(/\bAPI\b/g, ACRONYM_MAP.API);
  result = result.replace(/\bPR\b/g, ACRONYM_MAP.PR);
  result = result.replace(/\bHTML\b/g, ACRONYM_MAP.HTML);
  result = result.replace(/\bCSS\b/g, ACRONYM_MAP.CSS);
  result = result.replace(/\bURL\b/g, ACRONYM_MAP.URL);
  result = result.replace(/\bPDF\b/g, ACRONYM_MAP.PDF);
  result = result.replace(/\b[Tt][Tt][Ss]\b/g, BRAND_MAP.TTS);
  result = result.replace(/\b[Pp][Ww][Aa]\b/g, BRAND_MAP.PWA);
  result = result.replace(/\bendpoint\b/gi, TECH_MAP.endpoint);
  result = result.replace(/\bdeploy\b/gi, TECH_MAP.deploy);
  result = result.replace(/\bbuild\b/gi, TECH_MAP.build);
  result = result.replace(/\btypecheck\b/gi, TECH_MAP.typecheck);
  result = result.replace(/\bservice worker\b/gi, TECH_MAP["service worker"]);
  return result;
}

function applySpeechProfile(text: string, profile: SpeechProfile): string {
  let result = text;
  if (profile === "klio") {
    result = result.replace(/\b(?:portanto|ademais|consequentemente)\b/gi, "entao");
    result = result.replace(/\boperacionalizacao\b/gi, "organizacao");
    result = result.replace(/\bmetacognitiv[ao]\b/gi, "do jeito de pensar");
    result = simplifyKlioSentences(result);
  }
  if (profile === "kharis") {
    result = result.replace(/\bposteriormente\b/gi, "depois");
    result = result.replace(/\bnecessario\b/gi, "preciso");
    result = result.replace(/\butilizar\b/gi, "usar");
  }
  if (profile === "kallistis") {
    result = result.replace(/\bprimeiramente\b/gi, "primeiro");
    result = result.replace(/\bnesse sentido\b/gi, "por isso");
  }
  return result;
}

// Quebra frases compostas em frases curtas para o perfil klio (deficiência
// intelectual): uma ideia por frase é mais fácil de acompanhar do que uma
// frase longa com duas ideias unidas por "e"/"mas"/"porque"/"que"/"então".
const KLIO_SPLIT_MIN_LENGTH = 70;
const KLIO_CONNECTIVE = /\s(porque|então|entao|mas|que|e)\s/i;

function simplifyKlioSentences(text: string): string {
  const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
  const out: string[] = [];
  for (const raw of sentences) {
    const sentence = raw.trim();
    if (sentence) out.push(...splitKlioSentence(sentence));
  }
  return out.join(" ");
}

function splitKlioSentence(sentence: string): string[] {
  if (sentence.length <= KLIO_SPLIT_MIN_LENGTH) return [sentence];
  const match = KLIO_CONNECTIVE.exec(sentence);
  if (!match) return [sentence];
  const cutStart = match.index;
  const cutEnd = match.index + match[0].length;
  // Evita cortar muito perto do início ou do fim, onde a parte resultante
  // fica curta demais pra formar uma frase com sentido próprio.
  if (cutStart < 15 || cutEnd > sentence.length - 10) return [sentence];
  const before = sentence.slice(0, cutStart).trim();
  const after = sentence.slice(cutEnd).trim();
  if (!before || !after) return [sentence];
  return [ensureTerminalPunctuation(before), ...splitKlioSentence(capitalizeFirst(after))];
}

function capitalizeFirst(text: string): string {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : text;
}

function normalizeSpeechPunctuation(text: string): string {
  let result = text.trim();
  result = result.replace(/\s{2,}/g, " ");
  result = result.replace(/\s+([,.!?;:])/g, "$1");
  result = result.replace(/([.!?])\s*([.!?])+/g, "$1");
  result = result.replace(/\.\s*,/g, ".");
  result = result.replace(/([A-Za-zÀ-ÿ0-9])\s+-\s+([A-Za-zÀ-ÿ0-9])/g, "$1, $2");
  result = result.replace(/;\s*/g, ". ");
  result = result.replace(/:\s*/g, ". ");
  result = result.replace(/\s{2,}/g, " ");
  if (result && !/[.!?]$/.test(result)) result += ".";
  return result;
}

function convertCommonValues(text: string): string {
  let result = text;

  result = result.replace(/R\$ ?(\d+)/g, (_match, value: string) => {
    const num = parseInt(value, 10);
    if (num > 0 && num <= 9999) return `${numberToWords(num)} reais`;
    return `R$ ${value}`;
  });

  result = result.replace(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?\b/g, (match, day, month, year) => {
    const d = parseInt(day, 10);
    const m = parseInt(month, 10);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      const spoken = `${smallNumberToWords(d)} de ${MONTHS[m - 1]}`;
      return year ? `${spoken} de ${year}` : spoken;
    }
    return match;
  });

  result = result.replace(/\b(\d{1,2})h(\d{2})\b/g, (match, hour, minute) => {
    const h = parseInt(hour, 10);
    const min = parseInt(minute, 10);
    if (h < 0 || h > 23 || min < 0 || min > 59) return match;
    if (min === 0) return `${smallNumberToWords(h)} em ponto`;
    if (min === 30) return `${smallNumberToWords(h)} e meia`;
    return `${smallNumberToWords(h)} e ${min}`;
  });

  result = result.replace(/\b(\d{1,2})h\b/g, (match, hour) => {
    const h = parseInt(hour, 10);
    if (h >= 0 && h <= 23) return `${smallNumberToWords(h)} em ponto`;
    return match;
  });

  return result;
}

function smallNumberToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 20) return UNIDADES[n];
  if (n < 100) {
    const d = Math.floor(n / 10);
    const u = n % 10;
    return DEZENAS[d] + (u ? ` e ${UNIDADES[u]}` : "");
  }
  return numberToWords(n);
}

function numberToWords(n: number): string {
  if (n === 0) return "zero";
  if (n < 100) return smallNumberToWords(n);
  if (n < 1000) {
    if (n === 100) return "cem";
    const c = Math.floor(n / 100);
    const rest = n % 100;
    return CENTENAS[c] + (rest ? ` e ${smallNumberToWords(rest)}` : "");
  }
  if (n < 10000) {
    const m = Math.floor(n / 1000);
    const rest = n % 1000;
    const prefix = m === 1 ? "mil" : `${smallNumberToWords(m)} mil`;
    return prefix + (rest ? ` e ${numberToWords(rest)}` : "");
  }
  return String(n);
}

export function splitSpeechChunks(
  text: string,
  maxChars: number = 900,
  options: { profile?: SpeechProfile; minChars?: number } = {},
): string[] {
  if (!text) return [];

  const profile = options.profile ?? "kallistis";
  const minChars = options.minChars ?? (profile === "klio" ? 90 : 140);
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChars) {
      if (current) {
        chunks.push(current.trim());
        current = "";
      }
      chunks.push(...splitLongSentence(trimmed, maxChars));
      continue;
    }

    const next = current ? `${current} ${trimmed}` : trimmed;
    if (next.length <= maxChars) current = next;
    else {
      if (current) chunks.push(current.trim());
      current = trimmed;
    }
  }

  if (current) chunks.push(current.trim());
  return mergeShortSpeechChunks(chunks, maxChars, minChars);
}

function splitLongSentence(sentence: string, maxChars: number): string[] {
  const chunks: string[] = [];
  const parts = sentence.split(/([,;])/).reduce<string[]>((acc, part) => {
    const trimmed = part.trim();
    if (!trimmed || trimmed === "," || trimmed === ";") return acc;
    acc.push(trimmed);
    return acc;
  }, []);
  let current = "";

  for (const part of parts) {
    const next = current ? `${current}, ${part}` : part;
    if (next.length <= maxChars) current = next;
    else {
      if (current) chunks.push(ensureTerminalPunctuation(current));
      current = part;
    }
  }
  if (current) chunks.push(ensureTerminalPunctuation(current));
  return chunks;
}

function mergeShortSpeechChunks(chunks: string[], maxChars: number, minChars: number): string[] {
  const merged: string[] = [];
  for (const chunk of chunks) {
    const last = merged[merged.length - 1];
    if (
      last &&
      (last.length < minChars || chunk.length < minChars) &&
      last.length + 1 + chunk.length <= maxChars
    ) {
      merged[merged.length - 1] = `${last} ${chunk}`.trim();
    } else {
      merged.push(chunk);
    }
  }
  return merged;
}

function ensureTerminalPunctuation(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
