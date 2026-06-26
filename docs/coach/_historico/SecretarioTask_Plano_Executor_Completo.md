# SecretárioTask Coach de Produtividade
## Plano Executor Completo — Sprints, Prompts e Controle de Evolução

> Documento operacional derivado de `SecretarioTask_Plano_Coach_Produtividade_v4.md`. Converte as Fases 0–5 da v4.0 em 12 sprints implementáveis (Sprint 0–11), cada um com escopo fechado, gate próprio e um prompt autocontido pronto para enviar ao Codex/Claude Code. Nenhum sprint mistura saneamento com novidade. Nenhum sprint pode deixar o app sem build.

---

## 1. Premissas operacionais

1. **Um sprint por vez.** O agente executa exatamente um sprint por prompt. Proibido adiantar fases.
2. **Stack real vence o documento.** `package.json` é a fonte da verdade (Vite 8, TS ~6, React 19.2, Tailwind 3.4, Zustand 5, Supabase JS 2, React Router 7, Recharts, DnD Kit, Lucide). Sem runner de teste instalado.
3. **O agente não commita nem dá push sozinho.** Ele deixa a árvore de trabalho pronta, roda `lint`/`build`, e **propõe** a mensagem de commit nos prefixos do `AGENTS.md` (`feat:`/`fix:`/`chore:`/`docs:`). O commit é ato de Josemar (Modo 3 do `AGENTS.md`).
4. **O agente não aplica migration no Supabase.** Ele cria o arquivo `.sql` versionado em `supabase/migrations/`, valida sintaxe localmente quando possível, e descreve o passo de aplicação. Aplicar no banco e rodar backfill é ato operacional de Josemar.
5. **Invariantes inegociáveis em todo sprint:** captura rápida sem fricção; sync e offline-first intactos; RLS em toda tabela; soft delete via `deleted_at`; `TaskStatus` permanece `'todo'|'doing'|'done'`; IA opcional e não-bloqueante; `updated_at` nunca tratado como conclusão; `deleted_at` nunca usado para cancelada/delegada/obsoleta; sem score; determinismo no caminho crítico; origem marcada em dado de IA/timer/estimativa; confiabilidade declarada em métrica comportamental.
6. **Gate antes de avançar.** Cada sprint só fecha com `lint` e `build` verdes e critérios de aceite cumpridos. Sprint seguinte só abre após o gate do anterior.
7. **Migrations pequenas.** Uma preocupação por migration. Numeração sequencial a partir de `0014`.
8. **Documentação viva.** Todo sprint termina atualizando `STATUS.md` e `SPRINT_LOG.md`; os demais docs conforme a natureza da mudança (§3).

---

## 2. Visão geral da sequência de sprints

| Sprint | Fase v4 | Núcleo | Migration | Toca schema | Toca sync | Toca IA |
|---|---|---|---|---|---|---|
| 0 | — | Baseline e congelamento de referência | não | não | não | não |
| 1 | Fase 0 | Contenção (sem schema, reversível) | não | não | não | não |
| 2 | Fase 1A | `completed_at` + `completed_at_confidence` + backfill | `0014` | sim | sim | não |
| 3 | Fase 1B | `resolution_type` + `resolved_at` + helper de tarefa ativa | `0015` | sim | sim | não |
| 4 | Fase 1C | Eventos confiáveis (CHECK ampliado + trigger server-stamp) | `0016` | sim (events) | sim | não |
| 5 | Fase 1D | `actual_minutes_source` + `estimated_minutes_source` | `0017` | sim | sim | sim (marcação) |
| 6 | Fase 2 | Reabertura limpa + teto de timer + adiar com motivo | opcional `0018` | talvez | não | não |
| 7 | Fase 3 | Dashboard honesto + separação histórico/saneamento | não | não | não | não |
| 8 | Fase 4 | `diagnostics.ts` puro + fixtures + decisão de runner | não | não | não | não |
| 9 | Fase 5A | Governança da IA existente (origem, fallback, sem diagnóstico) | não | não | não | sim |
| 10 | Fase 5B | Briefing cacheado por `input_hash` + prompt versionado | não | não | não | sim |
| 11 | — | Auditoria final, hardening e fechamento | não | não | não | não |

Princípio da ordem: **conter** (1) antes de **medir verdade** (2), antes de **classificar** (3), antes de **auditar** (4), antes de **rotular origem** (5), antes de **corrigir fluxos** (6), antes de **exibir** (7), antes de **diagnosticar** (8), antes de **governar IA** (9–10), antes de **fechar** (11).

---

## 3. Política de documentação e controle de evolução

Ritual base do `AGENTS.md` (Modo 3 ao fim de cada sprint). O agente **prepara** as atualizações; Josemar confirma e commita.

### `STATUS.md` — ao final de TODO sprint
- Sprint concluído e número.
- Data (`YYYY-MM-DD`).
- Branch/commit (preenchido por Josemar ao commitar).
- Status de `lint`/`build`.
- Próximo sprint recomendado.
- Bloqueios e pendências (ex.: "migration 0014 ainda não aplicada no Supabase").

### `SPRINT_LOG.md` — ao final de TODO sprint
- Objetivo do sprint.
- Resumo do que foi feito.
- Arquivos alterados.
- Validações executadas e resultado.
- Bugs encontrados.
- Decisões tomadas.
- Pendências.

### `ROADMAP.md` — quando
- Uma fase for concluída.
- A ordem de sprints mudar.
- Um risco virar novo sprint.
- Uma decisão alterar escopo.

### `DECISIONS.md` — quando houver
- Decisão arquitetural; mudança de schema; decisão de **não** fazer algo; decisão sobre IA; decisão sobre sync/offline; decisão sobre teste/runner; decisão sobre dado legado.

### `ARCHITECTURE.md` — quando houver
- Novo modelo semântico; mudança em sync; mudança em eventos; criação de `diagnostics.ts`; governança de IA.

### `PRD.md` — apenas quando
- Houver mudança perceptível de comportamento de produto (ex.: surgimento de ações cancelar/delegar; dashboard separando histórico de saneamento).

### Mapa rápido sprint → docs obrigatórios
| Sprint | STATUS | SPRINT_LOG | ROADMAP | DECISIONS | ARCHITECTURE | PRD |
|---|---|---|---|---|---|---|
| 0 | sim | sim | — | baseline | — | — |
| 1 | sim | sim | fase 0 done | sim | — | sim (rótulos) |
| 2 | sim | sim | fase 1A done | sim | sim | — |
| 3 | sim | sim | fase 1B done | sim | sim | sim (ações) |
| 4 | sim | sim | fase 1C done | sim | sim | — |
| 5 | sim | sim | fase 1D done | sim | sim | — |
| 6 | sim | sim | fase 2 done | sim | talvez | sim (reabertura/adiar) |
| 7 | sim | sim | fase 3 done | sim | talvez | sim (dashboard) |
| 8 | sim | sim | fase 4 done | sim (runner) | sim | — |
| 9 | sim | sim | fase 5A done | sim | sim | — |
| 10 | sim | sim | fase 5B done | sim | sim | talvez |
| 11 | sim | sim | projeto fechado | sim (fechamento) | sim | sim |

---

## 4. Sprints detalhados

> Cada sprint abaixo traz: objetivo, justificativa, escopo incluído/excluído, arquivos prováveis, migrations, riscos, mitigação, critérios de aceite, comandos obrigatórios, atualizações de doc e mensagem de commit sugerida. O **prompt pronto e autocontido** de cada sprint está na §5 (Prompt Sprint N), para não duplicar texto.

### Sprint 0 — Preparação e congelamento de referência

**Objetivo.** Garantir repositório íntegro e baseline registrada antes de qualquer alteração.
**Justificativa.** Sem baseline confirmada, não há como atribuir regressões aos sprints seguintes.
**Escopo incluído.** `npm ci`; `npm run lint`; `npm run build`; leitura dos docs; confirmação da versão do `package.json`; confirmação dos arquivos críticos (`sync.ts`, `taskStore.ts`, `behaviorEngine.ts`, `DashboardView.tsx`, `BehavioralSuggestion.tsx`, `types/index.ts`, `supabase/migrations`); registro do baseline em `STATUS.md`; confirmação de branch limpa.
**Escopo excluído.** Qualquer código funcional, migration ou refactor.
**Arquivos prováveis.** Apenas `STATUS.md` e `SPRINT_LOG.md` (registro).
**Migrations.** Nenhuma.
**Riscos.** `npm ci` falhar por lockfile; build quebrado pré-existente.
**Mitigação.** Se `lint`/`build` falharem **antes** de qualquer mudança, parar e reportar — é bloqueio de baseline, não escopo de sprint.
**Critérios de aceite.** `lint` e `build` verdes na árvore intocada; baseline (versões, hashes de arquivos críticos, status dos gráficos atuais) registrada em `STATUS.md`.
**Comandos obrigatórios.** `npm ci`, `npm run lint`, `npm run build`.
**Docs.** `STATUS.md` (baseline), `SPRINT_LOG.md`.
**Commit sugerido.** `chore: baseline e congelamento de referência (Sprint 0)`

