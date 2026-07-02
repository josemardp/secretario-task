# Handoff: Card de Tarefa da Timeline (altura fixa)

## Overview
Padronização do card de tarefa usado na timeline de um app de agenda mobile (React + Tailwind). Hoje a altura do card varia com o conteúdo (título de 1–3 linhas, presença ou não de badges), quebrando o ritmo visual da lista ao rolar. Este handoff define uma altura fixa para o card recolhido, uma distribuição fixa de todos os elementos possíveis dentro dessa altura, e um comportamento de truncamento + expansão sob demanda.

## About the Design Files
Os arquivos deste pacote (`Card de Tarefa - Timeline.dc.html` + `support.js`) são **referências de design em HTML/React** — um protótipo interativo que demonstra a estrutura, as regras de layout e o comportamento pretendido (toque para expandir, arraste para revelar ações). **Não é para copiar o HTML/JS diretamente.** A tarefa é recriar esse comportamento no ambiente já existente do app (React Native, provavelmente, dado o contexto mobile — ajustar para o stack real do projeto) usando os componentes, tokens e padrões já estabelecidos na base de código.

Para abrir o arquivo `.dc.html`: é um arquivo HTML autocontido, abra direto no navegador (arraste para uma aba) — ele carrega `support.js` do mesmo diretório. Interaja com os 3 cards de exemplo para ver toque-para-expandir e arraste (swipe) funcionando.

## Fidelity
**Alta fidelidade (hifi)** para estrutura, medidas e comportamento — as posições, alturas em px e regras de layout abaixo devem ser seguidas com precisão. As cores usam exatamente a paleta informada pelo usuário (ver Design Tokens). Ícones são placeholders de linha simples (SVG inline) — substituir pelos ícones reais do design system do app, se diferentes.

