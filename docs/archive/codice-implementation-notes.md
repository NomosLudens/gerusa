# Códice — notas de implementação

Este PR implementa a primeira superfície visual mockada do Códice descrita em `docs/codice-klio-architecture.md`.

## Rotas e arquivos

- Superfície estática: `public/codice/index.html`.
- Host autenticado React: `src/components/CodiceHost.tsx`.
- Rota autenticada: `/klio/codice`, em `src/routes/_authenticated/klio.codice.tsx`.
- Compatibilidade legada: `/livros` redireciona para `/klio/codice`.

## Limitações atuais

- O HTML é uma superfície visual mockada e autossuficiente.
- O HTML não acessa Supabase, não contém chaves e não chama APIs reais.
- O host recebe eventos via `postMessage` e encaminha ações para rotas autenticadas do motor (`/subir`, `/acervo`, `/fichamento`, `/margem` e `/tela-acesa`).
- O motor existente de livros e extração foi preservado e agora é renderizado nas rotas autenticadas de Subir, Acervo e Fichamento.
- EPUB passou a ter extração inicial de texto no motor preservado, além de PDF, DOCX e TXT.
- A arquitetura passa a ser local-first: arquivos originais e texto extraído ficam no aparelho via IndexedDB; Supabase recebe somente registros autenticados e derivados como resumos, fichamentos, margens, progresso e infográficos.
- A rota `/klio/codice/margem` já persiste margens em `public.codice_margens`, com listagem, criação, edição, exclusão, tags, trecho e localização de leitura.
- O acervo já atualiza os campos de progresso (`leitura_percentual`, `leitura_posicao`, `ultimo_acesso_em`) e ordena leituras por último acesso.
- A extração EPUB passou a tentar ler `container.xml`, `.opf`, metadata e `spine` antes de cair no fallback por nome de arquivo.
- O host autenticado já envia um acervo autorizado ao iframe por `postMessage`, sem expor Supabase no HTML público.

## Próximo passo

Trocar o texto mockado do leitor por capítulos locais completos entregues pelo host/motor autenticado sem enviar o arquivo original para a nuvem, mantendo o HTML público sem acesso direto ao Supabase.
