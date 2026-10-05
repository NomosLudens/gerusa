# Relatório de Poda (Prune) — Kaline Clean

**Data:** 09/07/2026
**Objetivo:** Remover superfícies mortas da Kaline Clean após a extração da Kuan-Yin, mantendo estritamente as funcionalidades core da assistente pessoal Kaline.

## Resumo da Poda

A regra central do PR de Poda ("O melhor código é o código que nunca foi escrito") foi aplicada rigorosamente. Foram eliminados módulos órfãos e aplicações que não pertencem mais ao escopo central da Kaline Clean.

### Módulos Removidos (Rotas)

As seguintes superfícies e rotas associadas foram apagadas completamente de `src/routes/`:

- **Kuan-Yin** (`/kuan-yin`, `/kuan-yin/*`)
- **Klio / Códice** (`/klio`, `/codice`)
- **Corpore Sano / Treinos** (`/corpore-sano`, `/treino`)
- **Portal Comercial / Jurídico** (`/portal.$token`, `/juridico`)
- **Drive** (`/drive`)
- **Identidade** (`/identidade` - dashboard não core)

### Componentes e Lógica Removidos

- Componentes órfãos da Kuan-Yin (`KuanyinActionCard.tsx`).
- Lógica de extração e validação de `kuanyin-action` e integridade (`kuanyin-action.ts`, `kuanyin-integrity.ts`).
- Hooks customizados específicos de módulos mortos.
- Remoção do prompt anti-alucinação comercial/jurídico (`legal-prompt.ts`), que era usado principalmente pelas facetas de negócios.
- Dependências legadas na hierarquia de chat e UI associadas à `Kuan-Yin` e `Klio`.

### Atualização do Core (Configurações e Roteamento)

Para garantir a limpeza, as configurações vitais do App foram ajustadas:

- **`src/lib/app-registry.ts`**: Removidas as aplicações deletadas. Apenas as superfícies essenciais (`chat`, `registro-vivo`, `jardim`, `revisao`, `agenda`, `camara`, `perfil`, `perfis`, `kaline-presente`) e a travessia (`trilha`) permaneceram no registro.
- **`src/lib/identity-routing.ts`**: Limpeza dos `ARCHIVED_APP_IDS` e do mapeamento de rotas legadas.
- **`src/lib/use-authz.ts`**: Apenas as facetas estritamente pertencentes à Kaline (`kaline`, `kharis`) mantiveram-se no controle de autorização.
- **Route Tree**: O arquivo `src/routeTree.gen.ts` foi gerado novamente usando a CLI do `@tanstack/router`, refletindo a exclusão definitiva das rotas.

## O Que Foi Mantido

De acordo com as restrições:

- O banco de dados (Supabase schemas e RPCs), _migrations_ e os tipos de TypeScript gerados (`src/integrations/supabase/types.ts`) **não** foram tocados.
- As superfícies centrais (`/chat`, `auth`, `shell mobile`, `Ledger`, `Revisão`, `Jardim`, `Agenda`, etc.) e os componentes compartilhados por essas superfícies não sofreram cortes estruturais.

## Documentação Legada

Todos os documentos de design de arquitetura antigos relacionados ao Códice, Jurídico, Klio, Kuan-Yin, Corpore Sano, entre outros, foram movidos com segurança para `docs/archive/`. Isso garante que as referências da arquitetura anterior permaneçam preservadas sem poluir o diretório principal da arquitetura Kaline Clean.

## Validação e Verificação

- **TypeScript Typecheck** (`bun run typecheck`): Verificado, limpo. Referências ausentes de importações foram corrigidas.
- **Build** (`bun run build`): Verificado compilação das dependências.
- **Testes**: A cobertura de testes existente da camada `chat-response-structure` foi adaptada para remover asserções de Kuan-Yin e reflete as duas facetas em vigor.
- **Diff Check**: `git diff --check` aprovado, atestando conformidade com ausência de conflitos não rastreados.

O repositório agora representa estritamente o ambiente enxuto projetado para a _Kaline Clean_.
