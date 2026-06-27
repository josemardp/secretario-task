# SPRINT_LOG.md — SecretárioTask

Última revisão: 2026-06-27
Status: alinhado ao ROADMAP oficial
Duração sugerida por sprint: 1–2 semanas

---

# Objetivo do Documento

Registrar a evolução operacional oficial do MVP do SecretárioTask sprint por sprint.

Este documento define:
- objetivos por sprint
- entregas concretas
- critérios de conclusão
- limites de escopo
- direção operacional do desenvolvimento

---

# Hotfix v4.2 — Reabertura acessível na Agenda

Data: 2026-06-27

## Objetivo
Resolver o bloqueio encontrado no smoke da v4.2: tarefa concluída saía da timeline ativa e não havia caminho visual para acessar o botão "Reabrir" no modal da Agenda.

## Resumo do que foi feito
- Criado `getResolvedTasksForDate` em `src/lib/taskFilters.ts`.
- A timeline principal continua usando tarefas abertas/executáveis.
- A Agenda ganhou a seção secundária "Resolvidas neste dia" abaixo da timeline.
- A seção usa `completed_at` para concluídas e `resolved_at` para canceladas/delegadas/obsoletas.
- Itens resolvidos abrem o mesmo modal de edição/detalhe da Agenda.
- O modal agora mostra "Reabrir" para tarefas `done` e para tarefas com `resolution_type` terminal.
- Reabertura continua por `buildReopenUpdates('todo')` e evento best-effort.
- Testes agênticos cobrem a lista de resolvidas, `isOpenTask` semântico e retorno à lista ativa após reabertura.

## Arquivos alterados
- `src/lib/taskFilters.ts`
- `src/components/TimelineView.tsx`
- `scripts/coachV41Flows.fixtures.ts`
- `STATUS.md`
- `SPRINT_LOG.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `docs/coach/QA_Coach_v4_2_Agenda_Only.md`

## Migration remota
- Nenhuma migration criada.
- Nenhum comando Supabase executado.

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou, com aviso conhecido de chunk maior que 500 kB.
- `npm run test`: passou.
- `npm audit`: passou, 0 vulnerabilidades.

## Decisões tomadas
- Não recolocar tarefas resolvidas na timeline ativa.
- Expor resolvidas em seção secundária para manter reabertura acessível.
- Manter `isOpenTask` como definição de tarefa aberta/executável.

## Pendências
- Repetir smoke manual antes da tag v4.2.

## Resultado
Hotfix implementado em código e documentação, com validações verdes.

---

# Remoção do Kanban — Fase 2 — Agenda/Timeline como view principal

Data: 2026-06-27

## Objetivo
Remover o Kanban e deixar Agenda/Timeline como única view operacional, preservando Painel, captura rápida, FocoSheet sem timer e os contratos de conclusão/resolução/reabertura.

## Resumo do que foi feito
- `Home.tsx` removeu import/render de `TaskBoard`.
- `viewMode` passou a ser somente `timeline | dashboard`, com default `timeline`.
- A tab "Hoje" foi removida; a navegação inferior mantém Agenda e Painel.
- A captura rápida permanece disponível na Agenda.
- `src/components/TaskBoard.tsx` foi removido.
- `src/components/TaskActions.tsx` foi removido por estar órfão.
- `@dnd-kit/core` e `@dnd-kit/utilities` foram removidos do `package.json`/lock após confirmação de ausência de uso em `src`.
- `scripts/coachV41Flows.fixtures.ts` deixou de ler `TaskBoard.tsx` e removeu o teste de paridade Kanban vs Agenda.
- Criado `docs/coach/QA_Coach_v4_2_Agenda_Only.md`.

## Arquivos alterados
- `src/pages/Home.tsx`
- `scripts/coachV41Flows.fixtures.ts`
- `package.json`
- `package-lock.json`
- `docs/coach/QA_Coach_v4_2_Agenda_Only.md`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Arquivos removidos
- `src/components/TaskBoard.tsx`
- `src/components/TaskActions.tsx`

## Migration remota
- Nenhuma migration criada.
- Nenhum comando Supabase executado.

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou, com aviso conhecido de chunk maior que 500 kB.
- `npm run test`: passou.
- `npm audit`: passou, 0 vulnerabilidades.

## Decisões tomadas
- Agenda/Timeline passa a ser a única view operacional.
- Dashboard/Painel permanece como view analítica separada.
- FocoSheet permanece como orientação/briefing/top tarefas, sem timer.
- Campos históricos de tempo permanecem protegidos e lidos como qualidade de dados.
- `@dnd-kit` sai por estar órfão após a remoção do Kanban.

## Pendências
- Smoke manual da Agenda, Dashboard e FocoSheet.

## Resultado
Fase 2 implementada em código e documentação, com validações verdes.

---

# Remoção do Kanban — Fase 1 — Preparação sem remover Kanban

Data: 2026-06-27

## Objetivo
Extrair regras que ainda dependiam do Kanban, migrar a captura rápida para a Agenda e ajustar FocoSheet/Dashboard antes da remoção definitiva do Kanban.

## Resumo do que foi feito
- Criado `src/lib/taskLifecycle.ts` com `buildCompleteUpdates` e `buildResolutionUpdates`.
- `TaskBoard.tsx` e `TimelineView.tsx` passaram a consumir esses helpers compartilhados.
- A barra de captura rápida ficou disponível na Agenda e no Kanban durante a Fase 1.
- O Kanban perdeu os botões "Iniciar agora"/"Iniciar" como entrada nova de timer.
- O FocoSheet perdeu o botão "Iniciar agora" e não possui mais prop/callback para iniciar timer.
- O `Home.tsx` deixou de escrever `started_at` e registrar evento `started` pelo FocoSheet.
- O Dashboard substituiu o gráfico "Estimado vs. real" por contadores de qualidade dos registros de tempo.
- `scripts/coachV41Flows.fixtures.ts` passou a validar conclusão/encerramento por `src/lib/taskLifecycle.ts`.

## Arquivos alterados
- `src/lib/taskLifecycle.ts`
- `src/components/TaskBoard.tsx`
- `src/components/TimelineView.tsx`
- `src/components/FocoSheet.tsx`
- `src/components/DashboardView.tsx`
- `src/pages/Home.tsx`
- `scripts/coachV41Flows.fixtures.ts`
- `tsconfig.coach-tests.json`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `STATUS.md`
- `SPRINT_LOG.md`

## Migration remota
- Nenhuma migration criada.
- Nenhum comando Supabase executado.

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou, com aviso conhecido de chunk maior que 500 kB.
- `npm run test`: passou; manteve achado não bloqueante conhecido sobre destino visual diferente na reabertura Kanban/Agenda.

## Decisões tomadas
- Ciclo de vida de tarefa passa a morar em `src/lib/taskLifecycle.ts`.
- Timer fica aposentado como entrada nova, mas histórico e campos permanecem.
- Dashboard deve mostrar qualidade/completude de registros de tempo, sem score e sem veredito comparativo.
- Kanban permanece nesta fase apenas como rede de segurança; remoção fica reservada à Fase 2.

## Pendências
- Revisar a Fase 1 antes de autorizar a Fase 2.

## Resultado
Fase 1 implementada em código e documentação, com validações verdes.

---

# Coach de Produtividade — Sprint 12-B — Housekeeping pós-auditoria

Data: 2026-06-27

## Objetivo
Remover dívida pós-auditoria que confundia manutenção futura, tornar a migration de origem de dados mais robusta e dar paridade de reabertura à Agenda.

## Resumo do que foi feito
- Removido `src/lib/behaviorEngine.ts`, que estava congelado desde a contenção inicial.
- Removidos import e renderização de `BehavioralSuggestion` em `Home.tsx`.
- Adicionada ação "Reabrir" no modal de edição da Agenda para tarefas `done`.
- A reabertura da Agenda reutiliza `buildReopenUpdates('todo')`, a mesma função de regra única já usada pelo Kanban.
- A reabertura da Agenda emite evento `reopened` best-effort com `source='timeline'`.
- Criada migration `0019_idempotent_source_constraints.sql` com blocos `DO $$` e verificação em `pg_constraint`.
- A migration `0019` não remove dados, não altera valores permitidos e não edita a `0017` já aplicada.
- Corrigidas referências vivas ao nome antigo do motor para `coachSignals.ts` nos planos/documentos aplicáveis.
- Documentadas as decisões sobre encerramento do congelamento, idempotência das constraints, fragilidade conhecida da `0016` e cache de IA em memória.

## Arquivos alterados
- `src/pages/Home.tsx`
- `src/components/TimelineView.tsx`
- `supabase/migrations/0019_idempotent_source_constraints.sql`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `docs/coach/SecretarioTask_Plano_Coach_Produtividade_v4.md`
- `docs/coach/SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md`

## Arquivos removidos
- `src/lib/behaviorEngine.ts`

## Migration remota
- `supabase migration list --linked`: antes da aplicação, `0019` aparecia apenas local.
- `supabase db push --dry-run`: passou; listou somente `0019_idempotent_source_constraints.sql`.
- `supabase db push --linked`: passou.
- `supabase migration list --linked`: confirmou local/remoto alinhados até `0019`.

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run test`: passou.

