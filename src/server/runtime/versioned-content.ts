const canonFiles = import.meta.glob("../../../CANON/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const staticHtmlFiles = import.meta.glob("../../../private/continuity-map-assets/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

const masterSurfaceFiles = import.meta.glob("../master-surfaces/html/*.html", {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

export const BUNDLED_CANONICAL_ROOT = "bundled:CANON";

function basename(path: string): string {
  return path.split("/").pop() ?? path;
}

function bundledText(files: Record<string, string>, name: string): string | undefined {
  const entry = Object.entries(files).find(([path]) => basename(path) === name);
  return entry?.[1];
}

export function readBundledCanonFile(name: string): string {
  const text = bundledText(canonFiles, name);
  if (text === undefined) throw new Error(`Arquivo canônico não empacotado: ${name}`);
  return text;
}

export function readBundledContinuityMapAsset(assetKey: string): string | undefined {
  return bundledText(staticHtmlFiles, `${assetKey}.html`);
}

export function readBundledMasterSurface(file: string): string | undefined {
  return bundledText(masterSurfaceFiles, file);
}
