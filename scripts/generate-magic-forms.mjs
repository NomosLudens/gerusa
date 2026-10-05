import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const source =
  process.env.KALLISTIS_MAGIC_SOURCE || "CANON/KALLISTIS_COSMOLOGIA_E_SISTEMA_DA_MAGIA_v1.7.md";
const output =
  process.env.KALLISTIS_MAGIC_OUTPUT || "public/jogar/kallistis-magic-forms.generated.js";
const markdown = await readFile(source, "utf8");
const matrix = markdown.match(/\| # \| Forma \| Truque \| G1 \| G2 \| G3 \|\n([\s\S]*?)\n\n/);
if (!matrix) throw new Error("canonical magic matrix not found");
const forms = matrix[1]
  .trim()
  .split("\n")
  .filter((line) => !/^\|\s*-+/.test(line))
  .map((line) => {
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== 6 || !/^\d+$/.test(cells[0]))
      throw new Error(`ambiguous canonical form row: ${line}`);
    const canonicalName = cells[1].replace(/^\*\*|\*\*$/g, "").trim();
    if (!canonicalName) throw new Error(`empty canonical form name: ${line}`);
    const id = canonicalName.toUpperCase();
    return {
      id,
      canonicalName,
      summary: cells[2],
      g0: cells[2],
      g1: cells[3],
      g2: cells[4],
      g3: cells[5],
    };
  });
const ids = new Set(forms.map((form) => form.id));
if (forms.length !== 76 || ids.size !== 76)
  throw new Error(`expected 76 unique forms, got ${forms.length}/${ids.size}`);
const sourceHash = createHash("sha256").update(markdown).digest("hex");
const payload = {
  ruleset: "KALLISTIS_2_0",
  sourceDocument: source,
  sourceHash,
  generated: true,
  forms,
};
await writeFile(output, `globalThis.KALLISTIS_MAGIC_FORMS = ${JSON.stringify(payload)};\n`, "utf8");
console.log(`generated ${forms.length} forms from ${source}`);
