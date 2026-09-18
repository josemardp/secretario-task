# Auditoria UX Completa — SecretárioTask
**Diretor de Produto Sênior | UX Mobile & Sistemas de Produtividade**
**Data:** 25/05/2026
**Restrição central:** mobile-first absoluto — Android e iOS, viewport ~384px

---

## PREMISSA INEGOCIÁVEL

O uso principal do app é mobile (Android/iOS, ~384px de largura).
Toda sugestão neste documento foi concebida mobile-first.
Nenhuma melhoria deve ser implementada sem validação em dispositivo real
(não apenas DevTools de browser).

**Regras que nunca devem ser violadas durante qualquer refactor:**

- **Tap targets:** mínimo 44×44px (Apple HIG + Material Design)
- **Safe area iOS:** sempre usar `env(safe-area-inset-bottom)` em elementos fixos/sticky
- **Touch events:** qualquer elemento interativo precisa de feedback visual em `touchstart` (não apenas hover, que não existe em mobile)
- **Scroll horizontal:** usar `-webkit-overflow-scrolling: touch` e `scrollbar-width: none`
- **Inputs em mobile:** evitar zoom automático do iOS — font-size mínimo de **16px** em campos de texto (abaixo disso o iOS faz zoom automático ao focar)
- **Drag and drop:** o HTML5 Drag API **NÃO** funciona em mobile por padrão. Qualquer interação de arrastar precisa de implementação touch explícita com `onTouchStart` / `onTouchMove` / `onTouchEnd`

---

## PARTE 1 — AUDITORIA DO ESTADO ATUAL

---

### 1.1 Tela Home — Hierarquia Visual
**Diagnóstico: CRÍTICO**

A ordem atual de leitura: logo → contextos → energia → Foco do Dia → input → abas.
O olho percorre 6 zonas antes de chegar à ação principal do dia.

**Problema central:** o input de captura fica abaixo do briefing, forçando scroll antes de agir. Em tela de 384px, o "Foco do Dia" deveria ser o item mais proeminente, seguido imediatamente pela barra de captura.

O header "SecretárioTask" ocupa 56px com peso visual alto sem funcionalidade — é decoração pura. O botão "Sair" no header principal é um erro de arquitetura de informação: ninguém precisa sair com frequência, mas está no mesmo nível visual que as ações centrais.

**Impacto mobile específico:**
Em dispositivos com tela de 360px (ex: Moto G, Samsung A-series populares no Brasil), o fold acontece ainda mais cedo. O input de captura pode estar até 200px abaixo do que o usuário vê ao abrir o app.

---

### 1.2 Tela Home — Densidade de Informação
**Diagnóstico: CRÍTICO**

Above the fold visível na tela de 384px:
- Header (56px)
- Chips de contexto (48px)
- Slider de energia (48px)
- Título "Foco do Dia" + botão Briefing (36px)
- Início dos cards Top 1/2/3

Os Top 3 já estão parcialmente fora da viewport sem scroll. O input de captura — ação primária do app — só aparece após scroll.

O slider de energia está correto em conceito mas errado em posição e tamanho. Consome 48px de altura e é visualmente proeminente demais para uma configuração que o usuário raramente altera mid-session.

**Impacto mobile específico:**
Em iOS, o teclado virtual ao focar no input empurra o conteúdo para cima, reduzindo a viewport em até 40%. Com o layout atual, ao abrir o teclado para capturar uma tarefa, os cards do Top 3 desaparecem da tela completamente — o usuário perde o contexto do que estava fazendo.

---

### 1.3 Tela Home — Ações Principais
**Diagnóstico: MODERADO**

O CTA mais importante (adicionar tarefa) não é o mais fácil de acionar.

Problemas identificados:
- O campo textarea tem placeholder longo ("Despeje suas tarefas aqui... use Enter para pular linha") que compete visualmente com o conteúdo
- O botão "Add" tem ~44px de altura — mínimo aceitável, mas sem destaque suficiente para ser o CTA principal da tela
- O botão "✨ Briefing" está em posição de destaque no header da seção, mas só funciona com API Key configurada. Quando desabilitado fica cinza e continua ocupando espaço primário — confunde novos usuários
- **A ação mais importante (marcar como feito) não existe na home.** O usuário precisa ir para a Agenda para concluir uma tarefa. Fluxo quebrado.

**Impacto mobile específico:**
O botão de microfone usa `onMouseDown`/`onMouseUp` para detectar o press. Em mobile, mouse events têm delay de ~300ms e comportamento inconsistente entre Android e iOS. O código atual já tem `onTouchStart`/`onTouchEnd` para o microfone — isso está correto e **deve ser preservado em qualquer refactor**. Nunca remover os touch handlers ao "limpar" o código.

---

### 1.4 Tela Home — Consistência
**Diagnóstico: MODERADO**

