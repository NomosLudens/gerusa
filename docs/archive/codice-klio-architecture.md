# Códice — domínio de leitura da Klio

> Documento de arquitetura e contexto criado a partir da conversa de planejamento sobre a substituição da antiga aba **Livros** por uma nova experiência de leitura chamada **Códice**.

## 1. Decisão principal

A antiga aba **Livros** deve deixar de existir como experiência visual antiga e passar a se chamar **Códice**.

O Códice entra no domínio de **Klio**.

```txt
Klio
├── Modo Fala
├── Atividades
├── Códice
└── Leitura assistida
```

O Códice não é uma biblioteca genérica, nem um chat, nem uma cópia da Câmara do Eco. Ele é o espaço de leitura da Klio: um e-reader interno para subir, abrir, ler, fichar e anotar livros, artigos e textos em formato confortável para celular.

## 2. Motivo do nome

O nome escolhido foi **Códice**.

Motivos:

- é simbólico;
- remete a livro, manuscrito, arquivo, estudo e preservação;
- conversa discretamente com a inspiração do **Codex**;
- evita repetir o termo “Vivo”, já usado em outros domínios da arquitetura;
- é mais forte e mais elegante que “Livros” ou “Biblioteca Viva”.

Frase conceitual:

> Códice é onde a Kaline transforma arquivo em leitura, leitura em margem, margem em memória.

## 3. Domínio correto

O Códice pertence visual e conceitualmente à Klio.

```txt
Códice = domínio de leitura da Klio
```

Mas o motor técnico pode continuar genérico e reaproveitável.

```txt
Códice visualmente pertence à Klio.
Motor tecnicamente pode servir a outros domínios no futuro.
```

Isso permite que, futuramente, o mesmo motor seja usado para:

- Klio: leitura acessível, estudo, tarefas e fichamentos;
- Kaline: estudo pessoal, organização intelectual e leitura guiada;
- Jurídico: doutrina, lei seca, artigos e jurisprudência curada.

A primeira casa simbólica, porém, é Klio.

## 4. Relação com a aba antiga Livros

A aba antiga **Livros** pode ser apagada como interface antiga.

Mas o motor existente não deve ser apagado.

Regra:

```txt
Apagar a casca antiga.
Preservar o motor.
Criar o Códice como nova superfície.
```

A rota antiga pode ser preservada como redirecionamento legado.

Sugestão:

```txt
/livros → /klio/codice
```

Rota preferencial nova:

```txt
/klio/codice
```

## 5. Arquitetura conceitual

O HTML do Códice não deve conter o motor.

O HTML também não deve acessar Supabase diretamente, nem carregar dados privados sozinho.

O Códice deve funcionar como uma superfície visual autenticada dentro da Kaline.

Fluxo correto:

```txt
Usuário logado
→ entra em /klio/codice
→ rota autenticada da Kaline valida sessão
→ Códice aparece como interface
→ botão do Códice pede uma ação
→ host autenticado chama o motor
→ motor acessa APIs/Supabase com segurança
→ resultado autorizado volta para a interface
```

Resumo técnico:

```txt
HTML = superfície visual
Host React = ponte autenticada
Motor = lógica real de leitura/conversão/resumo
Supabase = arquivos, metadados, texto, progresso e notas
```

## 6. O HTML não chama diretamente o motor

Formulação precisa:

> O HTML não chama o motor diretamente. Ele é a superfície autenticada que pede ao app para acionar o motor.

Mais precisamente:

> O HTML é o caminho visual que solicita ações ao host autenticado. O host chama o motor, e o motor acessa o conteúdo autorizado.

Isso evita:

- vazamento de chaves;
- acesso direto ao Supabase pelo HTML;
- conteúdo privado dentro de arquivo público;
- mistura entre interface e motor;
- gambiarra difícil de manter.

## 7. Superfície pública versus conteúdo privado

Se houver um HTML em:

```txt
public/codice/index.html
```

esse HTML pode existir como casca visual pública, mas nunca deve conter dados privados.

Ele pode conter:

- CSS;
- layout;
- animações;
- botões;
- estados vazios;
- textos de placeholder;
- estrutura visual.

