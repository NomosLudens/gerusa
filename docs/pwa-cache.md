# PWA e cache da Kaline

Este documento descreve a estratégia mínima e segura do service worker da Kaline. A Kaline é tratada como shell autenticado/hub principal; microapps HTML públicos são superfícies visuais especializadas e APIs/Supabase continuam responsáveis por persistência e execução segura.

## Versão e limpeza de caches

O service worker usa caches versionados com prefixo `kaline-pwa-`:

- `kaline-pwa-...:html` para HTML e fallback offline.
- `kaline-pwa-...:static` para assets versionados do build.
- `kaline-pwa-...:images` para imagens e ícones públicos.

No evento `activate`, o service worker remove apenas caches antigos que começam com `kaline-pwa-` e preserva somente os caches da versão atual. Para forçar limpeza manual durante testes, abra DevTools > Application > Storage e limpe Cache Storage/Service Workers, ou incremente `CACHE_VERSION` em `public/sw.js` e recarregue com o novo service worker ativo.

## O que é cacheado

- Navegações e HTML público usam `network-first` com fallback para cache quando offline.
- Microapps HTML públicos, como `/codice/index.html`, `/camara-do-eco/index.html` e HTMLs futuros em `public/`, também usam `network-first`.
- Assets versionados em `/assets/` com extensões `.js`, `.css`, `.woff`, `.woff2` e `.ttf` usam `cache-first`.
- Imagens e ícones públicos (`.png`, `.jpg`, `.jpeg`, `.webp`, `.svg`, `.ico`) usam `stale-while-revalidate`.
- `public/offline.html` é guardado como fallback mínimo para navegações offline.

## O que nunca é cacheado

O service worker não cacheia:

- Requests que não sejam `GET`.
- Requests com header `Authorization`.
- `/api/*`, incluindo chat, TTS, transcrição, uploads e bridges.
- Supabase auth/session ou rotas equivalentes de autenticação.
- Dados privados de usuário, reuniões, memórias, transcrições, áudios, uploads ou conteúdo de chat.

A regra geral é: apenas `GET` seguro e estático pode entrar no cache.

## HTML principal e rotas autenticadas

Qualquer navegação (`request.mode === "navigate"`) usa rede primeiro. Isso evita que o HTML principal fique preso em uma versão antiga depois de deploy. Se a rede falhar, o service worker tenta uma resposta em cache e, por último, `offline.html`.

## Microapps HTML públicos

HTMLs em `public/`, incluindo superfícies como Códice e Câmara do Eco, não usam cache-first. Eles são buscados na rede primeiro para receber atualizações após deploy; o cache só é fallback offline. O service worker não interfere em `postMessage`, `localStorage` interno do HTML ou APIs do navegador como wake lock.

## Como testar o app instalado

1. Rode `npm run build` e sirva a build localmente.
2. Abra `/` no navegador e confirme que o service worker registra sem erro no console.
3. Instale o app como PWA, feche e abra novamente.
4. Navegue entre rotas principais e recarregue a página.
5. Abra microapps públicos disponíveis, como `/codice/index.html` e `/camara-do-eco/index.html`.
6. Ative modo offline no DevTools e recarregue para validar o fallback.
7. Incremente `CACHE_VERSION`, recarregue e confirme que caches antigos com prefixo `kaline-pwa-` foram removidos.
8. Verifique no DevTools que `/api/*` e requests com `Authorization` não entram em Cache Storage.
