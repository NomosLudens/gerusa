import { join } from "node:path";
import type { SqlExecutor } from "./postgres";
import { isSystemMaster } from "./player-access";

export type ContinuityMapMesa = {
  id: string;
  slug: string;
  name: string;
};

export type ContinuityMapRecord = {
  id: string;
  sessao_id: string | null;
  mesa_id: string;
  mesa_slug: string;
  mesa_name: string;
  session_title: string | null;
  tipo: "session" | "document";
  asset_key: string | null;
  titulo: string;
  conteudo_publico: string;
  published_at: string;
  updated_at: string;
};

export type ContinuityMapSidebarItem = {
  id: string;
  mesaName: string;
  title: string;
  publishedAt: string;
  href: string;
};

type ContinuityMapRow = ContinuityMapRecord;

export type ContinuityMapDocumentOption = {
  mesaId: string;
  mesaName: string;
  assetKey: string;
  title: string;
  mapId: string | null;
  publishedAt: string | null;
};

const UPLOADED_ASSET_KEY_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const CONTINUITY_MAP_UPLOAD_DIR = join(
  process.cwd(),
  "private/continuity-map-assets/uploads",
);

export const CONTINUITY_MAP_ASSETS = [
  {
    key: "intro-taverna-pandas-v5",
    title: "Prólogo · Antes da Sessão Zero",
    description: "Introdução pública sem spoilers do Mestre.",
  },
] as const;

const CONTINUITY_MAP_ASSET_PATHS: Record<string, string> = {
  "intro-taverna-pandas-v5": "private/continuity-map-assets/intro-taverna-pandas-v5.html",
};

const mapColumns = `
  cm.id,
  cm.sessao_id,
  cm.mesa_id,
  m.slug AS mesa_slug,
  m.name AS mesa_name,
  s.titulo AS session_title,
  cm.tipo,
  cm.asset_key,
  cm.titulo,
  cm.conteudo_publico,
  cm.published_at,
  cm.updated_at`;

function mapRow(row: ContinuityMapRow): ContinuityMapRecord {
  return {
    id: String(row.id),
    sessao_id: row.sessao_id == null ? null : String(row.sessao_id),
    mesa_id: String(row.mesa_id),
    mesa_slug: String(row.mesa_slug),
    mesa_name: String(row.mesa_name),
    session_title: row.session_title == null ? null : String(row.session_title),
    tipo: row.tipo === "document" ? "document" : "session",
    asset_key: row.asset_key == null ? null : String(row.asset_key),
    titulo: String(row.titulo),
    conteudo_publico: String(row.conteudo_publico),
    published_at: String(row.published_at),
    updated_at: String(row.updated_at),
  };
}

export async function listContinuityMapMesas(
  sql: SqlExecutor,
  userId: string,
): Promise<readonly ContinuityMapMesa[]> {
  const rows = await sql.query<ContinuityMapMesa>(
    `SELECT m.id, m.slug, m.name
       FROM public.mesas m
      WHERE EXISTS (
        SELECT 1 FROM public.system_roles sr
         WHERE sr.user_id = $1 AND sr.system_role = 'system_master'
      )
         OR EXISTS (
        SELECT 1 FROM public.mesa_members mm
         WHERE mm.mesa_id = m.id
           AND mm.user_id = $1
           AND mm.member_role = 'mestre'
           AND mm.membership_status = 'active'
      )
      ORDER BY m.name ASC, m.id ASC`,
    [userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
  }));
}

export async function listContinuityMapDocuments(
  sql: SqlExecutor,
  userId: string,
): Promise<readonly ContinuityMapDocumentOption[]> {
  const mesas = await listContinuityMapMesas(sql, userId);
  if (!mesas.length) return [];

  const rows = await sql.query<ContinuityMapRow>(
    `SELECT ${mapColumns}
       FROM public.camara_mapas_continuidade cm
       LEFT JOIN public.camara_sessoes s ON s.id = cm.sessao_id
       JOIN public.mesas m ON m.id = cm.mesa_id
      WHERE cm.tipo = 'document'
        AND cm.asset_key IS NOT NULL
        AND (
          EXISTS (
            SELECT 1 FROM public.system_roles sr
             WHERE sr.user_id = $1 AND sr.system_role = 'system_master'
          )
             OR EXISTS (
            SELECT 1 FROM public.mesa_members mm
             WHERE mm.mesa_id = cm.mesa_id
               AND mm.user_id = $1
               AND mm.member_role = 'mestre'
               AND mm.membership_status = 'active'
          )
        )`,
    [userId],
  );
  const published = new Map(
    rows
      .filter((row) => row.asset_key)
      .map((row) => [`${row.mesa_id}:${row.asset_key}`, row] as const),
  );

  const curated = mesas.flatMap((mesa) =>
    CONTINUITY_MAP_ASSETS.map((asset) => {
      const row = published.get(`${mesa.id}:${asset.key}`);
      return {
        mesaId: mesa.id,
        mesaName: mesa.name,
        assetKey: asset.key,
        title: asset.title,
        mapId: row ? String(row.id) : null,
        publishedAt: row?.published_at == null ? null : String(row.published_at),
      };
    }),
  );
  const curatedKeys = new Set<string>(CONTINUITY_MAP_ASSETS.map((asset) => asset.key));
  const uploaded = rows
    .filter((row) => row.asset_key && !curatedKeys.has(String(row.asset_key)))
    .map((row) => ({
      mesaId: String(row.mesa_id),
      mesaName: String(row.mesa_name),
      assetKey: String(row.asset_key),
      title: String(row.titulo),
      mapId: String(row.id),
      publishedAt: row.published_at == null ? null : String(row.published_at),
    }));
  return [...curated, ...uploaded];
}