Sistema de cores duplo e inconsistente:
- **Indigo:** chips de contexto ativos, slider de energia, botão Add, abas ativas
- **Vermelho:** tag "Prioridade Alta", status "Atrasada"
- **Roxo:** botão "✨ Briefing"

Três sistemas visuais paralelos sem hierarquia semântica clara.

Emojis misturados com componentes de interface:
- 🎯 no título "Foco do Dia"
- ✨ no botão Briefing
- 📊 ⏳ 📈 nas abas de navegação

O PHILOSOPHY.md do próprio projeto proíbe explicitamente isso ("sem emojis por padrão"). O código contradiz a filosofia documentada.

**Impacto mobile específico:**
Emojis renderizam de forma inconsistente entre Android (Noto Emoji) e iOS (Apple Emoji). O mesmo emoji pode ter tamanho, peso visual e posicionamento diferentes nos dois sistemas. Em elementos de navegação críticos como a tab bar, isso cria inconsistência visual real entre dispositivos.

---

### 1.5 Tela Agenda — Pontos de Fricção Críticos
**Diagnóstico: CRÍTICO**

A tarefa "musculação" aparece marcada como "Atrasada" às 16:00. A interface apresenta 3 ações (Concluir / Amanhã / Adiar) com peso visual similar — o usuário hesita sobre qual escolher.

Problemas específicos:
- Botão "Concluir": área de tap de ~36px, **abaixo do mínimo de 44px**
- "Amanhã" e "Adiar" são semanticamente próximos e visualmente idênticos
- Os botões de ação ficam dentro do card sem altura de tap garantida
- A label "Atrasada" usa fundo laranja/amarelo + ícone ⚠️ — sinalização dupla redundante
- Slots vazios (13:30→15:30) dominam a tela — metade do scroll sem informação útil
- Não há linha de "agora" na timeline. O usuário não sabe onde está no tempo
- A agenda abre no topo (13:30), não no horário atual. O usuário precisa scrollar para o presente
- Para concluir uma tarefa: abrir agenda → scroll até o horário → identificar o card → tocar "Concluir" — **4 passos para a ação mais frequente do app**

**Impacto mobile específico:**
Com múltiplas tarefas atrasadas empilhadas na Agenda, o usuário precisa rolar até cada card e acertar botões pequenos dentro de um layout denso. Em dispositivos com tela menor (360px) ou dedos grandes, a taxa de tap errado nos botões "Concluir" vs "Amanhã" é alta.

Padrão correto para mobile: swipe actions. Swipe para direita = Concluir (verde). Swipe para esquerda = menu de opções (Amanhã / Adiar / Excluir). Isso elimina a necessidade de botões visíveis permanentemente e aumenta a área de tap para 100% da largura do card.

---

### 1.6 Inconsistência Filosófica (Código vs. Documentação)
**Diagnóstico: CRÍTICO (débito de produto)**

O PHILOSOPHY.md define explicitamente:
> "MVP NÃO inclui: LLM, embeddings, pgvector, busca semântica, voice capture, recorrência"

Mas o código atual em produção contém:
- `transcribeAudio()` em Home.tsx
- `generateEmbedding()` em Home.tsx
- `generateSmartBriefing()` em Home.tsx
- `handleSemanticSearch()` com pgvector em Home.tsx
- `recurrence_rule` no schema de Task (types/index.ts)
- Migração `0002_pgvector_intelligence.sql`
- Migração `0004_task_recurrence.sql`

**Impacto mobile específico:**
Funcionalidades que dependem de API key externa (OpenAI) criam estados de erro silenciosos no mobile. O usuário mobile que não configurou a chave vê botões cinzas sem entender por quê — e não tem o contexto de desktop para ir até as configurações facilmente. A dependência de serviços externos também significa que funcionalidades centrais da UI (briefing, voz, busca) ficam quebradas em conexões móveis instáveis — violando diretamente o P6 (Offline primeiro) da filosofia do produto.

---

## PARTE 2 — PLANO DE MELHORIAS PRIORIZADAS

---

### NÍVEL 1 — QUICK WINS (impacto alto, esforço baixo)

---

#### [QW-1] Barra de Captura Sticky no Rodapé

**Problema que resolve:** scroll obrigatório antes de capturar qualquer tarefa. Em um app cuja filosofia central é "captura em menos de 5 segundos", exigir scroll antes de capturar é uma contradição estrutural.

**Como implementar (mobile-safe):**
```css
position: sticky;
bottom: calc(56px + env(safe-area-inset-bottom));
z-index: 10;
background: white;
border-top: 0.5px solid var(--border-color);
```

O `env(safe-area-inset-bottom)` é **obrigatório** para iPhones com Face ID/Dynamic Island. Sem ele, a barra fica parcialmente sob o indicador home do iOS em dispositivos como iPhone 12 em diante.

