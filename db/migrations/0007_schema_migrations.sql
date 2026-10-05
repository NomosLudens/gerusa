-- Auditable provenance for this database. Historical files are recorded only
-- after their present effects are verified; their original applied_at is unknown.
CREATE TABLE IF NOT EXISTS public.kallistis_schema_migrations (
    version text PRIMARY KEY,
    filename text NOT NULL UNIQUE,
    checksum_sha256 text NOT NULL CHECK (checksum_sha256 ~ '^[0-9a-f]{64}$'),
    verification_state text NOT NULL CHECK (
        verification_state IN ('VERIFIED_EXISTING', 'APPLIED_IN_THIS_RUN')
    ),
    applied_at timestamptz,
    verified_at timestamptz NOT NULL DEFAULT now(),
    verified_by text NOT NULL DEFAULT current_user,
    CONSTRAINT kallistis_schema_migrations_version_check CHECK (version ~ '^[0-9]{4}$'),
    CONSTRAINT kallistis_schema_migrations_applied_at_check CHECK (
        (verification_state = 'VERIFIED_EXISTING' AND applied_at IS NULL)
        OR (verification_state = 'APPLIED_IN_THIS_RUN' AND applied_at IS NOT NULL)
    )
);

COMMENT ON TABLE public.kallistis_schema_migrations IS
  'Migration provenance verified against the live KALLISTIS PostgreSQL database.';
