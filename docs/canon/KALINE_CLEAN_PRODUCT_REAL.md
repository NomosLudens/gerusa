# Kaline Clean — Produto Real

- Build, lint, CI e PR limpo não significam app funcionando.
- Nunca chamar mock de produto real.
- Nunca usar placeholder, `setTimeout`, hardcoded ou simulação fingindo produção.
- Se app funcional quebrou, primeira opção é rollback.
- Produto funcionando > arquitetura bonita.
- App abre no mobile > arquitetura elegante.
- Dado real validado > dashboard bonito.
- Estado vazio honesto > simulação.
- Falha explícita > fallback silencioso mentiroso.
- Se não foi testado manualmente, não declarar pronto.

## Aplicação na Kaline Clean

- Todo PR deve dizer o que foi testado manualmente.
- Se não havia dado real, declarar isso.
- Handoff aprovado não significa integração externa executada.
- Ledger falhar não pode derrubar chat.
- Runtime Boundary não pode chamar LLM para escopo bloqueado.
- Kuan-Yin não deve ser reativada na Kaline Clean.
