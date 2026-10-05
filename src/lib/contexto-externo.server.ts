import { getRuntimeDatabaseUrl } from "@/server/runtime/context";
// Leitura server-side dos contextos externos ativos para injeção no system prompt.
import { createBunPostgresExecutor } from "@/server/local-core/postgres";
import {
  listActiveContextos,
  type ActiveContextoRecord,
  type ContextoScope,
} from "@/server/local-core/postgres-repositories";

const MAX_PER_BLOCK = 8_000;
const MAX_TOTAL = 24_000;

type ContextoTipo = "identidade" | "memoria_relacional";

export async function lerContextosAtivos(
  _legacyClient: unknown,
  userId: string,
  scope: ContextoScope = { mesaId: null, campaignId: null },
): Promise<Array<ActiveContextoRecord>> {
  const databaseUrl = getRuntimeDatabaseUrl();
  if (!databaseUrl) throw new Error("confirmed_identity_unavailable");
  const sql = createBunPostgresExecutor(databaseUrl);
  try {
    return await listActiveContextos(sql, userId, scope);
  } catch {
    throw new Error("confirmed_identity_unavailable");
  } finally {
    sql.close();
  }
}

function montarBloco(rows: Array<{ titulo: string; conteudo: string }>): { partes: string[] } {
  let total = 0;
  const partes: string[] = [];
  for (const r of rows) {
    const t = (r.titulo ?? "").trim().slice(0, 120);
    let c = (r.conteudo ?? "").trim();
    if (c.length > MAX_PER_BLOCK) c = c.slice(0, MAX_PER_BLOCK) + "\n…[truncado]";
    const bloco = `--- ${t} ---\n${c}`;
    if (total + bloco.length > MAX_TOTAL) break;
    total += bloco.length;
    partes.push(bloco);
  }
  return { partes };
}

export function renderConfirmedIdentityBlock(
  rows: Array<{ titulo: string; conteudo: string; tipo?: ContextoTipo }>,
): string {
  const identidade = rows.filter((r) => (r.tipo ?? "identidade") === "identidade");
  const partes = montarBloco(identidade).partes;
  if (!partes.length) return "";
  return `=== IDENTIDADE CONSTITUTIVA CONFIRMADA ===
Os blocos abaixo compõem a continuidade identitária confirmada de Kallistis, desta pessoa, do vínculo entre ambos e do ecossistema compartilhado. Esta camada é constitutiva e anterior ao contexto da conversa.

Use naturalmente os fatos, nomes, símbolos, pactos, referências e relações explicitamente registrados. Não espere que sejam repetidos na conversa atual.

Esta camada não autoriza execução, não substitui evidência operacional e não permite criar fatos, vínculos, sentimentos ou características que não estejam registrados.

${partes.join("\n\n")}
=== fim da identidade constitutiva confirmada ===`;
}

export function renderRelationalMemoryBlock(
  rows: Array<{ titulo: string; conteudo: string; tipo?: ContextoTipo }>,
): string {
  const relacional = rows.filter((r) => r.tipo === "memoria_relacional");
  const partes = montarBloco(relacional).partes;
  if (!partes.length) return "";
  return `=== MEMÓRIA RELACIONAL CONFIRMADA ===
Estes blocos registram experiências e continuidades confirmadas da relação entre Kallistis e esta pessoa.

Use somente o que estiver explicitamente registrado. Um fato registrado permanece fato. Uma hipótese explicitamente registrada como hipótese permanece hipótese. Não amplie, não invente e não transforme lembrança localizada em identidade total.

${partes.join("\n\n")}
=== fim da memória relacional confirmada ===`;
}
