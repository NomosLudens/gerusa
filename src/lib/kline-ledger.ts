import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// prettier-ignore
export type KlineJson =
  | string
  | number
  | boolean
  | null
  | KlineJson[]
  | { [key: string]: KlineJson };

export type KlineRefKind = "legacy" | "external" | "derived";

export type KlineReviewStatus = "pending" | "approved" | "rejected" | "archived";

// prettier-ignore
export type KlineLedgerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; cause?: unknown };

export type CreateKlineEventInput = {
  userId: string;
  eventType: string;
  sourceApp: string;
  occurredAt?: string;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, KlineJson>;
  metadata?: Record<string, KlineJson>;
};

export type LinkKlineLegacySourceInput = {
  userId: string;
  eventId: string;
  legacySourceTable: string;
  legacySourceId: string;
  metadata?: Record<string, KlineJson>;
};

export type LinkKlineExternalRefInput = {
  userId: string;
  eventId: string;
  externalRef: string;
  metadata?: Record<string, KlineJson>;
};

export type AppendKlineReviewStateInput = {
  userId: string;
  eventId: string;
  status: KlineReviewStatus;
  reviewerId?: string | null;
  note?: string | null;
  metadata?: Record<string, KlineJson>;
};

// The Ledger tables may not exist in generated types yet; keep this cast isolated here.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type InsertableLedgerDb = SupabaseClient<any, "public", any>;

type InsertResult = {
  data: unknown;
  error: unknown;
};

const ledgerDb = supabase as unknown as InsertableLedgerDb;

function isBlank(value: string | null | undefined): value is null | undefined | "" {
  return !value || value.trim().length === 0;
}

function validationError(error: string): KlineLedgerResult<unknown> {
  return { ok: false, error };
}

function warn(error: string, cause?: unknown): void {
  console.warn("[kline-ledger]", error, cause);
}

async function insertLedgerRow(
  table: "kline_events" | "kline_event_refs" | "kline_event_review_state",
  row: Record<string, unknown>,
  errorMessage: string,
): Promise<KlineLedgerResult<unknown>> {
  try {
    const { data, error } = (await ledgerDb
      .from(table)
      .insert(row)
      .select("id")
      .single()) as InsertResult;

    if (error) {
      warn(errorMessage, error);
      return { ok: false, error: errorMessage, cause: error };
    }

    return { ok: true, data };
  } catch (cause) {
    warn(errorMessage, cause);
    return { ok: false, error: errorMessage, cause };
  }
}

function eventIdFrom(data: unknown): string | null {
  if (data && typeof data === "object" && "id" in data && typeof data.id === "string") {
    return data.id;
  }

  return null;
}

export async function createKlineEvent(
  input: CreateKlineEventInput,
): Promise<KlineLedgerResult<unknown>> {
  if (isBlank(input.userId)) return validationError("K∧LINE Ledger userId is required.");
  if (isBlank(input.eventType)) return validationError("K∧LINE Ledger eventType is required.");
  if (isBlank(input.sourceApp)) return validationError("K∧LINE Ledger sourceApp is required.");

  return insertLedgerRow(
    "kline_events",
    {
      user_id: input.userId,
      event_type: input.eventType,
      source_app: input.sourceApp,
      occurred_at: input.occurredAt ?? new Date().toISOString(),
      title: input.title ?? null,
      body: input.body ?? null,
      payload: input.payload ?? {},
      metadata: input.metadata ?? {},
    },
    "Failed to create K∧LINE Ledger event.",
  );
}

export async function linkKlineLegacySource(
  input: LinkKlineLegacySourceInput,
): Promise<KlineLedgerResult<unknown>> {
  if (isBlank(input.userId)) return validationError("K∧LINE Ledger userId is required.");
  if (isBlank(input.eventId)) return validationError("K∧LINE Ledger eventId is required.");
  if (isBlank(input.legacySourceTable)) {
    return validationError("K∧LINE Ledger legacySourceTable is required.");
  }
  if (isBlank(input.legacySourceId)) {
    return validationError("K∧LINE Ledger legacySourceId is required.");
  }

  return insertLedgerRow(
    "kline_event_refs",
    {
      user_id: input.userId,
      event_id: input.eventId,
      ref_kind: "legacy" satisfies KlineRefKind,
      legacy_source_table: input.legacySourceTable,
      legacy_source_id: input.legacySourceId,
      external_ref: null,
      metadata: input.metadata ?? {},
    },
    "Failed to link K∧LINE Ledger legacy source.",
  );
}

