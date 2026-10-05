# KALLISTIS — Estado atual da progressão de personagem

Auditoria realizada em 2026-09-07 na produção (\`max:/srv/kallistis\`), HEAD
\`12b4eae8b5a43c94445d275933ff81751b2d8c9b\`.

Este documento descreve a implementação observada no código e no PostgreSQL
real. Não é uma alteração de regra nem uma transcrição do manual.

## Resumo executivo

Existe um fluxo server-side de progressão. Ele é separado em solicitação,
autorização, início e aplicação. A aplicação final grava um novo snapshot da
personagem, uma versão e eventos imutáveis.

O fluxo encontrado é:

\`\`\`text
personagem aprovada
→ jogador solicita o próximo Marco
→ reviewer autoriza
→ jogador inicia a evolução
→ jogador envia o snapshot de destino
→ servidor valida o delta e aplica
→ snapshot/version/evento/progressão persistidos
\`\`\`

O reviewer atual é o usuário configurado em
\`KALLISTIS_CHARACTER_REVIEWER_USER_ID\` ou um usuário com
\`system_roles.system_role = 'system_master'\`. A associação
\`mesa_members.member_role = 'mestre'\` é usada por superfícies do Mestre, mas
não é aceita por \`isCharacterReviewer()\` para autorizar progressão.

## A. Modelo implementado

### Marco

Marco é um inteiro de 1 a 10 dentro da Trilha ativa, em
\`characters.snapshot -> trilhas -> marco\`.

### Trilha

As Trilhas ficam no snapshot JSON da personagem. A Trilha ativa é indicada por
\`snapshot.trilhaAtiva\`. O código também lê \`id\`, \`oficio\`, \`papel\`,
\`chave\`, \`chaveNome\`, \`marco\`, \`ganhos\`, \`tecnicas\`, \`magias\`,
\`especializacoes\`, \`atributosGanhos\`, \`pericias\`, \`vinculosEvocados\`,
\`acessoMagia\` e \`legado\`.

### Outros componentes persistidos

O snapshot atual também contém, quando preenchidos:

- identidade: nome, povo, herança, origem, pronomes e conceito;
- atributos base e ganhos;
- perícias base;
- reservas e condições;
- equipamento;
- vínculos, promessa, ferida, pergunta, biografia e descrição;
- retrato e galeria.

Não foi encontrado um nível independente de Marco, nem uma tabela separada de
conquistas. O termo “conquista” aparece em linguagem de produto/cânone, mas
não há um componente server-side de conquistas ligado à progressão observada.

## B. Fonte de autoridade

| Elemento           | Fonte atual                                        |   Persistido | Quem altera                                                               |
| ------------------ | -------------------------------------------------- | -----------: | ------------------------------------------------------------------------- |
| Marco              | \`characters.snapshot.trilhas[*].marco\`           |          YES | aplicação server-side pelo jogador, após autorização                      |
| Trilha             | \`characters.snapshot.trilhas\`                    |          YES | criação/salvamento da ficha; o delta de progressão não pode trocar Trilha |
| Trilha ativa       | \`characters.snapshot.trilhaAtiva\`                |          YES | ficha; validado no delta de progressão                                    |
| Ganhos             | \`snapshot.trilhas[*].ganhos\`                     |          YES | aplicação de progressão, se completar o ganho exigido                     |
| Técnicas           | \`snapshot.trilhas[*].tecnicas\`                   |          YES | aplicação de progressão dentro do allowlist                               |
| Magias             | \`snapshot.trilhas[*].magias\`                     |          YES | aplicação, com validação adicional para Tecelão                           |
| Especializações    | \`snapshot.trilhas[*].especializacoes\`            |          YES | dentro do allowlist de progressão                                         |
| Atributos ganhos   | \`snapshot.trilhas[*].atributosGanhos\`            |          YES | dentro do allowlist de progressão                                         |
| Perícias           | \`snapshot.trilhas[*].pericias\`                   |          YES | dentro do allowlist de progressão                                         |
| Recursos derivados | funções do Forge e campos de \`snapshot.reservas\` | parcialmente | snapshot quando gravado; fórmulas no Forge                                |
| Chave              | \`snapshot.trilhas[*].chave\` / \`chaveNome\`      |          YES | ficha                                                                     |
| Conquistas         | nenhuma fonte server-side localizada               |           NO | NOT_IMPLEMENTED                                                           |

## C. Banco real

### Tabelas relevantes

- \`characters\`: identidade do registro, dono, reviewer atribuído, status,
  snapshot, versão e timestamps;
- \`character_versions\`: snapshots versionados, motivo e ator;
- \`character_events\`: ledger imutável de eventos de personagem;
- \`character_progression_requests\`: transições de Marco e seus atores;
- \`character_creation_messages\`: histórico do assistente de criação;
- \`mesas\`, \`mesa_members\`: mesas e membership social;
- \`character_mesas\`: associação many-to-many entre personagem e Mesa.

### Campos de progressão

\`character_progression_requests\` contém \`character_id\`, \`trail_id\`,
\`from_marco\`, \`to_marco\`, \`status\`, \`note\`, \`requested_by_user_id\`,
\`authorized_by_user_id\`, \`applied_by_user_id\`, \`created_at\`,
\`authorized_at\`, \`started_at\` e \`applied_at\`.

\`characters\` contém \`snapshot\`, \`version\`, \`mechanical_fingerprint\`,
\`published_snapshot\` e \`published_version\`.

### Constraints observadas

- \`from_marco\` entre 1 e 9;
- \`to_marco = from_marco + 1\` e entre 2 e 10;
- status restrito a \`requested\`, \`authorized\`, \`in_progress\`, \`applied\`,
  \`cancelled\` ou \`rejected\`;
- no máximo uma progressão ativa por personagem;
- uma progressão aplicada por personagem, Trilha e par de Marcos;
- versões positivas e snapshot JSON objeto;
- eventos imutáveis por trigger PostgreSQL.

### Estado observado na auditoria

Sem expor IDs internos:

- duas Mesas canônicas: Geek Wizards e Taverna dos Pandas;
- duas fichas ativas associadas à Taverna dos Pandas no painel real;
- nenhuma ficha ativa associada à Geek Wizards;
- registros de personagens: 1 aprovada, 1 rejeitada, 4 em rascunho e 23 arquivados;
- progressão: 2 registros \`applied\` e 1 registro \`in_progress\`.

## D. API e serviços reais

### Consulta da ficha

\`GET /api/characters?characterId=<id>\`

- entrada: \`characterId\`;
- autorização: somente \`owner_user_id\` do usuário autenticado;
- retorno: personagem, eventos, versões, mensagens, progressão e contexto;
- finalidade: Forge do próprio jogador.

### Solicitação e aplicação

\`POST /api/characters\` com \`action\` em:

- \`request\`: somente dono, personagem \`approved\`, sem progressão ativa;
- \`enable\`: somente reviewer, personagem atribuído ao reviewer, status aprovado;
- \`start\`: somente dono, progressão autorizada;
- \`apply\`: somente dono, versão esperada e snapshot de destino;
- \`reject_progression\`: somente reviewer, progressão ativa.

\`apply\` valida versão, Trilha, Marco seguinte, snapshot completo, allowlist
de campos, escolhas de magia, ganhos obrigatórios, regras de Tecelão e
fingerprint mecânico antes de gravar.

### Persistência da aplicação

Dentro de transação, o serviço atualiza \`characters\`, insere em
\`character_versions\`, atualiza \`character_progression_requests\` e insere em
\`character_events\`. Falha em qualquer validação impede a gravação.

### Classificação

\`\`\`text
PROGRESSION_IMPLEMENTATION_STATUS=IMPLEMENTED_AND_USED
\`\`\`

Há registros reais em produção, inclusive aplicações concluídas e uma
progressão em andamento.

## E. Fluxo atual do usuário

O fluxo server-side real é:

\`\`\`text
Jogador abre ficha aprovada
→ POST action=request
→ reviewer habilita com POST action=enable
→ jogador inicia com POST action=start
→ jogador monta o snapshot do próximo Marco
→ POST action=apply com expectedVersion
→ servidor valida e persiste
→ GET posterior devolve snapshot, versão, eventos e progressão
\`\`\`

O fluxo contém autorização e validação server-side, mas não contém uma etapa
genérica de preview/confirm antes de \`apply\`. A aplicação é uma mutação direta
depois das etapas request/enable/start.

## F. Autoridade

\`\`\`text
Jogador: pode solicitar, iniciar e aplicar a própria progressão autorizada.
Reviewer/system_master: pode autorizar ou rejeitar a progressão.
Mestre de mesa comum: não é reconhecido por isCharacterReviewer() hoje.
\`\`\`

Esse último ponto é uma lacuna real de autorização, não foi alterado nesta
missão.

## G. Marco

\`\`\`text
CURRENT_MARCO_SOURCE=snapshot.trilhas[trilhaAtiva].marco
MIN=1
MAX=10
ADVANCE_RULE=transição somente de Marco N para N+1
ADVANCE_TRIGGER=POST /api/characters com action=request/enable/start/apply
ADVANCE_VALIDATION=validateProgressionSnapshot + progressionComplete + versão esperada
\`\`\`

As listas de ganhos e a validação de escolhas estão em
\`src/server/characters/character-canon.ts\`. Regras narrativas do manual não
são automaticamente enforcement se não passarem por esse código.

## H. Ganhos

O allowlist efetivamente considerado pelo servidor é:

\`\`\`text
ganhos
tecnicas
magias
especializacoes
atributosGanhos
pericias
vinculosEvocados
acessoMagia
legado
\`\`\`

\`\`\`text
Marco: IMPLEMENTED
Técnicas: IMPLEMENTED
Magias: IMPLEMENTED, com validação própria para Tecelão
Especializações: IMPLEMENTED no allowlist
Atributos ganhos: IMPLEMENTED no allowlist
Perícias: IMPLEMENTED no allowlist
Vínculos evocados: IMPLEMENTED no allowlist
Recursos derivados: PARTIAL
Conquistas/ledger de conquista: NOT_IMPLEMENTED
\`\`\`

## I. Confirmação humana

Existe uma sequência humana de solicitação → autorização → início → aplicação.
Não existe um objeto de preview de progressão com confirmação separada. O
servidor recebe o snapshot final e o valida contra o snapshot anterior.

\`\`\`text
PROGRESSION_CONFIRMATION_MODEL=DIRECT_MUTATION_AFTER_AUTHORIZATION
\`\`\`

## J. Histórico e auditoria

\`\`\`text
HISTORICO_DE_PROGRESSAO=YES
MARCO_ANTERIOR=YES, em from_marco e character_versions
QUEM_AUTORIZOU=YES, authorized_by_user_id
QUANDO=YES, created_at/authorized_at/started_at/applied_at
ROLLBACK_SERVER_SIDE=NO
LEDGER_DE_EVENTOS=YES, character_events imutável
\`\`\`

O Forge também mantém checkpoints locais no navegador, mas isso não equivale a
rollback server-side de progressão.

## K. Produto real

\`\`\`text
CAN_PLAYER_PROGRESS_TODAY=YES
CAN_MASTER_AUTHORIZE_TODAY=YES — system_master/reviewer configurado
CAN_TABLE_MEMBER_MESTRE_AUTHORIZE_TODAY=NO
PROGRESSION_PERSISTS=YES
PROGRESSION_SURVIVES_RELOAD=YES — leitura posterior vem do PostgreSQL
PROGRESSION_HAS_SERVER_VALIDATION=YES
PROGRESSION_USES_REAL_CANON=PARTIAL — usa character-canon.ts; manual não é enforcement automático
\`\`\`

## Evidência da auditoria

\`\`\`text
TEST_NAME=Production database progression inventory
TEST_TYPE=read-only PostgreSQL inspection
EXECUTED=YES
TARGET=max:/srv/kallistis production database
EXPECTED=inspect real tables, characters, progression requests and statuses
ACTUAL=2 applied progression records, 1 in_progress; real character status counts recorded above
RESULT=PASS

TEST_NAME=Master real sheet query
TEST_TYPE=manual production browser
EXECUTED=YES
TARGET=https://kallistis.app/mestre
EXPECTED=separate real tables, no mock, open persisted sheet read-only
ACTUAL=Taverna dos Pandas showed two real persisted sheets; Geek Wizards showed the truthful empty state; Jinjo Hiromori opened with persisted identity, Trilha, Marco, attributes, skills, reserves, equipment and narrative fields
RESULT=PASS

TEST_NAME=Master sheet reload
TEST_TYPE=manual production browser
EXECUTED=YES
TARGET=/mestre?characterId=<redacted>
EXPECTED=same real sheet remains available after reload
ACTUAL=URL retained characterId and the same read-only sheet reopened with identity, progression and no mutation controls
RESULT=PASS

TEST_NAME=Player cross-access denial
TEST_TYPE=manual production browser
EXECUTED=NO
EXPECTED=normal player denied roster and another character
ACTUAL=no separate authenticated player session was available in the browser used for this mission
RESULT=UNVERIFIED
\`\`\`

## Limites deixados intocados

- nenhuma regra de progressão foi modificada;
- nenhum Marco, personagem ou membership foi criado ou alterado;
- nenhuma migration foi criada;
- o painel de fichas não possui mutação;
- a autorização de reviewer/progressão permanece a existente;
- a autorização de um Mestre de mesa comum continua sendo uma lacuna separada.
