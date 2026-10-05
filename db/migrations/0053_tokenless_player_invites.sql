-- Tokenless public player onboarding. Existing claims, especially JOGADOR-01,
-- remain untouched; the remaining canonical slots are provisioned without
-- public token material and are allocated only after Google authentication.
ALTER TABLE public.player_invites
  ALTER COLUMN token_hash DROP NOT NULL;

ALTER TABLE public.player_invite_oauth_states
  ALTER COLUMN invite_id DROP NOT NULL;

INSERT INTO public.player_invites (player_label, token_hash)
SELECT format('JOGADOR-%s', lpad(slot::text, 2, '0')), NULL
  FROM generate_series(2, 25) AS slots(slot)
 WHERE NOT EXISTS (
   SELECT 1
     FROM public.player_invites existing
    WHERE existing.player_label = format('JOGADOR-%s', lpad(slot::text, 2, '0'))
 );