## Decisões tomadas
- Encerrar o congelamento do `behaviorEngine` e removê-lo porque `coachSignals.ts` é o motor real coberto por fixtures.
- Preservar o histórico de migrations: corrigir a idempotência por migration aditiva `0019`, sem editar `0017`.
- Documentar a fragilidade da descoberta de constraint na `0016` como dívida conhecida para futura migration robusta.
- Manter o cache de IA como `Map` em memória, apenas por sessão, sem persistência por ora.

## Pendências
- Nenhuma pendência do Sprint 12-B.

## Resultado
Sprint 12-B implementado, migration `0019` aplicada remotamente e evolução Coach v4.1 fechada após correções pós-auditoria.

---

# Coach de Produtividade — Sprint 12-A — Hotfix pós-auditoria

Data: 2026-06-27

## Objetivo
Corrigir o achado BUG-01 do Dashboard e aplicar higiene mínima de segurança/produção, sem migration, sem Supabase e sem adiantar o Sprint 12-B.

## Resumo do que foi feito
- A seção "Conclusões por área" manteve `completedTasks` como base do agregado.
- Foi adicionado subtexto abaixo do título informando que o agregado inclui histórico aproximado anterior ao saneamento.
- `npm audit fix` foi executado e deixou `npm audit` com 0 vulnerabilidades.
- O `console.log` de PWA em `src/main.tsx` foi substituído por `console.debug`.
- Nenhuma migration foi criada.
- Nenhum comando de escrita no Supabase foi executado.

## Arquivos alterados
- `src/components/DashboardView.tsx`
- `src/main.tsx`
- `package-lock.json`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou.
- `npm run test`: passou.
- `npm audit`: passou, 0 vulnerabilidades.

## Decisões tomadas
- Manter histórico `legacy_approx` no agregado de volume e rotular visualmente a fragilidade do dado, conforme v4 §4.2.

## Pendências
- Sprint 12-B deve tratar housekeeping pós-auditoria: dead code, idempotência de constraints, paridade de reabertura na Agenda e ajustes documentais próprios.

## Resultado
Sprint 12-A implementado com validações verdes, sem migration e sem Supabase.

---

# Coach de Produtividade — Sprint 11 — Auditoria final, hardening e documentação de fechamento

Data: 2026-06-26

## Objetivo
Confirmar que nenhuma proibição estrutural voltou, fechar a evolução Coach de Produtividade e registrar o estado final do projeto após os Sprints 0 a 10.

## Varreduras executadas
- `updated_at`: conforme. Usado como timestamp técnico de edição/sync, fallback legado `legacy_approx` em migration e texto de proibição na IA; não alimenta conclusão confirmada.
- `deleted_at`: conforme. Usado como soft delete/tombstone; não representa cancelada, delegada ou obsoleta.
- IA originando diagnóstico: conforme. `ai.ts` e `smartParser.ts` não escrevem `resolution_type`/`blocker_type` nem geram diagnóstico; briefing apenas narra payload governado.
- Contratos de sync: conforme. `completed_at`, `completed_at_confidence`, `resolution_type`, `resolved_at`, `actual_minutes_source`, `estimated_minutes_source`, `blocker_type` e `version` estão em `TASK_COLUMNS`; `stripReadonlyTaskFields` remove apenas `created_at`/`updated_at`.
- Determinismo: conforme. `coachSignals.ts` recebe `now`, não usa UI, Supabase, localStorage, rede, IA ou aleatoriedade; ranking/parser seguem determinísticos no caminho crítico.
- Eventos: conforme. Eventos são best-effort, `created_at` não é enviado pelo cliente/sync e o servidor força carimbo.
- Dashboard: conforme. Métricas temporais usam conclusões confirmadas; histórico aproximado, encerramentos sem execução e qualidade do dado ficam separados.
- IA/cache: conforme. Guardrails bloqueiam termos proibidos, fallback é determinístico, `input_hash` ignora `updated_at` e versões invalidam cache.

## Checklist global
- [x] `npm run lint` e `npm run build` verdes na árvore final.
- [x] Nenhuma métrica de conclusão/horário lê `updated_at`.
- [x] `completed_at` gravado só na 1ª transição para `done`; edição posterior não reescreve.
- [x] `completed_at_confidence` distingue `confirmed` de `legacy_approx`; legado fora de métrica de horário.
- [x] `resolution_type`/`resolved_at` implementados; `completed_at` nulo para encerradas sem execução.
- [x] Cancelada/delegada/obsoleta não usam `deleted_at` e permanecem contáveis.
- [x] `task_events` inclui eventos operacionais, server-stamp e emissão best-effort.
- [x] `actual_minutes_source`/`estimated_minutes_source` preenchidos nos pontos de escrita; IA marcada `ai`.
- [x] Reabertura limpa conclusão/resolução/timer atuais, emite `reopened` e preserva histórico de eventos.
- [x] Teto de timer acima de 8h marca `actual_minutes_source='unknown'`.
- [x] Dashboard separa confiabilidade textual e não cria score.
- [x] `BehavioralSuggestion` segue desativado.
- [x] Motor determinístico puro com fixtures presentes e runner registrado.
- [x] Recorrência preservada por instância e índice parcial de ocorrência viva documentado.
- [x] IA opcional, não-bloqueante, com fallback e sem autoridade diagnóstica.
- [x] Briefing cacheado por `input_hash`, prompt/guardrails versionados e fallback intacto.
- [x] Campos novos em `TASK_COLUMNS`; nenhum campo novo indevidamente removido por `stripReadonlyTaskFields`.
- [x] Optimistic locking por `version` intacto e conflito documentado.
- [x] Soft delete via `deleted_at` preservado; RLS documentada.
- [x] `TaskStatus` permanece `'todo'|'doing'|'done'`.
- [x] Ações novas preservam captura rápida e baixo atrito; sem nova UI neste sprint.
- [x] `STATUS/SPRINT_LOG/ROADMAP/DECISIONS/ARCHITECTURE/PRD` coerentes com o código final.
- [x] Sem pendência nova de migration no Sprint 11.

