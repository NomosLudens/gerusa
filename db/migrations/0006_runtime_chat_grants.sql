-- Runtime privilege required by createPostgresChatRepository.createThread.
-- Keep this additive: 0005 remains the historical grant baseline.
GRANT INSERT ON TABLE public.chat_threads TO kallistis;

-- No provider, schema, role, or broad table privileges belong here.