### Sprint 1 — Fase 0: Contenção imediata do coach atual

**Objetivo.** Parar a exibição de conclusões falsas sem tocar banco. Reversível.
**Justificativa.** `updated_at` alimenta sugestão comportamental e blocos do dashboard como se fosse conclusão. A sugestão recomenda ação — é o vetor mais perigoso.
**Escopo incluído.** Desativar renderização de `BehavioralSuggestion`; rebaixar/rotular como "aproximado por edição" os blocos de `DashboardView` que leem `updated_at` (Horário de pico; "Esta semana"/"hoje"); congelar `behaviorEngine.ts` com comentário de bloqueio até Sprint 2; manter intactas as métricas que **não** dependem de `updated_at`.
**Escopo excluído.** Migration, coluna, alteração de `TaskStatus`, evento novo, qualquer toque em `sync.ts` ou `taskStore.ts`.
**Arquivos prováveis.** `src/components/BehavioralSuggestion.tsx`, `src/components/DashboardView.tsx`, `src/lib/behaviorEngine.ts`; docs.
**Migrations.** Nenhuma.
**Riscos.** Ocultar métrica legítima junto; deixar `behaviorEngine` com import órfão quebrando build.
**Mitigação.** Mexer só nos três blocos derivados de `updated_at`; se desligar a sugestão, garantir que nenhum import fica sem uso (lint pega).
**Critérios de aceite.** `BehavioralSuggestion` não renderiza; dashboard não exibe "concluídas hoje" derivado de edição como fato; total/contexto/estimado×real/prioridade/adiadas continuam visíveis; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`.
**Docs.** `DECISIONS.md` (decisão `updated_at`≠conclusão; desativação da sugestão; rótulos), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 0 done), `PRD.md` (rótulos de aproximação).
**Commit sugerido.** `fix: conter coach (updated_at não é conclusão) — Fase 0 (Sprint 1)`

### Sprint 2 — Fase 1A: Timestamp honesto mínimo

**Objetivo.** Introduzir a verdade da conclusão com o menor schema possível.
**Justificativa.** Sem `completed_at`, toda métrica de horário é mentira herdada de `updated_at`.
**Escopo incluído.** Migration `0014` adicionando `completed_at timestamptz null` e `completed_at_confidence text null CHECK in ('confirmed','legacy_approx')`; backfill (na aplicação) marcando `status='done'` com `completed_at=updated_at` e `confidence='legacy_approx'`; `TASK_COLUMNS += completed_at, completed_at_confidence`; `Task`/`TaskInput`; gravar `completed_at=now()`/`confidence='confirmed'` na 1ª transição para `done` (`buildCompleteUpdates`); dashboard e behaviorEngine passam a ler `completed_at` ignorando `legacy_approx` em métricas de horário.
**Escopo excluído.** `resolution_type`, eventos, `*_source`, reabertura (vão nos sprints seguintes).
**Arquivos prováveis.** `supabase/migrations/0014_*.sql`, `src/lib/sync.ts`, `src/types/index.ts`, `src/components/TaskBoard.tsx` (`buildCompleteUpdates`), `src/components/DashboardView.tsx`, `src/lib/behaviorEngine.ts`; docs.
**Migrations.** `0014_completed_at.sql` (coluna + CHECK + backfill).
**Riscos.** Esquecer `completed_at` no `TASK_COLUMNS` (campo não sincroniza); strip indevido removendo `completed_at`; backfill marcar como `confirmed` por engano; `completed_at` ser reescrito em edições.
**Mitigação.** Conferir os três contratos (`TASK_COLUMNS`, tipos, ponto de escrita); **não** adicionar `completed_at` ao `stripReadonlyTaskFields`; backfill sempre `legacy_approx`; escrever `completed_at` só na transição `!=done → done`.
**Critérios de aceite.** Nova conclusão grava `completed_at`/`confirmed`; edição posterior não altera `completed_at`; dashboard lê `completed_at`; legados marcados `legacy_approx`; sync de conclusão retorna `completed_at` do servidor; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`. Aplicação da migration: passo manual de Josemar.
**Docs.** `ARCHITECTURE.md` (modelo de conclusão de duas camadas), `DECISIONS.md` (legado/`legacy_approx`), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 1A done).
**Commit sugerido.** `feat: completed_at honesto + backfill legacy_approx — Fase 1A (Sprint 2)`

### Sprint 3 — Fase 1B: Semântica de resolução

**Objetivo.** Distinguir "feito" de "encerrado sem fazer".
**Justificativa.** Cancelar/delegar/obsoletar não pode usar `deleted_at` (some do store) nem inflar produtividade.
**Escopo incluído.** Migration `0015` com `resolution_type text null CHECK in ('completed','cancelled','delegated','obsolete')` e `resolved_at timestamptz null`; backfill `done → resolution_type='completed', resolved_at=completed_at`; `TASK_COLUMNS`/tipos; helper `isActiveTask` excluindo `resolution_type IN ('cancelled','delegated','obsolete')` das listas operacionais sem usar `deleted_at`; ações discretas Cancelar/Delegar/Obsoleta (44×44, fora da captura).
**Escopo excluído.** Campo "delegado para quem"; encerrar série recorrente inteira; eventos (Sprint 4).
**Arquivos prováveis.** `supabase/migrations/0015_*.sql`, `src/types/index.ts`, `src/lib/sync.ts`, `src/lib/taskFilters.ts` (helper), `src/components/TaskActions.tsx`/`TaskBoard.tsx`/`TimelineView.tsx`; docs.
**Migrations.** `0015_resolution_semantics.sql`.
**Riscos.** Resolver via `deleted_at` por engano; tarefa resolvida sumir de buscas/contagens; conflito com filtros existentes de `isActionableBriefingTask`; ações poluírem captura.
**Mitigação.** Resolução nunca toca `deleted_at`; manter resolvidas buscáveis/contáveis; centralizar exclusão das listas ativas no helper; ações fora do fluxo de captura.
**Critérios de aceite.** Cancelar/delegar/obsoleta marca campos e some das listas ativas, mas permanece buscável e contável; `completed_at` NULL para não-concluídas; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`. Migration: manual.
**Docs.** `ARCHITECTURE.md` (resolução), `DECISIONS.md` (não usar `deleted_at`; `completed_at`⊂`resolved_at`), `PRD.md` (novas ações), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 1B done).
**Commit sugerido.** `feat: resolution_type/resolved_at sem deleted_at — Fase 1B (Sprint 3)`

### Sprint 4 — Fase 1C: Eventos confiáveis

**Objetivo.** Tornar `task_events` fonte temporal auditável e server-stamped.
**Justificativa.** Hoje só `viewed` é gravado, e com `created_at` do cliente — sujeito a clock skew. Conclusão precisa de âncora confiável.
**Escopo incluído.** Migration `0016` ampliando o CHECK de `task_events.type` para incluir `started`, `completed`, `reopened`, `postponed` (e opcionalmente `resolved`) e criando trigger `BEFORE INSERT` que força `created_at=now()`; cliente passa a **não** enviar `created_at` em eventos; emitir `completed` na conclusão, `started` no iniciar, `reopened` na reabertura, `postponed` no adiar; eventos best-effort (falha de evento nunca bloqueia a operação principal).
**Escopo excluído.** `*_source` (Sprint 5); reabertura limpando campos (Sprint 6 cuida do estado da task; aqui só o evento).
**Arquivos prováveis.** `supabase/migrations/0016_*.sql`, `src/stores/taskStore.ts` (emissão de eventos, remover `created_at` do payload), `src/lib/sync.ts` (insert de task_event), `src/components/TaskBoard.tsx`; docs.
**Migrations.** `0016_task_events_expand_stamp.sql`.
**Riscos.** CHECK antigo barrar eventos novos antes da migration aplicar; cliente continuar enviando `created_at`; emissão de evento bloquear conclusão; volume de eventos pesar.
**Mitigação.** Eventos só passam a ser emitidos após a migration estar aplicada (documentar dependência); envolver emissão em try/catch não-bloqueante; manter throttle onde fizer sentido.
**Critérios de aceite.** Eventos `started/completed/reopened/postponed` chegam ao servidor com `created_at` server-side; nenhuma operação principal falha se o evento falhar; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`. Migration: manual.
**Docs.** `ARCHITECTURE.md` (eventos/carimbo), `DECISIONS.md` (server-stamp; best-effort), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 1C done).
**Commit sugerido.** `feat: eventos confiáveis server-stamped — Fase 1C (Sprint 4)`