O campo de texto **DEVE** ter `font-size` mínimo de **16px** para evitar o zoom automático do iOS ao focar. O código atual usa `text-sm` (14px) — isso causará zoom involuntário em todos os iPhones. Corrigir para `text-base` (16px) ou adicionar `style={{ fontSize: '16px' }}` explicitamente.

**Esforço estimado:** 1 dia.
**Referência:** Things 3 — quick entry sempre acessível, respeitando safe areas.

---

#### [QW-2] Header Compacto (44px)

**Problema que resolve:** 56px desperdiçados com título decorativo.

**Como implementar (mobile-safe):**
```css
height: 44px; /* mínimo para tap target do botão de settings */
padding-top: env(safe-area-inset-top); /* necessário em PWA fullscreen */
```

- À esquerda: chip do contexto ativo (altura 28px, padding horizontal 12px, tap area expandida com `min-height: 44px` no elemento pai)
- Ao centro: data atual discreta ("seg, 25 mai"), `font-size: 12px`
- À direita: indicador de energia (3 barras, tap area 44×44px) + settings
- "Sair" vai para dentro do drawer de settings — nunca exposto no header

**Atenção:** se o app for instalado como PWA (já tem manifesto configurado), o status bar do sistema fica acima do app. O `padding-top` com `env(safe-area-inset-top)` evita que o header sobreponha o status bar do sistema operacional.

**Esforço estimado:** 0,5 dia.
**Referência:** Linear — header mobile com safe areas corretas.

---

#### [QW-3] Hierarquia Visual Top 1 / Top 2 / Top 3

**Problema que resolve:** os três cards têm tamanho idêntico — Top 1 não domina visualmente.

**Como implementar:**
- **Top 1:** `padding: 16px`, título `font-size: 18px bold`, `border-left: 4px solid #6366f1`, fundo `indigo-50`
- **Top 2/3:** `padding: 10px`, `font-size: 14px`, ghost card com `border: 1px solid #e5e7eb`

**Esforço estimado:** 0,5 dia.
**Referência:** Things 3 — área "Today" com destaque para o primeiro item.

---

#### [QW-4] Badge de Prioridade Compacto

**Problema que resolve:** "Prioridade Alta (P8)" tem 18 caracteres onde cabem 2.

**Como implementar:** Pill `P8` com 28px de largura. Cor semântica: vermelho (P7–P10), laranja (P4–P6), cinza (P1–P3).

**Esforço estimado:** 0,5 dia.
**Referência:** Linear, Jira.

---

#### [QW-5] Hora Agendada Inline nos Cards do Foco do Dia

**Problema que resolve:** o usuário não sabe quando executar o Top 1.

**Como implementar:** Sub-linha abaixo do título: `16:00 · 120min` em `font-size: 12px`, `color: #6b7280`. Se não tiver hora agendada: `"Sem horário — toque para agendar"`.

**Esforço estimado:** 0,5 dia.
**Referência:** Things 3, Fantastical.

---

#### [QW-6] Hierarquia de Ações na Agenda

**Problema que resolve:** botões de ação com tap targets insuficientes e peso visual idêntico.

**Como implementar (mobile-safe):**
```
"Concluir"   → botão primário, verde sólido, min-height: 44px, width: 100%
"Amanhã"     → botão secundário outline, min-height: 44px
"Adiar para" → link text discreto, min-height: 44px (via padding vertical)
"Excluir"    → separado visualmente, vermelho, min-height: 44px
```

**Implementação avançada recomendada — swipe actions:**
- Swipe direita no card → "Concluir" (ação verde, ícone check)
- Swipe esquerda no card → revela "Amanhã" e "Excluir"
- Implementar com `onTouchStart`, `onTouchMove`, `onTouchEnd` no card
- Threshold de ativação: 80px de deslocamento horizontal
- Feedback visual: card desliza revelando cor de fundo da ação
- Biblioteca recomendada: `react-swipeable` (leve, sem dependências pesadas)

**Esforço estimado:** 0,5 dia (versão com botões) ou 3 dias (swipe actions).
**Referência:** Todoist mobile — swipe to complete é o gesto mais natural.

---

#### [QW-7] Linha de "Agora" + Scroll Automático na Agenda

**Problema que resolve:** agenda abre às 13:30, sem indicação do tempo atual.

**Como implementar:**
- Linha horizontal vermelha `2px` com label `"15:31"` na posição atual
- Ao montar a tela: `scrollTo(currentTime - 30min)` automaticamente
- Slots vazios: altura reduzida para 24px (em vez de 64px)

**Esforço estimado:** 1 dia.
**Referência:** Google Calendar, Fantastical.

---

#### [QW-8] Tab Bar Nativa sem Emojis

**Problema que resolve:** emojis renderizam de forma inconsistente entre Android e iOS; contradizem a filosofia do produto.

