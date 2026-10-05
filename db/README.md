# KALLISTIS — PostgreSQL local

O núcleo KALLISTIS usa a database independente `kallistis` no cluster
PostgreSQL `16/kaline`, porta `5433`, com a role de runtime `kallistis`. A
database, role e serviço `kaline` são distintos e intocáveis.

## Ordem das migrations

1. `0001_identity.sql`
2. `0002_chat.sql`
3. `0003_memory.sql`
4. `0004_memory_atomic.sql`
5. `0005_runtime_grants.sql`
6. `0006_runtime_chat_grants.sql`
7. `0007_schema_migrations.sql`
8. `0008_core_hardening.sql`
9. `0009_restore_chat_upsert.sql`
10. `0010_characters.sql`
11. `0011_character_publication_and_progression_hardening.sql`

Migrations aplicadas são história imutável: nunca editar um arquivo já
aplicado. Mudanças de schema ou grants recebem um novo número monotônico e
são aplicadas aditivamente somente em `kallistis`.

## Proveniência

`public.kallistis_schema_migrations` registra `version`, `filename`, checksum
SHA-256, estado de verificação e timestamps. Migrations históricas entram
apenas como `VERIFIED_EXISTING` depois de seus efeitos serem verificados na
base real; a data original de aplicação não é inventada. Uma migration aplicada
durante a missão é registrada como `APPLIED_IN_THIS_RUN`.

A aplicação web não executa provisioning. O serviço usa a role `kallistis`;
criação de identidade usa o script administrativo com
`KALLISTIS_PROVISION_DATABASE_URL`, nunca a URL do runtime e nunca uma API
pública. Segredos ficam fora do Git e não são impressos.

Não executar estas migrations contra `kaline`, contra o serviço `/srv/kaline`
ou contra banco paralelo.
