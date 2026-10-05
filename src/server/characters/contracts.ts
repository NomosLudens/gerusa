import type { CharacterSnapshot, EpicManifestationStatus } from "./character-canon";
import type { KallistisCharacterProjection } from "./presentation";

export type CharacterStatus = "draft" | "submitted" | "approved" | "rejected" | "archived";
export type CharacterMesa = { id: string; slug: string; name: string };
export type ProgressionStatus =
  | "requested"
  | "authorized"
  | "in_progress"
  | "applied"
  | "cancelled"
  | "rejected";
export type CharacterRecord = {
  id: string;
  ownerUserId: string;
  masterUserId: string;
  status: CharacterStatus;
  ruleset: string;
  name: string;
  playerName: string;
  ownerDisplayName?: string;
  snapshot: CharacterSnapshot;
  kallistis?: KallistisCharacterProjection;
  mesas: CharacterMesa[];
  version: number;
  mechanicalFingerprint: string;
  createdAt: string;
  updatedAt: string;
  submittedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  archivedAt: string | null;
  publishedSnapshot: CharacterSnapshot | null;
  publishedVersion: number | null;
};
export type CharacterVersion = {
  version: number;
  snapshot: CharacterSnapshot;
  reason: string;
  actorUserId: string;
  createdAt: string;
};
export type CharacterEvent = {
  id: string;
  characterId: string;
  actorUserId: string;
  eventType: string;
  payload: Record<string, unknown>;
  versionBefore: number | null;
  versionAfter: number | null;
  createdAt: string;
};
export type CharacterProgressionRequest = {
  id: string;
  characterId: string;
  trailId: string;
  fromMarco: number;
  toMarco: number;
  status: ProgressionStatus;
  note: string;
  requestedByUserId: string | null;
  authorizedByUserId: string | null;
  appliedByUserId: string | null;
  createdAt: string;
  authorizedAt: string | null;
  startedAt: string | null;
  appliedAt: string | null;
  proposedSnapshot?: CharacterSnapshot | null;
  epicManifestationStatus?: EpicManifestationStatus | null;
  epicManifestationFeedback?: string | null;
  epicManifestationReviewedByUserId?: string | null;
  epicManifestationReviewedAt?: string | null;
};
export type CharacterCreationMessage = {
  id: string;
  characterId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
};
