# Handoff: Tela Principal (Agenda) — Reorganização Visual

## Overview
Redesign da tela principal de um app de gestão de tarefas/agenda (PWA, React + Tailwind), mobile-first (360–390px). Mantém 100% das funções existentes; muda apenas a disposição, hierarquia e estilo, resolvendo três problemas do layout atual:
1. Bloco de ações rápidas (Foco/Busca/Config) + botão "Mês" com espaço vazio e desalinhamento.
2. Botão flutuante "+" sobreposto ao conteúdo da lista ao rolar (colidia com o link "Reabrir").
3. Topo da tela ocupando altura demais, sobrando pouco espaço vertical para a timeline (conteúdo principal).

## About the Design Files
O arquivo neste pacote é uma **referência de design em HTML** (Design Component / protótipo), não código de produção para copiar diretamente. A tarefa é **recriar este layout no ambiente já existente do app** (React + Tailwind CSS), usando os componentes, hooks e padrões de estado já estabelecidos no código real — mantendo toda a lógica de negócio atual (edição de tarefa, gravação de áudio, troca de dia via calendário, etc.), só trocando a camada visual/estrutural pela proposta abaixo.

## Fidelity
**Alta fidelidade (hifi)**: cores exatas, tipografia, espaçamento e cantos arredondados definidos abaixo devem ser seguidos à risca. Interações (slider de energia, abrir/fechar compositor, popover de mês) estão prototipadas e funcionam no arquivo HTML anexo — use-as como especificação de comportamento.

## Nova estrutura (topo → base), por "linha"/bloco

1. **Cabeçalho solto (sem cartão)** — saudação por horário em fonte serifada itálica ("Boa tarde."), e logo abaixo, em texto secundário, a data por extenso + contagem ("Quarta-feira, 1 de julho · 4 para hoje"). Texto direto sobre o fundo da página, sem superfície/cartão.
2. **Cartão único de controles do dia** — um só `card` (superfície + borda + `border-radius: 20px`) com duas seções internas separadas por um filete de 1px:
   - **Linha A — Energia**: ícone de raio + label "Energia" + slider customizado (trilho + preenchimento na cor de destaque + thumb branco) + valor "N/10" à direita.
   - **Linha B — Ações**: à esquerda, 3 botões quadrados de 40×40px (`border-radius: 13px`) para Foco (com bolinha de notificação no canto), Busca, Configurações; à direita, na mesma linha, o botão pill "Mês" (mesma altura, 40px). `justify-content: space-between` faz os dois grupos ocuparem as extremidades do cartão — elimina o vão vazio e o desalinhamento do layout atual.
   - Buscar, ao tocar, expande uma linha extra dentro do próprio cartão com um campo de busca (não abre modal).
3. **Timeline do dia** — bloco dominante, ocupa todo o espaço restante (`flex: 1; overflow-y: auto`) abaixo do cabeçalho fixo. Blocos de 30 em 30 min; horários vazios como linha fina + label secundário; horários com tarefa como cartão (`border-radius: 18px`) contendo: círculo de status (check), faixa de horário, indicador de prioridade (bolinha + "P#"), ícone de editar (lápis), e o título da tarefa em destaque. Linha "agora" em vermelho (`#EF4444`) cruzando o horário atual.
4. **"Resolvidas neste dia"** — não é mais uma pilha de cartões soltos: é **um único cartão** com cabeçalho (título + contador) e subtítulo, e cada item é uma linha interna separada por `border-top`, com: label "CONCLUÍDA · hora" em cima, título embaixo, e link "Reabrir" à direita.
5. **Barra de navegação inferior fixa com "+" embutido** — duas abas (Agenda ativa / Painel inativa) com ícone + label. O botão "+" deixa de flutuar sobre a lista: agora é um círculo elevado (58px, borda grossa na cor de fundo para dar efeito de "recorte"), centralizado e sobreposto à própria barra de navegação, entre as duas abas. Como a barra é uma região fixa separada da lista rolável, o botão nunca mais colide com o conteúdo.
6. **Compositor de nova tarefa** — ao tocar no "+", abre um painel ancorado à barra de navegação (não mais flutuando sobre a lista): campo de texto + botão de microfone (grava áudio; fica destacado em vermelho enquanto "gravando") + botão de enviar (seta, na cor de destaque).
7. **Calendário mensal** — o botão "Mês" abre um popover ancorado logo abaixo do cartão de controles, com grade de 7 colunas e o dia atual destacado na cor de destaque.

