# Auditoria Mobile PWA — secretario-task

## Resumo Executivo
- Total de arquivos auditados: 21
- Total de problemas encontrados: 12
- Severidade crítica (scroll lateral / layout quebrado): 1
- Severidade média (quebra de texto / espaçamento / UX mobile ruim): 6
- Severidade baixa (falha silenciosa / inconsistência menor): 5

---

## index.html
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` — correto
- `theme-color`, `apple-mobile-web-app-capable`, `apple-touch-icon` — todos presentes e corretos

✅ [index.html concluído]

---

## tailwind.config.ts
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- Breakpoints padrão do Tailwind (sm:640px, md:768px, lg:1024px, xl:1280px) — suficientes
- `theme.extend` vazio — sem customizações que possam interferir

✅ [tailwind.config.ts concluído]

---

## src/index.css
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `overscroll-behavior-y: none` — correto para PWA (impede pull-to-refresh)
- `-webkit-tap-highlight-color: transparent` — melhoria de UX mobile
- `user-select: none` com exceção para inputs — correto

✅ [src/index.css concluído]

---

## src/App.css
**Problemas encontrados:** 1

### Problema 1 — Arquivo morto não importado (template Vite)
- **Linha:** 1–184 (arquivo inteiro)
- **Severidade:** Baixa
- **Descrição:** O arquivo inteiro é um remanescente do template padrão do Vite. Nenhum componente da aplicação importa este arquivo (`App.tsx` não contém `import './App.css'`, `main.tsx` também não). As classes `.hero`, `.counter`, `#center`, `#next-steps`, `#spacer` nunca são usadas. Além disso, os media queries usam abordagem desktop-first (`max-width: 1024px`) — contrária à filosofia mobile-first do Tailwind.
- **Código atual:**
```css
/* App.css lines 67, 81, 92, 101, 139, 159 */
@media (max-width: 1024px) { ... }
```
- **Código corrigido:**
```
/* Deletar o arquivo src/App.css inteiro — não está sendo usado */
```

✅ [src/App.css concluído]

---

## src/main.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.

✅ [src/main.tsx concluído]

---

## src/App.tsx
**Problemas encontrados:** 1

### Problema 1 — Loading state sem padding horizontal
- **Linha:** 15
- **Severidade:** Baixa
- **Descrição:** O estado de loading não tem padding horizontal. Em mobile, o texto "Carregando..." pode tocar as bordas laterais da tela caso o browser não aplique margens por padrão.
- **Código atual:**
```jsx
<div className="flex min-h-screen items-center justify-center">Carregando...</div>
```
- **Código corrigido:**
```jsx
<div className="flex min-h-screen items-center justify-center px-4">Carregando...</div>
```

✅ [src/App.tsx concluído]

---

## src/pages/Login.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `px-4 py-12 sm:px-6 lg:px-8` — progressão correta de padding
- `w-full max-w-md` — container fluido com limite
- Inputs com `w-full` — fluidos
- Botões com `w-full` — fluidos

✅ [src/pages/Login.tsx concluído]

---

## src/pages/Home.tsx
**Problemas encontrados:** 4

### Problema 1 — Abas de visualização com labels longas sem adaptação mobile
- **Linha:** 347–378
- **Severidade:** Média
- **Descrição:** As três abas de modo de visualização têm labels com emoji + texto longo: "📊 Quadros (Kanban)" (~176px), "⏳ Linha do Tempo" (~156px) e "📈 Estatísticas" (~116px). Soma total: ~448px. Em um telefone de 360px (área útil ≈ 328px após padding), as abas transbordam. O container tem `overflow-x-auto` que mitiga o scroll de página, mas não há indicação visual de que há conteúdo fora da tela, criando UX confusa — o usuário pode não saber que a aba "📈 Estatísticas" existe.
- **Código atual:**
```jsx
<div className="flex border-b border-gray-200 mb-6 overflow-x-auto pb-2 sm:pb-0">
  <button ...>📊 Quadros (Kanban)</button>
  <button ...>⏳ Linha do Tempo</button>
  <button ...>📈 Estatísticas</button>
</div>
```
- **Código corrigido:**
```jsx
<div className="flex border-b border-gray-200 mb-6 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
  <button ...>
    <span className="sm:hidden">📊 Kanban</span>
    <span className="hidden sm:inline">📊 Quadros (Kanban)</span>
  </button>
  <button ...>
    <span className="sm:hidden">⏳ Agenda</span>
    <span className="hidden sm:inline">⏳ Linha do Tempo</span>
  </button>
  <button ...>
    <span className="sm:hidden">📈 Stats</span>
    <span className="hidden sm:inline">📈 Estatísticas</span>
  </button>
</div>
```

