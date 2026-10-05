import type {
  MicroappMessageData,
  ValidateMicroappMessageOptions,
  ValidateMicroappMessageResult,
} from "./microapp-types";

export const DEFAULT_MICROAPP_SANDBOX = "allow-scripts allow-same-origin allow-forms";

export const COMMON_MICROAPP_ACTIONS = [
  "microapp:ready",
  "microapp:error",
  "microapp:view-change",
  "microapp:request-action",
  "microapp:copy-output",
  "microapp:download-output",
] as const;

export const CODICE_MICROAPP_ACTIONS = [
  ...COMMON_MICROAPP_ACTIONS,
  "codice:view-change",
  "codice:upload-request",
  "codice:library-upload-file",
  "codice:library-list-request",
  "codice:library-open-request",
  "codice:library-delete-request",
  "codice:library-list-ready",
  "codice:library-book-uploaded",
  "codice:library-book-opened",
  "codice:library-book-render-ready",
  "codice:library-book-deleted",
  "codice:library-error",
  "codice:margin-save-request",
  "codice:margin-save-complete",
  "codice:study-generate-request",
  "codice:study-generate-complete",
  "codice:open-document",
  "codice:drive-folder-url",
  "codice:drive-folder-picker",
  "codice:drive-open-epub",
  "codice:generate-summary",
  "codice:summary-ready",
  "codice:save-note",
  "codice:wake-lock-toggle",
  "codice:theme-change",
  "codice:font-change",
] as const;

export const AGENDA_MICROAPP_ACTIONS = [
  ...COMMON_MICROAPP_ACTIONS,
  "agenda:context-request",
  "agenda:context-ready",
  "agenda:eventos-request",
  "agenda:eventos-ready",
  "agenda:evento-criar",
  "agenda:evento-criado",
  "agenda:evento-atualizar",
  "agenda:evento-atualizado",
  "agenda:evento-deletar",
  "agenda:evento-deletado",
  "agenda:error",
] as const;

export const CORPORE_SANO_MICROAPP_ACTIONS = [
  ...COMMON_MICROAPP_ACTIONS,
  "corpore-sano:sync-request",
  "corpore-sano:sync-ready",
  "corpore-sano:finish-workout",
  "corpore-sano:workout-finished",
  "corpore-sano:signals-save",
  "corpore-sano:signals-saved",
  "corpore-sano:history-delete",
  "corpore-sano:history-deleted",
  "corpore-sano:khora-chat-open",
  "corpore-sano:error",
] as const;

export const JURIDICO_MICROAPP_ACTIONS = [
  ...COMMON_MICROAPP_ACTIONS,
  "juridico:documentos-request",
  "juridico:documentos-pronto",
  "juridico:busca-request",
  "juridico:busca-pronto",
  "juridico:documento-salvar",
  "juridico:documento-salvo",
  "juridico:trechos-request",
  "juridico:trechos-pronto",
  "juridico:trechos-salvar",
  "juridico:trechos-salvo",
  "juridico:erro",
] as const;

export const JURIDICO_ACERVO_MICROAPP_ACTIONS = [
  ...COMMON_MICROAPP_ACTIONS,
  "juridico-acervo:itens-request",
  "juridico-acervo:itens-ready",
  "juridico-acervo:buscar",
  "juridico-acervo:resultado",
  "juridico-acervo:salvar",
  "juridico-acervo:salvo",
  "juridico-acervo:remover",
  "juridico-acervo:removido",
  "juridico-acervo:error",
] as const;

export const REVISAO_MICROAPP_ACTIONS = [
  ...COMMON_MICROAPP_ACTIONS,
  "revisao:candidatos-request",
  "revisao:candidatos-ready",
  "revisao:candidato-aprovar",
  "revisao:candidato-aprovar-editado",
  "revisao:candidato-recusar",
  "revisao:candidato-arquivar",
  "revisao:due-request",
  "revisao:due-ready",
  "revisao:memoria-revisar",
  "revisao:memoria-revisada",
  "revisao:error",
] as const;

export const MICROAPP_REGISTRY_DEFAULTS: Record<
  string,
  { src: string; expectedSource: string; allowedActions: readonly string[] }
> = {
  codice: {
    src: "/codice/index.html",
    expectedSource: "codice",
    allowedActions: CODICE_MICROAPP_ACTIONS,
  },
  "corpore-sano": {
    src: "/corpore-sano/index.html",
    expectedSource: "corpore-sano",
    allowedActions: CORPORE_SANO_MICROAPP_ACTIONS,
  },
  agenda: {
    src: "/microapps/agenda/index.html?delete-handler-v=20260902",
    expectedSource: "agenda",
    allowedActions: AGENDA_MICROAPP_ACTIONS,
  },
  juridico: {
    src: "/juridico/index.html",
    expectedSource: "juridico",
    allowedActions: JURIDICO_MICROAPP_ACTIONS,
  },
  legislacao: {
    src: "/juridico-acervo/index.html?modo=legislacao",
    expectedSource: "juridico-acervo",
    allowedActions: JURIDICO_ACERVO_MICROAPP_ACTIONS,
  },
  jurisprudencia: {
    src: "/juridico-acervo/index.html?modo=jurisprudencia",
    expectedSource: "juridico-acervo",
    allowedActions: JURIDICO_ACERVO_MICROAPP_ACTIONS,
  },
  revisao: {
    src: "/revisao/index.html",
    expectedSource: "revisao",
    allowedActions: REVISAO_MICROAPP_ACTIONS,
  },
};

export function appendEmbeddedParam(src: string, embedded = true) {
  if (!embedded) return src;
  const [urlWithoutHash, hash = ""] = src.split("#", 2);
  const hashSuffix = hash ? `#${hash}` : "";
  const [path, query = ""] = urlWithoutHash.split("?", 2);
  const params = new URLSearchParams(query);
  params.set("embedded", "1");
  const queryString = params.toString();
  return `${path}${queryString ? `?${queryString}` : ""}${hashSuffix}`;
}

function isMicroappMessageData(data: unknown): data is MicroappMessageData {
  return Boolean(data && typeof data === "object");
}

export function validateMicroappMessage({
  event,
  frameWindow,
  expectedOrigin,
  expectedSource,
  allowedActions,
}: ValidateMicroappMessageOptions): ValidateMicroappMessageResult {
  if (event.origin !== expectedOrigin) return { ok: false, reason: "invalid-origin" };
  if (!frameWindow || event.source !== frameWindow) return { ok: false, reason: "invalid-window" };
  if (!isMicroappMessageData(event.data)) return { ok: false, reason: "invalid-data" };

  const { source, action, payload, timestamp } = event.data;
  if (typeof source !== "string" || !source) return { ok: false, reason: "invalid-source" };
  if (expectedSource && source !== expectedSource)
    return { ok: false, reason: "unexpected-source" };
  if (typeof action !== "string" || !action) return { ok: false, reason: "invalid-action" };
  if (allowedActions?.length && !allowedActions.includes(action)) {
    return { ok: false, reason: "blocked-action" };
  }

  return {
    ok: true,
    event: {
      source,
      action,
      payload,
      timestamp: typeof timestamp === "number" ? timestamp : undefined,
      rawEvent: event,
    },
  };
}