Ele não deve conter:

- livro do usuário;
- notas reais;
- resumo real;
- token;
- chave;
- chamada direta ao Supabase;
- lógica sensível de motor.

O conteúdo real só deve ser entregue pela rota autenticada da Kaline.

## 8. Papel do host autenticado

Criar ou adaptar um host React autenticado.

Sugestão de componente:

```txt
src/components/CodiceHost.tsx
```

Sugestão de rota:

```txt
src/routes/_authenticated/klio/codice.tsx
```

O host deve:

1. validar que o usuário está logado;
2. renderizar a superfície do Códice;
3. escutar pedidos da interface;
4. chamar o motor existente;
5. devolver estados e dados autorizados para a interface.

## 9. Comunicação entre interface e host

Se a implementação usar HTML isolado/iframe, usar uma ponte segura de eventos.

Pedidos possíveis:

```txt
codice:open-reader
codice:upload
codice:open-library
codice:open-summary
codice:open-margin
codice:save-note
codice:enable-wake-lock
codice:disable-wake-lock
```

Respostas possíveis:

```txt
codice:loading
codice:library-loaded
codice:document-ready
codice:summary-ready
codice:note-saved
codice:error
```

Se a implementação for React puro, esses mesmos pedidos podem virar ações internas de estado.

## 10. Botão principal: Marcador

Não usar hambúrguer.

Usar um pequeno botão de livrinho no canto esquerdo.

Nome conceitual:

```txt
Marcador
```

Representação visual:

```txt
📖
```

Ao tocar no Marcador, abre uma barra discreta com as opções.

## 11. Estrutura interna do Códice

```txt
Códice
├── Ler
├── Subir
├── Acervo
├── Fichamento
├── Margem
└── Tela Acesa
```

### Ler

Abre o documento atual ou o último documento lido.

Deve privilegiar leitura fluida, não visual fixo de PDF.

### Subir

Permite enviar arquivos.

Formatos desejados:

```txt
EPUB
PDF
DOCX
TXT
Markdown
HTML limpo
```

### Acervo

Lista livros, artigos e textos já subidos pelo usuário.

Os itens devem vir do backend/Supabase, não do HTML público.

### Fichamento

Subpágina de resumo estruturado do livro ou artigo.

Pode conter:

- resumo geral;
- ideias centrais;
- trechos importantes;
- perguntas de estudo;
- botão para gerar ou atualizar fichamento.

### Margem

Espaço de observações pessoais.

Pode conter:

- nota livre;
- anotações por trecho;
- trechos destacados;
- comentários do usuário;
- salvamento automático ou manual.

### Tela Acesa

Modo para tentar impedir que a tela apague durante leitura longa.

Usar a Screen Wake Lock API quando disponível, com fallback amigável.

## 12. Por que priorizar formato de e-reader

A leitura principal deve ser e-reader-first.

Motivos:

- EPUB e HTML limpo são menores e mais leves que PDF;
- o texto é reflowable, ou seja, adapta ao tamanho da tela;
- funciona melhor no celular;
- permite fonte ajustável, margem confortável e tema claro/escuro/sépia;
- não parece TXT cru;
- a experiência fica mais parecida com Kindle/e-reader;
- PDF é pesado, fixo e ruim para celular.

Regra:

```txt
PDF é preservação/fallback.
EPUB/HTML limpo é leitura principal.
```

Fluxo ideal:

```txt
EPUB → renderizar como e-reader
DOCX → converter para HTML limpo
TXT/MD → converter para leitura editorial
PDF → extrair texto e criar versão fluida quando possível
```

O PDF original pode continuar disponível em “ver original”, mas a leitura confortável deve acontecer no modo fluido.

## 13. Experiência mobile/PWA

O Códice deve ser mobile-first.

Requisitos visuais:

- sem header próprio, porque a Kaline já possui barra superior;
- fundo escuro coerente com a identidade;
- cobre/âmbar como acento, se estiver no domínio Kaline/Klio;
- leitura centralizada;
- margens confortáveis;
- fonte ajustável;
- ações escondidas no Marcador;
- aparência de e-reader, não de formulário;
- funciona bem como PWA no celular.

