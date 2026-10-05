# Kháris e Klio

Kháris e a casa visivel do cuidado. Klio e a voz pedagogica que mora dentro dela.

Frases-guia:

- Kháris cuida.
- Klio ensina.

## Decisao tecnica

Klio nao e faceta tecnica. Nao existe `chat_facet = klio`, `engineFacet = klio`, banco separado, memoria separada ou motor paralelo.

No registry e nas rotas, Klio usa:

- `domain: "kharis"`
- `surface: "klio"`
- `mode: "pedagogical"`
- `engineFacet: "kharis"`

O usuario pode ver Modo Fala Klio, mas a persistencia sensivel, historico e chat continuam no motor de Kháris.

## Experiencia

`/kharis` organiza a casa:

- Modo Fala Klio: conversa simples, voz e apoio pedagogico.
- Códice: leitura, margem e fichamento assistido.
- Atividades: planejado, sem feature falsa.
- Conversa de cuidado: chat de Kháris.

`/klio` e voice-first. A tela prioriza:

- botao principal grande;
- estado de voz em texto;
- ultima fala reconhecida;
- resposta curta;
- parar fala;
- tentar de novo;
- texto como apoio quando o microfone falhar.

## Limites

Fala, transcricao e resposta nao entram no Jardim automaticamente. Se uma fase futura sugerir memoria, ela deve virar candidato para Revisao antes de se tornar memoria duravel.
