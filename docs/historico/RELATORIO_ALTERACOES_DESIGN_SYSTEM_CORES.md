# Relatorio de alteracoes - Design system de cores

Data: 2026-06-26  
Projeto: SecretarioTask  
Escopo: frontend/estilo, sem Supabase, sem migration, sem commit/push

## Resumo executivo

Foi aplicado um primeiro refinamento de design system para reduzir o visual colorido e "template" do app. A mudanca central foi trocar a base creme/colorida por tokens neutros, com cor forte concentrada em poucos lugares: acento principal, sucesso, alerta e perigo.

O foco desta rodada foi:

- criar tokens globais de cor em CSS variables;
- conectar Tailwind a esses tokens;
- neutralizar a Agenda, removendo faixas laterais coloridas;
- remover sombra dos cards da Agenda;
- trocar prioridade por dot pequeno + rotulo;
- ajustar tab bar para ativo em acento, sem barra preta;
- ajustar slider de energia para acento + neutros;
- manter o mobile com bolinha/lapis/gestos, mas mais neutro visualmente.

## Arquivos alterados

### `src/index.css`

Motivo: criar o design system tokenizado em um ponto central e remover cores diretas do `body`.

Antes:

```css
body {
  background: #F7F6F2;
  font-family: "Inter Tight", Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  color: #1A1814;
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  -webkit-font-smoothing: antialiased;
  text-rendering: geometricPrecision;
}
```

Atual:

```css
@layer base {
  :root {
    --bg: #FAFAFA;
    --surface: #FFFFFF;
    --surface-sunken: #F4F4F5;
    --border: #E4E4E7;
    --border-strong: #D4D4D8;
    --ink: #18181B;
    --ink-secondary: #52525B;
    --ink-tertiary: #71717A;
    --accent: #4F46E5;
    --accent-hover: #4338CA;
    --accent-subtle: #EEF2FF;
    --success: #16A34A;
    --warning: #D97706;
    --danger: #DC2626;
  }

  body {
    background: var(--bg);
    color: var(--ink);
  }
}
```

Tambem foi criado o estilo `.energy-slider`, para o range de energia usar `--accent`, `--surface-sunken`, `--ink` e `--surface`.

### `tailwind.config.ts`

Motivo: fazer as classes Tailwind apontarem para CSS variables e neutralizar aliases antigos.

Antes:

```ts
canvas:    '#F7F6F2',
paper:     '#FFFFFF',
paper2:    '#EFEEE8',
paper3:    '#E5E3DB',
ink: {
  DEFAULT: '#1A1814',
  2:       '#6B6760',
  3:       '#A09B91',
},
ctxPM: { DEFAULT: '#3F58D9', soft: '#E6E9FF', ink: '#3046C0' },
```

Atual:

```ts
bg: 'var(--bg)',
'surface-sunken': 'var(--surface-sunken)',
border: 'var(--border)',
'border-strong': 'var(--border-strong)',
accent: {
  DEFAULT: 'var(--accent)',
  hover: 'var(--accent-hover)',
  subtle: 'var(--accent-subtle)',
},
canvas: 'var(--bg)',
paper: 'var(--surface)',
paper2: 'var(--surface-sunken)',
paper3: 'var(--border)',
ink: {
  DEFAULT: 'var(--ink)',
  2: 'var(--ink-secondary)',
  3: 'var(--ink-tertiary)',
  secondary: 'var(--ink-secondary)',
  tertiary: 'var(--ink-tertiary)',
},
ctxPM: { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
```

### `src/components/TimelineView.tsx`

Motivo: deixar a Agenda menos colorida e mais premium.

Principais alteracoes:

- removido `CTX_BAR`;
- removidas bordas laterais coloridas `border-l-ctx*`;
- removido `border-l-4` dos cards;
- removido `shadow-card` dos cards;
- cards passam a usar `bg-surface border border-border rounded-xl`;
- prioridade passa a usar `priorityTone()`;
- recorrencia vira icone neutro;
- badge de adiada vira neutra;
- botoes secundarios passam a usar borda neutra.

Antes:

```tsx
const CTX_BAR: Record<ContextType, string> = {
  PM:      'border-l-ctxPM',
  Esdra:   'border-l-ctxEsdra',
  Pessoal: 'border-l-ctxPessoal',
  Familia: 'border-l-ctxFamilia',
  CCB:     'border-l-ctxCCB',
  Estudo:  'border-l-ctxEstudo',
  Saude:   'border-l-ctxSaude',
};
```

Atual:

```tsx
function priorityTone(priority: number): string {
  if (priority >= 8) return 'text-danger';
  if (priority >= 6) return 'text-warning';
  return 'text-ink-tertiary';
}
```

Antes:

```tsx
className={[
  'relative min-w-0 flex flex-col bg-paper border border-line border-l-4 rounded-2xl sm:rounded-xl sm:min-h-[104px]',
  CTX_BAR[t.context],
  'shadow-card transition-transform active:shadow-none',
  isDragging ? 'duration-0' : 'duration-200',
].join(' ')}
```

Atual:

```tsx
className={[
  'relative min-w-0 flex flex-col bg-surface border border-border rounded-xl sm:min-h-[104px]',
  'transition-transform',
  isDragging ? 'duration-0' : 'duration-200',
].join(' ')}
```

Antes:

```tsx
<Flag size={10} strokeWidth={2.4} /> P{t.priority}
```

Atual:

```tsx
<span className="w-[7px] h-[7px] rounded-full bg-current" />
P{t.priority}
```

### `src/pages/Home.tsx`

Motivo: ajustar tab bar, slider de energia e a cor dos botoes primarios.

Antes:

```tsx
<Zap size={14} className="text-warning shrink-0" strokeWidth={2.2} />
<input className="flex-1 h-1.5 bg-paper2 rounded-full appearance-none accent-ink" />
```

Atual:

```tsx
<Zap size={14} className="text-ink-secondary shrink-0" strokeWidth={2.2} />
<input
  className="energy-slider flex-1 h-1.5 rounded-full appearance-none"
  style={energySliderStyle}
/>
```

Antes:

```tsx
<it.icon size={20} strokeWidth={on ? 2.2 : 1.7} className={on ? 'text-ink' : 'text-ink-2'} />
<span className={(on ? 'text-ink font-bold' : 'text-ink-2 font-semibold') + ' text-[12px] tracking-wide'}>
  {it.label}
</span>
{on && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-ink rounded-full" />}
```

Atual:

```tsx
<it.icon size={20} strokeWidth={on ? 2.2 : 1.7} className={on ? 'text-accent' : 'text-ink-tertiary'} />
<span className={(on ? 'text-accent font-bold' : 'text-ink-tertiary font-semibold') + ' text-[12px] tracking-wide'}>
  {it.label}
</span>
```

## Validacoes feitas

Comandos executados:

```bash
npm run lint
npm run build
```

Resultado:

- lint passou;
- build passou;
- busca por HEX em `src/pages/Home.tsx`, `src/components/TimelineView.tsx` e `tailwind.config.ts` voltou vazia;
- busca por `border-l-`, `shadow-card` e `accent-ink` nos arquivos tocados voltou vazia;
- `install-log.txt` continuou fora do escopo.

Observacao do build: o Vite segue emitindo alerta de chunk maior que 500 kB, ja existente no projeto e nao relacionado a esta alteracao visual.

## Diff completo

No diff abaixo:

- linhas com `-` sao codigo anterior;
- linhas com `+` sao codigo atual.