## Ajustes realizados
- Atualizada documentação de fechamento em `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md`, `DECISIONS.md`, `ARCHITECTURE.md` e `PRD.md`.
- Alinhado o resumo de schema em `ARCHITECTURE.md` e `PRD.md` para incluir `version`.
- Registrado plano de manutenção futura sem prometer feature pronta.

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `npm run test`: passou; fixtures do motor e 17 fixtures de guardrails/cache passaram.

## Pendências
- Nenhuma violação estrutural encontrada.
- Riscos remanescentes ficam documentados como limitações aceitas: clock do cliente em `completed_at`, LWW por registro, cache de IA apenas por sessão e dependência da qualidade dos dados preenchidos.

## Resultado
Sprint 11 fechou a evolução Coach de Produtividade com auditoria verde, documentação alinhada e sem migration.

---

# Coach de Produtividade — Sprint 10 — Fase 5B: IA narrativa cacheada e segura

Data: 2026-06-26

## Objetivo
Cachear a narrativa governada da IA por `input_hash`, versionar prompt/guardrails e evitar chamadas repetidas quando a entrada semântica do briefing não mudou.

## Resumo do que foi feito
- Criado `src/lib/stableHash.ts`.
- Criado `src/lib/coachAICache.ts`.
- Adicionadas as constantes `COACH_AI_PROMPT_VERSION` e `COACH_AI_GUARDRAILS_VERSION`.
- `buildGovernedCoachPrompt` passou a declarar versões e que a IA narra o ranking determinístico.
- `generateSmartBriefing` passou a usar `resolveCachedCoachNarrative` antes de chamar a API.
- Cache armazena somente a narrativa final segura/sanitizada de origem `ai`.
- Fallback por falha de API, erro de rede, JSON inválido ou linguagem proibida permanece determinístico e não é cacheado como resposta válida.
- Fixtures de guardrails/cache foram ampliadas de 8 para 17 cenários.
- Nenhuma migration foi criada.

## Composição do input_hash
- `prompt_version`.
- `guardrails_version`.
- `current_energy`.
- Janela temporal horária derivada de `generated_at`.
- Top tasks governadas em ordem de ranking.
- Sinais determinísticos normalizados e ordenados por `signal_id`.
- Limitações normalizadas e ordenadas.

O hash não inclui `updated_at`, payload bruto completo, chave de API, resposta da IA ou campos fora do payload governado.

## Arquivos alterados
- `src/lib/stableHash.ts`
- `src/lib/coachAICache.ts`
- `src/lib/coachAIGuardrails.ts`
- `src/lib/ai.ts`
- `scripts/coachAIGuardrails.fixtures.ts`
- `tsconfig.coach-tests.json`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run test`: passou; fixtures do motor e 17 fixtures de guardrails/cache passaram.
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Decisões tomadas
- Cache local em memória, sem migration e sem persistência em `localStorage`.
- Cache key inclui versões de prompt e guardrails.
- Fallback não é cacheado para permitir nova tentativa de IA quando a falha for transitória.

## Pendências
- Sprint 11 deve executar auditoria final e hardening documental.
- O cache é por sessão do browser; ao recarregar a página, a IA pode ser chamada novamente.

## Resultado
Sprint 10 implementado com lint/build/test verdes e sem migration.

---

# Coach de Produtividade — Sprint 9 — Fase 5A: Governança da IA existente

Data: 2026-06-26

## Objetivo
Inventariar e conter as rotas de IA existentes, garantindo fallback determinístico, origem marcada nos dados influenciados por IA e ausência de diagnóstico psicológico ou escrita de campos semânticos pela IA.

## Resumo do que foi feito
- Criado `src/lib/coachAIGuardrails.ts`.
- Criado contrato de entrada `GovernedCoachAIPayload`, com tarefas acionáveis mínimas, sinais determinísticos do motor do Sprint 8, limitações e política de dados.
- Criado contrato de saída `GovernedCoachAIResponse`, com resumo, evidências, limitações, recomendação e confiança textual.
- `generateSmartBriefing` passou a montar prompt governado e validar/sanitizar a resposta antes de exibir narrativa.
- O briefing usa fallback determinístico quando a API falha, quando a resposta não é JSON útil ou quando contém linguagem proibida.
- `transcribeAudio` deixou de lançar erro para o fluxo principal e retorna `null` em falha, com tratamento local na captura.
- Fixtures de guardrails foram adicionadas ao `npm run test`.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Inventário de IA
- `estimateTaskTime`: influencia `estimated_minutes`; fallback `default_30`; origem `ai` ou `default_30`.
- `parseMultipleTasks`: influencia campos de captura; fallback determinístico em `parseTaskInput`.
- `generateEmbedding`: influencia busca/sync semântico; no sync fica em `try/catch` e não bloqueia mutation.
- `generateSmartBriefing`: agora consome payload governado e sinais determinísticos; não escreve dados.
- `transcribeAudio`: converte voz em texto de captura; falha retorna `null` e não grava tarefa automaticamente.

## Arquivos alterados
- `package.json`
- `tsconfig.coach-tests.json`
- `scripts/coachAIGuardrails.fixtures.ts`
- `src/lib/coachAIGuardrails.ts`
- `src/lib/ai.ts`
- `src/lib/briefing.ts`
- `src/pages/Home.tsx`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run test`: passou; fixtures do motor e 8 fixtures de guardrails passaram.
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Decisões tomadas
- IA narrativa só pode consumir payload governado, não histórico bruto completo.
- Resposta de IA com linguagem proibida é bloqueada e substituída por fallback determinístico.
- `updated_at` pode ser citado apenas como proibição/política, nunca como evidência de conclusão.
- `legacy_approx`, `actual_minutes_source='unknown'` e encerramentos sem execução entram como limitações, não como produtividade.

## Pendências
- Sprint 10 deve tratar cache por `input_hash` e versionamento de prompt.
- Eventos históricos não são enviados ao payload do briefing neste sprint; o uso completo de eventos pode ser refinado depois sem quebrar o contrato.

## Resultado
Sprint 9 implementado com lint/build/test verdes e sem migration.

---

# Coach de Produtividade — Sprint 8 — Fase 4: Motor determinístico testável

Data: 2026-06-26

## Objetivo
Criar o motor determinístico do Coach de Produtividade, separado de UI/IA/rede/store, com fixtures pequenas cobrindo os principais cenários de dado honesto e frágil.

