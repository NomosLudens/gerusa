import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Images, Search, X } from "lucide-react";
import { RouteErrorBoundary } from "@/components/loading-states";

type GalleryImage = {
  path: string;
  name: string;
  category: string;
  bytes: number;
  contentType: string;
};

type GalleryResponse = { images?: GalleryImage[]; categories?: string[]; error?: string };

function galleryAssetUrl(path: string, attempt = 0): string {
  return `/api/gallery/file?path=${encodeURIComponent(path)}&attempt=${attempt}`;
}

function retryGalleryImage(event: { currentTarget: HTMLImageElement }, path: string): void {
  const image = event.currentTarget;
  const attempt = Number(image.dataset.galleryAttempt ?? "0");
  if (attempt >= 2) return;
  const nextAttempt = attempt + 1;
  image.dataset.galleryAttempt = String(nextAttempt);
  window.setTimeout(() => {
    image.src = galleryAssetUrl(path, nextAttempt);
  }, 300 * nextAttempt);
}

export const Route = createFileRoute("/_authenticated/galeria")({
  component: GalleryPage,
  errorComponent: RouteErrorBoundary,
});

function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState("TODAS");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<GalleryImage | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "empty" | "error">("loading");
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gallery", { credentials: "same-origin", cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json()) as GalleryResponse;
        if (!response.ok) throw new Error(payload.error ?? "gallery_unavailable");
        if (!cancelled) {
          const next = Array.isArray(payload.images) ? payload.images : [];
          setImages(next);
          setCategories(Array.isArray(payload.categories) ? payload.categories : []);
          setState(next.length ? "ready" : "empty");
        }
      })
      .catch(() => {
        if (!cancelled) setState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected && !dialog.open) dialog.showModal();
    if (!selected && dialog.open) dialog.close();
  }, [selected]);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    return images.filter((image) => {
      const matchesCategory = category === "TODAS" || image.category === category;
      const matchesQuery =
        !normalized || image.name.toLocaleLowerCase("pt-BR").includes(normalized);
      return matchesCategory && matchesQuery;
    });
  }, [category, images, query]);

  return (
    <div className="min-h-full overflow-y-auto bg-[#08080E] px-4 py-6 text-[#F3EBDD] sm:px-8 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[color:var(--gold)]">
              <Images className="h-4 w-4" /> Acervo real
            </div>
            <h1 className="font-serif text-4xl text-[#F3EBDD]">Galeria</h1>
            <p className="mt-2 max-w-2xl text-sm text-[#F3EBDD]/60">
              Imagens disponíveis no banco visual da campanha.
            </p>
          </div>
          {state === "ready" ? (
            <span className="text-xs text-[#F3EBDD]/50">
              {filtered.length} de {images.length}
            </span>
          ) : null}
        </header>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.025] p-3 sm:flex-row sm:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-[#F3EBDD]/45" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar imagem"
              aria-label="Buscar imagem"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#F3EBDD]/35"
            />
          </label>
          <div className="flex flex-wrap gap-2" aria-label="Categorias da galeria">
            {["TODAS", ...categories.filter((item) => item !== "TODAS")].map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${category === item ? "border-[color:var(--gold)]/70 bg-[color:var(--gold)]/15 text-[#F3EBDD]" : "border-white/10 text-[#F3EBDD]/55 hover:border-white/30"}`}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        {state === "loading" ? (
          <p className="py-12 text-center text-sm text-[#F3EBDD]/60">Carregando acervo…</p>
        ) : null}
        {state === "error" ? (
          <p className="rounded-2xl border border-red-300/20 bg-red-950/20 p-6 text-sm text-red-100">
            Galeria indisponível. O servidor não conseguiu ler o acervo real.
          </p>
        ) : null}
        {state === "empty" ? (
          <p className="rounded-2xl border border-white/10 p-6 text-sm text-[#F3EBDD]/60">
            Nenhuma imagem disponível no acervo.
          </p>
        ) : null}
        {state === "ready" && filtered.length === 0 ? (
          <p className="rounded-2xl border border-white/10 p-6 text-sm text-[#F3EBDD]/60">
            Nenhuma imagem corresponde ao filtro.
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filtered.map((image) => (
            <button
              key={image.path}
              type="button"
              onClick={() => setSelected(image)}
              className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025] text-left transition hover:-translate-y-0.5 hover:border-[color:var(--gold)]/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--gold)]"
            >
              <div className="aspect-[4/3] overflow-hidden bg-black/30">
                <img
                  src={galleryAssetUrl(image.path)}
                  onError={(event) => retryGalleryImage(event, image.path)}
                  alt={image.name}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
                />
              </div>
              <div className="p-3">
                <p className="truncate text-sm text-[#F3EBDD]">{image.name}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)]/75">
                  {image.category}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>

      <dialog
        ref={dialogRef}
        aria-label={selected?.name ?? "Imagem ampliada"}
        onCancel={() => setSelected(null)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelected(null);
        }}
        className="max-h-[92dvh] max-w-[94vw] overflow-hidden rounded-2xl border border-white/15 bg-[#0b0a10] p-0 text-[#F3EBDD] backdrop:bg-black/80"
      >
        {selected ? (
          <div className="relative flex max-h-[92dvh] flex-col">
            <button
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Fechar imagem"
              className="absolute right-3 top-3 z-10 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:bg-black/80"
            >
              <X className="h-4 w-4" />
            </button>
            <img
              src={galleryAssetUrl(selected.path)}
              onError={(event) => retryGalleryImage(event, selected.path)}
              alt={selected.name}
              className="max-h-[78dvh] max-w-[94vw] object-contain"
            />
            <div className="border-t border-white/10 px-4 py-3">
              <p className="text-sm">{selected.name}</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-[color:var(--gold)]/75">
                {selected.category}
              </p>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}
