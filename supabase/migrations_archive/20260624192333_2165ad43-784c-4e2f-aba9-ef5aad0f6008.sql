
CREATE POLICY "own audio" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'reunioes-audio' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'reunioes-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own livros docs" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'livros-docs' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'livros-docs' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "own infograficos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'infograficos' AND auth.uid()::text = (storage.foldername(name))[1])
  WITH CHECK (bucket_id = 'infograficos' AND auth.uid()::text = (storage.foldername(name))[1]);
