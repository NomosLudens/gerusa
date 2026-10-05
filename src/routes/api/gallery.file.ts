import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { readGalleryAsset } from "@/server/local-core/gallery";

export const Route = createFileRoute("/api/gallery/file")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        const path = new URL(request.url).searchParams.get("path");
        if (!path) return new Response("Not found", { status: 404 });
        const asset = await readGalleryAsset(path);
        if (!asset) return new Response("Not found", { status: 404 });
        const body = new Uint8Array(asset.bytes.byteLength);
        body.set(asset.bytes);
        return new Response(body.buffer, {
          headers: {
            "Cache-Control": "private, max-age=3600",
            "Content-Type": asset.contentType,
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