### Sprint 5 — Fase 1D: Origem dos dados e governança de campos

**Objetivo.** Marcar procedência de todo dado influenciável por IA/timer/estimativa.
**Justificativa.** `estimated_minutes` por IA (`temperature 0.3`) e `actual_minutes` por timer hoje não têm origem; sem isso não há eixo de confiabilidade.
**Escopo incluído.** Migration `0017` com `actual_minutes_source text null CHECK in ('timer','manual','retroactive','unknown')` e `estimated_minutes_source text null CHECK in ('default_30','manual','ai','parser')`; gravar `estimated_minutes_source='ai'` quando vier de `estimateTaskTime`, `'default_30'`/`'parser'` no fallback, `'manual'` no stepper de minutos; gravar `actual_minutes_source='timer'` quando vier de `started_at`.
**Escopo excluído.** Teto de timer (Sprint 6); exibição de confiabilidade no dashboard (Sprint 7).
**Arquivos prováveis.** `supabase/migrations/0017_*.sql`, `src/types/index.ts`, `src/lib/sync.ts`, `src/pages/Home.tsx` (`handleConfirmMultiTasks`/`estimateTaskTime`), `src/components/TaskBoard.tsx` (stepper, `buildCompleteUpdates`); docs.
**Migrations.** `0017_data_source_fields.sql`.
**Riscos.** Esquecer origem em algum ponto de escrita; `source` divergir do valor real; campos novos fora do `TASK_COLUMNS`.
**Mitigação.** Auditar todos os pontos que escrevem `estimated_minutes`/`actual_minutes`; cada escrita acompanha seu `source`; conferir contratos de sync.
**Critérios de aceite.** Todo `estimated_minutes`/`actual_minutes` novo carrega `*_source` coerente; nenhuma escrita sem origem; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`. Migration: manual.
**Docs.** `ARCHITECTURE.md` (governança de campos/origem), `DECISIONS.md` (IA marcada, nunca determinística), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 1D done).
**Commit sugerido.** `feat: origem de estimated/actual minutes — Fase 1D (Sprint 5)`

### Sprint 6 — Fase 2: Ajustes nos fluxos existentes

**Objetivo.** Corrigir os pontos de escrita que produzem dado frágil.
**Justificativa.** Reabertura recalcula `actual_minutes` do `started_at` antigo (tempo inflado) e mantém resolução fantasma; timer sem teto grava jornadas inteiras como tempo real.
**Escopo incluído.** Reabertura (`handleStatusRevert`): ao sair de `done`, limpar `completed_at`, `resolved_at`, `resolution_type` e `started_at`, emitindo `reopened`; teto de timer em `buildCompleteUpdates` (ex.: `> 8h` → grava mas marca `actual_minutes_source='unknown'`/suspeita); adiar com `blocker_type` opcional (CHECK in `waiting_third_party,no_time,priority_changed,needs_split,dependency`) sem bloquear captura.
**Escopo excluído.** Diagnóstico que consome esses dados (Sprint 8); UI de qualidade no dashboard (Sprint 7).
**Arquivos prováveis.** `src/components/TaskBoard.tsx` (`handleStatusRevert`, `buildCompleteUpdates`, postpone), `src/components/TimelineView.tsx` (postpone), `src/types/index.ts`, possivelmente migration `0018_blocker_type.sql`; docs.
**Migrations.** Opcional `0018_blocker_type.sql` (se `blocker_type` for persistido).
**Riscos.** Limpar campos demais na reabertura; teto arbitrário cortar tempo legítimo; motivo de adiamento virar fricção.
**Mitigação.** Limpar só os quatro campos citados; teto **marca** suspeita, não descarta o valor; `blocker_type` é opcional e nunca bloqueia o adiar.
**Critérios de aceite.** Reabrir zera conclusão/resolução e `started_at`, emite `reopened`, mantém histórico em `task_events`; recompletar não infla tempo; timer acima do teto é marcado; adiar com motivo é opcional; tap targets 44×44; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`. Migration (se houver): manual.
**Docs.** `DECISIONS.md` (regra de reabertura; teto; motivo opcional), `ARCHITECTURE.md` (se `blocker_type` entrar), `PRD.md` (reabrir/adiar com motivo), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 2 done).
**Commit sugerido.** `fix: reabertura limpa + teto de timer + adiar com motivo — Fase 2 (Sprint 6)`

### Sprint 7 — Fase 3: Dashboard corrigido e qualidade do dado

**Objetivo.** Dashboard honesto, separando produtividade de qualidade do dado.
**Justificativa.** Os rótulos de contenção do Sprint 1 viram correção definitiva agora que `completed_at` e origem existem.
**Escopo incluído.** Migrar todas as métricas de horário de `updated_at` → `completed_at` (`confidence='confirmed'`); separar "pós-saneamento" de "histórico frágil" (`legacy_approx` só em contagem agregada rotulada); bloco textual de qualidade do dado (confiabilidade como texto, nunca nota); reativar `BehavioralSuggestion` **apenas** se houver massa de dado `confirmed` suficiente (gate de qualidade, não de tempo), rotulada como narração de regra determinística.
**Escopo excluído.** Motor `diagnostics.ts` (Sprint 8); IA narrativa (Sprint 10).
**Arquivos prováveis.** `src/components/DashboardView.tsx`, `src/components/BehavioralSuggestion.tsx`, `src/lib/behaviorEngine.ts`; docs.
**Migrations.** Nenhuma.
**Riscos.** Reativar sugestão cedo demais; criar "score" disfarçado; misturar histórico com saneamento na mesma métrica de horário.
**Mitigação.** Limiar explícito de reativação (ex.: mínimo de conclusões `confirmed` por faixa horária — definir e registrar); confiabilidade só textual; horário lê só `confirmed`.
**Critérios de aceite.** Zero métrica de horário lê `updated_at`; histórico frágil separado e rotulado; sugestão só aparece sob gate de qualidade; nenhum score; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`.
**Docs.** `ARCHITECTURE.md` (regimes de dado no dashboard), `DECISIONS.md` (gate de reativação; sem score), `PRD.md` (dashboard com qualidade do dado), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 3 done).
**Commit sugerido.** `feat: dashboard honesto + qualidade do dado — Fase 3 (Sprint 7)`

### Sprint 8 — Fase 4: Motor determinístico testável

**Objetivo.** Centralizar diagnóstico em `src/lib/diagnostics.ts` puro, determinístico, com `now` injetável, e cobrir as 10 fixtures obrigatórias.
**Justificativa.** Diagnóstico espalhado é silenciosamente quebrável; um motor puro com fixtures dá regressão.
**Escopo incluído.** `diagnostics.ts` (função pura recebendo tarefas + eventos, devolvendo diagnósticos rotulados com confiança; sem IA, sem aleatoriedade); decisão registrada sobre runner de teste; fixtures cobrindo §11.
**Escopo excluído.** Consumo do motor pela IA (Sprint 10); novas métricas de produto.
**Arquivos prováveis.** `src/lib/diagnostics.ts` (novo), possivelmente `src/lib/behaviorEngine.ts` (migrar lógica para o motor), fixtures (`src/lib/__fixtures__/` ou equivalente), `package.json`/config de teste **se** a decisão for introduzir Vitest restrito; docs.
**Migrations.** Nenhuma.
**Riscos.** Introduzir runner de teste contra a regra "sem teste no MVP"; motor depender da amostra parcial de 100 tasks do `partialize`; impureza (relógio escondido, aleatoriedade).
**Mitigação.** Decisão de runner é **ponto de parada para revisão humana** (§9) — não decidir sozinho; motor recebe dados por parâmetro (séries longas vêm do Supabase, não do store); `now` sempre injetado.
**Critérios de aceite.** `diagnostics.ts` puro e determinístico; as 10 fixtures verdadeiras; decisão de runner registrada em `DECISIONS.md`; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`, e (se aprovado) o comando do runner escolhido.
**Docs.** `ARCHITECTURE.md` (motor de diagnóstico), `DECISIONS.md` (runner; amostra parcial; pureza), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 4 done).
**Commit sugerido.** `feat: diagnostics.ts determinístico + fixtures — Fase 4 (Sprint 8)`

### Sprint 9 — Fase 5A: Governança da IA existente