**Como implementar (mobile-safe):**
```css
position: fixed;
bottom: 0; left: 0; right: 0;
height: calc(56px + env(safe-area-inset-bottom));
padding-bottom: env(safe-area-inset-bottom);
background: white;
border-top: 0.5px solid border-color;
z-index: 20;
```

Cada aba: `flex: 1`, `min-height: 44px`, ícone SVG 20px + label 10px.
Substituir por ícones Tabler ou Lucide monocromáticos: `layout-kanban`, `calendar-days`, `chart-bar`. Ativo em `#6366f1`, inativo em `#9ca3af`.

**Atenção:** com a tab bar em `position: fixed`, o conteúdo principal precisa de:
```css
padding-bottom: calc(56px + env(safe-area-inset-bottom) + 52px);
/* 52px = altura da barra de captura sticky */
```
Sem isso, o último item do Kanban fica escondido atrás da UI chrome.

**Esforço estimado:** 0,5 dia.
**Referência:** Superhuman mobile — iconografia consistente, sem emojis.

---

### NÍVEL 2 — REDESIGN ESTRATÉGICO (impacto alto, esforço médio)

---

#### [RS-1] Timeline Preview Integrada na Home

**Problema que resolve:** o usuário precisa trocar de aba para saber o que vem a seguir no dia — contexto temporal ausente na tela principal.

**Como implementar (mobile-safe):**
Componente `TimelinePreview` abaixo do Foco do Dia. Lista vertical compacta de 2–3 items:
- Horário à esquerda: `width: 32px` fixo, `font-size: 11px`, `text-align: right`
- Barra de status: `width: 3px`, `height: 20px`, `border-radius: 2px`, `margin: 0 8px`
  - Cores: vermelho (`#dc2626`) se atrasada, verde (`#22c55e`) se no prazo, cinza se futura