### Problema 2 — Formulário de entrada de tarefas comprimido em telas pequenas
- **Linha:** 302
- **Severidade:** Média
- **Descrição:** O formulário usa `flex gap-2` com três elementos em linha: textarea (`w-full`), botão mic (`p-3 shrink-0` ≈ 44px) e botão submit (`px-4 py-3 shrink-0` ≈ 86px). Em telas de 320px (área útil ≈ 288px), a textarea fica com apenas ~142px de largura — muito estreita. O texto do botão submit "Adicionar" não é abreviado para mobile. Em 360px a textarea fica com ~182px — aceitável mas ainda apertado.
- **Código atual:**
```jsx
<form onSubmit={handleTaskSubmit} className="flex gap-2 mb-6">
  <textarea ... className="w-full ..." />
  <button type="button" ... className="p-3 shrink-0 ...">
    {isRecording ? '🎙️' : '🎤'}
  </button>
  <button type="submit" ...
    className="bg-indigo-600 text-white px-4 sm:px-6 py-3 shrink-0 ...">
    {isAddingTask ? 'Add...' : 'Adicionar'}
  </button>
</form>
```
- **Código corrigido:**
```jsx
<form onSubmit={handleTaskSubmit} className="flex gap-2 mb-6">
  <textarea ... className="w-full min-w-0 ..." />
  <button type="button" ... className="p-3 shrink-0 ...">
    {isRecording ? '🎙️' : '🎤'}
  </button>
  <button type="submit" ...
    className="bg-indigo-600 text-white px-3 sm:px-6 py-3 shrink-0 ...">
    <span className="sm:hidden">{isAddingTask ? '...' : 'Add'}</span>
    <span className="hidden sm:inline">{isAddingTask ? 'Add...' : 'Adicionar'}</span>
  </button>
</form>
```

### Problema 3 — Pill do slider de energia pode exceder viewport em telas de 320px
- **Linha:** 231–244
- **Severidade:** Média
- **Descrição:** O pill do slider de energia é um `flex items-center` com label `whitespace-nowrap` + slider `w-24 sm:w-32`. O conteúdo total estimado: texto "Minha Energia: 10/10" (~155px) + gap-3 (12px) + slider w-24 (96px) + px-4*2 (32px) ≈ **295px**. Em telas de 320px (área útil após padding do pai ≈ 288px), o pill transbordam em ~7px, podendo causar scroll horizontal da página. A largura do slider em mobile deveria ser menor.
- **Código atual:**
```jsx
<div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-gray-200 shadow-sm">
  <label htmlFor="energy" className="text-sm font-medium text-gray-700 whitespace-nowrap">
    Minha Energia: <span ...>{currentEnergy}/10</span>
  </label>
  <input ... className="w-24 sm:w-32 h-2 ..." />
</div>
```
- **Código corrigido:**
```jsx
<div className="flex items-center gap-2 sm:gap-3 bg-white px-3 sm:px-4 py-2 rounded-full border border-gray-200 shadow-sm w-full sm:w-auto">
  <label htmlFor="energy" className="text-sm font-medium text-gray-700 whitespace-nowrap">
    <span className="sm:hidden">Energia: </span>
    <span className="hidden sm:inline">Minha Energia: </span>
    <span ...>{currentEnergy}/10</span>
  </label>
  <input ... className="flex-1 sm:w-32 min-w-[60px] h-2 ..." />
</div>
```