## Resumo do que foi feito
- Criado `src/lib/coachSignals.ts`.
- Criada a função pura `analyzeCoachSignals({ tasks, events, now })`.
- O motor gera sinais objetivos, não diagnóstico psicológico.
- O motor não usa `updated_at` como conclusão; conclusão vem de `resolution_type='completed'` + `completed_at` + `completed_at_confidence`.
- `legacy_approx` é tratado como histórico frágil e não como conclusão confirmada.
- Tempos com `actual_minutes_source='unknown'` geram sinal de baixa confiança.
- Encerradas sem execução são contadas por `resolution_type IN ('cancelled','delegated','obsolete')` e não entram como conclusão.
- Reaberturas são lidas a partir de eventos `reopened`, preservando histórico.
- Criado `scripts/coachSignals.fixtures.ts` com 12 fixtures.
- Criado `tsconfig.coach-tests.json`.
- Adicionado `npm run test` com `tsc` + `node`, sem instalar dependências.
- `dist-coach-tests` foi adicionado ao `.gitignore`.
- Nenhuma migration foi criada.

## Arquivos alterados
- `.gitignore`
- `package.json`
- `tsconfig.coach-tests.json`
- `scripts/coachSignals.fixtures.ts`
- `src/lib/coachSignals.ts`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `npm run test`: passou; 12 fixtures executadas.

## Fixtures criadas
- Conclusão confirmada usa `completed_at` e ignora `updated_at`.
- Histórico `legacy_approx` é sinal frágil, não confirmado.
- Encerradas sem execução não contam como conclusão.
- `deleted_at` não é usado como resolução semântica.
- Aguardando terceiro não vira adiamento sem motivo.
- Adiada 3 vezes sem motivo vira dívida de dado.
- `actual_minutes_source='unknown'` rebaixa confiança do tempo real.
- Estimativa `default_30` em excesso gera sinal.
- Recorrentes concluídas contam por instância.
- Reaberta limpa não conta como concluída e preserva evento.
- Baixa qualidade agregada gera sinal sem afirmação forte.
- Mesma entrada gera exatamente a mesma saída.

## Decisões tomadas
- Usar runner mínimo sem dependência nova: `tsc -p tsconfig.coach-tests.json` + `node`.
- Manter o motor puro e parametrizado por `now`.
- Não consumir o motor pela UI nem pela IA neste sprint.
- Manter sinais como evidências operacionais, sem score único e sem julgamento psicológico.

## Pendências
- Sprint 9 deve inventariar e governar a IA existente.
- Consumo do motor por narrativas/briefing fica para sprints posteriores.

## Resultado
Sprint 8 implementado com lint/build/test verdes e sem migration.

---

# Coach de Produtividade — Sprint 7 — Fase 3A: Dashboard confiável mínimo

Data: 2026-06-26

## Objetivo
Refatorar o Dashboard para exibir métricas confiáveis, separando execução real, encerramento sem execução, fila ativa, bloqueios/adiamentos e qualidade do dado, sem criar diagnóstico comportamental novo.

## Resumo do que foi feito
- `DashboardView` foi reorganizado para usar `resolution_type`, `completed_at`, `completed_at_confidence`, `actual_minutes_source`, `estimated_minutes_source`, `blocker_type` e `postponed_count`.
- Conclusões confirmadas aparecem como bloco próprio e alimentam semana, hoje e horário de pico.
- Histórico `legacy_approx` aparece como "Histórico aproximado" e não alimenta métricas de horário.
- Encerradas sem execução aparecem separadas em canceladas, delegadas e obsoletas.
- Abertas executáveis foram separadas de aguardando/bloqueadas/adiadas.
- Adiadas com motivo e sem motivo informado aparecem separadamente.
- Estimado vs. real considera apenas tempo real com origem conhecida.
- Tempo real `unknown` ou sem origem aparece em "Tempo real com baixa confiança".
- Estimativas por IA/default/parser/manual aparecem como qualidade do dado, sem precisão forte.
- `updated_at` não é usado como conclusão no Dashboard.
- `BehavioralSuggestion` permanece desativado.
- Nenhum score de produtividade foi criado.
- Nenhuma migration foi criada.

## Arquivos alterados
- `src/components/DashboardView.tsx`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Bugs ou achados
- O Sprint 6 estava enviado em `090f1ef`, mas o `SPRINT_LOG.md` ainda dizia que commit/push seriam registrados no relatório final.
- Não foi encontrado uso de `updated_at` como conclusão no Dashboard ou no `behaviorEngine`; os usos restantes em `src` são técnicos de edição/sync.

## Decisões tomadas
- Manter `BehavioralSuggestion` desativado no Sprint 7; a reativação fica para depois de um gate explícito de massa de dados confirmados e sem diagnóstico novo.
- Exibir qualidade de dado como contagens e texto, sem score único.
- Tratar adiamento sem motivo como dívida de dado, não como diagnóstico comportamental.

## Pendências
- Sprint 8 deve criar o motor determinístico testável (`coachSignals.ts`) e decidir o mecanismo de fixtures/teste.
- Reativação de sugestão comportamental permanece pendente de gate futuro e massa suficiente de dados confirmados.

## Resultado
Sprint 7 implementado com lint/build verdes e sem migration.

---

# Coach de Produtividade — Sprint 6 — Fase 2: Ajustes nos fluxos existentes

Data: 2026-06-26

## Objetivo
Fechar lacunas dos fluxos existentes: reabertura limpa, teto plausível de timer e motivo opcional de adiamento, sem adicionar diagnóstico comportamental nem alterar `TaskStatus`.

## Resumo do que foi feito
- Criada a migration `0018_postpone_blocker_type.sql`.
- `tasks` ganhou `blocker_type` opcional.
- `blocker_type` aceita `waiting_third_party`, `no_time`, `priority_changed`, `needs_split` e `dependency`.
- Adiamentos sem motivo continuam permitidos e ficam identificáveis por `blocker_type=NULL`.
- Kanban ganhou seletor opcional de motivo antes de adiar; Agenda permite informar o motivo no modal de edição.
- Eventos `postponed` incluem `blocker_type` no payload quando informado, sem bloquear o fluxo.
- Reabrir tarefa concluída limpa conclusão, resolução, timer aberto e tempo real do ciclo anterior.
- Tarefas encerradas sem execução podem ser reabertas no Kanban, preservando histórico de eventos e removendo a resolução atual.
- Timers com mais de 8 horas abertas são tratados como suspeitos: `actual_minutes` é preservado, mas `actual_minutes_source='unknown'`.
- `TaskStatus` não foi alterado.
- `deleted_at` não foi usado para cancelamento, delegação, obsolescência ou reabertura.
- `BehavioralSuggestion` permanece desativado.
- Nenhum diagnóstico comportamental foi criado.

## Arquivos alterados
- `supabase/migrations/0018_postpone_blocker_type.sql`
- `src/types/index.ts`
- `src/lib/sync.ts`
- `src/lib/timeTracking.ts`
- `src/components/TaskActions.tsx`
- `src/components/TaskBoard.tsx`
- `src/components/TimelineView.tsx`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `supabase migration list --linked`: antes da aplicação, remoto alinhado até `0017` e `0018` pendente localmente.
- `supabase db push --dry-run`: passou; listou somente `0018_postpone_blocker_type.sql`.
- `supabase db push --linked`: passou; `0018` aplicada no Supabase remoto.
- `supabase migration list --linked`: após aplicação, remoto alinhado até `0018`.