## Interactions & Behavior
- **Slider de Energia**: arrastável (`pointerdown` + `pointermove` no documento), valor 0–10, atualiza o texto "N/10" e o preenchimento do trilho em tempo real.
- **Busca**: toque no ícone de lupa expande/recolhe um campo de busca dentro do cartão de controles (sem reflow do resto da página).
- **Mês**: toque abre/fecha um popover de calendário; toque fora ou no X fecha.
- **"+" (nova tarefa)**: toque abre um painel deslizando a partir da base, ancorado acima da barra de navegação; contém campo de texto (autofoco), botão de microfone (alterna estado "gravando" — fundo vermelho, ícone branco) e botão de enviar.
- **Prioridade**: bolinha + label "P#" — cor neutra (secundária) para prioridade baixa/média, vermelho (`#EF4444`) para prioridade alta (ex.: P8).
- **Linha "agora"**: linha vermelha de 2px cruzando a timeline na hora atual, com o horário em vermelho à esquerda.
- Sem alterações de fluxo/navegação — mesmas duas abas (Agenda/Painel), mesma função de cada botão.

## State Management
Nenhum estado novo de produto é necessário — apenas estado de UI local por tela:
- `energy` (0–10, numérico) — já existente, só muda a forma de captura (slider customizado).
- `composeOpen` (boolean) + `composeText` (string) + `recording` (boolean) — controla o painel de nova tarefa.
- `searchOpen` (boolean) — controla a expansão do campo de busca.
- `monthOpen` (boolean) — controla o popover do calendário.
- Dados de tarefas, timeline e itens resolvidos continuam vindo da lógica de dados já existente no app — este redesign não altera modelo de dados.

## Design Tokens

**Tema claro**
- Fundo (bg): `#FAFAFA`
- Superfície (surface): `#FFFFFF`
- Texto principal: `#18181B`
- Texto secundário: `#52525B`
- Borda: `#E4E4E7`
- Destaque (accent): `#4F46E5`

**Tema escuro**
- Fundo (bg): `#0A0A0B`
- Superfície (surface): `#18181B`
- Texto principal: `#FAFAFA`
- Texto secundário: `#A1A1AA`
- Borda: `#27272A`
- Destaque (accent): `#6366F1`

**Semânticas (ambos os temas)**
- Linha "agora" / prioridade alta: `#EF4444`
- Gravando áudio (mic ativo): fundo `#EF4444`, ícone branco

**Tipografia**
- Display/saudação: serifada, itálica, peso 600 (ex.: Playfair Display italic), ~29px no cabeçalho.
- Restante da UI: sans-serif, peso 400–800 (ex.: Manrope). Corpo ~13–14px, títulos de tarefa ~16px/800, labels pequenos ~11–12px.

**Espaçamento / raio**
- Cartões: `border-radius: 18–20px`.
- Botões de ícone: `40×40px`, `border-radius: 13px`.
- Botão "+": `58px` de diâmetro, círculo.
- Barra de navegação inferior: `70px` de altura.
- Paddings de cartão: `13–16px`.

## Assets
Nenhum asset externo — todos os ícones são SVG inline (linha, `stroke-width: 2`, sem preenchimento, no estilo outline). Nenhuma imagem/foto usada.

## Files
- `Tela Principal - Proposta.dc.html` — protótipo interativo com os dois temas (claro/escuro) lado a lado e a descrição da hierarquia. Abra no navegador para ver e interagir com o slider, o popover de mês, a busca e o compositor de nova tarefa.
