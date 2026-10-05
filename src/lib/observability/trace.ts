export function createTraceId(): string {
  const id =
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  return `trc_${id
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 24)
    .toLowerCase()}`;
}

export function shortTraceId(traceId: string): string {
  return traceId.slice(0, 16);
}
