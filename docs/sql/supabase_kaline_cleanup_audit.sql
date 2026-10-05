-- docs/sql/supabase_kaline_cleanup_audit.sql
-- 
-- ESTE SCRIPT É APENAS LEITURA (READ-ONLY).
-- Pode ser executado com segurança no Supabase SQL Editor.
-- O objetivo é realizar um levantamento do estado atual da base de dados.
-- PROIBIDO: DROP, DELETE, TRUNCATE, ALTER, UPDATE, CREATE, INSERT.
--

-- 1. TABELAS PÚBLICAS E ESTIMATIVA DE LINHAS
-- Lista as tabelas no schema 'public' com estimativa de número de registros.
SELECT 
    schemaname AS schema_name,
    relname AS table_name,
    n_live_tup AS estimated_row_count
FROM 
    pg_stat_user_tables
WHERE 
    schemaname = 'public'
ORDER BY 
    n_live_tup DESC;

-- 2. COLUNAS DAS TABELAS
-- Lista todas as colunas de todas as tabelas do schema public.
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM 
    information_schema.columns
WHERE 
    table_schema = 'public'
ORDER BY 
    table_name, ordinal_position;

-- 3. POLICIES RLS (Row Level Security)
-- Lista as políticas de segurança ativas nas tabelas do schema public.
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM 
    pg_policies
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename, policyname;

-- 4. TRIGGERS
-- Lista as triggers ativas no schema public.
SELECT 
    event_object_table AS table_name,
    trigger_name,
    event_manipulation AS event,
    action_timing AS timing,
    action_statement AS action
FROM 
    information_schema.triggers
WHERE 
    event_object_schema = 'public'
ORDER BY 
    table_name, trigger_name;

-- 5. FUNÇÕES PÚBLICAS (RPCs)
-- Lista as funções customizadas disponíveis no schema public.
SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    pg_get_function_result(p.oid) AS return_type
FROM 
    pg_proc p
JOIN 
    pg_namespace n ON p.pronamespace = n.oid
WHERE 
    n.nspname = 'public' 
    AND p.prokind = 'f' 
ORDER BY 
    p.proname;

-- 6. BUCKETS DE STORAGE (Se instalado)
-- Lista os buckets de storage do Supabase, assumindo o schema 'storage'.
SELECT 
    id,
    name,
    public,
    created_at,
    updated_at
FROM 
    storage.buckets
ORDER BY 
    name;

-- 7. FOREIGN KEYS (Chaves Estrangeiras)
-- Lista os relacionamentos entre as tabelas do schema public.
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE
    tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY
    tc.table_name;

-- 8. INDEXES
-- Lista os índices criados nas tabelas do schema public.
SELECT 
    tablename,
    indexname,
    indexdef
FROM 
    pg_indexes
WHERE 
    schemaname = 'public'
ORDER BY 
    tablename, indexname;
