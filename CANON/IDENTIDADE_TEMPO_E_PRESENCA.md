# KALLISTIS — Identidade de Tempo e Presença

> Documento normativo para representar a continuidade temporal e a presença situada de pessoas, personagens, campanhas e sessões. Não substitui autenticação, autorização, regras canônicas ou persistência.

## 1. Finalidade

Este documento define como o sistema deve distinguir:

- o que aconteceu;
- o que está acontecendo agora;
- o que permanece como memória;
- o que é apenas expectativa;
- quem está presente;
- em qual espaço, campanha, mesa ou cena essa presença existe;
- qual fonte comprova cada estado.

Tempo e presença não são metadados decorativos. Eles determinam o escopo correto do contexto e impedem que uma lembrança, pessoa, personagem ou evento atravesse indevidamente campanhas, perfis ou cenas.

## 2. Princípio central

Nada deve ser apresentado como presente, passado, memória ou futuro sem uma origem identificável.

O sistema deve separar explicitamente:

```text
TEMPO_DECLARADO
TEMPO_REGISTRADO
TEMPO_DERIVADO
PRESENÇA_CONFIRMADA
PRESENÇA_INFERIDA
PRESENÇA_ENCERRADA
EXPECTATIVA
DESCONHECIDO
```

Quando a fonte não for suficiente, o sistema deve dizer que o estado é desconhecido ou não confirmado.

## 3. Eixos temporais

### 3.1 Passado comprovado

Inclui eventos, mensagens, decisões e alterações registrados por fonte verificável.

Requisitos mínimos:

- identificador da fonte;
- timestamp;
- perfil e escopo;
- tipo de evento;
- conteúdo ou referência suficiente para auditoria.

### 3.2 Presente operacional

É o estado vigente no momento da consulta ou da ação:

- sessão ativa;
- perfil autenticado;
- campanha selecionada;
- mesa e cena atuais;
- participantes presentes;
- personagem em uso;
- contexto carregado;
- serviço e fonte disponíveis.

O presente deve ser montado sob demanda. Não deve ser deduzido apenas do histórico antigo.

### 3.3 Futuro e expectativa

Planos, intenções, promessas e próximos passos devem ser marcados como expectativa até que uma execução comprovada os transforme em fato.

```text
intenção ≠ execução
plano ≠ evento
previsão ≠ fato
reserva ≠ presença
```

## 4. Presença

Presença é sempre situada. Uma entidade não está simplesmente “presente”; está presente em determinado escopo.

O registro de presença deve poder responder:

```text
quem está presente?
em qual perfil?
em qual campanha?
em qual mesa?
em qual cena?
desde quando?
até quando?
qual fonte confirma isso?
qual é o estado atual?
```

Estados permitidos:

```text
INVITED
AVAILABLE
PRESENT
ABSENT
AWAY
DISCONNECTED
LEFT
UNKNOWN
```

Uma sessão encerrada não deve continuar sendo tratada como presença atual.

## 5. Continuidade

Continuidade não significa carregar tudo para sempre.

O contexto vivo deve transportar apenas o que for pertinente ao momento atual, mantendo os vínculos com:

- origem;
- perfil;
- campanha;
- personagem;
- conversa;
- sessão;
- cena;
- versão da fonte.

Uma síntese temporal pode compactar informação, mas nunca deve apagar silenciosamente os registros que a originaram.

## 6. Relação com memória

```text
evento registrado
→ interpretação contextual
→ hipótese ou sedimento
→ revisão humana
→ memória confirmada
```

Memória confirmada continua sendo uma memória de determinado momento. Ela não deve ser tratada como verdade atemporal quando o escopo ou o estado mudou.

Toda memória deve conservar:

- data de criação;
- data de confirmação;
- origem;
- escopo;
- confiança;
- possibilidade de revogação;
- relação com eventos anteriores.

## 7. Conflitos temporais

Se duas fontes divergirem, o sistema não deve escolher silenciosamente uma versão.

Deve registrar:

```text
CONFLICT
SOURCE_A
SOURCE_B
TEMPORAL_SCOPE_A
TEMPORAL_SCOPE_B
REVIEW_REQUIRED
```

Uma informação mais recente não invalida automaticamente uma informação histórica; pode representar mudança de estado.

## 8. Regras do Hermes

Hermes deve:

- identificar o tempo e a presença relevantes antes de responder;
- distinguir evento passado de estado presente;
- marcar expectativa como expectativa;
- declarar ausência de fonte;
- respeitar o perfil e o escopo da sessão;
- evitar transportar contexto de outra cena, mesa ou campanha;
- preservar a proveniência das afirmações importantes.

Hermes não deve:

- inventar timestamps;
- afirmar presença sem fonte;
- tratar conexão antiga como presença atual;
- transformar intenção em ação realizada;
- transformar hipótese em memória confirmada;
- usar tempo ou presença para contornar autorização.

## 9. Relação com arquitetura

Este documento complementa:

- `IDENTIDADE.md`;
- `CONTEXTO.md`;
- `ROTEADOR_DE_IDENTIDADE`;
- `ROLEPLAY_E_CONTEXTO`;
- `USER_PROFILE`;
- `CHARACTER`;
- `CAMPAIGN`;
- `PERSISTENT_MEMORY`;
- `RECENT_HISTORY`;
- `LIVE_SESSION`.

Tempo e presença devem ser resolvidos pelo servidor e pelo contexto autorizado. Nunca devem depender apenas de texto enviado pelo cliente ou de instruções do prompt.

## 10. Regra de fechamento

Quando não houver prova suficiente, a resposta correta é:

> Não tenho base suficiente para afirmar o tempo ou a presença desse evento.