## O problema que isso resolve
O card crescia/encolhia conforme: título (1 a 3 linhas), presença de badge "ATRASADA", indicador de prioridade (P#), badge "Adiada Nx". Isso fazia os cards da timeline terem alturas diferentes entre si. A solução: altura fixa para o estado recolhido, com 3 "linhas" de conteúdo sempre reservadas (mesmo vazias), e o título trunca com reticências + chevron quando não cabe — expandindo sob toque.

## Screens / Views

### Card de tarefa — estado recolhido (padrão)
**Propósito:** exibir uma tarefa na lista da timeline com altura idêntica a qualquer outro card, independente do conteúdo.

**Layout externo:**
- Largura: `358px` num viewport de 390px (16px de margem lateral cada lado). Estica para preencher a largura do container pai — os 358px são o resultado nesse viewport de referência, não um valor hardcoded.
- Altura recolhida: **≈140px**, resultado de:
  - padding interno do card: `14px` em todos os lados
  - Linha 1 (meta): `min-height: 24px`
  - gap `6px` (margin-top da linha 2)
  - Linha 2 (título): `min-height: 44px` (2 linhas de texto a 16px/lineheight 22px)
  - gap `6px` (margin-top da linha 3)
  - Linha 3 (adiada): `min-height: 22px`
  - Soma: 14 + 24 + 6 + 44 + 6 + 22 + 14 = **130px** de conteúdo + bordas ≈ **140px** com a borda de 1px. Ajustar no dev tools da base real do app (fontes/line-height podem variar ligeiramente); o importante é que os `min-height` por linha sejam idênticos em todo card, garantindo altura constante.
- `border-radius: 20px`, `border: 1px solid` cor de borda do tema, fundo = cor de superfície do tema.
- Estrutura interna: `display:flex` com duas colunas — círculo de concluir (esquerda, largura fixa) + coluna de conteúdo (direita, `flex:1`).

**Componentes, em ordem de leitura:**

1. **Círculo "concluir tarefa"** (esquerda)
   - `40×40px`, `border-radius: 50%`, `border: 2px solid` (cor neutra "circleBorder" — ver tokens), fundo transparente.
   - Estado concluído: fundo preenchido com a cor de destaque (accent) + ícone de check branco (24×24 viewBox, stroke-width 3) centralizado.
   - `margin-top: 2px` para alinhar opticamente com a primeira linha de texto.
   - Alvo de toque independente — ver seção Interações.

2. **Coluna de conteúdo** (`flex:1`, `min-width:0`, `padding-right: 30px` para não colidir com o botão editar)

   - **Linha 1 · meta** (`display:flex; align-items:center; gap:8px; min-height:24px`)
     - Horário (ex: "17:00 – 17:30"): `font-size:14px; font-weight:700; white-space:nowrap` — nunca quebra linha, cor secundária/muted.
     - Espaçador flexível (`flex:1`) empurra o restante para a direita.
     - Badge **ATRASADA** (só quando atrasada = true): fundo vermelho translúcido, borda vermelha translúcida, texto vermelho, `font-size:10px; font-weight:800; letter-spacing:0.03em; text-transform:uppercase; padding:3px 7px; border-radius:7px`.
     - Indicador de **prioridade** (só quando priority > 0): bolinha de `6×6px` (`border-radius:50%`) + texto "P{n}" (`font-size:13px; font-weight:700`). Cor da bolinha: vermelho (`#EF4444`) se priority ≥ 8, neutra/muted se priority < 8 — ajustar o corte exato conforme regra de negócio real do app.
     - Botão **editar** (lápis): posicionado **fora do fluxo da linha 1**, `position:absolute; top:10px; right:8px`, alvo de toque `32×32px`, ícone 16×16px. Fica sempre no canto superior direito do card, nunca disputa espaço com os badges — é isso que garante que o pior caso (atrasada + prioridade + editar) sempre caiba numa linha só.

   - **Linha 2 · título** (`position:relative; min-height:44px; margin-top:6px`)
     - Ícone de **recorrência** (setas circulares, só quando recorrente = true): 15×15px, `margin-top:4px` para alinhar com a primeira linha do título, `gap:6px` até o texto.
     - **Título**: `font-size:16px; font-weight:800; line-height:22px`. Recolhido: clamp de 2 linhas (`display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden`) — ou equivalente nativo do stack real (ex: `numberOfLines={2}` em React Native Text). Expandido: sem clamp (linhas ilimitadas).
     - **Chevron de expansão** (só quando o título está truncado OU já expandido): ícone `14×14px`, posicionado `position:absolute; right:0; bottom:0`, sobre um gradiente horizontal (transparente → cor de fundo do card) para o texto não cortar bruscamente contra o ícone. Aponta para baixo (⌄) recolhido, gira 180° (⌃) expandido, `transition: transform 0.2s ease`.

   - **Linha 3 · adiada** (`display:flex; align-items:center; min-height:22px; margin-top:6px`)
     - Badge **"Adiada Nx"** (só quando adiada > 0): fundo neutro (surface-2), texto muted, `font-size:12px; font-weight:600; padding:4px 9px; border-radius:8px`.
     - **Quando não existe adiada, a linha permanece vazia mas reserva os 22px de altura** — esse é o mecanismo central que garante altura idêntica entre um card sem nenhum badge extra e um card com todos os badges.

### Card de tarefa — estado expandido
Mesma estrutura, mas:
- Título sem clamp (todas as linhas visíveis).
- Chevron aponta para cima (⌃).
- Altura do card cresce automaticamente (sem animação de altura manual — deixar o layout/flow nativo resolver; não hardcodar uma altura de destino).
- Cards abaixo na lista são empurrados para baixo pelo fluxo normal do layout (não precisa position absoluta nem overlay).

## Interactions & Behavior

### Toque para expandir/recolher
- Toque simples (tap) em qualquer área do corpo do card (fora do círculo de concluir e do botão editar) alterna entre recolhido e expandido.
- **Distinção toque vs. arraste**: usar um limiar de deslocamento horizontal de **~6px** desde o `pointerdown`. Se o dedo se mover menos que isso no eixo X (ou o movimento for majoritariamente vertical) antes do `pointerup`, é toque → expande/recolhe. Se ultrapassar o limiar, é arraste → não expande, cai no fluxo de swipe abaixo.
- Implementação de referência: `onPointerDown` guarda posição inicial; `onPointerMove` marca `moved = true` só se `abs(dx) > 6 && abs(dx) > abs(dy)`; `onPointerUp` decide entre swipe-settle (se `moved`) ou toggle-expand (se não `moved`).

### Truncamento (medição real, não heurística de caracteres)
- Após montar (e após cada atualização, enquanto recolhido), medir `scrollHeight` vs `clientHeight` do elemento de título. Se `scrollHeight > clientHeight`, o título está de fato truncado → mostrar o chevron. Evita heurísticas de contagem de caracteres, que falham com fontes/larguras diferentes.
- Em React Native, o equivalente é o callback `onTextLayout` do `<Text numberOfLines={2}>`, comparando o número de linhas real reportado.

### Swipe (arrastar para os lados)
- Arrastar para a **direita** revela a ação "Adiar para amanhã" (ação à esquerda, por baixo do card, fundo `#4F46E5`/accent, ícone de calendário + label, faixa de `88px`).
- Arrastar para a **esquerda** revela "Excluir" (ação à direita, por baixo do card, fundo `#EF4444`, ícone de lixeira + label, faixa de `88px`).
- Deslocamento do card limitado a `±88px` (`Math.max(-88, Math.min(88, dx))`).
- Ao soltar: se `abs(deslocamento) > 44px` (metade do curso), o card "assenta" no valor final (`±88px`, ação revelada); caso contrário, volta a `0`.
- **Importante (lição aprendida no protótipo):** não trocar `transition` de `none` para uma transição CSS animada no mesmo frame em que o valor de transform muda para o valor final — em contextos onde a aba/webview perde foco, a transição pode nunca completar (fica "presa" no valor intermediário do último `pointermove`). Preferir um **snap instantâneo** (sem transição) para o assentamento final, ou — se quiser animação — impulsionar via JS (spring/rAF) e não depender de uma `transition` CSS dependente de foco da página. No protótipo de referência optamos pelo snap instantâneo por robustez.
- Tocar numa ação revelada (Adiar/Excluir) dispara a ação real e deve fechar o swipe (voltar a `0`) depois.

### Toques independentes
- **Círculo de concluir** e **botão de editar** devem interromper a propagação do gesto (`stopPropagation` em `pointerdown`, `pointerup` e `click`) para que tocar neles nunca dispare expansão nem interfira no distinguidor de swipe do card.

## State Management
Por card (chaveado por id da tarefa):
- `expanded: boolean` — recolhido/expandido.
- `dragX: number` — deslocamento horizontal atual do swipe (0 quando fechado).
- `truncated: boolean` — resultado da medição real do título (recalculado a cada render enquanto recolhido).
- `completed: boolean` — estado do círculo de concluir (no app real, deve refletir/gravar o estado real da tarefa, não só UI).
- Estado transitório de gesto (não precisa ir para o state global da tarefa): posição inicial do toque, se houve movimento (`moved`), id do card em arrasto ativo.

Tweak de produto opcional demonstrado no protótipo: "recolher outros cards ao expandir um novo" (comportamento de acordeão) — decidir com o time de produto se é o padrão desejado ou se múltiplos cards podem ficar expandidos simultaneamente.

## Design Tokens

### Cores — tema escuro (padrão das capturas originais)
- Fundo (app): `#0A0A0B`
- Superfície (card): `#18181B`
- Superfície secundária (badge "Adiada"): `#27272A`
- Borda: `#27272A`
- Texto primário: `#FAFAFA`
- Texto secundário/muted: `#A1A1AA`
- Destaque (accent — botão "Hoje", chevron, círculo concluído, ação "Adiar"): `#6366F1`
- Vermelho (atraso, prioridade alta, ação "Excluir"): `#EF4444`
- Borda do círculo "concluir" (não concluído): `#3F3F46`

### Cores — tema claro
- Fundo: `#FAFAFA`
- Superfície (card): `#FFFFFF`
- Superfície secundária: `#F4F4F5`
- Borda: `#E4E4E7`
- Texto primário: `#18181B`
- Texto secundário/muted: `#71717A`
- Destaque: `#4F46E5`
- Vermelho: `#EF4444` (mesmo valor nos dois temas)

### Tipografia
- Família: sans-serif do sistema (`-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto`) — trocar pela fonte real do app, se diferente.
- Horário: 14px / 700 / nowrap
- Badge ATRASADA: 10px / 800 / letter-spacing 0.03em / uppercase
- Prioridade "P#": 13px / 700
- Título: 16px / 800 / line-height 22px
- Badge "Adiada Nx": 12px / 600

### Espaçamento / dimensões
- Largura do card: 358px (viewport de referência 390px, margem 16px)
- Altura recolhida: ≈140px (ver detalhamento acima)
- Padding interno do card: 14px
- Círculo concluir: 40×40px, borda 2px
- Botão editar: alvo de toque 32×32px, ícone 16px
- Ícone de recorrência: 15×15px
- Chevron: 14×14px
- Raio de borda do card: 20px
- Raio de borda dos badges: 7–8px
- Faixas de ação do swipe: 88px cada lado

## Assets
Ícones usados no protótipo são SVGs inline simples (stroke, sem preenchimento) — não são assets de arquivo, apenas placeholders de forma. Substituir pelo conjunto de ícones real do design system do app (editar/lápis, recorrência/setas circulares, check, calendário, lixeira, chevron).

## Screenshots
- `screenshots/01-collapsed-standard-and-worst-case.png` — os dois casos extremos lado a lado, ambos com a mesma altura recolhida: card "padrão" (sem atraso/prioridade, só Adiada 1x) e card "pior caso" (atrasada + prioridade + recorrência + Adiada 11x).
- `screenshots/02-truncated-collapsed.png` — card com título longo, recolhido: título corta em 2 linhas com o chevron "⌄" indicando que há mais conteúdo.
- `screenshots/03-expanded.png` — o mesmo card após o toque: título completo, sem corte, chevron virado para cima ("⌃"), card mais alto.
- `screenshots/04-anatomy-guides.png` — overlay de anatomia sobre o card "pior caso", com as 3 linhas (meta / título / adiada) demarcadas e rotuladas.

## Files
- `Card de Tarefa - Timeline.dc.html` — protótipo interativo completo (estrutura, medidas, toque para expandir, swipe, guias de anatomia opcionais). Abrir direto no navegador.
- `support.js` — runtime necessário para o protótipo rodar (não é código de produto, é só o motor do protótipo).
- `screenshots/` — capturas dos estados descritos acima.
