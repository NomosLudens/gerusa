import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createLocalChatRuntime } from "@/server/local-core/chat-runtime";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  linkExistingMesaToGravewright,
  MesaProvisionError,
  provisionMesaToGravewright,
} from "@/server/local-core/mesa-provision";
import type { Campaign } from "@/server/local-core/data-contracts";

const jsonHeaders = { "Cache-Control": "no-store" };
function gravewrightOrigin(): string {
  return process.env.KALLISTIS_GRAVEWRIGHT_ORIGIN?.trim().replace(/\/+$/, "") ?? "";
}

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  if (!origin || !gravewrightOrigin() || origin !== gravewrightOrigin()) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Cross-Origin-Resource-Policy": "same-site",
    Vary: "Origin",
  };
}

function jsonResponse(request: Request, body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(jsonHeaders);
  for (const [key, value] of Object.entries(corsHeaders(request))) headers.set(key, value);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  return Response.json(body, { ...init, headers });
}

function withCors(request: Request, response: Response): Response {
  const cors = corsHeaders(request);
  if (!Object.keys(cors).length) return response;
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(cors)) headers.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

const campaignInput = z
  .object({
    mesaId: z.string().uuid(),
    name: z.string().trim().min(1).max(120),
  })
  .strict();

function databaseUnavailable(request?: Request): Response {
  if (request)
    return jsonResponse(
      request,
      { error: "database_unavailable", reason: "O banco local está indisponível." },
      { status: 503 },
    );
  return Response.json(
    { error: "database_unavailable", reason: "O banco local está indisponível." },
    { status: 503, headers: jsonHeaders },
  );
}

function serializeCampaign(campaign: Campaign) {
  return {
    id: campaign.id,
    mesaId: campaign.mesaId,
    mesaName: campaign.mesaName,
    name: campaign.name,
    status: campaign.status,
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
  };
}

async function withChatRuntime(
  handler: (runtime: ReturnType<typeof createLocalChatRuntime>) => Promise<Response>,
  request?: Request,
): Promise<Response> {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) return databaseUnavailable(request);
  const runtime = createLocalChatRuntime(databaseUrl);
  try {
    return await handler(runtime);
  } finally {
    runtime.close();
  }
}

export const Route = createFileRoute("/api/chat/campaigns")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const scope = new URL(request.url).searchParams.get("scope");
        const auth = await requireUser(request);
        if ("error" in auth) return scope === "master" ? withCors(request, auth.error) : auth.error;
        return withChatRuntime(async (runtime) => {
          if (!runtime.campaigns) return databaseUnavailable(request);
          const isMasterSurface = scope === "master";
          const [campaigns, mesas] = await Promise.all([
            isMasterSurface
              ? runtime.campaigns.listMasterAuthorized(auth.userId)
              : Promise.resolve([]),
            isMasterSurface ? runtime.campaigns.listMasterMesas(auth.userId) : Promise.resolve([]),
          ]);
          return jsonResponse(request, {
            campaigns: campaigns.map(serializeCampaign),
            mesas: mesas.map((mesa) => ({
              id: mesa.id,
              slug: mesa.slug,
              name: mesa.name,
              memberRole: mesa.memberRole,
            })),
          });
        }, request);
      },
      OPTIONS: async ({ request }) => {
        const headers = corsHeaders(request);
        if (!headers["Access-Control-Allow-Origin"])
          return new Response(null, { status: 403, headers: jsonHeaders });
        return new Response(null, {
          status: 204,
          headers: {
            ...headers,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "content-type",
            "Access-Control-Max-Age": "300",
          },
        });
      },
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        const isGravewrightRequest =
          !!gravewrightOrigin() && request.headers.get("origin") === gravewrightOrigin();
        if (!isSameOriginRequest(request, expectedOrigin) && !isGravewrightRequest)
          return jsonResponse(request, { error: "csrf_rejected" }, { status: 403 });
        const auth = await requireUser(request);
        if ("error" in auth)
          return jsonResponse(request, { error: "unauthorized" }, { status: auth.error.status });
        const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
        if (body?.action === "link_gravewright_campaign") {
          const parsedLink = z
            .object({
              action: z.literal("link_gravewright_campaign"),
              mesaId: z.string().uuid(),
              campaignId: z.string().uuid(),
            })
            .strict()
            .safeParse(body);
          if (!parsedLink.success)
            return jsonResponse(request, { error: "invalid_gravewright_link" }, { status: 400 });
          return withChatRuntime(async (runtime) => {
            if (!runtime.campaigns) return databaseUnavailable(request);
            const mesas = await runtime.campaigns.listMasterMesas(auth.userId);
            const mesa = mesas.find(
              (item) => item.id === parsedLink.data.mesaId && item.memberRole === "mestre",
            );
            if (!mesa) return jsonResponse(request, { error: "mesa_forbidden" }, { status: 403 });
            const databaseUrl = getRuntimeDatabaseUrl();
            if (!databaseUrl) return databaseUnavailable(request);
            const sql = createBunPostgresExecutor(databaseUrl);
            try {
              const mapping = await linkExistingMesaToGravewright(
                sql,
                mesa.id,
                parsedLink.data.campaignId,
              );
              let provisioning: { status: "ready" | "pending"; result?: unknown; error?: string };
              try {
                const result = await provisionMesaToGravewright(sql, mesa.id);
                provisioning = { status: "ready", result };
              } catch (error) {
                provisioning = {
                  status: "pending",
                  error:
                    error instanceof MesaProvisionError
                      ? error.code
                      : "gravewright_provision_failed",
                };
              }
              return jsonResponse(
                request,
                { ok: true, mesa, mapping, provisioning },
                {
                  status: provisioning.status === "ready" ? 200 : 202,
                },
              );
            } catch (error) {
              const code =
                error instanceof MesaProvisionError ? error.code : "gravewright_link_failed";
              return jsonResponse(
                request,
                { error: code },
                {
                  status: ["vtt_mapping_conflict", "vtt_campaign_already_mapped"].includes(code)
                    ? 409
                    : 502,
                },
              );
            } finally {
              sql.close();
            }
          }, request);
        }
        if (!isSameOriginRequest(request, expectedOrigin))
          return jsonResponse(request, { error: "csrf_rejected" }, { status: 403 });
        const parsed = campaignInput.safeParse(body);
        if (!parsed.success)
          return jsonResponse(request, { error: "invalid_campaign" }, { status: 400 });
        return withChatRuntime(async (runtime) => {
          if (!runtime.campaigns) return databaseUnavailable(request);
          const campaign = await runtime.campaigns.create(
            auth.userId,
            parsed.data.mesaId,
            parsed.data.name,
          );
          if (!campaign)
            return jsonResponse(request, { error: "campaign_forbidden" }, { status: 403 });
          return jsonResponse(
            request,
            { campaign: serializeCampaign(campaign) },
            {
              status: 201,
            },
          );
        }, request);
      },
    },
  },
});
