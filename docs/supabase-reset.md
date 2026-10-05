# Reset seguro do Supabase — Totalidade

Este documento prepara o reset limpo. Este PR apenas prepara schema: não executa reset e não restaura dados.

> **Baseline consolidada em 2026-07-02.** As 39 migrations incrementais
> (incluindo a antiga `20260630000000_totalidade_baseline.sql`) foram
> movidas para `supabase/migrations_legacy/` — ficam só como referência
> histórica, não devem mais ser aplicadas. `supabase/migrations/` agora
> tem só `20260702010000_clean_baseline_v2.sql`: um único arquivo
> idempotente, validado por execução real contra Postgres (replay das 39
> legadas + diff coluna a coluna + testes funcionais), que provisiona o
> schema completo (47 tabelas, RLS, storage, funções) do zero. Ver
> `supabase/migrations_legacy/README.md` para detalhes, incluindo a
> **mudança deliberada** no bootstrap de admin (só o primeiro signup vira
> admin agora, não mais todo signup).

## Fluxo seguro

1. Confirmar que o backup real já foi feito com `bun run supabase:export-personal` (JSON paginado).
2. Guardar CSV/JSON fora do git; `exports/` é apenas área local e ignorada.
3. Revisar a baseline em `supabase/migrations/20260702010000_clean_baseline_v2.sql`.
4. Só então resetar Supabase, depois de validar baseline e backup.
5. Recriar usuário/admin — com a baseline nova, o **primeiro** signup no projeto já vira admin automaticamente (não precisa de passo manual extra).
6. Capturar o novo `user_id` no Supabase Auth.
7. Importar dados com mapeamento `old_user_id -> new_user_id`.
8. Regenerar generated types após a baseline/reset.
9. Rodar app e validar login, chat, memórias, Kuan-Yin, Códice, Câmara, Drive e presença.

## Problema do `user_id`

Se o Supabase for apagado, o usuário recriado pode receber outro UUID. Por isso, a importação deve aceitar um mapeamento `old_user_id -> new_user_id` e trocar campos relacionais que apontam para usuários.

Exemplo de mapeamento CSV:

```csv
old_user_id,new_user_id,email
uuid-antigo,uuid-novo,usuario@email.com
```

Também é possível passar o par diretamente ao script:

```bash
bun run supabase:import-personal exports/supabase-export-YYYY-MM-DDTHH-mm-ss uuid-antigo uuid-novo
```

Ou usar arquivo de mapping:

```bash
bun run supabase:import-personal exports/supabase-export-YYYY-MM-DDTHH-mm-ss --mapping exports/user-id-map.csv
```

## Backup antes do reset

- Use `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` apenas em ambiente local/seguro.
- Não cole service role key em código, docs versionados ou logs.
- Não commite CSV/JSON reais.
- Valide se o diretório exportado contém as tabelas esperadas e o `manifest.json`. Antes do reset, confira se os row counts são compatíveis com o esperado.
- Copie o export para armazenamento privado fora do repositório antes de qualquer reset.

## Importação após reset

A importação usa chunks, preserva IDs internos de threads, mensagens e registros sempre que o schema permitir e remapeia referências de usuário conhecidas: `user_id`, `owner_id`, `guardian_id`, `reviewed_by`, `created_by` e `admin_user_id`, quando o valor for igual ao `old_user_id`. Em `profiles`, também remapeia `profiles.id` quando ele for o UUID antigo do usuário. IDs de outras tabelas são preservados.

Ordem planejada:

1. `profiles`
2. `user_roles`
3. `workspace_members`
4. `workspace_invitations`
5. `profile_initial_contexts`
6. `business_contexts`
7. `kuanyin_guardians`
8. `kuanyin_clients`
9. `chat_threads`
10. `chat_messages`
11. `jardim_memorias`
12. `memory_candidates`
13. `registro_vivo`
14. `presenca_regimes`
15. `contexto_externo`
16. `eventos`
17. `sedimentos`
18. `kuanyin_appointments`
19. `kuanyin_orders`
20. `kuanyin_payments`
21. `kuanyin_public_chat_threads`
22. `kuanyin_public_chat_messages`
23. `livros`
24. `codice_margens`
25. `camara_sessoes`
26. `camara_segmentos`
27. `corpo_sinais`
28. `treino_sessoes`
29. `treino_sessao_exercicios`
30. `treino_series`
31. `drive_vehicles`
32. `drive_refuels`
33. `drive_oil_changes`
34. `drive_expenses`
35. `drive_trips`
36. `drive_docs`

## Limites conhecidos

- Tokens de portal (`kuanyin_portal_tokens`) devem ser recriados após o reset.
- Logs, caches e chunks regeneráveis não são exportados por padrão.
- Storage de áudio/arquivos precisa de backup e restauração separados dos JSONs.

## Validação pós-import

- Login do admin funciona.
- `profiles.role` e `profiles.assigned_facet` estão corretos.
- Chat abre threads antigas e mensagens sem conteúdo duplicado.
- Memórias e candidatas aparecem na revisão.
- Kuan-Yin lista contexto, clientes, agenda, pedidos e pagamentos.
- Códice lista livros e margens.
- Câmara lista sessões e segmentos; storage de áudio deve ser validado separadamente.
