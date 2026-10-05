# Códice

Códice é a superfície de leitura, margem e fichamento dentro de Kháris/Klio.

## Biblioteca Códice

A fonte principal de livros é a Biblioteca Códice, baseada em Supabase Storage privado.

Fluxo:

1. O usuário envia um EPUB.
2. O arquivo é salvo no bucket privado `codice-books`.
3. Os metadados são salvos em `public.livros`.
4. A lista “Meus EPUBs” vem do Supabase.
5. Ao abrir um livro, o app baixa o arquivo privado e cria um `blobUrl` local.
6. Margens são salvas em `public.codice_margens`.
7. Fichamentos usam texto real extraído do livro, quando disponível.

## Fora do fluxo principal

Google Drive permanece experimental.

## Regra de funcionamento

O Códice deve usar eventos reais, listas vindas do Supabase e mensagens que reflitam o resultado das operações.
