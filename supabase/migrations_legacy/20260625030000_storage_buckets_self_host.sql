-- Storage buckets required by the app when provisioning a fresh Supabase project.
-- Object access remains protected by the RLS policies declared in the baseline.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('reunioes-audio', 'reunioes-audio', false, 26214400, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg']::text[]),
  ('livros-docs', 'livros-docs', false, 52428800, ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword', 'text/plain']::text[]),
  ('infograficos', 'infograficos', false, 10485760, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('avatares', 'avatares', false, 5242880, ARRAY['image/png', 'image/jpeg', 'image/webp']::text[]),
  ('camara-audio', 'camara-audio', false, 26214400, ARRAY['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/x-m4a']::text[])
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;
