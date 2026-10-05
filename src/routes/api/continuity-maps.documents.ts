import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { randomUUID } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  canPublishContinuityMap,
  createUploadedContinuityMapDocument,
} from "@/server/local-core/continuity-maps";
import { createRuntimeStorage } from "@/server/runtime/storage";

const MAX_DOCUMENT_BYTES = 2 * 1024 * 1024;
const HTML_EXTENSION = /\.html?$/i;
const FORBIDDEN_HTML = [
  /<\s*script\b/i,
  /<\s*iframe\b/i,
  /<\s*(?:object|embed|base|link)\b/i,
  /\bon[a-z][\w:-]*\s*=/i,
  /javascript\s*:/i,
  /\b(?:src|href|action|poster)\s*=\s*["'](?:https?:|\/\/)/i,
  /\burl\s*\(\s*["']?(?:https?:|\/\/)/i,
  /\b(?:fetch|XMLHttpRequest|WebSocket)\s*\(/i,
];

function responseForError(error: unknown) {
  const code = error instanceof Error ? error.message : "continuity_document_upload_failed";
  const status =
    code === "csrf_rejected" || code === "camara_continuity_map_forbidden"
      ? 403
      : code === "camara_continuity_document_invalid" ||
          code === "camara_continuity_document_too_large" ||
          code === "camara_continuity_document_not_self_contained"
        ? 400
        : 500;
  return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/continuity-maps/documents")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin)) {
          return responseForError(new Error("csrf_rejected"));
        }
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;

        const form = await request.formData();
        const mesaId = form.get("mesa_id");
        const file = form.get("file");
        if (typeof mesaId !== "string" || !mesaId.trim() || !(file instanceof File)) {
          return responseForError(new Error("camara_continuity_document_invalid"));
        }
        if (!HTML_EXTENSION.test(file.name) || file.size < 1) {
          return responseForError(new Error("camara_continuity_document_invalid"));
        }
        if (file.size > MAX_DOCUMENT_BYTES) {
          return responseForError(new Error("camara_continuity_document_too_large"));
        }

        const html = await file.text();
        if (!html.trim() || FORBIDDEN_HTML.some((pattern) => pattern.test(html))) {
          return responseForError(new Error("camara_continuity_document_not_self_contained"));
        }

        const databaseUrl = getRuntimeDatabaseUrl();
        if (!databaseUrl) return Response.json({ error: "database_unavailable" }, { status: 503 });
        const sql = createBunPostgresExecutor(databaseUrl);
        const assetKey = randomUUID();
        const title =
          file.name
            .replace(/\.(?:html?|HTML?)$/, "")
            .replace(/[_-]+/g, " ")
            .trim()
            .slice(0, 160) || "Documento da Continuidade";
        let fileCreated = false;
        const storage = createRuntimeStorage();
        const storageKey = `private/continuity-map-assets/uploads/${assetKey}.html`;
        try {
          if (!(await canPublishContinuityMap(sql, auth.userId, mesaId.trim()))) {
            return responseForError(new Error("camara_continuity_map_forbidden"));
          }
          await storage.put(storageKey, html.replace(/\r\n/g, "\n"), "text/html; charset=utf-8");
          fileCreated = true;
          const document = await createUploadedContinuityMapDocument(sql, auth.userId, {
            mesaId: mesaId.trim(),
            assetKey,
            title,
          });
          return Response.json(
            { document },
            { status: 201, headers: { "Cache-Control": "no-store" } },
          );
        } catch (error) {
          if (fileCreated) await storage.delete(storageKey).catch(() => undefined);
          return responseForError(error);
        } finally {
          sql.close();
        }
      },
    },
  },
});
