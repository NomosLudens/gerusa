export class TelegramClientError extends Error {
  readonly code: string;

  constructor(code: string) {
    super(code);
    this.name = "TelegramClientError";
    this.code = code;
  }
}

export function splitTelegramText(text: string, max = 4000): string[] {
  if (!text) return [];
  const chars = Array.from(text);
  const chunks: string[] = [];
  let start = 0;
  while (start < chars.length) {
    let end = Math.min(start + max, chars.length);
    if (end < chars.length) {
      const window = chars.slice(start, end).join("");
      const paragraph = window.lastIndexOf("\n\n");
      const space = window.lastIndexOf(" ");
      const cut = paragraph > max * 0.5 ? paragraph : space > max * 0.7 ? space : -1;
      if (cut > 0) end = start + cut;
    }
    const chunk = chars.slice(start, end).join("").trimEnd();
    if (chunk) chunks.push(chunk);
    start = end;
    while (chars[start] === " ") start += 1;
  }
  return chunks;
}

export async function sendTelegramMessage(input: {
  token: string;
  chatId: number;
  text: string;
  replyToMessageId?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<number> {
  if (!input.text) throw new TelegramClientError("telegram_empty_message");
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${input.token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        ...(input.replyToMessageId ? { reply_to_message_id: input.replyToMessageId } : {}),
      }),
    });
    if (!response.ok) throw new TelegramClientError(`telegram_http_${response.status}`);
    let body: { ok?: boolean; result?: { message_id?: number } };
    try {
      body = (await response.json()) as { ok?: boolean; result?: { message_id?: number } };
    } catch {
      throw new TelegramClientError("telegram_invalid_json");
    }
    if (body.ok !== true) throw new TelegramClientError("telegram_not_ok");
    const messageId = body.result?.message_id;
    if (typeof messageId !== "number" || !Number.isInteger(messageId))
      throw new TelegramClientError("telegram_invalid_response");
    return messageId;
  } catch (error) {
    if (error instanceof TelegramClientError) throw error;
    if (error instanceof Error && error.name === "AbortError")
      throw new TelegramClientError("telegram_timeout");
    throw new TelegramClientError("telegram_send_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export type TelegramFileInfo = {
  filePath: string;
  fileSize: number | null;
};

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

export async function getTelegramFile(input: {
  token: string;
  fileId: string;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<TelegramFileInfo> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);
  try {
    const response = await fetchImpl(`https://api.telegram.org/bot${input.token}/getFile`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({ file_id: input.fileId }),
    });
    if (!response.ok) throw new TelegramClientError(`telegram_get_file_http_${response.status}`);
    let body: { ok?: boolean; result?: { file_path?: unknown; file_size?: unknown } };
    try {
      body = (await response.json()) as {
        ok?: boolean;
        result?: { file_path?: unknown; file_size?: unknown };
      };
    } catch {
      throw new TelegramClientError("telegram_get_file_invalid_json");
    }
    if (body.ok !== true) throw new TelegramClientError("telegram_get_file_not_ok");
    const filePath = body.result?.file_path;
    const fileSize = body.result?.file_size;
    if (typeof filePath !== "string" || !filePath) {
      throw new TelegramClientError("telegram_get_file_invalid_response");
    }
    if (
      fileSize !== undefined &&
      (typeof fileSize !== "number" || !Number.isSafeInteger(fileSize) || fileSize < 0)
    ) {
      throw new TelegramClientError("telegram_get_file_invalid_response");
    }
    return { filePath, fileSize: typeof fileSize === "number" ? fileSize : null };
  } catch (error) {
    if (error instanceof TelegramClientError) throw error;
    if (isAbortError(error)) throw new TelegramClientError("telegram_get_file_timeout");
    throw new TelegramClientError("telegram_get_file_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export async function downloadTelegramFile(input: {
  token: string;
  filePath: string;
  mediaType: string;
  maxBytes: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<Blob> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);
  try {
    const response = await fetchImpl(
      `https://api.telegram.org/file/bot${input.token}/${input.filePath}`,
      { method: "GET", signal: controller.signal },
    );
    if (!response.ok)
      throw new TelegramClientError(`telegram_file_download_http_${response.status}`);
    const contentLength = response.headers.get("content-length");
    if (contentLength && Number(contentLength) > input.maxBytes) {
      throw new TelegramClientError("telegram_file_too_large");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new TelegramClientError("telegram_file_empty");
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > input.maxBytes) {
        await reader.cancel().catch(() => undefined);
        throw new TelegramClientError("telegram_file_too_large");
      }
      chunks.push(value);
    }
    if (total <= 0) throw new TelegramClientError("telegram_file_empty");
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return new Blob([bytes.buffer], { type: input.mediaType });
  } catch (error) {
    if (error instanceof TelegramClientError) throw error;
    if (isAbortError(error)) throw new TelegramClientError("telegram_file_download_timeout");
    throw new TelegramClientError("telegram_file_download_failed");
  } finally {
    clearTimeout(timeout);
  }
}

export async function sendTelegramAudio(input: {
  token: string;
  chatId: number;
  audio: Blob;
  filename: string;
  replyToMessageId?: number;
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}): Promise<number> {
  if (
    input.audio.type !== "audio/mpeg" ||
    input.audio.size <= 0 ||
    !input.filename.endsWith(".mp3")
  ) {
    throw new TelegramClientError("telegram_audio_invalid_input");
  }
  const fetchImpl = input.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), input.timeoutMs ?? 15000);
  try {
    const form = new FormData();
    form.set("chat_id", String(input.chatId));
    form.set("audio", input.audio, input.filename);
    if (input.replyToMessageId !== undefined)
      form.set("reply_to_message_id", String(input.replyToMessageId));
    const response = await fetchImpl(`https://api.telegram.org/bot${input.token}/sendAudio`, {
      method: "POST",
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) throw new TelegramClientError(`telegram_audio_http_${response.status}`);
    let body: { ok?: boolean; result?: { message_id?: number } };
    try {
      body = (await response.json()) as { ok?: boolean; result?: { message_id?: number } };
    } catch {
      throw new TelegramClientError("telegram_audio_invalid_json");
    }
    if (body.ok !== true) throw new TelegramClientError("telegram_audio_not_ok");
    const messageId = body.result?.message_id;
    if (typeof messageId !== "number" || !Number.isInteger(messageId))
      throw new TelegramClientError("telegram_audio_invalid_response");
    return messageId;
  } catch (error) {
    if (error instanceof TelegramClientError) throw error;
    if (isAbortError(error)) throw new TelegramClientError("telegram_audio_timeout");
    throw new TelegramClientError("telegram_audio_send_failed");
  } finally {
    clearTimeout(timeout);
  }
}
