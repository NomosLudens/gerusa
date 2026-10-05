# Brand assets

Coloque aqui, manualmente pelo GitHub, os arquivos reais de avatares e maçãs usados pelo app. O wordmark da Kaline fica em `public/kaline-wordmark.png`.

## Caminho

`public/brand-assets/`

Tudo que estiver nesta pasta será servido pelo app a partir de `/brand-assets/<nome-do-arquivo>`.

## Arquivos esperados

Suba os arquivos com exatamente estes nomes:

### Kaline

- `kaline-avatar.webp`
- `kaline-apple.webp`
- `kaline-apple.png`

### Klio

- `klio.png`
- `klio-apple.png`

### Ká

- `ka.png`
- `ka-apple.png`

### Khora

- `khora-avatar.webp`
- `khora-avatar.png`
- `khora-apple.webp`
- `khora-apple.png`

### Kuan-Yin

- `kuanyin-avatar.webp`
- `kuanyin-avatar.png`
- `kuanyin-apple.webp`
- `kuanyin-apple.png`

### Drive

- `kaline-drive-avatar.webp`
- `kaline-drive-avatar.png`
- `kaline-drive-apple.webp`
- `kaline-drive-apple.png`

## Observação

Os arquivos `.asset.json` em `src/assets/` já apontam para este diretório. Depois que os arquivos reais forem adicionados aqui, as telas que importam esses metadados vão carregar os assets locais sem depender do caminho externo `__l5e`.
