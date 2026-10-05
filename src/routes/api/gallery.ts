import { createFileRoute } from "@tanstack/react-router";
import { requireUser } from "@/lib/require-user.server";
import { listGalleryImages } from "@/server/local-core/gallery";

const headers = { "Cache-Control": "no-store" };

export const Route = createFileRoute("/api/gallery")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireUser(request);
        if ("error" in auth) return auth.error;
        try {
          const images = await listGalleryImages();
          const categories = [...new Set(images.map((image) => image.category))];
          return Response.json({ images, categories }, { headers });
        } catch (error) {
          console.error("gallery_list_failed", error);
          return Response.json({ error: "gallery_unavailable" }, { status: 503, headers });
        }
      },
    },
  },
});