### Problema 4 — Container main sem padding horizontal explícito em mobile (dependência de filho)
- **Linha:** 211–212
- **Severidade:** Baixa
- **Descrição:** O `<main>` não tem `px-*` para mobile — confia no filho `<div className="px-4 py-6 sm:px-0">` para prover padding. Se qualquer componente filho sair do fluxo ou usar largura absoluta, não haverá barreira de contenção no `<main>`. Não causa quebra atual, mas é um risco arquitetural.
- **Código atual:**
```jsx
<main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">
  <div className="px-4 py-6 sm:px-0">
```
- **Código corrigido:**
```jsx
<main className="mx-auto max-w-7xl py-6 px-4 sm:px-6 lg:px-8 overflow-x-hidden">
  <div className="sm:px-0">
```

✅ [src/pages/Home.tsx concluído]

---

## src/components/TaskBoard.tsx
**Problemas encontrados:** 3

### Problema 1 — CRÍTICO: Colunas Kanban com min-width fixo forçam scroll lateral agressivo
- **Linha:** 73 e 88
- **Severidade:** Crítica
- **Descrição:** O container do Kanban é `flex gap-4 overflow-x-auto`. Cada coluna tem `min-w-[300px]`. Com 3 colunas: 3×300px + 2×16px (gap-4) = **932px** de conteúdo em um telefone de 360px (área útil ≈ 328px). O usuário precisa rolar ~604px horizontalmente para ver as 3 colunas. Além disso, o `overflow-x-auto` no container funciona em browsers modernos, mas em alguns WebKits antigos e PWAs pode vazar para a janela principal, causando scroll da página inteira. Esta é a principal causa relatada de scroll lateral na aplicação. Em mobile, um kanban de 3 colunas scrollável é estruturalmente inacessível: o usuário perde o contexto visual entre as colunas.
- **Código atual:**
```jsx
// Linha 73
<div className="flex gap-4 overflow-x-auto pb-4">
  {COLUMNS.map(column => {
    ...
    return (
      // Linha 88
      <div key={column.id} className="flex-1 min-w-[300px] bg-gray-50 rounded-lg p-4">
```
- **Código corrigido:**
```jsx
{/* Mobile: accordion/stack por coluna. Desktop: kanban horizontal */}
<div className="flex flex-col gap-6 sm:flex-row sm:gap-4 sm:overflow-x-auto pb-4">
  {COLUMNS.map(column => {
    ...
    return (
      <div key={column.id} className="w-full sm:flex-1 sm:min-w-[280px] bg-gray-50 rounded-lg p-4">
```

### Problema 2 — Título da tarefa sem proteção contra overflow de palavras longas
- **Linha:** 94
- **Severidade:** Média
- **Descrição:** O `<h4>` do título da tarefa usa `flex items-center gap-1 flex-wrap` para envolver os badges inline, mas não possui `break-words` nem `overflow-wrap`. Uma tarefa com título contendo uma URL, código ou palavra sem espaço (ex: "AtualizarSistemaDeProducaoUrgente") vai vazar horizontalmente para fora do card, quebrando o layout.
- **Código atual:**
```jsx
<h4 className="font-semibold text-gray-900 flex items-center gap-1 flex-wrap">
```
- **Código corrigido:**
```jsx
<h4 className="font-semibold text-gray-900 flex items-center gap-1 flex-wrap break-words min-w-0">
```

