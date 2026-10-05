import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { listGalleryImages, readGalleryAsset } from "./gallery";

describe("galeria filesystem", () => {
  it("lista somente imagens reais e deriva categorias", async () => {
    const root = await mkdtemp(join(tmpdir(), "kallistis-gallery-test-"));
    await mkdir(join(root, "NPCS"));
    await mkdir(join(root, "ACERVO_EXISTENTE_CURADO_50", "03_CRIATURAS"), { recursive: true });
    await writeFile(join(root, "NPCS", "01_GUARDIAO.png"), Buffer.from([1, 2, 3]));
    await writeFile(
      join(root, "ACERVO_EXISTENTE_CURADO_50", "03_CRIATURAS", "02_PATO.webp"),
      Buffer.from([4, 5]),
    );
    await writeFile(join(root, "NPCS", "README.md"), "not an image");

    const images = await listGalleryImages(root);
    expect(images).toHaveLength(2);
    expect(images.map((image) => image.category)).toEqual(["Criaturas", "NPCs"]);
    expect(images.every((image) => image.bytes > 0)).toBe(true);
  });

  it("recusa arquivo inexistente e traversal", async () => {
    const root = await mkdtemp(join(tmpdir(), "kallistis-gallery-test-"));
    await mkdir(join(root, "NPCS"));
    await writeFile(join(root, "NPCS", "01_GUARDIAO.png"), Buffer.from([1]));

    expect(await readGalleryAsset("NPCS/01_GUARDIAO.png", root)).not.toBeNull();
    expect(await readGalleryAsset("NPCS/ausente.png", root)).toBeNull();
    expect(await readGalleryAsset("../outside.png", root)).toBeNull();
    expect(await readGalleryAsset("/etc/passwd", root)).toBeNull();
  });
});
