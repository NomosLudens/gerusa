# Migrações arquivadas — histórico V26

Estes 18 arquivos são o histórico real de como o schema foi crescendo entre
24/06/2026 19:22 e 22:32. Eles **não são aplicados** mais — o Supabase só lê
`supabase/migrations/`.

A partir desta consolidação, o estado canônico do banco vive em um único
arquivo:

    supabase/migrations/20260101000000_baseline.sql

Esse baseline é a concatenação ordenada destes 18 arquivos. Aplicar apenas
ele em uma instância nova (Cloudflare D1 não serve — precisa ser Postgres /
Supabase) reproduz exatamente o schema atual: tabelas, índices, RLS,
políticas, funções, triggers e enums.

## Por que arquivar e não deletar

- Preserva o raciocínio de cada passo (útil para auditoria e para entender
  por que certas colunas existem).
- Permite cherry-pick se um dia precisarmos extrair um pedaço isolado.
- Não custa nada — são 49KB de texto.

## Como migrar para outra instância Postgres

1. Provisionar a instância nova.
2. Rodar `supabase/migrations/20260101000000_baseline.sql` uma vez.
3. Pronto. Schema idêntico, zero migrações defensivas, zero ruído.

## Regras daqui pra frente

- Qualquer mudança de schema entra como **nova** migração em
  `supabase/migrations/`, com timestamp posterior a `20260101000000`.
- O baseline não é mais editado — ele é o ponto fixo.
- Se acumularem muitas migrações novas, repetir esta consolidação:
  mover as novas para cá, regerar o baseline.