## Bugs ou achados
- Reabertura anterior alterava apenas status, deixando campos semânticos de conclusão/resolução ativos.
- Timer derivado de `started_at` antigo era tratado como tempo confiável sem teto plausível.
- Sprint 5 estava aplicado e enviado em `4ec04b2`, mas um ponto da documentação ainda dizia que commit/push seriam registrados no relatório final.

## Decisões tomadas
- Timer aberto por mais de 8 horas é suspeito e recebe `actual_minutes_source='unknown'`.
- Reabertura limpa remove também `actual_minutes` e `actual_minutes_source` para evitar que o tempo do ciclo anterior contamine a execução reaberta.
- Motivo de adiamento permanece opcional; ausência de motivo é dado incompleto, não bloqueio operacional.

## Pendências
- Sprint 7 deve consolidar o Dashboard confiável mínimo consumindo as fontes e confidências já registradas.

## Resultado
Sprint 6 implementado, migration `0018` aplicada remotamente e enviado para `origin/main` no commit `090f1ef fix: ajustar fluxos de reabertura e adiamento (Sprint 6)`.

---

# Coach de Produtividade — Sprint 5 — Fase 1D: Origem dos dados e governança de campos

Data: 2026-06-26

## Objetivo
Marcar a procedência de todo dado de estimativa e tempo real que possa vir de IA, fallback, parser, edição manual, timer ou origem desconhecida.

## Resumo do que foi feito
- Criada a migration `0017_data_source_fields.sql`.
- `tasks` ganhou `estimated_minutes_source` e `actual_minutes_source`.
- `estimated_minutes_source` aceita `default_30`, `manual`, `ai` e `parser`.
- `actual_minutes_source` aceita `timer`, `manual`, `retroactive` e `unknown`.
- O backfill mantém estimativas antigas com origem `NULL`, porque o legado não permite diferenciar IA, default ou edição manual com segurança.
- O backfill marca tempo real antigo como `timer` quando há `started_at`, ou `unknown` quando há `actual_minutes` sem `started_at`.
- `Task`, `TaskInput` e `TASK_COLUMNS` foram atualizados.
- `estimateTaskTime` passou a retornar minutos e origem; falhas/retornos inválidos caem em `default_30`.
- Captura nova grava origem `ai`, `default_30` ou `parser`, conforme o fluxo.
- Stepper do Kanban e edição de duração na Agenda gravam origem `manual`.
- Conclusões que calculam `actual_minutes` a partir de `started_at` gravam origem `timer`.
- `TaskStatus` não foi alterado.
- `BehavioralSuggestion` permanece desativado.
- Reabertura limpa, teto de timer e diagnósticos permanecem fora deste sprint.

## Arquivos alterados
- `supabase/migrations/0017_data_source_fields.sql`
- `src/types/index.ts`
- `src/lib/sync.ts`
- `src/lib/ai.ts`
- `src/pages/Home.tsx`
- `src/components/TaskBoard.tsx`
- `src/components/TimelineView.tsx`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `supabase migration list --linked`: antes da aplicação, remoto alinhado até `0016` e `0017` pendente localmente.
- `supabase db push --dry-run`: passou; listou somente `0017_data_source_fields.sql`.
- `supabase db push --linked`: passou; `0017` aplicada no Supabase remoto.
- `supabase migration list --linked`: após aplicação, remoto alinhado até `0017`.

## Bugs ou achados
- Estimativas legadas não têm sinal confiável para distinguir `ai`, `default_30` ou `manual`; por isso a origem permanece `NULL`.

## Decisões tomadas
- Não inferir origem de estimativas antigas sem evidência.
- Fallback fixo de estimativa é dado determinístico `default_30`, não IA.
- Tempo real calculado de `started_at` é classificado como `timer`.

## Pendências
- Sprint 6 deve tratar reabertura limpa completa, teto plausível de timer e adiamento com motivo.
- Sprint 7 deve consumir o eixo de confiabilidade no Dashboard honesto.

## Resultado
Sprint 5 implementado, migration `0017` aplicada remotamente e enviado para `origin/main` no commit `4ec04b2 feat: rastrear origem dos tempos (Sprint 5)`.

---

# Coach de Produtividade — Sprint 4 — Fase 1C: Eventos confiáveis server-stamped

Data: 2026-06-26

## Objetivo
Tornar `task_events` uma trilha temporal auditável, expandindo o vocabulário de eventos, garantindo carimbo server-side e emitindo eventos best-effort nos fluxos operacionais já existentes.

## Resumo do que foi feito
- Criada a migration `0016_task_events_expand_stamp.sql`.
- A migration descobre a constraint real de `task_events.type` em `pg_constraint`, remove o CHECK antigo e recria a constraint como `task_events_type_check`.
- O CHECK de `task_events.type` foi ampliado para `created`, `updated`, `completed`, `viewed`, `started`, `reopened`, `postponed` e `resolved`.
- Criada função `set_task_event_created_at()` e trigger `task_events_set_created_at`, forçando `created_at=now()` no servidor.
- O cliente deixou de enviar `created_at` em eventos; `sync.ts` remove o campo de qualquer evento antigo que ainda esteja na fila.
- `recordTaskEvent` foi criado como ponto central best-effort para emissão de eventos.
- Kanban, Agenda e Foco passam a emitir eventos nos fluxos existentes: iniciar, concluir, reabrir via voltar de concluída, adiar e resolver.
- Eventos continuam desacoplados da operação principal: falha de evento não impede captura, edição, conclusão, adiamento, resolução ou sync de tarefas.
- `TaskStatus` não foi alterado.
- `BehavioralSuggestion` permanece desativado.
- Origem de tempo/estimativa não foi implementada.

## Arquivos alterados
- `supabase/migrations/0016_task_events_expand_stamp.sql`
- `src/types/index.ts`
- `src/stores/taskStore.ts`
- `src/lib/sync.ts`
- `src/components/TaskBoard.tsx`
- `src/components/TimelineView.tsx`
- `src/pages/Home.tsx`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `supabase migration list --linked`: antes da aplicação, remoto alinhado até `0015` e `0016` pendente localmente.
- `supabase db push --dry-run`: passou; listou somente `0016_task_events_expand_stamp.sql`.
- `supabase db push --linked`: passou; `0016` aplicada no Supabase remoto.
- `supabase migration list --linked`: após aplicação, remoto alinhado até `0016`.

## Bugs ou achados
- A constraint antiga de `task_events.type` foi criada inline em `0001_initial_schema.sql`, sem nome explícito no arquivo. A migration usa `pg_constraint` para descobrir o nome real antes de alterar, evitando chute.

## Decisões tomadas
- Eventos passam a ser carimbados pelo servidor via trigger, mesmo que algum cliente antigo envie `created_at`.
- Eventos são best-effort e não bloqueiam o fluxo principal.
- `created_at` de eventos não é mais enviado pelo cliente.

