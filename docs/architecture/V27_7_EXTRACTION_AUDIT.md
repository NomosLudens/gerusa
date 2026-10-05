# V27.7 Extraction Audit

## 1. Decisão

O `kalinev27.7` não deve ser usado como base de código para `totalidade`.
Ele deve ser tratado como protótipo local-first e registro canônico dos limites da V27 pública.
O `totalidade` é a base mais avançada da Kaline Clean.
Nada de código deve ser migrado diretamente neste PR.

## 2. Valor real do v27.7

- docs de limites da V27;
- regras de produto real;
- respostas canônicas para código, Kuan e Kháris;
- protótipo local-first;
- sedimentação local com repository interface;
- falha explícita quando Supabase não está configurado;
- ideias visuais como KITT scanner/semáforo, apenas como inspiração.

## 3. O que já foi superado pelo totalidade

- chat local do v27.7 foi superado por ChatView + /api/chat real;
- bloqueio frontend foi superado por Runtime Boundary backend;
- localStorage foi superado por Supabase real;
- docs soltos foram superados por arquitetura Kaline Clean + Ledger;
- Kuan removida do v27.7 não deve ser reativada.

## 4. O que migrar

MIGRATE_AS_DOC:

- `docs/identity/04_REGRAS_PRODUTO_REAL.md`
- `docs/identity/07_LIMITES_V27.md`
- `docs/identity/08_LEDGER.md`

MIGRATE_AS_TEST_REFERENCE:

- padrões de `identityDocs.ts` para código/Kuan/Kháris/escopo/Ledger.

KEEP_AS_INSPIRATION:

- UI local-first;
- KITT scanner;
- semáforo local;
- repository pattern da sedimentação.

## 5. O que NÃO migrar

- `src/App.tsx`
- `src/components/KalineChat.tsx`
- runtime @google/genai
- Express/dotenv local
- README AI Studio
- localStorage como memória principal
- sedimentação local como substituto do Supabase
- bloqueio de escopo apenas no frontend
- qualquer retorno de Kuan à Kaline Clean

## 6. Relação com Kuan-Yin

O `kalinev27.7` não é a fonte correta para Kuan-Yin.
Ele representa a fase em que Kuan foi removida da V27 pública.
Para o futuro clone Kuan-Yin, usar:

1. `totalidade` atual como base limpa;
2. arquivos Kuan-Yin preservados no `totalidade`;
3. `kalinev27.8` como fotografia antiga de Kuan ativa, se necessário.
   Não usar `kalinev27.7` como base comercial.

## 7. Decisão final

Antes do clone Kuan-Yin:

- preservar o mapa;
- não apagar nada;
- não reativar Kuan;
- não migrar código do v27.7;
- consolidar apenas os documentos de produto real e limites V27.