export async function linkKlineExternalRef(
  input: LinkKlineExternalRefInput,
): Promise<KlineLedgerResult<unknown>> {
  if (isBlank(input.userId)) return validationError("K∧LINE Ledger userId is required.");
  if (isBlank(input.eventId)) return validationError("K∧LINE Ledger eventId is required.");
  if (isBlank(input.externalRef)) return validationError("K∧LINE Ledger externalRef is required.");

  return insertLedgerRow(
    "kline_event_refs",
    {
      user_id: input.userId,
      event_id: input.eventId,
      ref_kind: "external" satisfies KlineRefKind,
      legacy_source_table: null,
      legacy_source_id: null,
      external_ref: input.externalRef,
      metadata: input.metadata ?? {},
    },
    "Failed to link K∧LINE Ledger external reference.",
  );
}

export async function appendKlineReviewState(
  input: AppendKlineReviewStateInput,
): Promise<KlineLedgerResult<unknown>> {
  if (isBlank(input.userId)) return validationError("K∧LINE Ledger userId is required.");
  if (isBlank(input.eventId)) return validationError("K∧LINE Ledger eventId is required.");
  if (isBlank(input.status)) return validationError("K∧LINE Ledger status is required.");

  return insertLedgerRow(
    "kline_event_review_state",
    {
      user_id: input.userId,
      event_id: input.eventId,
      status: input.status,
      reviewer_id: input.reviewerId ?? null,
      note: input.note ?? null,
      metadata: input.metadata ?? {},
    },
    "Failed to append K∧LINE Ledger review state.",
  );
}

export async function createKlineHandoffCandidate(input: {
  userId: string;
  sourceApp: string;
  targetApp: string;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, KlineJson>;
  metadata?: Record<string, KlineJson>;
  legacySourceTable?: string | null;
  legacySourceId?: string | null;
}): Promise<KlineLedgerResult<unknown>> {
  if (isBlank(input.targetApp)) return validationError("K∧LINE Ledger targetApp is required.");

  const event = await createKlineEvent({
    userId: input.userId,
    eventType: "handoff.candidate",
    sourceApp: input.sourceApp,
    title: input.title,
    body: input.body,
    payload: { ...(input.payload ?? {}), target_app: input.targetApp },
    metadata: input.metadata,
  });

  if (!event.ok) return event;

  const eventId = eventIdFrom(event.data);
  if (!eventId) {
    return validationError("K∧LINE Ledger event insert did not return an event id.");
  }

  const review = await appendKlineReviewState({
    userId: input.userId,
    eventId,
    status: "pending",
  });
  if (!review.ok) return review;

  const legacySourceTable = input.legacySourceTable;
  const legacySourceId = input.legacySourceId;
  if (!isBlank(legacySourceTable) && !isBlank(legacySourceId)) {
    const ref = await linkKlineLegacySource({
      userId: input.userId,
      eventId,
      legacySourceTable,
      legacySourceId,
    });
    if (!ref.ok) return ref;
  }

  return { ok: true, data: event.data };
}

export async function createKlineMemoryCandidateEvent(input: {
  userId: string;
  sourceApp: string;
  title?: string | null;
  body?: string | null;
  payload?: Record<string, KlineJson>;
  metadata?: Record<string, KlineJson>;
  legacySourceTable?: string | null;
  legacySourceId?: string | null;
}): Promise<KlineLedgerResult<unknown>> {
  const event = await createKlineEvent({
    userId: input.userId,
    eventType: "memory.candidate",
    sourceApp: input.sourceApp,
    title: input.title,
    body: input.body,
    payload: input.payload,
    metadata: input.metadata,
  });

  if (!event.ok) return event;

  const eventId = eventIdFrom(event.data);
  if (!eventId) {
    return validationError("K∧LINE Ledger event insert did not return an event id.");
  }

  const review = await appendKlineReviewState({
    userId: input.userId,
    eventId,
    status: "pending",
  });
  if (!review.ok) return review;

  const legacySourceTable = input.legacySourceTable;
  const legacySourceId = input.legacySourceId;
  if (!isBlank(legacySourceTable) && !isBlank(legacySourceId)) {
    const ref = await linkKlineLegacySource({
      userId: input.userId,
      eventId,
      legacySourceTable,
      legacySourceId,
    });
    if (!ref.ok) return ref;
  }

  return { ok: true, data: event.data };
}
