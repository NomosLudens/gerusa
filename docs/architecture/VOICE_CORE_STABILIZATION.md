# Voice Core Stabilization

## Problema

A transcrição é infraestrutura central da Kaline Clean.
Se a fala vira texto ruim, todo o produto fica ruim:

- Kaline Presente;
- Câmara/Caverna do Eco;
- Registro Vivo;
- memória;
- sedimentação;
- revisão.

## Decisões

- Kaline Presente deixa de ser admin-only.
- STT primário passa a ser openai/whisper-large-v3.
- Turbo vira fallback.
- Câmara/Caverna usa revisão segura de transcrição.
- Captura de áudio passa a pedir echoCancellation, noiseSuppression, autoGainControl e channelCount 1.
- TTS primário da Kaline é google/gemini-3.1-flash-tts-preview com voz Vindemiatrix (fallback: hexgrad/kokoro-82m com voz pf_dora).
- Nenhuma migration.
- Nenhuma feature nova.

## Modelo de revisão mecânica

- STT bruto é a fonte de verdade.
- A revisão usa poolside/laguna-xs-2.1 por ser uma etapa lógica/mecânica.
- gpt-5-nano não deve ser usado para revisão de blocos da Câmara, pois pode acionar content_filter.
- Se a revisão falhar, recusar, expandir ou truncar, o texto bruto é preservado.

## Fora de escopo

- Registro Vivo por voz.
- Novo player.
- Nova UI.
- Diarização.
- Upload permanente de áudio.
- Resumo automático.
- Memória automática.
- Dashboard.
