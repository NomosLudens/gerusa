export type ObservabilityArea =
  | "kuan-yin"
  | "public-page"
  | "appointment"
  | "payment-proof"
  | "chat"
  | "supabase"
  | "microapp"
  | "pwa"
  | "auth";
export type ObservabilityLevel = "info" | "warn" | "error";

export type ObservabilityEvent = {
  traceId: string;
  level: ObservabilityLevel;
  area: ObservabilityArea;
  action: string;
  message: string;
  userId?: string;
  guardianId?: string;
  route?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

const SECRET_RE = /(token|secret|key|authorization|password|comprovante|proof|payer_note|pix)/i;

export function sanitizeMetadata(input: Record<string, unknown> = {}): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key]) => !SECRET_RE.test(key))
      .map(([key, value]) => [key, typeof value === "string" ? value.slice(0, 240) : value]),
  );
}

export function makeObservabilityEvent(
  event: Omit<ObservabilityEvent, "createdAt" | "metadata"> & {
    metadata?: Record<string, unknown>;
  },
): ObservabilityEvent {
  return {
    ...event,
    metadata: sanitizeMetadata(event.metadata),
    createdAt: new Date().toISOString(),
  };
}