- Título: `flex: 1`, `font-size: 12px`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap`
  - **Obrigatório** o `white-space: nowrap + text-overflow: ellipsis` — sem isso títulos longos como "Camiseta, cueca, farda, meia" vão quebrar o layout em viewports estreitas (360px)

Tap em qualquer item: navega para a aba Agenda no horário correspondente via `scrollIntoView({ behavior: 'smooth' })`.

Tap target: `min-height: 44px` por linha, mesmo que a linha visual seja menor. Implementar via `padding: 12px 0`.

**Esforço estimado:** 3–4 dias.
**Referência:** Fantastical — preview do dia integrado ao painel principal.

---

#### [RS-2] Energia Fora do Canvas Principal

**Problema que resolve:** 48px de slider above the fold para configuração que muda raramente.

**Como implementar (mobile-safe):**
Substituir slider por indicador visual compacto no header (3 segmentos coloridos, total ~32px de largura, 16px de altura). Ao tap: abre bottom sheet com o slider completo.

Especificações do bottom sheet (**críticas para mobile**):
```css
position: fixed; /* não sticky — fixed para overlay */
bottom: 0; left: 0; right: 0;
padding-bottom: env(safe-area-inset-bottom);
height: auto;
max-height: 40vh;
border-radius: 16px 16px 0 0;
```
- Fechar com: swipe down (`onTouchStart`/`onTouchMove`/`onTouchEnd`) OU tap no overlay escuro
- Nunca fechar automaticamente por timeout

O slider dentro do bottom sheet **deve** ter `height: 44px` no elemento `<input type="range">`. O Tailwind `h-2` (8px) no track é visual — a área de toque do thumb precisa ser maior:
```css
input[type=range]::-webkit-slider-thumb { width: 24px; height: 24px; }
input[type=range]::-moz-range-thumb    { width: 24px; height: 24px; }
```

**Esforço estimado:** 1,5 dias.
**Referência:** Notion mobile — configurações contextuais em bottom sheets.

---

#### [RS-3] Workspace Switcher para Perfis

**Problema que resolve:** as tabs `PM | Esdra | Pessoal | Familia | CC` parecem filtros, não contextos completos. "CC" fica cortado em alguns viewports.

**Como implementar (mobile-safe):**
Header esquerdo mostra o perfil ativo como chip: `[PM ▾]`. Tocar abre bottom sheet com lista de perfis, ícone e contagem de tarefas pendentes por perfil:
```
PM        · 12 tarefas pendentes
Pessoal   ·  4 tarefas pendentes
Família   ·  2 tarefas pendentes
```
Trocar de perfil recarrega toda a home.

**Esforço estimado:** 2 dias.
**Referência:** Linear (workspace switcher), Notion (team spaces).

---

#### [RS-4] Card de Tarefa na Agenda com 3 Zonas Fixas

**Problema que resolve:** o card expandido atual é uma lista vertical sem hierarquia de zonas. São 10 elementos em um card sem separação visual.

**Como implementar:**
Card dividido em:
- **Topo:** `⚠️ Atrasada · 16:00–17:00 · −` `120m` `+`
- **Meio:** título `bold 16px` + tags em chips compactos: `Saúde` `E:8` `P:8`
- **Rodapé:** row com `[✓ Concluir]` `[→ Amanhã]` `[⋯]` — ícone `⋯` abre menu com `Editar` e `Excluir` (vermelho)

Altura total fixa de 120px, sem scroll interno.

**Esforço estimado:** 2–3 dias.
**Referência:** Linear (issue card layout), Things 3.

---

#### [RS-5] Briefing Sempre Presente (sem Botão Manual)

**Problema que resolve:** o Briefing depende de API key e botão manual. Usuários sem chave configurada veem um botão cinza inútil no lugar mais proeminente da seção principal.

**Como implementar (mobile-safe):**
`BriefingCard` sempre renderizado usando `getDailyBriefing()` como fonte primária (síncrona e determinística). Se `aiApiKey` estiver configurada, chama `generateSmartBriefing()` de forma assíncrona e substitui o conteúdo com fade de 300ms quando retornar.

Especificações mobile:
- Banner compacto, máx 2 linhas (`line-clamp: 2`)
- Dispensável com swipe up ou tap no X (tap area 44×44px)
- Após dispensado: `localStorage.setItem('briefing_dismissed', new Date().toDateString())` — não volta no mesmo dia
- Se o texto da IA for longo: truncar com "..." e expandir ao tap em bottom sheet de `max-height: 50vh`
- **Nunca** modal full-screen para o briefing

**Esforço estimado:** 1–2 dias.
**Referência:** Superhuman — insights sempre presentes, sem ativação manual.

---

#### [RS-6] Sistema de Cores Semântico Unificado

**Problema que resolve:** dois sistemas de cores paralelos sem tokens semânticos. Ao adicionar mais contextos, o sistema visual colapsará.

**Como implementar** no `tailwind.config.ts`:
```js
colors: {
  'context-active':    '#4f46e5', // indigo-600
  'priority-high':     '#dc2626', // red-600
  'priority-medium':   '#f59e0b', // amber-500
  'energy-high':       '#22c55e', // green-500
  'energy-low':        '#dc2626', // red-600
  'status-late':       '#dc2626',
  'status-done':       '#16a34a',
  'status-pending':    '#9ca3af',
}
```

Todos os componentes consomem os aliases, nunca as cores brutas.

**Atenção mobile:** ao definir cores de status, garantir contraste mínimo 4.5:1 (WCAG AA) testado em telas AMOLED (Android) e LCD (iPhone).

**Esforço estimado:** 2–3 dias.

---

#### [RS-7] Reconciliação Filosofia vs. Código

**Problema que resolve:** features fora do MVP aumentam a superfície de falha e criam dependência de serviços externos.

**Opção A — Preservar features de IA mas blindar a UI mobile:**
Esconder completamente quando `aiApiKey` não está definida. Zero menção, zero botão cinza, zero placeholder. Features de IA aparecem apenas como enhancement silencioso.

**Opção B — Reverter ao MVP estrito:**
Remover `generateEmbedding`, `generateSmartBriefing`, `transcribeAudio`, `handleSemanticSearch` da Home.tsx. Manter apenas `getDailyBriefing` local (offline, determinístico). Registrar em `DECISIONS.md` com justificativa.

**Recomendação:** Opção A para curto prazo, Opção B após validação de uso real.

**Impacto mobile da Opção A — Captura de voz nativa:**
Substituir OpenAI Whisper pela Web Speech API nativa:
```js
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (!SpeechRecognition) {
  return null; // Firefox Android: não oferecer a funcionalidade
}

const recognition = new SpeechRecognition();
recognition.lang = 'pt-BR';
recognition.continuous = false;
recognition.interimResults = true; // transcrição em tempo real