### Problema 3 — Input datetime-local com largura fixa de 128px em mobile
- **Linha:** 139
- **Severidade:** Média
- **Descrição:** O input `datetime-local` tem `w-32` (128px) no mobile e `sm:w-auto` em telas maiores. Em 128px, o browser nativo pode truncar a exibição de data e hora (formato "dd/mm/aaaa, hh:mm" tem ~140px a 13px). O usuário pode não conseguir ler a data/hora completa sem interagir com o campo. Além disso, o campo fica dentro de um `flex-wrap` com outros elementos, mas sem `min-w-0` no pai pode deslocar o layout.
- **Código atual:**
```jsx
<input 
  type="datetime-local" 
  ...
  className="ml-1 bg-transparent border-none p-0 cursor-pointer text-indigo-600 focus:ring-0 w-32 sm:w-auto"
/>
```
- **Código corrigido:**
```jsx
<input 
  type="datetime-local" 
  ...
  className="ml-1 bg-transparent border-none p-0 cursor-pointer text-indigo-600 focus:ring-0 w-36 sm:w-auto text-xs"
/>
```

✅ [src/components/TaskBoard.tsx concluído]

---

## src/components/TimelineView.tsx
**Problemas encontrados:** 1

### Problema 1 — Padding interno insuficiente no container da Timeline
- **Linha:** 189
- **Severidade:** Baixa
- **Descrição:** O container raiz usa `px-2` (8px de cada lado) como padding interno. Este componente já está dentro do container do Home.tsx que provê `px-4` (16px). O `px-2` adicional é aplicado sobre esse padding, restringindo o conteúdo da timeline ainda mais. Em mobile (360px), o conteúdo da timeline fica com 360-32(Home px-4)-16(próprio px-2) = 312px disponíveis, o que é aceitável, mas o `px-2` é visualmente apertado entre o conteúdo e a borda do `max-w-4xl`. Não causa overflow, mas comprime desnecessariamente em mobile.
- **Código atual:**
```jsx
<div className="max-w-4xl mx-auto py-6 px-2">
```
- **Código corrigido:**
```jsx
<div className="max-w-4xl mx-auto py-6 px-0 sm:px-2">
```

✅ [src/components/TimelineView.tsx concluído]

---

## src/components/DashboardView.tsx
**Problemas encontrados:** 1

### Problema 1 — Eixo X do gráfico de pico de produtividade com 17 labels sobrepostos em mobile
- **Linha:** 155–166
- **Severidade:** Média
- **Descrição:** O gráfico "Horário de Pico de Foco" (BarChart) exibe 17 pontos de hora (6h até 23h) no XAxis com `tick={{fontSize: 12}}` sem `interval` configurado. Em um viewport mobile com largura de ~310px para o gráfico, cada label precisa de ~18px de espaço mínimo (17 labels × 18px = 306px). Isso causa sobreposição grave das labels do eixo X em mobile, tornando o gráfico ilegível. O gráfico "Estimativa vs Real" (LineChart) na linha 138 tem `interval="preserveStartEnd"` mas o de pico não tem.
- **Código atual:**
```jsx
{/* Linha 158 */}
<XAxis dataKey="hora" tick={{fontSize: 12}} />
```
- **Código corrigido:**
```jsx
<XAxis 
  dataKey="hora" 
  tick={{fontSize: 10}} 
  interval="preserveStartEnd"
  tickFormatter={(val) => val.replace('h', '')}
/>
```

✅ [src/components/DashboardView.tsx concluído]

---

## src/components/TaskActions.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `flex gap-2 items-center flex-wrap` — botões fazem wrap em telas pequenas ✅
- Todos os botões têm tamanho adequado para touch (`px-2 py-1` mínimo)

✅ [src/components/TaskActions.tsx concluído]

---

## src/components/SettingsModal.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `fixed inset-0` overlay ✅
- `w-full max-w-md p-6 m-4` — modal fluido com margem em mobile ✅
- Todos os inputs têm `w-full` ✅

✅ [src/components/SettingsModal.tsx concluído]

---

## src/components/MultiTaskConfirmModal.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `fixed inset-0 overflow-y-auto p-4` — overlay com scroll vertical e margem ✅
- `max-w-2xl w-full max-h-full flex flex-col` — modal responsivo com scroll interno ✅
- `grid grid-cols-1 sm:grid-cols-2` — grid colapsa para 1 coluna em mobile ✅

