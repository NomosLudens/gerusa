-- Identity supplied on the invite is carried by the short-lived OAuth state
-- and materialized in the authenticated user's profile only after the claim.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pronouns text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_pronouns_length_check
  CHECK (pronouns IS NULL OR char_length(btrim(pronouns)) BETWEEN 1 AND 80);

ALTER TABLE public.player_invite_oauth_states
  ADD COLUMN IF NOT EXISTS display_name text,
  ADD COLUMN IF NOT EXISTS pronouns text;

ALTER TABLE public.player_invite_oauth_states
  ADD CONSTRAINT player_invite_oauth_display_name_length_check
  CHECK (display_name IS NULL OR char_length(btrim(display_name)) BETWEEN 1 AND 60),
  ADD CONSTRAINT player_invite_oauth_pronouns_length_check
  CHECK (pronouns IS NULL OR char_length(btrim(pronouns)) BETWEEN 1 AND 80);
