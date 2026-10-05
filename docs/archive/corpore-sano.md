# Corpore Sano

Corpore Sano é a superfície da Kaline para treino, sinais corporais, recuperação e disciplina corporal calma.

A superfície oficial é `/corpore-sano`.

Treinos é uma função interna do Corpore Sano, não o nome principal do app.

## Persistência

A persistência principal usa Supabase.

Tabelas usadas:

- public.treino_sessoes
- public.treino_sessao_exercicios
- public.treino_series
- public.corpo_sinais

O localStorage é usado apenas como apoio local da interface.

## Fluxos reais

- iniciar sessão
- registrar série
- encerrar sessão
- registrar sinais corporais
- carregar atividade recente

## Fora desta fase

- sem IA
- sem OpenRouter
- sem wearable
- sem Amazfit
- sem Health Connect
- sem recomendação automática de treino
- sem plano adaptativo

Fase futura: importar dados corporais de wearables, como Amazfit, por meio de Health Connect ou app ponte Android, com permissão explícita do usuário.
