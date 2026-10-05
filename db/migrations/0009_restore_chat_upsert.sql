-- Regression fix: chat repository uses INSERT ... ON CONFLICT DO UPDATE.
-- Keep the grant limited to the append/upsert table; no broad new privilege.
GRANT UPDATE ON TABLE public.chat_messages TO kallistis;