```diff
diff --git a/src/components/TimelineView.tsx b/src/components/TimelineView.tsx
index a43bcbc..d7408f1 100644
--- a/src/components/TimelineView.tsx
+++ b/src/components/TimelineView.tsx
@@ -2,7 +2,7 @@ import { useState, useEffect, useRef } from 'react';
 import { createPortal } from 'react-dom';
 import { formatDateTime, rescheduleToDate, postponeToTomorrow, wasEdited } from '../lib/datetime';
 import { describeRecurrenceRule, getNextOccurrenceFromNow } from '../lib/recurrence';
-import { Calendar as CalIcon, Check, Flag, Repeat, X, Edit3, Trash2 } from 'lucide-react';
+import { Calendar as CalIcon, Repeat, X, Edit3, Trash2 } from 'lucide-react';
 import type { Task, ContextType } from '../types';
 import { CONTEXTS_LIST } from '../types';
 import { useContextStore } from '../stores/contextStore';
@@ -17,16 +17,6 @@ interface TimelineViewProps {
   tasks: Task[];
 }
 
-const CTX_BAR: Record<ContextType, string> = {
-  PM:      'border-l-ctxPM',
-  Esdra:   'border-l-ctxEsdra',
-  Pessoal: 'border-l-ctxPessoal',
-  Familia: 'border-l-ctxFamilia',
-  CCB:     'border-l-ctxCCB',
-  Estudo:  'border-l-ctxEstudo',
-  Saude:   'border-l-ctxSaude',
-};
-
 function toLocalDatetimeInput(iso: string | null | undefined): string {
   if (!iso) return '';
   const d = new Date(iso);
@@ -34,6 +24,12 @@ function toLocalDatetimeInput(iso: string | null | undefined): string {
   return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
 }
 
+function priorityTone(priority: number): string {
+  if (priority >= 8) return 'text-danger';
+  if (priority >= 6) return 'text-warning';
+  return 'text-ink-tertiary';
+}
+
 // ─── Recurrence helpers (importados de src/lib/recurrence.ts) ───
 
 function AgendaQuickActions({
@@ -60,7 +56,7 @@ function AgendaQuickActions({
             e.stopPropagation();
             onComplete();
           }}
-          className="h-8 min-w-0 px-2 rounded-lg bg-success text-white text-[12px] font-bold"
+          className="h-8 min-w-0 px-2 rounded-lg bg-accent text-white text-[12px] font-bold"
         >
           Concluir
         </button>
@@ -70,7 +66,7 @@ function AgendaQuickActions({
             e.stopPropagation();
             onPostponeTomorrow();
           }}
-          className="h-8 min-w-0 px-2 rounded-lg bg-paper2 text-ink text-[12px] font-bold"
+          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold"
         >
           Amanhã
         </button>
@@ -81,7 +77,7 @@ function AgendaQuickActions({
               e.stopPropagation();
               dateInputRef.current?.showPicker?.();
             }}
-            className="h-8 w-full min-w-0 px-2 rounded-lg bg-paper2 text-ink text-[12px] font-bold"
+            className="h-8 w-full min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold"
           >
             Adiar
           </button>
@@ -103,7 +99,7 @@ function AgendaQuickActions({
             e.stopPropagation();
             onEdit();
           }}
-          className="h-8 min-w-0 px-2 rounded-lg bg-paper2 text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
+          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-ink text-[12px] font-bold inline-flex items-center justify-center gap-1"
           title="Editar"
         >
           <Edit3 size={12} /> Editar
@@ -114,7 +110,7 @@ function AgendaQuickActions({
             e.stopPropagation();
             onDelete();
           }}
-          className="h-8 min-w-0 px-2 rounded-lg bg-danger-light text-danger text-[12px] font-bold inline-flex items-center justify-center gap-1"
+          className="h-8 min-w-0 px-2 rounded-lg border border-border-strong bg-surface text-danger text-[12px] font-bold inline-flex items-center justify-center gap-1"
           title="Excluir"
         >
           <Trash2 size={12} /> Excluir
@@ -203,18 +199,17 @@ function TimelineTaskCard({
       onPointerMove={handlePointerMove}
       onPointerUp={handlePointerUp}
       onPointerCancel={resetGesture}
-      className="relative z-20 w-full min-w-0 overflow-hidden rounded-2xl sm:overflow-visible sm:rounded-xl"
+      className="relative z-20 w-full min-w-0 overflow-hidden rounded-xl sm:overflow-visible"
     >
-      <div className="absolute inset-0 flex items-center justify-between px-4 bg-paper2 sm:hidden">
+      <div className="absolute inset-0 flex items-center justify-between px-4 bg-surface-sunken sm:hidden">
         <span className="text-[12px] font-bold text-success">Amanhã</span>
         <span className="text-[12px] font-bold text-danger">Excluir</span>
       </div>
 
       <div
         className={[
-          'relative min-w-0 flex flex-col bg-paper border border-line border-l-4 rounded-2xl sm:rounded-xl sm:min-h-[104px]',
-          CTX_BAR[t.context],
-          'shadow-card transition-transform active:shadow-none',
+          'relative min-w-0 flex flex-col bg-surface border border-border rounded-xl sm:min-h-[104px]',
+          'transition-transform',
           isDragging ? 'duration-0' : 'duration-200',
         ].join(' ')}
         style={{ transform: `translateX(${dragX}px)` }}
@@ -227,18 +222,16 @@ function TimelineTaskCard({
               e.stopPropagation();
               handleComplete(t.id);
             }}
-            className="w-11 h-11 -ml-1.5 -mt-1.5 shrink-0 inline-flex items-center justify-center rounded-full text-success sm:hidden"
+            className="w-11 h-11 -ml-1.5 -mt-1.5 shrink-0 inline-flex items-center justify-center rounded-full text-ink-tertiary sm:hidden"
             aria-label="Concluir tarefa"
             title="Concluir"
           >
-            <span className="w-6 h-6 rounded-full border-2 border-current inline-flex items-center justify-center">
-              <Check size={14} strokeWidth={2.6} className="opacity-0" />
-            </span>
+            <span className="w-6 h-6 rounded-full border-2 border-border-strong inline-flex items-center justify-center" />
           </button>
 
           <div className="min-w-0 flex-1">
             <div className="flex items-center justify-between gap-2">
-              <span className="text-[12px] font-bold tnum text-ink-2 tracking-wide">
+              <span className="text-[12px] font-bold tnum text-ink-secondary tracking-wide">
                 {formatTime(block.startTime)} – {formatTime(block.endTime)}
               </span>
               <div className="flex items-center gap-1.5 shrink-0">
@@ -249,12 +242,10 @@ function TimelineTaskCard({
                 )}
                 {t.priority > 0 && (
                   <span
-                    className={
-                      'inline-flex items-center gap-1 text-[11px] font-bold tnum ' +
-                      (t.priority >= 8 ? 'text-danger' : t.priority >= 5 ? 'text-warning' : 'text-ink-2')
-                    }
+                    className={`inline-flex items-center gap-1.5 text-[11px] font-bold tnum ${priorityTone(t.priority)}`}
                   >
-                    <Flag size={10} strokeWidth={2.4} /> P{t.priority}
+                    <span className="w-[7px] h-[7px] rounded-full bg-current" />
+                    P{t.priority}
                   </span>
                 )}
                 <button
@@ -263,7 +254,7 @@ function TimelineTaskCard({
                     e.stopPropagation();
                     openEdit(t);
                   }}
-                  className="w-8 h-8 -mr-1.5 rounded-full inline-flex items-center justify-center text-ink-2 hover:text-ink sm:hidden"
+                  className="w-8 h-8 -mr-1.5 rounded-full inline-flex items-center justify-center text-ink-tertiary hover:text-ink sm:hidden"
                   aria-label="Editar tarefa"
                   title="Editar"
                 >
@@ -273,13 +264,13 @@ function TimelineTaskCard({
             </div>
 
             <h3 className="mt-1 text-[15px] font-bold text-ink leading-snug tracking-tight break-words flex items-start gap-1.5 sm:text-[14px] sm:leading-tight">
-              {t.recurrence_rule && <Repeat size={13} className="mt-0.5 shrink-0 text-ink-2" />}
+              {t.recurrence_rule && <Repeat size={13} className="mt-0.5 shrink-0 text-ink-tertiary" />}
               <span className="min-w-0">{block.title}</span>
             </h3>
 
             {(t.postponed_count ?? 0) > 0 && (
               <div className="mt-1">
-                <span title={`${t.postponed_count}x adiada`} className="inline-flex text-[11px] font-bold bg-warning-light text-warning px-1.5 py-0.5 rounded">
+                <span title={`${t.postponed_count}x adiada`} className="inline-flex text-[11px] font-bold bg-surface-sunken text-ink-tertiary px-1.5 py-0.5 rounded">
                   Adiada {t.postponed_count}x
                 </span>
               </div>
@@ -694,7 +685,7 @@ export function TimelineView({ tasks }: TimelineViewProps) {
                   handleComplete(editingTask.id);
                   setEditingTask(null);
                 }}
-                className="h-10 rounded-xl bg-success text-white text-[12px] font-bold"
+                className="h-10 rounded-xl bg-accent text-white text-[12px] font-bold"
               >
                 Concluir
               </button>
@@ -704,7 +695,7 @@ export function TimelineView({ tasks }: TimelineViewProps) {
                   handlePostponeTomorrow(editingTask.id);
                   setEditingTask(null);
                 }}
-                className="h-10 rounded-xl bg-paper2 text-ink text-[12px] font-bold"
+                className="h-10 rounded-xl border border-border-strong bg-surface text-ink text-[12px] font-bold"
               >
                 Amanhã
               </button>
@@ -714,7 +705,7 @@ export function TimelineView({ tasks }: TimelineViewProps) {
                   requestDelete(editingTask);
                   setEditingTask(null);
                 }}
-                className="h-10 rounded-xl bg-danger-light text-danger text-[12px] font-bold"
+                className="h-10 rounded-xl border border-border-strong bg-surface text-danger text-[12px] font-bold"
               >
                 Excluir
               </button>
@@ -845,13 +836,13 @@ export function TimelineView({ tasks }: TimelineViewProps) {
             >
               <button
                 onClick={() => setEditingTask(null)}
-                className="flex-1 py-2.5 rounded-xl bg-paper2 text-[13px] font-bold text-ink-2"
+                className="flex-1 py-2.5 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-ink"
               >
                 Cancelar
               </button>
               <button
                 onClick={saveEdit}
-                className="flex-1 py-2.5 rounded-xl bg-ink text-[13px] font-bold text-white"
+                className="flex-1 py-2.5 rounded-xl bg-accent text-[13px] font-bold text-white"
               >
                 Salvar
               </button>
@@ -886,7 +877,7 @@ export function TimelineView({ tasks }: TimelineViewProps) {
               <button
                 type="button"
                 onClick={() => setPendingDeleteTask(null)}
-                className="h-11 rounded-xl bg-paper2 text-[13px] font-bold text-ink"
+                className="h-11 rounded-xl border border-border-strong bg-surface text-[13px] font-bold text-ink"
               >
                 Cancelar
               </button>
diff --git a/src/index.css b/src/index.css
index 4466268..96d8f2a 100644
--- a/src/index.css
+++ b/src/index.css
@@ -2,17 +2,72 @@
 @tailwind components;
 @tailwind utilities;
 
-/* Native-PWA tweaks */
-body {
-  background: #F7F6F2;
-  font-family: "Inter Tight", Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
-  color: #1A1814;
-  overscroll-behavior-y: none;
-  -webkit-tap-highlight-color: transparent;
-  user-select: none;
-  -webkit-user-select: none;
-  -webkit-font-smoothing: antialiased;
-  text-rendering: geometricPrecision;
+@layer base {
+  :root {
+    --bg: #FAFAFA;
+    --surface: #FFFFFF;
+    --surface-sunken: #F4F4F5;
+    --border: #E4E4E7;
+    --border-strong: #D4D4D8;
+    --ink: #18181B;
+    --ink-secondary: #52525B;
+    --ink-tertiary: #71717A;
+    --accent: #4F46E5;
+    --accent-hover: #4338CA;
+    --accent-subtle: #EEF2FF;
+    --success: #16A34A;
+    --warning: #D97706;
+    --danger: #DC2626;
+  }
+
+  @media (prefers-color-scheme: dark) {
+    :root {
+      --bg: #0A0A0B;
+      --surface: #18181B;
+      --surface-sunken: #111113;
+      --border: #27272A;
+      --border-strong: #3F3F46;
+      --ink: #FAFAFA;
+      --ink-secondary: #A1A1AA;
+      --ink-tertiary: #71717A;
+      --accent: #6366F1;
+      --accent-hover: #818CF8;
+      --accent-subtle: #1E1B4B;
+      --success: #22C55E;
+      --warning: #F59E0B;
+      --danger: #EF4444;
+    }
+  }
+
+  .dark {
+    --bg: #0A0A0B;
+    --surface: #18181B;
+    --surface-sunken: #111113;
+    --border: #27272A;
+    --border-strong: #3F3F46;
+    --ink: #FAFAFA;
+    --ink-secondary: #A1A1AA;
+    --ink-tertiary: #71717A;
+    --accent: #6366F1;
+    --accent-hover: #818CF8;
+    --accent-subtle: #1E1B4B;
+    --success: #22C55E;
+    --warning: #F59E0B;
+    --danger: #EF4444;
+  }
+
+  /* Native-PWA tweaks */
+  body {
+    background: var(--bg);
+    font-family: "Inter Tight", Inter, -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
+    color: var(--ink);
+    overscroll-behavior-y: none;
+    -webkit-tap-highlight-color: transparent;
+    user-select: none;
+    -webkit-user-select: none;
+    -webkit-font-smoothing: antialiased;
+    text-rendering: geometricPrecision;
+  }
 }
 
 input, textarea, [contenteditable] {
@@ -55,6 +110,31 @@ input, textarea, [contenteditable] {
 .no-scrollbar::-webkit-scrollbar { display: none; }
 .no-scrollbar { scrollbar-width: none; }
 
+.energy-slider {
+  background: linear-gradient(
+    to right,
+    var(--accent) 0 var(--energy-percent, 50%),
+    var(--surface-sunken) var(--energy-percent, 50%) 100%
+  );
+}
+
+.energy-slider::-webkit-slider-thumb {
+  appearance: none;
+  width: 22px;
+  height: 22px;
+  border-radius: 999px;
+  background: var(--ink);
+  border: 2px solid var(--surface);
+}
+
+.energy-slider::-moz-range-thumb {
+  width: 22px;
+  height: 22px;
+  border-radius: 999px;
+  background: var(--ink);
+  border: 2px solid var(--surface);
+}
+
 /* Subtle pulse used by the Foco button badge */
 @keyframes ping-soft {
   0%   { transform: scale(1);    opacity: .9; }
diff --git a/src/pages/Home.tsx b/src/pages/Home.tsx
index af8076e..3cde770 100644
--- a/src/pages/Home.tsx
+++ b/src/pages/Home.tsx
@@ -1,4 +1,4 @@
-import { useState, useEffect, useMemo, useRef } from 'react';
+import { useState, useEffect, useMemo, useRef, type CSSProperties } from 'react';
 import { useTaskStore } from '../stores/taskStore';
 import { useContextStore } from '../stores/contextStore';
 
@@ -259,6 +259,9 @@ export default function Home() {
     () => baseVisibleTasks.filter((t) => isTaskForToday(t.due_at)),
     [baseVisibleTasks]
   );
+  const energySliderStyle: CSSProperties & { '--energy-percent': string } = {
+    '--energy-percent': `${currentEnergy * 10}%`,
+  };
 
   return (
     <div
@@ -313,7 +316,7 @@ export default function Home() {
             >
               <Target size={16} strokeWidth={2.2} />
               {briefingTasks.length > 0 && (
-                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-warning border border-paper2" />
+                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-accent border border-paper2" />
               )}
             </button>
             <button
@@ -356,7 +359,7 @@ export default function Home() {
                 onClick={handleSemanticSearch}
                 disabled={isSearching || !searchText.trim() || !aiApiKey}
                 title={!aiApiKey ? 'Configure sua API Key primeiro' : 'Busca avançada'}
-                className="ml-1 px-3 py-1 rounded-lg bg-ink text-white text-[12px] font-bold disabled:opacity-50"
+                className="ml-1 px-3 py-1 rounded-lg bg-accent text-white text-[12px] font-bold disabled:opacity-50"
               >
                 {isSearching ? '...' : 'Buscar'}
               </button>
@@ -367,7 +370,7 @@ export default function Home() {
         {/* energy strip */}
         <div className="px-4 pb-3">
           <label className="flex items-center gap-3 bg-paper border border-line rounded-xl px-3 py-2">
-            <Zap size={14} className="text-warning shrink-0" strokeWidth={2.2} />
+            <Zap size={14} className="text-ink-secondary shrink-0" strokeWidth={2.2} />
             <span className="text-[12px] font-semibold text-ink shrink-0">Energia</span>
             <input
               type="range"
@@ -375,7 +378,8 @@ export default function Home() {
               max="10"
               value={currentEnergy}
               onChange={(e) => setCurrentEnergy(parseInt(e.target.value, 10))}
-              className="flex-1 h-1.5 bg-paper2 rounded-full appearance-none accent-ink"
+              className="energy-slider flex-1 h-1.5 rounded-full appearance-none"
+              style={energySliderStyle}
             />
             <span className="text-[13px] font-bold tnum text-ink shrink-0">
               {currentEnergy}
@@ -455,7 +459,7 @@ export default function Home() {
           <button
             type="submit"
             disabled={isAddingTask || !taskText.trim() || isTranscribing}
-            className="w-11 h-11 rounded-xl bg-ink text-white text-[12px] font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 shrink-0"
+            className="w-11 h-11 rounded-xl bg-accent text-white text-[12px] font-bold disabled:opacity-40 inline-flex items-center justify-center gap-1.5 shrink-0"
             aria-label="Adicionar tarefa"
           >
             {isAddingTask ? '...' : (<ArrowRight size={14} strokeWidth={2.4} />)}
@@ -480,11 +484,10 @@ export default function Home() {
               onClick={() => setViewMode(it.id)}
               className="flex-1 flex flex-col items-center justify-center gap-1 relative focus:outline-none"
             >
-              <it.icon size={20} strokeWidth={on ? 2.2 : 1.7} className={on ? 'text-ink' : 'text-ink-2'} />
-              <span className={(on ? 'text-ink font-bold' : 'text-ink-2 font-semibold') + ' text-[12px] tracking-wide'}>
+              <it.icon size={20} strokeWidth={on ? 2.2 : 1.7} className={on ? 'text-accent' : 'text-ink-tertiary'} />
+              <span className={(on ? 'text-accent font-bold' : 'text-ink-tertiary font-semibold') + ' text-[12px] tracking-wide'}>
                 {it.label}
               </span>
-              {on && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[3px] bg-ink rounded-full" />}
             </button>
           );
         })}
diff --git a/tailwind.config.ts b/tailwind.config.ts
index 48bdb2f..6bb38ef 100644
--- a/tailwind.config.ts
+++ b/tailwind.config.ts
@@ -1,7 +1,5 @@
 import type { Config } from 'tailwindcss'
 
-// Additive extension of the existing theme — keeps legacy tokens so old
-// components keep working while new screens migrate to the Direction B palette.
 export default {
   content: [
     "./index.html",
@@ -14,53 +12,64 @@ export default {
         serif: ['"Instrument Serif"', '"Source Serif Pro"', 'Georgia', 'serif'],
       },
       colors: {
-        // ── Legacy (unchanged from before, to keep existing JSX working) ──
+        bg: 'var(--bg)',
+        'surface-sunken': 'var(--surface-sunken)',
+        border: 'var(--border)',
+        'border-strong': 'var(--border-strong)',
+        accent: {
+          DEFAULT: 'var(--accent)',
+          hover: 'var(--accent-hover)',
+          subtle: 'var(--accent-subtle)',
+        },
+
+        // Legacy aliases kept so existing JSX migrates through the new tokens.
         brand: {
-          DEFAULT: '#4f46e5',
-          light:   '#6366f1',
-          subtle:  '#eef2ff',
+          DEFAULT: 'var(--accent)',
+          light:   'var(--accent-hover)',
+          subtle:  'var(--accent-subtle)',
         },
-        danger:  { DEFAULT: '#B4322B', light: '#F6E4E0' },
-        warning: { DEFAULT: '#B07A1E', light: '#F7ECD6' },
-        success: { DEFAULT: '#3F6420', light: '#E6F0D8' },
+        danger:  { DEFAULT: 'var(--danger)', light: 'color-mix(in srgb, var(--danger) 10%, var(--surface))' },
+        warning: { DEFAULT: 'var(--warning)', light: 'color-mix(in srgb, var(--warning) 10%, var(--surface))' },
+        success: { DEFAULT: 'var(--success)', light: 'color-mix(in srgb, var(--success) 10%, var(--surface))' },
         surface: {
-          DEFAULT: '#ffffff',
-          muted:   '#f9fafb',
-          border:  '#e5e7eb',
-          border2: '#d1d5db',
+          DEFAULT: 'var(--surface)',
+          muted:   'var(--surface-sunken)',
+          border:  'var(--border)',
+          border2: 'var(--border-strong)',
         },
         text: {
-          primary:   '#111827',
-          secondary: '#6b7280',
-          tertiary:  '#9ca3af',
-          inverse:   '#ffffff',
+          primary:   'var(--ink)',
+          secondary: 'var(--ink-secondary)',
+          tertiary:  'var(--ink-tertiary)',
+          inverse:   'var(--surface)',
         },
-        late:    '#dc2626',
-        done:    '#16a34a',
-        pending: '#9ca3af',
+        late:    'var(--danger)',
+        done:    'var(--success)',
+        pending: 'var(--ink-tertiary)',
 
-        // ── Direction B palette (new) ──
-        canvas:    '#F7F6F2',
-        paper:     '#FFFFFF',
-        paper2:    '#EFEEE8',
-        paper3:    '#E5E3DB',
+        canvas:    'var(--bg)',
+        paper:     'var(--surface)',
+        paper2:    'var(--surface-sunken)',
+        paper3:    'var(--border)',
         ink: {
-          DEFAULT: '#1A1814',
-          2:       '#6B6760',
-          3:       '#A09B91',
+          DEFAULT:   'var(--ink)',
+          2:         'var(--ink-secondary)',
+          3:         'var(--ink-tertiary)',
+          secondary: 'var(--ink-secondary)',
+          tertiary:  'var(--ink-tertiary)',
         },
-        line:  '#E5E3DB',
-        line2: '#EBE9E1',
-        amber: { soft: '#FFE9C2' },
+        line:  'var(--border)',
+        line2: 'var(--border)',
+        amber: { soft: 'var(--accent-subtle)' },
 
-        // contexts — used as left bars / soft chips
-        ctxPM:      { DEFAULT: '#3F58D9', soft: '#E6E9FF', ink: '#3046C0' },
-        ctxEsdra:   { DEFAULT: '#7C3AED', soft: '#F1E6FF', ink: '#6831B5' },
-        ctxPessoal: { DEFAULT: '#C88E2A', soft: '#FFE9C2', ink: '#7A4A0F' },
-        ctxFamilia: { DEFAULT: '#1E8590', soft: '#D6F0F2', ink: '#125F66' },
-        ctxCCB:     { DEFAULT: '#5C8A2C', soft: '#E6F0D8', ink: '#3F6420' },
-        ctxEstudo:  { DEFAULT: '#C53580', soft: '#FFE0EC', ink: '#9D2960' },
-        ctxSaude:   { DEFAULT: '#1F7A57', soft: '#D6F0E4', ink: '#155F43' },
+        // Context colors intentionally resolve to neutral tokens in the premium system.
+        ctxPM:      { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
+        ctxEsdra:   { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
+        ctxPessoal: { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
+        ctxFamilia: { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
+        ctxCCB:     { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
+        ctxEstudo:  { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
+        ctxSaude:   { DEFAULT: 'var(--border-strong)', soft: 'var(--surface-sunken)', ink: 'var(--ink-secondary)' },
       },
       borderRadius: {
         xl:    '14px',
@@ -68,9 +77,9 @@ export default {
         '3xl': '22px',
       },
       boxShadow: {
-        card: '0 1px 2px rgba(26,24,20,.04), 0 1px 0 rgba(26,24,20,.02)',
-        soft: '0 8px 24px -10px rgba(26,24,20,.18)',
-        fab:  '0 10px 22px -4px rgba(26,24,20,.45), 0 4px 10px -2px rgba(26,24,20,.18)',
+        card: 'none',
+        soft: 'none',
+        fab:  'none',
       },
     },
   },
```

## Observacoes finais

Nao foi feito commit nem push.  
O arquivo `install-log.txt` continua untracked e nao entrou nesta entrega.  
O Dashboard ainda possui cores hardcoded fora do escopo desta rodada.
