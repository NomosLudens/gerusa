ALTER TABLE public.player_access
  ADD COLUMN IF NOT EXISTS credential_ciphertext text;

COMMENT ON COLUMN public.player_access.credential_ciphertext IS
  'AES-GCM encrypted copy of the active Gravewright player phrase for display to its owning KALLISTIS user only.';