**Objetivo.** Mapear e conter toda entrada de IA, impedindo IA de originar diagnóstico.
**Justificativa.** `estimateTaskTime`, `smartParser`, `generateEmbedding` já influenciam dado; precisam de fallback garantido e nenhuma autoridade diagnóstica.
**Escopo incluído.** Inventário das funções de IA em `ai.ts`/`smartParser.ts` e seus efeitos; garantir fallback determinístico em todas; confirmar que nenhuma IA escreve `resolution_type`/`blocker_type`/diagnóstico; confirmar origem marcada (Sprint 5) em todos os pontos de escrita de IA; documentar.
**Escopo excluído.** Cache/`input_hash`/versionamento de prompt (Sprint 10).
**Arquivos prováveis.** `src/lib/ai.ts`, `src/lib/smartParser.ts`, `src/pages/Home.tsx`, `src/lib/sync.ts` (embedding); docs.
**Migrations.** Nenhuma.
**Riscos.** Alguma rota de IA sem fallback; IA escrevendo campo semântico indevidamente; embedding bloquear sync.
**Mitigação.** Auditar cada chamada; fallback obrigatório; embedding permanece em try/catch não-bloqueante.
**Critérios de aceite.** Todas as rotas de IA têm fallback determinístico; nenhuma IA origina diagnóstico ou escreve campo semântico; origem marcada em todo dado de IA; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`.
**Docs.** `ARCHITECTURE.md` (mapa de IA e limites), `DECISIONS.md` (IA não-diagnóstica; fallback obrigatório), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 5A done).
**Commit sugerido.** `chore: governança da IA existente (fallback, sem diagnóstico) — Fase 5A (Sprint 9)`

### Sprint 10 — Fase 5B: IA narrativa cacheada e segura

**Objetivo.** Tornar o briefing eficiente e seguro: IA narra a regra determinística, com cache e prompt versionado.
**Justificativa.** `generateSmartBriefing` refaz a chamada a cada clique e não declara que narra regra; precisa de `input_hash`, versionamento e fallback.
**Escopo incluído.** `input_hash` (hash de top tasks + energia + janela) para cachear briefing idêntico; versionar o prompt; texto da IA declarando que narra ranking/diagnóstico determinístico; fallback determinístico (já existe `getDailyBriefing` ordenado).
**Escopo excluído.** Qualquer diagnóstico originado por IA; novas chamadas de IA além das existentes.
**Arquivos prováveis.** `src/lib/ai.ts` (`generateSmartBriefing`), `src/lib/briefing.ts`, possivelmente um cache em store; docs.
**Migrations.** Nenhuma.
**Riscos.** Cache servir briefing obsoleto; hash instável; IA "interpretando" em vez de narrar.
**Mitigação.** Hash inclui todos os insumos que mudam o conteúdo; invalida ao mudar insumo; prompt restringe IA a narrar a ordem determinística.
**Critérios de aceite.** Briefing idêntico não rechama a API; prompt versionado; texto declara narração de regra; fallback intacto; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`.
**Docs.** `ARCHITECTURE.md` (cache/versionamento de briefing), `DECISIONS.md` (`input_hash`; IA narrativa), `PRD.md` (se o comportamento do briefing mudar perceptivelmente), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (Fase 5B done).
**Commit sugerido.** `feat: briefing cacheado por input_hash + prompt versionado — Fase 5B (Sprint 10)`

### Sprint 11 — Auditoria final, hardening e documentação de fechamento

**Objetivo.** Confirmar que nenhuma das proibições estruturais voltou e fechar a evolução.
**Justificativa.** Refactors longos reintroduzem padrões proibidos; o fechamento precisa de varredura objetiva.
**Escopo incluído.** Varredura por `updated_at` usado como conclusão; varredura por `deleted_at` usado para semântica; varredura por IA originando diagnóstico; verificação de `TASK_COLUMNS`/strip para todos os campos novos; `lint`/`build`; revisão de docs; checklist global (§7); plano de manutenção futura.
**Escopo excluído.** Qualquer feature nova.
**Arquivos prováveis.** Somente docs; correções pontuais se a varredura achar regressão.
**Migrations.** Nenhuma.
**Riscos.** Achar regressão tardia que exija reabrir sprint.
**Mitigação.** Se a varredura achar violação de invariante, abrir sprint de correção dedicado — não corrigir "de passagem" no fechamento.
**Critérios de aceite.** Zero ocorrência de `updated_at`-como-conclusão; zero `deleted_at`-como-semântica; zero IA-como-diagnóstico; todos os campos novos nos contratos de sync; checklist global verde; `lint`/`build` verdes.
**Comandos obrigatórios.** `npm run lint`, `npm run build`, mais as varreduras (grep) descritas no prompt.
**Docs.** `DECISIONS.md` (fechamento), `ARCHITECTURE.md` (estado final), `PRD.md` (estado final do produto), `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md` (projeto fechado).
**Commit sugerido.** `docs: auditoria final e fechamento da evolução Coach (Sprint 11)`

---

## 5. Prompts prontos para Codex ou Claude Code

> Copie um prompt por vez. Cada prompt é autocontido. Todos compartilham o mesmo cabeçalho de leitura e as mesmas invariantes; o que muda é o escopo do sprint. O agente **não commita, não dá push e não aplica migration no Supabase** — deixa a árvore pronta, roda `lint`/`build`, propõe a mensagem de commit e descreve o passo manual de migration.

### Prompt Sprint 0

```text
Você é um agente de implementação trabalhando no repositório SecretárioTask (PWA pessoal, offline-first, mobile-first). Execute SOMENTE o Sprint 0. Não escreva código funcional.

LEIA PRIMEIRO, NA ÍNTEGRA:
- SecretarioTask_Plano_Coach_Produtividade_v4.md
- SecretarioTask_Plano_Executor_Completo.md (seção Sprint 0)
- STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md, AGENTS.md, PHILOSOPHY.md

OBJETIVO: confirmar integridade do repositório e registrar baseline. Nenhuma alteração de comportamento.

PASSOS:
1. Rode: npm ci ; npm run lint ; npm run build. Registre a saída.
2. Confirme a versão real no package.json (React, Vite, TypeScript, Tailwind, Zustand, Supabase JS, React Router). Se divergir da v4, o package.json vence — anote.
3. Confirme a presença e o papel atual destes arquivos: src/lib/sync.ts (TASK_COLUMNS, stripReadonlyTaskFields), src/stores/taskStore.ts, src/lib/behaviorEngine.ts, src/components/DashboardView.tsx, src/components/BehavioralSuggestion.tsx, src/types/index.ts, supabase/migrations (lista 0001..0013).
4. Anote em STATUS.md uma seção "Baseline Coach v4" com: versões, status de lint/build, e os pontos onde updated_at é usado como conclusão hoje (behaviorEngine.ts e DashboardView.tsx: peakHourData, dailyData, weekTotal, todayCount).

NÃO FAÇA: nenhuma migration, nenhum refactor, nenhuma mudança em código funcional.

VALIDAÇÃO OBRIGATÓRIA: npm run lint e npm run build devem passar na árvore intocada. Se falharem antes de qualquer mudança, PARE e reporte como bloqueio de baseline.

DOCS: atualize STATUS.md (baseline) e SPRINT_LOG.md (registro do Sprint 0).

NÃO COMMITE, NÃO DÊ PUSH. Proponha a mensagem: "chore: baseline e congelamento de referência (Sprint 0)".

RELATÓRIO FINAL (obrigatório): arquivos alterados; versões confirmadas; saída de lint/build; pontos de updated_at-como-conclusão mapeados; riscos remanescentes; próximo sprint recomendado (Sprint 1).
```

### Prompt Sprint 1

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 1 (Fase 0 — Contenção). Reversível, sem schema.

LEIA PRIMEIRO: SecretarioTask_Plano_Coach_Produtividade_v4.md (Fase 0); SecretarioTask_Plano_Executor_Completo.md (Sprint 1); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e os arquivos: src/components/BehavioralSuggestion.tsx, src/components/DashboardView.tsx, src/lib/behaviorEngine.ts.

INVARIANTES (não viole): preserve captura rápida, sync, offline-first, RLS, soft delete, TaskStatus atual ('todo'|'doing'|'done'), IA opcional. NÃO crie migration. NÃO toque sync.ts nem taskStore.ts. updated_at NUNCA é conclusão.

OBJETIVO: parar a exibição de conclusões falsas sem tocar o banco.

ESCOPO INCLUÍDO:
1. Desativar a renderização de BehavioralSuggestion (retornar null ou ocultar via flag). É o vetor mais perigoso porque recomenda ação.
2. Em DashboardView, nos blocos que derivam de updated_at — "Horário de pico" (peakHourData) e "Esta semana"/"hoje" (dailyData/weekTotal/todayCount) — trocar título/legenda para deixar explícito que é aproximação por data de edição enquanto completed_at não existe. Ex.: "Horário de pico (aproximado por edição — em revisão)"; "Esta semana" vira "movimentações recentes".
3. Congelar behaviorEngine.ts com um comentário no topo indicando bloqueio até o Sprint 2 (completed_at). Não apagar o módulo.

