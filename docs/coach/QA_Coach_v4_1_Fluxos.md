# QA Coach v4.1 — Fluxos críticos

Data da verificação: 2026-06-27

Tag/base verificada: `coach-v4.1-final`

HEAD testado: `fd47899 chore: remove dead code, idempotência de constraint, reabertura na Agenda (Sprint 12-B)`

## Escopo

Verificação agêntica dos 10 fluxos críticos do Coach v4.1 na camada de lógica executável do app: funções puras, store, filtros, motor de sinais, recorrência, cache e guardrails da IA.

Não houve alteração de código de produção, lógica do app, schema ou dependências.

## Resultado dos fluxos

| Fluxo | Coberto por teste automatizado? | Resultado | Evidência |
|---|---|---|---|
| 1. Captura rápida via parser determinístico | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| 2. Estimativas e origem (`ai`, `default_30`, `parser`, `manual`) | parcial | pass | `scripts/coachV41Flows.fixtures.ts` |
| 3. Iniciar e concluir com `completed_at`, resolução e timer | parcial | pass | `scripts/coachV41Flows.fixtures.ts` |
| 4. Reabrir pelo Kanban limpa campos críticos | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| 5. Reabrir pela Agenda usa `buildReopenUpdates` | parcial | pass | `scripts/coachV41Flows.fixtures.ts` |
| 6. Adiar com motivo incrementa contador e grava `blocker_type` | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| 7. Adiar sem motivo incrementa e não bloqueia | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| 8. Cancelar, delegar e obsoletar encerram sem execução e sem tombstone | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| 9. Dashboard/sinais ignoram `updated_at` para conclusão e separam legado | parcial | pass | `scripts/coachV41Flows.fixtures.ts` |
| 10. Briefing/IA usa hash sem `updated_at`, cache e guardrails | sim | pass | `scripts/coachV41Flows.fixtures.ts` |

Testes adicionais:

| Teste | Coberto por teste automatizado? | Resultado | Evidência |
|---|---|---|---|
| Cerne v4: `completed_at` vence `updated_at` após edição | sim | pass | `scripts/coachV41Flows.fixtures.ts` |
| Recorrência: nova instância sem herdar `postponed_count`; instâncias contam individualmente | sim | pass | `scripts/coachV41Flows.fixtures.ts` |

## Validações

- `npm run lint`: passou.
- `npm run build`: passou. Observação: permanece o aviso conhecido de chunk maior que 500 kB.
- `npm run test`: passou, incluindo fixtures existentes e `coachV41Flows`.

## Achados não bloqueantes

1. Reabrir e recompletar sem `started_at`

   Observação: ao recompletar uma tarefa reaberta sem `started_at`, o app deixa `actual_minutes_source=null`.

   Decisão/observação de QA: isso é aceitável quando `actual_minutes` também está `null`, pois não há tempo real a classificar. `actual_minutes_source='unknown'` deve ser usado quando existe tempo real registrado com origem duvidosa ou suspeita.

2. Destino visual diferente na reabertura

   Observação: o Kanban reabre tarefa `done` para `doing`, enquanto a Agenda reabre tarefa `done` para `todo`.

   Decisão/observação de QA: a paridade obrigatória é a limpeza dos campos críticos por `buildReopenUpdates` (`completed_at`, `completed_at_confidence`, `resolution_type`, `resolved_at`, `started_at`, `actual_minutes`, `actual_minutes_source`). O destino visual pode variar por UX desde que essa diferença permaneça documentada.

## Requer smoke manual

- Clicar em reabrir no Kanban e confirmar o destino visual `doing`.
- Clicar em reabrir na Agenda e confirmar o destino visual `todo`.
- Conferir render real do Dashboard, incluindo o rótulo de histórico aproximado em "Conclusões por área".
- Conferir interações visuais do Kanban em mobile, incluindo drag/tap.
- Conferir modal da Agenda em mobile, incluindo botões de concluir, reabrir, adiar e encerrar.

## Veredito

A camada lógica do Coach v4.1 está íntegra para os fluxos críticos testáveis automaticamente. Não há bloqueador técnico identificado nesta verificação.
