# QA Coach v4.2 — Agenda/Timeline only

Data da verificação: 2026-06-27

Base verificada: `main`, após Fase 1 `e6d4e76`

Escopo: remoção do Kanban como view operacional, mantendo Agenda/Timeline, Dashboard, captura rápida, FocoSheet sem timer e camada lógica do Coach.

## Hotfix bloqueante

O smoke pré-tag encontrou um bloqueio: após concluir uma tarefa, ela saía da timeline ativa e não havia caminho visual normal para abrir o modal e clicar em "Reabrir".

Correção aplicada:

- Timeline principal continua focada somente em tarefas abertas/executáveis.
- A Agenda ganhou a seção secundária "Resolvidas neste dia".
- A seção recupera concluídas por `completed_at` e canceladas/delegadas/obsoletas por `resolved_at`.
- Tocar em uma resolvida abre o modal existente da Agenda.
- Reabrir continua usando `buildReopenUpdates('todo')`.

## Resultado dos fluxos

| Fluxo | Coberto por teste automatizado? | Resultado | Evidência |
|---|---|---|---|
| Captura rápida via Agenda preserva parser determinístico | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Estimativas preservam origem `ai`, `default_30`, `parser`, `manual` | parcial | pass | `scripts/coachV41Flows.fixtures.ts` |
| Conclusão usa `buildCompleteUpdates` e grava campos semânticos | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Concluir sem `started_at` não infla `actual_minutes` | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Reabrir na Agenda usa `buildReopenUpdates('todo')` | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Resolvidas do dia ficam fora da timeline ativa, mas acessíveis para reabrir | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Adiar com motivo incrementa contador e grava `blocker_type` | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Adiar sem motivo incrementa e mantém `blocker_type=null` | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Cancelar, delegar e obsoletar encerram sem execução e sem tombstone | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Dashboard/sinais usam `completed_at`, não `updated_at`, e separam legado | parcial | pass | `scripts/coachV41Flows.fixtures.ts` |
| Briefing/IA mantém hash sem `updated_at`, cache e guardrails | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Recorrência não herda `postponed_count` e conta instâncias individualmente | sim | pass | `scripts/coachV41Flows.fixtures.ts` |

## Validações

- `npm run lint`: passou.
- `npm run build`: passou, com aviso conhecido de chunk maior que 500 kB.
- `npm run test`: passou.
- `npm audit`: passou, 0 vulnerabilidades.

## Remoção validada

- Kanban removido de `Home.tsx`.
- `src/components/TaskBoard.tsx` removido.
- `src/components/TaskActions.tsx` removido por estar órfão após remoção do Kanban.
- `@dnd-kit/core` e `@dnd-kit/utilities` removidos porque não havia uso em `src`.

## Requer smoke manual

- Capturar tarefa pela Agenda em desktop e mobile.
- Concluir tarefa pela Agenda.
- Reabrir tarefa concluída pela seção "Resolvidas neste dia" e confirmar retorno visual para `todo`.
- Reabrir tarefa cancelada/delegada/obsoleta pela seção "Resolvidas neste dia".
- Adiar pela Agenda com e sem motivo.
- Encerrar pela Agenda como cancelada, delegada e obsoleta.
- Editar estimativa manual pela Agenda e confirmar `estimated_minutes_source='manual'`.
- Conferir Dashboard, especialmente "Conclusões por área" e "Qualidade dos registros de tempo".
- Conferir FocoSheet: briefing/top tarefas sem botão de iniciar timer.

## Veredito

A validação v4.2 passa a ser Agenda/Timeline-only. A camada lógica permanece íntegra, sem bloqueador técnico identificado nesta edição.
