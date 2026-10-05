# MicroappHost da Kaline

## 1. O que é `MicroappHost`

`MicroappHost` é o componente React padrão para hospedar microapps HTML dentro do shell autenticado da Kaline. Ele centraliza iframe, `?embedded=1`, loading, fallback, timeout, sandbox e validação conservadora de `postMessage`.

A regra arquitetural é:

> HTML não autentica. HTML não guarda segredo. HTML não acessa Supabase direto. HTML não chama OpenRouter direto. HTML não executa motor sensível. HTML pede. Host valida. Motor executa. HTML exibe.

## 2. HTML, host, motor e Supabase

- **Microapp HTML**: superfície visual especializada, servida de `public/`, sem segredos e sem acesso direto a dados privados.
- **Host React**: ponte autenticada dentro da Kaline. Renderiza o iframe, valida mensagens e decide se um pedido pode avançar.
- **Motor**: capacidade real compartilhada, como leitura, transcrição, memória, TTS ou fichamento.
- **Supabase/APIs**: camada de persistência e execução segura. Não deve ser chamada por HTML público.

Neste PR, o host apenas valida, registra e prepara a ponte; ele não executa motores reais.

## 3. Como adicionar novo microapp HTML

1. Coloque o HTML em `public/<microapp>/index.html`.
2. Garanta que o HTML suporte modo embutido via `?embedded=1` para remover header duplicado, margens externas ou navegação própria.
3. Declare o app em `src/lib/app-registry.ts` com `kind: "microapp-html"`.
4. Adicione defaults em `MICROAPP_REGISTRY_DEFAULTS`, se o `src`, `expectedSource` ou `allowedActions` não puderem ser derivados do registry.
5. Renderize `<MicroappHost appId="id-do-app" />` ou crie um host específico fino que só passe callbacks conservadores.

## 4. Como declarar no `app-registry`

Um microapp HTML deve ter pelo menos:

```ts
{
  id: "codice",
  label: "Códice",
  path: "/klio/codice",
  domain: "kharis",
  surface: "codice",
  engineFacet: "kharis",
  kind: "microapp-html",
  status: "mock",
}
```

O registry continua sendo a fonte de verdade para `id`, `label`, `path`, `status`, `domain`, `surface` e `engineFacet`. O host não deve duplicar esses campos quando o `appId` bastar.

## 5. `expectedSource`

`expectedSource` é o valor lógico que o HTML deve enviar em `postMessage`:

```ts
{ source: "codice", action: "codice:view-change" }
```

O host rejeita mensagens cujo `source` não seja o esperado. Para Câmara do Eco, por exemplo, o valor esperado é `camara-do-eco`.

## 6. `allowedActions`

`allowedActions` limita o vocabulário aceito pelo host. Se configurado, qualquer ação fora da lista é ignorada. Exemplos:

- Códice: `codice:view-change`, `codice:upload-request`, `codice:open-document`, `codice:generate-summary`, `codice:summary-ready`, `codice:save-note`, `codice:wake-lock-toggle`, `codice:theme-change`, `codice:font-change`.
- Câmara do Eco: `eco:view-change`, `eco:record-start`, `eco:record-stop`, `eco:process-start`, `eco:process-complete`, `eco:copy-output`, `eco:download-output`, `eco:memory-candidate`, `eco:error`.

## 7. Como funciona `?embedded=1`

Quando `embedded` está ativo, o host adiciona automaticamente `embedded=1` à URL:

- `/codice/index.html` vira `/codice/index.html?embedded=1`.
- `/x.html?a=1` vira `/x.html?a=1&embedded=1`.

Isso evita headers duplicados e permite que o HTML ajuste layout para iframe/PWA.

## 7.1 Cor do domínio no HTML

O iframe é um documento separado e **não herda as variáveis CSS do shell** (`--gold`, `--kaline`, etc. em `src/styles.css`) — cada HTML precisa hardcodar sua própria paleta em `<style>`.

Ao criar a paleta, use a cor real do `domain` declarado no `app-registry` para esse app, não uma cor inventada. Os tokens oficiais estão em `src/styles.css`:

```
--kaline: #ff4400  (laranja neon)
--klio:   #7a1f2b  (vinho acadêmico)
--khora:  #a56a43  (cobre-terra)
--kharis: #1d3354  (azul profundo)
--kairos: #6c8ead  (azul névoa)
--kuanyin:#be185d  (magenta)
--drive:  #16a34a  (verde)
```

Se a cor do domínio for escura demais para funcionar como texto/destaque em fundo escuro (caso do Kháris, por exemplo), use a cor verdadeira em bordas/fundos/sombras, e uma variante mais clara da mesma família (mesmo matiz, luminosidade maior) para título/texto/botão — o próprio shell resolve esse mesmo problema com `color-mix()` nas variáveis derivadas. Não adote uma paleta "dourado genérico" só porque outro microapp já fez isso; confira a cor real do domínio primeiro.

## 8. Loading, timeout e fallback

O host possui estados `loading`, `loaded`, `error` e `blocked`.

- Durante o carregamento, mostra “Abrindo <título>...” em vez de tela branca.
- Após timeout configurável, mostra aviso discreto, sem quebrar se o iframe carregar depois.
- Em erro ou bloqueio, mostra mensagem amigável e botões “Recarregar” e “Voltar para Home”.
- Apps `planned`, `hidden` e `legacy` não tentam carregar iframe inexistente.

## 9. Validação de `postMessage`

O contrato mínimo de evento é:

```ts
{
  source: string;
  action: string;
  payload?: unknown;
  timestamp?: number;
}
```

O host valida:

- `event.origin === window.location.origin`;
- `event.source === iframe.contentWindow`;
- `data.source` é string e bate com `expectedSource`;
- `data.action` é string;
- `data.action` pertence a `allowedActions`, quando a lista existe.

Mensagens inválidas são ignoradas. Em desenvolvimento, elas podem ser registradas via `console.debug`.

## 10. Regras de segurança

Microapps HTML são superfícies visuais. Eles podem emitir pedidos para o host, mas não executam ações sensíveis diretamente.

O host deve validar:

- origem da mensagem;
- janela de origem;
- campo `source`;
- campo `action`;
- lista de ações permitidas;
- autorização do usuário autenticado antes de qualquer integração real futura.

Nenhum microapp HTML deve acessar Supabase, OpenRouter, chaves de API ou dados privados diretamente.

O sandbox padrão é:

```txt
allow-scripts allow-same-origin allow-forms allow-downloads
```

`allow-same-origin` junto de `allow-scripts` é aceitável aqui porque os HTMLs são internos do próprio app, mas isso exige disciplina: não colocar segredos no HTML público e não tratar payload de iframe como confiável.

## 11. Exemplos

### Códice

```tsx
<MicroappHost
  appId="codice"
  title="Códice"
  expectedSource="codice"
  allowedActions={CODICE_MICROAPP_ACTIONS}
  loadingLabel="Abrindo Códice..."
/>
```

O host valida eventos do Códice. A experiência visual HTML continua isolada, enquanto as rotas autenticadas do Códice executam acervo, margem e fichamento fase 1 sem expor Supabase/OpenRouter ao HTML público.

### Câmara do Eco

```tsx
<MicroappHost
  appId="camara-do-eco"
  title="Câmara do Eco"
  expectedSource="camara-do-eco"
  allowedActions={CAMARA_DO_ECO_MICROAPP_ACTIONS}
  loadingLabel="Abrindo Câmara do Eco..."
/>
```

A Câmara do Eco é uma superfície HTML de reuniões, carregada pelo `MicroappHost`.

- Rota: `/camara-do-eco`
- HTML: `/camara-do-eco/index.html`
- Source esperado: `camara-do-eco`
- Status atual: `real`
- Motor real: fase 1 para texto colado
- Não acessa Supabase/OpenRouter diretamente

A Câmara pode emitir eventos de gravação/processamento visual. O host também oferece uma ponte real fase 1 para texto colado: processa a reunião, persiste a sessão e cria candidatos em `memory_candidates`. Nada é salvo como memória durável sem revisão humana em `/revisao`.