## Pendências
- Sprint 5 deve introduzir origem de `estimated_minutes` e `actual_minutes`.
- Sprint 6 deve tratar reabertura limpa completa; neste sprint a reabertura existente apenas emite evento.

## Resultado
Sprint 4 concluído, com migration `0016` aplicada remotamente e enviado para `origin/main` no commit `e0b12c8 feat: eventos confiáveis server-stamped (Sprint 4)`.

---

# Coach de Produtividade — Sprint 3 — Fase 1B: Semântica de resolução

Data: 2026-06-26

## Objetivo
Introduzir `resolution_type` e `resolved_at` para separar conclusão real de encerramentos sem execução, preservando `TaskStatus` e `deleted_at` exclusivamente para exclusão.

## Resumo do que foi feito
- Criada a migration `0015_resolution_semantics.sql` com colunas, CHECK e backfill de tarefas concluídas.
- Atualizados `Task`, `TaskInput` e `TASK_COLUMNS`.
- Conclusões no Kanban e na Agenda passam a gravar `resolution_type='completed'` e `resolved_at` no mesmo instante de `completed_at`.
- Ações mínimas Cancelar, Delegar e Obsoleta foram adicionadas fora da captura rápida.
- Cancelar, Delegar e Obsoleta mantêm `status` original, gravam `resolved_at`, deixam `completed_at` nulo e não usam `deleted_at`.
- Criado helper compartilhado para tarefa ativa/aberta em `taskFilters.ts`.
- Kanban, Agenda, briefing/ranking, calendário, notificações e Dashboard passaram a excluir encerradas sem execução das listas operacionais.
- O índice parcial de recorrência foi ajustado para que resoluções sem execução não bloqueiem a próxima ocorrência viva.
- `BehavioralSuggestion` segue desativado.
- Eventos novos e origem de dados não foram implementados neste sprint.

## Arquivos alterados
- `supabase/migrations/0015_resolution_semantics.sql`
- `src/types/index.ts`
- `src/lib/sync.ts`
- `src/lib/taskFilters.ts`
- `src/lib/ranking.ts`
- `src/lib/behaviorEngine.ts`
- `src/stores/taskStore.ts`
- `src/components/TaskActions.tsx`
- `src/components/TaskBoard.tsx`
- `src/components/TimelineView.tsx`
- `src/components/DashboardView.tsx`
- `src/components/CalendarWidget.tsx`
- `src/components/NotificationEngine.tsx`
- `src/hooks/useAgendaPositions.ts`
- `src/pages/Home.tsx`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `supabase migration list --linked`: remoto alinhado até `0014` antes da aplicação do Sprint 3.
- `supabase db push --dry-run`: passou; listou somente `0015_resolution_semantics.sql`.
- `supabase db push --linked`: passou; `0015` aplicada no Supabase remoto.
- `supabase migration list --linked`: remoto alinhado até `0015` após aplicação.

## Bugs ou achados
- O índice único parcial de recorrência considerava qualquer tarefa `status <> 'done'` como ocorrência viva. Como resoluções sem execução preservam `status='todo'/'doing'`, o índice foi recriado para excluir `resolution_type IN ('cancelled','delegated','obsolete')`.

## Decisões tomadas
- Cancelada, delegada e obsoleta são resoluções sem execução: não usam `deleted_at` e não recebem `completed_at`.
- `completed_at` passa a ser subconjunto de `resolved_at`.
- Encerrar uma instância recorrente sem execução também prepara a próxima ocorrência quando houver regra de recorrência.

## Pendências
- Sprint 4 deve introduzir eventos confiáveis com carimbo server-side.
- Sprint 5 deve introduzir origem de `estimated_minutes` e `actual_minutes`.

## Resultado
Sprint 3 concluído, com migration aplicada remotamente e enviado para `origin/main` no commit `443daaf feat: resolution_type/resolved_at sem deleted_at — Fase 1B (Sprint 3)`.

---

# Coach de Produtividade — Sprint 2 — Fase 1A: Timestamp honesto mínimo

Data: 2026-06-26

## Objetivo
Criar a base mínima de conclusão honesta com `completed_at`, `completed_at_confidence` e backfill legado como `legacy_approx`.

## Resumo do que foi feito
- Criada a migration `0014_completed_at.sql` com colunas, CHECK e backfill.
- Atualizados `Task`, `TaskInput` e `TASK_COLUMNS`.
- Conclusões no Kanban e na Agenda passam a gravar `completed_at` e `completed_at_confidence='confirmed'`.
- `DashboardView` deixou de usar `updated_at` para métricas de semana/hoje e horário de pico; usa somente `completed_at` confirmado.
- `behaviorEngine.ts` deixou de usar `updated_at` como conclusão e ignora legado `legacy_approx`.
- `BehavioralSuggestion` permanece desativado.
- `resolution_type`, eventos e origem de estimativas não foram implementados neste sprint.

## Arquivos alterados
- `supabase/migrations/0014_completed_at.sql`
- `src/types/index.ts`
- `src/lib/sync.ts`
- `src/components/TaskBoard.tsx`
- `src/components/TimelineView.tsx`
- `src/components/DashboardView.tsx`
- `src/lib/behaviorEngine.ts`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `ARCHITECTURE.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: executado no fechamento versionado do Sprint 2.
- `npm run build`: executado no fechamento versionado do Sprint 2.
- `supabase migration list --linked`: confirmado na revisão do Sprint 3; remoto alinhado até `0014`.
- `supabase db push --dry-run`: executado no fechamento versionado do Sprint 2.
- `supabase db push --linked`: aplicado no fechamento versionado do Sprint 2.

## Bugs ou achados
- A Agenda (`TimelineView`) também tinha caminho próprio de conclusão; foi atualizada junto do Kanban para não deixar gravação sem `completed_at`.

## Decisões tomadas
- Backfill legado usa `updated_at` somente como aproximação marcada `legacy_approx`.
- Métricas de horário ignoram `legacy_approx` e consideram apenas `confirmed`.
- Não foram criados eventos retroativos.

## Pendências
- Sprint 3 deve introduzir `resolution_type` e `resolved_at`.
- Sprint 4 deve introduzir eventos confiáveis/server-stamped.

## Resultado
Sprint 2 concluído, aplicado remotamente e enviado para `origin/main` no commit `3ec8800 feat: adicionar timestamp honesto de conclusão (Sprint 2)`.

---

# Coach de Produtividade — Sprint 1 — Fase 0: Contenção imediata

Data: 2026-06-26

## Objetivo
Parar a exibição de conclusões falsas sem alterar schema, banco, sync, offline-first ou `TaskStatus`.

## Resumo do que foi feito
- Desativada a renderização de `BehavioralSuggestion`, removendo a recomendação baseada em `updated_at`.
- Congelado `src/lib/behaviorEngine.ts` com comentário de bloqueio até o Sprint 2, quando `completed_at` será introduzido.
- Rotulados no Dashboard os blocos que ainda usam `updated_at`: semana/hoje agora aparecem como edições recentes e horário de pico como aproximação por edição.
- Mantidas visíveis as métricas que não dependem de horário real de conclusão.
- Nenhuma migration foi criada.
- `sync.ts`, `taskStore.ts` e `TaskStatus` não foram alterados.

## Arquivos alterados
- `src/components/BehavioralSuggestion.tsx`
- `src/components/DashboardView.tsx`
- `src/lib/behaviorEngine.ts`
- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`
- `DECISIONS.md`
- `PRD.md`

