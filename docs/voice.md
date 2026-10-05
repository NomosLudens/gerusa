# Voz unificada

A voz da Kaline usa uma infraestrutura comum para gravar, transcrever, responder e falar. O fluxo principal e:

1. Usuario toca no botao de voz.
2. O navegador pede permissao de microfone.
3. `MediaRecorder` grava apenas enquanto o estado visual esta ativo.
4. O audio vai para `/api/transcribe`.
5. O texto transcrito vai para `/api/chat`.
6. A resposta visual fica no chat.
7. A resposta falada passa por `prepareTextForSpeech` e `/api/tts`.

## Estados

Os estados comuns ficam em `src/lib/voice/voice-interaction.ts`:

- `idle`: pronto.
- `listening`: pedindo/abrindo microfone.
- `recording`: gravando.
- `transcribing`: convertendo audio em texto.
- `thinking`: aguardando resposta do chat.
- `speaking`: tocando TTS.
- `paused`: fala interrompida.
- `error`: falha recuperavel.
- `blocked`: microfone bloqueado.

Nenhum fluxo deve gravar sem gesto claro do usuario. Transcricao e resposta nao viram memoria automaticamente.

## Naturalidade da fala

Kokoro/Dora soa melhor quando recebe texto falavel: frases completas, pontuacao clara e blocos medios. A camada `src/lib/tts-naturalize.ts` aplica uma versao textual dos principios de SSML:

- pausas por sentenca e paragrafo;
- listas transformadas em fala corrida;
- markdown, tabelas, codigo e URLs removidos ou resumidos;
- datas, horarios, valores, siglas e nomes normalizados;
- chunks medios para evitar fala picotada ou longa demais.

Perfis de fala:

- `kaline`: mais fluida e conversacional.
- `klio`: mais curta, pausada e pedagogica.
- `kharis`: literal, simples e previsivel.

O padrao agora e Gemini 3.1 Flash TTS Preview com a voz Vindemiatrix, ajustavel por `OPENROUTER_TTS_MODEL`/`OPENROUTER_TTS_PRIMARY_MODEL` e `OPENROUTER_TTS_VOICE`. Se a chamada ao modelo primario falhar, a rota `/api/tts` cai automaticamente para Kokoro/`pf_dora` (configuravel por `OPENROUTER_TTS_FALLBACK_MODEL`/`OPENROUTER_TTS_FALLBACK_VOICE`) — o mesmo padrao vale para o chat (`google/gemini-2.5-flash-lite` → `poolside/laguna-xs-2.1`) e para a transcricao (`google/gemini-2.5-flash-lite` → `openai/whisper-large-v3`).

## Referencias

- Google Cloud Text-to-Speech SSML: pausas e marcacao de fala.
- Microsoft Speech SSML/prosody: ritmo, pitch e volume como propriedades de prosodia.
- W3C SSML 1.1: separacao entre texto visual e texto sintetizado.
- Kokoro-82M: recomendacao pratica de entradas medias, evitando extremos muito curtos ou longos.
- Kokoro voices: `pf_dora` como voz feminina em portugues.