ESCOPO EXCLUÍDO: qualquer migration, coluna, evento, alteração de TaskStatus, ou toque em sync/taskStore.

MANTER VISÍVEL (não mexer): total de concluídas (status='done'), distribuição por contexto, "Estimado vs. real", prioridade média, card "Adiadas".

VALIDAÇÃO: npm run lint ; npm run build (ambos verdes). Garanta que nenhum import fica órfão ao desligar a sugestão.

DOCS: DECISIONS.md (decisão updated_at≠conclusão; desativação da sugestão; rótulos de aproximação, referenciando a v4); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 0 concluída); PRD.md (rótulos de aproximação no dashboard).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "fix: conter coach (updated_at não é conclusão) — Fase 0 (Sprint 1)".

RELATÓRIO FINAL: arquivos alterados; decisões; validações e resultado; riscos remanescentes; próximo sprint (Sprint 2).
```

### Prompt Sprint 2

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 2 (Fase 1A — Timestamp honesto mínimo).

LEIA PRIMEIRO: SecretarioTask_Plano_Coach_Produtividade_v4.md (Fase 1A, seções 3.2/3.3/4); SecretarioTask_Plano_Executor_Completo.md (Sprint 2); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/lib/sync.ts (TASK_COLUMNS e stripReadonlyTaskFields), src/types/index.ts, src/components/TaskBoard.tsx (buildCompleteUpdates), src/components/DashboardView.tsx, src/lib/behaviorEngine.ts, supabase/migrations (última é 0013).

INVARIANTES: preserve captura, sync, offline-first, RLS, soft delete, TaskStatus atual, IA opcional. updated_at NUNCA é conclusão. completed_at NUNCA é reescrito por edição. Migration pequena, uma preocupação só.

OBJETIVO: introduzir a verdade da conclusão com o menor schema possível.

ESCOPO INCLUÍDO:
1. Migration 0014_completed_at.sql: ADD COLUMN completed_at timestamptz NULL; ADD COLUMN completed_at_confidence text NULL CHECK (completed_at_confidence IN ('confirmed','legacy_approx')). Inclua, na mesma migration, o backfill: UPDATE tasks SET completed_at = updated_at, completed_at_confidence='legacy_approx' WHERE status='done' AND completed_at IS NULL. NÃO crie evento retroativo.
2. sync.ts: adicione completed_at e completed_at_confidence à string literal TASK_COLUMNS. NÃO adicione esses campos ao stripReadonlyTaskFields (eles devem ser enviados pelo cliente).
3. types/index.ts: adicione completed_at e completed_at_confidence a Task (e a TaskInput conforme o padrão existente).
4. TaskBoard.tsx (buildCompleteUpdates): na 1ª transição status!=='done' -> 'done', setar completed_at = new Date().toISOString() e completed_at_confidence='confirmed'. Não setar se a tarefa já estava 'done'.
5. DashboardView.tsx e behaviorEngine.ts: trocar a leitura de updated_at por completed_at nas métricas de horário; IGNORAR linhas com completed_at_confidence='legacy_approx' nessas métricas de horário.

ESCOPO EXCLUÍDO: resolution_type, resolved_at, eventos, *_source, reabertura limpando campos. Não reative BehavioralSuggestion ainda.

RISCOS A EVITAR: campo fora de TASK_COLUMNS (não sincroniza); strip indevido; backfill marcar 'confirmed'; completed_at reescrito em edição.

VALIDAÇÃO: npm run lint ; npm run build. A aplicação da migration no Supabase é passo MANUAL de Josemar — descreva exatamente o comando/observação, não aplique.

DOCS: ARCHITECTURE.md (modelo de conclusão de duas camadas); DECISIONS.md (legado=legacy_approx; completed_at client-written reconciliável); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 1A concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: completed_at honesto + backfill legacy_approx — Fase 1A (Sprint 2)".

RELATÓRIO FINAL: arquivos alterados; SQL da migration; pontos de leitura migrados para completed_at; validações; pendência de aplicação da migration; riscos remanescentes; próximo sprint (Sprint 3).
```

### Prompt Sprint 3

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 3 (Fase 1B — Semântica de resolução).

LEIA PRIMEIRO: v4 (Fase 1B, seção 3.3); plano executor (Sprint 3); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/types/index.ts, src/lib/sync.ts (TASK_COLUMNS), src/lib/taskFilters.ts, src/components/TaskActions.tsx, src/components/TaskBoard.tsx, src/components/TimelineView.tsx, supabase/migrations (última é 0014).

INVARIANTES: deleted_at NUNCA representa cancelada/delegada/obsoleta. Resolvida permanece buscável e contável. completed_at NULL para não-concluídas. Preserve captura, sync, offline-first, RLS, TaskStatus atual, IA opcional. Tap targets 44x44.

OBJETIVO: distinguir "feito" de "encerrado sem fazer".

ESCOPO INCLUÍDO:
1. Migration 0015_resolution_semantics.sql: ADD resolution_type text NULL CHECK (resolution_type IN ('completed','cancelled','delegated','obsolete')); ADD resolved_at timestamptz NULL. Backfill: UPDATE tasks SET resolution_type='completed', resolved_at=completed_at WHERE status='done' AND resolution_type IS NULL.
2. sync.ts TASK_COLUMNS += resolution_type, resolved_at. types/index.ts atualizado. Não strip.
3. Ao concluir (buildCompleteUpdates): também setar resolution_type='completed', resolved_at=completed_at.
4. taskFilters.ts: criar/ajustar helper isActiveTask que exclui das listas operacionais as tarefas com resolution_type IN ('cancelled','delegated','obsolete') — SEM usar deleted_at. Aplicar o helper onde hoje se filtra "tarefa ativa".
5. Ações discretas Cancelar / Delegar / Obsoleta (fora da captura, 44x44): setam resolution_type e resolved_at=now, completed_at permanece NULL, status permanece todo/doing.

ESCOPO EXCLUÍDO: "delegado para quem"; encerrar série recorrente inteira; eventos (Sprint 4).

VALIDAÇÃO: npm run lint ; npm run build. Migration: passo manual de Josemar (descreva).

DOCS: ARCHITECTURE.md (resolução; completed_at⊂resolved_at); DECISIONS.md (nunca deleted_at para resolução); PRD.md (novas ações); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 1B concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: resolution_type/resolved_at sem deleted_at — Fase 1B (Sprint 3)".

RELATÓRIO FINAL: arquivos alterados; SQL; onde o helper foi aplicado; validações; pendência de migration; riscos; próximo sprint (Sprint 4).
```

### Prompt Sprint 4

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 4 (Fase 1C — Eventos confiáveis).

LEIA PRIMEIRO: v4 (Fase 1C, seções 5.5/5.6); plano executor (Sprint 4); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: supabase/migrations/0001_initial_schema.sql (CHECK de task_events), src/stores/taskStore.ts (recordViewEvent e pontos de mutation), src/lib/sync.ts (insert de task_event), src/components/TaskBoard.tsx (completeTask, startTask, handleStatusRevert, postpone), supabase/migrations (última é 0015).

INVARIANTES: eventos são best-effort — falha de evento NUNCA bloqueia captura, conclusão, adiar ou reabrir. Cliente NÃO carimba created_at de evento. Preserve sync, offline-first, RLS.

OBJETIVO: tornar task_events fonte temporal auditável e server-stamped.

ESCOPO INCLUÍDO:
1. Migration 0016_task_events_expand_stamp.sql: ampliar o CHECK de task_events.type para incluir 'started','completed','reopened','postponed' (mantendo 'created','updated','completed','viewed'); criar função + trigger BEFORE INSERT em task_events forçando NEW.created_at = now().
2. taskStore.ts: parar de enviar created_at no payload de evento (hoje recordViewEvent envia created_at: now — remover). Emitir eventos: 'completed' ao concluir, 'started' ao iniciar, 'reopened' ao reabrir, 'postponed' ao adiar. Envolver emissão em try/catch não-bloqueante.
3. sync.ts: confirmar que o insert de task_event não reintroduz created_at do cliente.

ESCOPO EXCLUÍDO: *_source (Sprint 5); limpeza de campos na reabertura (Sprint 6 — aqui só o evento 'reopened').

DEPENDÊNCIA: os eventos novos só devem ser emitidos depois que a migration 0016 estiver aplicada no Supabase. Documente essa ordem; não pressuponha aplicação.

VALIDAÇÃO: npm run lint ; npm run build. Migration: passo manual de Josemar.

DOCS: ARCHITECTURE.md (eventos/carimbo server-side); DECISIONS.md (server-stamp; eventos best-effort); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 1C concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: eventos confiáveis server-stamped — Fase 1C (Sprint 4)".

RELATÓRIO FINAL: arquivos alterados; SQL; eventos emitidos e onde; confirmação de que são best-effort; validações; pendência de migration; riscos; próximo sprint (Sprint 5).
```

