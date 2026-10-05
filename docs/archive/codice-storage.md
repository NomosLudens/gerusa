# Biblioteca Códice Storage

O fluxo principal do Códice não depende de Google Drive. O Drive/OAuth fica reservado para uma
integração experimental ou futura.

## Fluxo principal

1. O usuário envia um arquivo `.epub` pela Biblioteca Códice.
2. O navegador cria um registro em `public.livros`.
3. O arquivo original é salvo no bucket privado `codice-books`.
4. `public.livros` guarda apenas metadados, progresso, fichamento, margem e referências de storage.
5. Ao abrir o livro, o app gera uma signed URL temporária, baixa o EPUB como Blob no navegador e
   renderiza o conteúdo no leitor.

EPUBs não devem ser salvos como bytes ou texto integral no banco.

## Bucket

- Nome: `codice-books`
- Público: não
- MIME permitido: `application/epub+zip`
- Limite atual: 100 MB
- Caminho: `{user_id}/{book_id}.epub`

O bucket é criado pela migration:

`supabase/migrations/20260630190000_codice_private_books_storage.sql`

## Banco

`public.livros` usa estes campos para a biblioteca:

- `storage_bucket`: `codice-books`
- `storage_path`: caminho privado do objeto
- `mime_type`: MIME do upload
- `file_size`: tamanho do EPUB em bytes
- `origem`: `upload`
- `ultimo_acesso_em`: último acesso do leitor

`texto_extraido` permanece nulo para EPUBs da Biblioteca Códice.

## Segurança

A policy `own codice books` em `storage.objects` permite acesso somente quando o primeiro segmento
do caminho é o `auth.uid()` do usuário autenticado. O bucket não é público e o app usa signed URLs
temporárias para baixar o Blob no navegador.
