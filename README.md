# KALLISTIS

**Plataforma autoral de RPG, campanhas, personagens, sessões e ferramentas narrativas digitais.**

KALLISTIS reúne o domínio do jogo, o cânone, a aplicação web e as superfícies operacionais usadas por jogadores e Mestre. Este repositório é o núcleo técnico autoritativo do produto atual.

> **Runtime real antes de sucesso aparente.**
>
> Build, CI e mocks protegem contra regressão; não substituem prova funcional em runtime, persistência e autorização.

## Escopo atual

O repositório contém, entre outras superfícies:

- autenticação e sessões;
- perfis, identidade e contexto de usuário;
- Mesas, membros, campanhas e continuidade;
- criação e ciclo de personagens;
- fichas, progressão, perícias, capacidades e Manifestação;
- Chat Geral, chats privados e experiências de campanha;
- Mestre, NPCs, presença, mensagens privadas e Live Session;
- Momento / Pulso de Cena;
- memória e sedimentação;
- regras, cânone e Velarim;
- mídia e anexos;
- integrações delimitadas com Gravewright/VTT.

Funcionalidade planejada não é apresentada como funcional.

## Autoridade

A autoridade operacional e de domínio pertence a este repositório e aos seus artefatos canônicos atuais.

Documentos de referência:

- [KALLISTIS_AUTHORITY.md](./KALLISTIS_AUTHORITY.md)
- [.kallistis-authority.json](./.kallistis-authority.json)
- [ONTOLOGY.md](./ONTOLOGY.md)
- [RULES_2_0_IMPLEMENTATION_MAP.md](./RULES_2_0_IMPLEMENTATION_MAP.md)

Ambientes, snapshots e repositórios legados não devem ser usados como fallback nem reconciliados automaticamente com a autoridade corrente.

## Arquitetura

A aplicação atual usa uma camada de servidor para concentrar domínio, autorização e persistência.

```text
Browser
  ↓
KALLISTIS application server
  ↓
PostgreSQL
```

A camada de aplicação é responsável por ownership, autorização e contratos do domínio. O browser não acessa o PostgreSQL diretamente.

Principais tecnologias presentes:

- TypeScript;
- React 19;
- TanStack Router / Start / Query;
- Vite;
- Bun;
- PostgreSQL;
- integrações externas delimitadas por contrato;
- Vitest e Playwright para regressão automatizada.

## Cânone e regras

O sistema de regras, o mundo, personagens, progressão, histórico e demais autoridades ficcionais pertencem ao domínio KALLISTIS.

A árvore [CANON/](./CANON) e os contratos de autoridade devem prevalecer sobre textos históricos, snapshots, fixtures e material legado quando houver divergência.

## Gravewright

KALLISTIS e Gravewright têm responsabilidades distintas:

- **KALLISTIS** — autoridade de mundo, regras, personagens, progressão, histórico e continuidade;
- **Gravewright** — runtime VTT para campanha, cena, mapa, token, chat e realtime.

A integração deve respeitar contratos explícitos; o VTT não substitui a autoridade de domínio do KALLISTIS.

## Desenvolvimento

Requer Bun compatível com o lockfile do projeto.

```bash
bun install --frozen-lockfile
bun run dev
```

Gates principais:

```bash
bun run lint
bun run typecheck
bun run test
bun run build
bun run test:e2e
```

Quando aplicável, verificações adicionais de cânone, migrações e runtime devem ser executadas antes de promover alterações.

## Critério de validação

Uma mudança não é considerada entregue apenas porque compila.

A régua operacional é:

```text
CODE PASS
  ↓
RUNTIME PASS
  ↓
REAL DATA / PERSISTENCE PASS
  ↓
AUTHORIZATION PASS
  ↓
SAFE ROLLBACK
```

Mocks, placeholders, fallbacks fictícios e estados simulados não contam como funcionamento real.

## Estado

**Active development.**

Relatórios datados na raiz do repositório registram provas e incidentes específicos de cada execução. Eles devem ser lidos como evidência histórica do momento em que foram produzidos, não como substitutos do estado corrente do código e do runtime.

---

### Nomos Ludens

**Technology for human agency.**  
**Empower, not replace.**