### Prompt Sprint 5

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 5 (Fase 1D — Origem dos dados).

LEIA PRIMEIRO: v4 (Fase 1D, seções 1.10/3.4); plano executor (Sprint 5); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/types/index.ts, src/lib/sync.ts (TASK_COLUMNS), src/pages/Home.tsx (handleConfirmMultiTasks/estimateTaskTime), src/components/TaskBoard.tsx (stepper de minutos e buildCompleteUpdates), src/lib/ai.ts (estimateTaskTime), src/lib/smartParser.ts, supabase/migrations (última é 0016).

INVARIANTES: todo dado de IA/timer/estimativa carrega origem. IA permanece opcional e não-bloqueante. Determinismo no caminho crítico.

OBJETIVO: marcar a procedência de estimated_minutes e actual_minutes.

ESCOPO INCLUÍDO:
1. Migration 0017_data_source_fields.sql: ADD actual_minutes_source text NULL CHECK (actual_minutes_source IN ('timer','manual','retroactive','unknown')); ADD estimated_minutes_source text NULL CHECK (estimated_minutes_source IN ('default_30','manual','ai','parser')).
2. sync.ts TASK_COLUMNS += os dois campos. types/index.ts atualizado. Não strip.
3. Pontos de escrita:
   - estimateTaskTime (via Home/handleConfirmMultiTasks): grava estimated_minutes_source='ai'.
   - fallback determinístico de estimativa: 'default_30' (quando cai no 30 padrão) ou 'parser' (quando vem do parser).
   - stepper de minutos no TaskBoard (±15): 'manual'.
   - actual_minutes via started_at (buildCompleteUpdates): 'timer'.

ESCOPO EXCLUÍDO: teto de timer (Sprint 6); exibição de confiabilidade (Sprint 7).

VALIDAÇÃO: npm run lint ; npm run build. Migration: passo manual de Josemar.

DOCS: ARCHITECTURE.md (governança de campos/origem); DECISIONS.md (IA marcada, nunca determinística); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 1D concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: origem de estimated/actual minutes — Fase 1D (Sprint 5)".

RELATÓRIO FINAL: arquivos alterados; SQL; cada ponto de escrita e o source aplicado; validações; pendência de migration; riscos; próximo sprint (Sprint 6).
```

### Prompt Sprint 6

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 6 (Fase 2 — Ajustes de fluxo).

LEIA PRIMEIRO: v4 (Fase 2, seções 1.5/3.3); plano executor (Sprint 6); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/components/TaskBoard.tsx (handleStatusRevert, buildCompleteUpdates, handlePostponeTomorrow/Date), src/components/TimelineView.tsx (postpone), src/types/index.ts, supabase/migrations (última é 0017).

INVARIANTES: captura rápida sem fricção; tap targets 44x44; reabertura preserva histórico em task_events. updated_at não é conclusão. Não ampliar TaskStatus.

OBJETIVO: corrigir os pontos de escrita que produzem dado frágil.

ESCOPO INCLUÍDO:
1. Reabertura (handleStatusRevert): ao sair de 'done', limpar completed_at, resolved_at, resolution_type e started_at; emitir evento 'reopened' (best-effort). O histórico do 'completed' anterior permanece em task_events.
2. Teto de timer (buildCompleteUpdates): se (now - started_at) exceder um limite plausível (decisão: > 8h), gravar actual_minutes mas marcar suspeita via actual_minutes_source='unknown'. Não descartar o valor.
3. Adiar com motivo OPCIONAL: oferecer blocker_type sem obrigar e sem bloquear o adiar. Se persistir blocker_type, criar migration 0018_blocker_type.sql (ADD blocker_type text NULL CHECK (blocker_type IN ('waiting_third_party','no_time','priority_changed','needs_split','dependency'))) e incluir em TASK_COLUMNS e types. Se decidir NÃO persistir agora, registre a decisão e não crie a migration.

ESCOPO EXCLUÍDO: diagnóstico que consome esses dados (Sprint 8); UI de qualidade no dashboard (Sprint 7).

VALIDAÇÃO: npm run lint ; npm run build. Migration (se houver): passo manual de Josemar.

DOCS: DECISIONS.md (regra de reabertura; teto de timer; motivo opcional / persistir ou não blocker_type); ARCHITECTURE.md (se blocker_type entrar); PRD.md (reabrir; adiar com motivo); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 2 concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "fix: reabertura limpa + teto de timer + adiar com motivo — Fase 2 (Sprint 6)".

RELATÓRIO FINAL: arquivos alterados; decisão sobre blocker_type; comportamento de reabertura e teto; validações; pendência de migration (se houver); riscos; próximo sprint (Sprint 7).
```

### Prompt Sprint 7

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 7 (Fase 3 — Dashboard corrigido e qualidade do dado).

LEIA PRIMEIRO: v4 (Fase 3, seções 3.4/4.3); plano executor (Sprint 7); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/components/DashboardView.tsx, src/components/BehavioralSuggestion.tsx, src/lib/behaviorEngine.ts.

INVARIANTES: zero leitura de updated_at como conclusão; sem score (confiabilidade só como texto); não criar fricção. Sugestão comportamental só reativa sob gate de QUALIDADE de dado (não de tempo).

OBJETIVO: dashboard honesto, separando produtividade de qualidade do dado.

ESCOPO INCLUÍDO:
1. Todas as métricas de horário leem completed_at com completed_at_confidence='confirmed'. Remover qualquer rótulo provisório do Sprint 1 que não seja mais necessário.
2. Separar visualmente "pós-saneamento" (confirmed) de "histórico frágil" (legacy_approx): legacy só em contagem agregada, com aviso textual de horário aproximado.
3. Bloco textual de qualidade do dado (ex.: % de conclusões confirmed vs legacy; presença de actual_minutes_source='unknown'). Texto, nunca nota/score.
4. Reativar BehavioralSuggestion SOMENTE se houver massa suficiente de dado confirmed por faixa horária (defina e registre o limiar, ex.: mínimo de N conclusões confirmed na faixa). Ao reativar, o texto deve declarar que narra uma regra determinística.

ESCOPO EXCLUÍDO: diagnostics.ts (Sprint 8); IA narrativa (Sprint 10).

VALIDAÇÃO: npm run lint ; npm run build.

DOCS: ARCHITECTURE.md (regimes de dado no dashboard); DECISIONS.md (gate de reativação; sem score); PRD.md (dashboard com qualidade do dado); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 3 concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: dashboard honesto + qualidade do dado — Fase 3 (Sprint 7)".

RELATÓRIO FINAL: arquivos alterados; limiar de reativação definido; confirmação de zero updated_at-como-conclusão; validações; riscos; próximo sprint (Sprint 8).
```

### Prompt Sprint 8

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 8 (Fase 4 — Motor determinístico testável).

ATENÇÃO: este sprint tem um PONTO DE PARADA OBRIGATÓRIO. A decisão de introduzir um runner de teste (Vitest) contraria a regra "sem teste no MVP". NÃO decida sozinho: proponha, registre a recomendação, e aguarde confirmação humana antes de instalar qualquer dependência de teste.

LEIA PRIMEIRO: v4 (Fase 4, seção 8 fixtures); plano executor (Sprint 8 e seção 10 fixtures); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/lib/behaviorEngine.ts, src/lib/datetime.ts (padrão de now injetável), src/types/index.ts, package.json.

INVARIANTES: diagnostics.ts é função PURA, determinística, sem IA, sem aleatoriedade, com now injetável. Não pode depender da amostra parcial de 100 tasks do partialize — recebe dados por parâmetro.

OBJETIVO: centralizar diagnóstico em src/lib/diagnostics.ts e cobrir as 10 fixtures.

ESCOPO INCLUÍDO:
1. Criar src/lib/diagnostics.ts: entrada (tarefas + eventos), saída (diagnósticos rotulados com nível de confiança). Sem IA. now injetado.
2. Migrar para o motor a lógica de horário/energia hoje em behaviorEngine.ts (que vira fino consumidor do motor ou é absorvido).
3. Fixtures cobrindo os 10 cenários da seção 10 do plano executor.
4. PARAR e pedir decisão humana sobre runner de teste. Se aprovado: instalar Vitest restrito a diagnostics, adicionar script de teste, sem tocar o resto da config. Se reprovado: implementar fixtures como dataset .ts validável por um script ad-hoc ou checagem manual documentada.

ESCOPO EXCLUÍDO: consumo do motor pela IA (Sprint 10); novas métricas de produto.

VALIDAÇÃO: npm run lint ; npm run build ; e (se aprovado) o comando de teste do runner.

DOCS: ARCHITECTURE.md (motor de diagnóstico); DECISIONS.md (decisão de runner; amostra parcial; pureza); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 4 concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: diagnostics.ts determinístico + fixtures — Fase 4 (Sprint 8)".

RELATÓRIO FINAL: arquivos alterados; recomendação de runner e status da decisão humana; lista das 10 fixtures e resultado; validações; riscos; próximo sprint (Sprint 9).
```

