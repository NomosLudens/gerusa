import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import {
  getProfileForUser,
  upsertProfileForUser,
  type ProfileInput,
  getOnboardingForUser,
  listMesas,
  saveOnboardingForUser,
} from "@/server/local-core/postgres-repositories";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import {
  getAllowedPlayerAppIds,
  isMaster,
  isSystemMaster,
} from "@/server/local-core/player-access";

const headers = { "Cache-Control": "no-store" };
const MAX_BODY_BYTES = 8 * 1024;

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

async function readInput(request: Request): Promise<ProfileInput | null> {
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object") return null;
  const value = body as Record<string, unknown>;
  if (
    Object.keys(value).some(
      (key) => !["display_name", "pronouns", "avatar_url", "gender"].includes(key),
    )
  ) {
    return null;
  }
  const displayName = value.display_name;
  const pronouns = value.pronouns;
  const avatarUrl = value.avatar_url;
  const gender = value.gender;
  if (
    !(displayName === null || typeof displayName === "string") ||
    !(pronouns === null || typeof pronouns === "string") ||
    !(avatarUrl === null || typeof avatarUrl === "string") ||
    !(gender === null || gender === "feminino" || gender === "masculino" || gender === "neutro")
  ) {
    return null;
  }
  if (typeof displayName === "string" && displayName.length > 60) return null;
  if (typeof pronouns === "string" && pronouns.length > 80) return null;
  if (typeof avatarUrl === "string" && avatarUrl.length > 500) return null;
  return {
    display_name: displayName,
    pronouns,
    avatar_url: avatarUrl,
    gender,
  };
}

export const Route = createFileRoute("/api/profile")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        try {
          const systemMaster = await isSystemMaster(sql, auth.userId);
          const master = systemMaster || (await isMaster(sql, auth.userId));
          return Response.json(
            {
              profile: await getProfileForUser(sql, auth.userId),
              onboarding: await getOnboardingForUser(sql, auth.userId),
              mesas: await listMesas(sql),
              is_system_master: systemMaster,
              is_master: master,
              allowed_app_ids: systemMaster
                ? undefined
                : await getAllowedPlayerAppIds(sql, auth.userId),
            },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
      PUT: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return Response.json({ error: "csrf_rejected" }, { status: 403, headers });
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const raw = (await request
          .clone()
          .json()
          .catch(() => null)) as Record<string, unknown> | null;
        const isOnboarding =
          raw &&
          ["mesa_slug", "treatment_type", "treatment_custom", "general_community"].some(
            (key) => key in raw,
          );
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503, headers });
        if (isOnboarding) {
          const treatmentType = raw.treatment_type;
          const treatmentCustom = raw.treatment_custom;
          const generalCommunity = raw.general_community;
          const mesaSlug = raw.mesa_slug;
          const validTreatment =
            treatmentType === null ||
            treatmentType === "ele_dele" ||
            treatmentType === "ela_dela" ||
            treatmentType === "elu_delu" ||
            treatmentType === "use_name" ||
            treatmentType === "not_informed" ||
            treatmentType === "other";
          if (
            !validTreatment ||
            !(treatmentCustom === null || typeof treatmentCustom === "string") ||
            (typeof treatmentCustom === "string" && treatmentCustom.length > 120) ||
            typeof generalCommunity !== "boolean" ||
            !(mesaSlug === undefined || mesaSlug === null)
          ) {
            sql.close();
            return Response.json({ error: "invalid_onboarding" }, { status: 400, headers });
          }
          try {
            return Response.json(
              {
                onboarding: await saveOnboardingForUser(sql, auth.userId, {
                  mesa_slug: null,
                  treatment_type: treatmentType as Parameters<
                    typeof saveOnboardingForUser
                  >[2]["treatment_type"],
                  treatment_custom: treatmentCustom as string | null,
                  general_community: generalCommunity,
                }),
              },
              { headers },
            );
          } catch (error) {
            const message = error instanceof Error ? error.message : "invalid_onboarding";
            return Response.json({ error: message }, { status: 400, headers });
          } finally {
            sql.close();
          }
        }
        const input = await readInput(request);
        if (!input) {
          sql.close();
          return Response.json({ error: "invalid_profile" }, { status: 400, headers });
        }
        try {
          return Response.json(
            { profile: await upsertProfileForUser(sql, auth.userId, input) },
            { headers },
          );
        } finally {
          sql.close();
        }
      },
    },
  },
});