recognition.onresult = (e) => {
  const transcript = Array.from(e.results)
    .map(r => r[0].transcript)
    .join('');
  setTaskText(transcript);
};
```

Suporte por plataforma:
| Plataforma | Suporte |
|---|---|
| Chrome Android 33+ | Excelente |
| Safari iOS 14.5+ | Bom (requer permissão de microfone) |
| Firefox Android | Não suportado — degradar gracefully |
| Samsung Internet | Suporte via webkit prefix |

**Esforço estimado:** 1 dia (Opção A) ou 2 dias (Opção B + testes).

---

### NÍVEL 3 — FUNCIONALIDADES NOVAS (impacto transformador, esforço alto)

---

#### [FN-1] Modo Foco Ativo

**Problema que resolve:** o app organiza tarefas mas não suporta a execução — o usuário sai do app para trabalhar e volta apenas para marcar.

**Como implementar (mobile-safe):**
Nova rota `/focus/:taskId` com UI full-screen minimalista.

Especificações mobile obrigatórias:
```css
/* min-height correto para mobile — evita bug do vh que inclui a barra de endereço */
min-height: 100dvh;
display: flex;
flex-direction: column;
justify-content: center;
```
- Nome da tarefa: centralizado, `font-size: 20px`, `font-weight: 500`, `padding: 0 24px`, `text-align: center`
- Cronômetro: `font-size: 48px`, **`font-variant-numeric: tabular-nums`** (evita que o layout "pulse" quando o número muda de largura)
- Botão "Concluir": `height: 56px`, `width: calc(100% - 48px)`, `border-radius: 12px`, `font-size: 16px`
- Botão "Cancelar": `height: 44px`, texto discreto (cinza, sem borda)

**Ativação:** tap longo (500ms) no card Top 1:
- `onTouchStart`: iniciar timer de 500ms
- `onTouchEnd` antes de 500ms: cancelar (comportamento normal de tap)
- `onTouchEnd` após 500ms: ativar modo foco com `navigator.vibrate(50)` (Android)

**Esforço estimado:** 5–7 dias.
**Referência:** Things 3, Forest, Focusplan.

---

#### [FN-2] Revisão Diária (5 Minutos)

**Problema que resolve:** sem fechamento do dia, tarefas adiadas acumulam sem visibilidade — o `postponed_count` cresce silenciosamente.

**Como implementar (mobile-safe):**
Rota `/review` ativada por:
- Notificação às 21h (via Service Worker + Push API)
- Automaticamente ao abrir o app após 20h no mesmo dia

Especificações mobile:
- Cards de tarefa em lista vertical, sem scroll horizontal
- Re-priorização via botões de reordenação (seta para cima / seta para baixo) — **não usar HTML5 Drag API**
- Se drag visual for necessário: `react-beautiful-dnd` (tem suporte touch) ou touch events manuais
- Botão "Fechar o dia": sticky bottom com safe areas
- Animação de encerramento: fade sutil — fecha o loop emocional do dia

**Esforço estimado:** 7–10 dias.
**Referência:** Reflect Notes — daily review como ritual de produto.

---

#### [FN-3] AI Scheduling Baseado em Energia e Histórico

**Problema que resolve:** o usuário define o que fazer (Top 1/2/3) mas não há inteligência sobre *quando* fazer. A energia declarada não influencia nada.

**Como implementar:**
Após o usuário declarar energia `9/10`, o app analisa o histórico de conclusões e sugere em bottom sheet:
> "Você conclui tarefas físicas melhor entre 6–8h. Quer agendar musculação para amanhã às 6:30?"

Aceitar = 1 toque. Recusar = dismiss sem atrito. Usa a chave OpenAI já integrada no projeto.

**Esforço estimado:** 8–12 dias.
**Referência:** Reclaim.ai, Motion.

---

#### [FN-4] Indicador de Estado Offline Visível

**Problema que resolve:** o relatório menciona P6 (Offline primeiro) como princípio, mas não há feedback visual quando o app está sem conexão. Em mobile, conexão instável é cenário recorrente.

**Como implementar:**
Barra de 4px no topo da tela (`position: fixed; top: env(safe-area-inset-top); z-index: 50`):
- Âmbar quando offline
- Verde por 2 segundos ao reconectar, depois some

Não invade o layout. Não bloqueia interação. Comunica o estado sem modal.

**Esforço estimado:** 0,5 dia.

---

#### [FN-5] PWA Install Prompt (iOS)

**Problema que resolve:** o app tem manifesto configurado mas em iOS o usuário precisa descobrir "Adicionar à tela de início" manualmente — o browser não exibe banner automático como no Android/Chrome.

**Como implementar:**
Na primeira abertura em Safari iOS (detectar via `navigator.standalone === false`), exibir bottom sheet dismissável com instrução específica:
> "Para a melhor experiência, adicione o SecretárioTask à sua tela de início: toque em Compartilhar → Adicionar à Tela de Início"

- Dispensável com tap no X (tap area 44×44px)
- Após dispensado: `localStorage` com data — não volta por 30 dias
- **Nunca** interferir no fluxo de uso se o usuário ignorar

**Esforço estimado:** 1 dia.

---

#### [FN-6] Virtualização da Lista na Agenda

**Problema que resolve:** a agenda tem 48 slots de 30 minutos por dia. Com múltiplas tarefas por slot, renderizar tudo de uma vez é custoso em Android mid-range (Moto G, Samsung A-series — exatamente o público do app).

**Como implementar:**
`react-window` com `FixedSizeList` para os slots da Agenda. Renderizar apenas a janela de ±4 horas ao redor do horário atual. Ao navegar para horários distantes, renderizar sob demanda.

**Esforço estimado:** 3–4 dias.

---

## PARTE 3 — VISÃO DA TELA INICIAL IDEAL (world-class, mobile-first)

---

### Hierarquia Visual Above the Fold (384px, sem scroll)

Viewport target: 384px largura × 750px altura (Android mid-range típico).
Todos os elementos críticos devem caber nos primeiros 600px de altura (considerando tab bar e safe areas).

```
┌─────────────────────────────────────────┐
│  [PM ▾]    seg, 25 mai    [⚡ |||] [⚙]  │ ← Zona 1: Header 44px
├─────────────────────────────────────────┤
│  PM  Esdra  Pessoal  Família  CC →      │ ← Zona 2: Chips 40px
├─────────────────────────────────────────┤
│  Foco do Dia          3 · energia alta  │
│                                         │
│ ┌─────────────────────────────────────┐ │
│ │ ● TOP 1                             │ │ ← card dominante
│ │ musculação                          │ │   18px bold
│ │ 16:00 · 120min · P8 · Saúde        │ │   border-left roxa
│ └─────────────────────────────────────┘ │
│                                         │
│ ○ Top 2 · Camiseta, cueca, farda...    │ ← cards ghost
│ ○ Top 3 · Checar correio PM            │   12px, compactos
│                                         │ ← Zona 3: ~180px
├─────────────────────────────────────────┤
│  Próximas                               │
│  16:00 ▐ musculação                    │ ← Zona 4: Timeline 72px
│  18:00 ▐ Checar correio PM             │
├─────────────────────────────────────────┤
│  🎤  Nova tarefa...              [Add]  │ ← Zona 5: Captura 52px sticky
├─────────────────────────────────────────┤
│   [Kanban]    [Agenda]    [Stats]       │ ← Zona 6: Tab bar 56px fixed
└─────────────────────────────────────────┘
```

---

### Especificações por Zona

**Zona 1 — Header contextual (44px + safe-area-inset-top)**
- Esquerda: chip do contexto ativo clicável → bottom sheet de troca de contexto
- Centro: data atual discreta, `font-size: 12px`
- Direita: indicador de energia (3 barras, tap area 44×44px) + settings
- Sem título do app. Sem botão "Sair" exposto.

**Zona 2 — Chips de contexto (40px)**
```css
overflow-x: auto;
-webkit-overflow-scrolling: touch;
scrollbar-width: none;
padding: 0 16px;
gap: 8px;
```
Contexto ativo: `background indigo-600`, texto branco, `font-weight: 500`.
Contextos inativos: background cinza claro, borda `0.5px`.

**Zona 3 — Foco do Dia (~180px para 3 tasks)**
Cada card `Top N`:
```css
min-height: 48px;
padding: 10px 16px;
display: flex;
align-items: flex-start;
gap: 10px;
overflow: hidden;
```
Título da tarefa dentro do card:
```css
overflow: hidden;
text-overflow: ellipsis;
white-space: nowrap;
max-width: calc(100% - 60px); /* espaço para badge e data */
```

**Zona 4 — Timeline preview (~72px)**
```css
border-top: 0.5px solid border-color;
padding: 8px 16px;
```
Cada linha: `min-height: 44px`, `padding: 12px 0`.
Título: `flex: 1`, `overflow: hidden`, `text-overflow: ellipsis`, `white-space: nowrap` — **obrigatório**.

**Zona 5 — Barra de captura sticky (52px)**
```css
position: sticky;
bottom: calc(56px + env(safe-area-inset-bottom));
background: white;
border-top: 0.5px solid border-color;
padding: 8px 16px;
z-index: 10;
```
Campo de texto: `font-size: 16px` **mínimo**, `height: 36px`, `border-radius: 8px`, placeholder: `"Nova tarefa..."` (curto, sem instruções).
Botão microfone: 36×36px visual, wrapper 44×44px para tap target.

**Zona 6 — Tab bar (56px fixed)**
```css
position: fixed;
bottom: 0; left: 0; right: 0;
height: calc(56px + env(safe-area-inset-bottom));
padding-bottom: env(safe-area-inset-bottom);
z-index: 20;
```
Main content precisa de:
```css
padding-bottom: calc(56px + env(safe-area-inset-bottom) + 52px);
```

---

### Comportamento do Botão de Adicionar Tarefa (mobile-first)

**Estado padrão:** campo compacto, `font-size: 16px`, placeholder "Nova tarefa...". Botão "Add" desabilitado (`opacity: 0.5`) se campo vazio.

**Ao focar:** teclado virtual sobe, reduzindo a viewport em ~40% no iOS. A barra de captura sticky deve permanecer visível acima do teclado. O Top 1 deve permanecer parcialmente visível para o usuário manter contexto.

**Botão microfone:**
- `onTouchStart`: `recognition.start()` + pulse animation vermelho no ícone
- `onTouchEnd`: `recognition.stop()`
- Transcrição em tempo real no campo (`interimResults: true`)
- **Nunca remover os handlers de touch ao refatorar**

**Ao submeter:** feedback otimista imediato — campo limpa, task aparece no Kanban. Sem loading spinner. Se offline: task permanece localmente (`PendingMutation`) e sincroniza ao reconectar.

---

### Integração Linha do Tempo + Foco do Dia

As duas seções compartilham os mesmos dados com lentes diferentes:
- **Foco do Dia:** ordenado por score (urgência + energia + prioridade)
- **Timeline preview:** ordenado por horário (`due_at`)

Uma tarefa do Top 1 com `due_at=16:00` aparece em ambas as seções — não são seções separadas, são duas visualizações do mesmo dado.

Se a tarefa do Foco do Dia não tem `due_at`, não aparece na Timeline preview. Tap em item da Timeline preview: navega para aba Agenda com `scrollIntoView({ behavior: 'smooth' })` no horário correspondente.

---

## CHECKLIST MOBILE ANTES DE QUALQUER DEPLOY

Antes de publicar qualquer mudança de UI, verificar em dispositivo real (não apenas DevTools):

- [ ] Testado em Android (Chrome) com viewport 360px de largura
- [ ] Testado em iOS (Safari) com viewport 390px (iPhone 14)
- [ ] Barra de captura visível acima do teclado virtual (iOS e Android)
- [ ] Safe areas respeitadas (`env(safe-area-inset-*)`) em iPhone com Face ID
- [ ] Nenhum elemento com tap target menor que 44×44px
- [ ] Nenhum input com `font-size` menor que 16px (evitar zoom iOS)
- [ ] Títulos longos truncam com ellipsis (não quebram o layout)
- [ ] Tab bar não esconde conteúdo (`padding-bottom` correto no main)
- [ ] Scroll horizontal dos chips funciona sem scrollbar visual
- [ ] Botão de microfone tem `onTouchStart`/`onTouchEnd` (não apenas mouse events)
- [ ] Bottom sheets fecham com swipe down
- [ ] Drag and drop (se implementado) usa touch events, não HTML5 Drag API
- [ ] App testado em modo PWA instalado (homescreen) no Android e iOS
- [ ] Indicador offline visível em modo avião
- [ ] `overscroll-behavior: contain` no container principal (evitar pull-to-refresh acidental)

---

## RESUMO EXECUTIVO

### Os 3 bugs de produção mais críticos (em ordem de impacto imediato):

**1. Input com `font-size: 14px` → zoom automático em todos os iPhones**
O código atual usa `text-sm` (14px) no campo de captura. Isso causa zoom involuntário no iOS ao focar — experiência quebrada para 100% dos usuários de iPhone.
Correção: 30 minutos. Trocar para `text-base` (16px) ou `style={{ fontSize: '16px' }}`.

**2. Safe areas não implementadas em nenhum elemento fixed/sticky**
Em iPhones com Face ID (maioria dos iPhones vendidos hoje), a tab bar e a futura barra sticky ficam parcialmente sob o indicador home — zona não-interativa. Em modo PWA instalado (standalone), o problema é ainda mais severo.
Correção: 0,5 dia. Adicionar `env(safe-area-inset-bottom)` em todos os elementos `fixed`/`sticky` na parte inferior da tela.

**3. PHILOSOPHY.md vs. Código dessincronizados**
A filosofia documentada proíbe LLM, embeddings e voice no MVP. O código tem tudo isso, com dependência de API key externa. Em mobile com conexão instável, funcionalidades centrais da UI ficam quebradas silenciosamente — violação direta do P6 (Offline primeiro).
Correção: decisão explícita de produto registrada em `DECISIONS.md`.

### Ordem de execução sugerida:

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | `font-size: 16px` no input | 30min | Bug iOS eliminado |
| 2 | Safe areas em todos os fixed/sticky | 0,5 dia | Bug iOS/PWA eliminado |
| 3 | Decisão sobre PHILOSOPHY.md | 1h de produto | Débito resolvido |
| 4 | Barra de captura sticky no rodapé | 1 dia | UX principal desbloqueada |
| 5 | Header compacto + energia no chip | 0,5 dia | +180px above the fold |
| 6 | Tab bar SVG sem emojis | 0,5 dia | Consistência cross-platform |
| 7 | Hierarquia Top 1 dominante | 0,5 dia | Clareza visual imediata |
| 8 | Linha de "agora" na Agenda | 1 dia | Orientação temporal |
| 9 | Swipe actions na Agenda | 3 dias | Redução de fricção na ação mais frequente |
| 10 | Timeline preview na Home | 3–4 dias | Contexto temporal sem troca de aba |

**A mudança de maior ROI imediato:**
Itens 1 + 2 + 4 juntos — menos de 2 dias de trabalho — eliminam os dois bugs de iOS em produção e resolvem o problema central de captura acima do fold. Impacto direto na tarefa mais executada do app.

---

*Documento compilado em 25/05/2026. Revisão recomendada após cada ciclo de validação em dispositivo real.*