### Prompt Sprint 9

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 9 (Fase 5A — Governança da IA existente).

LEIA PRIMEIRO: v4 (seções 1.10/3.4 e Fase 5); plano executor (Sprint 9); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/lib/ai.ts, src/lib/smartParser.ts, src/pages/Home.tsx, src/lib/sync.ts (embedding).

INVARIANTES: IA é opcional e não-bloqueante. IA NUNCA origina diagnóstico comportamental nem escreve resolution_type/blocker_type. Todo dado de IA tem origem marcada (Sprint 5). Fallback determinístico obrigatório.

OBJETIVO: inventariar e conter toda entrada de IA.

ESCOPO INCLUÍDO:
1. Inventário das funções de IA (estimateTaskTime, parseMultipleTasks, generateEmbedding, generateSmartBriefing, transcribeAudio) com efeito de cada uma sobre o dado.
2. Garantir fallback determinístico em todas (ex.: estimativa cai em default; parser cai no determinístico; embedding em try/catch não-bloqueante).
3. Confirmar que nenhuma IA escreve campos semânticos (resolution_type, blocker_type) nem gera diagnóstico.
4. Confirmar origem marcada em todos os pontos de escrita influenciados por IA.

ESCOPO EXCLUÍDO: input_hash/cache/versionamento de prompt (Sprint 10).

VALIDAÇÃO: npm run lint ; npm run build.

DOCS: ARCHITECTURE.md (mapa de IA e limites); DECISIONS.md (IA não-diagnóstica; fallback obrigatório); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 5A concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "chore: governança da IA existente (fallback, sem diagnóstico) — Fase 5A (Sprint 9)".

RELATÓRIO FINAL: inventário de IA; pontos sem fallback corrigidos; confirmação de que nenhuma IA origina diagnóstico; validações; riscos; próximo sprint (Sprint 10).
```

### Prompt Sprint 10

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 10 (Fase 5B — IA narrativa cacheada).

LEIA PRIMEIRO: v4 (Fase 5); plano executor (Sprint 10); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e: src/lib/ai.ts (generateSmartBriefing), src/lib/briefing.ts (getDailyBriefing determinístico).

INVARIANTES: IA narra a regra determinística; não interpreta nem diagnostica. Fallback determinístico intacto. IA opcional e não-bloqueante.

OBJETIVO: briefing eficiente e seguro.

ESCOPO INCLUÍDO:
1. input_hash: derivar um hash dos insumos que mudam o conteúdo (conjunto de top tasks + energia + janela temporal) e cachear o briefing para entradas idênticas, evitando rechamar a API. Invalidar ao mudar insumo.
2. Versionar o prompt do briefing (ex.: constante PROMPT_VERSION) e incluir a versão no cache key.
3. Texto do briefing deve declarar que narra a ordem determinística do ranking/diagnóstico (não "decide").
4. Fallback determinístico (getDailyBriefing) permanece quando não há IA ou a chamada falha.

ESCOPO EXCLUÍDO: IA originando diagnóstico; novas chamadas de IA além das existentes.

VALIDAÇÃO: npm run lint ; npm run build.

DOCS: ARCHITECTURE.md (cache/versionamento de briefing); DECISIONS.md (input_hash; IA narrativa); PRD.md (se o comportamento perceptível do briefing mudar); STATUS.md; SPRINT_LOG.md; ROADMAP.md (Fase 5B concluída).

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "feat: briefing cacheado por input_hash + prompt versionado — Fase 5B (Sprint 10)".

RELATÓRIO FINAL: arquivos alterados; como o hash é composto e invalidado; confirmação de fallback; validações; riscos; próximo sprint (Sprint 11).
```

### Prompt Sprint 11

```text
Você é um agente de implementação no repositório SecretárioTask. Execute SOMENTE o Sprint 11 (Auditoria final e fechamento). Não adicione features.

LEIA PRIMEIRO: v4 (seções 10/11); plano executor (Sprint 11, seção 6 e seção 7); STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e o código inteiro de src/.

OBJETIVO: confirmar que nenhuma proibição estrutural voltou e fechar a evolução.

VARREDURAS OBRIGATÓRIAS (relate cada resultado):
1. updated_at como conclusão: grep por "updated_at" em src/lib e src/components; confirmar que nenhuma métrica de conclusão/horário o usa.
2. deleted_at como semântica: grep por "deleted_at"; confirmar que só representa soft delete, nunca cancelada/delegada/obsoleta.
3. IA originando diagnóstico: revisar ai.ts/smartParser.ts; confirmar que IA só narra, nunca escreve resolution_type/blocker_type nem gera diagnóstico.
4. Contratos de sync: confirmar que TODOS os campos novos (completed_at, completed_at_confidence, resolution_type, resolved_at, actual_minutes_source, estimated_minutes_source, e blocker_type se persistido) estão em TASK_COLUMNS e NÃO no stripReadonlyTaskFields.
5. Determinismo: confirmar que diagnostics.ts é puro e que parser/ranking não dependem de IA no caminho crítico.

SE ACHAR VIOLAÇÃO de invariante: não corrija "de passagem". Documente e proponha um sprint de correção dedicado.

VALIDAÇÃO: npm run lint ; npm run build.

DOCS: percorrer o Checklist de aceitação global (seção 7 do plano executor) e marcar cada item; atualizar DECISIONS.md (fechamento), ARCHITECTURE.md (estado final), PRD.md (estado final), STATUS.md, SPRINT_LOG.md, ROADMAP.md (projeto fechado); escrever um breve plano de manutenção futura.

NÃO COMMITE, NÃO DÊ PUSH. Mensagem proposta: "docs: auditoria final e fechamento da evolução Coach (Sprint 11)".

RELATÓRIO FINAL: resultado de cada varredura; itens do checklist global; violações encontradas (se houver) e sprint de correção proposto; validações; estado final do projeto.
```

---

## 6. Prompt de auditoria final independente

> Use este prompt em uma sessão **separada** da implementação, idealmente com outro agente, para auditar sem viés de quem implementou. Ele não altera código — só audita e relata.

```text
Você é um auditor sênior independente. NÃO implemente nada. Audite o repositório SecretárioTask após a evolução "Coach de Produtividade" e produza um parecer.

LEIA: SecretarioTask_Plano_Coach_Produtividade_v4.md; SecretarioTask_Plano_Executor_Completo.md; STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md, PHILOSOPHY.md; e todo o código de src/ e supabase/migrations/.

AUDITE OS SEGUINTES PONTOS, com evidência (arquivo:linha) para cada veredito:

A. updated_at nunca é tratado como conclusão (behaviorEngine, DashboardView, diagnostics, briefing).
B. completed_at é a fonte de conclusão; não é reescrito por edição; legacy_approx fica fora de métrica de horário.
C. resolution_type/resolved_at existem e cancelada/delegada/obsoleta NÃO usam deleted_at; resolvidas permanecem buscáveis/contáveis.
D. task_events: CHECK ampliado, trigger BEFORE INSERT carimbando created_at server-side, cliente não envia created_at, eventos best-effort.
E. actual_minutes_source/estimated_minutes_source preenchidos em todos os pontos de escrita; IA marcada como 'ai'.
F. Reabertura limpa completed_at/resolved_at/resolution_type/started_at e emite 'reopened', preservando histórico de evento.
G. Teto de timer marca actual_minutes_source='unknown' acima do limite.
H. Dashboard separa "pós-saneamento" de "histórico frágil"; confiabilidade só como texto; sem score.
I. diagnostics.ts é puro, determinístico, now injetável; as 10 fixtures existem e passam; não depende da amostra de 100 tasks.
J. IA: fallback determinístico em todas as rotas; IA não origina diagnóstico nem escreve campos semânticos; briefing cacheado por input_hash com prompt versionado.
K. Contratos de sync: todos os campos novos em TASK_COLUMNS; nenhum no stripReadonlyTaskFields (exceto created_at/updated_at).
L. Invariantes preservadas: captura rápida, sync, offline-first, RLS, soft delete, TaskStatus inalterado, tap targets 44x44.
M. Migrations 0014..(última) pequenas, sequenciais, com backfill correto e RLS intacta.
N. Documentação viva: STATUS/SPRINT_LOG/ROADMAP/DECISIONS/ARCHITECTURE/PRD coerentes com o código.

RODE (somente leitura/validação): npm run lint ; npm run build. Relate o resultado.

ENTREGUE: para cada ponto A–N, veredito (Conforme / Não conforme / Parcial) + evidência + recomendação. Liste violações ordenadas por gravidade e proponha sprints de correção. Não altere nenhum arquivo.
```

