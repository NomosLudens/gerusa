# Câmara do Eco como microapp

## 1. O que é a Câmara do Eco

A Câmara do Eco é o domínio de transcrição e síntese de reuniões da Kaline. Ela transforma uma reunião em transcrição, ata estruturada, decisões, pendências, responsáveis, prazos, candidatos à memória e exportação.

Frase conceitual:

> Câmara do Eco é onde a reunião deixa de ser ruído e vira memória, decisão e caminho.

## 2. Diferença entre Câmara do Eco e Códice

A Câmara do Eco não é Códice, Livros, leitor de PDF, chat genérico, Kuan-Yin, Registro Vivo ou Kaline Drive.

- **Códice/Klio**: leitura, fichamento, margem, estudo e experiência de e-reader.
- **Câmara do Eco**: reunião, transcrição, ata, decisões, pendências, responsáveis, prazos e memória candidata.

Essa separação protege o motor de leitura da Klio e evita que uma reunião seja tratada como documento de leitura.

## 3. Arquitetura

A integração segue a arquitetura de microapp/superfície:

```txt
HTML da Câmara do Eco
= superfície visual e experiência de uso mockada

CamaraDoEcoHost React
= host autenticado, ponte segura e integração futura

Motor existente
= transcrição, síntese, segmentos de áudio, análise e memória candidata

Supabase/API
= dados e persistência sempre pelo app autenticado
```

O HTML é uma superfície visual pública e não executa persistência real. Dados privados nunca devem ficar em `public/`.

## 4. Caminhos criados ou envolvidos

- `public/camara-do-eco/index.html`: superfície visual mockada da Câmara do Eco.
- `src/components/microapps/CamaraDoEcoHost.tsx`: host React autenticado que renderiza o iframe e escuta eventos.
- `src/routes/_authenticated/camara-do-eco.tsx`: rota autenticada principal `/camara-do-eco`.
- `src/components/app-sidebar.tsx`: navegação principal com item “Câmara do Eco”.
- `public/sw.js`: versão do cache PWA atualizada para evitar HTML antigo em app instalado.

Caminhos existentes preservados:

- `src/routes/_authenticated/camara.tsx`: rota antiga `/camara`, com motor real de sessões, gravação, segmentos, transcrição e análise.
- `src/routes/api/camara-transcribe-segment.ts`: endpoint autenticado para transcrição de segmento da Câmara.
- `src/routes/api/transcribe.ts`: endpoint autenticado de transcrição geral.
- `src/lib/transcribe.server.ts`: motor server-side de transcrição.
- `src/lib/camara.functions.ts`: funções server-side de análise, semeadura de hipótese e retorno Kairós.
- tabelas `camara_sessoes` e `camara_segmentos`.
- bucket privado `camara-audio`.

## 5. Eventos emitidos pelo HTML

O HTML emite eventos com `postMessage` apenas para o host pai, sempre com:

```ts
{
  source: "camara-do-eco",
  action: string,
  payload?: unknown,
  timestamp: number
}
```

Eventos previstos:

- `eco:view-change`
- `eco:process-start`
- `eco:process-complete`
- `eco:record-start`
- `eco:record-stop`
- `eco:copy-output`
- `eco:download-output`
- `eco:memory-candidate`
- `eco:error`

## 6. Eventos tratados pelo host

O `CamaraDoEcoHost` valida que:

1. `event.source` é a janela do iframe renderizado.
2. `event.data.source` é exatamente `camara-do-eco`.
3. `event.data.action` é uma string.

O host mantém os estados:

- `idle`
- `mock-recording`
- `mock-processing`
- `mock-ready`
- `error`

Tratamentos atuais:

- `eco:process-start` → status “Processando reunião mockada” e toast discreto.
- `eco:process-complete` → status “Eco organizado” e toast de sucesso.
- `eco:record-start` → status “Gravação mockada em andamento”.
- `eco:record-stop` → status de processamento mockado.
- `eco:view-change` → atualiza a visualização corrente no host.
- `eco:copy-output` → informa cópia mockada.
- `eco:download-output` → informa download mockado.

## 7. O que ainda está mockado

A superfície HTML ainda é visual/mockada:

- gravação;
- upload;
- processamento;
- transcrição;
- ata;
- decisões;
- pendências;
- memória candidata;
- cópia/exportação de resumo.

O mock não cria sessões reais, não salva áudio, não chama Supabase, não chama APIs e não usa dados privados reais.

## 8. Como integrar motor real depois

A integração real deve acontecer pelo host autenticado, não pelo HTML público.

Caminho sugerido para PR futuro:

1. Mapear quais ações do HTML devem virar comandos reais no host.
2. Definir payloads seguros para texto colado, arquivos e sessões.
3. Reusar o fluxo existente de `/camara` quando possível:
   - criar `camara_sessoes` pelo app autenticado;
   - salvar segmentos no bucket privado `camara-audio`;
   - chamar `/api/camara-transcribe-segment` com `authedFetch`;
   - chamar `analisarCamara` para síntese/ata;
   - manter `semearHipoteseCamara` como gesto explícito e revisável.
4. Enviar resultados reais de volta ao iframe apenas por payloads controlados, sem segredos.
5. Manter limites de tamanho, autenticação e rate limit nos endpoints existentes.

Não criar endpoint novo se o endpoint existente não for suficiente; primeiro documentar contrato, autenticação, formato de entrada e formato de saída.

## 9. Critérios de segurança

- O HTML não acessa Supabase diretamente.
- O HTML não contém chaves.
- O HTML não contém segredo.
- O HTML não contém dados privados reais.
- O HTML não substitui o motor existente.
- Toda persistência deve passar pelo app autenticado, API autenticada ou server functions.
- Dados privados nunca devem ficar em `public/`.
- Eventos de iframe devem validar origem lógica (`source`) e janela emissora (`event.source`).
- Memórias continuam candidatas; nada entra no Jardim automaticamente.
