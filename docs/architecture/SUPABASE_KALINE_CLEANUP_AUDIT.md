# Supabase Kaline Cleanup Audit

## Decisão de escopo

Kaline Clean usa Supabase apenas para:

- auth/perfis;
- chat;
- Kaline Presente;
- Câmara do Eco;
- Registro Vivo;
- Jardim;
- Revisão;
- Agenda;
- Semáforo da Presença;
- Ledger interno;
- sedimentação;
- memória aprovada;
- configurações pessoais.

Fora do Supabase da Kaline:

- Klio Coder;
- Kuan-Yin comercial;
- Kódice/Códice;
- jurídico;
- jurisprudência;
- legislação;
- Drive;
- Corpore/Treinos;
- Portal;
- dashboards administrativos;
- mocks.

## KEEP_CORE

| Tabela/bucket/function                       | Onde é usado               | Motivo                             | Risco se remover                           |
| -------------------------------------------- | -------------------------- | ---------------------------------- | ------------------------------------------ |
| `profiles`                                   | UI de Auth, funções gerais | Perfil de usuário base             | Kaline Clean quebra sem auth               |
| `profile_initial_contexts`                   | Auth/Contexto              | Dados iniciais do usuário          | Contexto inicial falha                     |
| `user_roles`                                 | Authz                      | Autorização de acesso              | Sem admin role, o sistema pode quebrar     |
| `workspace_members`, `workspace_invitations` | Authz/Compartilhamento     | Estrutura core para acesso         | Falha na lógica de acesso e workspaces     |
| `chat_threads`, `chat_messages`              | ChatView, Contexto Vivo    | Histórico de conversas             | Perda da funcionalidade principal de Chat  |
| `camara_sessoes`, `camara_segmentos`         | Câmara do Eco              | Processamento de áudio/análise     | Câmara do Eco deixa de funcionar           |
| bucket: `camara-audio`                       | Câmara do Eco              | Armazena áudios gravados           | Perda dos áudios processados e temporários |
| `registro_vivo`                              | Registro Vivo              | Entrada direta do usuário          | Falha na feature de Registro Vivo          |
| `jardim_memorias`                            | Jardim                     | SRS e Revisão                      | Sistema de memorização quebra              |
| `eventos`                                    | Agenda                     | Eventos e compromissos futuros     | Calendário e Agenda quebram                |
| `presenca_regimes`, `corpo_sinais`           | Semáforo da Presença       | Monitoramento de estado/presença   | Semáforo da Presença falha                 |
| `sedimentos`                                 | Sedimentação               | Memória de longo prazo consolidada | Falha na base de conhecimento perene       |

## KEEP_INTERNAL

| Tabela/bucket/function | Onde é usado             | Motivo                      | Observação                                    |
| ---------------------- | ------------------------ | --------------------------- | --------------------------------------------- |
| `reunioes`             | Agenda/Organização       | Intersecção com calendário  | Manter por precaução e auditoria              |
| `contexto_externo`     | Importação de dados/Klio | Contexto de entrada externo | Pode estar acoplado ao Klio Coder, investigar |

## ARCHIVE_CANDIDATE

| Tabela/bucket/function                    | Evidência                       | Próximo passo                          | Pode ter dados reais?                     |
| ----------------------------------------- | ------------------------------- | -------------------------------------- | ----------------------------------------- |
| `business_contexts`, `kuanyin_*`          | Escopo comercial Kuan-Yin       | Exportar e mover para base da Kuan-Yin | Sim                                       |
| `drive_*`                                 | Sistema de controle de veículos | Exportar para arquivo/Kódice           | Sim (histórico veicular, despesas)        |
| `jurisprudencia`, `legal_*`, `legislacao` | Sistema jurídico                | Exportar para Kódice ou base separada  | Sim (documentos, leis, processos)         |
| `treino_*`                                | Dashboard Corpore/Treinos       | Exportar para Kódice/arquivo local     | Sim (histórico de exercícios e planilhas) |
| `livros`, `codice_margens`                | Kódice / leitura                | Exportar para app próprio Kódice       | Sim (anotações de leitura)                |

## DROP_CANDIDATE

| Tabela/bucket/function | Evidência                                         | Risco | Confirmação necessária             |
| ---------------------- | ------------------------------------------------- | ----- | ---------------------------------- |
| functions: `has_role`  | Doc indica uso antigo no frontend, migrado p/ SSR | Baixo | Sim, garantir que não há mais refs |

## UNKNOWN

| Tabela/bucket/function   | Por que ainda não dá para decidir                                            |
| ------------------------ | ---------------------------------------------------------------------------- |
| Ledger interno           | Se houver tabela não explícita na tipagem do Supabase (ex: logs não tipados) |
| `kuanyin_integrity_logs` | Apesar de ser Kuan-Yin, pode conter logs relevantes para auditoria global?   |

## Ordem segura de limpeza futura

1. exportar backup do Supabase;
2. salvar snapshot do schema;
3. salvar lista de tabelas;
4. salvar lista de buckets;
5. conferir contagem de linhas;
6. conferir último uso real no código;
7. confirmar manualmente KEEP/ARCHIVE/DROP;
8. criar migration de archive, se necessário;
9. só depois criar migration destrutiva separada;
10. rodar em preview/staging antes de produção.

## Proibido neste PR

- DROP TABLE
- DROP POLICY
- DELETE FROM
- TRUNCATE
- ALTER TABLE
- UPDATE
- CREATE TABLE
- mudança de RLS
- remoção de migration antiga
- alteração de Supabase types
- alteração de runtime
- alteração de UI
