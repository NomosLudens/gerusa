-- KALLISTIS local memory and sedimentation contract.
-- registro_vivo and eventos are intentionally deferred in this first slice.

CREATE TABLE IF NOT EXISTS memory_candidates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    domain text NOT NULL DEFAULT 'memory',
    source text NOT NULL DEFAULT 'manual',
    source_id uuid,
    title text NOT NULL,
    content text NOT NULL,
    reason text,
    sensitivity text NOT NULL DEFAULT 'medium',
    status text NOT NULL DEFAULT 'pending',
    reviewed_at timestamptz,
    reviewed_by uuid REFERENCES users(id),
    approved_memory_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT memory_candidates_domain_check CHECK (domain IN ('memory')),
    CONSTRAINT memory_candidates_sensitivity_check CHECK (sensitivity IN ('low', 'medium', 'high')),
    CONSTRAINT memory_candidates_source_check CHECK (source IN ('chat', 'manual', 'system')),
    CONSTRAINT memory_candidates_status_check CHECK (status IN ('pending', 'approved', 'rejected', 'archived')),
    CONSTRAINT memory_candidates_text_check CHECK (length(trim(title)) > 0 AND length(trim(content)) > 0)
);

CREATE TABLE IF NOT EXISTS jardim_memorias (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    source text,
    source_ref uuid,
    category text NOT NULL DEFAULT 'geral',
    tags text[] NOT NULL DEFAULT '{}',
    importance smallint NOT NULL DEFAULT 2,
    ease numeric NOT NULL DEFAULT 2.5,
    interval_days integer NOT NULL DEFAULT 1,
    review_count integer NOT NULL DEFAULT 0,
    next_review_at timestamptz NOT NULL DEFAULT now(),
    last_reviewed_at timestamptz,
    archived_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT jardim_memorias_importance_check CHECK (importance BETWEEN 1 AND 3),
    CONSTRAINT jardim_memorias_text_check CHECK (length(trim(title)) > 0 AND length(trim(body)) > 0)
);

CREATE TABLE IF NOT EXISTS sedimentos (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    thread_id uuid NOT NULL REFERENCES chat_threads(id) ON DELETE CASCADE,
    nivel text NOT NULL DEFAULT 'short_term',
    status text NOT NULL DEFAULT 'em_revisao',
    source_kind text NOT NULL DEFAULT 'chat_message',
    source_ids uuid[] NOT NULL DEFAULT '{}',
    hipotese text NOT NULL,
    resumo text,
    confianca smallint NOT NULL DEFAULT 1,
    -- Polymorphic target: jardim_memorias for confirmation, sedimentos for promotion.
    promovido_para uuid,
    promovido_tipo text,
    created_at timestamptz NOT NULL DEFAULT now(),
    revisado_at timestamptz,
    CONSTRAINT sedimentos_nivel_check CHECK (
        nivel IN ('iconic', 'echoic', 'short_term', 'working', 'prospective', 'episodic', 'semantic', 'procedural')
    ),
    CONSTRAINT sedimentos_status_check CHECK (status IN ('rascunho', 'em_revisao', 'confirmado', 'descartado')),
    CONSTRAINT sedimentos_confidence_check CHECK (confianca BETWEEN 0 AND 3),
    CONSTRAINT sedimentos_hypothesis_check CHECK (length(trim(hipotese)) > 0)
);

CREATE INDEX IF NOT EXISTS memory_candidates_user_status_idx
    ON memory_candidates (user_id, status, created_at, id);
CREATE INDEX IF NOT EXISTS jardim_memorias_user_review_idx
    ON jardim_memorias (user_id, next_review_at, id);
CREATE INDEX IF NOT EXISTS sedimentos_thread_level_status_idx
    ON sedimentos (user_id, thread_id, nivel, status, created_at, id);
