import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { isSameOriginRequest } from "@/server/local-core/csrf";
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  getProfileAvatarForUser,
  removeProfileAvatarForUser,
  saveProfileAvatarForUser,
  type ProfileAvatarRecord,
} from "@/server/local-core/postgres-repositories";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;
const headers = { "Cache-Control": "private, max-age=300" };

function runtime() {
  const url = getRuntimeDatabaseUrl();
  return url ? createBunPostgresExecutor(url) : null;
}

function detectImageMime(bytes: Uint8Array): ProfileAvatarRecord["mime_type"] | null {
  if (
    bytes.length >= 8 &&
    [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => bytes[i] === v)
  ) {
    return "image/png";
  }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

function responseForError(error: unknown) {
  const code = error instanceof Error ? error.message : "profile_avatar_failed";
  const status =
    code === "csrf_rejected"
      ? 403
      : code === "avatar_too_large" || code === "avatar_invalid"
        ? 400
        : 500;
  return Response.json({ error: code }, { status, headers: { "Cache-Control": "no-store" } });
}

export const Route = createFileRoute("/api/profile/avatar")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const requestedUserId = new URL(request.url).searchParams.get("user_id")?.trim();
        const targetUserId = requestedUserId || auth.userId;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503 });
        try {
          const avatar = await getProfileAvatarForUser(sql, targetUserId);
          if (!avatar)
            return new Response(null, { status: 404, headers: { "Cache-Control": "no-store" } });
          if (new URL(request.url).searchParams.get("format") === "data-url") {
            const dataUrl = `data:${avatar.mime_type};base64,${Buffer.from(avatar.data).toString("base64")}`;
            return Response.json({ data_url: dataUrl }, { headers });
          }
          const body = new Blob([avatar.data.slice().buffer as ArrayBuffer], {
            type: avatar.mime_type,
          });
          return new Response(body, {
            status: 200,
            headers: {
              ...headers,
              "Content-Type": avatar.mime_type,
              "X-Content-Type-Options": "nosniff",
            },
          });
        } finally {
          sql.close();
        }
      },
      PUT: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return responseForError(new Error("csrf_rejected"));
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const form = await request.formData();
        const file = form.get("avatar");
        if (!(file instanceof File)) {
          console.warn("profile_avatar_invalid_file", { kind: typeof file });
          return responseForError(new Error("avatar_invalid"));
        }
        if (file.size < 1 || file.size > MAX_AVATAR_BYTES)
          return responseForError(new Error("avatar_too_large"));
        const data = new Uint8Array(await file.arrayBuffer());
        const mimeType = detectImageMime(data);
        if (!mimeType) {
          console.warn("profile_avatar_invalid_signature", {
            declaredType: file.type || null,
            size: file.size,
            head: Array.from(data.slice(0, 12)),
          });
          return responseForError(new Error("avatar_invalid"));
        }
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503 });
        try {
          const profile = await saveProfileAvatarForUser(sql, auth.userId, {
            data,
            mime_type: mimeType,
            size: data.byteLength,
          });
          return Response.json({ profile }, { headers: { "Cache-Control": "no-store" } });
        } catch (error) {
          return responseForError(error);
        } finally {
          sql.close();
        }
      },
      DELETE: async ({ request }) => {
        const expectedOrigin = process.env.KALLISTIS_PUBLIC_ORIGIN || "https://kallistis.app";
        if (!isSameOriginRequest(request, expectedOrigin))
          return responseForError(new Error("csrf_rejected"));
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const sql = runtime();
        if (!sql) return Response.json({ error: "database_unavailable" }, { status: 503 });
        try {
          await removeProfileAvatarForUser(sql, auth.userId);
          return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
        } finally {
          sql.close();
        }
      },
    },
  },
});