export async function listContinuityMapsForSession(
  sql: SqlExecutor,
  userId: string,
  sessionId: string,
): Promise<readonly ContinuityMapRecord[]> {
  const rows = await sql.query<ContinuityMapRow>(
    `SELECT ${mapColumns}
       FROM public.camara_mapas_continuidade cm
       JOIN public.camara_sessoes s ON s.id = cm.sessao_id
       JOIN public.mesas m ON m.id = cm.mesa_id
      WHERE cm.sessao_id = $1 AND s.user_id = $2
      ORDER BY m.name ASC, cm.updated_at DESC, cm.id ASC`,
    [sessionId, userId],
  );
  return rows.map(mapRow);
}

export async function upsertContinuityMap(
  sql: SqlExecutor,
  userId: string,
  input: { sessionId: string; mesaId: string; title: string; publicContent: string },
): Promise<ContinuityMapRecord> {
  const rows = await sql.query<ContinuityMapRow>(
    `INSERT INTO public.camara_mapas_continuidade
       (sessao_id, mesa_id, titulo, conteudo_publico, published_by)
     SELECT $2, $3, $4, $5, $1
      WHERE EXISTS (
        SELECT 1 FROM public.camara_sessoes s
         WHERE s.id = $2 AND s.user_id = $1
      )
      ON CONFLICT (sessao_id, mesa_id) WHERE sessao_id IS NOT NULL DO UPDATE SET
        titulo = EXCLUDED.titulo,
        conteudo_publico = EXCLUDED.conteudo_publico,
        published_by = EXCLUDED.published_by,
        published_at = now(),
        updated_at = now()
      RETURNING id, sessao_id, mesa_id, titulo, conteudo_publico, published_at, updated_at`,
    [userId, input.sessionId, input.mesaId, input.title, input.publicContent],
  );
  const row = rows[0];
  if (!row) throw new Error("camara_continuity_map_not_persisted");

  const complete = await sql.query<ContinuityMapRow>(
    `SELECT ${mapColumns}
       FROM public.camara_mapas_continuidade cm
       LEFT JOIN public.camara_sessoes s ON s.id = cm.sessao_id
       JOIN public.mesas m ON m.id = cm.mesa_id
      WHERE cm.id = $1 AND s.user_id = $2
      LIMIT 1`,
    [row.id, userId],
  );
  if (!complete[0]) throw new Error("camara_continuity_map_not_loaded");
  return mapRow(complete[0]);
}

export async function upsertContinuityMapDocument(
  sql: SqlExecutor,
  userId: string,
  input: { mesaId: string; assetKey: string },
): Promise<ContinuityMapRecord> {
  const asset = CONTINUITY_MAP_ASSETS.find((candidate) => candidate.key === input.assetKey);
  if (!asset) throw new Error("camara_continuity_map_asset_not_found");

  const rows = await sql.query<{ id: string }>(
    `INSERT INTO public.camara_mapas_continuidade
       (sessao_id, mesa_id, titulo, conteudo_publico, published_by, tipo, asset_key)
     SELECT NULL, $2, $3, $4, $1, 'document', $5
      WHERE EXISTS (
        SELECT 1 FROM public.mesas m
         WHERE m.id = $2
      )
        AND (
          EXISTS (
            SELECT 1 FROM public.system_roles sr
             WHERE sr.user_id = $1 AND sr.system_role = 'system_master'
          )
             OR EXISTS (
            SELECT 1 FROM public.mesa_members mm
             WHERE mm.mesa_id = $2
               AND mm.user_id = $1
               AND mm.member_role = 'mestre'
               AND mm.membership_status = 'active'
          )
        )
      ON CONFLICT (mesa_id, asset_key) WHERE sessao_id IS NULL AND asset_key IS NOT NULL DO UPDATE SET
        titulo = EXCLUDED.titulo,
        conteudo_publico = EXCLUDED.conteudo_publico,
        published_by = EXCLUDED.published_by,
        published_at = now(),
        updated_at = now()
      RETURNING id`,
    [userId, input.mesaId, asset.title, asset.description, input.assetKey],
  );
  const row = rows[0];
  if (!row) throw new Error("camara_continuity_document_not_persisted");
  const complete = await getPublishedContinuityMap(sql, userId, String(row.id));
  if (!complete) throw new Error("camara_continuity_document_not_loaded");
  return complete;
}

