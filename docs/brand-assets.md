# Brand assets

## Pasta destino

Suba manualmente os arquivos reais no GitHub em:

```txt
public/brand-assets/
```

No app, essa pasta é servida como:

```txt
/brand-assets/<nome-do-arquivo>
```

## Padrão dos arquivos

Todos os avatares e todas as maçãs devem ser:

- PNG
- `180 × 180 px`
- avatares já recortados redondos
- maçãs com fundo transparente

O wordmark é a exceção: use `public/kaline-wordmark.png` em PNG transparente horizontal, recomendado `1200 × 300 px` ou proporção próxima de `4:1`.

## Nomes exatos

```txt
public/brand-assets/kaline-avatar.png
public/brand-assets/kaline-apple.png
public/kaline-wordmark.png

public/brand-assets/klio.png
public/brand-assets/klio-apple.png

public/brand-assets/ka.png
public/brand-assets/ka-apple.png

public/brand-assets/khora-avatar.png
public/brand-assets/khora-apple.png

public/brand-assets/kuanyin-avatar.png
public/brand-assets/kuanyin-apple.png

public/brand-assets/kaline-drive-avatar.png
public/brand-assets/kaline-drive-apple.png
```

## Tamanhos de exibição atuais

| Uso no app               | Tamanho exibido                                         |
| ------------------------ | ------------------------------------------------------- |
| Avatar no chat           | `36 × 36 px`                                            |
| Avatar nas facetas       | `64 × 64 px` no mobile, `80 × 80 px` em telas maiores   |
| Avatar Khora nos treinos | `56 × 56 px` no mobile, `64 × 64 px` em telas maiores   |
| Avatar Drive             | `80 × 80 px` no mobile, `96 × 96 px` em telas maiores   |
| Maçã na tela de login    | `96 × 96 px` no mobile, `112 × 112 px` em telas maiores |
| Maçã no header/menu      | entre `16 × 16 px` e `40 × 40 px`                       |
| Maçã nas facetas         | `28 × 28 px`                                            |
| Maçã Drive no header     | `28 × 28 px`                                            |
| Wordmark                 | altura entre `16 px` e `32 px`, largura automática      |
