export const MAX_ATTACHMENTS = 4;
export const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;
export const MAX_ATTACHMENT_TOTAL_BYTES = 8 * 1024 * 1024;

export function formatAttachmentLimit(bytes = MAX_ATTACHMENT_TOTAL_BYTES): string {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

export function validateAttachmentTotal(
  files: Array<{ size: number }>,
): { ok: true } | { ok: false; reason: string } {
  if (files.length > MAX_ATTACHMENTS) {
    return { ok: false, reason: `Envie no máximo ${MAX_ATTACHMENTS} anexos por mensagem.` };
  }
  if (files.some((file) => Math.max(0, file.size || 0) > MAX_ATTACHMENT_BYTES)) {
    return {
      ok: false,
      reason: `Cada anexo pode ter no máximo ${formatAttachmentLimit(MAX_ATTACHMENT_BYTES)}.`,
    };
  }
  const total = files.reduce((sum, file) => sum + Math.max(0, file.size || 0), 0);
  if (total > MAX_ATTACHMENT_TOTAL_BYTES) {
    return {
      ok: false,
      reason: `Anexos excedem o limite total de ${formatAttachmentLimit()} por mensagem.`,
    };
  }
  return { ok: true };
}