export async function createUploadedContinuityMapDocument(
  sql: SqlExecutor,
  userId: string,
  input: { mesaId: string; assetKey: string; title: string },
): Promise<ContinuityMapRecord> {
  if (!UPLOADED_ASSET_KEY_PATTERN.test(input.assetKey)) {
    throw new Error("camara_continuity_uploaded_asset_key_invalid");
  }
  const title = input.title.trim();
  if (!title || title.length > 160) throw new Error("camara_continuity_document_title_invalid");

  const rows = await sql.query<{ id: string }>(
    `INSERT INTO public.camara_mapas_continuidade
       (sessao_id, mesa_id, titulo, conteudo_publico, published_by, tipo, asset_key)
     SELECT NULL, $2, $3, 'HTML enviado pelo Mestre.', $1, 'document', $4
      WHERE EXISTS (
        SELECT 1 FROM public.mesas m
         WHERE m.id = $2
      )
        AND (
          EXISTS (
            SELECT 1 FROM public.system_roles sr
             WHERE sr.user_id = $1 AND sr.system_role = 'system_master'
          )
             OR EXISTS (
            SELECT 1 FROM public.mesa_members mm
             WHERE mm.mesa_id = $2
               AND mm.user_id = $1
               AND mm.member_role = 'mestre'
               AND mm.membership_status = 'active'
          )
        )
      ON CONFLICT (mesa_id, asset_key) WHERE sessao_id IS NULL AND asset_key IS NOT NULL DO UPDATE SET
        titulo = EXCLUDED.titulo,
        conteudo_publico = EXCLUDED.conteudo_publico,
        published_by = EXCLUDED.published_by,
        published_at = now(),
        updated_at = now()
      RETURNING id`,
    [userId, input.mesaId, title, input.assetKey],
  );
  const row = rows[0];
  if (!row) throw new Error("camara_continuity_document_not_persisted");
  const complete = await getPublishedContinuityMap(sql, userId, String(row.id));
  if (!complete) throw new Error("camara_continuity_document_not_loaded");
  return complete;
}

export async function deleteContinuityMap(
  sql: SqlExecutor,
  userId: string,
  mapId: string,
): Promise<void> {
  const rows = await sql.query<{ id: string }>(
    `DELETE FROM public.camara_mapas_continuidade cm
     WHERE cm.id = $1
       AND (
         EXISTS (
           SELECT 1 FROM public.system_roles sr
            WHERE sr.user_id = $2 AND sr.system_role = 'system_master'
         )
            OR EXISTS (
           SELECT 1 FROM public.camara_sessoes s
            WHERE s.id = cm.sessao_id AND s.user_id = $2
         )
            OR EXISTS (
           SELECT 1 FROM public.mesa_members mm
            WHERE cm.sessao_id IS NULL
              AND mm.mesa_id = cm.mesa_id
              AND mm.user_id = $2
              AND mm.member_role = 'mestre'
              AND mm.membership_status = 'active'
         )
       )
     RETURNING cm.id`,
    [mapId, userId],
  );
  if (!rows[0]) throw new Error("camara_continuity_map_not_found");
}

export async function listPublishedContinuityMaps(
  sql: SqlExecutor,
  userId: string,
): Promise<readonly ContinuityMapSidebarItem[]> {
  const rows = await sql.query<ContinuityMapRow>(
    `SELECT ${mapColumns}
       FROM public.camara_mapas_continuidade cm
       LEFT JOIN public.camara_sessoes s ON s.id = cm.sessao_id
       JOIN public.mesas m ON m.id = cm.mesa_id
      WHERE EXISTS (
        SELECT 1 FROM public.system_roles sr
         WHERE sr.user_id = $1 AND sr.system_role = 'system_master'
      )
         OR EXISTS (
        SELECT 1 FROM public.mesa_members mm
         WHERE mm.mesa_id = cm.mesa_id
           AND mm.user_id = $1
           AND mm.membership_status = 'active'
      )
      ORDER BY m.name ASC, cm.published_at DESC, cm.id ASC`,
    [userId],
  );
  return rows.map((row) => ({
    id: String(row.id),
    mesaName: String(row.mesa_name),
    title: String(row.titulo),
    publishedAt: String(row.published_at),
    href: `/api/continuity-maps/${encodeURIComponent(String(row.id))}`,
  }));
}

