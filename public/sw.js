// K∧LINE — Service Worker
// Versão: 2026-07-04-pwa-01
// Estratégia: network-first para HTML, cache-first para assets versionados,
// stale-while-revalidate para imagens/ícones públicos.
//
// IMPORTANTE: o HTML do app-shell referencia chunks JS com hash no nome
// (index-<hash>.js). Servir o shell via stale-while-revalidate devolvia um
// HTML antigo que apontava para hashes de chunk já removidos por deploys mais
// recentes — o PWA instalado abria uma casca velha, os chunks davam 404 e o
// app não carregava (enquanto o navegador, que revalida o SW com mais
// frequência, seguia rápido). Por isso o shell usa network-first: sempre pega
// o HTML fresco (com os hashes atuais) quando online e cai pro cache só offline.

const CACHE_PREFIX = "kaline-pwa-";
const CACHE_VERSION = "kaline-pwa-v2026-07-04-01";
const HTML_CACHE = `${CACHE_VERSION}:html`;
const STATIC_CACHE = `${CACHE_VERSION}:static`;
const IMAGE_CACHE = `${CACHE_VERSION}:images`;
const ALLOWED_CACHES = [HTML_CACHE, STATIC_CACHE, IMAGE_CACHE];
const OFFLINE_URL = "/offline.html";

const STATIC_EXTENSIONS = [".js", ".css", ".woff", ".woff2", ".ttf"];
const IMAGE_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".svg", ".ico"];

function getUrl(request) {
  try {
    return new URL(request.url);
  } catch {
    return null;
  }
}

function isHttpRequest(url) {
  return url && (url.protocol === "http:" || url.protocol === "https:");
}

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isApiRequest(url) {
  return url.pathname.startsWith("/api/") || url.pathname.includes("/auth/v1/");
}

function hasAuthorization(request) {
  return request.headers.has("Authorization");
}

function isSafeCacheRequest(request, url) {
  return (
    request.method === "GET" &&
    isHttpRequest(url) &&
    isSameOrigin(url) &&
    !hasAuthorization(request) &&
    !isApiRequest(url)
  );
}

function hasExtension(pathname, extensions) {
  return extensions.some((ext) => pathname.toLowerCase().endsWith(ext));
}

function isNavigationRequest(request) {
  return request.mode === "navigate";
}

function isHtmlRequest(request, url) {
  const accept = request.headers.get("Accept") || "";
  return (
    isNavigationRequest(request) ||
    url.pathname === "/" ||
    url.pathname.endsWith(".html") ||
    (!url.pathname.includes(".") && accept.includes("text/html"))
  );
}

function isStaticAsset(url) {
  return url.pathname.startsWith("/assets/") && hasExtension(url.pathname, STATIC_EXTENSIONS);
}

function isImageRequest(url) {
  return hasExtension(url.pathname, IMAGE_EXTENSIONS);
}

async function putIfCacheable(cacheName, request, response) {
  if (!response || !response.ok || response.type !== "basic") return;
  const cache = await caches.open(cacheName);
  await cache.put(request, response.clone());
}

async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    await putIfCacheable(cacheName, request, response);
    return response;
  } catch {
    const cached = await caches.match(request, { cacheName });
    if (cached) return cached;

    if (isNavigationRequest(request)) {
      const rootCached = await caches.match("/", { cacheName });
      if (rootCached) return rootCached;
      const offlineCached = await caches.match(OFFLINE_URL, { cacheName });
      if (offlineCached) return offlineCached;
    }

    throw new Error("Kaline offline sem fallback em cache");
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;

  const response = await fetch(request);
  await putIfCacheable(cacheName, request, response);
  return response;
}

async function staleWhileRevalidate(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  const refresh = fetch(request).then(async (response) => {
    await putIfCacheable(cacheName, request, response);
    return response;
  });

  if (cached) {
    refresh.catch(() => undefined);
    return cached;
  }

  return refresh;
}

self.addEventListener("install", (event) => {
  // Assume o controle assim que instala. Sem isto, um PWA preso numa versão
  // antiga do SW (com a casca quebrada) só trocaria de service worker quando
  // todas as abas fossem fechadas — na prática, o app ficava dias emperrado.
  self.skipWaiting();
  event.waitUntil(
    caches
      .open(HTML_CACHE)
      .then((cache) => cache.add(OFFLINE_URL))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && !ALLOWED_CACHES.includes(key))
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  const source = event.source;
  const data = event.data || {};
  const sourceUrl =
    source && source.type === "window" && source.url ? getUrl({ url: source.url }) : null;
  if (
    data.type === "SKIP_WAITING" &&
    data.cacheVersion === CACHE_VERSION &&
    sourceUrl &&
    isSameOrigin(sourceUrl)
  ) {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = getUrl(request);

  if (!isSafeCacheRequest(request, url)) return;

  if (isHtmlRequest(request, url)) {
    // Network-first: o shell precisa referenciar os hashes de chunk atuais.
    // O cache serve só de fallback offline (ver networkFirst).
    event.respondWith(networkFirst(request, HTML_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  if (isImageRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
  }
});
