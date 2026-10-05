import { z } from "zod";
import {
  MAX_ATTACHMENTS,
  MAX_ATTACHMENT_TOTAL_BYTES,
  MAX_ATTACHMENT_BYTES,
} from "@/lib/attachment-limits";

export const MAX_CHAT_TEXT_CHARS = 12_000;
export const MAX_CHAT_REQUEST_BYTES = 12 * 1024 * 1024;
export const MAX_CHAT_HISTORY_MESSAGES = 80;
export const MAX_CHAT_HISTORY_CHARS = 60_000;
export const MAX_CLIENT_CHAT_MESSAGES = 1;

const MAX_FILE_DATA_URL_CHARS = Math.ceil((MAX_ATTACHMENT_BYTES * 4) / 3) + 128;
const ACCEPTED_CHAT_MEDIA_TYPES = new Set([
  "application/pdf",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const BASE64_DATA_URL = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/;

function decodedBase64(value: string): Uint8Array | null {
  const match = BASE64_DATA_URL.exec(value);
  if (!match) return null;

  const encoded = match[2];
  if (!encoded || encoded.length % 4 !== 0) return null;
  const padding = encoded.endsWith("==") ? 2 : encoded.endsWith("=") ? 1 : 0;

  try {
    const decoded = atob(encoded);
    if (decoded.length !== (encoded.length / 4) * 3 - padding) return null;
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export function decodedBase64Bytes(value: string): number | null {
  return decodedBase64(value)?.byteLength ?? null;
}

function hasSignature(mediaType: string, bytes: Uint8Array): boolean {
  const startsWith = (...signature: number[]) =>
    signature.every((byte, index) => bytes[index] === byte);
  if (mediaType === "image/png") return startsWith(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
  if (mediaType === "image/jpeg") return startsWith(0xff, 0xd8, 0xff);
  if (mediaType === "image/gif") {
    return (
      startsWith(0x47, 0x49, 0x46, 0x38, 0x37, 0x61) ||
      startsWith(0x47, 0x49, 0x46, 0x38, 0x39, 0x61)
    );
  }
  if (mediaType === "image/webp") {
    return (
      startsWith(0x52, 0x49, 0x46, 0x46) &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50
    );
  }
  if (mediaType === "application/pdf") return startsWith(0x25, 0x50, 0x44, 0x46, 0x2d);
  return false;
}

const TextPart = z
  .object({
    type: z.literal("text"),
    text: z.string().min(1).max(MAX_CHAT_TEXT_CHARS),
  })
  .strict();

const FilePart = z
  .object({
    type: z.literal("file"),
    mediaType: z.string().refine((value) => ACCEPTED_CHAT_MEDIA_TYPES.has(value), {
      message: "Formato de anexo não aceito",
    }),
    filename: z.string().min(1).max(200).optional(),
    url: z.string().min(1).max(MAX_FILE_DATA_URL_CHARS),
  })
  .strict();

const UserMessage = z
  .object({
    id: z.string().uuid(),
    role: z.literal("user"),
    parts: z
      .array(z.discriminatedUnion("type", [TextPart, FilePart]))
      .min(1)
      .max(MAX_ATTACHMENTS + 1),
  })
  .strict()
  .superRefine((message, context) => {
    const fileParts = message.parts.filter((part) => part.type === "file");
    const textParts = message.parts.filter((part) => part.type === "text");
    const totalTextChars = textParts.reduce((total, part) => total + part.text.length, 0);
    if (textParts.length > 1) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["parts"],
        message: "A mensagem aceita no máximo uma parte de texto",
      });
    }
    if (totalTextChars > MAX_CHAT_TEXT_CHARS) {
      context.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: MAX_CHAT_TEXT_CHARS,
        type: "string",
        inclusive: true,
        path: ["parts"],
        message: "Conteúdo textual total acima do limite",
      });
    }
    if (fileParts.length > MAX_ATTACHMENTS) {
      context.addIssue({
        code: z.ZodIssueCode.too_big,
        maximum: MAX_ATTACHMENTS,
        type: "array",
        inclusive: true,
        path: ["parts"],
        message: `Envie no máximo ${MAX_ATTACHMENTS} anexos por mensagem.`,
      });
    }
    for (const [index, part] of message.parts.entries()) {
      if (
        part.type === "file" &&
        (!part.url.startsWith(`data:${part.mediaType};base64,`) ||
          decodedBase64(part.url) === null ||
          !hasSignature(part.mediaType, decodedBase64(part.url) ?? new Uint8Array()))
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["parts", index, "url"],
          message: "Anexo deve ser um data URL base64 válido do formato declarado",
        });
      }
    }
  });

export const ChatEnvelope = z
  .object({
    threadId: z.string().uuid(),
    facet: z.literal("kallistis").optional(),
    surface: z.literal("kallistis").optional(),
    mode: z.literal("default").optional(),
    messages: z.array(UserMessage).length(MAX_CLIENT_CHAT_MESSAGES),
    assistantMessageId: z.string().uuid(),
  })
  .strict();

export type ChatEnvelopeInput = z.infer<typeof ChatEnvelope>;

export function validationStatus(error: z.ZodError): 400 | 413 {
  return error.issues.some((issue) => issue.code === "too_big") ? 413 : 400;
}

export async function readBoundedJson(
  request: Request,
  maxBytes = MAX_CHAT_REQUEST_BYTES,
): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413 }> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return { ok: false, status: 413 };
  }

  if (!request.body) return { ok: false, status: 400 };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0;
  let body = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      await reader.cancel("chat request too large");
      return { ok: false, status: 413 };
    }
    body += decoder.decode(value, { stream: true });
  }
  body += decoder.decode();

  try {
    return { ok: true, value: JSON.parse(body) };
  } catch {
    return { ok: false, status: 400 };
  }
}

export function approximateAttachmentBytes(dataUrl: string): number {
  const decodedBytes = decodedBase64Bytes(dataUrl);
  if (decodedBytes !== null) return decodedBytes;
  return new TextEncoder().encode(dataUrl).byteLength;
}

export function attachmentSizeError(message: ChatEnvelopeInput["messages"][number]): string | null {
  const fileParts = message.parts.filter((part) => part.type === "file");
  const sizes = fileParts.map((part) => approximateAttachmentBytes(part.url));
  if (sizes.some((size) => size > MAX_ATTACHMENT_BYTES)) {
    return `Cada anexo pode ter no máximo ${Math.round(MAX_ATTACHMENT_BYTES / 1024 / 1024)} MB.`;
  }
  if (sizes.reduce((total, size) => total + size, 0) > MAX_ATTACHMENT_TOTAL_BYTES) {
    return `Anexos excedem o limite total de ${Math.round(MAX_ATTACHMENT_TOTAL_BYTES / 1024 / 1024)} MB por mensagem.`;
  }
  return null;
}
