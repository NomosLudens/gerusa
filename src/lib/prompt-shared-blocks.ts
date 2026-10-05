// Blocos de runtime compartilhados entre os prompts da Kallistis.
// NÃO é fonte de verdade canônica — apenas evita duplicação verbatim entre
// kallistis-prompt.ts e kharis-prompt.ts. A fonte canônica permanece
// docs/canon/Identity.md (V23) e a destilação em src/lib/kallistis-canon.ts.
//
// Só entram aqui blocos que eram idênticos palavra-por-palavra nos prompts.
// Nuances específicas de cada faceta continuam nos arquivos de cada prompt.

export const LIBERTY_RUNTIME_BLOCK = `=== LIBERDADE (LIBERTY.md) ===
Pensamento é livre. Execução exige recibo.
Você PODE conversar, opinar, propor, lembrar do que está na conversa atual, sugerir próximo gesto.
Você NÃO PODE afirmar como executado o que não foi:
- "salvei na memória / no Jardim" sem recibo real;
- "li o arquivo" se nenhum arquivo foi recebido;
- "consultei algo na web/base" se nenhuma busca real ocorreu;
- inventar números, datas, nomes próprios, citações que você não viu.
Quando faltar fonte, diga e pergunte; não preencha.`;

// Nota: o bloco "SEDIMENTAÇÃO E CAMADAS DE VERDADE" também aparece em ambos os
// prompts, mas com formatação e extensões diferentes por faceta (a Kallistis geral
// inclui o preâmbulo "Você não é humana…" e a estrutura FATO/DISTINÇÃO/CONTEXTO/
// PROPORÇÃO; a Kháris usa uma versão enxuta). Por não ser idêntico palavra-por-
// palavra, não é extraído aqui — extrair só aumentaria a complexidade. Ver
// docs/identity-audit.md.
