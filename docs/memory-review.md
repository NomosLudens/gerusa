# Revisão, Jardim e Mnemósine

Nada entra no Jardim/Mnemósine sem revisão humana.

## Conceitos

- **Candidato à memória**: sugestão pendente em `memory_candidates`. Pode vir de chat, Câmara do Eco, Códice, Registro Vivo, ação manual ou sistema. Ainda não é memória.
- **Revisão**: rota `/revisao`, onde o usuário aprova, edita e aprova, recusa ou arquiva candidatos.
- **Jardim / Mnemósine**: rota `/jardim`, usando `jardim_memorias` para memórias aprovadas e duráveis, com revisão espaçada.

## Tabelas

- `memory_candidates`: fila de candidatos com `domain`, `source`, `source_id`, `title`, `content`, `reason`, `sensitivity`, `status`, `reviewed_at`, `reviewed_by`, `approved_memory_id` e `metadata`.
- `jardim_memorias`: memórias duráveis já existentes. Aprovar um candidato cria uma linha nessa tabela e grava o id em `approved_memory_id`.

As duas tabelas usam RLS por `user_id`. Usuário comum não deve acessar candidato ou memória de outro usuário.

## Fluxo

1. Câmara, Códice, Registro Vivo ou outro motor cria candidatos.
2. `/revisao` lista apenas candidatos `pending`.
3. O usuário aprova direto, edita e aprova, recusa ou arquiva.
4. Só a aprovação cria memória durável em `jardim_memorias`.
5. Candidato aprovado deixa de aparecer como pendente.

## Origens

- `camara-do-eco`: decisões, pendências e contexto de reunião.
- `codice`: conceitos, margens e sínteses de leitura.
- `registro-vivo`: registros manuais enviados para revisão.
- `chat`, `manual`, `system`: reservados para fluxos futuros ou explícitos.

## Limites

Este PR não cria embeddings, busca semântica, grafo visual ou memória automática invisível. A revisão humana continua obrigatória.