## 14. Não precisa ser instantâneo

O botão pode ter delay.

O Códice não precisa fingir resposta instantânea.

Estados honestos são desejáveis:

```txt
Subindo arquivo...
Preparando leitura...
Convertendo para modo e-reader...
Carregando acervo...
Gerando fichamento...
Salvando margem...
```

Isso é melhor que fingir execução.

## 15. Não é chat, não precisa ser fala agora

O Códice não precisa ser conversa principal.

Neste primeiro desenho, não precisa ser:

- chat;
- fala automática;
- transcrição;
- conversa com IA em tempo real.

O foco é:

```txt
subir
abrir
ler
fichar
anotar
manter tela acesa
```

Depois pode haver integração com Kaline/Klio para explicar trechos, ler em voz ou gerar atividades.

## 16. Banco e motor — sugestão futura

O motor deve continuar fora do HTML.

Sugestão de organização futura:

```txt
src/lib/codice-engine/
src/routes/api/codice/
src/components/CodiceHost.tsx
src/routes/_authenticated/klio/codice.tsx
```

Tabelas futuras possíveis:

```txt
codice_documents
codice_document_sections
codice_reading_positions
codice_notes
codice_summaries
```

Storage:

```txt
codice-originals
```

Campos desejáveis:

```txt
document_id
user_id
title
file_type
storage_path
status
created_at
updated_at
last_position
```

## 17. PR sugerido de implementação

Título sugerido:

```txt
feat(klio): substitui Livros por Códice como superfície de leitura autenticada
```

Escopo do PR:

1. Renomear a aba Livros para Códice dentro do domínio Estudo · Klio.
2. Criar rota `/klio/codice`.
3. Manter `/livros` como redirect legado.
4. Criar superfície HTML/React do Códice com Marcador no canto esquerdo.
5. Criar as views internas: Ler, Subir, Acervo, Fichamento, Margem e Tela Acesa.
6. Não apagar motor existente.
7. Não colocar motor dentro do HTML.
8. Não chamar Supabase diretamente do HTML.
9. Preparar ponte/host autenticado para ações futuras.
10. Implementar estados de carregamento honestos.
11. Adicionar Tela Acesa com Wake Lock API quando disponível.
12. Manter tudo mobile-first e PWA-friendly.

## 18. Critérios de aceite

O PR estará correto se:

```txt
1. A antiga aba Livros não aparece mais com esse nome.
2. A nova aba se chama Códice.
3. Códice aparece no domínio de Klio.
4. /klio/codice abre a nova superfície.
5. /livros redireciona para /klio/codice ou mantém compatibilidade.
6. Existe um botão-livrinho Marcador no canto esquerdo.
7. O Marcador abre opções: Ler, Subir, Acervo, Fichamento, Margem e Tela Acesa.
8. O visual é e-reader-first, não PDF-first.
9. A tela é mobile-first e PWA-friendly.
10. O motor antigo não foi apagado.
11. O HTML não contém motor, chaves ou dados privados.
12. O acesso real depende da rota autenticada.
13. Tela Acesa tenta usar Wake Lock API com fallback.
14. Build passa.
```

## 19. Testes manuais

Testar:

```txt
1. Login normal.
2. Abrir domínio Klio.
3. Ver Códice no lugar de Livros.
4. Abrir /klio/codice.
5. Abrir /livros e confirmar redirect/compatibilidade.
6. Tocar no Marcador.
7. Alternar entre Ler, Subir, Acervo, Fichamento, Margem e Tela Acesa.
8. Testar em celular/PWA.
9. Ativar e desativar Tela Acesa.
10. Confirmar que nenhum dado privado aparece no HTML público isolado.
```

## 20. Resumo final

Códice substitui a antiga aba Livros como o domínio de leitura da Klio.

Ele deve ser uma superfície simbólica, leve e confortável para celular, inspirada em e-readers e na ideia de Codex.

O HTML é apenas a interface. O motor permanece separado. Os botões solicitam ações ao host autenticado, e o host aciona o motor quando necessário.

A primeira entrega pode ser visual/estrutural, desde que preserve a arquitetura segura para ligar o motor depois.
