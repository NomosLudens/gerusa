import { extname } from "node:path";
import { createRuntimeStorage } from "@/server/runtime/storage";

export const GALLERY_ROOT = process.env.KALLISTIS_GALLERY_ROOT?.trim() || "data/gallery";

const MIME_TYPES: Record<string, string> = {
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

const CATEGORY_LABELS: Record<string, string> = {
  NPCS: "NPCs",
  CENARIOS: "Cenários",
  OBJETOS: "Objetos",
  "01_OFICIOS_BW": "Ofícios",
  "02_GLIFOS_OFICIOS": "Glifos",
  "03_CRIATURAS": "Criaturas",
  "04_PEDRALMA_E_MUNDO": "Pedr'alma e mundo",
  "05_MAPAS": "Mapas",
  "06_CIDADES_E_ICONICOS": "Cidades e icônicos",
};

export type GalleryImage = {
  path: string;
  name: string;
  category: string;
  bytes: number;
  contentType: string;
};

export type GalleryAsset = {
  bytes: Uint8Array;
  contentType: string;
};

function isSupportedImage(path: string): boolean {
  return Object.hasOwn(MIME_TYPES, extname(path).toLowerCase());
}

function categoryFor(relativePath: string): string {
  const parts = relativePath.split(/[\\/]+/);
  const direct = parts.find((part) => CATEGORY_LABELS[part]);
  if (direct) return CATEGORY_LABELS[direct];
  return "Acervo";
}

function humanName(relativePath: string): string {
  const filename = relativePath.split(/[\\/]+/).pop() ?? relativePath;
  const stem = filename.replace(/\.[^.]+$/, "");
  const label = stem
    .replace(/^\d+_/, "")
    .replace(/_V\d+$/i, "")
    .replace(/_BW$/i, "")
    .replace(/_/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");
  return label ? label.charAt(0).toLocaleUpperCase("pt-BR") + label.slice(1) : filename;
}

function safeStorageKey(input: string): string | null {
  if (!input || input.includes("\0") || input.startsWith("/") || /^[A-Za-z]:[\\/]/.test(input)) {
    return null;
  }
  const normalized = input.replaceAll("\\", "/");
  if (!normalized || normalized.split("/").some((part) => part === ".." || part === "."))
    return null;
  return normalized;
}

export async function listGalleryImages(
  rootDirectory = GALLERY_ROOT,
): Promise<readonly GalleryImage[]> {
  const storage = createRuntimeStorage(rootDirectory);
  const images: GalleryImage[] = (await storage.list())
    .filter((item) => isSupportedImage(item.key))
    .map((item) => ({
      path: item.key,
      name: humanName(item.key),
      category: categoryFor(item.key),
      bytes: item.size,
      contentType: MIME_TYPES[extname(item.key).toLowerCase()] ?? "application/octet-stream",
    }));
  images.sort((left, right) => left.path.localeCompare(right.path, "pt-BR"));
  return images;
}

export async function readGalleryAsset(
  input: string,
  rootDirectory = GALLERY_ROOT,
): Promise<GalleryAsset | null> {
  const relativePath = safeStorageKey(input);
  if (!relativePath || !isSupportedImage(relativePath)) return null;
  const storage = createRuntimeStorage(rootDirectory);
  const object = await storage.get(relativePath);
  return object ? { bytes: object.bytes, contentType: object.contentType } : null;
}
