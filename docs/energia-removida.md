# Energia — estado de retirada (removida em 01/07/2026)

Este documento registra a funcionalidade de "energia atual do usuário" como ela
existia **antes** da remoção cirúrgica de 01/07/2026, para permitir reimplementação
completa caso o usuário decida trazê-la de volta no futuro. Veja a decisão em
`DECISIONS.md`, entrada "2026-07-01 — Remoção cirúrgica da 'energia atual do usuário'".

## O que continua existindo (não foi removido)

- `task.energy` (0-10): energia necessária para executar a tarefa. Editável no
  `TaskEditModal`, extraível pelo parser (`energia alta/media/baixa`, `eN`).
- O motor de ranking (`src/lib/ranking.ts`) ainda pondera energia da tarefa (20%
  do score), mas contra uma baseline fixa (`BASELINE_ENERGY = 5`) em vez do valor
  ajustável pelo usuário.
- As colunas `profiles.current_energy`, `profiles.active_context`,
  `profiles.energy_updated_at` e o trigger `trg_profiles_energy_lww` (migrations
  `0011_profile_energy.sql` e `0012_profiles_energy_lww_trigger.sql`) permanecem
  intactos no banco. O app só parou de ler/escrever `current_energy` —
  `active_context`/`energy_updated_at` seguem em uso pelo recurso de contexto.

## O que foi removido

### 1. UI — slider no header da Home

Vivia em `src/pages/Home.tsx`, dentro do header sticky, como um `<label>` com
ícone `Zap`, um `<input type="range" min=0 max=10>` e o texto "Energia · N/10".
Estilizado por `.energy-slider` em `src/index.css` (gradiente dinâmico via
custom property `--energy-percent`, thumb branco com sombra). O valor mudava
`contextStore.currentEnergy` via `setCurrentEnergy`.

### 2. Estado local — `contextStore.ts`

```ts
interface ContextState {
  currentEnergy: number;                 // default 5
  energyUpdatedAt: string | null;
  setCurrentEnergy: (energy: number) => void;
  setEnergyFromRemote: (energy: number, context: ContextType, updatedAt: string) => void;
  // ...
}
```

`setActiveContext` e `setCurrentEnergy` atualizavam o mesmo timestamp
(`energyUpdatedAt`), usado para LWW tanto de energia quanto de contexto.
Persistido via zustand/persist (`secretario-task:context-store`).

### 3. Sincronização multi-device — `sync.ts` / `App.tsx`

- `fetchProfileFromCloud()` selecionava `current_energy` além de `active_context`
  e `energy_updated_at`, e só sobrescrevia o valor local se o timestamp remoto
  fosse estritamente mais recente (LWW client-side).
- `pushEnergyToCloud(energy, context, updatedAt)` fazia upsert de
  `current_energy` + `active_context` + `energy_updated_at` em `profiles`.
- `App.tsx` assinava `useContextStore` e, a cada mudança em `currentEnergy` OU
  `activeContext`, disparava um debounce de 800ms antes de chamar
  `pushEnergyToCloud`.
- No servidor, o trigger `trg_profiles_energy_lww` (migration 0012) revertia
  `current_energy`, `active_context` e `energy_updated_at` para os valores
  antigos se a escrita chegasse com timestamp mais antigo que o já salvo —
  resolvendo a race condition original de 3 dispositivos mostrando energias
  diferentes (registrada em DECISIONS.md, 2026-06-07).

### 4. Motor de ranking — `ranking.ts`, `briefing.ts`, `useAgendaPositions.ts`

`calculateTaskScore(task, currentEnergy, activeContext)` recebia a energia do
usuário como parâmetro e calculava:

```ts
const energyDiff = Math.abs((taskEnergy / 10) - (currentEnergy / 10));
const f_energy = 1.0 - energyDiff; // 20% do score final
```

Esse valor era propagado por toda a cadeia de chamadas: `getDailyBriefing`
(Foco/Top 3), `calculateAgendaBlocks`/`useAgendaPositions` (reordenação da
timeline em tempo real conforme o slider mudava).

### 5. Payload do Coach IA — `coachAIGuardrails.ts`, `ai.ts`, `coachAICache.ts`

`GovernedCoachAIPayload.current_energy` incluía a energia do usuário no
contrato JSON enviado à IA (`buildGovernedCoachAIPayload`), e o valor também
entrava no `input_hash` do cache de narrativa (`buildCoachAIInputHash` em
`coachAICache.ts`). A IA recebia o dado como contexto informativo — não havia
guardrail que a obrigasse a comentar sobre energia baixa/alta.

## Como reimplementar

1. Reverter os pontos acima (UI, `contextStore`, `sync.ts`/`App.tsx`, parâmetro
   `currentEnergy` no motor de ranking, campo no payload do Coach IA) — o diff
   de remoção do commit de 01/07/2026 é o guia mais direto (`git log` /
   `git show` nesse commit).
2. As colunas e o trigger no banco já existem — não é necessária nova migration
   para trazer a coluna de volta.
3. Decidir de novo a semântica de `f_energy` caso o comportamento desejado não
   seja idêntico ao original (match `1 - |taskEnergy/10 - currentEnergy/10|`).
