import type { UIMessage } from "ai";

export const PROCESSED_ATTACHMENT_PREFIX = "[Anexo anterior já processado:";

export function processedAttachmentMarker(filename?: string | null): string {
  return `${PROCESSED_ATTACHMENT_PREFIX} ${filename || "arquivo"}]`;
}

export function replaceFilePartsWithMarkers(messages: UIMessage[]): UIMessage[] {
  return messages.map((message) => {
    let changed = false;
    const parts = (message.parts ?? []).map((part) => {
      if (part.type !== "file") return part;
      changed = true;
      return { type: "text" as const, text: processedAttachmentMarker(part.filename) };
    });
    return changed ? { ...message, parts } : message;
  });
}

export function serializedMessagesContain(messages: UIMessage[], needle: string): boolean {
  return JSON.stringify({ messages }).includes(needle);
}