✅ [src/components/MultiTaskConfirmModal.tsx concluído]

---

## src/components/NetworkStatus.tsx
**Problemas encontrados:** 1

### Problema 1 — Classes de animação do Tailwind não disponíveis sem plugin
- **Linha:** 11
- **Severidade:** Baixa
- **Descrição:** As classes `animate-in`, `fade-in`, `slide-in-from-bottom-4` e `duration-300` (no contexto de `animate-in`) não são utilitários padrão do Tailwind CSS v3. Elas pertencem ao pacote `tailwindcss-animate` (ou `tw-animate-css`). O `tailwind.config.ts` não tem nenhum plugin configurado. O resultado é que estas classes são silenciosamente ignoradas — o componente aparece sem animação de entrada. Não causa quebra de layout, mas a transição de aparecimento/desaparecimento do banner de offline é perdida.
- **Código atual:**
```jsx
<div className="fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
```
- **Código corrigido (opção 1 — remover classes inválidas):**
```jsx
<div className="fixed bottom-4 right-4 bg-orange-600 text-white px-4 py-2 rounded-md shadow-lg flex items-center gap-2 z-50 transition-all">
```
- **Código corrigido (opção 2 — instalar o plugin):**
```
npm install tailwindcss-animate
# Em tailwind.config.ts:
plugins: [require('tailwindcss-animate')]
```

✅ [src/components/NetworkStatus.tsx concluído]

---

## src/components/InstallPWA.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- Botão com tamanho adequado para touch (`px-3 py-1.5`)
- `ml-auto` posicionado dentro do header flex container ✅

✅ [src/components/InstallPWA.tsx concluído]

---

## src/components/BehavioralSuggestion.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `rounded-xl p-4` — container fluido ✅
- `flex items-start gap-3` — layout flex robusto, sem overflow ✅
- Texto com `text-sm leading-relaxed` — legível em mobile ✅

✅ [src/components/BehavioralSuggestion.tsx concluído]

---

## src/components/CalendarWidget.tsx
**Problemas encontrados:** 1

### Problema 1 — Área de toque dos botões de dia abaixo do mínimo recomendado
- **Linha:** 79
- **Severidade:** Baixa
- **Descrição:** Os botões de dia do calendário têm `h-10 w-10` = 40×40px. O mínimo recomendado para área de toque é 44×44px (Apple HIG) e 48×48dp (Material Design / Android). Em 40px, usuários com dedos maiores ou dificuldades motoras podem ativar o dia errado. O calendário está em um modal `max-w-sm` que é 384px de largura máxima — há espaço para aumentar os botões.
- **Código atual:**
```jsx
<button
  key={i}
  onClick={() => { onSelectDate(dateStr); onClose(); }}
  className={`h-10 w-10 rounded-full flex flex-col items-center justify-center relative transition-colors ...`}
>
```
- **Código corrigido:**
```jsx
<button
  key={i}
  onClick={() => { onSelectDate(dateStr); onClose(); }}
  className={`h-11 w-11 rounded-full flex flex-col items-center justify-center relative transition-colors ...`}
>
```

✅ [src/components/CalendarWidget.tsx concluído]

---

## src/components/NotificationEngine.tsx
**Problemas encontrados:** 0

✅ Sem problemas de responsividade — componente lógico sem renderização de UI.

✅ [src/components/NotificationEngine.tsx concluído]

---

## vite.config.ts
**Problemas encontrados:** 0

✅ Sem problemas de responsividade.
- `orientation: 'portrait-primary'` — correto para PWA mobile
- `display: 'standalone'` — correto para PWA
- `background_color: '#ffffff'` — evita flash de cor no carregamento ✅

✅ [vite.config.ts concluído]

---

## postcss.config.js
**Problemas encontrados:** 0

✅ Sem problemas — `tailwindcss` + `autoprefixer` configurados corretamente.

✅ [postcss.config.js concluído]

