# Route Boundary Hygiene

A regra para as rotas e aplicativos arquivados (que não fazem parte do escopo da Kaline Clean) é:

- **Ocultação UI**: A shell (`app-registry.ts` e `identity-routing.ts`) já esconde apps arquivados.
- **Bloqueio Direto**: Em `use-authz.ts` (na função `canAccessPath`), o acesso via URL direta a qualquer app arquivado (`isArchivedApp(app.id)`) é rigidamente bloqueado (retornando false).
- **Redirecionamento Legado**: As rotas legadas (`resolveLegacyPath`) são mantidas no código para resolver o caminho canônico. Após a resolução, se o app de destino for arquivado, o acesso é bloqueado. Isso evita "telas brancas" ou exclusão em massa de componentes antigos que poderiam quebrar outras partes do sistema.
- **Kaline Presente**: O app "Kaline Presente" é mantido na lista pública, porém é explicitamente restrito usando `adminOnly: true`.

Estas regras evitam deletar os arquivos físicos das rotas (como `routeTree.gen.ts`) e mantêm o roteador intacto, fechando apenas o escopo de uso real na aplicação final.