---

## 7. Checklist de aceitação global

Marcar tudo no Sprint 11. Cada item é verificável por inspeção de código ou execução.

- [ ] `npm run lint` e `npm run build` verdes na árvore final.
- [ ] Nenhuma métrica de conclusão/horário lê `updated_at` (behaviorEngine, DashboardView, diagnostics, briefing).
- [ ] `completed_at` gravado só na 1ª transição para `done`; não reescrito por edição.
- [ ] `completed_at_confidence` distingue `confirmed` de `legacy_approx`; legado fora de métrica de horário.
- [ ] `resolution_type`/`resolved_at` implementados; `completed_at` NULL para não-concluídas.
- [ ] Cancelada/delegada/obsoleta **não** usam `deleted_at` e permanecem buscáveis/contáveis.
- [ ] `task_events`: CHECK inclui `started/completed/reopened/postponed`; trigger carimba `created_at` server-side; cliente não envia `created_at`; eventos best-effort.
- [ ] `actual_minutes_source`/`estimated_minutes_source` preenchidos em todos os pontos de escrita; IA marcada `ai`.
- [ ] Reabertura limpa `completed_at/resolved_at/resolution_type/started_at`, emite `reopened`, preserva histórico de evento.
- [ ] Teto de timer marca suspeita (`actual_minutes_source='unknown'`) acima do limite.
- [ ] Dashboard separa "pós-saneamento" de "histórico frágil"; confiabilidade só textual; sem score.
- [ ] `BehavioralSuggestion` só reativada sob gate de qualidade de dado, narrando regra determinística.
- [ ] `diagnostics.ts` puro, determinístico, `now` injetável; 10 fixtures presentes e verdadeiras; decisão de runner registrada.
- [ ] Recorrência intacta: conclusão gera nova instância; métrica por instância; `postponed_count` por instância; unique index respeitado.
- [ ] IA opcional e não-bloqueante em todas as rotas; fallback determinístico garantido; IA não origina diagnóstico.
- [ ] Briefing cacheado por `input_hash`; prompt versionado; fallback determinístico intacto.
- [ ] Todos os campos novos em `TASK_COLUMNS`; nenhum no `stripReadonlyTaskFields` além de `created_at/updated_at`.
- [ ] Optimistic locking por `version` intacto; conflito de conclusão documentado em `DECISIONS.md`.
- [ ] Soft delete via `deleted_at` preservado; RLS em todas as tabelas.
- [ ] `TaskStatus` permanece `'todo'|'doing'|'done'`.
- [ ] Tap targets 44×44 em toda ação nova; captura rápida sem fricção.
- [ ] `STATUS/SPRINT_LOG/ROADMAP/DECISIONS/ARCHITECTURE/PRD` coerentes com o código final.
- [ ] Pendências de aplicação de migration no Supabase listadas em `STATUS.md`.

---

## 8. Ordem recomendada de execução

1. **Sequência fixa:** 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11. Não pular, não paralelizar.
2. **Migrations em pares com aplicação manual:** após Sprints 2, 3, 4, 5 (e 6 se houver `0018`), aplicar a migration no Supabase **antes** de exercitar o app, porque o código novo assume o schema novo. O agente cria o `.sql`; Josemar aplica e roda o backfill; só então testar.
3. **Gate entre sprints:** abrir o sprint seguinte só com `lint`/`build` verdes e critérios de aceite cumpridos no anterior.
4. **Ponto de parada no Sprint 8:** a decisão de runner de teste (Vitest) é de Josemar — o agente para e pergunta antes de instalar dependência.
5. **Auditoria independente:** rodar o prompt da §6 em sessão separada após o Sprint 10, antes de fechar no Sprint 11.
6. **Janela de uso real:** entre os sprints de schema (2–5) e o dashboard (7), usar o app por alguns dias gera dado `confirmed` real — necessário para o gate de reativação da sugestão comportamental no Sprint 7. Recomenda-se uma pausa de uso real antes do Sprint 7.

---

## 9. Regras para parar e pedir revisão humana

O agente deve **parar e pedir confirmação de Josemar** (não decidir sozinho) quando:

1. **Runner de teste (Sprint 8).** Instalar Vitest/qualquer dependência de teste contraria a regra "sem teste no MVP". Propor, justificar, aguardar.
2. **Qualquer nova dependência** em `package.json` fora do escopo explícito do sprint.
3. **Ampliar `TaskStatus`** ou usar `deleted_at` para semântica — proibido; se algo parecer exigir isso, parar e reportar, não contornar.
4. **Migration que toque dados existentes** além do backfill descrito (ex.: alterar/remover coluna, reescrever linhas) — parar antes de escrever o SQL.
5. **Conflito entre o plano e o código real** (ex.: um arquivo não existe, uma função mudou de assinatura) — relatar a divergência e perguntar, em vez de improvisar. O código vence o documento, mas a divergência precisa ser registrada.
6. **`lint`/`build` quebrarem e a correção exigir mudança fora do escopo** do sprint — parar e reportar.
7. **Decisão de produto perceptível** não prevista (ex.: novo fluxo de UI, novo texto que muda comportamento) — confirmar com Josemar antes de implementar.
8. **Aplicar migration no Supabase, commitar ou dar push** — nunca; esses atos são sempre de Josemar.
9. **Detecção de regressão de invariante** durante um sprint de feature — não corrigir "de passagem"; abrir sprint de correção dedicado.

---

## 10. Fixtures obrigatórias do motor determinístico (Sprint 8)

Cada fixture é determinística, com `now` fixo, e alimenta `diagnostics.ts` por parâmetro (nunca pelo store). São o critério de aceite do Sprint 8.

1. **Conclusão estável:** tarefa concluída e editada depois — `completed_at` não muda; diagnóstico de horário usa `completed_at`, não `updated_at`.
2. **Cancelada fora da produtividade:** `resolution_type='cancelled'`, `completed_at=NULL` — não entra em "concluídas".
3. **Delegada não é conclusão:** `resolution_type='delegated'`, `completed_at=NULL` — fora de produtividade; pode entrar em "vazão/encerramento".
4. **Aguardando terceiro não é procrastinação:** adiada com `blocker_type='waiting_third_party'` — não classificada como dívida comportamental.
5. **Adiada 3× sem motivo:** `postponed_count>=3` e `blocker_type` NULL — sinaliza **dívida de dado** (falta de motivo), não diagnóstico comportamental.
6. **Timer aberto muitas horas:** `actual_minutes` acima do teto / `actual_minutes_source='unknown'` — confiança rebaixada, não entra como tempo real confiável.
7. **Recorrente não contamina série:** N instâncias `done` da mesma `recurrence_origin_id` contam como N conclusões individuais; nenhuma agrega a série como unidade.
8. **Reaberta limpa resolução:** tarefa reaberta tem `completed_at/resolved_at` NULL; o evento `completed` anterior permanece em `task_events`; a tarefa não conta como concluída no presente.
9. **Legado é histórico frágil:** `completed_at_confidence='legacy_approx'` — fora das métricas de horário; só em contagem agregada rotulada.
10. **Baixa qualidade reduz confiança:** dataset majoritário em `source='ai'`/`unknown`/`legacy_approx` — diagnóstico retorna confiança baixa, com aviso textual, sem afirmação forte.

---

## 11. Encerramento

Este plano leva o SecretárioTask do estado atual (coach existente porém apoiado em `updated_at`) ao estado final (coach honesto, determinístico no caminho crítico, com IA marcada e narrativa). A espinha dorsal: **conter antes de medir, medir a verdade antes de classificar, classificar antes de auditar, rotular origem antes de exibir, exibir antes de diagnosticar, diagnosticar antes de deixar a IA falar.** Cada sprint mantém o app com build, preserva captura/sync/offline/RLS/soft delete/`TaskStatus`, e termina com documentação viva. Os dois atos irreversíveis — aplicar migration no Supabase e commitar — permanecem com Josemar.
