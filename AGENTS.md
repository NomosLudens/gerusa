# AGENTS.md

Metadados locais do Lovable foram removidos deste repositório. Se ainda existir vínculo externo, desconecte também no painel do Lovable e/ou nas instalações do GitHub App.

## KALLISTIS authority

KALLISTIS has exactly one operational authority: the recovery repository and runtime declared in `.kallistis-authority.json`.

Any other KALLISTIS checkout, Worker, Supabase project, wrangler config, or historical deployment is legacy and must never be used as a deployment target, synchronization target, fallback, or authority candidate.

Run `bun run deploy:kallistis` for deployment. It refuses to build or deploy unless the Recovery authority guard passes first.