export async function getPublishedContinuityMap(
  sql: SqlExecutor,
  userId: string,
  mapId: string,
): Promise<ContinuityMapRecord | null> {
  const rows = await sql.query<ContinuityMapRow>(
    `SELECT ${mapColumns}
       FROM public.camara_mapas_continuidade cm
       LEFT JOIN public.camara_sessoes s ON s.id = cm.sessao_id
       JOIN public.mesas m ON m.id = cm.mesa_id
      WHERE cm.id = $1
        AND (
          EXISTS (
            SELECT 1 FROM public.system_roles sr
             WHERE sr.user_id = $2 AND sr.system_role = 'system_master'
          )
             OR EXISTS (
            SELECT 1 FROM public.mesa_members mm
             WHERE mm.mesa_id = cm.mesa_id
               AND mm.user_id = $2
               AND mm.membership_status = 'active'
          )
        )
      LIMIT 1`,
    [mapId, userId],
  );
  return rows[0] ? mapRow(rows[0]) : null;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character] ?? character;
  });
}

export function renderContinuityMapHtml(map: ContinuityMapRecord): string {
  const title = escapeHtml(map.titulo);
  const mesaName = escapeHtml(map.mesa_name);
  const content = escapeHtml(map.conteudo_publico).replace(/\r?\n/g, "<br />");
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#0c0a08" />
    <meta name="referrer" content="same-origin" />
    <title>Mapa da Continuidade — ${title}</title>
    <style>
      :root { color-scheme: dark; background: #0c0a08; color: #ece3d4; }
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; background: #0c0a08; color: #ece3d4; font-family: Inter, system-ui, -apple-system, sans-serif; }
      main { width: min(720px, 100%); margin: 0 auto; padding: 48px 22px 72px; }
      .eyebrow { margin: 0 0 10px; color: #ff4400; font-size: .72rem; letter-spacing: .2em; text-transform: uppercase; }
      h1 { margin: 0; color: #f4ede2; font: 500 2rem Georgia, serif; line-height: 1.15; }
      .meta { margin: 12px 0 28px; color: #b6a88f; font-size: .86rem; }
      article { border: 1px solid rgba(255,68,0,.28); border-radius: 18px; background: rgba(40,32,23,.55); padding: 24px; font-size: 1.05rem; line-height: 1.7; white-space: normal; overflow-wrap: anywhere; }
      footer { margin-top: 24px; color: #847661; font-size: .78rem; line-height: 1.5; }
    </style>
  </head>
  <body>
    <main>
      <p class="eyebrow">Mapa da Continuidade</p>
      <h1>${title}</h1>
      <p class="meta">${mesaName}</p>
      <article>${content}</article>
      <footer>Versão compartilhada pelo Mestre. Este mapa contém somente o conteúdo público desta sessão.</footer>
    </main>
  </body>
</html>`;
}

export function continuityMapAssetPath(map: ContinuityMapRecord): string | null {
  const relativePath = map.asset_key ? CONTINUITY_MAP_ASSET_PATHS[map.asset_key] : undefined;
  if (relativePath) return join(process.cwd(), relativePath);
  if (map.asset_key && UPLOADED_ASSET_KEY_PATTERN.test(map.asset_key)) {
    return join(CONTINUITY_MAP_UPLOAD_DIR, `${map.asset_key}.html`);
  }
  return null;
}

export async function canPublishContinuityMap(sql: SqlExecutor, userId: string, mesaId?: string) {
  if (await isSystemMaster(sql, userId)) return true;
  if (mesaId) {
    const rows = await sql.query(
      `SELECT 1 FROM public.mesa_members
        WHERE mesa_id = $2
          AND user_id = $1
          AND member_role = 'mestre'
          AND membership_status = 'active'
        LIMIT 1`,
      [userId, mesaId],
    );
    return rows.length > 0;
  }
  const rows = await sql.query(
    `SELECT 1 FROM public.mesa_members
      WHERE user_id = $1
        AND member_role = 'mestre'
        AND membership_status = 'active'
      LIMIT 1`,
    [userId],
  );
  return rows.length > 0;
}
