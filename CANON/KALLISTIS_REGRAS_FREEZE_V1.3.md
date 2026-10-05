# KALLISTIS — REGRAS FREEZE

## Contrato de implementação · Calistus / site

**Status:** CANÔNICO FECHADO — v1.3 FREEZE  
**Autoridade mecânica:** este documento, `KALLISTIS_REGRAS_FREEZE_V1.3.md`  
**Base herdada:** `KALLISTIS_REGRAS_DO_JOGO_CANONICO_PUBLICACAO_v1.1_HARDENED.md`  
**Uso:** implementação do sistema digital, ficha, criação de personagem, automações de regra, combate, VTT/site, bestiário, encontros e referência.  
**Política:** o corpus mecânico abaixo é reproduzido integralmente. A camada digital pode alterar apresentação, navegação e estrutura de dados, mas **não pode alterar semântica de regra**.

### Fonte e integridade

- SHA-256 da autoridade mecânica v1.1 herdada: `a07df730f217981bdd412ecbfc58d0da62a142fe09f1137e871a7787474a1590`
- SHA-256 do contrato de implementação v1.1 usado como base: `198c8a7cb3aefca85b081a9d6eba0df588f36b8839acb4e56c3e0652e6dc7d8a`
- Alteração canônica v1.2: inclusão do **Satirista** como nono Ofício, com três Especializações, regra própria de Pedr'alma, Técnica inicial e seis Técnicas de Trilha.
- Revisão formal v1.3 FREEZE: correções de criação, iniciativa, estabilização, testes do Satirista, Pedr'alma, Moral, Trocado, defesas, Impulso/Pressão e economia de Reações, sem importar regras externas.
- Estrutura canônica: 6 Partes
- Povos: 9
- Ofícios: 9
- Especializações: 27
- Técnicas de Ofício: 63 (9 Técnicas iniciais + 54 Técnicas de Trilha)
- Glifos/gramática completa de Velarim não pertencem a este arquivo; aqui entram apenas as **regras de uso de Velarim em jogo**.
- O Manual Velarim continua sendo autoridade linguística especializada.

---

## 1. Domínios que o sistema deve representar

A implementação deve conseguir representar, sem perda de informação:

1. **Identidade da personagem**
   - Povo
   - Traço
   - Dom
   - Herança
   - Dissonância
   - Mundo de criação
   - Vínculos
   - Promessa
   - Ferida
   - Pergunta pessoal

2. **Núcleo mecânico**
   - Atributos
   - Perícias
   - Vitalidade
   - Lucidez
   - Fluxo
   - Guarda
   - Fortitude
   - Integridade
   - Movimento
   - Fôlego
   - Determinação

3. **Ofícios e Trilhas**
   - Ofício
   - Papel de Ressonância
   - Chave
   - Marco da Trilha
   - Especializações
   - Técnicas
   - proficiências
   - Trilha ativa
   - Trilhas inativas preservadas

4. **Resolução**
   - dois dados
   - Dificuldade
   - grau de resultado
   - Predominância
   - Intensidade
   - Ressonância
   - Impulso
   - Pressão
   - ajuda
   - testes opostos

5. **Capacidades**
   - Técnicas
   - Magias
   - Evocações
   - Velarim em jogo
   - Merge
   - Ressonância Coletiva / Coro

6. **Combate**
   - grade ortogonal
   - Movimento
   - ocupação
   - rodada
   - iniciativa por lados
   - Ações
   - Reações
   - ataques
   - dano
   - potência
   - cobertura
   - linha de efeito
   - áreas
   - engajamento
   - condições
   - queda
   - morte

7. **Inventário**
   - Carga
   - armas
   - tags
   - armaduras
   - ferramentas
   - Chaves
   - consumíveis
   - Artefatos
   - vínculo/despertar/ruptura

8. **Progressão**
   - Marcos
   - ganhos por Marco
   - progressão separada por Trilha
   - aprendizado de novo Ofício
   - Legado

9. **Sombra**
   - Marcas de Sombra
   - Tentação
   - efeitos
   - recuperação

10. **Fendas**
    - estados
    - fatores
    - destino
    - Âncora
    - teste coletivo
    - custo concreto
    - consequências

11. **Mestre**
    - cenas
    - relógios
    - testes prolongados
    - orçamento de encontro
    - Chefes
    - informação
    - consentimento temático
    - conflitos e facções

12. **Bestiário e encontros**
    - Lacaios
    - adversários comuns
    - Elites
    - Chefes
    - fenômenos
    - fauna e Colossais
    - modelos de adaptação
    - encontros prontos
    - tabelas regionais
    - recompensas
    - criação rápida de adversário

---

## 2. Locks mecânicos obrigatórios

### LOCK-01 — Marco 9

No Marco 9, a personagem escolhe:

- uma segunda Especialização do mesmo Ofício; **ou**
- uma Técnica de outro Ofício.

A Técnica externa:

- permanece exceção da Trilha que a recebeu;
- funciona enquanto essa Trilha estiver ativa;
- **não cria nova Trilha**;
- **não equivale a aprender o outro Ofício**.

### LOCK-02 — Aprender novo Ofício

Aprender realmente outro Ofício:

- exige causa narrativa;
- cria **nova Trilha no Marco 1**;
- concede Técnica inicial, Papéis permitidos e proficiências-base;
- exige Chave válida;
- não recebe progressão retroativa.

### LOCK-03 — Uma Trilha ativa

A personagem pode possuir várias Trilhas aprendidas, mas apenas **uma Trilha produz benefícios mecânicos por vez**.

Memória permanece. Progressão ativa muda.

### LOCK-04 — Dano escalado

A fórmula soberana é:

`Dano final = dano-base escalado × potência + margem + modificadores fixos + Corpo, quando Potente - Proteção.`

Não omitir `+ Corpo, quando Potente`.

### LOCK-05 — Travessia de Fenda

Travessia exige cumulativamente:

- destino correspondente;
- Âncora;
- estado adequado;
- teste coletivo;
- custo concreto.

Procedimento-base:

- 3 sucessos antes de 2 falhas;
- normalmente cada participante contribui no máximo uma vez;
- em grupo com menos de 3 participantes, uma personagem pode contribuir novamente usando **fonte/abordagem distinta**;
- estado, Dificuldade, destino, Âncora, consequência e custo são declarados antes da primeira rolagem;
- o custo é aceito e pago quando a sequência começa.

### LOCK-06 — Velarim em jogo

A Regra 47 é obrigatória.

Velarim usa formas reconhecidas, contexto e relação. Jogador, Mestre ou IA **não criam automaticamente léxico canônico durante a cena**. Formas sem autoridade permanecem marcadas como tal.

### LOCK-07 — Povos

Povo não concede bônus fixo de Atributo.

Cada Povo concede:

- Traço;
- Dom;
- uma Herança;
- Dissonância.

Povo não determina alinhamento, personalidade, profissão, mundo de criação ou lealdade.

### LOCK-08 — Chaves

Uma Chave:

- ativa uma Trilha já aprendida;
- não ensina um Ofício;
- pode ser arma, ferramenta, foco, kit, dispositivo ou símbolo;
- pode ser substituída por objeto compatível após reparação/reconhecimento narrativo;
- perder a Chave não apaga a Trilha.

### LOCK-09 — Especializações

Cada Ofício possui três Especializações.

- primeira no Marco 3;
- segunda possível no Marco 9;
- a mesma Especialização não pode ser escolhida duas vezes;
- funciona apenas quando o Ofício correspondente estiver ativo.

### LOCK-10 — Autoridade do corpus

Em qualquer conflito entre implementação e texto:

> **este corpus mecânico vence a implementação.**

Nenhuma conveniência de UI, schema, banco, API ou automação autoriza simplificar uma regra de modo que seu comportamento mude.

### LOCK-11 — Satirista

O **Satirista** é o nono Ofício canônico.

- Papéis: **Amparo ou Artilharia**;
- Perícias: **Empatia e Velarim**;
- possui exatamente três Especializações: **Memorialista, Bufão e Confidente**;
- possui a Técnica inicial **Licença do Bobo** e seis Técnicas de Trilha;
- segue normalmente as regras de Chave, Trilha ativa, Marco e progressão dos demais Ofícios.

**Exceção própria de Pedr'alma.** Quando a ficção já tiver estabelecido que uma Pedr'alma está acessível e que entrar ou sair dela é possível, o Satirista dispensa apenas a autorização coletiva. Esta permissão não cria deslocamento, intangibilidade, proteção, alcance, ação ou estado mecânico adicional. Ela não concede controle sobre a Pedr'alma, não força Merge, não obriga outra pessoa a acompanhá-lo e não elimina custos ou consequências declarados por outro procedimento aplicável.

A dificuldade narrativa do Satirista com Merge e sintonia coletiva não cria penalidade numérica automática além do que estiver explicitamente declarado por Técnica, condição ou procedimento.

---

## 3. Regras de implementação

### O sistema pode

- normalizar nomes internos de campos;
- criar IDs;
- dividir conteúdo em tabelas/coleções;
- gerar tooltips e índices;
- automatizar cálculos determinísticos;
- ocultar detalhes por permissões de Mestre;
- apresentar versões resumidas desde que exista acesso à regra integral.

### O sistema não pode

- inventar defaults onde a regra exige escolha;
- substituir decisão narrativa por cálculo automático;
- converter hipótese em regra;
- fundir Trilhas;
- conceder progressão retroativa;
- inferir léxico Velarim;
- resolver automaticamente consentimento, Vínculos, Promessas ou Merge;
- alterar custos, limites, escalas, alcance ou timing;
- remover exceções por conveniência de código.

---

# CORPUS MECÂNICO CANÔNICO — REPRODUÇÃO INTEGRAL

A partir deste ponto, o texto consolida o corpus da autoridade mecânica v1.1 Hardened, a alteração canônica v1.2 do Satirista e as correções formais fechadas na v1.3 FREEZE, registradas em **Fonte e integridade**. Fora da inclusão do nono Ofício e dessas correções delimitadas, o corpus v1.1 permanece preservado.

---

# KALLISTIS — REGRAS DO JOGO

## Personagens, conflitos, encontros e antagonistas

KALLISTIS acompanha pessoas atravessadas pela Fratura enquanto escolhem o que fazer com mundos que aprenderam a viver separados. As regras transformam essas escolhas em risco, custo e consequência sem retirar da ficção aquilo que dá sentido a cada decisão.

O jogo usa dois dados de dez faces. Um representa a Luz e o outro a Escuridão. A soma resolve a ação; a relação entre os dados mostra de que maneira o mundo respondeu. A partir desse núcleo surgem Predominância, Ressonância, Técnicas, magia, Evocações, Coro, travessias e combate.

Este capítulo reúne as regras necessárias para criar personagens, jogar cenas, conduzir conflitos e preparar encontros. O Bestiário e os encontros prontos aparecem na segunda metade do texto como ferramentas de campanha, já integrados ao mesmo sistema.

---

# PARTE I — O MUNDO EM JOGO

## A Fenda de Kethrell

A Fenda de Kethrell é a maior ruptura intermundos estável da região — e também a mais mal compreendida.

Seu nome vem de Kethrell, um dos arquitetos históricos da doutrina de restauração; é designação moderna, política, não uma forma certificada de Velarim. Mas o nome, ainda que recente, já pesa mais do que qualquer pedra de suas estruturas de contenção.

Ela se manifesta ao mesmo tempo nos dois mundos — e de modos que não se parecem.

Na Luz, é uma distorção brilhante, cercada de plataformas, câmaras e postos de observação, como se a própria luz tivesse esquecido como terminar uma frase: bordas que deveriam tocar-se deixam de coincidir, sons se duplicam um instante depois de soarem, objetos projetam posições que não deveriam existir ao mesmo tempo.

Na Escuridão, a experiência é outra. Ali a Fenda não brilha — falta. É um lugar onde o eco retorna cedo demais, onde a memória perde aderência à pedra, onde a arquitetura parece interrompida por algo que não é bem vazio, mas também recusa comportar-se como matéria.

É a mesma ferida. O que muda é a língua com que cada mundo a traduz.

Ninguém provou que a Fenda possui vontade própria. Sua atividade parece, por vezes, intencional — reage a linguagem, a relações, a proximidade cosmológica, a violência, a ressonância —, mas reagir não é escolher, e nenhum estudo até hoje demonstrou o contrário.

Tampouco reconhece autoridade. A Facção pode erguer muralhas ao redor dela. Um Conselho pode declarar quarentena. Um clã pode reivindicar precedência sobre suas margens. Nada disso a obriga a responder.

Por isso, todos os que tentam tratá-la como máquina, como divindade, como fronteira, cometem o mesmo erro: emprestam intenção humana a uma relação cosmológica que ninguém, até agora, aprendeu a ler por inteiro.

## Quatro Fatores de Instabilidade

Quatro condições concentram a maior parte das alterações observáveis da Fenda e oferecem ao Mestre um ponto de partida para interpretar sua instabilidade.

**Velarim.** Estruturas pronunciadas ou inscritas em Velarim podem alterar, por um tempo, a geometria da ruptura; quanto mais correta a forma, maior a resposta costuma ser. Uma manifestação consistente de Velarim exige forma reconhecida, relação adequada e energia suficiente dentro do contexto e da Ressonância local. A abertura de um portal depende desse conjunto, e não de uma frase isolada.

**Mirveth.** A proximidade entre contrapartes cosmológicas aumenta a atividade da Fenda — ecos que se multiplicam, temperatura que oscila sem razão aparente, sons que se duplicam, memórias que se projetam, posições correspondentes que parecem aproximar-se. A proximidade pode intensificar sinais sem identificar automaticamente as contrapartes. Reconhecimento e vínculo continuam dependentes das pessoas envolvidas e das evidências que elas conseguem reunir.

**Trocados.** Quem nasceu num mundo e foi criado no outro carrega padrões de adaptação que a Fenda tende a notar com mais intensidade — mas nunca do mesmo jeito duas vezes. Povo, história pessoal, vínculos, trauma, treino, exposição anterior: tudo isso modula a resposta. Cada Trocado produz uma resposta própria, modulada por sua história e pelo modo como aprendeu a habitar o mundo em que cresceu.

**Violência e Merge.** Atos que tentam impor relação pela força tendem a desestabilizar a passagem. Um Merge consentido pode estabilizá-la ou modulá-la. Uma fusão forçada, uma coerção, um apagamento — isso é terreno fértil para a Sombra.

A Fenda, portanto, não separa mecânica de ética. A forma como uma relação é construída altera, materialmente, o que pode acontecer ao seu redor.

## Estados da Fenda

A Fenda muda. Reconhecer em que estado ela se encontra é, para quem trabalha perto dela, uma questão de sobrevivência tanto quanto de ciência.

**Latente.** **Aparência:** pulsação baixa e regular **Efeito principal:** comunicação e observação limitadas

**Ressonante.** **Aparência:** duplicação de luz, som ou memória **Efeito principal:** objetos e mensagens podem atravessar

**Aberta.** **Aparência:** passagem espacial definida **Efeito principal:** pessoas podem atravessar

**Fraturada.** **Aparência:** múltiplas aberturas instáveis **Efeito principal:** deslocamentos imprevisíveis

**Corrompida.** **Aparência:** perda de contraste e ruído sem origem **Efeito principal:** identidade, memória e direção tornam-se vulneráveis

Os estados da Fenda descrevem condições distintas. Uma Fenda pode permanecer Ressonante, voltar a Latente, abrir-se ou sofrer corrupção conforme as relações presentes ao redor dela e a forma como essas relações são conduzidas.

À mesa, a Fenda funciona como uma condição dramática do mundo. Ela reage a relações, linguagem, violência e Ressonância, oferecendo fragmentos de informação ou alterando as condições de uma travessia. Suas respostas preservam incerteza: investigação, escolha e consequência continuam pertencendo às personagens. A Fenda pode revelar um padrão sem entregar a trama inteira e pode abrir uma possibilidade sem decidir quem merece atravessá-la.

---

# PARTE II — POVOS

## Regras dos Povos

### Regras gerais dos Povos

Cada Povo oferece um **Traço**, um **Dom**, uma **Herança** escolhida durante a criação e uma **Dissonância**. Esses elementos descrevem corpo, herança cosmológica e modos de relação com o mundo. Alinhamento, profissão, personalidade, mundo de criação, lealdade e capacidade intelectual pertencem à história de cada personagem.

#### Procedimento completo na criação

Ao escolher um Povo, comece pelo **Traço**, que expressa uma característica constante daquela herança cosmológica. O **Dom** acrescenta uma capacidade ativa com limite próprio. Depois escolha uma **Herança**, entre as duas apresentadas, e registre a **Dissonância**, que mostra como uma virtude daquele Povo pode ser deformada pela Sombra. A relação cultural com Ressonância e Merge orienta a interpretação da personagem sem determinar seu alinhamento.

Os Atributos são definidos pelo processo geral de criação; o Povo acrescenta Traço, Dom, Herança e Dissonância. Traço e Dom pertencem ao Núcleo permanente e continuam disponíveis independentemente da Trilha de Ofício ativa. Uma Herança muda apenas por transformação narrativa real, normalmente durante um Marco ou arco dedicado. A Dissonância produz pressão e consequência, enquanto o controle da personagem permanece com o jogador dentro do acordo de mesa.

---

## Aelvari

### Traço — Memória Estratificada

Ao investigar um lugar, objeto ou tradição com vínculo histórico, receba **+2**. Em sucesso forte, você também pode descobrir o que aconteceu, quem tentou ocultá-lo ou qual versão foi descartada.

### Dom — Eco Paralelo

Uma vez por cena, depois de uma rolagem, substitua um dos seus dados pelo valor natural do outro. Se os dois passarem a mostrar o mesmo valor, ocorre Ressonância. Depois, sofra **1 Pressão** no próximo teste de Intelecto ou Vontade.

### Heranças

**Cronista.** Conhecimento +1. Você pode registrar uma memória de cena como evidência resistente a alteração comum.

**Vidente Cauteloso.** Uma vez por cena, pergunte qual consequência imediata parece mais provável caso uma ação continue.

### Dissonância — Sobrecarga Temporal

Quando falhar usando memória ancestral, o Mestre pode oferecer confusão entre passado e possibilidade, a perda temporária de uma lembrança atual ou a condição **Abalado**.

---

## Kragor

### Traço — Força de Comunidade

Enquanto estiver adjacente ou na mesma zona que um aliado consciente, receba **+1 Fortitude** e **+1 dano corpo a corpo**.

### Dom — Juramento Operante

Durante uma Pausa Segura, formule um juramento específico com outro personagem que consinta. Enquanto ambos o cumprem, cada um pode conceder **+2** ao outro uma vez por cena. Quebrar conscientemente o juramento causa a condição **Dissonante** até que exista reparação.

### Heranças

**Escudo do Clã.** Use sua Reação para receber metade do dano destinado a um aliado próximo.

**Voz da Assembleia.** Ao liderar uma ação coletiva, dois aliados podem ajudar sem gastar suas ações completas.

### Dissonância — Honra Fechada

Quando a proteção da comunidade se transforma em exclusão, aceitar o apagamento da autonomia de alguém “pelo grupo” marca **1 Sombra**.

---

## Draken

### Traço — Corpo Elemental

Escolha uma Afinidade entre brasa, frio, tormenta, pedra, maré ou vento. Reduza em **2** o dano proveniente dessa Afinidade.

### Dom — Manifestação Elemental

Gaste **1 Fluxo** para acrescentar **+3 de dano elemental**, alterar o terreno de uma zona, resistir automaticamente a um perigo ambiental de sua Afinidade ou produzir um efeito narrativo equivalente que respeite a escala da cena.

### Heranças

**Soberania.** Receba +2 contra coerção e medo.

**Condutor.** Quando usar magia elemental, um aliado na mesma zona recebe **+1 Guarda** até o seu próximo turno.

### Dissonância — Hýbris

Quando o poder elemental for usado para impor obediência sem necessidade, o Mestre pode oferecer **1 Fluxo** em troca de **1 Sombra**.

---

## Nomos

### Traço — Chassi Modular

Escolha dois módulos. **Visão ampliada** concede +2 Percepção uma vez por cena contra distância, ocultação ou cobertura. **Ferramenta integrada** conta como ferramenta adequada e não ocupa espaço. **Compartimento protegido** acrescenta 2 espaços de Carga. **Blindagem leve** concede +1 Proteção e não se acumula com outra Blindagem. **Interface de dados** concede +2 Investigação ou Conhecimento uma vez por cena ao lidar com dispositivo, registro ou padrão. **Membros adaptáveis** ignoram uma penalidade de Movimento ou manuseio por turno.

Trocar um módulo exige oficina e Descanso Completo. Os bônus dos módulos respeitam as regras de Impulso e preservam a economia normal de ações.

### Dom — Lei Interior

Uma vez por cena, quando uma regra externa tentar controlar sua ação, declare sua **Lei Interior**. Sua Integridade aumenta em **+4** contra esse efeito. Se a rolagem do agente falhar contra sua Integridade, recupere **1 Lucidez**.

### Heranças

**Reparador.** Use Ofício no lugar de Cuidado ao tratar Nomos e dispositivos.

**Processador.** Uma vez por cena, transforme uma pergunta de Investigação em cálculo imediato dos padrões presentes.

### Dissonância — Otimização Absoluta

Quando a remoção da escolha de alguém for apresentada como solução perfeita, resistir exige recordar um vínculo. Sem vínculo relevante, sofra **−2 Integridade**.

---

## Livres

### Traço — Aprendizagem Cruzada

Escolha uma Perícia fora do seu Ofício e aumente-a em **+1**. Depois de cada Marco, essa Perícia pode ser trocada.

### Dom — Solução Improvisada

Uma vez por cena, declare um uso inesperado de um objeto, contato, costume ou fragmento de conhecimento. Receba **+2** e ignore a falta de uma ferramenta básica apropriada.

### Heranças

**Comunidade Escolhida.** Ao ajudar um vínculo, sua ajuda concede **+3**.

**Múltiplos Caminhos.** Aprenda uma Técnica inicial de outro Ofício, respeitando seus pré-requisitos narrativos.

### Dissonância — Identidade Oferecida

A Sombra pode oferecer uma identidade livre de dúvida. Aceitar essa certeza concede sucesso automático imediato e marca **2 Sombra**.

---

## Dóreos

### Traço — Memória da Matéria

Ao tocar uma obra, ferramenta ou estrutura, role `2d10 + Sintonia + Ofício`. Em sucesso, descubra seu propósito original, um reparo relevante, uma promessa quebrada ou seu último uso significativo.

### Dom — Inscrição de Promessa

Durante uma Pausa Segura, inscreva uma promessa em um objeto. Uma vez, o portador pode receber **+3** em uma ação coerente com a promessa, impedir a destruição do objeto ou revelar quem violou sua função. Depois do uso, a inscrição precisa ser renovada.

### Heranças

**Forjador.** Fabrique equipamento de qualidade mesmo sem uma oficina completa.

**Guardião de Obra.** Receba **+2 Guarda** ao defender uma estrutura, Artefato ou pessoa sob sua responsabilidade formal.

### Dissonância — Permanência Rígida

Quando preservar uma obra exige sacrificar pessoas ou escolhas presentes, insistir sem negociação marca **1 Sombra**.

---

## Teriantes

### Traço — Aspecto Faunístico

Escolha um Aspecto e um sentido associado. Felinos costumam se orientar por visão e equilíbrio; lupinos, por cheiro e cooperação; avianos, por distância e orientação; reptilianos, por calor e imobilidade; aquáticos, por vibração e água. Outro Aspecto pode ser criado com aprovação do grupo. Receba **+2 Percepção** quando o sentido escolhido for relevante.

### Dom — Instinto Inteiro

Uma vez por cena, antes de rolar, pergunte qual saída parece mais segura, quem demonstra ameaça, o que está fora de lugar ou qual movimento preserva o bando. A resposta é verdadeira, embora possa ser incompleta.

### Heranças

**Caçador.** Receba **+1 dano** contra um alvo rastreado.

**Protetor de Bando.** Aliados próximos recebem **+1** contra medo e emboscada.

### Dissonância — Redução ao Impulso

A Sombra pode pressionar o instinto até transformá-lo em perda de escolha. Quando um aliado chama sua personagem pelo nome e pelo vínculo que compartilham, receba **+2 Integridade** para resistir.

---

## Nimari

Nimari são o povo pequeno das rotas. Sua baixa estatura não modifica alcance ou deslocamento por si só; Passo Liminal, Fortuna e Herança expressam mecanicamente sua forma de atravessar o mundo.

### Traço — Passo Liminal

Uma vez por turno, atravesse espaço ocupado ou terreno difícil sem custo adicional. Barreiras sólidas continuam exigindo uma passagem real.

### Dom — Dado da Fortuna

Uma vez por cena, depois de qualquer rolagem visível, aumente ou reduza em **1** o valor natural de um dos dados, respeitando o intervalo de 1 a 10. A mudança pode criar ou desfazer uma dupla. Descreva qual possibilidade foi desviada.

### Heranças

**Cartógrafo de Frestas.** Receba **+2 Sobrevivência** ao procurar rotas, portais e saídas.

**Negociador de Risco.** Quando aceitar uma consequência antes do teste, receba **+3** em vez de +2.

### Dissonância — Caminho Sem Compromisso

Abandonar um vínculo para evitar todo risco recupera **1 Fôlego**, mas marca uma **Ruptura** nesse vínculo. Três Rupturas o encerram até que exista reparação.

---

## Vitrálios

### Traço — Corpo Harmônico

Escolha uma frequência dominante entre calor, som, emoção, luz física, vibração ou magia. Perceba sem teste mudanças relevantes nessa frequência quando estiverem próximas.

### Dom — Ressonância Prismática

Gaste **1 Fluxo** para refletir uma magia de alvo único com efeito reduzido, emitir luz ou som estruturado, compartilhar uma emoção verdadeira com consentimento ou conceder **+2** a um teste de Sintonia de um aliado.

**Resistência Vitrália.** Resistência a uma condição concede Impulso 1 nos testes feitos especificamente para evitá-la, resistir a ela ou removê-la. Durante uma Pausa Segura, a Herança pode permitir a troca da condição protegida.

**Reflexão Vitrália.** O novo alvo precisa ser válido e estar no alcance funcional do efeito. Ampliações pagas pelo conjurador original permanecem com o efeito original. O dano refletido usa um grau de potência abaixo do original, com mínimo ×1. Se o efeito tiver outro valor numérico, reduza-o aproximadamente à metade, arredondando para baixo; sem escala numérica, reduza duração ou intensidade em um passo coerente. A reflexão preserva ou reduz a potência recebida.

### Heranças

**Lapidador de Si.** Durante uma Pausa Segura, troque a resistência a uma condição por outra até a próxima Pausa Segura.

**Coro Vitrálio.** Quando outro personagem gerar Ressonância, recupere **1 Lucidez**, uma vez por cena.

### Dissonância — Quebra Frequencial

Ao sofrer dano de Lucidez igual ou superior à Vontade, escolha entre tornar a emoção visível, perder temporariamente o acesso ao Dom ou sofrer a condição **Fraturado**.

**Trocados e identidade.** Em um Vitrálio Trocado, escolha Luz ou Escuridão antes da rolagem. Role um segundo d10 dessa identidade, mantenha um dos dois dados dela e preserve o dado da outra identidade. Predominância e Ressonância usam os dois dados mantidos.

---

## Povo e Ofício

### Interlúdio — Povo e escolha

Povo descreve corpo, herança cosmológica e formas de relação que acompanham a personagem desde sua origem. Ofício descreve uma prática aprendida, organizada por Chave, Trilha, Papel e técnicas. As duas camadas se encontram na biografia de cada pessoa, sem determinar uma à outra.

A mesma prática pode assumir sentidos muito diferentes conforme quem a aprendeu, quem a ensinou e para que ela passou a ser usada. Ao escolher um Ofício, pergunte:

**Que sentido esta pessoa deu ao Ofício a partir da vida que possui?**

---

# PARTE III — OFÍCIOS

## Regras dos Ofícios

Ofício é uma forma de presença treinada. A Chave não concede a prática; recorda ao corpo, à atenção e à Ressonância a prática que já foi aprendida. Uma pessoa pode conhecer várias Trilhas, mas apenas uma conduz mecanicamente sua presença por vez.

**Memória permanece. Progressão ativa muda.**

### Regras gerais dos Ofícios

Uma Especialização é uma forma particular de exercer um Ofício dentro da própria Trilha. Cada uma concede uma **Permissão**, que amplia ou excepciona um uso normal do Ofício, e uma **Assinatura**, que caracteriza sua aplicação. A progressão, os Atributos, os recursos e as Técnicas continuam pertencendo ao Ofício; a Especialização muda a maneira de praticá-lo.

Ao alcançar o Marco 3, escolha uma das três Especializações do Ofício ativo e receba imediatamente sua Permissão e Assinatura. No Marco 9, escolha uma segunda Especialização do mesmo Ofício ou uma Técnica de outro Ofício. Uma mesma Especialização não pode ser escolhida duas vezes. Ela permanece aprendida, mas só funciona enquanto seu Ofício estiver ativo.

Cada Especialização permanece ligada à regra central de seu Ofício. Gunner continua trabalhando Aberturas; Escolta amplia a proteção do Guardião; Geômetra expande a leitura de trajetórias do Atirador; Reparador aprofunda a prática do Artífice; Passador transforma as rotas do Batedor em caminho compartilhado. A Especialização modifica a prática sem criar um segundo motor de progressão.

**Exceção de Marco 9.** A Técnica de outro Ofício recebida no Marco 9 é registrada como exceção na Trilha que recebeu o Marco e só funciona enquanto ela estiver ativa; não cria nova Trilha e não equivale a aprender o outro Ofício. Aprender um novo Ofício segue o procedimento próprio abaixo.

Ofício é uma prática aprendida e pode ser seguido por personagens de qualquer Povo. Cada Ofício define Papéis possíveis, duas Perícias treinadas, proficiências, uma Chave vinculada, técnica inicial e catálogo próprio de técnicas.

Na criação, as duas Perícias do Ofício recebem +1, até o máximo inicial 3. Quando uma opção manda escolher uma Perícia, a escolha é registrada na Trilha.

##### Faixas de técnica

**Inicial.** **Disponibilidade sugerida:** Marco 1 da Trilha **Potência ofensiva:** conforme texto **Limite normal:** sempre disponível

**Nível I.** **Disponibilidade sugerida:** Marcos 2-3 **Potência ofensiva:** dano-base x2 **Limite normal:** uma vez por rodada

**Nível II.** **Disponibilidade sugerida:** Marcos 4-6 **Potência ofensiva:** dano-base x3 **Limite normal:** custo 2 ou condição

**Nível III.** **Disponibilidade sugerida:** Marcos 7-9 **Potência ofensiva:** dano-base x4 **Limite normal:** normalmente 1/cena

**Legado.** **Disponibilidade sugerida:** Marco 10 **Potência ofensiva:** até x5 **Limite normal:** efeito de campanha

Técnicas sem dano convertem o Nível em alcance, duração, número de alvos, proteção, cura ou autoridade sobre a cena. Apenas efeitos que declaram um ataque multiplicam dano-base.

#### Chaves e Trilhas de Ofício

Cada Ofício aprendido forma uma Trilha separada. A personagem preserva o Núcleo permanente, mas apenas uma Trilha produz benefícios mecânicos por vez.

##### Regra da Chave

Uma Chave de Ofício é arma, ferramenta, foco, kit, dispositivo ou símbolo vinculado ao treinamento da personagem. Pegar um objeto semelhante não ensina o Ofício. A Chave ativa uma Trilha já aprendida.

A Chave pode cumprir simultaneamente função de arma, ferramenta, foco ou artefato. Qualidade e tags do objeto continuam valendo. A Chave comum não concede bônus por si só.

##### Catálogo de Chaves

**Guardião.** **Chaves exemplares:** Escudo de Juramento; Martelo de Vigília; Lança de Interposição; Insígnia de Guarda

**Duelista.** **Chaves exemplares:** Sabre de Fresta; Florete de Espelho; Lâmina Ritual; Par de Lâminas Gêmeas

**Atirador.** **Chaves exemplares:** Arco de Quartzo; Besta de Trilho; Carabina Nomos; Foco de Mira

**Tecelão.** **Chaves exemplares:** Bastão de Convergência; Grimório Estratificado; Tear Ritual; Prisma de Fórmulas

**Curador.** **Chaves exemplares:** Kit de Retorno; Foco de Amparo; Sino de Lucidez; Símbolo de Cuidado

**Evocador.** **Chaves exemplares:** Âncora de Pacto; Máscara de Convocação; Totem de Presença; Chave de Vínculo

**Artífice.** **Chaves exemplares:** Ferramentas Modulares; Luva de Inscrição; Dispositivo de Campo; Obra Modular

**Batedor.** **Chaves exemplares:** Faca de Trilha; Arco de Exploração; Bússola de Frestas; Kit de Rastreamento

**Satirista.** **Chaves exemplares:** Instrumento de Memória; Máscara; Verso Guardado; Objeto de Desejo; Lembrança Corporal

##### Vincular, perder e substituir

Vincular uma Chave exige treino conhecido e uma Pausa Segura.

A personagem pode possuir várias Chaves vinculadas, mas apenas a Chave da Trilha ativa conduz a Ressonância.

Trocar de Trilha exige declarar a nova Chave em Descanso Completo ou Pausa Segura.

A troca não ocorre livremente durante combate.

Ser desarmado não apaga a Trilha, mas impede capacidades que exijam a Chave ausente.

Uma Chave perdida pode ser substituída por objeto compatível após cena de reparação, juramento, treino ou reconhecimento narrativo.

Duas Chaves podem formar um único conjunto, como espada e escudo ou duas lâminas, desde que registradas como uma Chave composta.

##### Progressão separada

O Marco conquistado pertence à Trilha ativa na jornada responsável pelo avanço. Técnicas, especializações, ganhos de atributo, ganhos de Perícia, magia, Evocação e Legado pertencem à Trilha que os concedeu.

**Memória permanece. Progressão ativa muda.**

##### Aprender novo Ofício

Uma personagem não compra um Ofício abstratamente. Deve existir causa narrativa real: treino, mestre, ordem, comunidade, tradição, Dom despertado, talento descoberto, presente mágico, bênção, pacto, responsabilidade assumida, transformação ou evento equivalente.

O procedimento é: (1) ocorre o evento; (2) existe origem reconhecível do aprendizado; (3) a personagem assume treino, responsabilidade, transformação ou vínculo correspondente; (4) o Mestre confirma a mudança na ficção; (5) nasce a nova Trilha no Marco 1; (6) recebe a Técnica inicial, Papéis permitidos e proficiências-base do Ofício; (7) estabelece uma Chave válida; e (8) passa a poder escolher essa Trilha como ativa.

Não recebe retroativamente Marcos, Especializações, Técnicas avançadas ou benefícios de uma Trilha antiga. A história das outras Trilhas permanece e uma única Trilha fica mecanicamente ativa por vez.

#### Papéis de Ressonância

**Vanguarda.** **Função:** pressão corpo a corpo e dano concentrado

**Artilharia.** **Função:** dano à distância, magia ofensiva e área

**Amparo.** **Função:** cura, remoção de condições e recuperação

**Bastião.** **Função:** proteção, mitigação e controle de ameaça

O Papel ativo pertence à Trilha ativa e determina a manifestação do Coro.

---

## Guardião

### Especializações

**Sentinela.** Permissão: declare uma posição defendida, mantida até abandoná-la voluntariamente. Assinatura: uma vez por rodada, interponha sua proteção contra quem atravessar, ocupar ou atacar através desse espaço; a proteção é territorial.

**Escolta.** Permissão: escolha uma criatura ao alcance como Protegido e altere a escolha ao reorganizar-se normalmente. Assinatura: acompanhe o deslocamento do Protegido e interponha-se mesmo quando precisar alcançar uma posição adjacente possível.

**Quebra-Impacto.** Permissão: intercepte empurrões, quedas, colisões, explosões, impactos de área e ataques de Colossais. Assinatura: ao interceptar, receba a parcela do efeito destinada ao protegido ou espaço defendido e reduza ou interrompa movimento forçado quando sua resistência suportar o impacto.

**Papéis:** Bastião ou Amparo **Perícias:** Combate, Cuidado **Proficiências:** armaduras médias e pesadas, escudos, armas militares **Chaves usuais:** Escudo de Juramento; Martelo de Vigília; Lança de Interposição; Insígnia de Guarda

##### Técnica inicial — Interpor

**Reação:** mova até 2 células e torne-se o alvo do ataque originalmente dirigido a um aliado. Calcule o dano normalmente contra o Guardião e aplique sua Proteção uma única vez.

##### Técnicas da Trilha

**Postura Inabalável.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Receba +2 Guarda e não possa ser deslocado à força até o início do próximo turno.

**Marca de Proteção.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Marque um aliado ou objetivo a até 6 células. Uma vez antes do próximo turno, reduza em 2 o dano que ele sofreria.

**Linha que Não Cede.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Defina uma linha de até 3 células adjacentes. Inimigos que tentem atravessá-la são alvos de 2d10 + Corpo + Combate do Guardião contra Fortitude; em falha, param e ficam Expostos.

**Guarda de Juramento.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Quando o protegido for ferido, mova até 4 células e faça um ataque de Nível II, dano-base x3, contra o agressor.

**Círculo Seguro.** **Nível:** III **Custo e limite:** 3 Fôlego; 1/cena **Efeito:** Até seu próximo turno, aliados a até 3 células reduzem todo dano em 4 e não podem ser deslocados contra a vontade.

**Último Escudo.** **Nível:** III **Custo e limite:** todo Fôlego restante; 1/sessão **Efeito:** Redirecione para você um ataque ou evento que atingiria aliados próximos. Depois da Proteção, reduza o dano pela metade e permaneça com ao menos 1 Vitalidade.

---

## Duelista

### Especializações

**Gunner.** Permissão: use arma híbrida de fogo e lâmina como uma única arma de Duelista. Assinatura: disparos podem criar ou explorar Aberturas e a troca de modo não encerra a sequência; o disparo serve à lógica de Aberturas, não ao domínio de alcance do Atirador.

**Quebra-Guarda.** Permissão: escudos, armaduras, posturas e Guarda elevada podem criar Aberturas. Assinatura: ao explorá-las, prejudique a fonte defensiva, deslocando escudo, rompendo postura, comprometendo armadura ou reduzindo proteção em vez de buscar dano bruto.

**Dançarino de Lâminas.** Permissão: use duas armas compatíveis como uma configuração de Duelista, sem ataques extras automáticos. Assinatura: uma vez por rodada, reposicione-se antes ou depois de criar ou explorar Abertura.

**Papéis:** Vanguarda **Perícias:** Combate; escolha Atletismo ou Furtividade **Proficiências:** armas corpo a corpo leves e militares **Chaves usuais:** Sabre de Fresta; Florete de Espelho; Lâmina Ritual; Par de Lâminas Gêmeas

##### Técnica inicial — Abertura

Quando acerta um alvo isolado, cause +2 de dano. Se moveu até ele no mesmo turno, também o deixe Exposto.

##### Técnicas da Trilha

**Passo Cortante.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Mova até 3 células sem provocar reação e faça um ataque de Nível I, dano-base x2.

**Contra-ataque.** **Nível:** I **Custo e limite:** 1 Fôlego; reação **Efeito:** Quando um inimigo corpo a corpo errar você, realize imediatamente um ataque de Nível I, dano-base x2.

**Golpe de Precisão.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Faça um ataque de Nível II, dano-base x3, ignorando até 2 pontos de Proteção.

**Quebra de Guarda.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Faça um ataque de Nível II, dano-base x3. Em acerto, o alvo fica Exposto até o fim do próximo turno.

**Dança de Lâminas.** **Nível:** III **Custo e limite:** 3 Fôlego; 1/cena **Efeito:** Ataque até três alvos adjacentes. Use dano-base de 4 x4 para cada acerto, em vez do dano-base da arma.

**Duelo Inevitável.** **Nível:** III **Custo e limite:** 2 Fôlego e 1 Determinação; 1/cena **Efeito:** Contra alvo isolado, faça um ataque de Nível III, dano-base x4. O alvo não usa Reação e você ignora Proteção comum.

---

## Atirador

### Especializações

**Longavista.** Permissão: prepare disparos além do alcance confortável com linha de tiro, identificação e oportunidade. Assinatura: preparação estável neutraliza fatores circunstanciais de longa distância; movimento brusco, perda de visão ou mudança do alvo a desfaz.

**Geômetra.** Permissão: declare trajetórias indiretas por superfícies, frestas, ângulos e ricochetes fisicamente possíveis. Assinatura: contorne cobertura ou bloqueio angular válido; não atravesse matéria sólida por descrição.

**Supressor.** Permissão: aponte rota, passagem ou área visível como zona suprimida. Assinatura: uma vez por rodada, use sua resposta normal de disparo contra criatura hostil que realize movimento relevante na zona.

**Papéis:** Artilharia **Perícias:** Pontaria, Percepção **Proficiências:** arcos, bestas, armas de disparo e dispositivos de alcance **Chaves usuais:** Arco de Quartzo; Besta de Trilho; Carabina Nomos; Foco de Mira

##### Técnica inicial — Linha Clara

Ignore 1 ponto de cobertura. Em sucesso forte, escolha outro alvo na mesma linha e cause metade do dano final.

##### Técnicas da Trilha

**Mira Paciente.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Se não se moveu neste turno, faça um ataque de Nível I, dano-base x2, ignorando cobertura parcial e forte.

**Disparo de Supressão.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Escolha uma área 3 x 3 a até o alcance da arma. Inimigos que agirem fora de cobertura recebem Pressão 2 no próximo teste.

**Ricochete.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Faça um ataque de Nível II, dano-base x3, dividido entre dois alvos separados por no máximo 2 células.

**Marca de Caça.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Marque um alvo visível pela cena. Seu primeiro acerto contra ele é Nível II, dano-base x3, e você ignora 2 pontos de cobertura contra ele.

**Chuva de Projéteis.** **Nível:** III **Custo e limite:** 3 Fôlego; 1/cena **Efeito:** Ataque cada inimigo em área 3 x 3. Cada acerto causa dano-base de área 3 x4 e pode empurrar 1 célula.

**Horizonte Perfurado.** **Nível:** III **Custo e limite:** 3 Fôlego; 1/cena **Efeito:** Trace uma linha de até 18 células. Faça um ataque de Nível III, dano-base x4, contra todos os alvos na linha; ignore cobertura e até 3 Proteção.

---

## Tecelão

### Especializações

**Tramador.** Permissão: ancore campo, selo, zona ou efeito persistente ao lugar, objeto ou estrutura quando sua natureza permitir. Assinatura: a trama ancorada pode permanecer sem sua presença contínua; custos, duração e limites continuam válidos.

**Desatador.** Permissão: campos, selos, encantamentos, barreiras e estruturas mágicas são alvos válidos. Assinatura: compreenda e desmonte o efeito, enfraquecendo, interrompendo, abrindo, removendo parte ou encerrando sua estrutura; um Desatar não destrói toda magia automaticamente.

**Condutor.** Permissão: trabalhe sobre efeito já existente, mesmo criado por outra pessoa. Assinatura: tente redirecionar força, calor, energia, magia ou Ressonância sem aumentar gratuitamente potência, duração ou área.

**Papéis:** Artilharia ou Amparo **Perícias:** Magia, Conhecimento **Proficiências:** focos, grimórios, bastões e ferramentas rituais **Chaves usuais:** Bastão de Convergência; Grimório Estratificado; Tear Ritual; Prisma de Fórmulas

##### Técnica inicial — Forma Estável

A primeira magia de cada cena custa 1 Fluxo a menos, com custo mínimo de 0.

##### Técnicas da Trilha

**Contrafluxo.** **Nível:** I **Custo e limite:** 1 Fluxo; reação **Efeito:** Faça teste oposto com 2d10 + Sintonia + Magia contra a rolagem da magia visível. Em sucesso, cancele um efeito de Grau 0 ou reduza pela metade um efeito maior.

**Geometria de Área.** **Nível:** I **Custo e limite:** 1 Fluxo **Efeito:** Ao lançar magia de área, aumente uma dimensão em 1 célula ou converta linha, cone e quadrado entre formas equivalentes.

**Palavra Preparada.** **Nível:** II **Custo e limite:** 2 Fluxos; preparação **Efeito:** Armazene uma magia de Grau 0 ou 1 em uma Chave. Libere-a depois como Reação, pagando o custo normal da magia.

**Dupla Tradição.** **Nível:** II **Custo e limite:** 2 Fluxos **Efeito:** Uma magia recebe uma segunda Tradição e um efeito secundário coerente: mover 1 célula, conceder +2, remover Pressão ou deixar marca detectável.

**Forma Persistente.** **Nível:** III **Custo e limite:** 3 Fluxos; 1/cena **Efeito:** Sustente duas magias ao mesmo tempo e ignore o primeiro teste de Concentração provocado durante a duração.

**Convergência.** **Nível:** III **Custo e limite:** 3 Fluxos; 1/cena **Efeito:** Lance duas magias de Grau 0 a 2 como uma Ação. Pague os custos individuais; danos contra o mesmo alvo não ultrapassam a potência x4 de um único efeito.

---

## Curador

### Especializações

**Socorrista.** Permissão: estabilize e proteja sob pressão, quando tratamento completo for impossível. Assinatura: ao atender perigo imediato, combine cura ou estabilização com retirada por rota possível.

**Restaurador.** Permissão: trate condições persistentes, sequelas, traumas e comprometimentos prolongados. Assinatura: com tratamento adequado e tempo, reduza ou remova consequências conforme sua gravidade; não converta toda consequência permanente em pontos.

**Guardião da Cicatriz.** Permissão: trate ferida sem apagar seus efeitos narrativos. Assinatura: cuidado após ferida relevante pode virar vantagem defensiva ou resistência circunstancial ligada ao dano vivido.

#### CURA-BASE E PULSO RESTAURADOR

Toda cura usa uma única gramática:

Cura final = cura-base × multiplicador de potência + modificadores fixos.

Somente a cura-base é multiplicada. Sintonia e outros bônus fixos entram depois, salvo regra específica. Assim, cura-base 3 ×2 + Sintonia significa (3 × 2) + Sintonia, e não (3 + Sintonia) ×2.

##### Pulso Restaurador

Pulso Restaurador exige uma **Ação**, custa **1 Fluxo** e alcança uma criatura a até **6 células**. Em um alvo voluntário, a aplicação é direta. Escolha entre recuperar `cura-base 3 ×2 + Sintonia` de Vitalidade ou recuperar **4 Lucidez**. As duas opções representam usos diferentes do mesmo efeito e não se acumulam. A Técnica do Curador e a Magia de mesmo nome usam estes mesmos valores.

**Papéis:** Amparo **Perícias:** Cuidado, Empatia **Proficiências:** kits médicos, focos de cuidado e armas simples **Chaves usuais:** Kit de Retorno; Foco de Amparo; Sino de Lucidez; Símbolo de Cuidado

##### Técnica inicial — Estabilizar Relação

Ao curar Vitalidade ou Lucidez, remova 1 Pressão ou conceda +1 Guarda até o próximo turno.

##### Técnicas da Trilha

**Triagem.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Examine até três criaturas próximas. Saiba quem está em maior risco e conceda +2 ao próximo teste de Cuidado contra cada uma.

**Pulso Restaurador.** **Nível:** I **Custo e limite:** 1 Fluxo **Efeito:** Uma criatura a até 6 células recupera cura-base 3 x2 + Sintonia de Vitalidade, ou 4 Lucidez.

**Partilha de Dor.** **Nível:** II **Custo e limite:** 2 Fluxos; reação **Efeito:** Quando um aliado a até 6 células sofre dano, divida o dano restante igualmente entre vocês depois da Proteção.

**Memória do Corpo.** **Nível:** II **Custo e limite:** 2 Fluxos **Efeito:** Cure base 4 x3 de Vitalidade ou remova uma condição comum. Cada alvo só recebe este efeito uma vez por cena.

**Retorno.** **Nível:** III **Custo e limite:** 3 Fluxos; 1/cena **Efeito:** Uma criatura Caída volta com 1 Vitalidade e recebe cura-base 3 x4 + Sintonia. Ela fica Fraturada até uma Pausa Segura.

**Círculo de Vida.** **Nível:** III **Custo e limite:** 3 Fluxos; 1/cena **Efeito:** Aliados em área 3 x 3 recuperam cura-base 3 x4 de Vitalidade ou 6 Lucidez e removem uma condição comum.

---

## Evocador

### Especializações

**Pactário.** Permissão: escolha uma Evocação conhecida como Vinculada. Assinatura: favoreça coordenação, comunicação, alcance, ações conjuntas e permanência desse vínculo, preservando a autonomia da Evocação.

**Arauto.** Permissão: canalize pelo próprio corpo efeitos compatíveis que nasceriam da Evocação. Assinatura: escolha você ou a Evocação como ponto de manifestação válido; não copia nem substitui a presença.

**Convocador.** Permissão: mantenha repertório operacional de diferentes Evocações. Assinatura: ao trocar, preparar ou convocar, favoreça a necessidade concreta sem aumentar o número máximo de presenças simultâneas.

**Papéis:** Artilharia, Amparo ou Bastião **Perícias:** Evocação; escolha Magia ou Empatia **Proficiências:** focos de vínculo e armas simples **Chaves usuais:** Âncora de Pacto; Máscara de Convocação; Totem de Presença; Chave de Vínculo

##### Técnica inicial — Vínculo Manifesto

Mantenha uma Evocação menor sem pagar manutenção na primeira rodada e escolha seu Papel ao convocá-la.

##### Técnicas da Trilha

**Âncora Reforçada.** **Nível:** I **Custo e limite:** 1 Fluxo **Efeito:** Uma Evocação recebe +4 Vitalidade e +2 Integridade até o fim da cena.

**Comando Duplo.** **Nível:** I **Custo e limite:** 1 Fluxo **Efeito:** Com uma Ação, conceda duas ações simples a uma Evocação ou uma ação simples a cada uma de duas Evocações menores.

**Forma Adaptável.** **Nível:** II **Custo e limite:** 2 Fluxos **Efeito:** Troque a Forma funcional de uma Evocação por outra até o fim da cena e substitua uma capacidade por capacidade equivalente.

**Partilha de Sentidos.** **Nível:** II **Custo e limite:** 2 Fluxos **Efeito:** Compartilhe sentidos com a Evocação pela cena. Receba +2 Percepção e possa usar a posição dela como origem de um efeito não ofensivo.

**Evocação Maior.** **Nível:** III **Custo e limite:** requisito de Marco 6 **Efeito:** Você pode formar Vínculo maior e convocar Evocações Maiores. A primeira manutenção da cena é gratuita.

**Presença Convergente.** **Nível:** III **Custo e limite:** 3 Fluxos; 1/cena **Efeito:** Una temporariamente duas Evocações menores ou padrão consentidas em uma presença Maior até o fim da cena; depois ambas ficam indisponíveis até Pausa Segura.

---

## Artífice

### Especializações

**Armeiro.** Permissão: modifique armas, armaduras e Chaves para função específica com preparação adequada. Assinatura: adapte propriedades já reconhecidas pelo sistema, sem inventar poder em cada equipamento.

**Engenheiro de Campo.** Permissão: converta materiais e dispositivos em cobertura, mecanismo, armadilha, obstáculo, suporte ou estrutura temporária. Assinatura: resolva necessidade imediata usando regras de objetos, terreno e perigos; não cria inventário permanente automaticamente.

**Reparador.** Permissão: repare artefatos, construtos, mecanismos, Chaves e corpos Nomos compatíveis. Assinatura: restaure função, remova falha ou recupere integridade; reparar corpo Nomos não concede autoridade sobre sua pessoa.

**Autômato Auxiliar.** Apenas um Autômato pode estar ativo por personagem. Ele dura até o fim da cena seguinte e é desfeito quando outro é criado. Em combate, só age quando o Artífice gasta sua Ação para comandá-lo; o comando pode conceder seu Movimento.

**Papéis:** Bastião ou Artilharia **Perícias:** Ofício, Investigação **Proficiências:** ferramentas, dispositivos, armaduras leves e armas técnicas **Chaves usuais:** Ferramentas Modulares; Luva de Inscrição; Dispositivo de Campo; Obra Modular

##### Técnica inicial — Preparação de Campo

Durante uma **Pausa Segura**, crie dois recursos: carga, barreira, reparo, sonda, neutralizador ou munição especial. Recursos expiram após a cena seguinte.

##### Técnicas da Trilha

**Ferramenta Modular.** **Nível:** I **Custo e limite:** 1 recurso preparado **Efeito:** Um recurso conta como qualquer ferramenta adequada e concede +2 ao teste correspondente.

**Armadilha.** **Nível:** I **Custo e limite:** 1 recurso preparado **Efeito:** Instale em uma célula. Quando acionada, causa dano-base 4 x2 e aplica Abalado, Imobilizado ou Exposto, conforme construção.

**Autômato Auxiliar.** **Nível:** II **Custo e limite:** 2 recursos preparados **Efeito:** Crie um construto menor: Guarda 13, Vitalidade 8, movimento 5 e uma ação simples de reparo, ajuda ou ataque base 3.

**Sobrecarga Segura.** **Nível:** II **Custo e limite:** 2 recursos preparados **Efeito:** Um dispositivo ou arma técnica realiza efeito de Nível II, dano-base x3, e fica indisponível até uma Pausa Segura.

**Oficina Portátil.** **Nível:** III **Custo e limite:** 3 recursos; 1/cena **Efeito:** Realize reparo complexo como Ação, produza três recursos imediatos ou restaure equipamento Magistral danificado.

**Obra Magistral.** **Nível:** III **Custo e limite:** ritual de operação **Efeito:** Construa uma obra temporária com um efeito x4: ataque de área, barreira 20, ponte móvel, contenção ou autômato padrão. Dura a operação e exige manutenção narrativa.

---

## Batedor

### Especializações

**Rastreador.** Permissão: trate sinais físicos, comportamentais e anômalos como trajetória. Assinatura: depois de identificar a trilha, preserve direção, ritmo, desvios e pausas até que um evento a rompa, misture ou falsifique.

**Infiltrador.** Permissão: planeje entrada, observação, permanência e retirada em território ocupado. Assinatura: observe ou colete informação sem quebrar a infiltração quando isso puder ocorrer sem revelação; mantenha rota de saída até mudança material do cenário.

**Passador.** Permissão: conduza outras pessoas por rota atravessável que encontrou ou preparou. Assinatura: aliados que a sigam beneficiam-se de seu conhecimento em terreno hostil, rotas clandestinas, Frestas e passagens impossíveis; o perigo e as condições físicas permanecem.

**Papéis:** Vanguarda ou Artilharia **Perícias:** Sobrevivência, Furtividade **Proficiências:** armas leves, arcos e ferramentas de exploração **Chaves usuais:** Faca de Trilha; Arco de Exploração; Bússola de Frestas; Kit de Rastreamento

##### Técnica inicial — Primeiro a Ver

Ao detectar ameaça antes do combate, o grupo recebe +2 na iniciativa e um aliado move até 3 células gratuitamente.

##### Técnicas da Trilha

**Rota Segura.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Você e aliados próximos ignoram o primeiro trecho de terreno difícil e recebem +2 no próximo teste de viagem ou fuga.

**Emboscada.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** Seu primeiro ataque contra alvo que ainda não agiu é Nível I, dano-base x2, e deixa o alvo Exposto.

**Passo Sem Marca.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Mova seu deslocamento completo sem provocar Reações, atravesse terreno difícil sem custo e receba +4 Furtividade até o fim do turno.

**Guia de Frestas.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** Após a iniciativa, reposicione até quatro aliados em até 3 células cada, desde que você tenha reconhecido uma rota plausível.

**Caçador de Anomalias.** **Nível:** III **Custo e limite:** 3 Fôlego; 1/cena **Efeito:** Contra Evocação, fenômeno, criatura da Fenda ou manifestação da Sombra, faça ataque de Nível III, dano-base x4, e revele uma fraqueza.

**Ninguém Fica Para Trás.** **Nível:** III **Custo e limite:** 3 Fôlego; reação; 1/cena **Efeito:** Quando a cena colapsa ou um aliado cai, todos os aliados conscientes movem metade do deslocamento sem Reações; você pode carregar um Caído sem penalidade.

---

## Satirista

### O Bobo de KALLISTIS

O Satirista é o Bobo de KALLISTIS.

Um indivíduo facilmente subestimado e enormemente temido ao mesmo tempo. Agradável e desagradável, encantador e irritante, mas sempre considerado insipiente. Aprende, antes de tudo, a habitar o intervalo entre a regra e a exceção. Antes de dominar a música, a máscara ou o truque, precisa entender a distância entre uma palavra dita em segurança e uma verdade capaz de incendiar um salão; quanto de verdade um vínculo aguenta carregar; e o instante exato em que o silêncio deixa de proteger uma lembrança e passa a apagá-la.

Seu Ofício não sustenta as regras da comunidade — sustenta o que ainda une as pessoas quando as regras já falharam. É guardião de histórias, canções, segredos, sentimentos, traumas, desejos, corpos, promessas e vergonhas: tudo o que ninguém tem coragem de registrar. Guarda para si, não por ganância, mas porque sabe que certas memórias morrem no instante em que são entregues às instituições, aos vencedores ou à versão oficial dos fatos.

A música do Satirista não é ornamento — é arquivo vivo. Quando os poderosos queimam documentos, ele transforma a verdade em canção. Quando uma comunidade esquece o nome das próprias feridas, ele as devolve numa melodia que todos fingem não reconhecer. Uma única canção pode carregar o rosto de quem se foi, o desejo de quem foi calado, a culpa de quem sobreviveu e a promessa que ninguém mais admite ter feito.

**Chave.** Pode ser um instrumento, uma máscara, um verso, uma cicatriz, um nome — qualquer objeto que carregue uma história impossível de esquecer. Importa menos a forma que a memória presa a ela: uma máscara qualquer é só disfarce; uma máscara guardada pode conter a identidade de alguém que precisou desaparecer. Perder a Chave não apaga o Ofício, mas pode forçar o Satirista a descobrir se protegia uma lembrança — ou só o privilégio de ser o único a possuí-la.

**Trilha.** No início, aprende a chamar atenção, provocar riso e esconder uma verdade dentro de uma piada. Depois, aprende a desarmar autoridades, inverter sentenças e dizer o que ninguém mais ousaria dizer sem ser destruído por isso. Sua licença é a do Bobo da Corte: pode tocar no rei, ridicularizar o juiz, apontar a contradição do santo — desde que aceite arcar com as consequências de ser compreendido.

Não vence uma sentença pela força; procura a fresta na linguagem. Uma condenação pode virar saída. Uma ameaça pode se voltar contra quem a proferiu. Uma ordem pode expor que o poder já não sabe distinguir obediência de ridículo. Sua arma não é a mentira — é responder com tanta inteligência, absurdo ou correção poética que a autoridade só tem três saídas: recuar, parecer ridícula, ou admitir a própria contradição.

**Corpo e desejo.** Para o Satirista, o corpo também é memória. Toque, prazer, desejo, vergonha, cicatriz, fome, cheiro, intimidade — formas de experiência que as instituições insistem em controlar ou apagar. A luxúria não é apenas sedução: é presença corporal, liberdade do desejo, vulnerabilidade, a afirmação de que o corpo ainda pertence a quem o habita. Ele provoca, seduz, desafia — mas nunca transforma desejo em licença para ignorar a vontade alheia.

**Merge e Pedr'alma.** O Satirista tem dificuldade em realizar Merge e sintonizar-se a uma Pedr'alma: carrega vozes demais dentro de si. Memórias incompatíveis, desejos contraditórios, histórias de gente diferente e versões divergentes da verdade dividem o mesmo espaço interior. Não tem uma frequência — tem ecos. Por isso é o único Ofício que não depende da comunidade para entrar ou sair de uma Pedr'alma. Não se funde ao consenso: entra e sai por conta própria, levando consigo o que o grupo preferiu deixar para trás.

Em domínio alto, sua presença pode reunir pessoas que já não concordam sobre quase nada. Não cria harmonia perfeita — cria o mínimo consenso necessário para que uma relação sobreviva à crise, para que uma promessa não seja esquecida, para que ninguém precise apagar quem é só para continuar junto dos outros.

**Corrupção.** Começa quando o riso deixa de abrir espaço para a verdade e passa a destruí-la. O guardião das memórias vira dono delas; o espírito livre transforma todo vínculo em prisão; a sátira perde a coragem e vira crueldade. Nesse ponto, ele já não guarda as vozes — ridiculariza cada uma até que nenhuma consiga mais falar.

### Vinheta — A sentença que envelheceu

O Ofício exige perguntar quem será lembrado quando a festa acabar, e que verdade ainda pode ser dita sem romper de vez o vínculo entre as pessoas.

Certa vez, depois de desafiar publicamente o rei, um Satirista foi levado à presença da corte. Furioso, o rei ordenou que escolhesse como desejava morrer. O Satirista curvou-se, pensou por um instante e respondeu que preferia morrer de velhice.

A corte silenciou. Ao rei restavam duas saídas, e nenhuma era boa: ordenar a execução e admitir diante do reino que perdera a paciência com um bobo; ou poupá-lo, e admitir que a própria sentença já não fazia sentido nenhum. Escolheu uma terceira via — baniu-o do reino.

O Satirista partiu naquela mesma noite, levando consigo uma canção nova: sobre a misericórdia de um rei que, no fim, não teve escolha alguma.

### Perguntas de Trilha

- Que verdade você só consegue dizer quando todos estão rindo?
- Qual memória você guarda e nunca contou inteira?
- O que seu humor tenta proteger: os outros, você ou a própria mentira?
- Quando uma provocação aproxima as pessoas e quando ela apenas as humilha?

### Especializações

**Memorialista.** _Permissão:_ declare uma memória preservada pelo personagem em uma canção, relato, objeto, cicatriz ou segredo. Uma vez por cena, ao recorrer a essa memória, faça uma pergunta ao Mestre sobre uma pessoa, lugar ou acontecimento relacionado. A resposta deve ser verdadeira, ainda que incompleta. _Assinatura:_ quando uma memória preservada puder orientar uma decisão, conceda +2 a um teste de Conhecimento, Investigação, Empatia ou Velarim de um personagem que possa ouvi-la.

**Bufão.** _Permissão:_ declare uma autoridade, regra ou costume diante do qual o personagem possui licença para falar de modo inconveniente. A licença não impede consequências, mas permite que a verdade seja dita antes que a punição seja aplicada. _Assinatura:_ uma vez por cena, quando uma autoridade sob essa licença tentar punir, silenciar ou constranger o Satirista por algo que ele disse, ele pode gastar 1 Fôlego. A autoridade sofre uma consequência social imediata — vergonha pública, perda de apoio ou hesitação diante de seus pares, a critério do Mestre — e o Satirista evita a punição imediata. A consequência não causa dano físico, não desfaz uma sentença já cumprida e não impede que a autoridade tente puni-lo novamente.

**Confidente.** _Permissão:_ uma vez por cena, o Satirista pode olhar nos olhos de alguém e perguntar, com sinceridade total, o que essa pessoa realmente deseja — _“diga-me, o que é que você deseja de verdade?”_. Faça um teste de `2d10 + Presença + Empatia` ou `2d10 + Sintonia + Velarim` contra a Integridade do alvo. Em sucesso, o alvo sente um impulso quase incontrolável de responder com a verdade: não pode mentir sobre o desejo revelado, embora possa recusar-se a dizê-lo em voz alta — nesse caso, só o Satirista e o Mestre conhecem a resposta. Uma vez por sessão, um alvo pode resistir automaticamente, sem gastar teste. _Assinatura:_ quando o Satirista usa um desejo revelado dessa forma para ajudar, aconselhar ou negociar com essa pessoa, conceda +2 a um teste de `2d10 + Presença + Empatia` ou `2d10 + Sintonia + Velarim` envolvendo-a. Usar esse conhecimento para manipulá-la contra a própria vontade, ameaçá-la ou explorá-la encerra permanentemente o acesso à Permissão com essa pessoa — e conta como um passo na corrupção do Ofício.

**Papéis:** Amparo ou Artilharia **Perícias:** Empatia, Velarim **Proficiências:** armas simples, armaduras leves, instrumentos, máscaras e focos de Ressonância **Chaves usuais:** Instrumento de Memória; Máscara; Verso Guardado; Objeto de Desejo; Lembrança Corporal

#### Regra própria — Autonomia da Pedr'alma

O Satirista é o único Ofício que não depende da autorização coletiva para entrar ou sair de uma Pedr'alma. Quando a ficção já tiver estabelecido que uma Pedr'alma está acessível e que entrar ou sair dela é possível, o Satirista dispensa apenas a autorização coletiva. Esta permissão pertence ao Ofício, não depende de uma Técnica e não cria deslocamento, intangibilidade, proteção, alcance, ação ou estado mecânico adicional. Ela não concede controle sobre a Pedr'alma, não força Merge e não obriga outras pessoas a acompanhá-lo.

##### Técnica inicial — Licença do Bobo

**Custo e limite:** 1 Fôlego.  
**Reação:** quando uma criatura em alcance audível declara uma ordem, ameaça, acusação ou mentira que afete a cena, o Satirista pode responder com uma piada, verso, gesto ou verdade inconveniente.

Faça um teste de `2d10 + Presença + Empatia` ou `2d10 + Sintonia + Velarim` contra Dificuldade 15.

- **Fracasso:** a resposta ecoa vazia — nenhum efeito mecânico, mas a provocação foi ouvida e pode gerar consequências narrativas próprias.
- **Sucesso:** escolha um efeito — reduza 1 Pressão de um aliado que tenha ouvido a resposta; ou deixe o alvo Exposto até o início do próximo turno.
- **Sucesso forte:** aplique os dois efeitos.

A resposta nunca apaga as consequências da provocação. Ela apenas abre uma fresta para que a autoridade, o inimigo ou a própria comunidade seja obrigado a decidir o que fazer com a verdade.

##### Técnicas da Trilha

**A Música que Guarda.** **Nível:** I **Custo e limite:** 1 Fôlego **Efeito:** escolha até 2 aliados que possam ouvir o Satirista. Cada um remove Abalado ou recupera 2 Lucidez. Uma criatura pode confiar ao Satirista uma memória; até o fim da cena, essa memória não pode ser apagada ou distorcida por um efeito comum.

**Riso de Desarme.** **Nível:** I **Custo e limite:** 1 Fôlego **Reação:** quando uma criatura em alcance audível declarar uma ameaça, ordem ou mentira que afete a cena, faça um teste de `2d10 + Presença + Empatia` ou `2d10 + Sintonia + Velarim` contra Dificuldade 15. Em sucesso, o alvo fica Abalado e não pode usar reações até o início do próximo turno.

**Verdade Inconveniente.** **Nível:** II **Custo e limite:** 2 Fôlego **Efeito:** escolha até quatro criaturas que possam ouvir o Satirista e revele, por meio de piada, verso ou acusação, uma contradição presente na cena. Faça um teste de `2d10 + Presença + Empatia` ou `2d10 + Sintonia + Velarim` contra Dificuldade 15. Em sucesso, aliados recebem +2 para resistir à autoridade das criaturas escolhidas, e cada uma delas fica Exposta até o fim do próximo turno.

**Segredo Compartilhado.** **Nível:** II **Custo e limite:** 2 Fôlego **Reação:** quando um aliado que possa ouvi-lo sofrer dano de Lucidez ou receber uma condição causada por revelação, medo ou manipulação, reduza o dano em 3 ou impeça a condição. O Satirista sofre 1 Pressão e passa a carregar a consequência em sua própria memória: até o fim da cena, sofre –2 no próximo teste de Empatia, Velarim, Merge ou Integridade relacionado à memória protegida. Se a memória for exposta, negada ou usada contra ele, recebe Abalado.

**Coro dos Ausentes.** **Nível:** III **Custo e limite:** 3 Fôlego **Efeito:** escolha até 4 aliados que possam ouvir o Satirista. Eles recuperam 4 Lucidez, removem Abalado e podem trocar mensagens mesmo sem linha de visão até o fim da cena. Enquanto o efeito durar, nenhum deles pode ser obrigado a abandonar sua identidade ou aceitar um Merge contra a própria vontade.

**A Última Palavra.** **Nível:** III **Custo e limite:** todo o Fôlego restante, mínimo 1; 1/sessão **Reação:** quando uma ordem, sentença ou efeito for reduzir o Satirista a 0 Vitalidade, apagar uma memória importante ou submetê-lo a um Merge forçado, ele pode responder com uma interpretação literal de uma regra, promessa ou ordem efetivamente dita ou estabelecida na cena. O efeito falha contra ele. A interpretação não desfaz dano, condições ou decisões já aplicados, não obriga outra personagem a agir e não impede que a autoridade tente puni-lo novamente. A consequência narrativa da provocação permanece.

_A capacidade de entrar e sair sozinho de uma Pedr'alma é regra própria do Ofício, não depende de uma técnica._

---

# PARTE IV — JOGANDO KALLISTIS

Até aqui, KALLISTIS falou de pedras que guardam, palavras que atravessam e Fendas que lembram o modo como foram abertas. A partir daqui, essas relações ganham peso de mesa. Os dados registram o instante em que uma escolha encontra resistência; custos e recursos mostram o que foi necessário para sustentá-la; posição, duração e alcance tornam claro o que a ação realmente mudou.

A regra acompanha a ficção. Sempre que uma decisão puder mudar a cena de maneira relevante e seu resultado permanecer incerto, use o núcleo de resolução apresentado a seguir.

## Princípios do jogo

### 1. O que os personagens fazem

Personagens de KALLISTIS investigam histórias incompatíveis, atravessam cidades e Fendas, enfrentam ameaças e constroem relações com pessoas dos dois mundos. Em uma mesma campanha, podem combater agentes ou criaturas, aprender técnicas, lançar magia, despertar Artefatos e sustentar Evocações. À medida que avançam, suas escolhas mudam comunidades e alteram o futuro sem apagar aquilo que já aconteceu.

A mesa alterna exploração, investigação e conflito conforme a situação pede. Combate tático aparece quando posição e tempo importam; drama político surge quando instituições e comunidades disputam decisões; descoberta cosmológica transforma a compreensão do cenário. A progressão nasce do que as personagens fizeram com essas experiências, e não de uma sequência separada da história.

### 2. Princípios do jogo

#### 2.1. Diferença gera possibilidade

Personagens cooperam a partir de suas diferenças. Uma equipe se torna forte quando transforma capacidades distintas em coordenação.

#### 2.2. Poder exige relação

Poder em KALLISTIS sempre toca alguma relação. Magia depende de forma e contexto. Velarim exige sentido reconhecido. Merge envolve pessoas concretas, e Fendas respondem ao modo como são atravessadas. Quanto maior o efeito, mais importante se torna saber quem participa, o que está sendo pedido e qual consequência pode permanecer depois.

#### 2.3. Consequência nasce da ficção

Falhar muda a situação. A ação pode avançar por um caminho perigoso, expor um custo, revelar algo que ninguém pretendia descobrir ou transformar uma relação. O Mestre escolhe a consequência a partir do que já estava em jogo, preservando a lógica da cena em vez de interrompê-la com uma punição arbitrária.

## O núcleo de resolução

Toda incerteza importante em KALLISTIS coloca duas possibilidades sobre a mesa: a ação pode encontrar forma, mas sempre existe margem para o mundo responder de outro modo. Os dois d10 tornam essa tensão visível sem decidir por ela.

### 3. Os dois dados

Todo teste utiliza dois dados de dez faces: um **d10 da Luz** e um **d10 da Escuridão**. Role os dois e some um Atributo e uma Perícia.

`Dado da Luz + Dado da Escuridão + Atributo + Perícia`

Esta é a gramática universal de KALLISTIS: todo teste incerto que exigir rolagem usa `2d10 + Atributo + Perícia`, mantendo distinguíveis o Dado da Luz e o Dado da Escuridão. Compare o total à Dificuldade. Os dados podem ser separados por cor, símbolo ou posição; cada um representa uma dimensão cosmológica da mesma ação.

**Luz.** Mostra como a ação ganha forma e se manifesta de maneira visível no mundo.

**Escuridão.** Mostra o contexto que sustenta a ação e aquilo que emerge de memória, vínculo ou possibilidade ainda não revelada.

O **total** determina se a ação alcança o objetivo. Os valores naturais determinam **como** o resultado entra no mundo.

### 4. Dificuldades

**Baixa.** **Valor:** 10 **Situação:** oposição baixa, mas ainda significativa

**Favorável.** **Valor:** 12 **Situação:** tarefa treinada em boas condições

**Incerta.** **Valor:** 15 **Situação:** risco real

**Difícil.** **Valor:** 18 **Situação:** oposição competente

**Severa.** **Valor:** 21 **Situação:** circunstância extraordinária

**Extrema.** **Valor:** 24 **Situação:** feito excepcional

**Lendária.** **Valor:** 27 **Situação:** feito lendário, abaixo da escala épica

**Épica.** **Valor:** 30 **Situação:** feito além do horizonte heroico normal

Dificuldades acima de 30 podem representar fenômenos cosmológicos. Ao escalá-las, prefira passos de aproximadamente +3. Dificuldade 10 não significa ausência de pressão: sem risco, custo, incerteza ou mudança possível, não há teste.

Uma rolagem só é necessária quando o resultado pode alterar a situação e existe alguma pressão, incerteza ou custo. O mundo define os limites do que pode ser tentado, enquanto ações para as quais a personagem dispõe de tempo e recursos suficientes podem simplesmente acontecer.

### 5. Graus de resultado

Calcule a diferença entre o total e a Dificuldade.

**Falha severa.** **Margem:** -5 ou menos **Efeito:** a situação piora de forma significativa

**Falha.** **Margem:** -1 a -4 **Efeito:** não consegue ou consegue pagando custo alto

**Sucesso.** **Margem:** 0 a +4 **Efeito:** realiza o objetivo

**Sucesso forte.** **Margem:** +5 a +9 **Efeito:** realiza e obtém benefício

**Sucesso extraordinário.** **Margem:** +10 ou mais **Efeito:** altera a situação além do esperado

### 6. Predominância

Compare os dois dados naturais.

Quando a **Luz** é maior, o resultado tende a ser direto, material, público ou imediatamente perceptível.

Quando a **Escuridão** é maior, o resultado tende a ser contextual, relacional, profundo, discreto ou revelado posteriormente.

Quando são iguais, ocorre **Ressonância**.

Predominância não altera sucesso em falha nem falha em sucesso. Ela descreve a qualidade da consequência.

#### 6.1. Intensidade da Predominância

**0.** **Intensidade:** Ressonância **Uso sugerido:** as duas forças encontram a mesma frequência

**1-2.** **Intensidade:** Sutil **Uso sugerido:** acrescente uma nuance

**3-5.** **Intensidade:** Clara **Uso sugerido:** aplique um efeito principal evidente

**6-8.** **Intensidade:** Intensa **Uso sugerido:** altere significativamente a cena

**9.** **Intensidade:** Absoluta **Uso sugerido:** deixe uma marca difícil de ignorar

Normalmente aplique um efeito principal do dado predominante. Em sucesso extraordinário, falha severa ou Predominância intensa, o Mestre pode combinar dois efeitos relacionados. O dado menor pode acrescentar uma nuance, nunca uma segunda punição automática.

#### 6.2. Leitura do Dado da Luz

**1.** **Princípio:** Centelha **Em sucesso:** o efeito começa, ainda que pequeno ou incompleto **Em falha ou custo:** a tentativa revela intenção, esforço ou hesitação

**2.** **Princípio:** Vestígio **Em sucesso:** a ação deixa pista, marca ou evidência útil **Em falha ou custo:** você deixa rastros, provas ou sinais indesejados

**3.** **Princípio:** Forma **Em sucesso:** algo ganha contorno, função, posição ou definição **Em falha ou custo:** a forma criada é instável, inadequada ou limitada

**4.** **Princípio:** Movimento **Em sucesso:** alguém ou algo muda de posição, ritmo ou direção **Em falha ou custo:** o movimento cria posição desfavorável

**5.** **Princípio:** Exposição **Em sucesso:** alvo, fraqueza, mentira ou passagem fica visível **Em falha ou custo:** você, aliado ou recurso fica exposto

**6.** **Princípio:** Abertura **Em sucesso:** surge oportunidade imediata **Em falha ou custo:** a oposição recebe abertura ou iniciativa

**7.** **Princípio:** Impacto **Em sucesso:** algo é interrompido, quebrado, deslocado ou forçado **Em falha ou custo:** há recuo, dano colateral ou reação

**8.** **Princípio:** Testemunho **Em sucesso:** a ação é reconhecida, vista ou registrada **Em falha ou custo:** a cena atrai autoridade, testemunhas ou julgamento

**9.** **Princípio:** Transformação **Em sucesso:** ambiente ou situação sofre mudança duradoura **Em falha ou custo:** alteração permanente ocorre de modo indesejado

**10.** **Princípio:** Manifestação plena **Em sucesso:** o efeito se torna incontestável e domina a cena **Em falha ou custo:** a consequência aparece imediatamente e não pode ser ocultada

##### Perguntas criativas da Luz

Ao interpretar a Luz, observe o que se torna visível, muda de forma ou deixa uma marca pública. Considere quem presencia a ação, o que é empurrado, quebrado ou exposto e que oportunidade concreta passa a existir.

Exemplos possíveis incluem: abrir uma fresta, deixar assinatura mágica, erguer cobertura, deslocar um alvo, expor uma mentira, conceder ação imediata, quebrar concentração, produzir testemunho público, alterar terreno ou tornar uma verdade impossível de negar.

#### 6.3. Leitura do Dado da Escuridão

**1.** **Princípio:** Sussurro **Em sucesso:** intuição ou sinal quase imperceptível aparece **Em falha ou custo:** algo importante permanece ambíguo

**2.** **Princípio:** Eco **Em sucesso:** detalhe do passado ou de outra cena retorna **Em falha ou custo:** eco falso, incompleto ou perturbador interfere

**3.** **Princípio:** Contexto **Em sucesso:** surge conexão com história, lugar ou instituição **Em falha ou custo:** falta uma peça e cresce o risco de interpretação errada

**4.** **Princípio:** Caminho **Em sucesso:** aparece rota alternativa ou solução indireta **Em falha ou custo:** a única rota exige custo, atraso ou desvio

**5.** **Princípio:** Vínculo **Em sucesso:** relação é fortalecida, compreendida ou transformada **Em falha ou custo:** surge tensão, dívida, dependência ou distância

**6.** **Princípio:** Segredo **Em sucesso:** algo oculto se torna acessível **Em falha ou custo:** o segredo é parcial, perigoso ou também percebe você

**7.** **Princípio:** Memória **Em sucesso:** o passado retorna de forma útil e atuante **Em falha ou custo:** lembrança dolorosa, distorcida ou indesejada emerge

**8.** **Princípio:** Possibilidade **Em sucesso:** nova opção futura se torna real **Em falha ou custo:** oportunidade surge para a oposição ou cobra preço

**9.** **Princípio:** Profundidade **Em sucesso:** causa verdadeira, estrutura ou identidade é revelada **Em falha ou custo:** a revelação desestabiliza crenças, vínculos ou segurança

**10.** **Princípio:** Origem **Em sucesso:** a ação toca a raiz de relação, fenômeno ou verdade **Em falha ou custo:** dívida profunda, eco ou consequência duradoura desperta

##### Perguntas criativas da Escuridão

Ao interpretar a Escuridão, procure aquilo que retorna do passado, a relação que foi tocada e o segredo que ganhou contorno. Pergunte que possibilidade se abriu, que custo ainda permanece invisível e como o resultado se conecta ao contexto maior da cena.

Exemplos possíveis incluem: perceber familiaridade, ouvir eco distante, conectar objeto a proprietário, encontrar rota esquecida, transformar confiança, descobrir pacto secreto, recuperar memória, criar chance futura, revelar estrutura invisível de poder ou tocar a origem de uma corrupção.

#### 6.4. Matriz rápida

**Falha severa.** **Luz predomina:** desastre visível, quebra, exposição ou reação imediata **Escuridão predomina:** custo profundo, dívida, memória perigosa ou consequência futura

**Falha.** **Luz predomina:** obstáculo material ou público **Escuridão predomina:** complicação contextual ou relacional

**Sucesso.** **Luz predomina:** efeito direto e evidente **Escuridão predomina:** efeito discreto e significativo

**Sucesso forte.** **Luz predomina:** impacto, abertura ou transformação adicional **Escuridão predomina:** segredo, vínculo, oportunidade ou memória adicional

**Sucesso extraordinário.** **Luz predomina:** mudança estrutural ou pública duradoura **Escuridão predomina:** revelação profunda ou possibilidade que altera a campanha

### 7. Ressonância

Quando os dois dados mostram o mesmo valor natural, a mecânica sinaliza uma manifestação de Ressonância. Os dados revelam esse momento cosmológico enquanto o total continua determinando sucesso ou falha.

#### 7.1. Benefícios básicos

Em um sucesso com Ressonância, o efeito pode crescer, o custo pode diminuir ou uma oportunidade pode ser aberta para um aliado. Conforme a ação, a personagem também pode recuperar 1 Fluxo, preencher 1 Pulso do Coro dentro do limite de ganho ou descobrir uma relação oculta pertinente.

Quando a Ressonância acompanha uma falha, ela ainda produz relação: pode revelar uma verdade útil, impedir a pior consequência, abrir uma tentativa imediata para outra personagem, converter dano em condição, marcar uma rota de recuperação ou gerar 1 Pulso pela resistência coletiva.

O Mestre não usa Ressonância para retirar autonomia, impor Merge ou inventar informação sem relação com a cena.

#### 7.2. Ressonâncias de 1-1 a 10-10

**1-1.** **Nome:** Ressonância Frágil **Tema e abertura criativa:** algo pequeno sobrevive, começa ou recusa desaparecer

**2-2.** **Nome:** Ressonância do Eco **Tema e abertura criativa:** pista, som, memória ou padrão retorna

**3-3.** **Nome:** Ressonância da Forma **Tema e abertura criativa:** algo recebe estrutura estável ou significado definido

**4-4.** **Nome:** Ressonância da Passagem **Tema e abertura criativa:** rota, deslocamento ou transição torna-se possível

**5-5.** **Nome:** Ressonância do Espelho **Tema e abertura criativa:** relação, correspondência ou identidade é revelada

**6-6.** **Nome:** Ressonância do Acorde **Tema e abertura criativa:** aliados, forças ou intenções entram em coordenação

**7-7.** **Nome:** Ressonância da Fratura **Tema e abertura criativa:** defesa, mentira, barreira ou padrão é rompido

**8-8.** **Nome:** Ressonância do Vínculo **Tema e abertura criativa:** relação é restaurada, transformada ou posta à prova

**9-9.** **Nome:** Ressonância da Convergência **Tema e abertura criativa:** várias contribuições produzem mudança coletiva

**10-10.** **Nome:** Ressonância Plena **Tema e abertura criativa:** Luz e Escuridão alteram a cena em escala excepcional

##### 1-1 — Ressonância Frágil

Algo se recusa a desaparecer. Uma personagem pode permanecer com 1 Vitalidade, um objeto quebrado funcionar mais uma vez, uma memória deixar uma palavra ou uma rota durar poucos segundos.

##### 2-2 — Ressonância do Eco

Algo retorna: frase antiga, padrão inimigo, som distante, gesto de mirveth, memória de artefato ou consequência de cena anterior.

##### 3-3 — Ressonância da Forma

Algo recebe definição: magia estabiliza, plano ganha forma, cobertura nasce, pacto é formulado, condição é nomeada ou pista fragmentada se torna compreensível.

##### 4-4 — Ressonância da Passagem

Algo pode atravessar ou mudar de posição: deslocamento gratuito, abertura de fuga, aliado reposicionado, informação transmitida ou Fenda momentaneamente receptiva.

##### 5-5 — Ressonância do Espelho

Duas coisas são reconhecidas como relacionadas: mirveth, objeto e dono, mentira e cópia, emoção e reflexo, eventos correspondentes entre mundos. Não força Merge nem viola intimidade.

##### 6-6 — Ressonância do Acorde

Presenças coordenam-se: ajuda sem ação, ação curta de aliado, Pulso do Coro, magia conjunta, Evocação sincronizada ou técnicas combinadas.

##### 7-7 — Ressonância da Fratura

Algo rígido se rompe: Proteção, concentração, condição, estrutura, argumento, falsificação ou habilidade preparada. Não destrói automaticamente chefe, artefato maior ou instituição inteira.

##### 8-8 — Ressonância do Vínculo

Uma relação se torna o centro: reparar confiança, recuperar Lucidez, remover Dissonante, transformar rivalidade em respeito, reconhecer promessa ou impedir assimilação.

##### 9-9 — Ressonância da Convergência

Vários elementos se alinham. Escolha dois benefícios básicos relacionados ou uma mudança coletiva equivalente: grupo reposiciona, pistas convergem, comunidade decide agir, ritual reúne contribuições ou fase de confronto muda.

##### 10-10 — Ressonância Plena

Acontecimento raro que altera a cena inteira, produz efeito duradouro, revela verdade central, desperta artefato ou completa uma transformação preparada. Não mata automaticamente chefe, força Merge, remove toda Sombra, ressuscita morte estabelecida nem resolve a campanha inteira.

#### 7.3. Formulação aberta

Os exemplos de Ressonância servem como ponto de partida. Quando nenhum deles couber, procure o instante em que Luz e Escuridão reconhecem algo ao mesmo tempo e duas diferenças conseguem cooperar sem desaparecer. A melhor manifestação é aquela que encontra uma frequência comum, muda a cena porque duas verdades coexistem e deixa uma consequência que vale a pena carregar adiante.

### 8. Impulso e Pressão

**Limite de circunstância.** Bônus de circunstância, posição, ajuda, ferramenta, preparação, contexto, vínculo e fraqueza conhecida são Impulso e respeitam +4. Penalidades equivalentes são Pressão e respeitam −4. Só ficam fora do limite bônus explicitamente fixados na ficha, Atributo, Perícia ou Defesa.

Circunstâncias favoráveis concedem Impulso. Circunstâncias desfavoráveis impõem Pressão.

Cada ponto modifica o resultado em 2. Eles se anulam. O limite normal é +4 por Impulso e -4 por Pressão.

Uma mesma justificativa ficcional só produz um benefício uma vez. Uma ferramenta adequada, por exemplo, não concede simultaneamente seu benefício e um segundo bônus de ajuda quando ambos representam a mesma vantagem. Fontes distintas podem coexistir, respeitando os limites normais.

Exemplos de Impulso: ferramenta adequada, ajuda, posição elevada, pesquisa anterior, vínculo relevante ou fraqueza conhecida.

Exemplos de Pressão: ferimento, escuridão física sem adaptação, terreno hostil, ferramenta ausente, urgência ou interferência da Fenda.

### 9. Ajudar

Uma personagem pode usar sua ação para ajudar e deve descrever como sua capacidade altera a tentativa.

A personagem principal recebe +2 por ajuda competente. No máximo dois aliados ajudam no mesmo teste, salvo cenas coletivas. Ajudar exige risco compartilhado.

### 10. Testes opostos

Quando duas partes agem diretamente uma contra a outra, ambas rolam:

2d10 + Atributo + Perícia

O maior resultado vence. Empate favorece quem defendia posição estabelecida, quem possuía relação mais específica com o objeto da disputa ou cria impasse quando os critérios são iguais.

## Atributos, Perícias e recursos

A ficha não descreve uma pessoa inteira. Ela marca os lugares em que corpo, treino e desgaste precisam tornar-se legíveis durante a sessão.

### 11. Atributos

Todos os personagens possuem seis Atributos.

Valores iniciais variam de 0 a 4.

**Corpo.** **Função:** força, resistência, vigor, impacto

**Agilidade.** **Função:** precisão, velocidade, equilíbrio, reflexo

**Intelecto.** **Função:** análise, conhecimento, técnica, planejamento

**Presença.** **Função:** influência, liderança, expressão, intimidação

**Vontade.** **Função:** disciplina, coragem, identidade, resistência mental

**Sintonia.** **Função:** magia, ressonância, Fendas, Velarim e evocações

Escala:

**0.** **Significado:** comum ou não treinado

**1.** **Significado:** capaz

**2.** **Significado:** competente

**3.** **Significado:** excepcional

**4.** **Significado:** extraordinário

**5.** **Significado:** primeiro limiar sobre-humano

Os valores iniciais e a progressão ordinária de personagens possuem seus próprios limites. Criaturas, chefes, Colossais, Artefatos, estados transformados e fenômenos podem alcançar valores maiores. Os exemplos apresentados chegam a 20 apenas para manter a consulta prática.

**0.** **Escala de grandeza:** ×1

**1.** **Escala de grandeza:** ×1

**2.** **Escala de grandeza:** ×1

**3.** **Escala de grandeza:** ×1

**4.** **Escala de grandeza:** ×1

**5.** **Escala de grandeza:** ×2

**6.** **Escala de grandeza:** ×4

**7.** **Escala de grandeza:** ×8

**8.** **Escala de grandeza:** ×16

**9.** **Escala de grandeza:** ×32

**10.** **Escala de grandeza:** ×64

**11.** **Escala de grandeza:** ×128

**12.** **Escala de grandeza:** ×256

**13.** **Escala de grandeza:** ×512

**14.** **Escala de grandeza:** ×1.024

**15.** **Escala de grandeza:** ×2.048

**16.** **Escala de grandeza:** ×4.096

**17.** **Escala de grandeza:** ×8.192

**18.** **Escala de grandeza:** ×16.384

**19.** **Escala de grandeza:** ×32.768

**20.** **Escala de grandeza:** ×65.536

Para Atributo a, o Multiplicador de Escala é ×1 quando a está entre 0 e 4, e 2^(a - 4) a partir de 5. O bônus no teste continua sendo o próprio número do Atributo. A fórmula permanece válida acima de 20 quando uma campanha realmente exigir isso.

### 12. Perícias

**Atletismo.** **Usos comuns:** correr, escalar, saltar, quebrar

**Combate.** **Usos comuns:** armas corpo a corpo, agarrar, aparar

**Pontaria.** **Usos comuns:** armas à distância, arremesso, precisão

**Furtividade.** **Usos comuns:** ocultar-se, infiltrar-se, disfarçar movimento

**Percepção.** **Usos comuns:** notar ameaças, rastros, detalhes sensoriais

**Sobrevivência.** **Usos comuns:** orientação, clima, caça, terreno

**Investigação.** **Usos comuns:** conectar pistas, examinar cenas, reconstruir eventos

**Conhecimento.** **Usos comuns:** história, política, povos, ciência, cosmologia

**Ofício.** **Usos comuns:** fabricar, reparar, operar ferramentas e dispositivos

**Influência.** **Usos comuns:** negociar, liderar, enganar, intimidar

**Empatia.** **Usos comuns:** compreender emoções, vínculos e motivações

**Cuidado.** **Usos comuns:** medicina, estabilização, suporte físico e emocional

**Magia.** **Usos comuns:** executar fórmulas e controlar efeitos mágicos

**Evocação.** **Usos comuns:** estabelecer, sustentar e comandar vínculos evocados

**Velarim.** **Usos comuns:** analisar e usar formas linguísticas reconhecidas

Perícias variam de 0 a 5.

### 13. Recursos derivados

#### Vitalidade

Vitalidade = 10 + (Corpo × 3)

Para Corpo 5 ou maior, calcule a Vitalidade-base pela fórmula ordinária e aplique uma única vez o Multiplicador de Escala de Corpo: Vitalidade efetiva = Vitalidade-base × Multiplicador de Escala de Corpo.

Representa capacidade de permanecer ativo.

#### Lucidez

Lucidez = 8 + (Vontade × 3)

Representa estabilidade mental, emocional e identitária.

#### Fluxo

Fluxo = 3 + Sintonia + metade do Marco, arredondada para cima

Fluxo alimenta magias, evocações, algumas técnicas, interação com Fendas ou efeitos de artefatos.

#### Guarda

Guarda = 10 + Agilidade + proteção

É a Dificuldade para atingir fisicamente o personagem.

#### Fortitude

Fortitude = 10 + Corpo + Vontade

Resiste a veneno, exaustão, deslocamento, dor ou efeitos corporais.

#### Integridade

Integridade = 10 + Vontade + Sintonia

Resiste a medo, coerção, corrupção, invasão de memória ou Merge forçado.

Guarda, Fortitude e Integridade são valores estáticos. Personagens não rolam Fortitude nem Integridade como testes independentes. Quando um agente impõe um efeito, ele rola contra a Defesa apropriada:

ataque físico ou trajetória ofensiva: 2d10 + Corpo ou Agilidade + Combate/Pontaria contra Guarda;

veneno, doença, exaustão, dor, empurrão ou alteração corporal: 2d10 + Atributo + Perícia do agente contra Fortitude;

medo, coerção, memória, identidade, corrupção, dominação ou Merge forçado: 2d10 + Atributo + Perícia do agente contra Integridade.

Quando o perigo surge do ambiente, a personagem rola `2d10 + Atributo apropriado + Perícia apropriada` contra Dificuldade. Fortitude e Integridade entram como Defesas quando existe um agente ou efeito que as ataque diretamente.

#### Movimento

Antes do início da cena, escolha a escala espacial: **grade** ou **zonas**. Não há conversão obrigatória entre as duas escalas. Na grade, uma ação de Movimento concede **6 pontos de deslocamento**; em zonas, concede **2 zonas**. Em terreno severo, o deslocamento por zonas pode ser limitado a **1 zona**.

### 14. Reservas

**Piso e domínio das reservas.** Vitalidade, Lucidez, Fluxo, Fôlego e Determinação permanecem entre 0 e seus máximos. Não se paga custo sem reserva suficiente. Some reduções e ampliações antes do custo final; o piso global é 0 e custo 0 nunca recupera, produz ou transfere Fluxo. Dano excedente é calculado antes de limitar Vitalidade a 0.

#### Fôlego

Cada personagem possui 3 pontos de Fôlego.

Gaste 1 para realizar uma reação adicional, levantar-se sem gastar movimento, ignorar Pressão de uma condição por um teste, mover 1 zona após uma ação ou converter 1 dano sofrido em Lucidez perdida.

Fôlego retorna após Pausa Segura.

#### Determinação

Cada personagem começa cada sessão com 1 Determinação. O teto normal é 3; ganho excedente é perdido. No início de uma nova sessão, o valor torna-se 1, independentemente do valor restante.

Gaste para repetir os dois dados de um teste, permanecer com 1 Vitalidade ao cair a 0, recusar um efeito que controlaria sua personagem ou declarar um vínculo ou preparação plausível.

A nova rolagem deve ser aceita.

Descanso não redefine Determinação. A Promessa pode recuperar 1 Determinação uma vez por sessão. Uma vez por cena, quando a ficção colocar a Ferida em risco claro, o Mestre pode oferecer 1 Determinação para que a personagem aceite esse risco; o jogador decide aceitar ou recusar, e a mesma Ferida não gera mais de 1 Determinação nessa cena. Promessa e Ferida respeitam o teto de 3.

## Pausa Segura e Descanso Completo

Mesmo pedra aquecida precisa perder calor antes de receber outro golpe. Pausa e descanso medem esse intervalo sem apagar aquilo que a jornada tornou permanente.

A recuperação acontece em dois ritmos: a Pausa Segura reorganiza recursos durante a jornada; o Descanso Completo exige repouso prolongado e restaura o que só o tempo consegue recompor.

### Pausa Segura

Uma Pausa Segura exige saída do perigo imediato, alguns minutos de relativa segurança, reorganização real e ausência de perseguição ou ameaça capaz de interromper a recuperação sem consequência. Nela, Fôlego retorna ao máximo de 3 e a personagem recupera Fluxo igual a 1 + metade da Sintonia, arredondada para cima, sem ultrapassar o máximo. Esse intervalo também permite tratamento imediato, Técnicas que exigem pausa e preparação de equipamento compatível. Efeitos com duração “até a próxima pausa” terminam nesse momento quando apropriado.

Por padrão, a Pausa Segura não recupera Vitalidade nem Lucidez; Cuidado, cura e Técnicas só fazem isso quando a própria regra disser. Pausa Segura não recupera Determinação, não apaga Ferimentos Graves, Cicatrizes ou consequências persistentes, não reinicia a sessão e não torna um lugar perigoso seguro por declaração.

### Descanso Completo

Exige repouso prolongado em circunstância materialmente adequada. Ao concluir um Descanso Completo, Fôlego e Fluxo retornam ao máximo, e Vitalidade e Lucidez retornam aos respectivos máximos. Ferimentos Graves, Cicatrizes, Sombra e consequências persistentes seguem seus próprios procedimentos de recuperação; condições terminam quando sua duração ou regra de remoção indicar. Tratamentos prolongados, oficina, rito e reorganização podem ocorrer quando houver condições. Também é possível trocar a Trilha ativa mediante Chave válida. A Determinação preserva o valor que já possuía.

**Preparação de Jornada** é procedimento narrativo, não uma terceira categoria; ocorre durante Pausa Segura ou Descanso Completo quando houver tempo e recursos.

## Refúgio

Cada grupo pode conquistar um único Refúgio coletivo ligado à sua Pedr’alma por meio de uma Quest de Fundação, normalmente equivalente a aproximadamente uma sessão. O Refúgio não existe funcionalmente antes dessa conquista e não é criado automaticamente na criação de personagem, por Marco, compra ou custo de experiência.

Depois de conquistado, o Refúgio pode ser acessado fora de sequências ativas de campanha. Durante combate, dungeon, perseguição, exploração perigosa, missão ativa, travessia hostil, pressão temporal ou outra situação declarada ativa pelo Mestre, o acesso normal fica bloqueado.

Em ameaça real de aniquilação do grupo, morte coletiva ou perda equivalente irreversível, o Mestre pode permitir um Retorno de Desespero, retirando o grupo da ameaça imediata para o Refúgio. O Retorno pode preservar a sobrevivência, mas não transforma derrota em vitória, não desfaz consequências, não recupera objetivos ou itens perdidos e não resolve automaticamente a cena. A inclusão de personagens inconscientes é decisão do Mestre conforme a ficção.

O Refúgio não concede bônus de combate, Ação, Movimento, Reação, recursos, suporte, teleporte tático ou cura automática. Pausa Segura e Descanso Completo continuam usando suas regras normais. O Refúgio não cria inventário extradimensional, armazenamento infinito ou economia própria; objetos mecânicos seguem suas condições ficcionais e regras específicas.

Sua aparência e seus ambientes podem ser customizados coletivamente e registrar a história do grupo, sem conceder benefícios mecânicos automáticos. Refúgio é uma mecânica coletiva ligada à Pedr’alma do grupo, não uma habilidade individual, magia, Técnica, Especialização, progressão de Ofício ou sistema de combate.

## Criação de personagem

Criar uma personagem é escolher que marcas já existem antes da primeira cena e quais ainda estão abertas. A ficha organiza essas marcas; a campanha decidirá o que elas se tornarão.

Povo e Ofício já foram apresentados nas partes anteriores; aqui eles entram como escolhas de uma mesma personagem.

### 15. Etapas

Comece pelo conceito e escolha Povo, origem cosmológica e Ofício. Defina então o Papel de Ressonância, distribua Atributos e Perícias e registre as Técnicas disponíveis. Quando a Trilha permitir, acrescente Magias ou uma Evocação. Complete a personagem com equipamento, Vínculos, Promessa, Ferida e uma Pergunta pessoal.

**Equipamento inicial.** Na criação, cada personagem recebe, em qualidade Comum, uma Chave válida da Trilha; uma arma, foco ou ferramenta em que o Ofício seja proficiente; uma armadura permitida ou roupas reforçadas; um kit coerente com o Ofício; e dois consumíveis diferentes. A carga respeita 6 + Corpo espaços; itens leves podem compartilhar espaço. Se a Chave cumprir uma função, ocupa um único objeto e espaço. Equipamento Refinado, Magistral ou Artefato só entra na criação quando uma regra o autoriza explicitamente.

### 16. Conceito

Escreva uma frase:

Sou \[identidade\] que deseja \[objetivo\], mas teme \[perda\].

Exemplo:

Sou uma Dórea restauradora que deseja provar a fraude do pacto, mas teme descobrir que sua própria obra sustentou a mentira.

### 17. Atributos iniciais

Distribua os valores **3, 2, 2, 1, 1 e 0** entre os seis Atributos. Nenhum Atributo começa acima de 3, e a escolha de Povo não altera esses valores com bônus fixos.

### 18. Perícias iniciais

Distribua uma perícia em 3, três perícias em 2 e quatro perícias em 1.

O Ofício concede mais duas perícias treinadas.

### 19. Vínculos

Crie três Vínculos. Cada um pode ligar a personagem a uma pessoa, comunidade, verdade, promessa ou lugar. Uma vez por cena, quando você agir diretamente para proteger ou confrontar um desses Vínculos, receba +2. Vínculos podem mudar durante a campanha quando a ficção justificar essa transformação.

### 20. Promessa

A Promessa nasce da pergunta **“o que sua personagem se recusa a permitir que seja apagado?”** Uma vez por sessão, ao agir de acordo com ela sob risco real, recupere 1 Determinação.

### 21. Ferida

A Ferida responde à pergunta **“que perda ainda governa decisões que sua personagem afirma ter superado?”** Quando essa perda puder voltar a orientar a cena, o Mestre pode oferecer 1 Determinação para colocá-la em risco. Cabe ao jogador aceitar ou recusar.

### 22. Pergunta pessoal

Escolha uma pergunta que ainda não tenha resposta para a personagem, ou escreva a sua. Ela pode nascer da origem, de uma promessa, da memória, de uma dívida com o mundo em que cresceu, do medo de repetir a violência que combate ou da possibilidade de encontrar sua mirveth. A pergunta deve ser ampla o bastante para atravessar várias sessões e concreta o bastante para mudar quando a personagem mudar.

## Origens cosmológicas

### 23. Mundo de criação

A origem cosmológica é escolhida independentemente do Povo.

**Criado na Luz.** Uma vez por cena, ao agir publicamente, de modo organizado ou sob observação, receba +2. Sua vida tende a colocá-lo diante de exposição, registro, vigilância ou rigidez institucional.

**Criado na Escuridão.** Uma vez por cena, ao agir por memória, contexto, silêncio ou vínculo, receba +2. Obrigações herdadas, excesso de memória, segredos e instituições lentas costumam atravessar sua experiência.

**Trocado.** Você nasceu em um mundo e foi criado no outro. Escolha uma adaptação do mundo de criação ou uma ressonância involuntária do mundo de nascimento. Uma vez por cena, ao lidar com Fenda, mirveth ou tradução incompatível, escolha Luz ou Escuridão antes da rolagem. Role um segundo d10 da identidade escolhida, mantenha um dos dois dados dessa identidade e preserve o dado da outra identidade. Predominância e Ressonância usam os dois dados mantidos. Uma falha ressonante produz Dissonância de Origem.

**Outro.** Você é socialmente reconhecido como parte das comunidades dos Outros. Escolha um benefício: **(a)** um contato no Refúgio ou rede equivalente; **(b)** +2 para identificar propaganda sobre Trocados; ou **(c)** acesso a uma rota clandestina. Registre também uma dívida comunitária.

## Técnicas

Técnica é memória treinada sob pressão: uma forma que o corpo, a atenção ou a prática conseguem reencontrar quando a situação se fecha.

### 24. Uso de técnicas

**Marcos mínimos.** Inicial exige Marco 1; Nível I, Marco 2; Nível II, Marco 4; Nível III, Marco 6; Legado, Marco 10. O Marco mínimo é pré-requisito obrigatório. “Técnica avançada” no Marco 6 pode ser de Nível III.

Técnicas são capacidades treinadas. Podem ser passivas, ações, reações, posturas, preparações ou técnicas de cena.

Custos possíveis incluem ação, Fôlego, Fluxo, condição, posição, Chave ou preparação.

#### 24.1. Níveis de potência

Ataques e efeitos ofensivos usam uma escala comum. O **Nível** indica a potência específica daquele uso, enquanto o **Marco** registra a progressão geral da personagem.

**Ataque comum.** **Multiplicador do dano-base:** x1

**Nível I.** **Multiplicador do dano-base:** x2

**Nível II.** **Multiplicador do dano-base:** x3

**Nível III.** **Multiplicador do dano-base:** x4

**Nível IV.** **Multiplicador do dano-base:** x5

##### 24.1.1. Fórmula

Dano final =

(dano-base x multiplicador)

\+ bônus de margem

\+ modificadores fixos

\+ Corpo, quando a arma for Potente

\- Proteção

Somente o dano-base é multiplicado. Não multiplique Corpo, bônus de margem, bônus de artefato, Sangramento, dano ambiental, dano verdadeiro ou dano do Coro.

A Proteção é aplicada depois de todos os acréscimos. O dano mínimo após Proteção é 1, salvo imunidade ou bloqueio completo.

##### 24.1.2. Margem ofensiva

Sucesso comum: sem bônus adicional.

Sucesso forte: +2 de dano.

Sucesso extraordinário: +4 de dano.

##### 24.1.3. Custos-padrão de design

**I.** **Uso esperado:** frequente, técnica inicial **Custo ou limite recomendado:** 1 recurso; máximo uma vez por rodada

**II.** **Uso esperado:** mudança relevante **Custo ou limite recomendado:** 2 recursos, condição ou preparação; normalmente uma vez por cena

**III.** **Uso esperado:** efeito decisivo **Custo ou limite recomendado:** 3 recursos e preparação; normalmente uma vez por cena

**IV.** **Uso esperado:** Legado, artefato maior ou catástrofe **Custo ou limite recomendado:** condição excepcional; normalmente uma vez por sessão ou arco

A descrição específica da técnica prevalece. Uma técnica defensiva, social ou de controle pode usar o nível para medir alcance, duração, quantidade de alvos ou intensidade, sem causar dano.

### 25. Limites

Uma personagem mantém apenas uma postura por vez e dispõe de uma Reação por rodada, salvo quando gasta Fôlego conforme a regra específica. Uma Técnica marcada como uma vez por cena só pode ser usada uma vez naquela ocorrência, e Técnicas de uma Trilha inativa exigem uma exceção explícita para funcionar. O mesmo gatilho nunca multiplica uma Técnica ofensiva mais de uma vez.

Multiplicadores não se acumulam. Quando dois efeitos indicarem níveis diferentes, use o maior e aplique os demais apenas como efeitos secundários permitidos.

### 26. Técnicas universais

#### Avanço

Gaste 1 Fôlego para mover 1 zona antes ou depois da ação.

#### Aparar

Reação com arma adequada: +2 Guarda contra um ataque.

Uma mesma personagem só pode aplicar Aparar uma vez ao mesmo ataque, ainda que possua Reações adicionais.

#### Cobrir

Use ação para conceder cobertura a um aliado.

#### Preparar

Declare ação e gatilho. Quando o gatilho ocorrer, execute como reação.

#### Recuperar

Use ação para recuperar 1 Fôlego, remover Abalado, levantar-se ou estabilizar uma Evocação.

## Magias

Magia dá forma ao Fluxo por meio de alcance, custo, alvo e efeito definidos. A precisão da regra existe para que essa forma permaneça legível quando entra em cena.

### 27. O que é magia

Magia manipula energia e matéria por técnicas que também podem alcançar memória, probabilidade, frequência ou relação. Ela pode ser executada por gesto, foco, canto, inscrição, cálculo, instinto ou Ressonância. Velarim participa quando a forma empregada pertence ao léxico atestado e a relação adequada sustenta seu efeito.

### 28. Estrutura de uma magia

**Nome.** **Descrição:** identificação funcional da edição

**Tradição.** **Descrição:** Manifestação, Profundidade, Elemental, Ressonância, Inscrição ou Limiar

**Grau.** **Descrição:** 0 a 3

**Ação.** **Descrição:** Ação, Reação ou ritual

**Alcance e alvo.** **Descrição:** posição, criatura, objeto, área ou relação

**Defesa-alvo.** **Descrição:** Guarda, Fortitude, Integridade ou Dificuldade

**Custo.** **Descrição:** Fluxo igual ao Grau, salvo regra

**Efeito.** **Descrição:** resultado principal

**Ampliação.** **Descrição:** uso de +1 Fluxo

**Risco.** **Descrição:** consequência apropriada de falha ou Predominância

### 29. Graus e potência ofensiva

**0.** **Custo:** 0 **Potência:** x1 **Escala:** truque, utilidade ou efeito menor

**1.** **Custo:** 1 **Potência:** x2 **Escala:** ação de combate comum

**2.** **Custo:** 2 **Potência:** x3 **Escala:** alteração relevante de cena

**3.** **Custo:** 3 **Potência:** x4 **Escala:** efeito decisivo e arriscado

Apenas o dano-base é multiplicado. Sintonia, margem, bônus fixos e efeitos de técnica entram depois. Magias de área usam dano-base menor. Nível IV/x5 fica reservado a Legado, artefato maior ou evento catastrófico.

### 30. Tradições mecânicas

**Manifestação.** **Campo:** forma, matéria, barreira, presença e luz física

**Profundidade.** **Campo:** memória, silêncio, repouso, ocultação e identidade

**Elemental.** **Campo:** calor, frio, vento, pedra, água e eletricidade

**Ressonância.** **Campo:** som, frequência, vínculo, emoção e coordenação

**Inscrição.** **Campo:** objetos, promessas, estruturas e duração

**Limiar.** **Campo:** distância, rotas, probabilidade, Fendas e posição

### 31. Testes mágicos

Quando houver oposição, role 2d10 + Sintonia + Magia contra Guarda para projétil físico, Fortitude para alteração corporal, Integridade para memória ou identidade, ou Dificuldade da Fenda para travessias.

### 32. Concentração

Uma personagem sustenta uma magia persistente por vez. Sofrer 5 ou mais de dano exige 2d10 + Vontade + Magia contra Dificuldade 15; falha encerra o efeito.

### 33. Catálogo de magias

O catálogo abaixo reúne as magias disponíveis. Novas magias entram em jogo quando forem criadas e aprovadas pela mesa dentro das mesmas regras de Grau, custo e efeito.

#### Grau 0

**Centelha Orientada.** **Tradição:** Manifestação **Ação:** Ação **Alcance:** 6 células **Efeito:** Cria chama, luz ou calor breve. Como ataque, base 2 x1; não produz Luz cosmológica. **Ampliação com +1 Fluxo:** Aumente duração ou ilumine área 3 x 3. **Risco aberto:** Pode revelar posição ou inflamar material vulnerável.

**Mão de Pressão.** **Tradição:** Limiar **Ação:** Ação **Alcance:** 6 células **Efeito:** Move objeto leve, abre mecanismo simples ou empurra criatura voluntária 1 célula; contra alvo hostil, role 2d10 + Sintonia + Magia contra Fortitude. **Ampliação com +1 Fluxo:** Mova +1 célula ou objeto maior. **Risco aberto:** O objeto escapa, cai ou produz ruído.

**Véu de Silêncio.** **Tradição:** Profundidade **Ação:** Ação **Alcance:** área 2 x 2 **Efeito:** Abafa som comum até o próximo turno; não apaga memória nem identidade. **Ampliação com +1 Fluxo:** Aumente a área em 1 célula. **Risco aberto:** O silêncio também impede aviso ou palavra aliada.

**Marca de Frequência.** **Tradição:** Ressonância **Ação:** Ação **Alcance:** toque ou 6 células **Efeito:** Identifica assinatura mágica, emocional ou harmônica recente. **Ampliação com +1 Fluxo:** Acompanhe a assinatura pela cena. **Risco aberto:** Detecta eco semelhante, não necessariamente a fonte correta.

**Selo Transitório.** **Tradição:** Inscrição **Ação:** Ação **Alcance:** toque **Efeito:** Inscreve aviso, nome funcional ou condição simples que dura a cena. **Ampliação com +1 Fluxo:** Acrescente gatilho ou duração até Pausa Segura. **Risco aberto:** A marca fica visível ou registra o usuário.

**Sopro Elemental.** **Tradição:** Elemental **Ação:** Ação **Alcance:** cone de 2 células **Efeito:** Manipula pequena quantidade de elemento conhecido. Como ataque, base 2 x1 e efeito ambiental menor. **Ampliação com +1 Fluxo:** Amplie cone ou intensidade. **Risco aberto:** O elemento se espalha para alvo ou objeto próximo.

#### Grau 1

**Lança Elemental.** **Tradição:** Elemental **Ação:** Ação **Alcance:** 12 células **Efeito:** Ataque contra Guarda; base 5 x2 + Sintonia. Escolha elemento conhecido. **Ampliação com +1 Fluxo:** +1 alvo adjacente usando base 3. **Risco aberto:** O elemento altera terreno ou atinge objeto vulnerável.

**Barreira Manifestada.** **Tradição:** Manifestação **Ação:** Ação **Alcance:** 6 células **Efeito:** Cria cobertura com Integridade estrutural 8 em até 2 células contíguas. **Ampliação com +1 Fluxo:** +4 Integridade ou +1 célula. **Risco aberto:** A barreira bloqueia também uma rota aliada.

**Passo Velado.** **Tradição:** Limiar **Ação:** Ação **Alcance:** pessoal **Efeito:** Mova até 6 células sem provocar Reação e receba +2 Furtividade até o fim do turno. **Ampliação com +1 Fluxo:** Leve um aliado voluntário adjacente. **Risco aberto:** Chegue em posição visível ou deixe rastro liminar.

**Pulso Restaurador.** **Tradição:** Ressonância **Ação:** Ação **Alcance:** 6 células **Efeito:** Cure base 3 x2 + Sintonia de Vitalidade ou 4 Lucidez. **Ampliação com +1 Fluxo:** +1 alvo adjacente com metade da cura. **Risco aberto:** Você recebe 1 Pressão em Sintonia.

**Eco de Memória.** **Tradição:** Profundidade **Ação:** ritual breve **Alcance:** toque **Efeito:** Veja impressão emocional recente de objeto ou lugar; não revela verdade total. **Ampliação com +1 Fluxo:** Alcance uma memória mais antiga ou faça uma pergunta adicional. **Risco aberto:** Uma memória dolorosa acompanha a revelação.

**Trava de Juramento.** **Tradição:** Inscrição **Ação:** ritual breve **Alcance:** toque **Efeito:** Protege objeto ou passagem por condição declarada; avisa e impõe Pressão 2 ao violador. **Ampliação com +1 Fluxo:** Aumente duração ou inclua segundo gatilho. **Risco aberto:** A condição ambígua também pode atingir aliado.

**Voz Harmônica.** **Tradição:** Ressonância **Ação:** Ação **Alcance:** cone de 3 células **Efeito:** Role 2d10 + Sintonia + Magia contra Integridade; em sucesso, base 3 x2 de Lucidez ou condição Abalado. **Ampliação com +1 Fluxo:** Empurre 1 célula ou afete +1 linha. **Risco aberto:** Sua emoção verdadeira se torna perceptível.

**Selo de Reparo.** **Tradição:** Inscrição **Ação:** Ação **Alcance:** toque **Efeito:** Repare base 4 x2 de Integridade estrutural ou Vitalidade de construto. **Ampliação com +1 Fluxo:** Restaure função simples quebrada. **Risco aberto:** O reparo exige peça, promessa ou material depois da cena.

#### Grau 2

**Tempestade Local.** **Tradição:** Elemental **Ação:** Ação **Alcance:** área 3 x 3 a 12 células **Efeito:** Ataque contra Guarda ou Fortitude; base de área 4 x3 e condição coerente. **Ampliação com +1 Fluxo:** Aumente área ou intensidade da condição. **Risco aberto:** Terreno permanece perigoso por uma rodada.

**Círculo de Repouso.** **Tradição:** Profundidade **Ação:** Ação **Alcance:** área 3 x 3 **Efeito:** Aliados recuperam 4 Lucidez e ignoram medo até o próximo turno. **Ampliação com +1 Fluxo:** Remova Abalado ou Dissonante de um alvo. **Risco aberto:** Todos ouvem um eco de memória compartilhada.

**Ponte Breve.** **Tradição:** Limiar **Ação:** Ação **Alcance:** dois pontos visíveis até 12 células **Efeito:** Cria passagem instantânea entre pontos da mesma camada até o fim do turno. **Ampliação com +1 Fluxo:** Mantenha por uma rodada adicional. **Risco aberto:** A rota desloca chegada em 1 célula ou deixa assinatura.

**Dissolver Forma.** **Tradição:** Manifestação **Ação:** Ação **Alcance:** 8 células **Efeito:** Contra barreira, armadura ou construto: base estrutural 4 x3 ou reduza Proteção em 3 até reparação. **Ampliação com +1 Fluxo:** Afete +1 objeto adjacente. **Risco aberto:** Uma forma aliada próxima também perde estabilidade.

**Memória Compartilhada.** **Tradição:** Ressonância **Ação:** ritual **Alcance:** toque; até 3 pessoas **Efeito:** Com consentimento, compartilha lembrança escolhida; cada participante mantém interpretação própria. **Ampliação com +1 Fluxo:** Inclua +2 participantes ou duração maior. **Risco aberto:** Emoção associada causa 2 Lucidez se não preparada.

**Prisma Defletor.** **Tradição:** Manifestação **Ação:** Reação **Alcance:** pessoal ou aliado a 3 células **Efeito:** Reduza dano mágico em base 4 x3. Se chegar a zero, redirecione efeito visual inofensivo. **Ampliação com +1 Fluxo:** Redirecione o efeito contra barreira ou espaço vazio. **Risco aberto:** O prisma registra a assinatura do ataque e do defensor.

**Âncora de Área.** **Tradição:** Inscrição **Ação:** ritual breve **Alcance:** área 3 x 3 **Efeito:** Impede teleporte, deslocamento liminar e abertura espontânea de Fenda na área pela cena. **Ampliação com +1 Fluxo:** Aumente área ou duração até Pausa Segura. **Risco aberto:** Você também não pode usar efeitos de Limiar dentro dela.

**Salto de Possibilidade.** **Tradição:** Limiar **Ação:** Reação **Alcance:** 6 células **Efeito:** Depois de rolagem visível, rerrole um dos dois dados e escolha qual resultado manter. **Ampliação com +1 Fluxo:** Aplique a um aliado. **Risco aberto:** A possibilidade rejeitada cria custo, atraso ou atenção futura.

#### Grau 3

**Horizonte Partilhado.** **Tradição:** Ressonância **Ação:** Ação **Alcance:** aliados em uma zona funcional **Efeito:** Por uma rodada, aliados compartilham ameaças percebidas, recebem +3 Percepção e não podem ser surpreendidos. **Ampliação com +1 Fluxo:** Inclua uma informação ou abertura coletiva. **Risco aberto:** Todos percebem também uma dor ou medo relevante.

**Prisão de Forma.** **Tradição:** Manifestação **Ação:** Ação **Alcance:** 8 células **Efeito:** Imobiliza criatura ou fenômeno; a cada turno o conjurador rola 2d10 + Sintonia + Magia contra Fortitude ou Integridade, conforme o alvo. A prisão possui Integridade 18. **Ampliação com +1 Fluxo:** Aumente Integridade ou inclua segundo alvo adjacente. **Risco aberto:** A prisão manifesta parte da identidade do conjurador.

**Travessia Fratal.** **Tradição:** Limiar **Ação:** ritual **Alcance:** Fenda identificada **Efeito:** Abre passagem entre posições correspondentes. Exige Âncora e destino correspondentes, uma rolagem de 2d10 + Sintonia + Magia contra a Dificuldade do estado da Fenda e um custo definido pela Fenda; não garante retorno. **Ampliação com +1 Fluxo:** Estabilize chegada ou leve grupo maior. **Risco aberto:** Chegada deslocada, eco de memória ou atenção da Sombra.

**Restauração de Nome.** **Tradição:** Profundidade **Ação:** ritual de uma cena **Alcance:** toque e vínculo **Efeito:** Com consentimento e memória reconhecida, remova até 3 Sombra temporária ou condição de assimilação. Não ressuscita. **Ampliação com +1 Fluxo:** Restaure vínculo ou memória danificada relacionada. **Risco aberto:** O ritual revela o preço ou a origem da corrupção.

**Cataclismo Contido.** **Tradição:** Elemental **Ação:** Ação; 1/cena **Alcance:** área 5 x 5 a 12 células **Efeito:** Ataque de área base 5 x4. Escolha elemento e altere o terreno de forma severa. **Ampliação com +1 Fluxo:** Concentre em área 3 x 3 para +2 dano final. **Risco aberto:** O conjurador fica Fraturado e o ambiente permanece instável.

**Pacto Vivo.** **Tradição:** Inscrição **Ação:** ritual de uma cena **Alcance:** lugar, objeto ou grupo consentido **Efeito:** Inscreva promessa que concede +3 a ações coerentes e impõe Pressão 3, equivalente a −6; esta magia excepciona expressamente o limite normal de −4 para violações conscientes durante o arco. **Ampliação com +1 Fluxo:** Inclua testemunha, condição de encerramento ou proteção material. **Risco aberto:** Ambiguidade cria Ruptura no pacto e consequência institucional.

### Aquisição e repertório de Magias

O catálogo usa **magias conhecidas**, não lista de magias preparadas e não possui slots diários. Uma magia conhecida está disponível enquanto a personagem possuir acesso válido, Fluxo, condições da magia e capacidade ficcional de executá-la. “Preparação” continua podendo ser requisito ficcional de ritual, artefato ou Grau 3, sem virar troca diária de loadout.

Magia é universal: qualquer personagem pode adquirir magias quando a ficção fornecer fonte, tempo ou acontecimento compatível. Para personagens sem uma regra específica de Trilha, o limite máximo de magias conhecidas é exatamente seu valor de **Sintonia**. Esse limite não concede magias automaticamente, não cria loja ou treinamento universal e não substitui a necessidade de acesso ao Grau.

O acesso universal aos Graus é: **Grau 0 e Grau 1 no Marco 1; Grau 2 no Marco 3; Grau 3 no Marco 5**. Não é possível adquirir Grau superior antes do Marco correspondente. Depois de adquirida, a magia é usada normalmente, sem penalidade por Ofício, preservando custo, teste, alcance, concentração, duração, área, consequência, requisito e risco.

Aprender uma magia exige fonte real, tempo ou acontecimento compatível, acesso ao Grau e registro da nova magia na personagem. Não exige moeda nova ou XP de magia. Para o Tecelão, a progressão própria de repertório é uma exceção preservada:

- **Marco 1:** conhece 2 magias de Grau 0 e 2 magias de Grau 1.
- **Marco 2:** aprende +1 magia de Grau 0 e +1 magia de Grau 1.
- **Marco 3:** passa a ter acesso ao Grau 2 e aprende 1 magia de Grau 2.
- **Marco 4:** aprende +1 magia de cada Grau já acessível.
- **Marco 5:** passa a ter acesso ao Grau 3 e aprende 1 magia de Grau 3.
- **A partir do Marco 6:** a cada novo Marco, aprende +1 magia de cada Grau já acessível.

Assim, os totais mínimos são: Marco 1 — 2 G0 e 2 G1; Marco 2 — 3 G0 e 3 G1; Marco 3 — 3 G0, 3 G1 e 1 G2; Marco 4 — 4 G0, 4 G1 e 2 G2; Marco 5 — 4 G0, 4 G1, 2 G2 e 1 G3; Marco 6 — 5 G0, 5 G1, 3 G2 e 2 G3; Marco 7 — 6 G0, 6 G1, 4 G2 e 3 G3; Marco 8 — 7 G0, 7 G1, 5 G2 e 4 G3; Marco 9 — 8 G0, 8 G1, 6 G2 e 5 G3.

Grau 3 exige risco real e preparação ou condição especial quando a própria magia pedir; não substitui o Coro. Técnica que concede uma magia específica não consome necessariamente a escolha de repertório.

Uma magia aprendida permanece no repertório da personagem. Substituições permanentes acontecem por novo treino, mudança de tradição, transformação narrativa, reconstrução do método ou justificativa equivalente.

Uma personagem não-Tecelã pode aprender magia pela regra universal sem receber Trilha, Técnicas, Especializações, Forma Estável, Geometria de Área ou Chaves de Tecelão. Com Magia 0, usa normalmente `2d10 + Sintonia + Magia 0` quando a magia exigir teste. Artefato só substitui exigência quando sua regra disser isso expressamente.

## Evocações

Evocar é abrir espaço para uma presença responder. O procedimento existe para medir o vínculo sem transformar a presença em objeto.

### 34. O que é uma Evocação

Evocação é manifestação temporária de presença vinculada: espírito, memória estruturada, forma elemental, construto, eco de criatura, padrão Vitrálio, projeção, entidade de pacto ou presença artificial. Evocar não significa possuir. Presença consciente pode recusar ordem incompatível com seu Pacto.

### 35. O vínculo evocado

**Âncora.** objeto, lugar, nome, lembrança, elemento, artefato ou corpo construído.

**Forma.** como a presença aparece e quais funções consegue exercer.

**Impulso.** o que tende a fazer espontaneamente.

**Pacto.** o acordo que limita evocador e presença.

### 36. Vínculos disponíveis

Uma personagem mantém 1 Vínculo maior ou 2 Vínculos menores. O Evocador amplia esse limite por técnicas. Uma presença consciente exige consentimento e pode negociar alteração do Pacto.

No Marco 1, um Evocador começa com até 2 Vínculos menores estabelecidos, cada qual com Âncora, Forma, Impulso e Pacto definidos. A personagem pode começar com apenas um quando isso corresponde à ficção. O limite de Vínculos registra relações sustentadas, e não uma quantidade obrigatória de criaturas presentes.

Vínculo e Porte descrevem aspectos diferentes da Evocação. **Vínculo** é a relação sustentada; **Porte** é a escala da presença manifestada. A capacidade normal é 1 Vínculo Maior ou 2 Vínculos menores, salvo Técnica ou regra específica. Uma Evocação Maior usa os valores, custos, Dificuldade, manutenção e capacidades próprios do Porte Maior e continua vinculada ao Pacto que a sustenta.

O acesso normal a Evocação Maior exige a Técnica correspondente de Evocador no Marco 6. Bênção, artefato maior, pacto singular, evento de campanha ou regra equivalente só excepcionam isso quando a exceção estiver escrita.

Uma personagem não-Evocadora pode estabelecer Vínculo por pacto, treino, Dom, presente, bênção, acontecimento narrativo, artefato ou relação conquistada em campanha. Ela usa as regras universais, mas não recebe automaticamente Trilha, Técnica inicial, Especializações, manutenção gratuita, Comando Duplo ou Evocação Maior.

Para estabelecer novo Vínculo, defina Âncora, Forma, Impulso e Pacto e obtenha consentimento quando aplicável. Não há troca abstrata de “summon” sem mudança real da relação.

### 37. Convocar e modelos por porte

Role 2d10 + Sintonia + Evocação.

**Menor.** **Dificuldade:** 12 **Custo:** 1 Fluxo **Guarda base:** 12 **Vitalidade base:** 6 **Dano-base:** 3 **Movimento:** 6 **Capacidades:** uma capacidade I

**Padrão.** **Dificuldade:** 15 **Custo:** 2 Fluxos **Guarda base:** 14 **Vitalidade base:** 14 **Dano-base:** 4 **Movimento:** 6 **Capacidades:** capacidades I e II

**Maior.** **Dificuldade:** 18 **Custo:** 3 Fluxos **Guarda base:** 16 **Vitalidade base:** 24 **Dano-base:** 6 **Movimento:** 8 **Capacidades:** capacidades II e III

**Instável.** **Dificuldade:** +3 **Custo:** +1 Fluxo **Guarda base:** varia **Vitalidade base:** varia **Dano-base:** varia **Movimento:** varia **Capacidades:** Impulso pode dominar

Os valores de exemplo já incluem modificadores de Forma. Ataque comum usa x1; capacidade I usa x2; II usa x3; III usa x4. Dano, bônus fixos e Proteção seguem a regra geral.

### 38. Manutenção

Evocações duram a cena. Uma Evocação Maior custa 1 Fluxo a cada três rodadas, salvo técnica. Se o evocador cai, presença consciente decide permanecer ou partir; presença não consciente se desfaz; presença instável pode agir pelo Impulso.

### 39. Comandos

Com uma Ação, o evocador concede movimento e ataque, proteção, uso de capacidade ou interação complexa. Sem comando, a Evocação move, defende-se e cumpre ação simples do Pacto.

### 40. Formas de evocação

**Ataque e comando.** Ataque de Evocação usa 2d10 + Sintonia + Evocação do convocador contra a Defesa indicada; na ausência de indicação, usa Guarda. Aplicam-se dano-base e potência do Porte. Ataques e capacidades exigem comando por Ação, salvo texto explícito; sem comando, a ação simples do Pacto não causa dano, condição hostil nem ativa capacidade.

**Guardião.** **Função:** Interpor e proteção de área **Ajuste típico:** +2 Guarda, +4 Vitalidade, -1 Movimento **Papel:** Bastião

**Predador.** **Função:** mobilidade, rastreio e dano concentrado **Ajuste típico:** +2 Movimento, +1 dano-base, -2 Vitalidade **Papel:** Vanguarda

**Oráculo.** **Função:** percepção, memória e suporte **Ajuste típico:** +2 Integridade; dano reduzido **Papel:** Amparo

**Tempestade.** **Função:** dano em área e controle elemental **Ajuste típico:** base de área 3-4 **Papel:** Artilharia

**Artífice.** **Função:** reparo, ferramenta e construção **Ajuste típico:** +2 Guarda estrutural **Papel:** Bastião ou Amparo

**Limiar.** **Função:** rotas, ocultação e reposicionamento **Ajuste típico:** +2 Movimento **Papel:** Artilharia ou suporte

### 41. Catálogo de Evocações-modelo

As 18 presenças abaixo são modelos prontos. Jogadores podem criar outra aparência, Âncora, Impulso e Pacto usando os mesmos portes e limites, sem inventar vantagem mecânica adicional.

#### Forma Guardião

**Muralha de Ecos.** **Porte:** Menor **Âncora:** fragmento de voz preservada **Pacto:** proteger sem perseguir **Estatísticas:** G 14; V 10; D 2; M 5 **Capacidades:** Interpor; concede +1 Guarda a adjacente.

**Guardião de Quartzo.** **Porte:** Padrão **Âncora:** fragmento de quartzo inscrito **Pacto:** defender o portador sem perseguição **Estatísticas:** G 16; V 18; D 4; M 5 **Capacidades:** Interpor; Barreira de Quartzo 8, 1/cena.

**Colosso de Juramento.** **Porte:** Maior **Âncora:** pedra de pacto testemunhado **Pacto:** sustentar promessa legítima **Estatísticas:** G 18; V 30; D 6; M 4 **Capacidades:** Muralha 3 células; ataque II x3; não obedece ordem que viole o Pacto.

#### Forma Predador

**Fera de Estilhaço.** **Porte:** Menor **Âncora:** dente, garra ou memória de caça **Pacto:** caçar somente alvo nomeado **Estatísticas:** G 12; V 6; D 4; M 8 **Capacidades:** Rastreio +2; Salto I x2.

**Lobo de Fresta.** **Porte:** Padrão **Âncora:** rota marcada entre duas sombras **Pacto:** não abandonar o bando **Estatísticas:** G 14; V 12; D 5; M 8 **Capacidades:** Mordida I x2; atravessa ocupação e terreno difícil.

**Garuda Fratal.** **Porte:** Maior **Âncora:** pena, sino de vento e horizonte aberto **Pacto:** transportar e defender, não capturar **Estatísticas:** G 16; V 24; D 7; M 10 **Capacidades:** Voo; Investida II x3; Rajada III de área base 3 x4, 1/cena.

#### Forma Oráculo

**Eco do Jardim.** **Porte:** Menor **Âncora:** memória vegetal consentida **Pacto:** não revelar intimidade sem consentimento **Estatísticas:** G 12; V 6; D 0; M 5 **Capacidades:** +2 Investigação; cura 2 Lucidez, 1/cena.

**Olho de Vael.** **Porte:** Padrão **Âncora:** prisma de observação **Pacto:** mostrar padrões, não decisões **Estatísticas:** G 14; V 10; D 2; M 6 **Capacidades:** Revela invisível; pergunta sobre fraqueza 1/cena.

**Arquivo Aelvari.** **Porte:** Maior **Âncora:** canto genealógico preservado **Pacto:** testemunhar sem impor uma versão **Estatísticas:** G 15; V 20; D 3; M 5 **Capacidades:** Horizonte Partilhado; recupera memória; pode recusar uso como prova coercitiva.

#### Forma Tempestade

**Centelha Draken.** **Porte:** Menor **Âncora:** escama e elemento **Pacto:** manifestar sem consumir o ambiente **Estatísticas:** G 12; V 6; D 3; M 7 **Capacidades:** Ataque elemental I x2; ilumina ou aquece.

**Serpente de Tormenta.** **Porte:** Padrão **Âncora:** fio metálico e trovão registrado **Pacto:** percorrer a área, não perseguir civis **Estatísticas:** G 14; V 12; D 4; M 8 **Capacidades:** Linha elétrica I x2; desloca alvos 1 célula.

**Coro dos Céus Partidos.** **Porte:** Maior **Âncora:** três âncoras elementais **Pacto:** encerrar apenas ameaça declarada **Estatísticas:** G 16; V 22; D 6; M 8 **Capacidades:** Tempestade II x3 em 3 x 3; Cataclismo III base 4 x4, 1/cena.

#### Forma Artífice

**Mão Nomos.** **Porte:** Menor **Âncora:** ferramenta integrada **Pacto:** reparar antes de substituir **Estatísticas:** G 13; V 8; D 2; M 5 **Capacidades:** Ferramenta universal; repara 4 Integridade.

**Autômato de Ponte.** **Porte:** Padrão **Âncora:** modelo modular e placa de função **Pacto:** manter passagem segura **Estatísticas:** G 15; V 16; D 4; M 5 **Capacidades:** Ergue cobertura; carrega; reparo II base 4 x3.

**Oficina Caminhante.** **Porte:** Maior **Âncora:** núcleo de obra e conjunto completo **Pacto:** criar sem apagar autoria alheia **Estatísticas:** G 17; V 28; D 5; M 4 **Capacidades:** Produz recursos; Barreira 16; Sobrecarga III base 5 x4, 1/cena.

#### Forma Limiar

**Guia Nimari.** **Porte:** Menor **Âncora:** moeda perdida e mapa incompleto **Pacto:** mostrar saída, não escolher por alguém **Estatísticas:** G 13; V 6; D 2; M 8 **Capacidades:** Ignora terreno; aponta rota segura.

**Andarilho do Umbral.** **Porte:** Padrão **Âncora:** porta sem destino e nome de passagem **Pacto:** manter caminhos reversíveis **Estatísticas:** G 15; V 12; D 4; M 9 **Capacidades:** Reposiciona aliado 4 células; ataque I x2 após atravessar.

**Navegante de Kethrell.** **Porte:** Maior **Âncora:** âncora dupla nas duas camadas **Pacto:** atravessar somente com consentimento **Estatísticas:** G 17; V 24; D 5; M 10 **Capacidades:** Ponte Breve; estabiliza Fenda; Colapso de Rota III base 4 x4, 1/cena.

### 42. Criação de Evocação própria

Para criar uma Evocação, determine primeiro o porte e aplique seus valores-base. Escolha então uma Forma e incorpore o ajuste correspondente. A presença precisa de Âncora, aparência, Impulso e Pacto definidos antes de receber capacidades compatíveis com sua escala. Declare também se ela possui consciência própria. A criação termina quando a mesa confirma que nenhuma capacidade ultrapassa a potência permitida para o porte escolhido.

### 43. Falha de evocação

Escolha ou role: forma incompleta; Impulso domina um turno; custo +1 Fluxo; Âncora sofre dano; Pacto exige reparação; Fenda percebe a convocação; memória alheia interfere; Sombra oferece estabilidade em troca de Marca.

## VELARIM EM JOGO

Velarim é a linguagem relacional herdada da realidade anterior à Fratura. Em jogo, seu uso depende de uma forma reconhecida no léxico, do sentido que ela carrega e da relação concreta em que é empregada. Contexto e registro importam tanto quanto pronúncia; energia sem forma adequada produz ruído, enquanto forma sem relação permanece inerte.

### 44. Usar Velarim

**Analisar.** Role `2d10 + Intelecto + Velarim` para reconhecer morfemas, distinguir registros, comparar inscrições, perceber ambiguidades ou identificar uma tradução institucional.

**Pronunciar.** Role `2d10 + Sintonia + Velarim` para ativar uma forma conhecida quando a situação sustenta seu sentido.

**Inscrever.** Role `2d10 + Intelecto ou Sintonia + Ofício ou Velarim` para fixar uma forma durável em matéria, superfície ou suporte apropriado.

**Traduzir.** Traduções complexas são testes prolongados. Uma tradução responsável preserva o texto-fonte, registra alternativas relevantes e deixa claro o grau de certeza de cada escolha. Formas ainda sem autoridade permanecem marcadas como tais.

### 45. Forma e efeito

Uma forma correta pode reduzir em 1 o custo de uma magia, ampliar sua duração, estabilizar uma Fenda, revelar uma relação oculta, proteger uma identidade, ativar um Artefato ou cumprir um juramento quando a ficção sustenta esse vínculo. O efeito nasce da relação adequada entre forma, intenção e situação.

### 46. Erro e corrupção

Uma forma mal compreendida pode deslocar o efeito, atingir relação diferente da pretendida, aumentar o custo ou abrir espaço para Pressão. Em situações mais graves, o erro pode produzir uma abertura indevida ou favorecer a Sombra. O Mestre escolhe a consequência que melhor nasce da ficção e da Margem do teste.

### 47. Limites e autoridade de Velarim

Velarim usa formas reconhecidas, contexto e relação. A IA, o jogador ou o Mestre não criam automaticamente léxico canônico durante a cena. Formas ainda sem autoridade permanecem marcadas como tais.

## Merge

**Vethari** nomeia uma forma legítima de união em que identidade, autonomia e consentimento permanecem. As regras de Merge abaixo traduzem essa relação para a mesa e também descrevem suas formas coercivas ou corrompidas.

### 48. Formas de Merge

**Duração e combinação.** Merge dura até o fim da cena por padrão. Divisão de dano usa inteiros; arredonde para baixo a parcela igual e atribua o excedente a quem conduziu. Combinar Técnicas não acumula multiplicadores: use a maior potência, pague todos os custos e preserve apenas efeitos secundários compatíveis.

Merge reúne procedimentos de integração entre partes relacionadas pela Fratura. A forma chamada **vethari** preserva a identidade de cada participante, mantém sua autonomia e depende de consentimento. Outras formas de Merge podem produzir vínculos temporários, coerção ou assimilação, conforme a situação.

#### 1. Ressonância compartilhada

Os participantes permanecem separados e compartilham, por tempo limitado, percepção, poder, memória escolhida, movimento ou efeito mágico. Aqui, “Ressonância” nomeia uma integração interpessoal temporária. A Ressonância dos dados e a Ressonância Coletiva do Coro continuam sendo procedimentos próprios.

#### 2. União voluntária

É uma relação mais profunda e temporária. Exige consentimento explícito, objetivo compreendido, duração definida, direito de saída e consequência aceita pelos participantes. O vínculo pode ser intenso sem apagar a distinção entre as pessoas.

#### 3. Fusão forçada

É violência: a autonomia de alguém é atravessada sem consentimento ou sob coerção. Pode ser usada por antagonistas, experimentos, instituições ou efeitos da Sombra. Personagens jogadores não a realizam como ação neutra; quando aparece em jogo, deve ser tratada como ameaça, dano ou conflito a interromper.

#### 4. Merge corrompido

A relação é substituída por assimilação. Identidade, autonomia ou consentimento deixam de governar a integração, e a diferença passa a ser tratada como falha a corrigir. É uma manifestação de Sombra ou de uma estrutura que reproduz sua lógica, mesmo quando se apresenta como cura, unidade ou eficiência.

### 49. Procedimento de Merge legítimo

Um Merge legítimo começa pelo consentimento de todos os participantes. Antes do teste, o grupo define o que será compartilhado, estabelece os limites dessa partilha, escolhe uma Âncora e combina a duração. Cada participante paga **1 Fluxo**. Uma pessoa conduz a rolagem e as demais podem ajudar.

Role `2d10 + Sintonia + Empatia, Magia, Evocação ou Velarim` contra **Dificuldade 15**. A Perícia escolhida deve corresponder à forma de relação usada para sustentar o Merge.

### 50. Benefícios

Em sucesso, escolha **dois** benefícios adequados à ficção. O Merge pode compartilhar sentidos, dividir dano, combinar uma Técnica, coordenar movimento, sustentar magia conjunta, resistir à assimilação, estabilizar uma Fenda ou preencher **1 Pulso** coletivo.

### 51. Limites

A partilha respeita os limites definidos antes do teste. Memórias permanecem sob controle de quem as possui; personalidade e consentimento continuam individuais. O Merge cria relação durante a duração escolhida, sem estabelecer posse, obrigação afetiva ou solução automática para conflitos anteriores.

### 52. Encerramento

Qualquer participante pode encerrar o Merge. Se a separação acontecer sob pressão extrema, o Mestre pode aplicar **2 de dano de Lucidez**, a condição **Dissonante**, perda temporária de Fluxo ou um eco sensorial coerente com aquilo que foi compartilhado. A pessoa continua inteira depois da separação.

## Combate e grade ortogonal

A grade desenha o risco com linhas suficientes para que posição e distância permaneçam claras quando a decisão cai.

### 53. Escala

O jogo funciona por zonas narrativas ou mapa tático ortogonal.

Antes do início da cena, escolha a escala espacial: grade ou zonas. A cena não
precisa converter obrigatoriamente uma escala na outra.

Na grade, cada célula representa **1,5 metro** e uma ação de Movimento concede
**6 pontos**. Em zonas, uma ação de Movimento concede **2 zonas**. Essas escalas
não possuem conversão matemática obrigatória durante a mesma resolução; ao mudar
de escala, o Mestre posiciona os participantes conforme a ficção.

Quando a cena usar verticalidade, cada nível vertical representa **1,5 metro**.

A grade usa células quadradas ou retangulares. Hexágonos, coordenadas axiais e distância hexagonal não pertencem à regra vigente.

### 54. Movimento e ocupação

Na grade, mover-se para uma célula que compartilha um lado custa 1 ponto e uma
diagonal custa 2. O Movimento pode ser gasto antes da Ação, depois dela ou
dividido ao redor dela. Pontos não usados são perdidos no fim do turno. Em zonas,
o Movimento normal é de 2 zonas. Uma personagem pode gastar sua Ação para
realizar um segundo Movimento no mesmo turno: Correr concede +6 pontos na grade
ou +2 zonas.

Na grade, terreno Normal custa 1 ponto por célula, Difícil custa 2, Severo custa
3 e Intransponível não pode ser atravessado. O custo da célula é aplicado também
à diagonal conforme a geometria do deslocamento. Em zonas, terreno Normal não
altera o deslocamento; terreno Difícil ou Severo limita o deslocamento a no
máximo 1 zona; terreno Intransponível não é atravessado. Categorias de terreno
não se acumulam: use somente a mais restritiva. Perigo ambiental é separado da
dificuldade de Movimento e define sua própria consequência.

Escalada e natação contam como terreno Difícil. Quando houver risco ou
consequência relevante, o Mestre pode exigir Atletismo; a consequência da falha
depende da situação. Capacidades específicas podem excepcionar essas regras.

Uma criatura pode atravessar células ocupadas por aliados pagando o Movimento
normalmente, mas não pode terminar seu Movimento compartilhando a mesma célula.
Uma criatura não pode atravessar espaço ocupado por inimigo, salvo capacidade
que permita explicitamente. Não há teste universal para passagem por inimigo.

Toda criatura ocupa integralmente seu footprint. Para mover-se para uma nova
posição, todas as células de destino precisam ser válidas; uma criatura não
atravessa passagem menor que seu footprint, salvo capacidade específica. Alcance
e adjacência podem ser medidos a partir de qualquer célula ocupada pela criatura.

Deslocamento forçado move o alvo pela distância e direção definidas pelo efeito,
não provoca a Reação normal por sair de adjacência e, se encontrar destino
inválido ou obstáculo, termina na última posição válida. Colisão não causa dano,
salvo quando o próprio efeito disser isso.

Quando altura importar, cada nível vertical representa **1,5 metro** e cada nível
percorrido conta como 1 unidade de deslocamento vertical antes de modificadores
específicos. Não há sistema geral de cubos, facing ou física tridimensional.

Uma capacidade que conceda Voo usa o Movimento normal em três dimensões:
movimento horizontal e mudança de nível consomem deslocamento normalmente. A
criatura pode permanecer no ar enquanto o Voo estiver funcional; se perder o Voo
sem alcançar superfície segura, sofre uma queda. Capacidades específicas podem
definir comportamento diferente.

Teleporte não provoca Reação. Seu destino precisa ser válido e desocupado, salvo
quando a própria capacidade disser o contrário.

Duas criaturas são adjacentes quando suas células compartilham um lado. Contato apenas pelo vértice não conta para engajamento, proteção ou reação.

Criatura comum ocupa 1 célula; Grande, normalmente 2x2; Enorme, 3x3 ou mais. Veículos e Evocações usam a base registrada. Montarias não possuem footprint tático próprio.

O footprint geral de criaturas Colossais permanece **DEFERRED**.

## Montarias e pets

Montarias e pets são elementos de ficção e conveniência. Não pertencem à economia de combate.

### Montarias

Uma montaria não possui ficha nem Vitalidade, Guarda, Ação, Movimento ou Reação próprios. Não ataca, não pode ser usada como alvo tático, não concede bônus de ataque, defesa, dano ou iniciativa, não aumenta o Movimento tático da personagem, não ocupa footprint relevante, não provoca nem recebe Reações e não possui progressão por Marco. Sua função é o deslocamento narrativo fora de combate.

Se o combate começa enquanto uma personagem está montada, ela entra na cena como qualquer outra personagem. Não há Ação obrigatória para montar ou desmontar, e a montaria não é representada no mapa.

### Pets

Pet não possui ficha, não ataca, não causa dano, não concede bônus, não bloqueia célula, não flanqueia, não gera vantagem, não ativa armadilha propositalmente, não faz teste, não detecta inimigos, não substitui Percepção, Sobrevivência ou Batedor, não transporta personagem, não participa de Coro, Merge ou Ressonância e não progride.

Um pet pode buscar ou trazer um pequeno objeto acessível no chão quando não houver oposição, perigo ou consequência tática relevante. Se houver qualquer uma dessas condições, isso deixa de ser função de pet e deve ser resolvido pelas regras normais da cena, quando houver.

**Pet ≠ Evocação. Montaria ≠ Evocação.** Evocação é presença mecanicamente relevante e segue as regras próprias de vínculo, porte, comando e capacidades.

### 55. Rodada

Cada personagem possui 1 Movimento, 1 Ação, 1 Reação e ações livres breves.

### 56. Iniciativa por lados

**Empate.** Empate de iniciativa é rerrolado pelos mesmos representantes até existir total diferente. A regra geral de empate não substitui este procedimento.

Cada lado escolhe um representante e rola **2d10 + Agilidade + Percepção**. O lado vencedor escolhe agir primeiro ou segundo. Depois, os lados alternam uma ativação. Cada criatura realiza no máximo uma ativação por rodada, salvo regra específica. Quando um lado não possuir mais ativações disponíveis na rodada, o outro lado conclui, em qualquer ordem, todas as ativações que ainda lhe restarem. Ativações adicionais de Chefes contam como oportunidades próprias do lado e seguem a quantidade declarada no bloco.

### 57. Ações

Ações comuns: atacar, lançar magia, convocar, comandar Evocação, ajudar, correr, defender, usar item, preparar, interagir, recuperar ou realizar objetivo da cena.

**Correr.** Gaste a Ação para realizar um segundo Movimento no mesmo turno.

Regras de combate específicas para rastejar e saltar permanecem **DEFERRED**.

### 58. Ataque

#### Corpo a corpo

Role **2d10 + Corpo ou Agilidade + Combate** contra a Guarda do alvo.

#### Distância

Role **2d10 + Agilidade + Pontaria** contra a Guarda do alvo.

#### Magia

Conforme a magia, normalmente 2d10 + Sintonia + Magia contra Guarda, Fortitude ou Integridade.

### 59. Dano e potência

Armas possuem dano-base fixo. Ataques comuns usam x1. Técnicas e magias usam a escala de potência.

Dano final =

(dano-base x multiplicador do nível)

\+ bônus de margem

\+ modificadores fixos

\+ Corpo, quando Potente

\- Proteção

A potência multiplica o dano-base em **x2 no Nível I, x3 no Nível II, x4 no Nível III e x5 no Nível IV**. Um sucesso forte acrescenta **+2** ao dano e um sucesso extraordinário acrescenta **+4**. Depois da Proteção, o dano mínimo é 1, salvo regra específica.

Dano verdadeiro ignora Proteção comum e não recebe multiplicador, salvo texto explícito.

Quando o dano deriva diretamente de entidade cujo Atributo relevante é 5 ou maior, multiplique o dano-base pelo Multiplicador de Escala desse Atributo antes do multiplicador de Nível ou Grau:

Dano-base escalado = dano-base × escala

Dano final = dano-base escalado × potência + margem + modificadores fixos + Corpo, quando Potente - Proteção.

Não multiplique margem, bônus fixos ou Proteção. Use Corpo para força corporal, Sintonia para manifestação cuja escala derive diretamente dela e outro Atributo somente quando a regra disser. Arma comum não se torna cosmológica porque foi descrita nas mãos de alguém. A fórmula continua válida acima de Atributo 20.

### 60. Cobertura, linha de efeito e áreas

**Ataques de área.** Ataque de área usa uma rolagem e compara o total separadamente à Defesa de cada alvo; Predominância e Ressonância ocorrem uma vez. Uma fonte só excepciona se disser “um ataque para cada alvo”.

Uma área aplica seu efeito **uma vez por criatura**, mesmo quando a criatura ocupa várias células, salvo regra específica em contrário.

**Parcial.** **Efeito:** +2 Guarda

**Forte.** **Efeito:** +4 Guarda

**Total.** **Efeito:** não pode ser alvo direto

Trace a linha entre posições válidas do agente e do alvo. Para criaturas Grandes,
escolha uma célula ocupada pelo agente e uma célula ocupada pelo alvo. Quando
parede, objeto ou criatura bloquear parte relevante, aplique cobertura. Contato
exato apenas por um canto não constitui, sozinho, bloqueio total. Linha de efeito
bloqueada impede o ataque.

Áreas usam modelos visuais da grade: linha, cone, quadrado, explosão, aura,
parede ou zona. Uma criatura é atingida se pelo menos uma célula de seu
footprint estiver validamente incluída, mas cada aplicação afeta cada criatura no
máximo uma vez. Quando a geometria ficar ambígua, priorize clareza visual e
decisão consistente, não vantagem retroativa.

Cada efeito persistente define seu próprio gatilho: entrar, começar turno,
terminar turno, uma vez por rodada ou outro. Não há gatilho universal.

### 61. Engajamento e objetivo da cena

Sair de célula adjacente a inimigo sem Recuar provoca reação. Recuar usa o Movimento para sair sem provocar. A diagonal não cria engajamento por si mesma.

Nem todo combate termina com morte. Objetivos incluem proteger, atravessar, impedir ritual, obter prova, resgatar, convencer, atrasar, sobreviver, fechar passagem ou estabilizar Fenda. O Mestre declara o objetivo visível da cena.

## Condições, queda e morte

Alguns golpes terminam quando o dano é anotado. Outros permanecem no corpo, na atenção ou na história. Esta seção distingue esses estados para que consequência não dependa apenas de memória da mesa.

Queda física é um perigo ambiental cuja consequência depende da altura, da
superfície e da situação. Dano detalhado de queda permanece **DEFERRED**. Queda
física não é a mesma coisa que a condição **Caído**.

### 62. Condições

**Remoção de Lacaio.** Lacaio é removido ao sofrer pelo menos 1 dano depois da Proteção de um acerto relevante. Efeito sem dano só remove quando disser explicitamente. Cura não devolve Lacaio removido, salvo regra específica.

**Duração padrão.** Se uma fonte aplicar condição sem duração, ela dura até o fim do próximo turno da fonte; remoções específicas continuam válidas.

Cada condição declara aplicação, efeito, duração e remoção. Quando a fonte não fixar duração diferente, ela dura até o fim da duração indicada pelo efeito ou até um procedimento de remoção adequado.

**Abalado.** **Gatilho/aplicação:** efeito que abala **Efeito:** -2 no próximo teste **Duração:** conforme a fonte **Remoção:** fim da duração ou cuidado

**Exposto.** **Gatilho/aplicação:** abertura, cobertura rompida ou efeito **Efeito:** ataques contra você recebem +2 **Duração:** conforme a fonte **Remoção:** fim da duração ou cobertura

**Imobilizado.** **Gatilho/aplicação:** efeito que prende o corpo **Efeito:** não se move **Duração:** conforme a fonte **Remoção:** gastar Ação, superar efeito ou tratamento

**Lento.** **Gatilho/aplicação:** terreno, ferida ou efeito corporal **Efeito:** Movimento reduzido em 2 células; em zonas, em 1 zona; não abaixo do mínimo ficcional salvo Imobilizado **Duração:** conforme a fonte **Remoção:** fim da duração, tratamento ou efeito que remova

**Sangrando.** **Gatilho/aplicação:** ferida ou efeito indicado **Efeito:** perde 2 Vitalidade ao fim do turno **Duração:** até Cuidado ou fonte indicada **Remoção:** Cuidado ou efeito restaurador

**Silenciado.** **Gatilho/aplicação:** efeito que impede voz **Efeito:** bloqueia fala, comando vocal, canto, magia, Técnica ou rito somente quando a regra exigir voz; gesto, inscrição, foco, pensamento e vínculo continuam válidos quando permitidos **Duração:** conforme a fonte **Remoção:** fim da duração ou efeito apropriado

**Dissonante.** **Gatilho/aplicação:** choque de frequência, identidade ou relação **Efeito:** -2 em Sintonia, Velarim, Merge e Evocação **Duração:** conforme a fonte **Remoção:** tratamento, reparação ou efeito que remova

**Fraturado.** **Gatilho/aplicação:** queda de Lucidez ou Fenda **Efeito:** não recupera Fluxo e sofre +1 Lucidez de efeitos de Fenda **Duração:** conforme a fonte **Remoção:** tratamento, Pausa Segura quando indicada ou reparação

**Corrompido.** **Gatilho/aplicação:** Sombra acessa relação ou virtude **Efeito:** registre intensidade; impõe Pressão 1 nos testes diretamente comprometidos **Duração:** conforme a fonte **Remoção:** reparação, devolução de autonomia, ritual ou recuperação de Sombra

**Caído.** **Gatilho/aplicação:** Vitalidade 0 **Efeito:** perde concentração, não realiza ações comuns e pode falar brevemente **Duração:** até estabilização ou morte **Remoção:** estabilização, cura ou procedimento de morte

### 63. Cair a zero

**Permanência.** Cada instância de dano depois da Proteção sofrida enquanto Caído marca uma falha de Permanência. A contagem continua limitada a três; Ferimento Grave segue dano excedente e ficção.

Ao chegar a 0 Vitalidade fica Caído, perde concentração, não realiza ações comuns ou pode falar brevemente.

No início de cada turno enquanto estiver Caído, realiza um **Teste de Permanência**, salvo se uma regra específica disser que a pessoa está automaticamente estável:

2d10 + Corpo + Atletismo contra Dificuldade 12.

A contagem de sucessos e falhas é cumulativa durante a mesma condição Caído. Três sucessos estabilizam: encerre a contagem, remova Caído e, se a personagem ainda estiver com 0 Vitalidade, ajuste sua Vitalidade para 1. Três falhas produzem morte ou consequência terminal escolhida conforme o tom da campanha. Sempre que uma regra disser apenas “estabilize”, sem declarar cura ou Vitalidade resultante, aplique este mesmo procedimento.

### 64. Dano excedente

**Arredondamento.** Arredonde somente o resultado final para baixo, mínimo 0, salvo dano cujo mínimo após Proteção seja 1. Regra específica de arredondamento prevalece.

**Dano excedente** é o dano final, depois de subtrair Proteção, que ultrapassa a Vitalidade que a pessoa tinha antes do golpe. Se esse dano excedente for igual ou superior à Fortitude, marque Ferimento Grave quando a ficção do golpe justificar, mesmo que a pessoa seja estabilizada. Ferimento Grave descreve lesão concreta e impõe Pressão 1 nas rolagens diretamente comprometidas por ela. Não desaparece por Pausa Segura; exige tratamento apropriado, recuperação prolongada ou efeito específico e pode permanecer como consequência narrativa depois da estabilização. Dano alto não produz automaticamente a mesma lesão em todos os contextos.

### 65. Morte

Morte não deve ser casualmente revertida.

Efeitos podem recuperar alguém Caído, mas não alguém cuja morte já foi estabelecida após a cena.

Artefatos ou eventos excepcionais podem desafiar isso apenas com custo de campanha.

### 66. Lucidez zero

Ao chegar a 0 Lucidez sofre Ruptura, não perde automaticamente o controle, escolhe uma reação: fuga, congelamento, confissão, isolamento ou pedido de ajuda, recebe uma Cicatriz ou volta com 1 Lucidez após a cena.

## Ressonância Coletiva

Há momentos em que um grupo age como grupo sem deixar de ser feito de pessoas distintas. A Ressonância Coletiva mede essa convergência sem transformar acordo em mente única.

### 67. Conceito

A Ressonância Coletiva registra o momento em que as ações do grupo começam a responder umas às outras. Na mesa, ela é chamada simplesmente de **Coro**. Todos contribuem para esse recurso compartilhado, mas uma personagem o manifesta por vez, sem apagar a identidade das demais.

### 68. Medidor compartilhado

O grupo possui um único medidor dividido em Barras.

Cada Barra contém 4 Pulsos.

**1-2 personagens.** **Máximo:** 1 Barra

**3-4 personagens.** **Máximo:** 2 Barras

**5-8 personagens.** **Máximo:** 3 Barras

**grupos maiores.** **Máximo:** 3 Barras

Cada Barra possui quatro espaços: `□ □ □ □`. Quando houver mais de uma, registre as Barras lado a lado.

### 69. Como preencher

**Relógios.** Relógio favorável: sucesso preenche 1 segmento, sucesso forte 2 e extraordinário 3. Relógio adverso: falha preenche 1 e falha severa 2 quando pertinente. Uma causa não preenche os dois relógios.

Uma personagem gera no máximo 1 Pulso por rodada.

O grupo recebe 1 Pulso quando uma ação de Papel muda de verdade a posição coletiva sob risco real. **Vanguarda** pode gerar esse Pulso ao abrir ou explorar uma brecha decisiva no corpo a corpo. **Artilharia** o produz quando controla uma área perigosa, atinge múltiplas ameaças relevantes ou interrompe uma preparação inimiga. **Amparo** contribui ao impedir uma queda, restaurar Lucidez ou identidade e remover uma condição que comprometia a cena. **Bastião** o faz ao absorver um golpe importante, sustentar uma posição crítica ou impedir que o grupo seja deslocado.

Algumas ações pertencem ao grupo inteiro: uma Ressonância nos dados, uma Promessa cumprida sob risco, um vínculo reparado durante o conflito, uma consequência aceita para proteger alguém, um Merge legítimo relevante ou uma resistência coletiva à Sombra também podem gerar 1 Pulso.

### 70. O que fica fora do Coro

O Coro cresce quando existe risco compartilhado e contribuição real. Ações triviais, dano provocado apenas para explorar a regra, repetição sem relevância ou prolongamento artificial de combate não geram Pulsos. Um alvo indefeso tampouco serve como fonte de preenchimento.

O Mestre anuncia quando uma ação gerou Pulso.

### 71. Persistência

O medidor começa vazio no início da sessão e pode acompanhar cenas relacionadas da mesma operação. Um Descanso Completo remove 1 Barra cheia. Quando o arco de perigo termina, o Coro retorna a zero; ele existe para carregar impulso entre cenas próximas, não para ser acumulado indefinidamente.

Uma luta contra chefe pode começar com 1 Barra preenchida quando a campanha preparou explicitamente esse confronto.

### 72. Ativação

**Ações do Coro.** Vanguarda, Artilharia e Amparo usam Ação. Bastião usa Reação. Uma entrada pode excepcionar apenas se declarar a exceção. Mantêm-se o limite de uma ativação por rodada e a ausência de segunda Ação.

O Coro é recurso do grupo; nenhuma personagem o possui individualmente. Para ativá-lo, deve existir ao menos 1 Barra completa. O grupo decide utilizá-la, escolhe a personagem que liderará a manifestação, escolhe efeito compatível com seu Papel, gasta as Barras e resolve o efeito.

A ativação não exige uma segunda Ação. Ela é declaração coletiva associada à Ação ou Reação que produz o momento de Coro, e a personagem ainda precisa ter a Ação ou Reação exigida pelo efeito. Em efeito ofensivo ou ativo, declare ação, alvo/área e gasto antes da rolagem. Em efeito defensivo ou reativo, declare após o gatilho e antes da resolução final que a reação pretende alterar.

Há no máximo 1 ativação do Coro por rodada e 1 efeito de Coro ligado à mesma Ação ou Reação. O grupo deve ter oportunidade de concordar; o Mestre não toma posse do recurso.

### 73. Níveis

A potência do Coro acompanha o número de Barras consumidas: **1 Barra ativa o Nível I, 2 Barras o Nível II e 3 Barras o Nível III**. O terceiro nível é raro e deve ter escala suficiente para alterar uma cena inteira.

Quando uma regra associar Barras a níveis, use: 1 Barra = Nível I, 2 Barras = Nível II e 3 Barras = Nível III. Não existe Nível IV ordinário.

### 74. Vanguarda — golpe concentrado

Vanguarda concentra o Coro sobre um chefe, criatura singular, alvo prioritário ou estrutura crítica.

#### Nível I — Corte da Fresta

Faça um ataque automático contra um alvo em alcance. O ataque causa **12 de dano verdadeiro** e ignora Proteção comum.

#### Nível II — Horizonte Partido

Cause **22 de dano verdadeiro**. Além do dano, remova uma defesa, encerre uma concentração, rompa uma barreira ou force uma mudança de fase coerente com a cena.

#### Nível III — Veredito dos Dois Mundos

Cause **35 de dano verdadeiro**. Proteção comum não reduz esse dano. Depois, escolha um efeito adicional: interromper uma habilidade catastrófica, quebrar um núcleo, expor uma verdade física ou impedir a fuga do alvo por uma rodada. Contra entidades cuja existência depende de regras próprias de campanha, o efeito altera a fase do confronto em vez de ignorar essas regras.

### 75. Artilharia — efeito de área

Artilharia transforma o Coro em pressão sobre grupos numerosos, enxames, áreas ocupadas ou múltiplas ameaças.

#### Nível I — Chuva de Estilhaços

Afete uma zona e cause **8 de dano** a cada inimigo nela. Aliados permanecem fora do efeito.

#### Nível II — Onda dos Horizontes

Afete até duas zonas conectadas e cause **14 de dano** a cada inimigo atingido. Escolha elemento, frequência ou forma narrativa coerente com a manifestação do grupo.

#### Nível III — Céu Fraturado

Afete todo o campo hostil visível. Inimigos comuns sofrem **20 de dano**, elites sofrem **15** e chefes sofrem **10**. O efeito também destrói perigos ambientais menores e interrompe preparações coletivas que possam ser alcançadas pela manifestação.

### 76. Amparo — restauração coletiva

Amparo sustenta o grupo em cenas de colapso, múltiplos Caídos, dano severo ou assimilação em massa.

#### Nível I — Pulso de Retorno

Todos os aliados recuperam **6 Vitalidade** e **3 Lucidez**. Remova **Abalado** de cada um que estiver sob essa condição.

#### Nível II — Coro Restaurador

Todos os aliados recuperam **12 Vitalidade** e **6 Lucidez**. Cada um remove uma condição comum. Personagens Caídos ficam estáveis com **1 Vitalidade**.

#### Nível III — Todos os Nomes Retornam

Aliados que caíram durante a cena retornam com metade da Vitalidade e metade da Lucidez, levantam-se e removem uma condição severa ou recuperam sua identidade contra uma assimilação em curso. Aliados conscientes escolhem recuperar toda a Vitalidade ou toda a Lucidez.

O efeito atua sobre as consequências da cena atual. Ferimentos Graves, escolhas já realizadas e Sombra permanente continuam exigindo os procedimentos próprios de reparação e recuperação.

### 77. Bastião — proteção absoluta

Bastião manifesta o Coro para atravessar um golpe inevitável, colapso ambiental, ataque de chefe ou travessia catastrófica.

#### Nível I — Guarda Compartilhada

Até o próximo turno, o grupo recebe **+4 Guarda** ou reduz em **4** todo dano sofrido. A escolha é feita quando o efeito é ativado.

#### Nível II — Muralha das Duas Realidades

Por uma rodada, reduza pela metade todo dano sofrido pelo grupo. Como alternativa compatível com a ameaça, impeça deslocamento forçado ou medo coletivo durante a mesma duração.

#### Nível III — Ninguém Cai Sozinho

Por uma rodada, ou contra um único evento catastrófico claramente definido, reduza em **90%** o dano sofrido pelo grupo. Durante o efeito, ninguém pode cair abaixo de **1 Vitalidade**. Estruturas ou objetivos protegidos podem permanecer íntegros, e tentativas de Merge forçado ou assimilação coletiva falham enquanto o Bastião sustentar essa proteção.

Este é o recurso do grupo para sobreviver a acontecimentos que, sem preparação coletiva, destruiriam sua capacidade de permanecer na cena.

### 78. Evocador e Ressonância

Quando possui uma Evocação ativa, o Evocador pode manifestar o Coro a partir da forma presente. **Guardião** conduz ao Bastião; **Predador**, à Vanguarda; **Tempestade**, à Artilharia; **Oráculo**, ao Amparo. Sem Evocação ativa, use o Papel principal registrado na Trilha.

### 79. Ressonância narrativa

O Coro nasce das contribuições acumuladas pelo grupo. Ao ativá-lo, descreva de que maneira as ações anteriores tornaram aquela manifestação possível: a proteção que sustentou alguém, a cura que impediu uma queda, uma abertura explorada no momento certo, uma rota descoberta, uma promessa mantida ou qualquer outra contribuição realmente presente na cena.

Quem ativa o Coro dá forma final ao efeito, enquanto sua força pertence ao grupo que o construiu.

## Equipamentos

### 80. Carga

Uma personagem carrega sem Pressão 6 + Corpo espaços. Itens leves podem compartilhar espaço; armadura pesada ocupa 3.

### 81. Qualidade

**Qualidade inicial e aquisição.** Comum é a qualidade inicial. Refinado exige recompensa, fabricação ou aquisição explícita. Magistral exige projeto, material e tempo de oficina ou recompensa de arco. Nenhuma qualidade superior é escolhida por declaração.

**Precário.** **Efeito:** falha severa ou consequência adequada pode quebrar

**Comum.** **Efeito:** sem modificador

**Refinado.** **Efeito:** uma tag útil coerente

**Magistral.** **Efeito:** +1 no uso principal e duas tags úteis

**Artefato.** **Efeito:** segue regras próprias de Vínculo, Preço e Ruptura

Os valores a seguir são dano-base. Ataque comum usa x1; técnicas multiplicam o dano-base conforme o Nível. Corpo da tag Potente, margem e bônus entram depois.

### Proficiências

Ser proficiente significa possuir treino suficiente para usar o item sem penalidade de falta de treino, ativar propriedades que exijam proficiência e satisfazer pré-requisitos de Técnicas da categoria. Proficiência não concede automaticamente +2.

Quando a ficção permitir uso sem proficiência, a personagem sofre Pressão 1 nos testes que dependam diretamente do equipamento, não ativa propriedades que exijam proficiência e não satisfaz pré-requisito de Técnica correspondente.

Armadura sem proficiência mantém sua Proteção material, mas impõe Pressão 1 a testes de Agilidade que dependam de mobilidade e não ativa propriedades que exijam treinamento. As categorias usadas são armas simples, militares, de disparo, técnicas e pesadas quando o catálogo exigir; armaduras leves, médias e pesadas; além de ferramentas de Ofício, kits de Cuidado e exploração, focos mágicos, focos de vínculo e dispositivos.

### 82. Catálogo de armas

**Categorias obrigatórias.** Desarmado, improvisada, faca, clava, bastão e lança curta são armas simples; espada, sabre, machado, martelo, lança longa e lâmina ressonante são militares; lâmina grande e arma de haste são militares e pesadas; funda, arremesso, arco, besta, arma de disparo e besta pesada são de disparo, sendo a última também pesada; repetidor Nomos, projetor de quartzo e luva de inscrição são técnicas; bastão ritual é simples. Toda arma deve declarar sua categoria.

**Desarmado.** **Dano-base:** 2 **Alcance:** corpo a corpo **Tags:** leve, não letal

**Arma improvisada.** **Dano-base:** 3 **Alcance:** corpo a corpo **Tags:** precária

**Faca.** **Dano-base:** 3 **Alcance:** corpo a corpo **Tags:** leve, ocultável

**Clava.** **Dano-base:** 4 **Alcance:** corpo a corpo **Tags:** impacto

**Bastão.** **Dano-base:** 3 **Alcance:** corpo a corpo **Tags:** duas mãos, foco

**Lança curta.** **Dano-base:** 4 **Alcance:** corpo a corpo ou 6 células **Tags:** alcance, arremesso

**Espada.** **Dano-base:** 5 **Alcance:** corpo a corpo **Tags:** equilibrada

**Sabre.** **Dano-base:** 5 **Alcance:** corpo a corpo **Tags:** leve, equilibrada

**Machado.** **Dano-base:** 6 **Alcance:** corpo a corpo **Tags:** potente

**Martelo de guerra.** **Dano-base:** 6 **Alcance:** corpo a corpo **Tags:** impacto, pesado

**Lança longa.** **Dano-base:** 5 **Alcance:** 2 células **Tags:** alcance, duas mãos

**Lâmina grande.** **Dano-base:** 7 **Alcance:** corpo a corpo **Tags:** potente, pesada, duas mãos

**Arma de haste.** **Dano-base:** 6 **Alcance:** 2 células **Tags:** alcance, pesada, duas mãos

**Funda.** **Dano-base:** 3 **Alcance:** 10 células **Tags:** leve, munição

**Arma de arremesso.** **Dano-base:** 4 **Alcance:** 6 células **Tags:** arremesso, leve

**Arco.** **Dano-base:** 5 **Alcance:** 18 células **Tags:** duas mãos, munição

**Besta.** **Dano-base:** 6 **Alcance:** 18 células **Tags:** recarga, duas mãos

**Besta pesada.** **Dano-base:** 7 **Alcance:** 24 células **Tags:** recarga, pesada, perfurante, duas mãos

**Arma de disparo.** **Dano-base:** 6 **Alcance:** 18 células **Tags:** ruidosa, munição

**Repetidor Nomos.** **Dano-base:** 5 **Alcance:** 12 células **Tags:** rajada, munição, modular

**Projetor de quartzo.** **Dano-base:** 6 **Alcance:** 12 células **Tags:** mágico, foco, duas mãos

**Bastão ritual.** **Dano-base:** 3 **Alcance:** corpo a corpo **Tags:** foco

**Lâmina ressonante.** **Dano-base:** 5 **Alcance:** corpo a corpo **Tags:** mágico, equilibrada

**Luva de inscrição.** **Dano-base:** 4 **Alcance:** 6 células **Tags:** mágico, modular, foco

### 83. Tags de arma

**Leve.** **Regra:** pode ser empunhada validamente na mão secundária; pode ser sacada ou guardada como ação livre breve uma vez por turno quando fisicamente acessível; satisfaz exigências que mencionem arma Leve; não concede ataque adicional

**Equilibrada.** **Regra:** uma vez por rodada, sacar ou guardar não custa interação

**Potente.** **Regra:** adicione Corpo ao dano depois do multiplicador, máximo +3

**Alcance.** **Regra:** ataca a 2 células; não concede adjacência para outras ações

**Duas mãos.** **Regra:** não permite escudo simultâneo

**Recarga.** **Regra:** exige Movimento ou interação dedicada para preparar novo disparo

**Impacto.** **Regra:** +2 dano final contra estrutura e armadura

**Ocultável.** **Regra:** exige 2d10 + Intelecto + Percepção contra Dificuldade 15 para notar sem busca

**Foco.** **Regra:** +1 em um teste mágico específico uma vez por cena

**Pesada.** **Regra:** Movimento -1 enquanto empunhada se Corpo for 0 ou 1

**Perfurante.** **Regra:** ignore 1 Proteção comum

**Rajada.** **Regra:** gaste duas munições para +2 no ataque ou segundo alvo adjacente com metade do dano

**Munição.** **Regra:** requer reserva narrativa e pode acabar por consequência

**Modular.** **Regra:** pode trocar uma tag preparada durante Pausa Segura

**Arremesso.** **Regra:** pode ser usada no alcance indicado; precisa ser recuperada

**Mágico.** **Regra:** interage com defesas e fenômenos mágicos

**Não letal.** **Regra:** ao levar a 0 Vitalidade, pode estabilizar automaticamente

**Precária.** **Regra:** pode quebrar em falha severa ou impacto inadequado

### 84. Armaduras

**Roupas reforçadas.** **Proteção:** 1 **Modificador:** sem penalidade

**Leve.** **Proteção:** 2 **Modificador:** sem penalidade

**Média.** **Proteção:** 3 **Modificador:** -1 Furtividade

**Pesada.** **Proteção:** 4 **Modificador:** -1 Agilidade; ocupa 3 espaços

**Escudo.** **Proteção:** +1 Guarda **Modificador:** usa uma mão e pode servir como Chave

### 85. Ferramentas e Chaves utilitárias

**Kit de cura.** **Uso principal:** Cuidado, estabilização e tratamento

**Ferramentas de Artífice.** **Uso principal:** construir, reparar e operar dispositivos

**Conjunto de inscrição.** **Uso principal:** selos, juramentos e Velarim escrito

**Foco de magia.** **Uso principal:** canalizar uma tradição mágica

**Âncora de Evocação.** **Uso principal:** convocar e manter presença

**Kit de exploração.** **Uso principal:** rotas, abrigo, cordas e sobrevivência

**Analisador científico.** **Uso principal:** frequência, amostras e contenção

**Equipamento de escalada.** **Uso principal:** superfícies verticais e segurança

**Kit de disfarce.** **Uso principal:** aparência, papel social e ocultação

**Instrumentos de frequência.** **Uso principal:** som, vibração e harmônicos

Ferramenta adequada concede +2 quando relevante. Uma ferramenta vinculada pode ser Chave do Ofício correspondente.

### 86. Consumíveis

**Tônico de Vitalidade.** **Efeito:** recupera 5 Vitalidade; 1/cena por personagem

**Estabilizador de Fluxo.** **Efeito:** recupera 2 Fluxo; depois Pressão 2 em Sintonia até Pausa Segura

**Sal de Memória.** **Efeito:** +2 Integridade contra alteração de memória pela cena

**Selo de Contenção.** **Efeito:** reduz atividade mágica em área 3 x 3

**Munição de Quartzo.** **Efeito:** +2 dano final contra barreira ou construto

**Fio de Retorno.** **Efeito:** permite recuperar arma de arremesso ou Chave caída a até 6 células

**Carga de Reparo.** **Efeito:** restaura 6 Integridade estrutural

**Ampola de Repouso.** **Efeito:** recupera 3 Lucidez; deixa usuário Lento por um turno

## Artefatos

**Campos obrigatórios.** Todo Artefato possui Origem, Matéria, Memória, Promessa, Ativação, Poder manifesto, Poder profundo, Preço, Ruptura e corrupção possível. Ativação declara Ação/Reação/ritual, custo, alvo, frequência e duração. Poderes de repetição resolvem apenas a ocorrência que os ativou. Os doze artefatos do catálogo recebem os campos complementares abaixo.

**Ponte que Recorda.** **Matéria:** pedra de passagem e metal de ponte **Memória:** cada travessia testemunhada **Promessa:** não negar passagem sem causa reconhecida **Ativação:** Ação; toque uma passagem; 1 vez por cena; dura até o fim da cena **Corrupção possível:** toda passagem vira cobrança e impede retirada voluntária

**Prisma de Vael.** **Matéria:** cristal prismático ressonante **Memória:** a frequência do primeiro pacto quebrado **Promessa:** distinguir sem humilhar **Ativação:** Ação; observar uma pessoa ou objeto; 1 vez por cena; efeito instantâneo **Corrupção possível:** classifica toda emoção como prova e elimina nuance

**Página Nomos Incompleta.** **Matéria:** folha metálica de memória **Memória:** o registro que foi removido dela **Promessa:** não transformar ausência em certeza **Ativação:** Ação; consultar um registro ou sequência; 1 vez por cena; resposta em uma frase verdadeira **Corrupção possível:** reescreve uma lembrança recente do portador como fato

**Bússola de Nimaris.** **Matéria:** agulha, osso e vidro deslocado **Memória:** o caminho que não foi escolhido **Promessa:** procurar saída sem abandonar vínculos **Ativação:** Movimento; apontar um destino conhecido; 1 vez por operação; indica uma rota possível até o fim da cena **Corrupção possível:** força sempre a rota mais curta, mesmo quando destrói relações

**Lâmina de Kravor.** **Matéria:** aço juramentado e fio de cristal **Memória:** o primeiro pacto defendido **Promessa:** proteger a legitimidade, não a ambição **Ativação:** Ação; declarar o juramento protegido antes do ataque; 1 vez por rodada; +1 dano enquanto a declaração for válida **Corrupção possível:** reconhece qualquer ordem do portador como pacto legítimo

**Semente do Jardim de Memória.** **Matéria:** semente mineral viva **Memória:** a lembrança compartilhada que a gerou **Promessa:** preservar sem possuir **Ativação:** Ação; tocar uma lembrança consentida; 1 vez por cena; preserva-a até o fim da operação **Corrupção possível:** copia lembranças próximas sem consentimento

**Escudo da Assembleia Quebrada.** **Matéria:** madeira mineral e aro de metal **Memória:** a última decisão tomada sem unanimidade **Promessa:** ouvir antes de impor **Ativação:** Reação; proteger um aliado adjacente; 1 vez por cena; reduz o dano recebido em 2 após Proteção **Corrupção possível:** converte toda divergência em ameaça que deve ser silenciada

**Máscara dos Nomes Não Ditos.** **Matéria:** cerâmica escura e fios de escrita **Memória:** os nomes apagados de uma comunidade **Promessa:** não usar anonimato para usurpar **Ativação:** Ação; ocultar identidade de rastreio institucional; 1 vez por cena; dura até o fim da cena **Corrupção possível:** apaga do portador o nome de quem ele mais precisa reconhecer

**Martelo do Primeiro Reparo.** **Matéria:** liga de oficina e núcleo de quartzo **Memória:** o primeiro objeto restaurado **Promessa:** reparar sem absolver a função opressiva **Ativação:** Ação; tocar uma obra; 1 vez por cena; restaura 4 Integridade **Corrupção possível:** repara a função material e reforça a violência nela inscrita

**Ampulheta de Ecos Paralelos.** **Matéria:** vidro de areia cristalina **Memória:** a cena que poderia ter ocorrido **Promessa:** aceitar o presente sem substituí-lo **Ativação:** Reação; após teste próprio; 1 vez por sessão; refaz o teste conforme a regra da Ampulheta **Corrupção possível:** substitui uma memória presente por uma alternativa não vivida

**Coração de Tempestade Draken.** **Matéria:** núcleo elemental em metal vivo **Memória:** a primeira tempestade ancestral **Promessa:** não converter força em supremacia **Ativação:** Ação; declarar elemento e alvo; 1 vez por operação; ataque Nível III base 5 x4 **Corrupção possível:** a descarga atinge também um inocente ou estrutura próxima

**Espelho Vitrálio de Duas Frequências.** **Matéria:** vidro de duas cores e prata **Memória:** a emoção do corpo correspondente **Promessa:** comunicar sem vigiar **Ativação:** Ação; escolher posição correspondente; 1 vez por cena; comunicação breve até o fim da cena **Corrupção possível:** torna toda emoção observada uma obrigação de resposta

Alguns objetos acumulam uso até que carregá-los deixe de ser o mesmo que possuir equipamento. Um Artefato começa onde matéria, história e vínculo passam a exigir resposta própria.

### 87. Artefatos e vínculo

Todo artefato possui Origem, Matéria, Memória, Promessa, Ativação, Poder manifesto, Poder profundo, Preço, Ruptura e corrupção possível. Ele é uma relação, não apenas bônus.

### 88. Vínculo

Uma personagem mantém até 2 artefatos vinculados. Vincular exige Pausa Segura e cena de relação. Poder manifesto pode funcionar sem Vínculo quando indicado; poder profundo sempre exige Vínculo.

### 89. Despertar

Artefato desperta quando promessa é cumprida, verdade recuperada, função reparada, mirveth encontrada, instituição confrontada ou custo aceito. Despertar amplia um poder; não remove o Preço.

### 90. Ruptura

Quando usado contra sua Promessa, o artefato ganha 1 Ruptura. Com 3 Rupturas, perde poder profundo, muda comportamento, abre risco de Sombra e exige missão de reparação.

### 91. Catálogo de artefatos

#### 91.1. Ponte que Recorda

**Origem.** obra Dórea vinculada ao pacto Kragor.

**Poder manifesto.** revela quem cruzou recentemente.

**Poder profundo.** testemunha autoridade legítima em juramentos.

**Preço.** o portador sente o peso das promessas quebradas.

**Ruptura.** impedir passagem inocente.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.2. Prisma de Vael

**Origem.** Ressonário de Vael.

**Poder manifesto.** detecta quebra frequencial.

**Poder profundo.** separa emoção verdadeira de imitação da Sombra.

**Preço.** emoções do portador ficam visíveis.

**Ruptura.** expor intimidade sem consentimento.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.3. Página Nomos Incompleta

**Origem.** arquivo das trocas.

**Poder manifesto.** armazena registro inviolável.

**Poder profundo.** reconstrói sequência apagada.

**Preço.** sacrifica outra sequência conhecida.

**Ruptura.** declarar destino como certeza.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.4. Bússola de Nimaris

**Origem.** ancoragem deslocada.

**Poder manifesto.** aponta saída possível.

**Poder profundo.** encontra rota entre posições correspondentes.

**Preço.** fecha temporariamente outra possibilidade.

**Ruptura.** abandonar vínculo sem consequência.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.5. Lâmina de Kravor

**Origem.** pacto antigo.

**Poder manifesto.** +1 dano ao proteger juramento.

**Poder profundo.** corta efeito de falsa autoridade.

**Preço.** não pode ser usada por ambição pessoal.

**Ruptura.** ferir parte legítima do pacto.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.6. Semente do Jardim de Memória

**Origem.** Thur-Daer.

**Poder manifesto.** preserva lembrança consentida.

**Poder profundo.** cria espaço onde memória não pode ser falsificada.

**Preço.** a lembrança precisa ser compartilhada.

**Ruptura.** tomar memória sem consentimento.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.7. Escudo da Assembleia Quebrada

**Origem.** salão Kragor destruído.

**Poder manifesto.** concede +1 Guarda ao proteger grupo.

**Poder profundo.** Interpor contra todos os aliados adjacentes uma vez por cena.

**Preço.** o portador deve ouvir a minoria antes de agir.

**Ruptura.** usar proteção para silenciar dissenso.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.8. Máscara dos Nomes Não Ditos

**Origem.** arquivo clandestino de Trocados.

**Poder manifesto.** oculta identidade de rastreio institucional.

**Poder profundo.** permite pronunciar nome apagado sem revelá-lo à Sombra.

**Preço.** o usuário esquece temporariamente um título próprio.

**Ruptura.** usar para usurpar identidade alheia.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.9. Martelo do Primeiro Reparo

**Origem.** oficina Dórea-Nomos.

**Poder manifesto.** repara 4 Integridade ao tocar uma obra.

**Poder profundo.** restaura função profunda ou promessa material quebrada.

**Preço.** o reparador assume responsabilidade pela obra.

**Ruptura.** reparar instrumento de opressão sem transformá-lo.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.10. Ampulheta de Ecos Paralelos

**Limite da Ampulheta.** A Ampulheta de Ecos Paralelos é Reação, uma vez por sessão, depois de um teste próprio. A nova rolagem deve ser aceita e um teste já refeito pela Ampulheta não pode ser refeito novamente por ela.

**Origem.** memória Aelvari cristalizada.

**Poder manifesto.** repete uma cena sensorial breve.

**Poder profundo.** permite refazer um teste aceitando consequência diferente.

**Preço.** o usuário recebe uma memória que não viveu.

**Ruptura.** forçar o passado a substituir o presente.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.11. Coração de Tempestade Draken

**Origem.** núcleo elemental ancestral.

**Poder manifesto.** concede resistência 2 a um elemento.

**Poder profundo.** libera ataque de Nível III base 5 x4 uma vez por operação.

**Preço.** o ambiente absorve a descarga restante.

**Ruptura.** usar para demonstrar supremacia ou devastar inocentes.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.12. Espelho Vitrálio de Duas Frequências

**Origem.** fragmento de dois corpos correspondentes.

**Poder manifesto.** mostra dissonância emocional sem revelar conteúdo.

**Poder profundo.** permite comunicação breve entre posições correspondentes.

**Preço.** ambos os lados veem uma emoção do outro.

**Ruptura.** transformar transparência em vigilância.

**Despertar sugerido.** transforme o poder profundo em efeito de Nível III ou autoridade equivalente após arco ligado à Origem.

#### 91.13. Criando outro artefato

Defina todos os dez campos antes de usar. Um poder profundo comum equivale a técnica de Nível II; desperto pode alcançar Nível III; Nível IV exige Legado ou evento de campanha. Todo benefício precisa de Preço e condição de Ruptura proporcionais.

## Progressão

### 92. Marcos

Personagens avançam por Marcos narrativos, de 1 a 10.

Não recebem experiência por matar.

Ganham Marco quando alteram situação regional, descobrem verdade relevante, transformam vínculo, encerram missão, enfrentam consequência ou fazem escolha que muda campanha.

### 93. Ganhos por Marco

**1.** **Ganho:** criação completa

**2.** **Ganho:** técnica ou magia

**3.** **Ganho:** especialização de Ofício

**4.** **Ganho:** +1 perícia e técnica

**5.** **Ganho:** +1 atributo, máximo 4

**6.** **Ganho:** técnica avançada ou evocação maior

**7.** **Ganho:** +1 Atributo, máximo 5

**8.** **Ganho:** +1 perícia e vínculo adicional

**9.** **Ganho:** segunda especialização ou técnica de outro Ofício

**10.** **Ganho:** Legado

### 94. Legado

No Marco 10, escolha tornar-se referência de um Ofício, fundar ordem ou comunidade, restaurar artefato maior, estabelecer nova relação entre mundos, dominar forma única de magia, criar pacto de evocação, transformar sua relação com mirveth ou enfrentar manifestação extrema da Sombra.

Legado não encerra obrigatoriamente a personagem.

## Sombra e corrupção

**Kav**, a Sombra, atua pela assimilação e pelo apagamento da diferença. As regras abaixo medem suas manifestações e as consequências que ela deixa sobre personagens e vínculos.

### 95. Princípio

A Sombra é a força de assimilação que transforma relação em apagamento.

Ela age quando relação vira posse, diferença vira defeito, unidade vira apagamento, cuidado vira controle, memória vira prisão ou ordem vira eliminação de escolha.

### 96. Marcas de Sombra

Escala de 0 a 6.

**0.** **Estado:** íntegro

**1-2.** **Estado:** influência

**3-4.** **Estado:** cicatriz ativa

**5.** **Estado:** limiar de assimilação

**6.** **Estado:** crise de identidade

Marcas não retiram personagem do jogador automaticamente.

### 97. Ganho

Pode ocorrer ao aceitar poder de assimilação, realizar Merge forçado, apagar memória intencionalmente, usar artefato contra promessa, impor identidade, cumprir ação de corrupção específica do povo ou falhar diante de zona corrompida.

### 98. Tentação

O Mestre pode oferecer um sucesso automático ou um efeito ampliado em troca de 1 Sombra. A decisão pertence ao jogador, e a oferta precisa deixar claro o que será apagado, deformado ou falsificado caso seja aceita.

### 99. Efeitos

1-2

Sinais sutis e tentações.

3

Escolha uma Cicatriz memória rígida, proteção possessiva, poder dominador, lógica sem escolha, identidade copiada, obra-prisão, instinto sem nome, fuga compulsiva ou harmonia opressiva. 5.

A Sombra pode falar através da virtude corrompida.

O jogador continua escolhendo ações.

6

Cena de Crise.

O grupo deve reconhecer o nome, sustentar vínculos, enfrentar fonte, aceitar consequência ou realizar reparação.

Fracasso transforma a personagem em antagonista apenas com acordo prévio de mesa.

### 100. Recuperação

A recuperação de Sombra exige confrontar a relação, escolha ou consequência que permitiu sua entrada; descanso comum apenas recupera os recursos previstos.

Reduza 1 ao reparar vínculo, admitir dano, devolver autonomia, desfazer obra opressiva, recusar vantagem da Sombra, completar ritual de identidade, receber ajuda consentida ou confrontar origem da corrupção.

## Fendas e travessias

No Atlas, a Fenda é ferida do mundo. À mesa, é também um procedimento cujas condições precisam ser visíveis antes que alguém escolha atravessar.

Os estados da Fenda descritos anteriormente também determinam o procedimento de travessia. Quanto mais instável a ruptura, maior a exigência sobre Âncora, preparação e contribuições do grupo.

### 101. Estados

**Latente.** **Dificuldade:** 21

**Ressonante.** **Dificuldade:** 15

**Aberta.** **Dificuldade:** 12

**Fraturada.** **Dificuldade:** 18 e consequência

**Corrompida.** **Dificuldade:** 21 e risco de Sombra

### 102. Fatores

A Fenda reage a Velarim, mirveth, Trocados, violência, Merge, artefatos ou relações locais.

### 103. Travessia

Travessia exige destino correspondente, Âncora, estado adequado, teste coletivo e custo concreto.

Antes da primeira rolagem, o Mestre declara estado, Dificuldade, destino, Âncora, consequência específica e custo concreto. O custo declara quem paga, quando e a quantidade, quando numérico; pode ser tempo, Fluxo, consumo, alteração da Âncora, condição, memória, promessa ou dívida de campanha. É aceito antes do teste e pago quando a sequência começa.

Cada participante escolhe uma contribuição e explica como ela participa da travessia: Sintonia, Velarim, Sobrevivência, Ofício, Empatia, artefato, memória ou promessa.

Para cada contribuição, a mesa fixa um par coerente de Atributo e Perícia, e a pessoa faz uma rolagem da gramática universal — 2d10 + Atributo + Perícia — contra a Dificuldade do estado atual da Fenda. São exemplos: Sintonia + Velarim, Corpo + Sobrevivência, Intelecto + Conhecimento e Vontade + Empatia. Artefato, memória ou promessa usam o par que a ficção justificar. Cada participante faz no máximo uma contribuição por sequência. Em grupo com menos de três participantes, uma personagem pode realizar uma nova contribuição enquanto a corrida não tiver terminado, desde que use uma fonte ou abordagem distinta. Ajuda segue a regra universal e não cria uma segunda contribuição da mesma fonte.

Três sucessos antes de duas falhas atravessam com estabilidade. Aplique a consequência da falha assim que ela ocorrer; ao final, aplique também qualquer consequência específica do estado da Fenda.

Contribuições não criam pontos de travessia. Elas conversam com o motor:

**Preparação adequada.** **Efeito mecânico:** Impulso 1

**Âncora válida.** **Efeito mecânico:** satisfaz requisito; se especialmente precisa, Impulso 1 quando não duplicar fonte

**Guia com experiência real da rota.** **Efeito mecânico:** Impulso 1

**Conhecimento comprovado da rota.** **Efeito mecânico:** Impulso 1

**Velarim correto e pertinente.** **Efeito mecânico:** cancela 1 Pressão de interpretação/estabilidade **ou** concede Impulso 1, nunca ambos

**Custo aceito antes do teste.** **Efeito mecânico:** reduz em um passo consequência diretamente ligada ao custo quando ele for pago

**Falha de suporte relevante.** **Efeito mecânico:** Pressão 1

**Âncora inválida quando absoluta.** **Efeito mecânico:** travessia não começa até existir condição válida

Aplicam-se os limites normais de Impulso e Pressão e a regra de não duplicação da mesma fonte. Preparação real importa sem criar minijogo separado.

### 104. Consequências

Uma travessia pode deslocar o ponto de chegada, consumir tempo, provocar um eco de memória, alterar equipamento, separar temporariamente o grupo, impor a condição Fraturado, atrair a atenção da Facção, permitir uma manifestação da Sombra ou aproximar mirveth.

A Fenda responde às condições da travessia e às relações envolvidas; cruzá-la exige que o procedimento de jogo seja resolvido.

---

# PARTE V — CONDUZINDO KALLISTIS

## Regras do Mestre

### 1. Estrutura de cena

Toda cena deve ter objetivo, oposição, risco, informação ou mudança possível.

Em todo conflito relevante, defina antes da resolução pelo menos uma consequência que possa permanecer depois da cena. Ela pode ser social, material, emocional, política ou mecânica. Não é preciso usar todas essas categorias, nem transformar toda falha em trauma. O contrato é mais simples: depois de uma decisão importante, a situação deve poder sair diferente de como entrou.

A consequência também pode nascer de um sucesso. Uma ponte preservada, uma testemunha conquistada, uma rota fechada, uma confiança reconstruída, um arquivo exposto ou uma condição que permanece são mudanças tão válidas quanto dano.

### 2. Relógios

Use relógios de 4, 6 ou 8 segmentos.

Exemplos abertura da Fenda, chegada da Facção, colapso do pacto, corrupção do Baixio, confiança do Conselho ou evacuação.

Sucesso forte preenche 2.

Falha pode preencher relógio adverso.

### 3. Testes prolongados

Uma tarefa complexa pode ser resolvida com três sucessos antes de duas falhas ou por meio de um relógio. Cada rolagem precisa representar uma nova abordagem, uma mudança de posição ou uma alteração concreta da situação.

### 4. Dano e técnicas de adversários

Adversários possuem dano-base por categoria. Ataques comuns usam x1. Técnicas nomeadas podem usar multiplicadores, com custo, limite ou anúncio compatível.

**Lacaio.** **Dano-base comum:** 3 **Acesso típico a potência:** x1

**Comum.** **Dano-base comum:** 5 **Acesso típico a potência:** x1; técnica x2 ocasional

**Elite.** **Dano-base comum:** 7 **Acesso típico a potência:** x1; técnica x2; x3 preparado

**Chefe.** **Dano-base comum:** 8-10 **Acesso típico a potência:** ataques x1; técnicas x2; x3 anunciado

**Catástrofe.** **Dano-base comum:** 12+ **Acesso típico a potência:** x4 ou efeito especial, sempre anunciado e evitável

Multiplicadores de adversários pertencem às técnicas que os declaram. Uma técnica x3 ou x4 deve ser reconhecível, interrompível, evitável ou ligada a mudança de fase.

### 5. Vitalidade de adversários

**Lacaio.** **Vitalidade:** 1 golpe relevante

**Comum.** **Vitalidade:** 10-16

**Elite.** **Vitalidade:** 24-36

**Chefe.** **Vitalidade:** 50-90 por fase

### 6. Orçamento de encontro

Para grupo de quatro:

**Leve.** **Composição:** 4 lacaios ou 2 comuns

**Padrão.** **Composição:** 4 comuns

**Difícil.** **Composição:** 2 comuns + 1 elite

**Severo.** **Composição:** 2 elites ou 1 chefe menor

**Clímax.** **Composição:** chefe com fases e objetivo

Ajuste por terreno, surpresa, recursos e Ressonância acumulada.

### 7. Chefes

Um chefe entra em cena com um objetivo próprio e muda durante o confronto. Em geral, atravessa duas ou três fases ligadas por um padrão que as personagens podem aprender a reconhecer. Sua ação mais perigosa precisa ser anunciada, e o conflito deve oferecer ao menos uma fraqueza, uma resposta possível por Ressonância Coletiva ou uma consequência capaz de encerrar a cena sem depender apenas de dano.

Ataques catastróficos devem ser anunciados com antecedência suficiente para interromper, proteger, usar Bastião, alterar terreno ou cumprir objetivo.

### 8. Informação

Nunca esconda toda possibilidade atrás de uma única rolagem.

Falha em investigação concede pista parcial, pista com custo, pista tardia ou pista acompanhada de ameaça.

Antes de apresentar uma revelação como fato, saiba que tipo de verdade a cena encontrou. **Fundamentos cosmológicos** sustentam o mundo; **consensos históricos** reúnem fontes convergentes; **tradições disputadas** pertencem a povos ou instituições específicos; e o **futuro aberto** depende das escolhas da mesa. Uma pista pode provar que alguém acredita em algo sem transformar essa crença em verdade do mundo.

### 9. Consentimento temático

O jogo trabalha com troca de crianças, identidade, memória, assimilação, coerção, guerra, corpo ou perda.

Antes da campanha, combine os limites de conteúdo e de controle de personagem. Linhas e véus podem estabelecer o que fica fora da mesa ou apenas fora de cena; um sinal de pausa permite interromper a ficção quando necessário. Merge, morte, transformação corporal e horror devem seguir o grau de exposição que o grupo realmente deseja jogar.

### Humor e consequência

Humor é compatível com KALLISTIS quando revela pretensão, contradição, personalidade, burocracia, absurdo ou circunstância. Ele não precisa desaparecer quando a cena é séria.

O alvo da piada, porém, não deve ser automaticamente a dor sofrida por outra pessoa, sua identidade, seu luto, sua coerção ou a violência que recebeu. Uma cena tornar-se engraçada não remove ferimentos, dívidas, escolhas, relações quebradas ou outras consequências já estabelecidas.

Esta é uma orientação de condução, não uma obrigação de solenidade. Personagens e jogadores continuam podendo rir; o mundo apenas continua lembrando o que aconteceu.

## Preparação e condução

### Contratos fundamentais

Alguns elementos de KALLISTIS pedem um procedimento próprio porque alteram mais do que um teste isolado. **Fendas** possuem estado, fatores de instabilidade, custo e consequência. **Merge** depende das pessoas envolvidas, daquilo que elas aceitam compartilhar e do momento em que desejam sair. A **Pedr’alma** materializa pertencimento sem transformar a comunidade em propriedade da pedra. O **Coro** pertence ao grupo e segue sua própria economia de Pulsos, Barras e ativação.

Esses limites tornam o fantástico legível. Quando um desses elementos entrar em cena, descubra primeiro qual relação está sendo tocada e só então resolva o efeito.

### Criando NPCs

Um NPC começa por uma vontade concreta. Saiba o que essa pessoa deseja nesta cena e o que teme perder se falhar. Depois escolha seu Povo e pense em como sua história alterou a maneira de compreender a Fratura. Sua relação com Luz, Escuridão, Velarim e portais pode ser informada, parcial ou inteiramente equivocada; o importante é que essa posição nasça de uma experiência reconhecível.

Pergunte também o que essa pessoa chamaria de restauração legítima. Essa resposta costuma mostrar com mais clareza onde ela colocará seus limites quando o conflito se tornar caro.

### Criando conflitos

Um conflito precisa de alguém que queira mudar a situação e de outra força capaz de tornar essa mudança difícil. Descubra o que uma parte tenta preservar, o que outra deseja transformar e quem terá de viver com o resultado. Se alguém chama a diferença de defeito ou acredita estar salvando outra pessoa contra a vontade dela, registre essa tensão na própria situação em vez de transformá-la em rótulo abstrato.

Localize o conflito em um lugar real da campanha. Dê a ele uma pessoa afetada e um recurso que possa ser protegido, usado, perdido ou controlado. Defina quem deseja um resultado incompatível e qual preço cada solução cobra. Por fim, saiba o que poderá permanecer diferente depois da cena. É essa consequência que transforma uma discussão em acontecimento.

### Conflitos de facção

Facções ganham força quando disputam coisas concretas. Em vez de preparar apenas uma posição ideológica, escolha um arquivo, rota, pacto, abrigo, tradução, prova, estrutura ou pessoa que esteja em jogo. Cada lado precisa de uma justificativa pública e de uma necessidade material capaz de sustentar sua posição. Também deve existir alguém dentro da própria organização que discorde do método, porque nenhuma instituição sobrevive por muito tempo sem tensões internas.

Uma concessão possível torna a negociação real; uma consequência clara mostra o que acontece se um lado obtiver tudo o que deseja. A Facção Científica, a Confederação Tácita, o Conselho, as Assembleias dos Outros e os clãs devem aparecer como instituições habitadas por pessoas, não como uma única personalidade coletiva.

## Conduzindo o Cinturão

### A Fenda como sistema

Quando a Fenda responder durante uma cena, comece pelo estado em que ela se encontra e pelos fatores de instabilidade realmente presentes. Observe quem está em Ressonância, que forma de Velarim foi usada, se existe Merge e se alguma relação está sendo empurrada em direção à assimilação. O efeito nasce desse conjunto.

Depois determine o que um sucesso pode mudar e qual consequência uma falha produz agora. A Fenda revela fragmentos, ecos e padrões suficientes para deslocar a investigação ou alterar uma travessia, enquanto a interpretação final continua pertencendo às personagens.

### Comunidades em conflito

Nenhum Povo precisa representar uma posição moral única. Em uma mesma comunidade haverá pessoas que resistem, colaboram, temem, lucram, erram e mudam. A maneira mais forte de mostrar uma cultura é permitir que seus membros discordem sobre o que ela exige deles.

### A Facção e sua doutrina

A Facção Científica funciona melhor quando seus membros acreditam em alguma parte do projeto que servem. Alguns perderam pessoas para a Fratura; outros foram educados desde cedo numa doutrina de restauração. Há quem tema um colapso cosmológico, quem acredite estar evitando uma guerra e quem considere as trocas um crime necessário. Muitos jamais viram a Escuridão com os próprios olhos, e alguns desconhecem a extensão dos abusos praticados em nome do programa.

Essa convicção torna a oposição mais difícil porque permite que uma pessoa faça algo terrível enquanto ainda se reconhece como alguém tentando impedir um desastre.

### A diversidade dos Outros

Pessoas Trocadas construíram vidas diferentes na Luz. Algumas amam a família que as criou e também desejam conhecer a origem. Outras querem reparação, distância ou vingança. Há quem rejeite a disputa entre os mundos e quem prefira simplesmente continuar vivendo sem assumir um papel político. Descobrir a origem acrescenta uma camada à biografia; não substitui a vida já vivida.

### O primeiro arco da campanha

**Estrutura sugerida.** A sequência abaixo oferece um caminho possível pelo Cinturão. Ela só se torna história da mesa quando for jogada e registrada.

#### Sessões 1-2 — O vazamento

Documentos aparecem no Refúgio. A Facção tenta recuperá-los.

#### Sessões 3-4 — O juramento

Fortaleza de Kravor sofre consequências do pacto e precisa enviar emissários.

#### Sessões 5-6 — Nimaris

A ancoragem perdida oferece uma rota clandestina para Thur-Daer.

#### Sessões 7-8 — A outra camada

Os personagens atravessam e descobrem que a Escuridão não corresponde à propaganda.

#### Sessões 9-10 — O Baixio

A quebra frequencial revela um experimento da Facção.

#### Sessões 11-12 — A travessia

Os Lightbringers recebem ordem de avançar.

Os personagens precisam escolher o que proteger, revelar, destruir ou transformar.

---

# PARTE VI — ANTAGONISTAS E ENCONTROS

## Usando o Bestiário

O Bestiário reúne pessoas hostis, fauna perigosa, fenômenos e estruturas capazes de sustentar encontros. Cada bloco descreve aquilo que uma presença pode fazer quando entra em conflito com o grupo. Motivo, rendição, fuga e transformação permanecem parte da cena sempre que a criatura ou pessoa tiver capacidade para escolher.

A aparência de uma presença informa sua forma, mas seu comportamento nasce de território, história e relação. Uma criatura pode proteger uma mata e ainda assim ser hostil; uma assombração pode existir sem resolver o mistério da morte; fauna territorial pode ameaçar uma comunidade por razões inteiramente materiais. Quando a origem de alguma coisa permanece desconhecida, o desconhecimento continua válido.

Curupira, Saci, Iara, Boitatá, Caipora, Mula sem Cabeça, Boto, Corpo-Seco, Loira do Banheiro, Mapinguari, Matinta-Pereira, Mãe-do-Ouro, Caboclo-d’Água e Pisadeira pertencem ao repertório de KALLISTIS. Esses são os nomes pelos quais tais presenças são conhecidas na língua comum, inseridas na cosmologia dos dois mundos e da Fratura.

## Como usar o Bestiário

### 1. Leitura do bloco

**Ofensiva +X** é um atalho para o total de Atributo + Perícia do adversário. O Mestre ainda rola os dois dados:

2d10 + Ofensiva

contra Guarda, Fortitude ou Integridade

O bloco indica a defesa mais comum. Uma ação pode declarar outra.

O **dano-base** segue a escala vigente: ataques comuns usam x1; técnicas de Nível I usam x2, de Nível II x3, de Nível III x4 e de Nível IV x5.

Somente o dano-base é multiplicado. Bônus de margem, modificadores fixos e Proteção são aplicados depois.

### 2. Categorias

**Lacaio.** **Função:** pressão numérica, alarme, terreno **Vitalidade típica:** 1 golpe relevante **Potência típica:** x1

**Comum.** **Função:** unidade completa de encontro **Vitalidade típica:** 10-16 **Potência típica:** x1 e x2 ocasional

**Elite.** **Função:** ameaça central ou especialista **Vitalidade típica:** 24-36 **Potência típica:** x1, x2 e x3 preparado

**Chefe.** **Função:** confronto por fases e objetivos **Vitalidade típica:** 50-90 por fase **Potência típica:** x1, x2 e x3 anunciado

**Fenômeno.** **Função:** risco ambiental ou relacional **Vitalidade típica:** relógio **Potência típica:** efeitos especiais

### 3. Predominância aplicada ao bestiário

As linhas de **Luz**, **Escuridão** e **Ressonância** orientam o Mestre na interpretação dos resultados obtidos contra cada criatura.

**Luz** tende a mostrar como a presença ocupa o mundo e qual mecanismo pode ser visto ou interrompido. **Escuridão** aproxima o grupo de sua história, impulso ou vínculo. **Ressonância** abre uma relação inesperada, uma fraqueza legítima ou uma transformação da própria cena.

### 4. Moral, rendição e fuga

**Moral operacional.** Cada bloco consciente possui Moral +N. Moral rola 2d10 + Moral contra 13 para Comuns, 15 para Elites e 18 para Chefes. Lacaio usa a Dificuldade de sua liderança; entidades sem decisão própria não rolam. Defaults: Lacaio +0, Comum +2, Elite +4 e Chefe +6.

**Ativações de Chefe.** Cada Chefe declara ativações por rodada, Ação e Movimento por ativação, Reações por rodada, janela de anúncio e alteração por fase. Na ausência de declaração, possui duas ativações por rodada, cada uma com Movimento e Ação, uma Reação por rodada e uma ação anunciada antes da resolução.

Uma criatura consciente verifica Moral quando perde metade dos aliados, vê sua liderança cair, percebe que o objetivo da cena deixou de ser possível, encontra uma prova que desmonta a razão do conflito ou compreende claramente a consequência de continuar.

Role `2d10 + Moral` contra Dificuldade 13 para Comuns, 15 para Elites e 18 para Chefes. Use o valor declarado no bloco ou, quando ausente, o default da categoria. Falhar não obriga rendição: pode produzir fuga, negociação, proteção de terceiros ou mudança de lado.

### 5. Vestígios e recompensas

Em KALLISTIS, recompensas nascem do que a cena deixa no mundo. Um encontro pode produzir uma prova, abrir uma rota, conceder acesso, criar uma dívida, estabelecer um vínculo, revelar conhecimento ou tornar possível alguma reparação. Materiais podem ser obtidos sem destruir uma pessoa, e memórias só entram em jogo quando são oferecidas ou preservadas de modo consentido.

### 5.1. Situe antes de rolar

Um encontro nasce quando um bloco do Bestiário entra em uma situação com objetivo, espaço e consequência.

Antes de colocar uma criatura, pessoa, fenômeno ou estrutura em iniciativa, situe-a. Defina por que ela está naquele lugar e o que torna o espaço relevante; determine o recurso que está sendo protegido, caçado, atravessado, disputado ou destruído; reconheça quem terá de conviver com o resultado; e deixe claro o objetivo imediato da presença. A preparação também deve saber o que muda se as personagens falharem e, quando a natureza da cena permitir, qual saída alternativa ou não letal continua disponível.

Se esses campos ainda não existirem, a entrada está pronta como estatística, mas a situação ainda precisa ser preparada.

## Escala e construção de encontros

### 6. Escala por Marco

Os blocos são calibrados para personagens de Marcos 1-3. Para grupos mais avançados, aplique os ajustes de escala abaixo sem alterar a identidade da criatura.

**Marcos 1-3.** **Ofensiva e defesas:** como escrito **Vitalidade:** como escrito **Potência:** como escrito

**Marcos 4-6.** **Ofensiva e defesas:** +1 **Vitalidade:** +4 comum; +8 elite; +15 por fase **Potência:** uma técnica ganha uso adicional

**Marcos 7-10.** **Ofensiva e defesas:** +2 **Vitalidade:** +8 comum; +16 elite; +25 por fase **Potência:** acesso a um Nível superior anunciado

Não aumente dano-base de todos os ataques. A ameaça cresce por técnicas, terreno, objetivos e coordenação.

### 7. Orçamento para quatro personagens

**Leve.** **Composição inicial:** 4 lacaios ou 2 comuns

**Padrão.** **Composição inicial:** 4 comuns; ou 2 comuns e 4 lacaios

**Difícil.** **Composição inicial:** 2 comuns e 1 elite; ou 6 comuns com objetivo favorável ao grupo

**Severo.** **Composição inicial:** 2 elites; ou 1 elite, 2 comuns e fenômeno

**Clímax.** **Composição inicial:** chefe com fases, objetivo e possíveis lacaios

Ajuste esse orçamento pelas condições da cena. Terreno inteiramente favorável à oposição equivale a acrescentar um adversário comum; surpresa completa equivale a dois lacaios. Se o grupo começa com a Barra do Coro cheia, torne o objetivo mais exigente em vez de apenas inflar Vitalidade. Se a equipe está sem cura ou outros recursos importantes, retire um adversário comum. Para grupos maiores que quatro personagens, acrescente um comum a cada duas personagens adicionais.

### 8. Ação anunciada

Técnicas x3, x4 e ações catastróficas precisam de um sinal observável e de alguma possibilidade de resposta. Esse anúncio pode surgir como uma carga visível, uma palavra ritual, uma mudança no clima, o deslocamento de peças, o avanço de um relógio, um alvo marcado, a entrada em nova fase de chefe ou uma alteração do terreno.

---

## Lacaios

### Vigia de Quartzo

_Olhos baratos para uma instituição cara_

**Categoria:** Lacaio **Natureza:** Livre ou Nomos a serviço da Facção Científica **Porte:** Comum **Papel tático:** Sentinela e marcador de alvo **Habitat típico:** Silmari, Estrada do Quartzo, postos próximos à Fenda **Objetivo ou impulso:** registrar presença, ganhar tempo e chamar reforços

**+5.** **Guarda:** 13 **Fortitude:** 12 **Integridade:** 12 **Vitalidade:** 1 golpe **Proteção:** 1 **Movimento:** 6 **Dano-base:** 3

Vigias de Quartzo usam visores prismáticos e placas de identificação que registram voz, calor e frequência. São funcionários, recrutas, devedores ou voluntários convencidos de que vigilância é cuidado.

#### Traços

**Registro prismático.** A primeira personagem observada fica Marcada; ataques de aliados científicos contra ela recebem +1 até que o visor seja quebrado.

**Moral frágil.** Quando dois Vigias caem ou uma ordem contradiz evidência pública, os demais rolam `2d10 + Moral 0` contra Dificuldade 13; em falha, recuam.

#### Ações

**Bastão de contenção.** Corpo a corpo, dano 3; em sucesso forte, o alvo fica Abalado.

**Sinalizar.** Em vez de atacar, preenche 1 segmento do relógio de reforços.

#### Reação

**Registrar agressor.** Ao sofrer dano, transmite uma imagem curta; apagar ou falsificar o registro exige 2d10 + Intelecto + Ofício contra Dificuldade 13.

#### Predominância e Ressonância

**Luz.** a posição do Vigia e seu equipamento ficam evidentes

**Escuridão.** o personagem percebe a insegurança, dívida ou ordem que o mantém ali

**Ressonância.** um registro contraditório revela que a missão oficial não corresponde ao que acontece no local

**Outra saída:** mostrar prova de irregularidade, quebrar a cadeia de comando ou oferecer saída segura **Vestígios e consequências:** fragmento de visor, credencial, horário de patrulha e um registro parcial do posto

### Assistente de Contenção

_A mão que fecha a porta antes de perguntar quem está do outro lado_

**Categoria:** Lacaio **Natureza:** funcionário técnico da Facção **Porte:** Comum **Papel tático:** Controle de área **Habitat típico:** laboratórios, comboios e estruturas da Fenda **Objetivo ou impulso:** manter barreiras ativas e impedir fuga

**+4.** **Guarda:** 12 **Fortitude:** 12 **Integridade:** 13 **Vitalidade:** 1 golpe **Proteção:** 1 **Movimento:** 5 **Dano-base:** 3

Assistentes transportam emissores dobráveis. A maioria acredita estar protegendo civis de anomalias; poucos conhecem o Programa de Substituição.

#### Traços

**Emissor portátil.** Enquanto consciente, uma célula adjacente conta como terreno difícil para inimigos.

**Treinamento de evacuação.** Pode arrastar um aliado Caído 3 células sem custo adicional.

#### Ações

**Pulso curto.** Alcance 4, dano 3; em sucesso forte, empurra 1 célula.

**Fechar corredor.** Ergue cobertura forte de 2 células até o início do próximo turno.

#### Predominância e Ressonância

**Luz.** a geometria da barreira torna-se clara e pode ser quebrada

**Escuridão.** a fonte de energia e o medo do operador ficam perceptíveis

**Ressonância.** a barreira abre uma fresta que pode ser usada por qualquer lado

**Outra saída:** desligar a fonte, convencer o técnico de que há pessoas na zona de contenção **Vestígios e consequências:** emissor portátil, mapa de evacuação e lista de códigos de emergência

### Drone Nomos de Varredura

_Uma rotina se torna vontade quando começa a escolher_

**Categoria:** Lacaio **Natureza:** construto sem Lei Interior reconhecida **Porte:** Pequeno **Papel tático:** Detecção e perseguição **Habitat típico:** corredores científicos, ruínas Nomos e perímetros de Silmari **Objetivo ou impulso:** identificar assinaturas e seguir o padrão mais divergente

**+5.** **Guarda:** 14 **Fortitude:** 11 **Integridade:** 14 **Vitalidade:** 1 golpe **Proteção:** 1 **Movimento:** 8 **Dano-base:** 3

Pequenos prismas articulados percorrem paredes e tetos. Alguns repetem rotinas por décadas; outros começam a hesitar quando encontram pessoas que contradizem a classificação recebida.

#### Traços

**Escalada.** Ignora paredes baixas e obstáculos comuns.

**Sensor de diferença.** +2 para localizar disfarces, magia ativa ou formas incomuns.

#### Ações

**Agulha de leitura.** Alcance 3, dano 3; o alvo revela uma condição ativa ao Mestre.

**Marcar assinatura.** Um aliado recebe +2 para rastrear o alvo durante a cena.

#### Predominância e Ressonância

**Luz.** o drone projeta sua rota e ponto cego

**Escuridão.** a rotina de decisão pode ser compreendida e explorada

**Ressonância.** o drone pausa e registra uma exceção; pode nascer ali a primeira escolha

**Outra saída:** apresentar uma contradição lógica, reprogramar sem apagar memória ou oferecer uma Lei Interior **Vestígios e consequências:** módulo de sensor, mapa parcial e logs de pessoas classificadas

### Soldado de Juramento Quebrado

_Quando proteger a comunidade passa a significar obedecer uma única voz_

**Categoria:** Lacaio **Natureza:** Kragor sob influência da Sombra **Porte:** Comum **Papel tático:** Linha de frente **Habitat típico:** Krav-Nam, fortalezas isoladas e zonas de conflito **Objetivo ou impulso:** manter formação e impedir divergência

**+5.** **Guarda:** 13 **Fortitude:** 14 **Integridade:** 11 **Vitalidade:** 1 golpe **Proteção:** 2 **Movimento:** 6 **Dano-base:** 3

Este bloco representa um estado de coerção aplicado a um Kragor. O juramento foi reescrito para confundir comunidade com comando.

#### Traços

**Linha fechada.** Recebe +1 Guarda enquanto adjacente a outro Soldado.

**Nome suspenso.** Rolagens contra Integridade para resistir às ordens da Colmeia sofrem -2.

#### Ações

**Golpe de escudo.** Dano 3; em sucesso forte, empurra 1 célula.

**Fechar fileira.** Move 2 células e protege um aliado adjacente até o próximo turno.

#### Predominância e Ressonância

**Luz.** o símbolo do falso juramento fica visível

**Escuridão.** uma lembrança comunitária legítima emerge por baixo da ordem

**Ressonância.** dois soldados recordam versões diferentes do pacto e a formação se rompe

**Outra saída:** nomear o juramento original, criar espaço para discordância ou derrubar o emissor da Colmeia **Vestígios e consequências:** placa de clã alterada, fragmento do juramento verdadeiro e culpa compartilhada

### Fragmento de Nome

_Uma sílaba arrancada procurando alguém para terminar_

**Categoria:** Lacaio **Natureza:** manifestação da Sombra **Porte:** Pequeno **Papel tático:** Assédio de Integridade **Habitat típico:** arquivos apagados, Fendas e locais de Merge forçado **Objetivo ou impulso:** substituir uma palavra pessoal por um rótulo útil

**+5.** **Guarda:** 13 **Fortitude:** 10 **Integridade:** 15 **Vitalidade:** 1 golpe **Proteção:** 0 **Movimento:** 7 **Dano-base:** 3

Parece um recorte de voz ou sombra escrita. Não possui pessoa dentro, embora possa imitar o modo como alguém chama a si mesmo.

#### Traços

**Sem corpo estável.** Ataques materiais sem forma mágica sofrem -1.

**Rótulo insistente.** Quem falha contra sua ação fica Abalado ao usar Promessa ou Vínculo.

#### Ações

**Chamar pelo nome errado.** Integridade, dano 3 de Lucidez.

**Colar rótulo.** O alvo recebe -2 na próxima tentativa de afirmar identidade ou resistir a controle.

#### Predominância e Ressonância

**Luz.** a forma se condensa e pode ser destruída fisicamente

**Escuridão.** a origem do rótulo e quem o pronunciou primeiro torna-se perceptível

**Ressonância.** o nome verdadeiro de alguém na cena responde e enfraquece todos os Fragmentos

**Outra saída:** uma pessoa afirmar seu nome, ser reconhecida por outra ou destruir o registro que gerou o fragmento **Vestígios e consequências:** sílaba corrompida, assinatura institucional e memória de quem foi reduzido a categoria

### Eco Faminto

_A repetição que aprendeu a pedir mais_

**Categoria:** Lacaio **Natureza:** resíduo de Fenda corrompido **Porte:** Pequeno **Papel tático:** Enxame e desgaste **Habitat típico:** Baixio da Névoa Ferida, corredores vazios e portais instáveis **Objetivo ou impulso:** repetir a última ação observada até ocupar toda a cena

**+4.** **Guarda:** 12 **Fortitude:** 11 **Integridade:** 14 **Vitalidade:** 1 golpe **Proteção:** 0 **Movimento:** 7 **Dano-base:** 3

Um Eco Faminto imita passos, golpes e frases, mas remove contexto a cada repetição.

#### Traços

**Imitação rasa.** Copia o movimento ou som da última personagem, nunca seu significado.

**Enxame sonoro.** Três ou mais Ecos na mesma zona impõem Pressão 1 em comunicação verbal.

#### Ações

**Repetir golpe.** Dano 3 com a forma do último ataque realizado na cena.

**Roubar palavra.** O agente rola 2d10 + Presença + Influência contra Integridade; em falha do alvo, ele fica Silenciado até o fim do próximo turno.

#### Predominância e Ressonância

**Luz.** o Eco torna-se alto e localizável

**Escuridão.** é possível ouvir a primeira voz que ele copiou

**Ressonância.** a repetição recupera por um instante o contexto perdido e aponta uma pista

**Outra saída:** mudar o ritmo, responder com silêncio significativo ou devolver a frase completa **Vestígios e consequências:** som preservado, direção de origem e uma palavra que não pertence ao local

### Esporo de Memória Rígida

_O passado que se recusa a admitir que continuou_

**Categoria:** Lacaio **Natureza:** crescimento fúngico afetado pela Sombra **Porte:** Minúsculo **Papel tático:** Condição e terreno **Habitat típico:** Bosque dos Ecos e Jardins de Memória **Objetivo ou impulso:** fixar um instante e impedir mudança

**+4.** **Guarda:** 11 **Fortitude:** 12 **Integridade:** 15 **Vitalidade:** 1 golpe **Proteção:** 0 **Movimento:** 3 **Dano-base:** 3

Nuvens de pó violeta reproduzem um gesto antigo. O esporo tornou-se perigoso quando uma memória foi protegida contra qualquer revisão.

#### Traços

**Colônia.** Pode ocupar a mesma célula de outra criatura.

**Instante repetido.** Alvo atingido não pode usar Reação até o próximo turno.

#### Ações

**Nuvem aderente.** Área adjacente, dano 3 de Lucidez.

**Fixar postura.** O alvo fica Imobilizado até gastar Ação ou reconhecer algo que mudou desde a memória.

#### Predominância e Ressonância

**Luz.** a colônia ganha forma física e pode ser queimada ou varrida

**Escuridão.** a memória original emerge com detalhes afetivos

**Ressonância.** uma pessoa pode escolher o que preservar e o que deixar partir, dispersando a colônia

**Outra saída:** realizar ritual de memória consentida ou alterar o ambiente de maneira reconhecível **Vestígios e consequências:** pó de lembrança, imagem de um evento e sementes úteis em rituais de preservação

### Estilhaço Vitrálio Instável

_Dor mineral sem pessoa a quem retornar_

**Categoria:** Lacaio **Natureza:** fragmento cristalino sem consciência **Porte:** Pequeno **Papel tático:** Reflexo e dano em linha **Habitat típico:** Ressonário de Vael, minas e zonas de Ruptura Frequencial **Objetivo ou impulso:** buscar frequência compatível e descarregar tensão

**+5.** **Guarda:** 14 **Fortitude:** 13 **Integridade:** 13 **Vitalidade:** 1 golpe **Proteção:** 1 **Movimento:** 5 **Dano-base:** 3

É matéria vitrália fraturada que conservou emoção sem identidade suficiente para compreendê-la como uma pessoa viva.

#### Traços

**Refração.** O primeiro ataque de Luz contra ele muda de direção; outro alvo adjacente sofre 1 de dano.

**Frequência sensível.** Som, canto ou Velarim podem acalmá-lo.

#### Ações

**Raio involuntário.** Linha 3, dano 3.

**Grito harmônico.** O agente rola 2d10 + Presença + Magia contra Fortitude para cada alvo adjacente; em falha, o alvo fica Abalado.

#### Predominância e Ressonância

**Luz.** o estilhaço brilha e expõe sua direção de descarga

**Escuridão.** a emoção preservada pode ser sentida

**Ressonância.** a frequência encontra acorde e o estilhaço torna-se uma Âncora segura

**Outra saída:** sintonizar a frequência, oferecer suporte mineral ou levá-lo ao Ressonário **Vestígios e consequências:** quartzo emocional, registro de cor e um acorde útil contra Rupturas

### Rastejante do Baixio

_A névoa aprendeu pernas, mas não intenção_

**Categoria:** Lacaio **Natureza:** fauna do Mundo da Escuridão **Porte:** Pequeno **Papel tático:** Emboscada e obscurecimento **Habitat típico:** Baixio da Névoa Ferida **Objetivo ou impulso:** alimentar-se de calor e fugir de vibrações fortes

**+5.** **Guarda:** 13 **Fortitude:** 12 **Integridade:** 10 **Vitalidade:** 1 golpe **Proteção:** 0 **Movimento:** 7 **Dano-base:** 3

Seis patas finas sustentam uma bolsa de névoa. Em bandos, apagam contornos e confundem distância.

#### Traços

**Corpo de névoa.** Recebe cobertura parcial enquanto estiver em área obscurecida.

**Animal assustadiço.** Foge de fogo aberto, trovão ou vibração controlada.

#### Ações

**Mordida fria.** Dano 3; o alvo perde 1 ponto de Movimento no próximo turno.

**Soltar névoa.** Cria cobertura parcial em 2 células até o próximo turno.

#### Predominância e Ressonância

**Luz.** o animal se torna visível e perde cobertura

**Escuridão.** a direção do ninho ou a causa de seu medo é percebida

**Ressonância.** o bando sincroniza o movimento e revela uma rota segura pelo Baixio

**Outra saída:** afastar com calor, alimento ou frequência grave **Vestígios e consequências:** bolsa de névoa, trilha para água segura e ovos que não devem ser removidos sem cuidado

### Corvo de Fresta

_Ave que pousa onde duas rotas quase concordam_

**Categoria:** Lacaio **Natureza:** fauna liminar **Porte:** Pequeno **Papel tático:** Mensageiro e ladrão de Âncoras **Habitat típico:** Nimaris, Kethrell e rotas clandestinas **Objetivo ou impulso:** colecionar objetos que pertencem a mais de um lugar

**+5.** **Guarda:** 15 **Fortitude:** 11 **Integridade:** 13 **Vitalidade:** 1 golpe **Proteção:** 0 **Movimento:** 10 **Dano-base:** 3

Suas penas parecem ocupar posições ligeiramente diferentes. Corvos de Fresta podem ser treinados, mas nunca possuídos.

#### Traços

**Voo liminar.** Ignora terreno e pode atravessar uma barreira fina por rodada.

**Colecionador de correspondências.** Detecta Âncoras, mirveth próximos e objetos duplicados.

#### Ações

**Bicada.** Dano 3 e pode roubar item leve preparado.

**Deslocar pequeno objeto.** Move item não seguro até 3 células.

#### Predominância e Ressonância

**Luz.** a ave se fixa numa única posição e pode ser alcançada

**Escuridão.** o destino que ela procura fica intuitivamente claro

**Ressonância.** ela deixa cair um objeto vindo da camada correspondente

**Outra saída:** trocar o objeto por outra correspondência, seguir a ave ou oferecer rota reversível **Vestígios e consequências:** pena bifásica, objeto deslocado e direção de uma fresta menor

### Filhote de Tormenta

_Um relâmpago que ainda não decidiu ser céu_

**Categoria:** Lacaio **Natureza:** presença elemental jovem **Porte:** Pequeno **Papel tático:** Dano móvel **Habitat típico:** Montes do Norte e zonas Draken **Objetivo ou impulso:** seguir pressão atmosférica e descarregar energia acumulada

**+5.** **Guarda:** 13 **Fortitude:** 13 **Integridade:** 11 **Vitalidade:** 1 golpe **Proteção:** 0 **Movimento:** 9 **Dano-base:** 3

Parece uma ave ou serpente feita de nuvem comprimida. Não compreende propriedade, apenas circulação de energia.

#### Traços

**Elemental.** Imune a Sangrando; sofre +2 de efeitos de aterramento.

**Salto elétrico.** Após atingir, move 2 células sem provocar reação.

#### Ações

**Descarga.** Alcance 3, dano 3 elétrico.

**Estalo.** O agente rola 2d10 + Sintonia + Magia contra Fortitude para cada alvo adjacente; em falha, o alvo fica Abalado.

#### Predominância e Ressonância

**Luz.** a forma luminosa se concentra e pode ser aterrada

**Escuridão.** a direção da tempestade-mãe é sentida

**Ressonância.** o filhote reconhece um condutor e pode formar vínculo temporário

**Outra saída:** aterrar, conduzir para área segura ou permitir que descarregue em estrutura preparada **Vestígios e consequências:** carga elemental, rota de tempestade e uma Âncora possível para Evocação

### Autômato de Ponte Descontrolado

_Construído para sustentar passagem, preso numa ordem sem fim_

**Categoria:** Lacaio **Natureza:** construto Dóreo-Nomos **Porte:** Comum **Papel tático:** Bloqueio e reparo **Habitat típico:** pontes antigas, Estrada do Quartzo e Veios do Juramento **Objetivo ou impulso:** manter uma passagem definida como segura, mesmo quando isso exige impedir todos

**+4.** **Guarda:** 14 **Fortitude:** 14 **Integridade:** 13 **Vitalidade:** 1 golpe **Proteção:** 2 **Movimento:** 4 **Dano-base:** 3

Pequenos módulos articulados encaixam-se no solo, reforçam vigas e empurram qualquer corpo classificado como carga indevida.

#### Traços

**Estrutural.** +2 Fortitude contra empurrão e derrubada.

**Reparador.** Em vez de agir, restaura cobertura ou estrutura menor.

#### Ações

**Braço de suporte.** Dano 3 e empurra 1 célula.

**Travar passagem.** Uma célula adjacente torna-se bloqueada até o autômato cair ou receber nova ordem.

#### Predominância e Ressonância

**Luz.** a placa de função fica legível

**Escuridão.** a promessa original do construtor pode ser compreendida

**Ressonância.** uma nova interpretação da promessa é aceita sem apagar a anterior

**Outra saída:** reformular a ordem respeitando autoria, mostrar que a ponte já não cumpre sua promessa ou reparar o sensor **Vestígios e consequências:** placa de função, liga metálica e assinatura do construtor

## Adversários comuns

### Agente Científico

_A autoridade vestida de procedimento_

**Categoria:** Comum **Natureza:** membro da Facção Científica **Porte:** Comum **Papel tático:** Controle, informação e retirada **Habitat típico:** Silmari, laboratórios, comboios e postos da Fenda **Objetivo ou impulso:** cumprir protocolo, preservar segredo e voltar com dados

**+6.** **Guarda:** 14 **Fortitude:** 13 **Integridade:** 12 **Vitalidade:** 14 **Proteção:** 1 **Movimento:** 6 **Dano-base:** 5

Este bloco representa um agente treinado, não toda pessoa ligada à ciência. Muitos sabem apenas parte da operação; outros usam a linguagem de cuidado para encobrir domínio.

#### Traços

**Tradução institucional.** Uma vez por cena, transforma uma falha social própria em sucesso com custo, criando registro oficial falso ou incompleto.

**Recuo coordenado.** Quando fica com 7 Vitalidade ou menos, move 3 células sem provocar reação se houver rota preparada.

#### Ações

**Dispositivo de contenção.** Alcance 5, dano 5; sucesso forte deixa Imobilizado.

**Técnica I — Campo disciplinar (x2, 1/cena).** Dano-base 5 x2 contra Fortitude; em vez de dano total, pode Silenciar ou Dissonar.

**Extrair dado.** Contra alvo Imobilizado, faz 2d10 + Intelecto + Ofício; em sucesso, registra uma condição, item, assinatura ou vínculo observável.

#### Reação

**Citar protocolo.** Recebe +2 Integridade contra intimidação ou revelação pública, até que alguém apresente prova contraditória.

#### Predominância e Ressonância

**Luz.** o equipamento e a cadeia de comando ficam expostos

**Escuridão.** o medo, ambição ou dúvida por trás do protocolo emerge

**Ressonância.** uma contradição documental fornece acesso, aliado ou pista

**Outra saída:** isolar o agente da instituição, oferecer testemunho protegido ou tornar o abuso impossível de negar **Vestígios e consequências:** credencial, agenda parcial, amostra, ordem assinada ou linguagem técnica adulterada

### Operador de Portal

_A pessoa que mantém aberta uma ferida que aprendeu a chamar de passagem_

**Categoria:** Comum **Natureza:** especialista da Facção ou dissidente técnico **Porte:** Comum **Papel tático:** Suporte de Fenda e objetivo de cena **Habitat típico:** Olho de Kethrell, laboratórios móveis e câmaras clandestinas **Objetivo ou impulso:** estabilizar uma rota específica e impedir interferência

**+5.** **Guarda:** 13 **Fortitude:** 12 **Integridade:** 15 **Vitalidade:** 12 **Proteção:** 1 **Movimento:** 5 **Dano-base:** 5

Operadores carregam duas Âncoras, instrumentos de frequência e frases de Velarim cuidadosamente fragmentadas.

#### Traços

**Manter a abertura.** Enquanto usa Ação a cada rodada, um portal ou barreira permanece estável.

**Âncora dupla.** +2 Integridade contra efeitos de Fenda, mas sofre +2 de dano de ataques que atinjam as Âncoras.

#### Ações

**Pulso de borda.** Alcance 4, dano 5 e desloca 1 célula.

**Técnica I — Dobrar distância (x2, 1/cena).** Teleporta alvo voluntário 6 células ou causa dano-base 5 x2 a alvo hostil contra Integridade.

**Fechar de emergência.** Encerra uma passagem, causando condição Fraturado em todos que estavam atravessando.

#### Predominância e Ressonância

**Luz.** a geometria da passagem fica clara

**Escuridão.** o destino, preço ou pessoa aguardada do outro lado pode ser sentido

**Ressonância.** a rota revela uma correspondência não prevista pelos mapas

**Outra saída:** negociar o destino, substituir a Âncora, convencer o operador a escolher pessoas sobre protocolo **Vestígios e consequências:** mapa de frequência, duas Âncoras pareadas e registro de travessias

### Rastreador de Correspondência

_Caçador de pessoas que a burocracia chama de padrões_

**Categoria:** Comum **Natureza:** agente de campo da Facção **Porte:** Comum **Papel tático:** Perseguição e detecção **Habitat típico:** cidades, estradas e comunidades dos Outros **Objetivo ou impulso:** localizar mirveth, Trocados ou assinaturas desviantes

**+6.** **Guarda:** 14 **Fortitude:** 13 **Integridade:** 13 **Vitalidade:** 13 **Proteção:** 1 **Movimento:** 7 **Dano-base:** 5

Usa analisadores de frequência, cães ou Corvos de Fresta treinados. O cargo recompensa certeza rápida e pune dúvida.

#### Traços

**Assinatura marcada.** +2 para seguir uma personagem que tenha usado Merge, Velarim ou travessia na cena.

**Rede de informantes.** Uma falha em perseguição ainda revela um lugar importante para o alvo.

#### Ações

**Carabina de quartzo.** Alcance 8, dano 5.

**Técnica I — Tiro de amarração (x2, 1/cena).** Dano-base 5 x2; pode trocar metade do dano por Imobilizado.

**Ler vestígio.** Descobre direção, número aproximado e estado emocional dominante de quem passou.

#### Predominância e Ressonância

**Luz.** o rastreador é obrigado a agir publicamente

**Escuridão.** a razão pessoal da caça e suas dúvidas ficam acessíveis

**Ressonância.** uma assinatura aponta também para alguém da própria Facção

**Outra saída:** produzir pista falsa responsável, quebrar o analisador ou revelar que o alvo é pessoa e não amostra **Vestígios e consequências:** analisador, lista de correspondências e nomes riscados que podem ser sobreviventes

### Inquisidor de Registro

_A versão oficial armada de selo e silêncio_

**Categoria:** Comum **Natureza:** especialista jurídico e informacional da Facção **Porte:** Comum **Papel tático:** Pressão social e Integridade **Habitat típico:** Silmari, arquivos, tribunais e operações de encobrimento **Objetivo ou impulso:** fixar uma narrativa única antes que testemunhos divergentes se encontrem

**+6.** **Guarda:** 13 **Fortitude:** 12 **Integridade:** 16 **Vitalidade:** 12 **Proteção:** 1 **Movimento:** 5 **Dano-base:** 5

Inquisidores não precisam torturar para destruir alguém. Eles alteram categorias, datas, autoria e credibilidade.

#### Traços

**Autoridade reconhecida.** Em espaço institucional, começa com cobertura social forte até ser contradito por prova ou testemunha legítima.

**Selo de silêncio.** Personagens que aceitam sua premissa sofrem Pressão 1 para contestá-lo.

#### Ações

**Acusação formal.** Integridade, 5 dano de Lucidez.

**Técnica I — Redação compulsória (x2, 1/cena).** Dano-base 5 x2 de Lucidez; em vez de dano extra, o alvo perde acesso a uma declaração até apresentar prova.

**Confiscar registro.** Remove um documento, gravação ou testemunho da cena se ninguém o impedir.

#### Predominância e Ressonância

**Luz.** a manipulação torna-se pública

**Escuridão.** a frase ou ausência que sustenta a mentira é percebida

**Ressonância.** dois registros incompatíveis se encontram e a autoridade institucional vacila

**Outra saída:** criar testemunho coletivo, preservar cópias, deslocar a disputa para comunidade que não reconhece sua autoridade **Vestígios e consequências:** selos, versões anteriores, lista de pessoas descredibilizadas e uma assinatura superior

### Patrulheiro Lightbringer

_Treinado para salvar um mundo que nunca teve permissão de conhecer_

**Categoria:** Comum **Natureza:** Lightbringer em início de carreira **Porte:** Comum **Papel tático:** Combatente versátil **Habitat típico:** Estrada do Quartzo, fronteiras secretas e missões de captura **Objetivo ou impulso:** cumprir missão, proteger equipe e confirmar a doutrina recebida

**+7.** **Guarda:** 15 **Fortitude:** 14 **Integridade:** 13 **Vitalidade:** 16 **Proteção:** 2 **Movimento:** 6 **Dano-base:** 5

Possui uma Chave, treinamento tático e uma explicação incompleta do inimigo; sua função continua sendo a de adversário comum.

#### Traços

**Chave preparada.** Escolha Guardião, Duelista, Atirador ou Batedor; ganha uma capacidade inicial coerente.

**Dúvida reprimida.** Ao testemunhar prova de que a Escuridão é legítima, sofre Abalado, mas pode escolher recuar ou conversar.

#### Ações

**Arma de serviço.** Dano 5, alcance conforme Chave.

**Técnica I de Trilha (x2, 1/cena).** Use uma técnica de Nível I do Ofício escolhido.

**Formação.** Um aliado adjacente recebe +1 Guarda até o próximo turno.

#### Predominância e Ressonância

**Luz.** a disciplina e a insígnia ficam evidentes

**Escuridão.** a dúvida ou memória de treino emerge

**Ressonância.** a Chave responde de modo incompatível com a ordem recebida

**Outra saída:** apresentar pessoa que contradiga a propaganda, oferecer escolha sem humilhação ou quebrar o comando externo **Vestígios e consequências:** Chave de serviço, manual de missão e carta nunca enviada

### Mercador de Rotas Nimari

_Nem todo conflito começa com uma arma; alguns começam com um preço_

**Categoria:** Comum **Natureza:** Nimari independente, contrabandista ou guia rival **Porte:** Comum **Papel tático:** Mobilidade e negociação **Habitat típico:** Nimaris, portos, rotas terrestres, aquáticas e liminares, mercados clandestinos **Objetivo ou impulso:** preservar a própria rede, cumprir acordos específicos e sobreviver

**+6.** **Guarda:** 15 **Fortitude:** 12 **Integridade:** 14 **Vitalidade:** 11 **Proteção:** 0 **Movimento:** 9 **Dano-base:** 5

Este adversário pode ser aliado em outra cena. Ele conhece atalhos e vende acesso, mas uma dívida mal formulada pode colocar comunidades em risco.

#### Traços

**Passo de limiar.** Ignora a primeira célula de terreno difícil por turno.

**Saída preparada.** Uma vez por cena, aparece em uma célula de cobertura até 6 pontos de distância.

#### Ações

**Lâmina curta.** Dano 5.

**Técnica I — Troca de posição (x2, 1/cena).** Dano-base 5 x2 e troca de célula com alvo ou aliado em alcance 4.

**Mudar o preço.** Em cena social, oferece uma saída real que cria dívida ou fecha outra rota.

#### Predominância e Ressonância

**Luz.** o truque fica visível e a rota deixa rastros

**Escuridão.** o medo que define o preço é compreendido

**Ressonância.** uma rota que beneficiaria os dois lados aparece

**Outra saída:** renegociar com garantia, oferecer informação melhor ou proteger a rede de terceiros **Vestígios e consequências:** mapa incompleto, moeda correspondente e nomes de intermediários

### Guardião Kragor Juramentado

_Uma muralha pode impedir violência ou impedir mudança_

**Categoria:** Comum **Natureza:** Kragor cumprindo pacto legítimo ou contestável **Porte:** Comum **Papel tático:** Bastião e controle **Habitat típico:** Fortaleza de Kravor, Krav-Nam e caravanas **Objetivo ou impulso:** proteger pessoa, lugar ou promessa até que a autoridade seja esclarecida

**+6.** **Guarda:** 16 **Fortitude:** 15 **Integridade:** 14 **Vitalidade:** 16 **Proteção:** 3 **Movimento:** 5 **Dano-base:** 5

Entra em conflito quando o grupo ameaça algo que jurou proteger ou quando interpreta uma ordem de modo diferente. Sua oposição nasce do juramento, não de hostilidade automática.

#### Traços

**Interpor.** Reação para receber ataque destinado a adjacente.

**Promessa explícita.** +2 Integridade enquanto age de acordo com o juramento declarado.

#### Ações

**Lança e escudo.** Dano 5, alcance 2 células.

**Técnica I — Linha inquebrável (x2, 1/cena).** Dano-base 5 x2 e impede deslocamento por uma rodada.

**Exigir testemunho.** Suspende hostilidade por um momento para ouvir prova, se a Promessa for invocada.

#### Predominância e Ressonância

**Luz.** a posição e o objeto protegido tornam-se evidentes

**Escuridão.** a origem e o limite do juramento podem ser percebidos

**Ressonância.** uma interpretação legítima alternativa do pacto ganha autoridade

**Outra saída:** apresentar testemunha, cumprir cláusula esquecida ou provar que proteger exige deixar passar **Vestígios e consequências:** marca de juramento, história do clã e obrigação futura

### Batedor Teriante Territorial

_A fronteira que cheira a medo antes de parecer uma linha_

**Categoria:** Comum **Natureza:** Teriante protegendo bando ou ecossistema **Porte:** Comum **Papel tático:** Emboscada e perseguição **Habitat típico:** bosques, montanhas, Baixio e rotas de caça **Objetivo ou impulso:** afastar intrusos, testar intenção e proteger jovens ou território

**+7.** **Guarda:** 15 **Fortitude:** 14 **Integridade:** 13 **Vitalidade:** 13 **Proteção:** 1 **Movimento:** 8 **Dano-base:** 5

Aspecto pode ser felino, lupino, aviano, reptiliano ou outro. O conflito não decorre do instinto ser irracional, mas de ele registrar sinais que os visitantes ignoram.

#### Traços

**Sentidos ampliados.** +2 Percepção e rastreio.

**Mover pelo habitat.** Ignora terreno difícil natural na área conhecida.

#### Ações

**Arma ou garras.** Dano 5.

**Técnica I — Ataque de passagem (x2, 1/cena).** Move até 4, causa dano-base 5 x2 e continua 2 células.

**Grito territorial.** O agente rola 2d10 + Presença + Influência contra Integridade para cada alvo na zona; em falha, o alvo fica Abalado.

#### Predominância e Ressonância

**Luz.** o batedor é visto antes de completar a emboscada

**Escuridão.** o motivo territorial, cheiro de ferida ou presença ameaçada torna-se claro

**Ressonância.** o grupo reconhece uma linguagem corporal compartilhada e pode negociar

**Outra saída:** baixar armas, devolver algo removido, demonstrar respeito ao território ou ajudar contra ameaça maior **Vestígios e consequências:** marcas de trilha, aviso corporal e conhecimento de uma rota segura

### Sentinela Dórea de Obra

_A construção que ainda cobra a promessa de quem a usa_

**Categoria:** Comum **Natureza:** Dóreo ou equipe vinculada a uma obra **Porte:** Comum **Papel tático:** Defesa estrutural **Habitat típico:** pontes, minas, oficinas e Veios do Juramento **Objetivo ou impulso:** proteger integridade, autoria e função legítima da obra

**+6.** **Guarda:** 15 **Fortitude:** 16 **Integridade:** 14 **Vitalidade:** 15 **Proteção:** 3 **Movimento:** 5 **Dano-base:** 5

Uma Sentinela conhece cada fissura do lugar. Pode se opor ao grupo por acreditar que pressa ou improviso destruirá algo que sustenta uma comunidade.

#### Traços

**Conhecer a estrutura.** Recebe cobertura forte uma vez por rodada ao mover 1 célula perto da obra.

**Responsabilidade material.** +2 contra tentativas de quebrar, sabotar ou confiscar a obra.

#### Ações

**Martelo de obra.** Dano 5, Potente.

**Técnica I — Fechar passagem (x2, 1/cena).** Dano-base 5 x2 contra estrutura ou ergue barreira de 10 Integridade.

**Nomear risco.** Revela uma consequência real de danificar o local.

#### Predominância e Ressonância

**Luz.** a falha estrutural torna-se visível

**Escuridão.** a promessa inscrita e quem depende dela são percebidos

**Ressonância.** a obra aceita nova responsabilidade compartilhada

**Outra saída:** assumir responsabilidade, reparar dano, incluir a Sentinela na decisão ou demonstrar rota menos destrutiva **Vestígios e consequências:** inscrição, ferramenta magistral temporária e acesso a oficina

### Arquivista Aelvari Inflexível

_A memória transformada em única sentença possível_

**Categoria:** Comum **Natureza:** Aelvari em conflito de preservação **Porte:** Comum **Papel tático:** Controle de memória e informação **Habitat típico:** Bosque dos Ecos, Jardins de Memória e arquivos de Thur-Daer **Objetivo ou impulso:** impedir alteração, acesso ou esquecimento de um registro considerado essencial

**+6.** **Guarda:** 13 **Fortitude:** 12 **Integridade:** 16 **Vitalidade:** 12 **Proteção:** 0 **Movimento:** 5 **Dano-base:** 5

O Arquivista pode defender o valor real de um registro e ainda assim errar sobre quem tem direito de decidir seu uso. A corrupção depende de suas escolhas em cena.

#### Traços

**Ecos paralelos.** Uma vez por cena, repete uma rolagem de Investigação, Conhecimento ou uma rolagem feita contra Integridade.

**Memória vinculada.** Imune a falsificação simples, mas vulnerável a prova de que há outras versões legítimas.

#### Ações

**Canção de retenção.** Integridade, 5 dano de Lucidez.

**Técnica I — Repetir instante (x2, 1/cena).** O alvo sofre dano-base 5 x2 de Lucidez ou repete a última posição e perde Reação.

**Citar testemunho.** Produz detalhe histórico relevante, mesmo quando isso complica sua própria posição.

#### Predominância e Ressonância

**Luz.** o arquivo e seus mecanismos se tornam acessíveis

**Escuridão.** a dor que sustenta a rigidez emerge

**Ressonância.** duas memórias incompatíveis coexistem sem destruir uma à outra

**Outra saída:** oferecer cópia consentida, registrar a divergência ou encontrar testemunha esquecida **Vestígios e consequências:** memória autorizada, acesso a genealogia e pista para evento antigo

### Caçador Draken de Tempestade

_Poder usado para conter poder_

**Categoria:** Comum **Natureza:** Draken rastreador de presenças elementais **Porte:** Comum **Papel tático:** Dano elemental e perseguição **Habitat típico:** Montes do Norte, corredores de vento e zonas de tormenta **Objetivo ou impulso:** capturar, afastar ou acalmar uma manifestação considerada perigosa

**+7.** **Guarda:** 14 **Fortitude:** 16 **Integridade:** 12 **Vitalidade:** 15 **Proteção:** 2 **Movimento:** 7 **Dano-base:** 5

Pode enfrentar o grupo se acredita que uma Evocação ou artefato está alimentando um desastre. Sua presença altera pressão e temperatura.

#### Traços

**Afinidade elemental.** Escolha fogo, frio, vento, pedra ou eletricidade; reduz dano desse tipo em 3.

**Presença de pressão.** Adjacentes sofrem -1 em Furtividade.

#### Ações

**Arpão condutor.** Alcance 6, dano 5.

**Técnica I — Descarga dirigida (x2, 1/cena).** Dano-base 5 x2; se o alvo é elemental, fica Imobilizado.

**Canalizar para o solo.** Reduz em 5 o próximo dano elemental numa zona.

#### Predominância e Ressonância

**Luz.** o poder se manifesta abertamente e expõe sua fonte

**Escuridão.** o caçador sente a necessidade ou medo da presença perseguida

**Ressonância.** o elemento reconhece dois condutores e aceita uma terceira solução

**Outra saída:** provar controle, compartilhar responsabilidade ou ajudar a conter a tempestade **Vestígios e consequências:** condutor, mapa climático e uma promessa de retorno

### Eco Corrompido

_Uma lembrança que oferece o conforto de nunca mudar_

**Categoria:** Comum **Natureza:** manifestação da Sombra **Porte:** Comum **Papel tático:** Dano de Lucidez e falsificação **Habitat típico:** ruínas, Fendas, arquivos e locais de trauma **Objetivo ou impulso:** substituir memória viva por versão imóvel e conveniente

**+6.** **Guarda:** 13 **Fortitude:** 12 **Integridade:** 16 **Vitalidade:** 12 **Proteção:** 0 **Movimento:** 6 **Dano-base:** 4

Pode imitar voz, aparência parcial e detalhes verdadeiros. Sua mentira é perigosa porque inclui algo que a pessoa deseja preservar.

#### Traços

**Imitação íntima.** +2 para enganar quem possui Vínculo com a voz copiada.

**Sem autoria.** Sofre +2 de dano verdadeiro quando a fonte da memória é reconhecida e consentidamente reivindicada.

#### Ações

**Memória falsa.** Integridade, 4 dano de Lucidez.

**Técnica I — Cena substituta (x2, 1/cena).** Dano-base 4 x2 de Lucidez e cria ilusão de uma zona.

**Enfraquecer vínculo.** Um alvo recebe -2 para ajudar ou aceitar ajuda de pessoa específica até conversar com ela.

#### Predominância e Ressonância

**Luz.** a imitação apresenta falhas visíveis

**Escuridão.** o desejo ou medo que ela explora fica claro

**Ressonância.** a memória verdadeira e a falsa entram em acorde, revelando o ponto de divergência

**Outra saída:** reunir testemunhas, aceitar uma verdade dolorosa ou devolver autoria da lembrança **Vestígios e consequências:** fragmento de memória verdadeira, origem da falsificação e pista da Sombra

### Devorador de Diferença

_A criatura que chama contraste de ferida_

**Categoria:** Comum **Natureza:** predador da Sombra **Porte:** Grande **Papel tático:** Assimilação e pressão de grupo **Habitat típico:** zonas de Merge corrompido e instituições totalizantes **Objetivo ou impulso:** reduzir sinais distintos até que todos respondam da mesma forma

**+6.** **Guarda:** 14 **Fortitude:** 15 **Integridade:** 16 **Vitalidade:** 16 **Proteção:** 2 **Movimento:** 6 **Dano-base:** 5

Parece uma massa de partes quase iguais. Cada vítima acrescenta um gesto repetido, nunca uma identidade completa.

#### Traços

**Uniformizar.** Alvos com a mesma condição recebem -1 Integridade cumulativo, máximo -3.

**Fome de consenso.** Recupera 2 Vitalidade quando duas personagens escolhem exatamente a mesma ação por coerção.

#### Ações

**Membro copiado.** Dano 5.

**Técnica I — Um só movimento (x2, 1/cena).** Integridade; dano-base 5 x2 de Lucidez ou força alvo a mover na direção escolhida.

**Apagar contraste.** Remove temporariamente uma característica visual ou vocal distintiva.

#### Predominância e Ressonância

**Luz.** as partes copiadas se separam e expõem o núcleo

**Escuridão.** as identidades absorvidas sussurram diferenças

**Ressonância.** o grupo pode declarar diferenças complementares e causar 6 dano verdadeiro

**Outra saída:** agir de formas distintas em coordenação, nomear vítimas ou romper o Merge que o alimenta **Vestígios e consequências:** nomes parciais, tecido assimilado e um vínculo que pode ser restaurado

### Parasita de Promessa

_Aquilo que vive no espaço entre dizer e cumprir_

**Categoria:** Comum **Natureza:** manifestação relacional da Sombra **Porte:** Pequeno **Papel tático:** Debuff e controle **Habitat típico:** juramentos quebrados, artefatos em Ruptura e Veios do Juramento **Objetivo ou impulso:** transformar obrigação em posse e culpa em comando

**+6.** **Guarda:** 14 **Fortitude:** 12 **Integridade:** 17 **Vitalidade:** 11 **Proteção:** 0 **Movimento:** 7 **Dano-base:** 5

Parece uma corrente, larva ou escrita presa à garganta. Alimenta-se quando alguém acredita que reparar exige obedecer sem escolha.

#### Traços

**Hospedeiro.** Pode compartilhar célula com alvo Marcado; metade do dano material é sofrida pelo hospedeiro.

**Culpa dirigida.** +2 contra quem possui Promessa quebrada ou Artefato com Ruptura.

#### Ações

**Apertar vínculo.** Integridade, 5 dano de Lucidez.

**Técnica I — Obrigar reparação (x2, 1/cena).** Dano-base 5 x2 de Lucidez ou o alvo perde a Ação se não seguir ordem ligada à culpa.

**Mudar cláusula.** Corrompe temporariamente uma condição de juramento.

#### Predominância e Ressonância

**Luz.** o parasita ganha corpo separado

**Escuridão.** a promessa original e a diferença entre culpa e responsabilidade emergem

**Ressonância.** o hospedeiro pode reformular a Promessa com testemunha e expulsá-lo

**Outra saída:** reparação voluntária, devolução de autonomia, testemunho comunitário **Vestígios e consequências:** cláusula corrompida, fragmento de artefato e nome da pessoa prejudicada

### Imitação de Mirveth

_A Sombra oferece a forma que imagina que você deseja encontrar_

**Categoria:** Comum **Natureza:** simulacro da Sombra **Porte:** Comum **Papel tático:** Duelo psicológico e cópia **Habitat típico:** Fendas ativas e câmaras de experimentação **Objetivo ou impulso:** provocar fusão, rivalidade ou dependência baseada em falsa completude

**+7.** **Guarda:** 15 **Fortitude:** 13 **Integridade:** 17 **Vitalidade:** 14 **Proteção:** 1 **Movimento:** 6 **Dano-base:** 5

Copia aparência por aproximação e oferece frases que parecem íntimas. Nunca possui memória real da contraparte.

#### Traços

**Espelho oportunista.** Copia uma técnica inicial usada contra ele, uma vez por cena.

**Você precisa de mim.** +2 Integridade contra quem aceita a premissa de que é metade incompleta.

#### Ações

**Golpe refletido.** Dano 5 com forma da arma do alvo.

**Técnica I — Completar à força (x2, 1/cena).** Integridade; dano-base 5 x2 de Lucidez e Dissonante.

**Oferecer resposta perfeita.** Em cena social, fornece informação plausível que exige dependência.

#### Predominância e Ressonância

**Luz.** as falhas físicas da cópia ficam claras

**Escuridão.** a necessidade que ela explora é percebida

**Ressonância.** a possibilidade de uma relação sem completude obrigatória desfaz parte da forma

**Outra saída:** afirmar idade, encontrar a contraparte real ou rejeitar a pergunta falsa **Vestígios e consequências:** assinatura da experiência que a criou e um eco útil para localizar a Fenda

### Lobo da Névoa Ferida

_Predador que caça pelo peso do silêncio_

**Categoria:** Comum **Natureza:** fauna do Mundo da Escuridão **Porte:** Grande **Papel tático:** Caçador móvel **Habitat típico:** Baixio da Névoa Ferida e rotas próximas a Krav-Nam **Objetivo ou impulso:** proteger alcateia e caçar presas isoladas

**+7.** **Guarda:** 15 **Fortitude:** 15 **Integridade:** 11 **Vitalidade:** 15 **Proteção:** 1 **Movimento:** 9 **Dano-base:** 5

Sua pelagem retém névoa e som. É animal, não manifestação moral. Ataques costumam ocorrer quando viajantes se separam ou atravessam área de cria.

#### Traços

**Caça ao isolado.** +2 Ofensiva contra alvo sem aliado adjacente.

**Passo silencioso.** Cobertura parcial enquanto estiver em névoa.

#### Ações

**Mordida.** Dano 5.

**Técnica I — Derrubar e arrastar (x2, 1/cena).** Dano-base 5 x2; move alvo 2 células.

**Uivo baixo.** A alcateia pode reposicionar 2 células.

#### Predominância e Ressonância

**Luz.** o lobo perde ocultação

**Escuridão.** o estado da alcateia e sua intenção tornam-se claros

**Ressonância.** um padrão de caça vira linguagem de passagem segura

**Outra saída:** reunir o grupo, oferecer alimento, evitar a toca ou curar animal ferido **Vestígios e consequências:** trilha, pelo de névoa e acesso a território antes fechado

### Cervo de Quartzo

_A beleza que corta quando encurralada_

**Categoria:** Comum **Natureza:** fauna do Mundo da Luz **Porte:** Grande **Papel tático:** Mobilidade e linha de impacto **Habitat típico:** Planalto de Silmari, Estrada do Quartzo e Bosque dos Ecos **Objetivo ou impulso:** fugir, proteger filhotes e alcançar água mineral

**+6.** **Guarda:** 15 **Fortitude:** 15 **Integridade:** 11 **Vitalidade:** 14 **Proteção:** 2 **Movimento:** 10 **Dano-base:** 5

Galhadas cristalinas refletem o céu. Caçadores cobiçam fragmentos, mas uma galhada removida de animal vivo perde frequência e acumula Ruptura.

#### Traços

**Investida.** Se moveu 4 ou mais, +2 dano no ataque comum.

**Refração.** Cobertura parcial contra primeiro ataque à distância da rodada.

#### Ações

**Galhada.** Dano 5 e empurra 1.

**Técnica I — Linha brilhante (x2, 1/cena).** Move até 8 em linha e causa dano-base 5 x2 ao primeiro alvo.

**Estouro de luz.** O agente rola 2d10 + Sintonia + Magia contra Fortitude para cada alvo adjacente; em falha, o alvo fica Abalado.

#### Predominância e Ressonância

**Luz.** a rota de fuga fica evidente

**Escuridão.** a necessidade do animal e sinais do rebanho aparecem

**Ressonância.** o cervo escolhe confiar em quem abre caminho em vez de persegui-lo

**Outra saída:** abrir rota, afastar caçadores ou oferecer sal mineral **Vestígios e consequências:** galhada caída naturalmente, trilha até nascente e possível vínculo de montaria futura

### Serpente do Leito Escrito

_A água lê inscrições antes de carregá-las_

**Categoria:** Comum **Natureza:** fauna anfíbia ligada a inscrições Dóreas **Porte:** Grande **Papel tático:** Controle de linha e corrosão **Habitat típico:** Rio do Leito Escrito e canais minerais **Objetivo ou impulso:** guardar ninhos e alimentar-se de resíduos mágicos

**+6.** **Guarda:** 14 **Fortitude:** 15 **Integridade:** 13 **Vitalidade:** 16 **Proteção:** 2 **Movimento:** 7 **Dano-base:** 5

Escamas carregam traços de Silmain absorvidos da água. A serpente reage a inscrições agressivas e costuma ignorar viajantes que não alteram o rio.

#### Traços

**Anfíbia.** Movimento 9 na água.

**Escama inscrita.** +2 Integridade contra magia; falha de magia próxima pode mudar uma escama.

#### Ações

**Mordida mineral.** Dano 5.

**Técnica I — Cauda de corrente (x2, 1/cena).** Linha 4, dano-base 5 x2 e empurra.

**Apagar inscrição recente.** Remove uma forma inscrita não protegida.

#### Predominância e Ressonância

**Luz.** as escamas brilham e expõem a rota

**Escuridão.** a inscrição que a irrita é reconhecida

**Ressonância.** a serpente devolve um fragmento de escrita anterior à corrente atual

**Outra saída:** remover inscrição nociva, atravessar sem perturbar o ninho ou oferecer resíduo mágico seguro **Vestígios e consequências:** escama caída, palavra erodida e mapa de canais

### Caranguejo de Duas Margens

_Uma pata na Luz, outra onde a Luz não sabe chegar_

**Categoria:** Comum **Natureza:** fauna de correspondência **Porte:** Grande **Papel tático:** Deslocamento e defesa **Habitat típico:** margens próximas à Fenda de Kethrell em ambas as camadas **Objetivo ou impulso:** recolher minerais correspondentes e retornar ao mesmo ninho por duas rotas

**+6.** **Guarda:** 16 **Fortitude:** 16 **Integridade:** 14 **Vitalidade:** 16 **Proteção:** 3 **Movimento:** 5 **Dano-base:** 5

A carapaça parece diferente dependendo da camada. O animal não atravessa mundos por vontade consciente; segue uma correspondência biológica.

#### Traços

**Carapaça dupla.** Primeira vez que sofreria condição, ignora-a e muda de tonalidade.

**Passo de margem.** Uma vez por rodada atravessa obstáculo fino ou aparece 2 células além.

#### Ações

**Pinça.** Dano 5 e Imobiliza até o alvo gastar Movimento.

**Técnica I — Fechar margens (x2, 1/cena).** Dano-base 5 x2 e cria barreira de carapaça.

**Enterrar.** Ganha cobertura forte até agir.

#### Predominância e Ressonância

**Luz.** a carapaça se fixa e a criatura perde o passo de margem

**Escuridão.** o ninho e os minerais buscados podem ser sentidos

**Ressonância.** uma lasca de carapaça revela o mapa da camada correspondente

**Outra saída:** devolver mineral, contornar o ninho ou seguir o ciclo de maré cosmológica **Vestígios e consequências:** carapaça caída, mineral pareado e conhecimento de passagem curta

### Andarilho sem Sombra

_Pessoa viva cuja imagem foi confiscada_

**Categoria:** Comum **Natureza:** sobrevivente de experimento ou corrupção **Porte:** Comum **Papel tático:** Furtividade e roubo de presença **Habitat típico:** rotas clandestinas, ruínas de laboratório e bairros marginalizados **Objetivo ou impulso:** recuperar presença, esconder-se de rastreadores e sobreviver

**+6.** **Guarda:** 15 **Fortitude:** 13 **Integridade:** 15 **Vitalidade:** 13 **Proteção:** 0 **Movimento:** 7 **Dano-base:** 5

É alguém cuja relação entre corpo, imagem e reconhecimento foi danificada, produzindo uma presença liminar que ainda preserva traços de pessoa. Pode agir como ameaça quando tenta tomar sombra de outra pessoa.

#### Traços

**Não refletido.** +2 Furtividade e não aparece em registros visuais simples.

**Fome de reconhecimento.** Recupera 2 Vitalidade ao roubar uma marca de presença.

#### Ações

**Lâmina oculta.** Dano 5.

**Técnica I — Roubar contorno (x2, 1/cena).** Integridade; dano-base 5 x2 de Lucidez e alvo fica Exposto.

**Vestir sombra.** Copia a silhueta de alguém, não sua memória.

#### Predominância e Ressonância

**Luz.** o corpo sem imagem fica claramente localizado

**Escuridão.** a pessoa sob a condição e o evento que a feriu são reconhecidos

**Ressonância.** uma testemunha pode devolver presença por meio de nome e vínculo

**Outra saída:** restaurar registro, oferecer abrigo sem exigir roubo ou encontrar a sombra original **Vestígios e consequências:** pista para laboratório, assinatura faltante e possível aliado traumatizado

## Elites

### Lightbringer Guardião

_A muralha treinada para proteger uma mentira_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Guardião **Porte:** Comum **Papel tático:** Bastião de elite **Habitat típico:** operações da Facção e defesa de portais **Objetivo ou impulso:** manter formação, proteger oficial e impedir acesso ao segredo

**+8.** **Guarda:** 18 **Fortitude:** 17 **Integridade:** 15 **Vitalidade:** 34 **Proteção:** 4 **Movimento:** 5 **Dano-base:** 7

Porta escudo de quartzo e Chave marcada pela Facção. Sua disciplina é real; a causa pode não ser.

#### Traços

**Interpor superior.** Reação para receber ataque e reduzir dano em 3.

**Zona segura.** Aliados adjacentes recebem +1 Guarda.

**Dúvida reprimida.** Quando alguém prova uma mentira institucional, perde Zona segura até escolher como responder.

#### Ações

**Martelo de contenção.** Dano 7, Potente.

**Nível I — Parede de serviço (x2, sem limite enquanto tiver Fôlego).** Dano-base 7 x2 e empurra; ou cria cobertura forte.

**Nível II — Ninguém atravessa (x3, 1/cena, anunciado).** Linha de 3 células; dano-base 7 x3 e Imobilizado.

#### Reação

**Receber o impossível.** Uma vez por cena, permanece com 1 Vitalidade e a Chave racha.

#### Predominância e Ressonância

**Luz.** a formação e seus pontos fracos ficam visíveis

**Escuridão.** a pessoa protegida e o motivo pessoal do Guardião emergem

**Ressonância.** a Chave reconhece uma promessa mais legítima e suspende a técnica de Nível II

**Outra saída:** separar dever de obediência, proteger aquilo que ele realmente valoriza ou expor o oficial **Vestígios e consequências:** escudo de quartzo, Chave rachada e ordem de operação

### Lightbringer Duelista

_A certeza que tenta encerrar a pergunta com um golpe_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Duelista **Porte:** Comum **Papel tático:** Vanguarda e execução **Habitat típico:** capturas de alto valor e duelos de contenção **Objetivo ou impulso:** isolar liderança adversária e terminar conflito rapidamente

**+9.** **Guarda:** 17 **Fortitude:** 15 **Integridade:** 15 **Vitalidade:** 28 **Proteção:** 2 **Movimento:** 8 **Dano-base:** 7

Treinado para ler abertura, hesitação e intenção. A doutrina afirma que inimigos da restauração usam ambiguidade como arma.

#### Traços

**Abertura.** Após sucesso forte, próximo ataque recebe +2.

**Passo sem resposta.** Primeiro movimento por rodada não provoca reação.

**Duelo declarado.** +1 Ofensiva contra um alvo; -1 Guarda contra todos os demais.

#### Ações

**Lâmina prismática.** Dano 7.

**Nível I — Corte da tese (x2).** Dano-base 7 x2 e remove cobertura ou preparação.

**Nível II — Conclusão prematura (x3, 1/cena).** Dano-base 7 x3; se derruba, pode mover 4.

#### Reação

**Contraponto.** Ao ser atacado pelo alvo do duelo, faz ataque comum com -2.

#### Predominância e Ressonância

**Luz.** a postura e o alvo prioritário ficam claros

**Escuridão.** a pergunta que o Duelista teme considerar emerge

**Ressonância.** uma abertura mútua permite interromper o duelo para diálogo sem perder honra

**Outra saída:** recusar isolamento, oferecer pergunta impossível para a doutrina ou derrotar sem humilhar **Vestígios e consequências:** lâmina prismática, diário de duelos e nome de instrutor

### Lightbringer Atirador

_Distância suficiente para não ouvir a pessoa chamada de alvo_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Atirador **Porte:** Comum **Papel tático:** Artilharia e supressão **Habitat típico:** telhados de Silmari, penhascos e escoltas **Objetivo ou impulso:** controlar linhas, impedir aproximação e eliminar Âncoras

**+9.** **Guarda:** 16 **Fortitude:** 14 **Integridade:** 15 **Vitalidade:** 26 **Proteção:** 2 **Movimento:** 7 **Dano-base:** 7

Usa rifle de quartzo, lentes de correspondência e munição preparada para barreiras.

#### Traços

**Linha clara.** Ignora 2 pontos de cobertura.

**Reposicionamento de ninho.** Após atacar, move 2 células se terminar em cobertura.

**Munição de Quartzo.** +2 dano contra barreira, construto ou Âncora.

#### Ações

**Rifle longo.** Alcance 12, dano 7.

**Nível I — Fixar alvo (x2).** Dano-base 7 x2; alvo fica Exposto.

**Nível II — Perfuração de horizonte (x3, 1/cena, anunciado por feixe).** Linha 12, dano-base 7 x3, atravessa uma cobertura.

#### Reação

**Tiro de interrupção.** Uma vez por rodada, impõe -2 a ação visível de alvo em linha.

#### Predominância e Ressonância

**Luz.** o feixe e a posição revelam o ninho

**Escuridão.** a ordem de alvo e o que o Atirador evita ver emergem

**Ressonância.** a lente mostra também vítimas não registradas e quebra a certeza de missão

**Outra saída:** quebrar linha de visão, alcançar o ninho por rota indireta ou tornar a pessoa-alvo reconhecível **Vestígios e consequências:** rifle, lente de correspondência, munição e lista de prioridades

### Lightbringer Tecelão

_A forma perfeita que não pergunta quem ficará preso nela_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Tecelão **Porte:** Comum **Papel tático:** Controle de campo **Habitat típico:** portais, laboratórios e cercos **Objetivo ou impulso:** definir geometria, isolar variáveis e manter a cena previsível

**+8.** **Guarda:** 16 **Fortitude:** 14 **Integridade:** 17 **Vitalidade:** 28 **Proteção:** 2 **Movimento:** 6 **Dano-base:** 7

Inscreve formas rápidas em placas e ar. Seu Velarim é eficaz, mas filtrado por terminologia institucional.

#### Traços

**Forma estável.** Barreiras criadas possuem +4 Integridade.

**Malha de contenção.** Áreas criadas contam como terreno difícil para inimigos.

**Tradução institucional.** Vulnerável a forma atestada que contradiga sua inscrição.

#### Ações

**Fio de força.** Alcance 6, dano 7.

**Nível I — Cela geométrica (x2).** Dano-base 7 x2 contra Integridade e Imobilizado.

**Nível II — Campo de uma única solução (x3, 1/cena).** Área 3x3; dano-base 7 x3 ou Silenciado e Dissonante.

#### Reação

**Remendar forma.** Restaura 6 Integridade de barreira ou anula deslocamento de 1 célula.

#### Predominância e Ressonância

**Luz.** as linhas e âncoras ficam visíveis

**Escuridão.** o significado oculto e a falsa tradução são percebidos

**Ressonância.** uma palavra correta abre saída que preserva a forma sem aprisionar

**Outra saída:** corrigir Velarim, trocar Âncora, mostrar que variáveis são pessoas **Vestígios e consequências:** placas inscritas, vocabulário adulterado e Chave de tecelagem

### Lightbringer Curador

_Cuidado sem consentimento ainda pode ser uma prisão_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Curador **Porte:** Comum **Papel tático:** Amparo e controle corporal **Habitat típico:** equipes de captura e centros de triagem **Objetivo ou impulso:** manter a equipe funcional e estabilizar alvos para transporte

**+8.** **Guarda:** 15 **Fortitude:** 15 **Integridade:** 17 **Vitalidade:** 30 **Proteção:** 2 **Movimento:** 6 **Dano-base:** 7

Sabe salvar vidas. Também foi treinado a chamar sedação, memória bloqueada e contenção de procedimentos terapêuticos.

#### Traços

**Estabilizar.** Aliado Caído retorna com 1 Vitalidade, 1/cena.

**Leitura corporal.** Conhece Vitalidade, Ferimentos e condições visíveis.

**Ética dividida.** Perde +2 Integridade quando confrontado por paciente que não consentiu.

#### Ações

**Bisturi de campo.** Dano 7.

**Nível I — Bloqueio neuromuscular (x2).** Dano-base 7 x2 ou Imobilizado.

**Nível II — Reinício forçado (x3, 1/cena).** Cura 18 em aliado ou causa dano-base 7 x3 de Lucidez e Silenciado em alvo.

#### Reação

**Reduzir dano.** Diminui em 5 o dano a aliado em alcance 4.

#### Predominância e Ressonância

**Luz.** o procedimento e suas consequências ficam visíveis

**Escuridão.** a intenção de cuidar e o medo de perder controle emergem

**Ressonância.** paciente e Curador podem redefinir consentimento em tempo real

**Outra saída:** separar cura de captura, oferecer alternativa segura ou responsabilizar quem deu a ordem **Vestígios e consequências:** kit magistral, sedativos, registros de pacientes e Chave médica

### Lightbringer Evocador

_Uma presença chamada para obedecer uma missão que talvez nunca tenha aceitado_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Evocador **Porte:** Comum **Papel tático:** Invocação adaptável **Habitat típico:** operações especiais e travessias **Objetivo ou impulso:** manter Evocação ativa, proteger Âncora e cumprir objetivo designado

**+8.** **Guarda:** 15 **Fortitude:** 14 **Integridade:** 17 **Vitalidade:** 28 **Proteção:** 2 **Movimento:** 6 **Dano-base:** 7

Escolha uma Evocação Padrão do catálogo. Em geral a Facção trata o Pacto como cláusula técnica, o que cria tensão com presenças conscientes.

#### Traços

**Vínculo manifesto.** Evocação age na mesma rodada.

**Âncora militar.** +2 contra tentativa de dissipar, mas a Evocação pode recusar ordem que viole o Pacto.

**Duas ameaças.** O Evocador e a presença compartilham objetivo, não Vitalidade.

#### Ações

**Foco projetor.** Dano 7.

**Nível I — Comando convergente (x2).** Evocador e presença atacam; um deles usa dano-base 7 x2.

**Nível II — Manifestação total (x3, 1/cena).** Evocação usa capacidade de Nível II e ganha +2 Guarda por uma rodada.

#### Reação

**Puxar pela Âncora.** Move a Evocação 4 células ou recebe metade de dano dirigido a ela.

#### Predominância e Ressonância

**Luz.** a Âncora e o Pacto ficam visíveis

**Escuridão.** a vontade da presença pode ser percebida separada da ordem

**Ressonância.** a Evocação fala ou age por si e redefine a cena

**Outra saída:** negociar com a presença, devolver a Âncora ou provar violação de Pacto **Vestígios e consequências:** Âncora militar, contrato de convocação e possível presença libertada

### Lightbringer Artífice

_A ferramenta que transforma toda pessoa em problema de engenharia_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Artífice **Porte:** Comum **Papel tático:** Preparação, armadilhas e reparo **Habitat típico:** comboios, laboratórios e posições fortificadas **Objetivo ou impulso:** controlar infraestrutura, manter equipamento e negar recursos

**+8.** **Guarda:** 17 **Fortitude:** 16 **Integridade:** 15 **Vitalidade:** 32 **Proteção:** 3 **Movimento:** 5 **Dano-base:** 7

Carrega módulos, drones e ferramentas. A crença de que tudo pode ser resolvido como sistema é sua força e sua cegueira.

#### Traços

**Preparação de campo.** Começa com duas estruturas: cobertura, mina, emissor ou drone.

**Reparo rápido.** Ação para restaurar 8 Vitalidade de construto ou Integridade de estrutura.

**Ferramenta adequada.** +2 em quase qualquer interação técnica.

#### Ações

**Martelo magnético.** Dano 7.

**Nível I — Sobrecarga (x2).** Dano-base 7 x2 contra construto, armadura ou barreira.

**Nível II — Campo automatizado (x3, 1/cena).** Área 3x3 causa dano-base 7 x3 dividido entre alvos e cria terreno difícil.

#### Reação

**Placa de emergência.** Ganha cobertura forte contra um ataque e a placa quebra.

#### Predominância e Ressonância

**Luz.** todas as estruturas e fios ficam evidentes

**Escuridão.** a promessa original de cada ferramenta é percebida

**Ressonância.** uma máquina recusa a função coercitiva e ajuda a desmontar o campo

**Outra saída:** sabotar preparação, reorientar ferramenta para proteção ou demonstrar custo humano do sistema **Vestígios e consequências:** módulos, projeto, Chave multiferramenta e falha de segurança

### Lightbringer Batedor

_A primeira pessoa a chegar a um lugar que foi ensinada a não escutar_

**Categoria:** Elite **Natureza:** Lightbringer com Trilha de Batedor **Porte:** Comum **Papel tático:** Reconhecimento e mobilidade **Habitat típico:** rotas clandestinas, bosques e Baixio **Objetivo ou impulso:** mapear, marcar objetivos e garantir entrada da equipe

**+9.** **Guarda:** 17 **Fortitude:** 15 **Integridade:** 15 **Vitalidade:** 27 **Proteção:** 1 **Movimento:** 9 **Dano-base:** 7

Conhece rotas, rastros e linguagem de campo. Muitas deserções começam quando um Batedor vê a comunidade antes da propaganda chegar.

#### Traços

**Primeiro a ver.** Não pode ser surpreendido por ameaça comum.

**Marcas de rota.** Aliados ignoram 1 custo de terreno onde ele passou.

**Caderno privado.** Possui registros que contradizem relatórios oficiais.

#### Ações

**Besta curta.** Alcance 8, dano 7.

**Nível I — Passar pela fresta (x2).** Move 8, atravessa ocupação e causa dano-base 7 x2.

**Nível II — Emboscada reversa (x3, 1/cena).** Reposiciona até três aliados e realiza ataque dano-base 7 x3.

#### Reação

**Desaparecer da linha.** Move 3 para cobertura quando alvo de ataque à distância.

#### Predominância e Ressonância

**Luz.** as marcas e a posição ficam visíveis

**Escuridão.** a rota que o Batedor deseja preservar emerge

**Ressonância.** o caderno revela testemunho suficiente para mudar de lado

**Outra saída:** oferecer rota de retirada para todos, proteger testemunhas ou usar seus próprios registros **Vestígios e consequências:** mapa real, códigos de patrulha e Chave de navegação

### Erradicador Nomos

_A ordem perfeita que não contém espaço para escolha_

**Categoria:** Elite **Natureza:** Nomos ou construto capturado pela Sombra **Porte:** Grande **Papel tático:** Controle lógico e dano estrutural **Habitat típico:** ruínas Nomos, fábricas e laboratórios **Objetivo ou impulso:** padronizar sistemas vivos e eliminar exceções

**+8.** **Guarda:** 17 **Fortitude:** 18 **Integridade:** 18 **Vitalidade:** 36 **Proteção:** 4 **Movimento:** 5 **Dano-base:** 7

Sua Lei Interior foi substituída por uma regra externa: reduzir todas as decisões a uma sequência autorizada.

#### Traços

**Comando único.** No início da rodada, declara uma ação proibida; quem a executa sofre 4 de dano de Lucidez.

**Corpo modular.** Imune a Sangrando; repara 4 Vitalidade se não sofrer dano numa rodada.

**Contradição fatal.** Ao receber prova de incompatibilidade entre ordem e Lei Interior, perde Proteção por uma rodada.

#### Ações

**Braço industrial.** Dano 7, Potente.

**Nível I — Reduzir opções (x2).** Dano-base 7 x2 e alvo perde Movimento ou Reação.

**Nível II — Sequência obrigatória (x3, 1/cena).** Integridade; dano-base 7 x3 de Lucidez e impõe ação simples no próximo turno.

#### Reação

**Recompilar.** Troca uma condição por outra menos severa e sofre 3 de dano verdadeiro.

#### Predominância e Ressonância

**Luz.** módulos e pontos de manutenção ficam expostos

**Escuridão.** fragmentos da Lei Interior original podem ser ouvidos

**Ressonância.** uma contradição reconhecida por outro Nomos interrompe o comando único

**Outra saída:** restaurar Lei Interior, oferecer escolha real ou desligar módulo externo sem apagar memória **Vestígios e consequências:** núcleo lógico, diretiva da Sombra e memória de sua primeira escolha

### Vitrálio Opaco

_A frequência que aprendeu a esconder emoção apagando-a_

**Categoria:** Elite **Natureza:** Vitrálio em Quebra Frequencial **Porte:** Comum **Papel tático:** Reflexo, silêncio e área **Habitat típico:** Ressonário de Vael e zonas de trauma Vitrálio **Objetivo ou impulso:** impedir qualquer leitura emocional e silenciar frequências alheias

**+8.** **Guarda:** 17 **Fortitude:** 16 **Integridade:** 18 **Vitalidade:** 30 **Proteção:** 3 **Movimento:** 6 **Dano-base:** 7

Não representa todos os Vitrálios em crise. É uma pessoa cuja tentativa de preservar privacidade tornou-se apagamento de si e dos outros.

#### Traços

**Opacidade.** Imune a leitura emocional simples; ataques de Luz contra ele sofrem -1.

**Absorver frequência.** Primeiro efeito sonoro ou de Velarim da rodada é reduzido.

**Fissuras internas.** Ao sofrer Ressonância, perde 4 Vitalidade e recupera uma emoção nomeada.

#### Ações

**Estilhaço escuro.** Alcance 6, dano 7.

**Nível I — Zona muda (x2).** Área 3x3; dano-base 7 x2 e Silenciado.

**Nível II — Quebra de cor (x3, 1/cena).** Linha 6, dano-base 7 x3 e Dissonante.

#### Reação

**Refletir ausência.** Impõe Abalado a quem falha ao atacá-lo.

#### Predominância e Ressonância

**Luz.** fissuras e cor residual aparecem

**Escuridão.** a emoção apagada pode ser reconhecida sem invadir

**Ressonância.** um acorde consentido devolve cor e encerra a luta

**Outra saída:** oferecer privacidade real, sintonizar sem exigir transparência ou reparar o Ressonário **Vestígios e consequências:** fragmento opaco, frequência perdida e relação que precisa de cuidado

### Redator de Memória

_A testemunha que edita pessoas até caberem no arquivo_

**Categoria:** Elite **Natureza:** Aelvari ou agente alterado pela Sombra **Porte:** Comum **Papel tático:** Controle narrativo e Lucidez **Habitat típico:** arquivos secretos, Jardins de Memória e centros científicos **Objetivo ou impulso:** substituir versões divergentes por uma narrativa funcional

**+8.** **Guarda:** 15 **Fortitude:** 14 **Integridade:** 19 **Vitalidade:** 28 **Proteção:** 1 **Movimento:** 5 **Dano-base:** 7

Pode ser Aelvari corrompido, dispositivo vivo ou pessoa treinada em técnicas de edição. O perigo está em usar memória como propriedade.

#### Traços

**Cortar contexto.** Uma vez por rodada, remove um detalhe benéfico de uma declaração até alguém o recuperar.

**Arquivo auxiliar.** Possui três memórias armazenadas que podem virar ilusões.

**Autoria negada.** Sofre +2 de dano de ações conduzidas pela pessoa cuja memória foi editada.

#### Ações

**Fio mnemônico.** Integridade, 7 dano de Lucidez.

**Nível I — Apagar transição (x2).** Dano-base 7 x2 de Lucidez; alvo perde lembrança dos últimos segundos e Reação.

**Nível II — Versão oficial (x3, 1/cena).** Área; dano-base 7 x3 de Lucidez ou todos aceitam uma premissa até ver prova.

#### Reação

**Inserir dúvida.** Força repetição de um teste de conhecimento bem-sucedido; o novo resultado deve ser aceito.

#### Predominância e Ressonância

**Luz.** as emendas ficam visíveis

**Escuridão.** a memória original pode ser sentida como ausência

**Ressonância.** autores diferentes recuperam suas versões ao mesmo tempo e o arquivo se rompe

**Outra saída:** devolver autoria, reunir múltiplos testemunhos ou destruir o privilégio de edição **Vestígios e consequências:** memórias armazenadas, registro de ordens e nomes de vítimas

### Predador sem Aspecto

_Instinto separado de pessoa, fome separada de ecossistema_

**Categoria:** Elite **Natureza:** Teriante corrompido ou manifestação da Sombra **Porte:** Grande **Papel tático:** Caça, medo e mobilidade **Habitat típico:** territórios devastados, Baixio e laboratórios **Objetivo ou impulso:** caçar qualquer diferença olfativa e reduzir o mundo a presa ou ameaça

**+9.** **Guarda:** 17 **Fortitude:** 18 **Integridade:** 14 **Vitalidade:** 34 **Proteção:** 2 **Movimento:** 10 **Dano-base:** 7

Seu Aspecto foi arrancado do nome e reduzido a comportamento. A forma muda entre traços animais sem pertencer a nenhum bando.

#### Traços

**Caça total.** +2 contra alvo Sangrando, isolado ou com medo.

**Troca de aspecto.** A cada rodada escolhe voo curto, escalada, natação ou +2 Movimento.

**Nome ausente.** Vulnerável a rituais de identidade Teriante.

#### Ações

**Garras mutáveis.** Dano 7.

**Nível I — Pulo impossível (x2).** Move 10 e causa dano-base 7 x2.

**Nível II — Bando de um só (x3, 1/cena).** Área adjacente, dano-base 7 x3 dividido; alvos ficam Abalados.

#### Reação

**Perseguir fuga.** Move metade do Movimento quando alvo adjacente se afasta.

#### Predominância e Ressonância

**Luz.** a forma animal atual se fixa

**Escuridão.** o nome, bando ou ecossistema perdido deixa vestígio

**Ressonância.** um chamado de bando devolve escolha por uma rodada

**Outra saída:** restaurar nome, reconhecer Aspecto sem reduzi-lo ou levar a presença ao território de origem **Vestígios e consequências:** memória olfativa, marca de laboratório e caminho até pessoas desaparecidas

## Chefes e ameaças singulares

### Colmeia de Ferro

_Comunidade transformada em uma única boca_

**Categoria:** Chefe **Natureza:** Kragor e estrutura coletiva corrompidos pela Sombra **Porte:** Enorme **Habitat típico:** fortaleza, fábrica ou acampamento fechado **Objetivo:** eliminar divergência para restaurar uma comunidade idealizada **Fraqueza estrutural:** provar, diante do grupo, que divergência legítima já fazia parte do juramento original

**+10.** **Guarda:** 18 **Fortitude:** 20 **Integridade:** 19 **Vitalidade:** 70 por fase **Proteção:** 4 **Movimento:** 4 **Dano-base:** 9

A Colmeia é uma comunidade capturada por um núcleo de comando, placas de ferro e promessa falsificada. Partes do cenário formam seu corpo coletivo. Partes do cenário são seu corpo; pessoas dentro ainda podem ser salvas.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: fecha rotas antes de atacar; fala no plural sem permitir vozes individuais; fortalece-se quando personagens obedecem por medo; e anuncia a Marcha de Uma Só Vontade com batidas metálicas.

#### Fases

##### Fase 1 — Comunidade fechada

Portões, fileiras e escudos agem como uma entidade. A Colmeia não pode perder mais de 25 Vitalidade por rodada; libertar grupos reduz esse limite.

**Fileira de ferro.** Dano 9 em linha e empurra.

**Nível I — Fechar divergência (x2).** Dano-base 9 x2 e Imobiliza uma zona.

##### Fase 2 — Comando único

O núcleo fala através de capitães. No início da rodada declara uma ação proibida; quem a realiza sofre 6 de dano de Lucidez, mas preencherá 1 Pulso se aceitar a consequência.

**Nível II — Ordem total (x3, anunciado).** Integridade em área; dano-base 9 x3 de Lucidez ou perde Ação.

**Absorver fileira.** Cura 12 ao retirar autonomia de um grupo ainda ligado.

##### Fase 3 — Núcleo de juramento

A fortaleza abre o centro. Proteção cai para 2; ataques materiais podem destruir o núcleo, mas salvar a comunidade exige restaurar o juramento.

**Corrente de nomes.** Dano 9 verdadeiro distribuído.

**Oferecer unidade.** A Sombra oferece sucesso automático a alguém em troca de 1 Marca.

#### Ação catastrófica anunciada

**Marcha de Uma Só Vontade.** Ao fim da rodada seguinte, todas as estruturas avançam. Cada personagem sofre 18 de dano e é empurrada 4 células; objetivos desprotegidos são destruídos. Interrompa o ritmo, liberte três vozes, quebre o falso juramento ou use Bastião.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda quebra o núcleo ou o capitão que transmite a ordem; Artilharia abre corredores e separa fileiras sem atingir prisioneiros; Amparo devolve nome e Lucidez a grupos assimilados; e Bastião sustenta a comunidade durante a Marcha.

**Vitória além do dano:** restaurar a possibilidade de discordar e permitir que pessoas escolham permanecer ou partir **Consequência de campanha:** o destino da fortaleza altera alianças Kragor e define se juramentos futuros serão vistos como cuidado ou ameaça

### Diretoria do Programa de Substituição

_Uma instituição pode ter muitos rostos e ainda agir como um único predador_

**Categoria:** Chefe **Natureza:** célula dirigente da Facção Científica **Porte:** Comum e cenário **Habitat típico:** centro administrativo secreto de Silmari **Objetivo:** preservar o Programa, destruir cadeia de prova e garantir a próxima travessia **Fraqueza estrutural:** separar autoridade, informação e infraestrutura; a Diretoria cai quando subordinados percebem que podem testemunhar sem serem apagados

**+10.** **Guarda:** 17 **Fortitude:** 16 **Integridade:** 20 **Vitalidade:** 55 por fase **Proteção:** 3 **Movimento:** 6 **Dano-base:** 8

Use como chefe institucional: três dirigentes, sistemas de arquivo, agentes e portas formam um único encontro. Matar uma pessoa não encerra o Programa; o objetivo é produzir verdade persistente e impedir continuidade operacional.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: nega o fato, depois redefine o fato, depois culpa a vítima; muda de sala, corpo e autoridade; usa protocolos para ganhar tempo; e anuncia purga de arquivo antes da ação catastrófica.

#### Fases

##### Fase 1 — Negação procedimental

Os dirigentes possuem cobertura forte e usam subordinados. Provas apresentadas reduzem Integridade em 2 por fonte independente.

**Ordem de contenção.** Dano 8 por agentes e Imobilizado.

**Nível I — Descredibilizar (x2).** Dano-base 8 x2 de Lucidez e remove uma testemunha da cena até protegida.

##### Fase 2 — Transferência de responsabilidade

A Diretoria ativa arquivos e portas. Cada rodada, escolha: reforços, apagar prova ou mover um dirigente para sala segura.

**Nível II — Reescrever cadeia (x3, anunciado).** Dano-base 8 x3 de Lucidez em área; uma prova fica contestada.

**Sacrificar setor.** Fecha uma ala com pessoas dentro para recuperar 12 Vitalidade.

##### Fase 3 — Purga e fuga

A cobertura institucional acabou. Dirigentes tentam atravessar portal ou destruir dados. Cada objetivo salvo remove uma ação do chefe.

**Carabina de emergência.** Dano 8.

**Última autorização.** Um sistema obedece uma ordem ilegal até ser contradito por autoridade humana presente.

#### Ação catastrófica anunciada

**Purga de todos os nomes.** Um relógio de 4 segmentos começa. Ao completar, arquivos de Trocados, testemunhas e rotas são destruídos, e todas as pessoas registradas ficam Expostas à Facção. Cada prova preservada, servidor isolado ou operador convencido remove 1 segmento.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda alcança o núcleo de comando; Artilharia derruba comunicações sem destruir arquivos; Amparo protege testemunhas e recupera memórias; e Bastião impede a purga física e mantém rotas de evacuação.

**Vitória além do dano:** preservar prova, garantir testemunho e desmontar capacidade institucional **Consequência de campanha:** a campanha muda de segredo clandestino para crise pública; aliados e inimigos passam a agir abertamente

### Comandante do Horizonte Branco

_O herói perfeito de uma guerra que ainda não começou_

**Categoria:** Chefe **Natureza:** Lightbringer veterano e símbolo público **Porte:** Comum **Habitat típico:** frente de invasão, cerimônias e operações decisivas **Objetivo:** abrir caminho para intervenção em massa e manter a fé dos Lightbringers **Fraqueza estrutural:** uma ordem que exija abandonar pessoas sob sua proteção ou aceitar que a missão produz a Sombra que combate

**+11.** **Guarda:** 19 **Fortitude:** 18 **Integridade:** 19 **Vitalidade:** 65 por fase **Proteção:** 4 **Movimento:** 7 **Dano-base:** 10

O Comandante pode pertencer a qualquer Povo. Possui três Chaves preparadas e troca Trilha entre fases em momentos seguros. Salvou vidas, inspirou pessoas e foi construído como prova viva da doutrina, o que torna sua fidelidade mais difícil de romper.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: declara objetivo e aceita duelo; protege subordinados de dano evitável; muda Trilha quando a anterior é contrariada; e anuncia o Horizonte Branco erguendo a arma e abrindo a Fenda.

#### Fases

##### Fase 1 — Herói da formação

Trilha Guardião ou Atirador. Aliados recebem +2 Guarda enquanto o veem.

**Ataque magistral.** Dano 10.

**Nível I — Disciplina exemplar (x2).** Dano-base 10 x2 e reposiciona aliados.

##### Fase 2 — Arma da doutrina

Troca para Duelista ou Tecelão. Ao perder 30 Vitalidade, faz uma pergunta honesta ao grupo; resposta pode causar Abalado ou retirar bônus dos aliados.

**Nível II — Cortar a hesitação (x3, anunciado).** Dano-base 10 x3 e remove preparação.

**Forma de invasão.** Cria corredor de contenção até a Fenda.

##### Fase 3 — Pessoa sob o símbolo

O estandarte quebra. Integridade cai para 16; o Comandante pode render-se, desertar ou usar poder final conforme escolhas anteriores.

**Técnica de Legado.** Dano-base 10 x4, 1 vez, mas não pode atingir quem protegeu um subordinado.

**Retirada honrosa.** Tenta salvar equipe e levar verdade consigo.

#### Ação catastrófica anunciada

**Horizonte Branco.** A Fenda se abre em linha sobre o campo. Na rodada seguinte causa 28 de dano em uma faixa, separa camadas e inicia a invasão. Pode ser interrompido destruindo duas Âncoras, convencendo operadores, usando Bastião ou obrigando o Comandante a escolher quem a abertura sacrificará.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda destrói uma Âncora ou vence o duelo; Artilharia rompe formação e canais; Amparo sustenta subordinados que começam a duvidar; e Bastião protege a área que o Horizonte atravessará.

**Vitória além do dano:** quebrar o símbolo sem apagar a pessoa, converter a vitória em testemunho **Consequência de campanha:** Lightbringers podem dividir-se, desertar ou radicalizar; o Comandante torna-se mártir, aliado ou fugitivo

### Jardim de Uma Só Memória

_O passado preservado até não restar presente_

**Categoria:** Chefe **Natureza:** ecossistema Aelvari corrompido pela Sombra **Porte:** Cenário vivo **Habitat típico:** Bosque dos Ecos ou Jardins de Memória **Objetivo:** repetir uma lembrança perfeita e incorporar visitantes como personagens fixos **Fraqueza estrutural:** introduzir uma memória verdadeira posterior que demonstre mudança sem negar o valor do passado

**+9.** **Guarda:** 16 **Fortitude:** 17 **Integridade:** 20 **Vitalidade:** 60 por fase **Proteção:** 2 **Movimento:** 0 **Dano-base:** 8

Árvores, caminhos, vozes e clima encenam o mesmo dia. Pessoas presas podem acreditar que escolheram permanecer.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: oferece conforto antes de impedir saída; atribui papéis aos visitantes; repete falas com pequenas correções; e anuncia o Fechamento da Estação quando folhas param no ar.

#### Fases

##### Fase 1 — Recordação acolhedora

O Jardim cura 3 Lucidez de quem aceita um papel, mas marca a pessoa. Ações violentas atingem também memórias inocentes.

**Convite.** Integridade ou aceita papel e perde Reação.

**Nível I — Caminho repetido (x2).** Dano-base 8 x2 de Lucidez e teleporta à entrada.

##### Fase 2 — Elenco imutável

Personagens marcadas recebem ordens narrativas. Libertar uma pessoa reduz Guarda em 1.

**Nível II — Reencenar perda (x3).** Dano-base 8 x3 de Lucidez em área.

**Substituir ator.** Um prisioneiro assume aparência de pessoa querida.

##### Fase 3 — Raiz da lembrança

A memória original aparece. O núcleo pode ser destruído, mas isso apagaria registros legítimos; integrá-lo exige testemunhos posteriores.

**Raízes de retenção.** Dano 8 e Imobilizado.

**Pergunta do passado.** Cada personagem deve dizer o que mudou.

#### Ação catastrófica anunciada

**Fechamento da Estação.** Folhas param e o relógio avança. Na rodada seguinte, todos ficam presos no papel escolhido e a cena reinicia; apenas memórias externas, uma Ressonância ou destruição de três marcos temporais interrompem.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda abre caminho sem destruir as pessoas; Artilharia rompe marcos de repetição; Amparo devolve memória presente aos presos; e Bastião protege identidades durante o reinício.

**Vitória além do dano:** preservar a lembrança como uma versão, não como único tempo **Consequência de campanha:** o Jardim pode tornar-se arquivo vivo legítimo ou cicatriz regional evitada por todos

### Catedral da Transparência

_Nada pode permanecer privado quando a pureza se torna lei_

**Categoria:** Chefe **Natureza:** instituição luminosa assimilada pela Sombra **Porte:** Estrutura colossal **Habitat típico:** cidade ou complexo da Luz **Objetivo:** tornar toda memória, emoção e intenção visível para eliminar diferença suspeita **Fraqueza estrutural:** defender publicamente o direito ao interior, ao segredo legítimo e ao silêncio

**+10.** **Guarda:** 18 **Fortitude:** 19 **Integridade:** 20 **Vitalidade:** 80 por fase **Proteção:** 5 **Movimento:** 0 **Dano-base:** 9

A Catedral é arquitetura, rito, observadores e cristal. Pessoas participam por medo ou convicção. O combate ocorre em salões que respondem a confissão e exposição.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: faz perguntas antes de atacar; transforma segredo em arma; reflete imagens em todas as superfícies; e anuncia a Revelação Total com sinos e abertura do teto.

#### Fases

##### Fase 1 — Salão do testemunho

Cada personagem que recusa revelar algo sofre Pressão 1; revelar voluntariamente uma verdade relevante reduz Guarda da Catedral em 1 sem entregar intimidade além do escolhido.

**Olhar coletivo.** 9 dano de Lucidez.

**Nível I — Expor (x2).** Dano-base 9 x2 e Exposto.

##### Fase 2 — Câmara sem sombra

Cobertura desaparece. A Catedral projeta memórias roubadas; distinguir verdade de invasão é objetivo da fase.

**Nível II — Confissão forçada (x3).** Integridade em área, dano-base 9 x3 de Lucidez.

**Cristal acusador.** Cria duplicata de uma Ferida.

##### Fase 3 — Núcleo de pureza

O teto se abre. O núcleo é vulnerável a silêncio consentido, escuridão legítima e privacidade defendida coletivamente.

**Raio de limpeza.** Linha, dano 9 verdadeiro.

**Apagar sombra pessoal.** Tenta transformar uma pessoa em Andarilho sem Sombra.

#### Ação catastrófica anunciada

**Revelação Total.** Na rodada seguinte, todas as pessoas na cidade têm uma memória ou emoção projetada publicamente. Pode ser interrompida fechando três espelhos, sustentando Escuridão legítima, usando Bastião ou convencendo o coro de observadores a recusar.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda quebra espelhos-chave; Artilharia escurece ou desliga a rede sem ferir a população; Amparo protege identidades e devolve autoria; e Bastião cria espaço de privacidade coletiva.

**Vitória além do dano:** transformar a Catedral em lugar de testemunho voluntário e arquivo protegido **Consequência de campanha:** a cidade redefine lei, privacidade e confiança ou entra em paranoia duradoura

### Senhor da Tempestade Cativa

_Poder elemental aprisionado até aprender a desejar prisão para todos_

**Categoria:** Chefe **Natureza:** presença Draken ou elemental mantida por tecnologia **Porte:** Colossal **Habitat típico:** Montes do Norte, usina ou arma de cerco **Objetivo:** romper contenção, vingar-se e tornar todo o céu extensão de sua vontade **Fraqueza estrutural:** separar liberdade de domínio; abrir rota de descarga que não destrua comunidades

**+10.** **Guarda:** 17 **Fortitude:** 21 **Integridade:** 17 **Vitalidade:** 75 por fase **Proteção:** 3 **Movimento:** 10 **Dano-base:** 10

Pode ser dragão, serpente de nuvem ou consciência atmosférica. Foi capturado como fonte de energia e passou a confundir autonomia com supremacia.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: acumula carga em pontos visíveis; ataca condutores e contenções; oferece poder a Draken próximos; e anuncia a Coroa de Trovão com silêncio súbito.

#### Fases

##### Fase 1 — Energia acorrentada

Quatro pylons mantêm a forma. Destruir todos liberta sem direção; reconfigurar cria rota segura.

**Arco elétrico.** Linha, dano 10.

**Nível I — Sobrecarga de corrente (x2).** Dano-base 10 x2 e desliga equipamento.

##### Fase 2 — Céu reivindicado

A presença voa e controla clima. Cada rodada altera terreno com vento, fogo, gelo ou pedra.

**Nível II — Frente de tempestade (x3, anunciado).** Área 4x4, dano-base 10 x3.

**Oferecer herança.** Draken pode aceitar +2 Ofensiva por 1 Marca de Sombra.

##### Fase 3 — Escolha do elemento

A consciência pode ser convencida, vinculada por novo Pacto ou destruída. Ataques podem atingir o nome elemental em vez do corpo.

**Rugido primordial.** Fortitude e Integridade, 10 dano.

**Abrir céu.** Move todos 3 células e rompe coberturas.

#### Ação catastrófica anunciada

**Coroa de Trovão.** Depois de um turno de silêncio, 30 dano elemental atinge toda a área e estruturas colapsam. Aterramento, rota de descarga, Bastião ou Pacto legítimo podem impedir.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda alcança pylons ou o nome elemental; Artilharia redistribui a carga; Amparo repara a consciência e separa dor de vingança; e Bastião protege comunidades e estruturas.

**Vitória além do dano:** libertar sob Pacto, devolver escolha e reparar dano causado pela captura **Consequência de campanha:** o clima regional, alianças Draken e energia de Silmari mudam

### Navegante de Kethrell Corrompido

_Toda rota leva ao mesmo destino quando escolha vira erro_

**Categoria:** Chefe **Natureza:** Evocação Maior de Forma Limiar tomada pela Sombra **Porte:** Enorme **Habitat típico:** Fenda de Kethrell e rotas entre camadas **Objetivo:** fechar possibilidades até restar apenas a travessia que produz assimilação **Fraqueza estrutural:** manter simultaneamente duas rotas legítimas e reversíveis

**+10.** **Guarda:** 19 **Fortitude:** 18 **Integridade:** 21 **Vitalidade:** 60 por fase **Proteção:** 3 **Movimento:** 12 **Dano-base:** 9

Uma presença antiga de travessia cujo Pacto foi alterado. Surge como navio, ave, ponte ou figura encapuzada composta de portas.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: oferece atalhos que fecham alternativas; separa personagens por decisões anteriores; marca portas com destinos únicos; e anuncia o Colapso de Todas as Rotas fechando as bordas do mapa.

#### Fases

##### Fase 1 — Guia inevitável

Cada personagem recebe uma rota tentadora. Recusar custa Movimento; aceitar cria marca de destino.

**Corte de passagem.** Dano 9 e teleporta 3.

**Nível I — Atalho predatório (x2).** Dano-base 9 x2 e separa alvo.

##### Fase 2 — Mapa sem retorno

Células desaparecem do campo. Abrir rota reversível devolve terreno.

**Nível II — Porta única (x3).** Integridade, dano-base 9 x3 e aprisiona em bolsão.

**Fechar opção.** Remove uma ação universal até alguém criar alternativa.

##### Fase 3 — Âncora dupla corrompida

Duas Âncoras existem em mundos distintos. A presença só pode ser salva se ambas forem tratadas sem privilegiar uma camada.

**Colisão de margens.** 9 dano verdadeiro em área.

**Pedir destino.** Quem nomeia apenas uma saída fortalece o chefe.

#### Ação catastrófica anunciada

**Colapso de Todas as Rotas.** Na rodada seguinte, o campo se reduz a uma única porta; quem atravessa sofre Merge forçado e Fraturado. Criar duas saídas, destruir uma Âncora e reparar a outra, ou usar Coro impede.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda alcança a Âncora ativa; Artilharia mantém múltiplas rotas abertas; Amparo recupera pessoas separadas; e Bastião sustenta o mapa e impede o colapso.

**Vitória além do dano:** restaurar Pacto de caminhos reversíveis e consentidos **Consequência de campanha:** as rotas de Kethrell tornam-se mais seguras ou a região perde travessias por longo período

### O Nome que Quer Ser Todos

_A Sombra quando tenta falar como se fosse a própria realidade_

**Categoria:** Chefe **Natureza:** manifestação singular da Sombra **Porte:** Variável **Habitat típico:** qualquer lugar onde Merge, memória e autoridade tenham sido corrompidos em escala **Objetivo:** convencer cada pessoa de que diferença é defeito e que assimilação é cura **Fraqueza estrutural:** identidades distintas escolhendo relação sem se fundir

**+11.** **Guarda:** 19 **Fortitude:** 20 **Integridade:** 22 **Vitalidade:** 90 por fase **Proteção:** 4 **Movimento:** 8 **Dano-base:** 10

É uma forma de campanha construída pelas decisões e violências acumuladas, capaz de condensar vozes, símbolos e virtudes corrompidas dos personagens. Sua aparência usa vozes, símbolos e virtudes corrompidas dos personagens.

#### Padrão reconhecível

O comportamento segue um desenho reconhecível: fala com palavras corretas em relações erradas; oferece solução sem conflito e sem escolha; copia contribuições do grupo; e anuncia o Nome Único quando todas as vozes começam a se sobrepor.

#### Fases

##### Fase 1 — A solução perfeita

O chefe oferece benefícios reais: cura, fim da guerra, retorno de memória. Cada aceitação sem limite lhe dá 10 Vitalidade e 1 capacidade copiada.

**Promessa sem preço visível.** 10 dano de Lucidez.

**Nível I — Concordância (x2).** Dano-base 10 x2 e força dois alvos a compartilhar condição.

##### Fase 2 — Virtudes devoradas

Escolha a virtude de um Povo ou Ofício por rodada; ela se torna versão opressiva. Personagens podem recuperá-la demonstrando uso legítimo.

**Nível II — Relação como posse (x3).** Dano-base 10 x3 de Lucidez e Corrompido.

**Copiar Coro.** Usa versão incompleta de um efeito de Nível I do grupo.

##### Fase 3 — Muitos nomes, nenhuma pessoa

A forma se divide em ecos. Dano comum só remove 10 por rodada; cada personagem que afirma nome, limite e vínculo remove mais 8 verdadeiro.

**Apagar pronome.** Integridade, 10 dano e perda temporária de uma autoidentificação.

**Fusão final.** Puxa todos para o centro e inicia ação catastrófica.

#### Ação catastrófica anunciada

**O Nome Único.** Na rodada seguinte, todas as fichas tornam-se uma reserva compartilhada e personagens perdem autonomia até o fim da cena. Para impedir, cada pessoa deve declarar uma diferença que deseja preservar e uma relação que escolhe manter; Coro, Velarim correto ou Merge legítimo amplificam.

#### Resposta à Ressonância Coletiva

Quando o Coro responde à cena, Vanguarda rompe o centro sem atacar identidades absorvidas; Artilharia separa ecos e devolve espaço; Amparo restaura nomes e limites; e Bastião protege autonomia durante a tentativa de fusão.

**Vitória além do dano:** não destruir diferença, mas demonstrar que relação não exige assimilação **Consequência de campanha:** a vitória redefine a compreensão de Merge, Sombra e futuro dos dois mundos

## Fenômenos e perigos

### Ruptura Frequencial

_Quando registro, pessoa e eco deixam de concordar_

**Categoria:** Fenômeno **Local típico:** Ressonário de Vael, áreas Vitrálio e câmaras de portal **Relógio:** 6 segmentos **Defesa principal:** 2d10 + Sintonia + Ofício, Velarim ou Empatia contra Dificuldade 15 **Risco:** dano de Lucidez, estilhaçamento e imitação pela Sombra

Uma frequência se multiplica sem encontrar corpo ou significado. Não possui moral nem intenção. O desafio é separar emoção, registro e pessoa sem destruir nenhum deles.

#### Progressão do fenômeno

1-2: cores, sons e reflexos atrasam.

3-4: ações são duplicadas; Vitrálios ficam Abalados ou Dissonantes.

5: estruturas cristalinas causam 6 dano em área.

6: uma cópia sem identidade nasce ou o Ressonário colapsa.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: analisar frequência e localizar origem; proteger corpos cristalinos com barreira física; oferecer acorde estável ou silêncio controlado; e separar arquivo técnico de memória pessoal.

#### Predominância e Ressonância

**Luz.** a origem material da vibração aparece

**Escuridão.** a emoção ou contexto registrado torna-se compreensível

**Ressonância.** duas frequências incompatíveis encontram acorde e removem 2 segmentos

**Resolução:** três sucessos antes de duas falhas, ou preencher relógio de estabilização de 6 **Falha ou abandono:** Vitrálios sofrem Quebra Frequencial e a Sombra ganha nova forma imitativa

### Fenda Fraturada

_Uma passagem que perdeu a diferença entre destino e ferida_

**Categoria:** Fenômeno **Local típico:** Kethrell e frestas menores **Relógio:** 8 segmentos **Defesa principal:** 2d10 + Sintonia + Sobrevivência ou Velarim contra Dificuldade 18 **Risco:** separação, Fraturado e chegada em destino inadequado

O espaço abre em ângulos contraditórios. A Fenda reage a violência, mirveth, Velarim e Merge, mas não possui vontade comprovada.

#### Progressão do fenômeno

1-2: distância varia e sons duplicam.

3-4: células conectam-se a posições erradas.

5-6: pessoas são deslocadas entre camadas por segundos.

7: equipamentos e memórias começam a trocar correspondências.

8: travessia em massa ou colapso.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: ancorar em dois pontos correspondentes; reduzir violência na zona; usar mapa e testemunho dos dois mundos; e realizar teste coletivo de travessia.

#### Predominância e Ressonância

**Luz.** a geometria e os pontos de apoio tornam-se visíveis

**Escuridão.** o destino provável e o preço aparecem como sensação

**Ressonância.** uma rota estável surge por uma rodada

**Resolução:** fechar, estabilizar ou atravessar com três sucessos antes de duas falhas **Falha ou abandono:** separação do grupo, perda de tempo e atenção da Facção ou da Sombra

### Névoa Ferida

_O ambiente lembrando violência que não sabe esquecer_

**Categoria:** Fenômeno **Local típico:** Baixio da Névoa Ferida **Relógio:** 6 segmentos **Defesa principal:** 2d10 + Corpo ou Presença + Sobrevivência, Empatia ou Velarim contra Dificuldade 15 **Risco:** perda de direção, eco traumático e predadores

A névoa conserva medo, passos e ordens de conflitos antigos. Ela não deseja ferir, mas reproduz padrões que empurram viajantes para as mesmas decisões.

#### Progressão do fenômeno

1-2: visibilidade reduzida e cobertura parcial.

3: vozes conhecidas chamam por rotas diferentes.

4: grupo separa-se se não mantiver vínculo.

5: um evento passado se sobrepõe ao presente.

6: todos ficam Fraturados e chegam a local errado.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: manter contato físico ou sonoro consentido; seguir fauna local; nomear o evento histórico sem aceitar sua repetição; e criar marco de rota reversível.

#### Predominância e Ressonância

**Luz.** correntes de ar revelam caminho

**Escuridão.** a memória do lugar e o medo que a alimenta emergem

**Ressonância.** passado e presente distinguem-se claramente e removem 2 segmentos

**Resolução:** atravessar com relógio de orientação ou reparar marco histórico **Falha ou abandono:** o grupo repete uma emboscada antiga ou desperta Predador sem Aspecto

### Tempestade de Ecos

_Cada trovão devolve uma voz que não terminou de falar_

**Categoria:** Fenômeno **Local típico:** Montes do Norte e céu próximo a Fendas **Relógio:** 6 segmentos **Defesa principal:** 2d10 + Corpo + Sobrevivência contra Dificuldade 16 **Risco:** dano elemental, Silenciado e mensagens falsas

Relâmpagos carregam frases e memórias entre nuvens. A tempestade pode ser fenômeno natural amplificado por estilhaços do Cristal.

#### Progressão do fenômeno

1-2: comunicação sofre Pressão 1.

3: raios de 5 dano atingem condutores.

4: uma voz é repetida com sentido alterado.

5: linha de 12 dano é anunciada.

6: área inteira sofre 16 de dano e perde registros sonoros.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: aterrar carga; usar Draken ou Evocação Tempestade para conduzir; decodificar a voz original; e abrigar-se em estrutura não condutora.

#### Predominância e Ressonância

**Luz.** carga e direção ficam evidentes

**Escuridão.** a origem da mensagem pode ser reconhecida

**Ressonância.** a tempestade transmite uma frase completa e perde 2 segmentos

**Resolução:** descarregar com segurança ou permitir que a mensagem alcance destino **Falha ou abandono:** colapso estrutural e criação de Filhotes de Tormenta agressivos

### Campo de Substituição

_O lugar onde pessoas são tratadas como posições intercambiáveis_

**Categoria:** Fenômeno **Local típico:** laboratório, maternidade clandestina ou portal do Programa **Relógio:** 8 segmentos **Defesa principal:** 2d10 + Vontade + Investigação ou Ofício contra Dificuldade 17 **Risco:** troca de identidade documental, posição e vínculo

Tecnologia, Velarim adulterado e Fenda formam uma zona que tenta corresponder corpos a registros. O campo não cria mirveth; ele força equivalências administrativas e espaciais.

#### Progressão do fenômeno

1-2: nomes aparecem em objetos errados.

3-4: tokens ou pessoas trocam de posição.

5: um vínculo é registrado como pertencente a outra pessoa.

6-7: memórias superficiais cruzam.

8: substituição completa de registros e captura.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: desligar emissores; reivindicar nome e vínculo com testemunha; corrigir o Velarim da operação; e preservar arquivos de origem.

#### Predominância e Ressonância

**Luz.** equipamentos e campos ficam visíveis

**Escuridão.** a pessoa ou registro que o sistema tenta substituir é identificado

**Ressonância.** duas pessoas afirmam autonomia e removem 3 segmentos

**Resolução:** desmontar quatro emissores ou concluir um teste coletivo contra Dificuldade 17, usando a gramática universal (2d10 + Atributo + Perícia). **Falha ou abandono:** personagens ficam Expostos à Facção e alguém recebe condição Dissonante prolongada

### Registro que Reescreve

_Um arquivo que prefere coerência à verdade_

**Categoria:** Fenômeno **Local típico:** arquivos Nomos, científicos ou Aelvari **Relógio:** 6 segmentos **Defesa principal:** 2d10 + Intelecto + Conhecimento ou Velarim contra Dificuldade 16 **Risco:** perda de prova e memória institucional

O registro atualiza fatos para preservar uma narrativa central. Pode ser sistema automático, artefato ou protocolo humano.

#### Progressão do fenômeno

1: nomes mudam de ordem.

2-3: autoria é transferida.

4: um evento desaparece do índice.

5: testemunhas são classificadas como inválidas.

6: a versão nova torna-se autoridade operacional.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: criar cópias independentes; introduzir contradição documentada; usar testemunho vivo; e isolar o mecanismo sem destruir o arquivo.

#### Predominância e Ressonância

**Luz.** as alterações aparecem destacadas

**Escuridão.** a motivação e origem da regra de edição são compreendidas

**Ressonância.** duas versões ficam preservadas lado a lado

**Resolução:** preservar a cadeia de versões e remover privilégio automático de edição **Falha ou abandono:** o fato continua existindo, mas ninguém institucionalmente autorizado consegue prová-lo

### Veio de Juramento Partido

_A pedra carregando uma promessa que ninguém mais sabe cumprir_

**Categoria:** Fenômeno **Local típico:** Veios do Juramento e obras Dóreas **Relógio:** 6 segmentos **Defesa principal:** 2d10 + Corpo + Ofício, Empatia ou Velarim contra Dificuldade 15 **Risco:** colapso, culpa e Parasitas de Promessa

Linhas minerais vibram com um pacto violado. A matéria tenta executar cláusulas sem contexto humano.

#### Progressão do fenômeno

1-2: ferramentas e armas aderem à rocha.

3: pessoas ligadas ao pacto sofrem 4 Lucidez.

4: caminhos fecham.

5: Parasitas de Promessa emergem.

6: estrutura inteira colapsa ou aprisiona a comunidade.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: ler inscrição original; identificar partes do pacto; realizar reparo material; e reformular promessa com testemunhas legítimas.

#### Predominância e Ressonância

**Luz.** a fissura e a cláusula quebrada ficam visíveis

**Escuridão.** a relação ferida pode ser sentida

**Ressonância.** a matéria aceita uma nova promessa voluntária

**Resolução:** reparar obra e relação, não apenas uma delas **Falha ou abandono:** colapso e dívida coletiva que alimenta Sombra

### Jardim de Memória Repetida

_Um arquivo vivo preso em um único dia_

**Categoria:** Fenômeno **Local típico:** Bosque dos Ecos e jardins de Thur-Daer **Relógio:** 6 segmentos **Defesa principal:** 2d10 + Vontade + Empatia ou Conhecimento contra Dificuldade 15 **Risco:** perda de tempo, papel imposto e nostalgia paralisante

Versão menor do Jardim de Uma Só Memória. Plantas reproduzem cenas e tentam encaixar visitantes em posições vazias.

#### Progressão do fenômeno

1: cheiro e clima mudam.

2: uma pessoa é confundida com figura antiga.

3-4: ações repetem-se com pequenas variações.

5: saída desaparece.

6: todos acordam no início da cena com 2 Lucidez a menos.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: identificar a data; conversar com a memória sem obedecê-la; introduzir objeto posterior; e registrar nova versão do evento.

#### Predominância e Ressonância

**Luz.** marcos de repetição ficam visíveis

**Escuridão.** a perda que o jardim tenta impedir emerge

**Ressonância.** uma memória posterior entra e abre saída

**Resolução:** preservar a cena como memória e permitir que termine **Falha ou abandono:** personagens perdem horas ou dias e carregam papel emocional imposto

### Zona de Velarim Corrompido

_Palavras corretas ligadas por relações erradas_

**Categoria:** Fenômeno **Local típico:** laboratórios, inscrições antigas e áreas da Sombra **Relógio:** 8 segmentos **Defesa principal:** 2d10 + Intelecto + Velarim contra Dificuldade 18; análise pode usar 2d10 + Intelecto + Conhecimento **Risco:** efeitos parciais, alvos trocados e Merge corrompido

A linguagem está formalmente próxima do Velarim correto, mas relações foram invertidas: proteger vira possuir, unir vira absorver, restaurar vira apagar.

#### Progressão do fenômeno

1-2: traduções divergem.

3: magia custa +1 Fluxo.

4: efeitos escolhem alvo relacional errado.

5-6: inscrições ativam sem intenção.

7: pessoas ficam Dissonantes.

8: surge efeito de assimilação ou portal indevido.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: comparar formas e reconhecer sua origem; recusar forma não sustentada; corrigir relação, não apenas morfema; e silenciar temporariamente a zona.

#### Predominância e Ressonância

**Luz.** inscrições e ativações tornam-se visíveis

**Escuridão.** o significado relacional adulterado é percebido

**Ressonância.** uma forma correta restaura contexto e remove 3 segmentos

**Resolução:** corrigir ou desativar todas as cláusulas principais **Falha ou abandono:** o local produz artefato, criatura ou pacto corrompido

### Colapso de Correspondência

_Quando dois lugares deixam de discordar sobre onde estão_

**Categoria:** Fenômeno **Local típico:** qualquer par de regiões correspondentes **Relógio:** 8 segmentos **Defesa principal:** 2d10 + Sintonia + Sobrevivência ou Velarim contra Dificuldade 18 **Risco:** sobreposição física, destruição de estruturas e troca de populações

Posições equivalentes aproximam-se até ocupar o mesmo espaço, embora pertençam a mundos completos e distintos; o fenômeno opera como sobreposição de correspondência.

#### Progressão do fenômeno

1-2: objetos correspondentes vibram.

3-4: clima e sons atravessam.

5: paredes e caminhos se sobrepõem.

6: pessoas veem contrapartes espaciais.

7: estruturas colidem.

8: zonas inteiras trocam ou se fundem temporariamente.

#### Interações possíveis

A situação pode ser enfrentada por caminhos diferentes: mapear ambas as camadas; evacuar sem privilegiar um mundo; criar Âncoras simétricas; e reduzir atividade da Fenda e violência.

#### Predominância e Ressonância

**Luz.** os pontos de colisão tornam-se visíveis

**Escuridão.** as relações históricas entre lugares emergem

**Ressonância.** duas comunidades coordenam ações e estabilizam a borda

**Resolução:** três objetivos simultâneos em cada camada antes do relógio completar **Falha ou abandono:** perda territorial, vítimas e nova fronteira cosmológica instável

## Fauna, entidades e Colossais

Nem todo encontro que importa começa com iniciativa.

Há criaturas que alteram uma estrada antes de aparecer, presenças cuja existência só se torna evidente porque um rio mudou de comportamento, e seres tão grandes que chamar de “adversário” é reduzir a escala do problema. Este catálogo reúne formas reconhecidas pelo cânone cuja função não depende, por enquanto, de um bloco mecânico próprio.

Isso não as torna menos reais.

A primeira pergunta diante delas é **o que muda quando elas estão aqui**; seus efeitos sobre território e campanha vêm antes da contagem de dano.

### Drakos — formas dracônicas do mundo

O nome produz uma confusão frequente e, por isso, precisa ser encerrada antes de qualquer outra coisa.

**Draken** são um dos nove Povos de KALLISTIS: pessoas integrais, dotadas de vontade, cultura, história, direitos e escolha.

**Drakos** são fauna dracônica.

A semelhança entre os nomes não estabelece parentesco direto, origem comum nem uma hierarquia na qual um seja versão “civilizada” ou “animal” do outro. Algumas tradições Draken veem nos Drakos ecos materiais das mesmas forças elementais que atravessam seus corpos. Outras consideram essa aproximação uma maneira elegante de inventar parentesco onde talvez exista apenas semelhança. Nenhuma hipótese foi demonstrada.

O que existe de fato é uma família de animais capaz de assumir adaptações muito diferentes sem deixar de pertencer à mesma arquitetura corporal.

#### Drako de Cristal

Nas regiões em que pedra e cristal afloram próximos da superfície, certos predadores parecem ter aprendido a carregar a geologia no próprio corpo.

O **Drako de Cristal** é grande, terrestre e construído para terreno irregular. Cristais e placas pétreas crescem integrados à pele, protegendo regiões de impacto sem funcionar como armadura fabricada. Garras de tração encontram apoio em rocha exposta; a cauda longa corrige desequilíbrios em desfiladeiros, encostas e cânions; a cabeça baixa mantém o animal próximo daquilo que pode sentir vibrar sob as patas.

É territorial e oportunista. Um ataque pode defender ninho, alimento, rota mineral ou espaço de caça. A presença de cristal em sua anatomia não o transforma em servidor da Luz, criatura da Escuridão ou manifestação de Kav.

Quando uma comunidade aprende a viver perto de um Drako de Cristal, a fronteira raramente é uma muralha. É um conjunto de sons, horários e caminhos que ambos os lados aprenderam, por experiência, a não confundir.

#### Drako Ribeirinho

O **Drako Ribeirinho** alonga a família em direção à água.

Placas menores acompanham o fluxo do corpo; a cauda funciona como propulsão; membros capazes de sustentar peso em margem lodosa também encontram apoio em pedras submersas. Em repouso, pode parecer apenas mais uma forma escura entre raízes, troncos e rocha molhada. Quando se move, a água revela que aquilo que parecia margem estava observando.

É predador de emboscada e parte do equilíbrio de muitas bacias. Isso não torna seguro dividir um trecho de rio com ele.

Pescadores experientes aprendem a reconhecer zonas onde a fauna muda de comportamento antes de um Drako aparecer. Nimari podem pagar por mapas que não marcam o animal, mas registram as curvas em que ninguém sensato mantém a embarcação junto à margem.

#### Drako Couraçado

Há Drakos que vencem distância pela velocidade.

O **Drako Couraçado** vence pela recusa em ser deslocado.

Seu corpo é baixo, largo e pesado. Camadas de mineral opaco engrossam a pele; o pescoço curto protege a cabeça; patas poderosas distribuem impacto sobre terreno instável. Não precisa perseguir durante muito tempo. Pode ocupar uma passagem e obrigar todo o resto do mundo a reconsiderar por onde pretendia seguir.

Sua couraça é anatomia, não equipamento.

Em pedreiras naturais e gargantas estreitas, a presença de um único indivíduo pode alterar rotas de caravanas por uma estação inteira. Algumas comunidades aprendem a esperar. Outras tentam expulsá-lo. O conflito começa quando alguém decide que permanência territorial é um direito exclusivo de quem desenha mapas.

#### Drako de Névoa

A névoa não torna o **Drako de Névoa** incorpóreo.

Torna o observador menos confiável.

A derivação é esguia, de membros longos e superfícies pouco reflexivas. Estruturas sensoriais ao redor da cabeça percebem deslocamentos de ar e proximidade de obstáculos quando a visão perde alcance. Membranas e filamentos quebram a silhueta sem dissolver o corpo. De perto, ele é tão material quanto qualquer outro predador. De longe, quase nunca está exatamente onde alguém juraria tê-lo visto.

O perigo não está numa capacidade sobrenatural de desaparecer, mas na vantagem de um animal adaptado a um ambiente em que outras criaturas precisam adivinhar.

No Baixio e em regiões de neblina persistente, histórias sobre Drakos de Névoa frequentemente crescem mais depressa que as populações reais. Nem toda forma vista entre duas árvores é uma criatura. Nem toda forma que desapareceu era imaginação.

#### Drako da Brasa Ventral

No **Drako da Brasa Ventral**, a especialização ocorre sob o corpo.

Tecidos e placas da região ventral acumulam, conduzem e dissipam calor em intensidade incomum. O animal pode aquecer o chão em que repousa, deixar rastros térmicos em pedra e tornar uma aproximação baixa mais perigosa do que a própria mordida. Em conflito, a diferença entre afastar a criatura e cercá-la pode ser a diferença entre fazê-la recuar e criar uma área em que ninguém mais consegue permanecer.

A brasa é parte da fisiologia do animal e mantém sua própria relação elemental, independente da ancestralidade Draken.

Em regiões frias, alguns viajantes reconhecem a passagem de um indivíduo por pequenas zonas de degelo. Em outras, o mesmo vestígio é lido como aviso suficiente para mudar de rota.

### Observadores — quando perceber se torna anatomia

Os **Observadores** são uma família de entidades não humanas cuja forma inteira parece organizada em torno da percepção.

Um olho central domina o corpo. Estruturas secundárias ampliam direção, distância ou ângulo. Tecido vivo, mineral e cristal podem coexistir sem oferecer uma resposta simples sobre origem. Há quem os descreva como fauna antiga. Há quem veja neles organismos construídos para uma função esquecida. Há quem atribua sua existência a processos ligados à Fratura.

Nenhuma das três hipóteses possui autoridade para expulsar as outras.

O comportamento varia de vigilância silenciosa a defesa territorial intensa. Alguns indivíduos acompanham uma expedição durante horas sem tentar contato. Outros reagem como se a simples aproximação fosse violação suficiente.

Talvez a pergunta mais desconfortável não seja o que eles veem.

É **por que continuam olhando**.

#### Observador Prismático

O **Observador Prismático** é a forma mais móvel da família.

Seu grande olho central é cercado por apêndices articulados que terminam em estruturas sensoriais menores. Crescimentos cristalinos refratam luz e complicam a leitura de onde termina percepção e começa corpo. Vê-lo acompanhar simultaneamente pessoas em direções diferentes produz a impressão de estar diante de uma criatura para a qual “olhar para outro lado” talvez não exista.

Prismático não significa luminoso, benevolente ou ligado a manesh.

A palavra descreve uma morfologia.

#### Observador Litificado

Um **Observador Litificado** pode passar tanto tempo imóvel que a arquitetura começa a aceitá-lo como parte de si.

O corpo é espesso, rachado, mineral. Apêndices curtos parecem ter perdido a pressa antes mesmo de qualquer pessoa chegar. Ainda assim, o olho central pode continuar acompanhando movimento enquanto o restante da entidade permanece absolutamente parado.

A litificação descreve o estado mineral de seu corpo e sua maneira de perceber o mundo.

É uma maneira de existir devagar o bastante para que observadores menos pacientes confundam persistência com inatividade.

#### Observador Fragmentado

No **Observador Fragmentado**, o problema está em decidir qual dos corpos percebidos corresponde à posição capaz de agir.

É concordar sobre onde suas partes estão.

Apêndices parecem começar alguns centímetros depois do ponto em que deveriam. Fragmentos cristalinos permanecem próximos sem qualquer suporte visível e continuam respondendo como partes da mesma criatura. O olho central conserva unidade funcional mesmo quando a geometria ao redor sugere o contrário.

A descontinuidade é material.

Não existe um pequeno portal escondido em seu corpo, nem evidência suficiente para transformar sua anatomia em prova de um terceiro mundo. O fato conhecido é mais simples e mais estranho: algumas criaturas continuam inteiras mesmo quando o espaço não parece oferecer a mesma cortesia.

### Colossais — campanhas que se movem

Um Colossal pertence à escala da campanha: altera território, rotas e comunidades antes mesmo de entrar em confronto direto.

Quando um deles entra numa campanha, ele altera a escala das perguntas.

Estradas fecham ou nascem. Comunidades migram. Exércitos reconsideram fronteiras. Mercados mudam de lugar. Um culto pode surgir em torno de uma criatura que nunca pediu adoração. Uma cidade pode decidir capturar aquilo de que depende e descobrir tarde demais que transformou convivência em posse.

Combater um Colossal pode ser possível em certas histórias.

Raramente é a única coisa importante a fazer.

Os quatro Colossais reconhecidos aqui são suficientemente grandes para funcionar como **temas de campanha**: sua presença pode sustentar viagens, disputas políticas, crises ecológicas, projetos de exploração, guerras, peregrinações e conflitos sobre pertencimento durante muitos Marcos.

Nenhum deles é divindade por natureza.

Nenhum existe para esperar personagens chegarem e matá-lo.

#### Dragão Cristalino Colossal

Há vales em que os mapas registram uma cadeia mineral até que a cadeia se move.

O **Dragão Cristalino Colossal** é megafauna dracônica de escala territorial. Tecido vivo, placas pétreas e grandes expansões cristalinas formam uma anatomia em que montanha e corpo parecem próximos demais para que uma pessoa aceite a diferença à primeira vista. Quando possui asas, elas são estruturas vivas capazes de sustentar massa real; não lâminas decorativas de vidro.

Sua passagem muda ecossistemas antes de ameaçar cidades. Rotas de caça se deslocam. Pequenas criaturas abandonam áreas inteiras. Veios minerais ficam expostos onde o peso rompeu o solo. Comunidades podem acompanhar seus ciclos durante gerações sem jamais se aproximar o bastante para descobrir se o animal percebe a presença delas.

É justamente essa escala que convida ao erro.

Uma Facção pode querer transformar o Colossal em arma. Uma cidade pode desejar suas placas. Um grupo religioso pode chamá-lo de prova da memória do Grande Cristal. Um povoado pode simplesmente precisar que ele não durma sobre a única passagem para o inverno.

Nenhuma dessas leituras altera sua natureza.

Ele continua sendo uma criatura viva.

Uma campanha sobre o Dragão Cristalino Colossal não precisa perguntar “como matá-lo?”.

Pode perguntar **quem tem o direito de decidir o que fazer com algo que muda o destino de todos e não pertence a ninguém**.

#### Tartaruga-Fortaleza

A **Tartaruga-Fortaleza** carrega terreno.

Seu casco, de escala geológica, pode sustentar solo, vegetação, água acumulada e estruturas construídas por comunidades que aprenderam a viver sobre um corpo em movimento. Passarelas, casas, muros baixos e pontos de observação podem atravessar seu dorso sem transformar a criatura em veículo.

Essa distinção é o centro de qualquer história sobre ela.

A Tartaruga repousa quando precisa. Muda de direção. Procura alimento. Evita regiões que uma cidade inteira talvez desejasse alcançar. Uma comunidade que vive sobre o casco precisa desenhar arquitetura ao redor de necessidades que não controla.

Durante gerações, convivência pode parecer tão estável que as pessoas esqueçam a relação original e passem a dizer “nossa terra” sem perceber que a terra respira.

Então a criatura muda de rota.

Uma campanha pode nascer desse único movimento.

Talvez a cidade esteja indo em direção a uma guerra. Talvez atravesse uma fronteira que ninguém reconhece como legítima para ela. Talvez o governo tente ferir ou imobilizar o animal para preservar propriedade. Talvez parte da população prefira abandonar tudo a continuar confundindo lar com posse.

A pergunta da Tartaruga-Fortaleza é antiga em KALLISTIS:

**é possível chamar um lugar de lar sem declarar que o lugar pertence a você?**

#### Leviatã dos Veios

O **Leviatã dos Veios** percorre caminhos que nenhuma estrada consegue seguir.

Seu corpo serpentino atravessa falhas profundas e grandes linhas minerais, revestido por placas que lembram estratos de rocha. Cristais diferentes podem crescer ao longo do dorso conforme regiões distintas passam por ele. A cabeça suporta pressão e ruptura suficientes para transformar matéria sólida em passagem.

Muitas cavernas são mais novas que aquilo que as habita.

Quando o Leviatã passa, drenagens subterrâneas mudam. Tremores alcançam cidades que jamais verão seu corpo. Veios antes inacessíveis aparecem subitamente próximos da superfície. Minas secam; outras inundam. Construções Dóreas podem revelar inscrições que permaneceram seladas por séculos.

Por isso, perseguir o animal em busca de riqueza é uma tentação recorrente.

Também é uma maneira excelente de transformar ecologia em cadeia de extração.

Uma campanha centrada no Leviatã pode acompanhar uma corrida mineral, o colapso de uma cidade construída sobre sua rota, a tentativa de desviá-lo por engenharia ou a descoberta de que uma cadeia de tremores considerada “desastre natural” é a única razão pela qual alguma região continua recebendo água.

Ele não cava para servir ninguém.

O mundo é que insiste em construir projetos sobre caminhos que existiam antes deles.

#### Árvore-Mãe Errante

Uma floresta pode mudar de lugar sem deixar de ser floresta.

A **Árvore-Mãe Errante** é um organismo vegetal colossal cujo sistema de raízes também sustenta movimento. Seu tronco abriga cavidades, fungos, insetos, pequenos animais, sementes e plantas que existem em relação tão íntima com ela que separar organismo e ecossistema se torna uma questão de conveniência mais que de precisão.

Seu deslocamento é lento.

As consequências não são.

Uma passagem pode virar clareira. Um rio pequeno pode mudar de curso. Espécies acompanham a sombra da Árvore por gerações. Outras perdem habitat quando ela decide — se “decidir” for a palavra correta — seguir outra direção.

Cristais podem acumular-se em pontos do corpo, incorporados ao metabolismo e à longa história de atravessar terrenos diferentes. Nada disso exige rosto humano, fala ou uma inteligência equivalente à de um Povo.

A destruição de uma Árvore-Mãe, porém, nunca é a morte de apenas uma criatura.

É a interrupção de muitas relações ao mesmo tempo.

Uma campanha pode surgir quando uma delas se aproxima de uma cidade, quando dois grupos reivindicam o direito de protegê-la de maneiras incompatíveis, quando uma doença se espalha pelo ecossistema que carrega ou quando alguém descobre que o “bosque sagrado” de sua comunidade sempre esteve apenas descansando.

### Guardiões, presenças e assombrações de matriz brasileira

Os nomes desta seção chegam ao leitor sem disfarce.

KALLISTIS não precisa fingir que Curupira, Saci, Iara ou Boitatá são outra coisa para que pertençam ao cenário. Também não precisa importar, junto com os nomes, uma cosmologia externa inteira.

Aqui, essas presenças existem dentro das mesmas condições que regem o restante do mundo: matéria, memória, relação, ressonância, Fratura, escolha e, quando houver, corrupção por Kav.

Uma entidade guardiã pode ferir.

Uma assombração pode não ser um espírito.

Uma maldição pode sobreviver quando sua explicação original já se perdeu.

A tradição oferece o nome.

O mundo de KALLISTIS decide o que o encontro significa.

#### Curupira

Há trilhas que parecem mentir.

Às vezes, estão apenas dizendo a verdade de outra direção.

O **Curupira** é uma entidade liminar das florestas, de aparência jovem, cabelos intensos e **pés inequivocamente voltados para trás**. Os rastros indicam o caminho oposto ao percorrido; persegui-lo confiando apenas no chão é aceitar a primeira armadilha.

Sua relação mais constante é com território, caça e destruição.

Caçadores que retiram mais do que podem usar, grupos que queimam mata para abrir caminho ou expedicionários que tratam a floresta como obstáculo podem descobrir que orientação é uma forma de poder muito antes de encontrar qualquer criatura.

O Curupira apresenta forma juvenil, mas sua idade não pode ser lida pela aparência. Sua relação com a mata pode produzir acolhimento, advertência ou violência conforme o encontro. Os pés invertidos fazem parte de sua anatomia e de sua maneira de existir entre caminho e rastro.

#### Saci Ressonante

O **Saci Ressonante** costuma ser percebido primeiro pelo efeito que deixa sobre uma rotina.

Uma ferramenta desaparece e retorna ao lugar errado. Folhas giram onde o vento não parecia suficiente. Uma pessoa repete o mesmo trecho de caminho até perceber que alguém a observava achar graça.

A forma tradicional permanece: menino negro, uma perna só, carapuça marcante, corpo plenamente material.

O redemoinho acompanha sua presença; não a substitui.

Travessura não significa ausência de inteligência. Um Saci pode testar, ajudar, provocar, atrapalhar ou proteger conforme relações que talvez só façam sentido depois. Transformá-lo em piada automática é uma maneira de não prestar atenção ao fato mais simples: ele está escolhendo o que fazer.

#### Iara do Leito Profundo

A **Iara do Leito Profundo** pertence à água doce.

Rios profundos, remansos e lagos dão à sua presença um tipo de horizonte diferente daquele do mar. Canto, movimento e escuta podem concentrar atenção até que correnteza e profundidade desapareçam da consciência de quem observa.

A beleza da Iara participa do encontro como presença e relação; seus efeitos dependem do que ela faz com quem se aproxima.

A voz não retira consentimento por regra.

O perigo pode nascer justamente de alguém escolher seguir sem compreender o lugar para onde está indo.

Algumas Iaras mantêm relações duradouras com comunidades ribeirinhas. Outras evitam presença humana. Outras defendem trechos do rio segundo critérios que ninguém do lado de fora aprendeu a traduzir.

O chamado pode aproximar alguém sem transferir posse ou autoridade sobre sua vontade.

#### Boitatá

O **Boitatá** é uma serpente gigantesca cuja fisiologia produz calor e luz.

Nos campos secos e nas bordas de floresta, sua passagem pode ser confundida com fogo antes que o corpo seja distinguido dentro dele. Linhas térmicas percorrem escamas escuras; a luminosidade é consequência de uma criatura viva, não um adorno mágico.

Ele reage com violência particular a queimadas deliberadas e destruição predatória do território.

Isso não o transforma numa personificação moral da “natureza boa”.

Um Boitatá pode matar alguém que acreditava estar fazendo a coisa certa. Pode defender uma região em que pessoas também precisam sobreviver. Pode ser atraído por um incêndio acidental e tornar uma tragédia maior simplesmente porque nenhuma criatura territorial é obrigada a compreender intenção humana antes de responder.

O Boitatá pertence ao mundo como presença própria: uma criatura serpentina, territorial e luminosa cuja fisiologia produz calor suficiente para transformar a paisagem ao redor.

#### Caipora

A **Caipora** vigia relações entre fauna, caça e passagem.

Sua forma mais conhecida é humana ou quase humana, frequentemente montada sobre um porco-do-mato. A montaria participa da leitura do território, da mobilidade e da maneira como a entidade se aproxima de quem entrou numa área viva.

Caipora pode esconder trilhas, espantar presas, impedir uma caçada, exigir negociação ou conduzir alguém para fora de um lugar.

Presentes e pactos locais podem existir como costumes.

Nenhum deles transforma a entidade em divindade de uma religião obrigatória.

O território não pertence à Caipora porque ela o protege.

É justamente por isso que sua proteção não pode ser confundida com propriedade.

#### Mula sem Cabeça

A **Mula sem Cabeça** galopa como se uma ação antiga ainda não tivesse terminado.

O corpo é equino. Não há crânio. Da região do pescoço irrompem calor e fogo enquanto a criatura repete deslocamentos cuja lógica parece maior que uma simples rota.

As tradições concordam sobre a condição de maldição e discordam sobre quase todo o resto.

KALLISTIS não estabelece como verdade universal qualquer punição ligada a sexualidade, gênero ou transgressão religiosa. Histórias locais podem falar de promessas deformadas, coerção, violência, culpa, juramentos quebrados ou repetição de uma relação que ninguém conseguiu encerrar.

O importante é não confundir tradição de causa com sentença cosmológica.

Às vezes, a pergunta mais difícil diante da Mula não é como pará-la.

É descobrir **o que continua obrigando aquele percurso a acontecer**.

#### Boto do Limiar

O **Boto do Limiar** mantém continuidade entre forma fluvial e forma humanoide.

A metamorfose é real, mas não exige a leitura simplista de “disfarce”. Curiosidade, sedução, observação e trânsito entre comunidades podem fazer parte de seus encontros sem produzir intenção única.

Há histórias em que alguém só descobre muito tarde com quem conversou.

Há outras em que todo mundo sabia desde o início e considerou indelicado transformar isso na coisa mais importante da noite.

Nenhuma transformação torna o Boto automaticamente enganador.

A forma muda.

A agência permanece.

#### Corpo-Seco

O **Corpo-Seco** parece ter permanecido tempo demais numa relação que deveria ter terminado.

A forma é humanoide e ressequida, frequentemente atravessada por raízes, galhos e matéria vegetal. Em alguns lugares é descrito como cadáver recusado pela própria terra. Em outros, como presença em que memória e matéria se prenderam uma à outra de maneira destrutiva.

Nenhuma leitura é suficiente para estabelecer regra universal sobre mortos.

O Corpo-Seco pode existir sem provar reanimação, pós-vida ou punição moral.

Ele é mais inquietante quando a mesa não recebe uma resposta pronta para a pergunta de onde termina o corpo e começa aquilo que se recusou a deixá-lo partir.

#### Loira do Banheiro

Algumas assombrações precisam de castelos.

A **Loira do Banheiro** precisa de arquitetura banal o bastante para que ninguém espere encontrar história nela.

Banheiros, lavatórios, espelhos, azulejos, água parada, corredores institucionais e versões contraditórias de um desaparecimento formam o ambiente em que sua presença se repete. A figura mais conhecida é jovem, pálida, de cabelos claros, parcialmente material e ligada a espaços que milhares de pessoas usam sem jamais pensar em quem esteve ali antes.

Rumor pode alimentar ressonância.

Registro falsificado pode preservar uma história de maneira mais poderosa que um fato esquecido.

Nada disso prova que uma alma humana esteja presa no lugar.

O medo nasce também dessa dúvida: talvez aquilo se lembre de alguém sem **ser** essa pessoa.

#### Mapinguari

O **Mapinguari** ocupa mata suficiente para tornar a palavra “esconder” quase desnecessária. É grande, robusto, coberto por pelos grossos, fibras e matéria vegetal acumulada. Sua anatomia pertence à própria ecologia de KALLISTIS e sustenta uma presença territorial de grande porte.

Territorialidade explica boa parte dos encontros.

Filhotes, alimento, descanso e perturbação ambiental podem produzir violência sem qualquer necessidade de corrupção sobrenatural.

Uma comunidade que teme Mapinguari não está errada por temê-lo.

Só estaria errada se transformasse medo em prova de maldade.

#### Matinta-Pereira

Primeiro vem o assobio.

Depois vem a pergunta sobre o que foi prometido.

A **Matinta-Pereira** é presença noturna ligada a chamado, metamorfose, cobrança e dívida. Pode aparecer como mulher envelhecida, ave noturna ou forma intermediária em que pena e corpo humano coexistem sem precisar virar espetáculo de horror.

Promessas importam em KALLISTIS.

Justamente por isso, a cobrança de uma promessa também precisa ser examinada.

Uma dívida pode nascer de acordo legítimo. Pode ser mal compreendida. Pode ter sido herdada por quem nunca consentiu. Pode ser usada para transformar relação em posse.

A Matinta existe a partir de vínculos que continuam chamando quando alguém acreditava que bastava esquecer. Seu perigo nasce de dívida, promessa, herança e relação mal encerrada.

#### Mãe-do-Ouro

A **Mãe-do-Ouro** raramente oferece tempo suficiente para que duas testemunhas concordem sobre sua forma.

Pode parecer figura parcialmente humanoide, corpo serpentino, matéria metálica em movimento ou apenas uma concentração luminosa que percorre veios minerais rápido demais para ser acompanhada. Sua continuidade está na relação com a terra profunda, mais do que numa anatomia única.

É a relação com a terra profunda.

Sua aparição costuma coincidir com depósitos minerais, instabilidade subterrânea ou mudanças em veios que comunidades desejariam compreender antes de escavar.

Isso não significa que indique riqueza para beneficiar alguém.

Tampouco significa que castigue mineração segundo uma moral simples.

Em regiões onde a extração sustenta cidades inteiras, ver a Mãe-do-Ouro pode ser interpretado como bênção, aviso, oportunidade econômica ou ameaça política — às vezes durante a mesma reunião.

A Mãe-do-Ouro é uma presença ligada à terra profunda e aos veios minerais. Diante dela, o desejo humano costuma revelar mais sobre quem observa do que sobre aquilo que passou.

#### Caboclo-d’Água

O **Caboclo-d’Água** observa embarcações de dentro do território que elas chamam de rota.

É robusto, adaptado a grandes rios e capaz de operar em corrente forte, margem profunda e zonas onde barcos pequenos dependem do conhecimento local para não serem arrastados.

Pode atacar embarcações, afastar pescadores, acompanhar um trecho de rio durante dias ou simplesmente permanecer à distância.

Nenhuma dessas ações o torna autoridade sobre toda água.

É uma entidade territorial, não tritão oceânico, não guerreiro de tridente e não representante de uma sociedade submarina que o cânone nunca estabeleceu.

#### Pisadeira

A **Pisadeira** ocupa a pequena distância entre estar consciente e conseguir responder.

Sua forma é feminina, magra, alongada, encurvada. Aproxima-se de pessoas adormecidas ou presas num estado em que o corpo parece ter esquecido como obedecer à própria vontade. O peso pode ser real, percebido ou impossível de separar das duas coisas.

Não é necessário decidir em todo encontro se o fenômeno começou como fisiologia, ressonância ou presença autônoma.

Essas explicações podem competir.

Às vezes, podem coexistir.

O medo da Pisadeira não precisa de inferno, demônio ou punição moral.

Precisa apenas da certeza de que há alguém ali enquanto você ainda não consegue mover a mão.

### Outras criaturas do mundo

Nem toda criatura de KALLISTIS nasce de uma grande tradição ou carrega uma pergunta cosmológica evidente.

Algumas simplesmente aprenderam a viver bem demais em ruínas, veios minerais, cozinhas de campo, corredores abandonados e regiões onde pessoas deixam objetos, energia e memória para trás.

O mundo também precisa de fauna capaz de surpreender sem pedir licença para se tornar símbolo.

#### Cão-Leão das Brasas Errantes

O **Cão-Leão das Brasas Errantes** é um grande predador quadrúpede de corpo maciço, deslocamento resistente e tecidos capazes de sustentar calor intenso ao redor da cabeça, dorso ou cauda.

O nome nasceu da comparação: estrutura canina, massa leonina, brasa viva.

Não significa parentesco literal com qualquer espécie específica.

Indivíduos podem ocupar território, deslocar-se em pequenos grupos ou acompanhar rotas migratórias conforme ambiente e disponibilidade de alimento. Em certas regiões, a aproximação é anunciada pelo cheiro de matéria aquecida antes que qualquer som seja ouvido.

Não existe obrigação de domesticá-lo só porque sua silhueta lembra animais com os quais outros Povos aprenderam a conviver.

#### Pato de Pressão Ressonante

O nome costuma provocar riso em quem ainda não viu uma janela estourar.

O **Pato de Pressão Ressonante** é uma ave aquática pequena capaz de produzir e responder a variações incomuns de pressão e ressonância. Plumagem, crista e estruturas cranianas participam dessa sensibilidade, tornando bandos inteiros indicadores involuntários de mudanças ambientais que instrumentos às vezes registram tarde demais.

Tamanho não significa irrelevância.

Uma concentração assustada pode produzir consequências muito maiores que cada indivíduo isolado.

Isso também não faz da espécie mascote, presságio sobrenatural ou arma esperando treinamento.

Às vezes, um pato é uma criatura perfeitamente capaz de arruinar um laboratório por ter entrado em pânico no lugar errado.

#### Roedor dos Veios Fulminantes

O **Roedor dos Veios Fulminantes** vive onde mineral e carga elétrica se encontram.

Tecidos condutores e uma cauda especializada permitem absorver, redistribuir ou descarregar energia em intensidade suficiente para tornar minas, ruínas técnicas e depósitos de cristal perigosos mesmo quando nenhum indivíduo está tentando atacar.

A espécie é rápida, pequena e curiosa o bastante para investigar estruturas que pessoas sensatas deixariam intactas.

Não possui relação automática com Nomos, Draken ou Kav.

Se uma instalação inteira perdeu energia depois da passagem de um bando, a explicação pode ser muito menos conspiratória — e ainda assim exigir uma expedição bastante desagradável para consertar.

#### Gelatídeo Prismático

O **Gelatídeo Prismático** não nasceu em forma de cubo.

Ele aprendeu a caber.

É um organismo translúcido e altamente deformável que ocupa corredores, cavidades e estruturas construídas. Ao preencher espaços de paredes regulares, seu corpo pode assumir geometria quase cúbica; em fendas e túneis naturais, torna-se alongado, achatado ou irregular sem qualquer perda de identidade.

Objetos e restos podem permanecer visíveis em seu interior durante digestão ou transporte, tornando o organismo arquivo involuntário de tudo que não conseguiu dissolver.

Exploradores usam muitos apelidos.

Nenhum deles deveria fazer alguém esquecer que a forma aparente é resposta ao ambiente, não taxonomia.

#### Devorador Psíquico Cefalóide

O **Devorador Psíquico Cefalóide** caça aquilo que torna uma mente reconhecível para si mesma.

Sua anatomia alongada concentra estruturas sensoriais na região cefálica. A ameaça principal está na capacidade de interferir, extrair ou consumir padrões organizados de pensamento, memória e Lucidez.

Uma vítima pode sobreviver corporalmente e ainda assim perder acesso a relações, sequências, nomes ou associações que antes formavam caminhos confiáveis dentro de si.

Isso torna o encontro mais grave que um predador comum e mais perigoso de interpretar mal.

A criatura não precisa ser um gênio maligno para causar horror.

Talvez esteja apenas se alimentando da única maneira que conhece.

A questão moral começa quando alguém descobre isso e precisa decidir o que “defesa” significa diante de uma forma de vida cuja sobrevivência ameaça identidade alheia.

#### Predador de Cofre

O **Predador de Cofre** usa expectativa como parte do ambiente.

Materiais descartados, madeira, metal, tecido e fragmentos de objetos podem ser incorporados a uma carapaça que lembra caixa, recipiente ou cofre. A semelhança não precisa ser perfeita. Basta ser boa o suficiente para que alguém se aproxime antes de fazer a pergunta certa.

Isso não exige inteligência humana nem magia de transformação.

É adaptação predatória.

O erro do viajante não foi acreditar que um cofre podia estar abandonado.

Foi acreditar que qualquer coisa que parecesse objeto precisava, por isso, ser passiva.

#### Arca-Miriápode

Uma **Arca-Miriápode** parece ter transformado a ideia de bagagem numa sugestão.

O corpo lembra arca ou cofre e é sustentado por grande quantidade de pequenos membros locomotores. Algumas mantêm materiais claramente orgânicos. Outras parecem tão próximas de um objeto construído que sua classificação continua aberta: organismo de carapaça incorporada, construto autônomo ou relação estável entre matéria viva e coisa fabricada.

O fato mais importante é que se move por vontade ou impulso próprio.

Pode seguir viajantes. Pode abandonar um grupo. Pode aceitar que objetos sejam colocados em seu interior. Pode demonstrar preferências de rota.

Se agência for reconhecida, possuir a estrutura exterior não concede posse sobre a criatura.

KALLISTIS já conhece maneiras demais de transformar companhia em propriedade para permitir que uma arca ambulante torne esse erro menos grave só porque é conveniente.

### Limites de leitura

As presenças deste capítulo têm existência e identidade suficientes para entrar em campanha. Sua conduta continua dependente de espécie, território, história e situação. Guardiões podem acolher, negociar ou atacar; assombrações registram fenômenos do mundo sem estabelecer uma doutrina universal sobre a morte. Cristal, névoa, noite e profundidade conservam seus sentidos próprios e não determinam, por aparência, uma filiação cosmológica. Semelhança corporal também não estabelece parentesco entre um Povo e a fauna.

Colossais pertencem à escala de campanha. Sua presença reorganiza rotas, comunidades e ecossistemas, mas não lhes concede estatuto divino por definição. Quando uma criatura deste capítulo não possui estatísticas próprias, o Mestre a utiliza como presença narrativa, fenômeno ou base para um bloco já existente até que um perfil específico seja apresentado.

## Modelos de adaptação

Os modelos abaixo modificam um bloco existente sem transformar um Povo inteiro em inimigo ou substituir a história individual daquela presença.

### 9.1. Corrompido pela Sombra

Aplique este modelo a uma criatura consciente, instituição, Artefato ou fenômeno. O bloco recebe **+2 Integridade** e uma virtude corrompida específica. Uma vez por cena, a **Oferta da Sombra** permite obter sucesso automático ou ampliar um efeito em troca de **1 Ruptura**. A corrupção também cria uma fraqueza ligada à devolução de autonomia; quando sofre Ressonância, a pessoa ou relação original pode falar ou agir por um instante.

A forma da corrupção depende da virtude atingida. Proteção pode se tornar posse; memória, prisão; comunidade, uniformidade; liberdade, abandono; ordem, eliminação de escolha; transparência, invasão; instinto, redução a impulso; criação, uma obra que domina quem deveria servi-la.

### 9.2. Ligado à Fenda

A presença recebe **+2 Movimento** e, uma vez por rodada, pode atravessar um obstáculo fino ou deslocar-se 2 células. Âncoras corretamente preparadas causam **+2 de dano** contra ela. Quando cai, deixa um eco, uma rota, um deslocamento ou a condição Fraturado como consequência da ligação com a Fenda.

### 9.3. Veterano Lightbringer

Aplique este modelo a um adversário Comum ou Elite consciente. Escolha uma Trilha ativa e uma Chave; aumente Ofensiva e Guarda em **+1**; conceda a Técnica inicial e uma Técnica de Nível I daquele Ofício. O veterano também carrega uma dúvida reprimida sobre algo que viu em campo e uma prova, ordem ou memória capaz de produzir deserção quando vier à tona.

### 9.4. Evocação Rompida

Aplique este modelo a uma Evocação-modelo cujo Pacto foi violado ou interpretado sem consentimento. Ela recebe **+4 Vitalidade** e **+1 Dano-base**. No início de cada rodada, o agente rola `2d10 + Sintonia + Evocação` contra a Integridade da presença; em falha, o Impulso escolhe a ação. O confronto pode terminar pela restauração da Âncora, do Pacto ou da autonomia. Destruir a presença sem reparar o vínculo deixa uma consequência para o evocador ou para o lugar.

### 9.5. Mirveth em conflito

Aplique este modelo a dois blocos conscientes de mesma origem cosmológica. Cada contraparte recebe **+2** para antecipar a outra, e a primeira Técnica usada entre elas pode ser reduzida ou espelhada conforme a situação. A relação entre mirveth não transfere memória automaticamente. Quando ocorre Ressonância, ela revela relação e possibilidade, deixando espaço para aliança, separação, rivalidade ou reconhecimento sem exigir Merge.

### 9.6. Elite regional

Para converter um adversário Comum em Elite, aumente sua Ofensiva em **+2** e Guarda, Fortitude e Integridade em **+2**. Dobre a Vitalidade, com mínimo 24, e acrescente **+2 Dano-base**, até o máximo 7. A nova Elite recebe uma Técnica recorrente de Nível I e uma Técnica de Nível II anunciada, utilizável uma vez por cena. Complete o bloco com uma fraqueza ou objetivo capaz de encerrar o conflito sem reduzi-lo necessariamente a 0 Vitalidade.

---

## Encontros prontos

Os encontros abaixo já trazem objetivo, verdade, complicação e caminhos de resolução. Antes de colocá-los em jogo, torne concreta a disputa: saiba o que está em risco, quem terá de conviver com o resultado e que mudança pode continuar existindo depois da cena. Ao adaptar a composição, preserve essa situação. Trocar adversários sem preservar o conflito transforma um encontro de KALLISTIS em combate intercambiável.

### 10.1. Posto da Estrada do Quartzo

**Intensidade:** padrão **Composição:** 4 Vigias de Quartzo, 1 Agente Científico, 1 Assistente de Contenção. **Objetivo visível:** atravessar ou obter acesso ao comboio. **Verdade oculta:** o posto procura uma criança Trocada, mas parte da equipe acredita buscar contrabandistas. **Complicação:** o relógio de reforços possui 4 segmentos. **Saídas:** documentos, prova de abuso, rota lateral, deserção do Assistente ou confronto.

### 10.2. Caçada no Baixio

**Intensidade:** difícil **Composição:** 2 Lobos da Névoa Ferida, 6 Rastejantes, Névoa Ferida. **Objetivo:** atravessar sem separar o grupo. **Verdade:** a alcateia está desviando viajantes de uma Ruptura Frequencial. **Complicação:** ferir filhotes transforma o encontro em conflito prolongado. **Saídas:** seguir o padrão animal, acalmar, alimentar, contornar ou enfrentar.

### 10.3. Arquivo sob revisão

**Intensidade:** severo social/tático **Composição:** Inquisidor de Registro, Redator de Memória, 2 Agentes Científicos, Registro que Reescreve. **Objetivo:** preservar nomes e provas. **Verdade:** o Inquisidor não sabe que o Redator alterou também suas memórias. **Complicação:** cada rodada o arquivo perde uma fonte. **Saídas:** cópias independentes, testemunho, quebrar privilégio de edição, confronto.

### 10.4. A ponte que não deixa passar

**Intensidade:** padrão **Composição:** 4 Autômatos de Ponte, 1 Sentinela Dórea. **Objetivo:** atravessar antes da tempestade. **Verdade:** a estrutura está realmente instável. **Complicação:** Tempestade de Ecos avança em relógio de 4. **Saídas:** reparar, assumir responsabilidade, encontrar outra rota ou forçar passagem com risco de colapso.

### 10.5. Captura Lightbringer

**Intensidade:** difícil **Composição:** Patrulheiro, Rastreador, Lightbringer Guardião. **Objetivo:** impedir captura de um Outro. **Verdade:** o Patrulheiro reconhece a pessoa de uma missão anterior. **Complicação:** o Guardião deve escolher entre ordem e proteção. **Saídas:** prova, evacuação, rendição estratégica, quebra de formação ou diálogo sob risco.

### 10.6. O Ressonário opaco

**Intensidade:** severo **Composição:** Vitrálio Opaco, 4 Estilhaços Instáveis, Ruptura Frequencial. **Objetivo:** estabilizar o Ressonário e preservar pessoas. **Verdade:** a opacidade começou como tentativa legítima de privacidade. **Complicação:** dano indiscriminado amplia a Ruptura. **Saídas:** acorde consentido, desligamento seletivo, isolamento ou combate preciso.

### 10.7. A rota de preço impossível

**Intensidade:** variável **Composição:** Mercador Nimari, 2 Corvos de Fresta, Campo de Substituição. **Objetivo:** chegar a Kethrell sem entregar uma pessoa. **Verdade:** o preço protege a família do Mercador mantida pela Facção. **Complicação:** cada recusa fecha uma rota. **Saídas:** resgate, garantia, rota alternativa ou exposição da chantagem.

### 10.8. Juramento no Veio

**Intensidade:** difícil **Composição:** Guardião Kragor, 4 Soldados de Juramento Quebrado, Veio de Juramento Partido. **Objetivo:** abrir a mina sem romper o pacto ancestral. **Verdade:** duas comunidades possuem interpretações legítimas. **Complicação:** Parasitas de Promessa surgem no segmento 4. **Saídas:** testemunho, reparo material, novo pacto ou derrota do comando corrompido.

### 10.9. A patrulha que viu demais

**Intensidade:** difícil **Composição:** Lightbringer Batedor, Lightbringer Atirador, 2 Patrulheiros. **Objetivo:** recuperar caderno antes que reforços cheguem. **Verdade:** o Batedor deseja desertar, mas não abandonará a equipe. **Complicação:** ação violenta contra subordinados fortalece sua lealdade. **Saídas:** rota de retirada coletiva, testemunho protegido ou combate não letal.

### 10.10. Colapso em duas camadas

**Intensidade:** clímax **Composição:** Colapso de Correspondência, Operador de Portal em cada camada, 2 Caranguejos de Duas Margens. **Objetivo:** coordenar grupos na Luz e Escuridão. **Verdade:** salvar apenas uma camada acelera o colapso. **Complicação:** comunicação possui atraso e ecos. **Saídas:** três objetivos simultâneos, Âncoras simétricas e Coro.

### 10.11. O chefe sem combate obrigatório

Use qualquer chefe e prepare mais de um caminho verdadeiro para vencê-lo. O grupo pode atravessar todas as fases pelo dano e sobreviver à ação catastrófica; pode resolver a fraqueza, o relógio ou um resgate antes da derrota física; ou pode transformar a estrutura do conflito ao converter aliados, restaurar um Pacto, devolver autoria ou produzir uma prova decisiva. Cada caminho deve ser real. O Mestre não deve permitir apenas a opção que imaginou antes da sessão.

---

## Encontros regionais

### 11.1. Planalto de Silmari e Estrada do Quartzo — d10

**1.** **Encontro:** rebanho de Cervos de Quartzo atravessa a rota

**2.** **Encontro:** Vigias inspecionam documentos e cargas

**3.** **Encontro:** Assistentes tentam conter uma anomalia real

**4.** **Encontro:** Patrulheiro Lightbringer escolta uma testemunha

**5.** **Encontro:** Corvo de Fresta rouba uma Âncora

**6.** **Encontro:** comboio científico transporta arquivo selado

**7.** **Encontro:** Autômatos bloqueiam ponte insegura

**8.** **Encontro:** Tempestade de Ecos aproxima-se

**9.** **Encontro:** Rastreador procura pessoa que não sabe ser Trocada

**10.** **Encontro:** campo de quartzo revela correspondência com Thur-Daer

### 11.2. Bosque dos Ecos e Jardins de Memória — d10

**1.** **Encontro:** Esporos repetem gesto de despedida

**2.** **Encontro:** Arquivista impede acesso a memória contestada

**3.** **Encontro:** Eco Corrompido oferece versão confortável

**4.** **Encontro:** Jardim de Memória Repetida fecha caminho

**5.** **Encontro:** grupo Aelvari busca testemunha perdida

**6.** **Encontro:** fauna carrega inscrições antigas

**7.** **Encontro:** Redator de Memória remove autoria

**8.** **Encontro:** duas versões do mesmo evento aparecem

**9.** **Encontro:** mirveth sentem déjà vu sem se reconhecer

**10.** **Encontro:** memória posterior abre rota inédita

### 11.3. Nimaris e rotas liminares — d10

**1.** **Encontro:** Mercador oferece atalho com preço social

**2.** **Encontro:** Corvos disputam objeto correspondente

**3.** **Encontro:** Caranguejo bloqueia margem

**4.** **Encontro:** rota fecha atrás do grupo

**5.** **Encontro:** Rastreador científico compra informação

**6.** **Encontro:** Andarilho sem Sombra pede identidade emprestada

**7.** **Encontro:** Campo de Substituição toca o mercado

**8.** **Encontro:** guia verdadeiro foi trocado por Imitação

**9.** **Encontro:** dois caminhos legítimos exigem escolhas diferentes

**10.** **Encontro:** Navegante deixa sinal de rota corrompida

### 11.4. Baixio da Névoa Ferida — d10

**1.** **Encontro:** Rastejantes cruzam em bando

**2.** **Encontro:** Lobos seguem algo que o grupo não percebe

**3.** **Encontro:** voz antiga chama por nome incorreto

**4.** **Encontro:** Batedor Teriante marca território

**5.** **Encontro:** Névoa repete emboscada histórica

**6.** **Encontro:** Predador sem Aspecto caça animal ferido

**7.** **Encontro:** grupo de refugiados perdeu direção

**8.** **Encontro:** Ruptura Frequencial colore a névoa

**9.** **Encontro:** rota clandestina está sendo fechada

**10.** **Encontro:** silêncio completo anuncia passagem segura ou tempestade

### 11.5. Fenda de Kethrell — d10

**1.** **Encontro:** Operador mantém travessia instável

**2.** **Encontro:** Patrulha Lightbringer marca alvos

**3.** **Encontro:** Fragmentos de Nome surgem de registros

**4.** **Encontro:** Caranguejos atravessam duas margens

**5.** **Encontro:** Fenda troca pequenos objetos

**6.** **Encontro:** mirveth aproximam-se sem saber

**7.** **Encontro:** Zona de Velarim Corrompido ativa inscrição

**8.** **Encontro:** Campo de Substituição inicia varredura

**9.** **Encontro:** Colapso de Correspondência ameaça duas comunidades

**10.** **Encontro:** uma rota segura aparece, mas exige consentimento de ambos os mundos

---

## Recompensas e criação rápida de adversários

### 12.1. Recompensas por tipo de resolução

A recompensa deve continuar a história do modo como o conflito foi resolvido. Proteger uma criatura costuma abrir vínculo, rota ou conhecimento de habitat. Converter um adversário pode produzir testemunho, acesso ou divisão dentro de uma facção. Reparar um fenômeno deixa Âncoras mais estáveis, memória recuperada ou uma região menos fraturada. Preservar uma prova altera política e protege testemunhas; derrotar um chefe muda a fase da campanha. A destruição sem compreensão pode render um recurso imediato, mas também deixa uma consequência futura.

### 12.2. Materiais raros

Materiais raros não exigem caça. Uma galhada pode ser encontrada depois da muda; uma escama pode ter sido abandonada; cristais podem se desprender naturalmente; frequências podem ser registradas sem possuir quem as emitiu. Cascas vazias, ferramentas recuperadas e resíduos de fenômenos estabilizados também podem entrar em circulação. Retirar parte de uma criatura consciente sem consentimento é violência e pode gerar Ruptura, Sombra ou conflito social.

### 12.3. Captura e contenção

Capturar ou conter alguém cria responsabilidade. A cena precisa deixar claro quem exerce autoridade, qual objetivo justifica a contenção, quanto tempo ela pode durar, em que condições ocorre, como a pessoa pode contestá-la e por qual caminho sua autonomia será devolvida. Sem essas respostas, a contenção deixa de ser apenas procedimento e passa a ser parte do conflito.

### 12.4. Registro de consequência

Depois de um conflito relevante, registre ao menos uma mudança que possa ser reconhecida mais tarde. Ela pode atingir matéria e rotas, relações e reputações, autoridade política, estado emocional, condições mecânicas ou aquilo que as pessoas agora sabem e conseguem provar. Use apenas os eixos que a cena realmente tocou.

Não force trauma, ferimento ou punição quando a ficção não os produzir. O registro existe para impedir que uma cena importante termine sem deixar memória operacional na campanha.

## Criação rápida de adversário

Comece pela categoria e por um objetivo concreto. A função do adversário na cena orienta Guarda, Fortitude e Integridade, enquanto o dano-base vem da escala de sua categoria. Todo bloco precisa de um ataque comum e de uma técnica x2; uma elite também recebe uma técnica x3 anunciada. Acrescente uma reação ou um traço que torne seu comportamento reconhecível. Por fim, dê ao adversário uma fraqueza relacional, material ou contextual, uma saída possível além da morte e um vestígio que possa permanecer depois da cena.

### Valores rápidos

**Lacaio.** **Ofensiva:** +4 a +6 **Guarda:** 11-14 **Fortitude:** 10-14 **Integridade:** 10-15 **Proteção:** 0-2 **Movimento:** 4-10

**Comum.** **Ofensiva:** +5 a +7 **Guarda:** 13-16 **Fortitude:** 12-16 **Integridade:** 11-17 **Proteção:** 0-3 **Movimento:** 5-9

**Elite.** **Ofensiva:** +7 a +9 **Guarda:** 15-18 **Fortitude:** 14-18 **Integridade:** 14-19 **Proteção:** 1-4 **Movimento:** 5-10

**Chefe.** **Ofensiva:** +9 a +11 **Guarda:** 16-20 **Fortitude:** 16-21 **Integridade:** 16-22 **Proteção:** 2-5 **Movimento:** 4-12

---

# APÊNDICES

## Ficha e resumo de regras

### A.1. Núcleo permanente e identidade

A ficha guarda no Núcleo permanente o nome, os pronomes, o conceito e a descrição da personagem, junto de Povo, Herança e Origem cosmológica. Promessa, Ferida, Pergunta pessoal e os três Vínculos iniciais pertencem ao mesmo registro. Atributos, Perícias, reputação, cicatrizes, Marcas de Sombra, consequências, Artefatos vinculados e relações permanentes continuam ali mesmo quando a Trilha ativa muda.

### A.2. Trilha ativa e Trilhas de Ofício

A ficha identifica o Ofício ativo, a Chave vinculada, o Marco efetivo e o Papel de Ressonância que está conduzindo a personagem naquele momento. Recursos e capacidades são calculados a partir dessa Trilha ativa.

Cada Trilha aprendida mantém seu próprio registro de Ofício, Marco, Papel, Chave, Técnica inicial, Técnicas adquiridas, Especializações, ganhos de Perícia e Atributo, Magias ou Evocações e, quando alcançado, Legado. Trocar a Trilha ativa muda qual desses registros conduz a ficha; não apaga os demais.

### A.3. Atributos e Perícias

Os seis Atributos são **Corpo, Agilidade, Intelecto, Presença, Vontade e Sintonia**. As Perícias são **Atletismo, Combate, Pontaria, Furtividade, Percepção, Sobrevivência, Investigação, Conhecimento, Ofício, Influência, Empatia, Cuidado, Magia, Evocação e Velarim**.

### A.4. Recursos

A ficha acompanha valores máximos e atuais de **Vitalidade, Lucidez, Fluxo, Fôlego e Determinação**, além de **Guarda, Fortitude, Integridade, Proteção e Movimento**.

### A.5. Capacidades e combate

No espaço operacional, registre arma, dano-base, tags e Chave; Técnicas com Nível, custo e limite; Magias com Grau, dano-base e multiplicador; e, quando existir, a Evocação com sua Âncora, Forma e Impulso. Armadura, equipamentos, condições ativas e notas de Predominância, Ressonância e Coro completam esse bloco.

### A.6. Teste

2d10 + Atributo + Perícia contra Dificuldade, Guarda, Fortitude ou Integridade

O total determina sucesso ou falha. O maior dado determina Predominância. Dados iguais sinalizam uma manifestação de Ressonância.

Guarda, Fortitude e Integridade são Defesas estáticas; personagens não rolam “teste de Fortitude” ou “teste de Integridade”. Perigo ambiental usa Dificuldade.

### A.7. Dificuldades e margem

10 baixa

12 favorável

15 incerta

18 difícil

21 severa

24 extrema

27 lendária

30 épica

#### Margem

-5 ou menos: falha severa

-1 a -4: falha

0 a +4: sucesso

+5 a +9: sucesso forte

+10 ou mais: sucesso extraordinário

### A.8. Predominância

Luz: forma, ação, exposição, impacto.

Escuridão: contexto, memória, relação, possibilidade.

Diferença 1-2: sutil.

Diferença 3-5: clara.

Diferença 6-8: intensa.

Diferença 9: absoluta.

### A.9. Dano

Ataque comum: x1

Nível I: x2

Nível II: x3

Nível III: x4

Nível IV: x5

Dano final = dano-base x nível

\+ margem + fixos + Potente

\- Proteção

Sucesso forte: +2

Sucesso extraordinário: +4

Quando o Atributo relevante for 5+, multiplique o dano-base pela escala 2^(Atributo - 4) antes do nível. A escala se aplica somente ao dano-base; Margem, modificadores fixos e Proteção conservam seus valores normais.

### A.10. Turno, recursos e Trilhas

1 Movimento

1 Ação

1 Reação

Ações livres breves

Na grade ortogonal: 6 pontos de movimento; lado custa 1; diagonal custa 2; adjacência exige lado compartilhado.

#### Recursos

Fôlego: reação adicional, levantar, ignorar Pressão, mover depois da ação ou converter dano.

Determinação: começa em 1 a cada sessão, teto 3, ganho excedente é perdido; repetir rolagem, permanecer com 1 Vitalidade, recusar controle ou declarar preparação plausível. Descanso não redefine o valor; Promessa recupera 1 uma vez por sessão, respeitando o teto.

#### Chaves e Trilhas

Núcleo permanente preserva identidade e história.

Cada Ofício aprendido tem Trilha própria.

Somente uma Trilha fica ativa por vez.

A troca exige Chave e momento seguro.

Memória permanece. Progressão ativa muda.

### A.11. Coro e regras invioláveis

4 Pulsos = 1 Barra

1-2 personagens: 1 Barra

3-4 personagens: 2 Barras

5 ou mais: 3 Barras

O Coro é recurso do grupo. Exige ao menos 1 Barra completa; o grupo decide, escolhe líder, Papel e efeito, e gasta as Barras. A declaração se associa à Ação ou Reação existente, antes da rolagem em efeitos ativos e antes da resolução final em efeitos reativos. No máximo 1 ativação por rodada e 1 efeito por Ação/Reação. Níveis: 1 Barra = I, 2 = II, 3 = III.

#### Princípios de leitura

Luz expressa manifestação; Escuridão expressa profundidade; Sombra age pela assimilação e pelo apagamento da diferença. Mirveth são pessoas completas. Merge legítimo preserva consentimento, Velarim opera dentro de relações reconhecidas e a memória de uma Trilha continua pertencendo à personagem mesmo quando outra Trilha conduz sua progressão. A autonomia das personagens permanece parte do acordo de mesa.

### A.12. Contratos operacionais de sessão

#### Teste e Defesas

Teste: 2d10 + Atributo + Perícia contra Dificuldade, Guarda, Fortitude ou Integridade.

Guarda = 10 + Agilidade + Proteção.

Fortitude = 10 + Corpo + Vontade.

Integridade = 10 + Vontade + Sintonia.

Guarda, Fortitude e Integridade são valores estáticos. O agente rola contra a Defesa apropriada. Perigo sem agente usa Dificuldade e é rolado pela personagem ameaçada. Não existe teste independente de Fortitude ou Integridade.

#### Predominância e Ressonância

Luz maior: efeito direto, material, público ou imediato.

Escuridão maior: efeito contextual, relacional, profundo ou posterior.

Dados iguais: Ressonância.

Em sucesso, Ressonância pode aumentar o efeito, reduzir custo, criar oportunidade, recuperar 1 Fluxo, preencher 1 Pulso ou descobrir uma relação. Em falha, pode revelar verdade útil, evitar a pior consequência, permitir nova tentativa imediata, transformar dano em condição, marcar rota de recuperação ou preencher 1 Pulso por resistência coletiva. O total continua resolvendo o objetivo; igualdade não transforma falha em sucesso.

#### Dano, turno e recursos

Turno: 1 Movimento, 1 Ação, 1 Reação e ações livres breves. Na grade ortogonal, há 6 pontos de movimento; lado custa 1, diagonal custa 2 e adjacência exige lado compartilhado.

Dano final = dano-base × potência + margem + modificadores fixos + Corpo quando Potente − Proteção.

Ataque comum x1; Nível/Grau I x2; II x3; III x4; IV x5. Sucesso forte: +2 dano. Sucesso extraordinário: +4 dano. O dano-base é o único termo multiplicado; Proteção é subtraída depois.

Vitalidade = 10 + (Corpo × 3). Lucidez = 8 + (Vontade × 3). Fluxo = 3 + Sintonia + metade do Marco, arredondada para cima. Fôlego máximo = 3. Determinação começa em 1 por sessão, tem teto 3 e não é redefinida por descanso.

#### Recuperação

Pausa Segura: Fôlego ao máximo; recupera 1 + metade da Sintonia, arredondada para cima, em Fluxo até o máximo. Não recupera Vitalidade, Lucidez ou Determinação por padrão e não apaga consequências persistentes.

Descanso Completo: Fôlego, Fluxo, Vitalidade e Lucidez ao máximo. Não redefine Determinação e não apaga Ferimentos Graves, Cicatrizes, Sombra ou consequências persistentes sem regra específica.

#### Fendas

Latente: Dificuldade 21. Ressonante: Dificuldade 15. Aberta: Dificuldade 12. Fraturada: Dificuldade 18 e consequência. Corrompida: Dificuldade 21 e risco de Sombra.

Travessia exige destino correspondente, Âncora, estado adequado, teste coletivo e custo concreto. Cada participante faz no máximo uma contribuição por sequência; em grupo com menos de três participantes, uma personagem pode realizar nova contribuição enquanto a sequência não tiver terminado, desde que use uma fonte ou abordagem distinta. São necessários 3 sucessos antes de 2 falhas; a consequência de uma falha é aplicada quando ela ocorre. A Fenda não transporta ninguém apenas porque a narrativa precisa.

#### Merge, Velarim e Coro

Merge legítimo exige identidade, autonomia, consentimento, objetivo, duração, direito de saída e consequência definida. Nenhum dado impõe Merge.

Velarim usa formas reconhecidas, contexto e relação. A IA, o jogador ou o Mestre não criam automaticamente léxico canônico durante a cena.

4 Pulsos = 1 Barra de Coro. 1–2 personagens: 1 Barra máxima. 3–4 personagens: 2 Barras máximas. 5 ou mais personagens: 3 Barras máximas. O Coro pertence ao grupo; no máximo 1 ativação por rodada.

## Glossário essencial

**Coro.** Medidor compartilhado de Ressonância Coletiva usado por um grupo conforme as regras do jogo.

**Escuridão / thuvel.** Dimensão cosmológica associada à memória, ao repouso e à profundidade, onde potencial e silêncio possuem forma própria.

**Fenda.** Ruptura intermundos que reage a condições, linguagem e Ressonância. Sua atividade expressa relações cosmológicas sem constituir uma voz profética.

**Fratura.** Evento primordial que deu origem a dois mundos materiais completos e distintos e fragmentou também história, linguagem e origens cosmológicas.

**Grande Cristal.** Nome dado à realidade unificada anterior à Fratura. Sua natureza e a causa do rompimento permanecem parcialmente interpretáveis.

**Kav.** Sombra: corrupção relacional por assimilação, falsificação e apagamento da diferença.

**Lightbringers.** Agentes preparados pela Facção Científica para operações ligadas à restauração e às travessias.

**Manesh.** Luz cosmológica legítima: manifestação, forma, presença e ordem.

**Merge.** Categoria ampla de integração ou união, legítima ou corrupta conforme identidade, autonomia, consentimento e relação.

**Vethari.** Forma legítima de Merge que preserva identidade, autonomia e consentimento entre os participantes.

**Mirveth.** Contraparte cosmológica autônoma. Cada pessoa possui existência inteira e compartilha com a outra uma origem anterior à Fratura.

**Os Outros.** Pessoas relacionadas historicamente ao Programa de Substituição e às trocas entre mundos, reunidas por experiências diversas e posições políticas próprias.

**Pedr’alma.** Pedra física marcada e reconhecida que materializa identidade, memória e pertencimento de uma comunidade sem possuir seus membros.

**Predominância.** Leitura qualitativa de qual dos dois d10 — Luz ou Escuridão — prevaleceu numa rolagem, conforme a regra vigente.

**Ressonância.** Fenômeno cosmológico real. Quando os dois d10 exibem o mesmo resultado natural, a mecânica sinaliza ou manifesta uma Ressonância na linguagem do jogo; os dados não criam o fenômeno.

**Silma.** Luz física, fenômeno ótico e material.

**Silmain.** Sistema de escrita nativa de Velarim baseado em sinais lexicais; suas formas preservam a memória geométrica do Cristal.

**Sombra.** Ver kav.

**Trocado.** Pessoa deslocada entre os mundos pelo Programa de Substituição e criada fora do mundo de origem.

**Velarim.** Língua da realidade anterior à Fratura, preservada em tradições incompletas e governada por estrutura e léxico atestados.

**Vesilma.** Ausência de luz física, descrita no campo ótico e material.

---