## Validações executadas
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Bugs ou achados
- `updated_at` permanece no Dashboard apenas como fonte provisória rotulada; a remoção real depende do Sprint 2 com `completed_at`.
- `BehavioralSuggestion` fica temporariamente sem renderização por segurança.

## Decisões tomadas
- `updated_at` não representa conclusão.
- A sugestão comportamental fica desligada até existir dado de conclusão honesto.
- Métricas derivadas de `updated_at` devem declarar aproximação por edição.

## Pendências
- Sprint 2 deve introduzir `completed_at` e `completed_at_confidence` com backfill `legacy_approx`.
- Após Sprint 2, Dashboard e motor comportamental devem migrar para `completed_at`.

## Resultado
Sprint 1 concluído com lint/build verdes e sem migration.

---

# Coach de Produtividade — Sprint 0 — Preparação e congelamento de referência

Data: 2026-06-26

## Objetivo
Confirmar a integridade do repositório antes da evolução do Coach de Produtividade e registrar uma baseline objetiva, sem alterar comportamento, código funcional, schema ou sync.

## Resumo do que foi feito
- Lidos os documentos obrigatórios do Coach e os documentos de controle existentes.
- Confirmada a fonte oficial: `docs/coach/SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md`.
- Confirmadas as versões reais em `package.json`.
- Confirmada a presença dos arquivos críticos: `sync.ts`, `taskStore.ts`, `behaviorEngine.ts`, `DashboardView.tsx`, `BehavioralSuggestion.tsx`, `types/index.ts` e `supabase/migrations`.
- Registrados hashes SHA256 dos arquivos críticos em `STATUS.md`.
- Mapeados os pontos atuais em que `updated_at` é usado como aproximação de conclusão.
- Nenhuma migration foi criada.
- Nenhum código funcional foi alterado.
- O Sprint 0 foi posteriormente commitado e enviado para `origin/main` em `cca1f1e chore: organiza plano executor do coach`.

## Arquivos alterados
- `STATUS.md`
- `SPRINT_LOG.md`

## Validações executadas
- `npm ci`: passou.
- `npm run lint`: passou.
- `npm run build`: passou.

## Bugs ou achados
- A árvore Git já estava suja antes das alterações deste sprint: `AGENTS.md` modificado e `docs/` não rastreado. Pendência resolvida pelo commit `cca1f1e`.
- `npm ci` reportou 2 vulnerabilidades no audit (1 low, 1 high). Correção não aplicada por estar fora do escopo do Sprint 0.
- `npm run build` reportou aviso de chunk maior que 500 kB. Build permaneceu verde.
- `updated_at` ainda alimenta conclusão em `behaviorEngine.ts` e em blocos do `DashboardView.tsx`, exatamente o alvo do Sprint 1.

## Decisões tomadas
- Nenhuma decisão nova de arquitetura/produto foi tomada neste sprint.
- A árvore suja pré-existente foi preservada durante a execução do Sprint 0 e depois saneada pelo commit `cca1f1e`.

## Pendências
- Aplicar o Sprint 1 para conter imediatamente a sugestão comportamental e rotular métricas derivadas de `updated_at`.
- Avaliar vulnerabilidades de dependências em sprint próprio ou manutenção dedicada, sem `npm audit fix` automático.
- Confirmar operacionalmente se a migration `0013` já foi aplicada no Supabase remoto, conforme pendência anterior do `STATUS.md`.

## Resultado
Sprint 0 concluído com lint/build verdes, baseline registrada, commitada e enviada para `origin/main` em `cca1f1e`.

---

# Sprint 1 — Fundação

## Objetivo
Construir a fundação técnica inicial do projeto com autenticação, persistência básica, gerenciamento de estado, captura offline simples e schema completo do banco aplicado.

## Entregas concretas
- Scaffold React 19 + Vite 6 + TypeScript 5
- Tailwind CSS 3 configurado (`tailwind.config.ts`)
- Supabase configurado (Supabase JS 2)
- `.env.example` versionado, `.env` no `.gitignore`
- `vercel.json` na raiz com rewrite SPA
- Fluxo de login funcional via e-mail e senha (`supabase.auth.signInWithPassword`)
- Estrutura inicial com Zustand 5
- Persistência local via `zustand/middleware/persist` (localStorage)
- Fila offline de mutações (`PendingMutation[]`) no `taskStore`
- Geração de UUID no cliente (`crypto.randomUUID()`) para inserts de `tasks`
- Layout base da aplicação
- Captura offline básica via input simples
- Estrutura base de rotas (React Router 7)
- Schema do MVP aplicado integralmente no Supabase (ver "Tabelas previstas")

## Arquivos previstos no código
- `src/App.tsx`
- `src/main.tsx`
- `src/lib/supabase.ts`
- `src/stores/contextStore.ts`
- `src/stores/taskStore.ts`
- `src/stores/authStore.ts`
- `src/pages/Login.tsx`
- `src/pages/Home.tsx`
- `src/components/layout/`
- `src/types/supabase.ts` (gerado via Supabase CLI)
- `.env.example`
- `.gitignore` (com `.env`)
- `vite.config.ts`
- `tsconfig.json`
- `tailwind.config.ts`
- `vercel.json`
- `package.json`

## Arquivos previstos mas implementados em sprints futuros
- `src/lib/parser.ts` (Sprint 2)
- `src/lib/ranking.ts` (Sprint 3)
- `src/lib/briefing.ts` (Sprint 4)

## Tabelas previstas no Supabase (todas aplicadas no Sprint 1)
- `tasks` (com `due_at`, `deleted_at`, CHECK constraints em `priority` e `energy`)
- `task_events` (com CHECK constraint em `type`)
- `sync_log` (com trigger de imutabilidade nos campos não-operacionais)

## Triggers previstos
- `tasks_updated_at` (BEFORE UPDATE em `tasks`)
- `sync_log_protect_immutable_trigger` (BEFORE UPDATE em `sync_log`)

## Políticas RLS previstas
- `tasks`: SELECT, INSERT, UPDATE, DELETE por `auth.uid()`
- `task_events`: SELECT, INSERT por `auth.uid()` (append-only puro)
- `sync_log`: SELECT, INSERT, UPDATE por `auth.uid()` (UPDATE restrito por trigger)

## Observação
Não há tabelas `profiles` ou `user_settings` no MVP. O Supabase já fornece `auth.users` com os dados básicos do usuário. Preferências locais (contexto ativo, energia atual) são persistidas via Zustand em localStorage.

A `sync_log` é criada já no Sprint 1, mas seu uso operacional (LWW, retry, observabilidade) só é exercitado no Sprint 5.

A fila `PendingMutation[]` é criada no Sprint 1 mas só é totalmente exercitada no Sprint 5.

## Referência
Para estrutura completa de diretórios e arquivos, consultar `ESTRUTURA_PROJETO.md`.

Para schemas SQL completos (incluindo triggers e índices parciais), consultar `ARCHITECTURE.md`.