---

## Plano de Correção Priorizado

As correções devem ser aplicadas na ordem abaixo — críticas primeiro, depois médias por impacto de UX, depois baixas.

### Prioridade 1 — CRÍTICA (aplicar imediatamente)

**1. TaskBoard.tsx — Colunas Kanban com min-width forçando 900px de scroll**
- Arquivo: `src/components/TaskBoard.tsx`, linhas 73 e 88
- Remover `min-w-[300px]` e `flex` horizontal padrão
- Implementar layout de coluna única em mobile (stack vertical) com acordeão ou abas por status
- Impacto: elimina a principal causa relatada de scroll lateral

---

### Prioridade 2 — MÉDIA (aplicar em seguida, por ordem de visibilidade)

**2. Home.tsx — Abas de visualização longas demais para mobile (L347)**
- Arquivo: `src/pages/Home.tsx`, linha 347
- Usar labels abreviadas em mobile via `sm:hidden` / `hidden sm:inline`
- Impacto: abas visíveis sem necessidade de scroll horizontal

**3. Home.tsx — Formulário de tarefas comprimido (L302)**
- Arquivo: `src/pages/Home.tsx`, linha 302
- Abreviar label do botão submit em mobile ("Add" vs "Adicionar")
- Adicionar `min-w-0` no textarea
- Impacto: formulário utilizável em telas de 320px

**4. DashboardView.tsx — Labels sobrepostas no gráfico de pico (L160)**
- Arquivo: `src/components/DashboardView.tsx`, linha 160
- Adicionar `interval="preserveStartEnd"` e reduzir fontSize para 10
- Impacto: gráfico legível em mobile

**5. Home.tsx — Pill do slider de energia pode vazar em 320px (L231)**
- Arquivo: `src/pages/Home.tsx`, linhas 231–244
- Abreviar label "Energia:" em mobile, substituir `w-24` por `flex-1 min-w-[60px]`
- Impacto: evita overflow em telas de 320px

**6. TaskBoard.tsx — Título sem break-words (L94)**
- Arquivo: `src/components/TaskBoard.tsx`, linha 94
- Adicionar `break-words min-w-0` ao `<h4>`
- Impacto: evita que títulos com texto corrido (URLs, códigos) quebrem o layout do card

**7. TaskBoard.tsx — Input datetime-local muito estreito (L139)**
- Arquivo: `src/components/TaskBoard.tsx`, linha 139
- Aumentar de `w-32` para `w-36` e adicionar `text-xs` em mobile
- Impacto: data/hora legível sem truncar

---

### Prioridade 3 — BAIXA (melhorias complementares)

**8. NetworkStatus.tsx — Instalar plugin de animação ou remover classes inválidas (L11)**
- Arquivo: `src/components/NetworkStatus.tsx`, linha 11
- Instalar `tailwindcss-animate` ou substituir por `transition-all`
- Impacto: animação do banner offline funciona corretamente

**9. CalendarWidget.tsx — Aumentar área de toque dos botões (L79)**
- Arquivo: `src/components/CalendarWidget.tsx`, linha 79
- Trocar `h-10 w-10` por `h-11 w-11` (44×44px)
- Impacto: conforto de toque para usuários com dificuldade motora

**10. Home.tsx — Adicionar overflow-x-hidden no main (L211)**
- Arquivo: `src/pages/Home.tsx`, linha 211
- Mover padding para o `<main>` e adicionar `overflow-x-hidden`
- Impacto: barreira de contenção para overflow de qualquer filho

**11. App.tsx — Adicionar px-4 no loading state (L15)**
- Arquivo: `src/App.tsx`, linha 15
- Adicionar `px-4` ao container do loading
- Impacto: texto de loading não toca as bordas da tela

**12. App.css — Deletar arquivo morto**
- Arquivo: `src/App.css` (inteiro)
- Remover o arquivo — não está importado em lugar algum
- Impacto: limpeza de código morto; remove confusão futura
