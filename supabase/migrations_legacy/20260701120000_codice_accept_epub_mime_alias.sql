-- Biblioteca Códice: aceita o alias MIME application/epub usado por alguns navegadores.
-- Mantém application/epub+zip como MIME canônico do app.

update storage.buckets
set allowed_mime_types = array['application/epub+zip', 'application/epub']::text[]
where id = 'codice-books';