## Fora do escopo
- CRUD completo de tarefas (entra no Sprint 2)
- Soft delete via UI (entra no Sprint 2, mas o campo `deleted_at` já existe no schema)
- Edição/exclusão avançada
- Parser de linguagem natural
- IA ou LLM
- Embeddings
- Sync avançado
- Ranking automático
- Briefing automático

## Critérios de conclusão
- Aplicação inicia corretamente
- Login funcional via e-mail e senha (signInWithPassword)
- Banco conectado, três tabelas aplicadas com CHECK constraints e triggers
- Estrutura base operacional pronta
- Captura simples funcionando
- Persistência local funcional
- Fila `PendingMutation[]` operacional no `taskStore` (mesmo sem ser exercitada ainda)
- `vercel.json` em produção respondendo corretamente a rotas profundas

---

# Sprint 2 — CRUD + Parser

## Objetivo
Implementar o fluxo principal operacional de tarefas com parser determinístico local.

## Entregas concretas
- CRUD completo de tarefas
- Edição de tarefas
- Exclusão de tarefas via soft delete (marcar `deleted_at` em vez de DELETE físico)
- Todas as queries do app filtrando `WHERE deleted_at IS NULL`
- Parser local determinístico (`src/lib/parser.ts`) baseado em regras
  - identifica `priority` (palavras-chave ou números)
  - identifica `context` (matching contra os 7 contextos oficiais)
  - identifica `due_at` (datas relativas: "hoje", "amanhã", "depois de amanhã", dias da semana, horários "14h", "às 9h")
  - preenche `title` com o texto restante
- Board simples de visualização
- Context switch operacional
- Interpretação básica de prioridade e contexto

## Fora do escopo
- IA generativa
- Embeddings
- Parsing semântico
- Inferência probabilística

## Critérios de conclusão
- Usuário consegue criar, editar e remover tarefas
- Soft delete funcional (tarefas excluídas desaparecem das listagens mas permanecem no banco)
- Parser interpreta entradas simples de forma previsível, incluindo `due_at`
- Board operacional funcional
- Fluxo principal operacional utilizável

---

# Sprint 3 — Ranking Engine

## Objetivo
Implementar priorização determinística transparente e auditável, consumindo o `due_at` e a energia disponível do usuário.

## Entregas concretas
- Implementação de `src/lib/ranking.ts`
- Ranking determinístico baseado em regras explícitas
- Fatores normalizados para 0–1:
  - `f_urgency` = `(priority/10) * 0.6 + f_due * 0.4`, onde `f_due` reflete proximidade de `due_at`
  - `f_energy` = `1 - |energy_tarefa/10 - energy_usuario/10|` (proximidade, consumindo `contextStore.energiaAtual`)
  - `f_age` = `min(idade_em_dias / 30, 1)`
  - `f_context` = `1` quando contexto da tarefa = contexto ativo, `0` caso contrário
- Score final entre 0 e 1 (pesos 0.4 + 0.2 + 0.2 + 0.2)
- Priorização previsível
- Recomendações transparentes
- Critérios de prioridade configuráveis
- Ordenação consistente de tarefas

## Observação
O termo "Ranking Engine" substitui "Recommendation Engine" para evitar associação com ML ou IA.

Todo o algoritmo desta etapa é baseado exclusivamente em regras explícitas e determinísticas. A fórmula completa está em `ARCHITECTURE.md`.

## Critérios de conclusão
- Sistema consegue ordenar tarefas de forma consistente
- Critérios de score são rastreáveis (cada fator inspecionável separadamente)
- Priorizações são reproduzíveis (mesma entrada → mesmo score)
- Resultado do ranking é auditável
- `f_energy` reflete corretamente o estado do usuário (validar com `energiaAtual` em diferentes valores)
- Tarefas com `due_at` próximo ranqueiam acima de tarefas iguais sem prazo

---

# Sprint 4 — Briefing + UX

## Objetivo
Refinar a experiência operacional e consolidar os briefings determinísticos.

## Entregas concretas
- Implementação de `src/lib/briefing.ts`
- Briefing determinístico diário (aplica `ranking.ts` sobre tarefas ativas)
- Throttling de eventos `viewed`: no máximo 1 por tarefa por dia
  - antes do insert, verificar se já existe `viewed` para essa `task_id` com `created_at >= início do dia atual`
- Refinos de UX
- Melhorias de navegação
- Feedback visual de prioridade
- Ajustes de fluxo operacional
- Refinos de captura rápida

## Fora do escopo
- Assistente conversacional
- IA contextual
- Briefing baseado em LLM
- Automação inteligente

## Critérios de conclusão
- Briefing funcional e previsível
- `task_events` não infla com `viewed` duplicado (validar abrindo o app várias vezes no mesmo dia)
- Navegação mais fluida
- Feedback visual consistente
- Fluxo operacional mais rápido

---

# Sprint 5 — Sync + Hardening

## Objetivo
Adicionar sincronização básica e robustez operacional mínima. A tabela `sync_log` já existe desde o Sprint 1; este sprint trata do seu uso operacional.

## Entregas concretas
- Estratégia Last Write Wins (LWW) em nível de registro inteiro
- Consumo operacional da `sync_log`:
  - cada mutação processada gera registro
  - cliente atualiza `status` (`pending` → `synced` ou `failed`)
  - cliente atualiza `retry_count`, `last_error`, `synced_at`
  - campos imutáveis protegidos pelo trigger
- Consumo da fila `PendingMutation[]` do `taskStore`:
  - ao detectar conexão, processar mutações pendentes em ordem
  - sucesso → remover da fila + marcar `sync_log` como `synced`
  - falha → incrementar `retryCount`, marcar `sync_log` como `failed`
- Retry simples de requisições falhas
- Observabilidade mínima via `task_events`
- Tratamento básico offline/online
- Hardening operacional inicial
- Recuperação simples de sincronização

## Observação
A estratégia LWW deve permanecer explicitamente documentada para evitar ambiguidades futuras.

Conflitos de delete-vs-update entre devices são mitigados pelo soft delete (`deleted_at`) já presente desde o Sprint 1.

## Critérios de conclusão
- Dados sincronizam sem conflitos críticos
- Retry funcional
- Eventos mínimos auditáveis
- Aplicação tolera falhas básicas de conectividade
- Recuperação simples de sincronização funcional
- Trigger de imutabilidade da `sync_log` validado em prática (tentativa de UPDATE em `entity_id` retorna erro)

---

# Sprint 6 — Uso Real

## Objetivo
Preparar o sistema para uso diário contínuo.

## Entregas concretas
- Correções finais
- Estabilização operacional
- Refinos de UX
- Ajustes de performance
- Uso diário real
- Validação prática do fluxo principal
- Ajustes baseados em uso real

## Critérios de conclusão
- Fluxo principal utilizável diariamente
- Bugs críticos resolvidos
- Sistema estável para operação contínua
- Performance operacional aceitável
- Uso diário validado

---

# Diretriz Operacional Oficial

Nenhum sprint deve:
- antecipar funcionalidades pós-MVP
- introduzir IA prematuramente
- aumentar drasticamente complexidade
- criar infraestrutura não planejada

Toda evolução deve preservar:
- simplicidade
- previsibilidade
- estabilidade
- baixo custo operacional
- manutenção simples
