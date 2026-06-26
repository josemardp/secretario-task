# SPRINT_LOG.md — SecretárioTask

Última revisão: 2026-06-26
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
Sprint 4 implementado e migration `0016` aplicada remotamente. Commit/push serão registrados no relatório final.

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
