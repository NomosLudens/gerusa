/**
 * Adapter Node.js para produção no Replit.
 *
 * O build do TanStack Start gera `dist/server/server.js` no formato
 * Cloudflare Workers ({ fetch(request, env, ctx) }). Este adapter cria
 * um servidor HTTP Node.js compatível, injetando as variáveis de ambiente
 * como `env` e fazendo o bind dos assets estáticos.
 *
 * Uso: node dist/server/serve.mjs (ou via `bun run start`)
 *
 * Secrets necessários no Replit (via painel Replit Secrets):
 *   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENROUTER_API_KEY
 *   (demais opcionais conforme .env.example)
 */

import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || "3000", 10);
const ASSETS_DIR = path.join(__dirname, "dist", "client");
const CLIENT_INDEX = path.join(ASSETS_DIR, "index.html");

// Mapeamento de extensões para Content-Type
const MIME_TYPES = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".txt": "text/plain",
  ".mjs": "application/javascript",
  ".mp3": "audio/mpeg",
};

async function serveStatic(urlPath, requestHeaders = {}) {
  // Normaliza e previne path traversal
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const safePath = path.normalize(decodedPath).replace(/^[/\\]+/, "");
  const filePath = path.join(ASSETS_DIR, safePath);

  // Garante que está dentro de ASSETS_DIR
  if (!filePath.startsWith(ASSETS_DIR + path.sep)) {
    return null;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) return null;

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";
    const cacheControl = ext === ".html" ? "no-cache" : "public, max-age=31536000, immutable";

    const baseHeaders = {
      "content-type": contentType,
      "cache-control": cacheControl,
      "accept-ranges": "bytes",
    };

    const range = requestHeaders.range || requestHeaders.Range || null;

    if (range) {
      const match = /^bytes=(\d+)-(\d*)$/.exec(String(range));

      if (!match) {
        return new Response(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            "content-range": `bytes */${stat.size}`,
          },
        });
      }

      const start = Number(match[1]);
      const requestedEnd = match[2] === "" ? stat.size - 1 : Number(match[2]);
      const end = Math.min(requestedEnd, stat.size - 1);

      if (
        !Number.isSafeInteger(start) ||
        !Number.isSafeInteger(end) ||
        start < 0 ||
        start >= stat.size ||
        end < start
      ) {
        return new Response(null, {
          status: 416,
          headers: {
            ...baseHeaders,
            "content-range": `bytes */${stat.size}`,
          },
        });
      }

      const length = end - start + 1;
      const handle = await fs.open(filePath, "r");

      try {
        const buffer = Buffer.allocUnsafe(length);
        const { bytesRead } = await handle.read(buffer, 0, length, start);

        return new Response(buffer.subarray(0, bytesRead), {
          status: 206,
          headers: {
            ...baseHeaders,
            "content-length": String(bytesRead),
            "content-range": `bytes ${start}-${start + bytesRead - 1}/${stat.size}`,
          },
        });
      } finally {
        await handle.close();
      }
    }

    const content = await fs.readFile(filePath);

    return new Response(content, {
      status: 200,
      headers: {
        ...baseHeaders,
        "content-length": String(stat.size),
      },
    });
  } catch {
    return null;
  }
}

async function serveIndex() {
  try {
    const content = await fs.readFile(CLIENT_INDEX, "utf-8");
    // Injeta variáveis VITE_ do ambiente diretamente no HTML (apenas para Replit)
    const html = content.replace(/<script([^>]*)><\/script>/, (match, attrs) => {
      const viteScript = `
          <script>
            window.ENV = ${JSON.stringify({
              VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL || "",
              VITE_SUPABASE_PUBLISHABLE_KEY: process.env.VITE_SUPABASE_PUBLISHABLE_KEY || "",
            })};
          </script>`;
      return viteScript + match;
    });
    return new Response(html, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}

async function main() {
  let serverHandler;

  try {
    const serverModule = await import(path.join(__dirname, "dist", "server", "server.js"));
    serverHandler = serverModule.default || serverModule;
  } catch (err) {
    console.error("Falha ao carregar server.js:", err);
    process.exit(1);
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const method = req.method;

    // Constrói Request object compatível com Workers
    const body =
      method === "GET" || method === "HEAD"
        ? null
        : await new Promise((resolve) => {
            const chunks = [];
            req.on("data", (chunk) => chunks.push(chunk));
            req.on("end", () => resolve(Buffer.concat(chunks)));
          });

    const workerRequest = new Request(url.toString(), {
      method,
      headers: req.headers,
      body,
    });

    const env = { ...process.env };
    const ctx = {
      waitUntil(promise) {
        void promise;
      },
    };

    try {
      const response = await serverHandler.fetch(workerRequest, env, ctx);

      // Roteia: se o Workers handler retornou HTML/SSR, serve. Se não,
      // tenta asset estático. Se nada, serve index.html (SPA fallback).
      if (response.status !== 404) {
        res.writeHead(response.status, Object.fromEntries(response.headers));
        const contentType = response.headers.get("content-type") || "";
        const isTextResponse =
          contentType.startsWith("text/") || /(?:json|javascript|xml|svg)/i.test(contentType);
        if (isTextResponse) {
          res.end(await response.text());
        } else {
          res.end(new Uint8Array(await response.arrayBuffer()));
        }
        return;
      }

      // Tenta arquivo estático
      const staticRes = await serveStatic(url.pathname, req.headers);
      if (staticRes) {
        res.writeHead(staticRes.status, Object.fromEntries(staticRes.headers));
        const data = new Uint8Array(await staticRes.arrayBuffer());
        res.end(data);
        return;
      }

      // GERUSA Gate 01 exposes only the root shell. Do not turn retired
      // KALLISTIS routes or API paths into a successful HTML fallback.
      if (url.pathname !== "/") {
        res.writeHead(404, { "content-type": "text/plain; charset=utf-8" });
        res.end("Not found");
        return;
      }

      // SPA fallback
      const indexRes = await serveIndex();
      res.writeHead(indexRes.status, Object.fromEntries(indexRes.headers));
      const text = await indexRes.text();
      res.end(text);
    } catch (err) {
      console.error("Erro no handler:", err);
      res.writeHead(500, { "content-type": "text/plain" });
      res.end("Internal Server Error");
    }
  });

  server.listen(PORT, () => {
    console.log(`🚀 Servidor rodando em http://0.0.0.0:${PORT}`);
    console.log(`   Porta: ${PORT}`);
    console.log(`   Ambiente: ${process.env.APP_ENV || "production"}`);
  });
}

main().catch((err) => {
  console.error("Falha fatal:", err);
  process.exit(1);
});
