# STATUS.md — SecretárioTask

Última atualização: 2026-06-26

---

# Protocolo rápido (auto-lembrete)

## Sessão normal
- **Início:** ler este arquivo + sprint atual em `SPRINT_LOG.md`
- **Fim:** marcar `[x]` o que foi feito + atualizar "Próximo passo" + atualizar data acima

## Início de sprint
- ritual completo no `AGENTS.md` (Modo 2)

## Fim de sprint
- ritual completo no `AGENTS.md` (Modo 3)

## Decisão técnica não-trivial durante o trabalho
- registrar em `DECISIONS.md` (critério no `AGENTS.md`)

---

# Sprint atual

Coach de Produtividade — Sprint 10 concluído

---

# Coach de Produtividade — Sprint 10 — Fase 5B: IA narrativa cacheada e segura

Data: 2026-06-26

## Objetivo
Tornar o briefing com IA mais eficiente e seguro, cacheando narrativas governadas por `input_hash` e versionando prompt/guardrails.

## Resultado
- Criado `src/lib/stableHash.ts` com serialização estável e hash determinístico.
- Criado `src/lib/coachAICache.ts` com cache local em memória para narrativas seguras.
- Criadas as versões `COACH_AI_PROMPT_VERSION='coach-briefing-v1'` e `COACH_AI_GUARDRAILS_VERSION='coach-guardrails-v1'`.
- O `input_hash` considera versão, energia, janela temporal horária, top tasks governadas, sinais determinísticos e limitações.
- O hash ignora `updated_at` e campos que não são enviados ao payload governado.
- Cache hit retorna a narrativa segura sem rechamar IA.
- Cache miss chama IA, valida guardrails e armazena apenas resposta final segura de origem `ai`.
- Fallback por falha de API, JSON inválido ou linguagem proibida não é cacheado como resposta válida.
- Prompt do briefing declara que a IA narra o ranking determinístico.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Validações
- `npm run test`: passou; fixtures do motor e 17 fixtures de guardrails/cache passaram.
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 11 — Auditoria final, hardening e documentação de fechamento.

---

# Coach de Produtividade — Sprint 9 — Fase 5A: Governança da IA existente

Data: 2026-06-26

## Objetivo
Governar o uso da IA já existente no Coach de Produtividade, impedindo que IA origine diagnóstico, julgamento pessoal ou escrita de campos semânticos, e mantendo fallback determinístico.

## Resultado
- Criada a camada pura `src/lib/coachAIGuardrails.ts`.
- Criado payload governado para IA baseado em tarefas acionáveis e sinais determinísticos de `analyzeCoachSignals`.
- O payload não envia histórico bruto completo nem campo `updated_at` como evidência.
- Criado contrato de prompt e saída JSON para narrativa segura.
- Respostas com termos proibidos são bloqueadas e substituídas por fallback cauteloso.
- `generateSmartBriefing` passou a usar payload governado e fallback determinístico sem cache, `input_hash` ou versionamento.
- `transcribeAudio` passou a falhar de forma não-crítica, retornando `null` em erro.
- `estimateTaskTime` permanece com fallback `default_30` e origem marcada.
- `parseMultipleTasks` permanece com fallback determinístico para `parseTaskInput`.
- `generateEmbedding` permanece não-bloqueante no sync por `try/catch`.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Validações
- `npm run test`: passou; fixtures do motor e 8 fixtures de guardrails passaram.
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 10 — Fase 5B: IA narrativa cacheada e segura.

---

# Coach de Produtividade — Sprint 8 — Fase 4: Motor determinístico testável

Data: 2026-06-26

## Objetivo
Criar um motor determinístico do Coach de Produtividade para transformar dados honestos em sinais objetivos, puros, testáveis e separados da UI, da IA, da rede e do armazenamento local.

## Resultado
- Criado `src/lib/coachSignals.ts`.
- Criado motor puro `analyzeCoachSignals({ tasks, events, now })`.
- O motor recebe `now` por parâmetro e não usa `Date.now()` ou relógio implícito.
- O motor não depende de UI, Supabase, localStorage, API externa ou IA.
- Sinais implementados: baixa quantidade de conclusões confirmadas, histórico aproximado presente, adiamentos sem motivo, tempo real desconhecido, excesso de estimativas `default_30`, proporção de encerradas sem execução, bloqueios recorrentes, diferença estimado vs. real confiável, reaberturas e baixa qualidade agregada do dado.
- Saídas usam `signal_id`, severidade simples, título, descrição objetiva, evidências, confiança, recomendação operacional e campos que enfraquecem a confiança.
- Criadas fixtures em `scripts/coachSignals.fixtures.ts`.
- Criado `tsconfig.coach-tests.json`.
- Adicionado `npm run test` sem dependência nova; usa `tsc` + `node`.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.
- `npm run test`: passou; 12 fixtures executadas.

## Próximo sprint recomendado
Sprint 9 — Fase 5A: Governança da IA existente.

---

# Coach de Produtividade — Sprint 7 — Fase 3A: Dashboard confiável mínimo

Data: 2026-06-26

## Objetivo
Refatorar o Dashboard para consumir os dados honestos dos Sprints 2 a 6, separando conclusões reais, histórico aproximado, encerramentos sem execução, fila aberta, bloqueios/adiamentos e qualidade do dado.

## Resultado
- `DashboardView` passou a separar conclusões confirmadas, histórico aproximado e conclusões com dado incompleto.
- Métricas de horário e semana usam somente `completed_at` com `completed_at_confidence='confirmed'`.
- Histórico `legacy_approx` aparece apenas em contagem agregada rotulada como "Histórico aproximado".
- Encerradas sem execução aparecem separadas por `cancelled`, `delegated` e `obsolete`, sem contar como conclusão.
- A fila ativa separa abertas executáveis de aguardando/bloqueadas/adiadas.
- Adiamentos com e sem motivo são exibidos separadamente; ausência de motivo é apresentada como dívida de dado.
- Estimado vs. real usa somente tempo real com origem conhecida; tempos `unknown` ou sem origem aparecem em qualidade do dado.
- Qualidade do dado é textual e segmentada, sem score único.
- `updated_at` não é usado como conclusão no Dashboard.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 8 — Fase 4: Motor determinístico testável.

---

# Coach de Produtividade — Sprint 6 — Fase 2: Ajustes nos fluxos existentes

Data: 2026-06-26

## Objetivo
Corrigir reabertura, impedir que timers antigos inflem tempo real confiável e permitir motivo opcional em adiamentos, preservando baixo atrito, recorrência, sync/offline-first e sem alterar `TaskStatus`.

## Resultado
- Criada migration `0018_postpone_blocker_type.sql`.
- Adicionado `blocker_type` opcional em `tasks`.
- Valores permitidos para `blocker_type`: `waiting_third_party`, `no_time`, `priority_changed`, `needs_split`, `dependency`.
- Adiamentos no Kanban e na Agenda continuam permitidos sem motivo; nesse caso `blocker_type=NULL` identifica dado incompleto.
- Adiamentos com motivo registram `blocker_type` na tarefa e no payload do evento `postponed`.
- Reabertura de tarefas concluídas limpa `completed_at`, `completed_at_confidence`, `resolution_type`, `resolved_at`, `started_at`, `actual_minutes` e `actual_minutes_source`.
- Reabertura de tarefas encerradas sem execução limpa a resolução e emite evento `reopened` best-effort.
- Timer aberto por mais de 8 horas passa a gravar `actual_minutes_source='unknown'`, mantendo o valor calculado como dado suspeito, não confiável.
- Eventos continuam best-effort e não bloqueiam concluir, iniciar, adiar, resolver, reabrir ou sync.
- `TaskStatus` não foi alterado.
- `deleted_at` não foi usado para semântica.
- `BehavioralSuggestion` permanece desativado.
- Nenhum diagnóstico comportamental novo foi criado.

## Migration remota
- `supabase migration list --linked`: executado antes da aplicação; remoto estava alinhado até `0017` e `0018` aparecia pendente apenas localmente.
- `supabase db push --dry-run`: passou; listou somente `0018_postpone_blocker_type.sql`.
- `supabase db push --linked`: passou; `0018` aplicada no Supabase remoto.
- `supabase migration list --linked`: confirmado após aplicação; remoto alinhado até `0018`.
- Commit/push: `090f1ef fix: ajustar fluxos de reabertura e adiamento (Sprint 6)` enviado para `origin/main`.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 7 — Fase 3A: Dashboard confiável mínimo.

---

# Coach de Produtividade — Sprint 5 — Fase 1D: Origem dos dados e governança de campos

Data: 2026-06-26

## Objetivo
Introduzir origem explícita para `estimated_minutes` e `actual_minutes`, impedindo que estimativa por IA/default/manual/parser e tempo real por timer/manual/retroativo/desconhecido sejam misturados sem identificação.

## Resultado
- Criada migration `0017_data_source_fields.sql`.
- Adicionados `estimated_minutes_source` e `actual_minutes_source` em `tasks`.
- Valores permitidos para `estimated_minutes_source`: `default_30`, `manual`, `ai`, `parser`.
- Valores permitidos para `actual_minutes_source`: `timer`, `manual`, `retroactive`, `unknown`.
- Backfill legado: `estimated_minutes_source` permanece `NULL` para estimativas antigas porque não é possível distinguir com segurança IA/default/manual; `actual_minutes_source` vira `timer` quando há `started_at`, e `unknown` quando há `actual_minutes` sem `started_at`.
- `TASK_COLUMNS` e tipos TypeScript incluem os novos campos.
- Captura nova grava `estimated_minutes_source='ai'` quando `estimateTaskTime` retorna pela IA.
- Fallback fixo de 30 minutos grava `estimated_minutes_source='default_30'`.
- Valores de estimativa já presentes em objetos parseados entram como `parser` quando não trazem origem explícita.
- Stepper do Kanban e edição de duração na Agenda gravam `estimated_minutes_source='manual'`.
- Conclusão derivada de `started_at` grava `actual_minutes_source='timer'`.
- `TaskStatus` não foi alterado.
- `deleted_at` não foi usado para semântica.
- `BehavioralSuggestion` permanece desativado.
- Reabertura limpa completa e teto de timer não foram implementados.
- Nenhum diagnóstico comportamental novo foi criado.

## Migration remota
- `supabase migration list --linked`: executado antes da aplicação; remoto estava alinhado até `0016` e `0017` aparecia pendente apenas localmente.
- `supabase db push --dry-run`: passou; listou somente `0017_data_source_fields.sql`.
- `supabase db push --linked`: passou; `0017` aplicada no Supabase remoto.
- `supabase migration list --linked`: confirmado após aplicação; remoto alinhado até `0017`.
- Commit/push: `4ec04b2 feat: rastrear origem dos tempos (Sprint 5)` enviado para `origin/main`.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 6 — Fase 2: Reabertura limpa + teto de timer + adiar com motivo.

---

# Coach de Produtividade — Sprint 4 — Fase 1C: Eventos confiáveis server-stamped

Data: 2026-06-26

## Objetivo
Tornar `task_events` uma trilha auditável útil, com vocabulário expandido, carimbo server-side e emissão best-effort nos fluxos existentes.

## Resultado
- Criada migration `0016_task_events_expand_stamp.sql`.
- O CHECK de `task_events.type` passa a aceitar `created`, `updated`, `completed`, `viewed`, `started`, `reopened`, `postponed` e `resolved`.
- A migration descobre a constraint real via `pg_constraint` antes de alterá-la e recria o CHECK como `task_events_type_check`.
- Criada função `set_task_event_created_at()` e trigger `task_events_set_created_at` para forçar `created_at=now()` no servidor em todo INSERT.
- O cliente deixou de enviar `created_at` para `task_events`; `sync.ts` também remove `created_at` de eventos antigos ainda pendentes.
- `recordTaskEvent` centraliza eventos best-effort no store.
- Fluxos existentes passaram a emitir eventos: iniciar (`started`), concluir (`completed`), reabrir via voltar de `done` (`reopened`), adiar (`postponed`) e resolver sem execução (`resolved`).
- Eventos permanecem não-bloqueantes: falhas de enqueue/sync são registradas de forma segura e não impedem o fluxo principal.
- `TaskStatus` não foi alterado.
- `deleted_at` não foi usado para semântica.
- `BehavioralSuggestion` permanece desativado.
- Origem de `actual_minutes`/`estimated_minutes` não foi implementada.

## Migration remota
- `supabase migration list --linked`: executado antes da aplicação; remoto estava alinhado até `0015` e `0016` aparecia pendente apenas localmente.
- `supabase db push --dry-run`: passou; listou somente `0016_task_events_expand_stamp.sql`.
- `supabase db push --linked`: passou; `0016` aplicada no Supabase remoto.
- `supabase migration list --linked`: confirmado após aplicação; remoto alinhado até `0016`.
- Commit/push: `e0b12c8 feat: eventos confiáveis server-stamped (Sprint 4)` enviado para `origin/main`.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 5 — Fase 1D: Origem dos dados e governança de campos.

---

# Coach de Produtividade — Sprint 3 — Fase 1B: Semântica de resolução

Data: 2026-06-26

## Objetivo
Diferenciar tarefa concluída de tarefa encerrada sem execução, sem alterar `TaskStatus` e sem usar `deleted_at` para cancelamento, delegação ou obsolescência.

## Resultado
- Criada migration `0015_resolution_semantics.sql`.
- Adicionados `resolution_type` e `resolved_at` em `tasks`.
- Backfill planejado: tarefas `status='done'` passam a ter `resolution_type='completed'` e `resolved_at=completed_at`.
- `TASK_COLUMNS` e tipos TypeScript incluem `resolution_type` e `resolved_at`.
- Novas conclusões gravam `resolution_type='completed'` e `resolved_at` junto de `completed_at`.
- Ações discretas de Cancelar, Delegar e Obsoleta gravam `resolution_type`, `resolved_at` e mantêm `completed_at=NULL`.
- Helper `isActiveTask`/`isOpenTask` exclui canceladas, delegadas e obsoletas das listas operacionais sem usar `deleted_at`.
- Kanban, Agenda, ranking, briefing, notificações, calendário e Dashboard passaram a respeitar a semântica de tarefa ativa.
- Índice parcial de recorrência foi ajustado para não tratar tarefas canceladas, delegadas ou obsoletas como ocorrência viva da série.
- `TaskStatus` não foi alterado.
- Eventos novos não foram implementados.
- `BehavioralSuggestion` permanece desativado.

## Migration remota
- `supabase migration list --linked`: executado antes da aplicação; remoto estava alinhado até `0014`.
- `supabase db push --dry-run`: passou; listou somente `0015_resolution_semantics.sql`.
- `supabase db push --linked`: passou; `0015` aplicada no Supabase remoto.
- `supabase migration list --linked`: confirmado após aplicação; remoto alinhado até `0015`.
- Commit/push: `443daaf feat: resolution_type/resolved_at sem deleted_at — Fase 1B (Sprint 3)` enviado para `origin/main`.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB.

## Próximo sprint recomendado
Sprint 4 — Fase 1C: Eventos confiáveis server-stamped.

---

# Coach de Produtividade — Sprint 2 — Fase 1A: Timestamp honesto mínimo

Data: 2026-06-26

## Objetivo
Introduzir `completed_at` e `completed_at_confidence` como base honesta mínima para conclusão, com backfill legado marcado explicitamente como aproximação.

## Resultado
- Criada migration `0014_completed_at.sql`.
- `TASK_COLUMNS` inclui `completed_at` e `completed_at_confidence`.
- Tipos `Task`/`TaskInput` aceitam os novos campos.
- Novas conclusões no Kanban e na Agenda gravam `completed_at` e `completed_at_confidence='confirmed'`.
- Edições posteriores de tarefas já concluídas não reescrevem `completed_at`.
- Dashboard usa somente conclusões confirmadas para métricas de semana/hoje e horário de pico.
- `behaviorEngine.ts` passou a analisar somente `completed_at_confidence='confirmed'`, mas `BehavioralSuggestion` permanece desativado.

## Migration remota
- `supabase migration list --linked`: confirmado na revisão do Sprint 3; remoto alinhado até `0014`.
- `supabase db push --dry-run`: executado no fechamento versionado do Sprint 2.
- `supabase db push --linked`: aplicado no fechamento versionado do Sprint 2; commit `3ec8800 feat: adicionar timestamp honesto de conclusão (Sprint 2)`.

## Validações
- `npm run lint`: executado no fechamento versionado do Sprint 2.
- `npm run build`: executado no fechamento versionado do Sprint 2.

## Próximo sprint recomendado
Sprint 3 — Fase 1B: Semântica de resolução (`resolution_type` + `resolved_at`).

---

# Coach de Produtividade — Sprint 1 — Fase 0: Contenção

Data: 2026-06-26

## Objetivo
Parar a exibição de conclusões falsas sem tocar banco, schema, sync ou `TaskStatus`.

## Resultado
- `BehavioralSuggestion` não renderiza mais enquanto o motor ainda depende de `updated_at`.
- `src/lib/behaviorEngine.ts` foi congelado com comentário de bloqueio até o Sprint 2.
- Blocos do Dashboard que dependem de `updated_at` foram rotulados como aproximação por data de edição.
- Métricas sem dependência de horário de conclusão continuam visíveis: total histórico, contexto, estimado vs. real, prioridade média e adiadas.
- Nenhuma migration foi criada ou aplicada.

## Validações
- `npm run lint`: passou.
- `npm run build`: passou; Vite manteve aviso de chunk maior que 500 kB (`index-CmCc5LC0.js` com 935.89 kB / gzip 269.69 kB).

## Próximo sprint recomendado
Sprint 2 — Fase 1A: `completed_at` + `completed_at_confidence` + backfill.

---

# Baseline Coach v4 — Sprint 0

Data: 2026-06-26

## Fonte oficial lida
- `docs/coach/SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md`
- `docs/coach/Prompt_Codex_Executar_Sprints_SecretarioTask_SEGURO.md`
- `docs/coach/SecretarioTask_Plano_Coach_Produtividade_v4.md`
- `AGENTS.md`
- Documentos de controle existentes: `STATUS.md`, `ROADMAP.md`, `SPRINT_LOG.md`, `DECISIONS.md`, `ARCHITECTURE.md`, `PRD.md`, `PHILOSOPHY.md`

## Versões confirmadas no `package.json`
- React: `^19.2.6`
- Vite: `^8.0.12`
- TypeScript: `~6.0.2`
- Tailwind CSS: `^3.4.19`
- Zustand: `^5.0.13`
- Supabase JS: `^2.106.1`
- React Router DOM: `^7.15.1`
- Recharts: `^3.8.1`
- DnD Kit: `^6.3.1`
- Lucide React: `^1.16.0`

## Validações de baseline
- `npm ci`: passou; audit reportou 2 vulnerabilidades (1 low, 1 high), sem correção automática neste sprint.
- `npm run lint`: passou.
- `npm run build`: passou; Vite reportou aviso de chunk maior que 500 kB (`index-d4PluYSh.js` com 937.75 kB / gzip 270.17 kB).

## Estado Git antes das alterações deste sprint
- Branch: `main...origin/main`
- Árvore já não estava limpa antes do Sprint 0: `AGENTS.md` modificado e `docs/` não rastreado.
- Pendência resolvida após o Sprint 0 pelo commit `cca1f1e chore: organiza plano executor do coach`, enviado para `origin/main`.
- Nenhuma alteração funcional foi feita no Sprint 0.

## Fechamento versionado
- Sprint 0 commitado e enviado para `origin/main` em `cca1f1e chore: organiza plano executor do coach`.
- A pendência "árvore suja com `AGENTS.md` e `docs/`" foi resolvida por esse commit.

## Arquivos críticos confirmados
- `src/lib/sync.ts`: presente; contém `TASK_COLUMNS`, `stripReadonlyTaskFields`, `fetchRemoteTasks` e `processSyncQueue`. SHA256 `CB1007345181A3CA449D3763FFAB8015488D7A3FFFA8EFF3D345EEFE7DA2FC9F`.
- `src/stores/taskStore.ts`: presente; contém store offline-first, fila de mutações, `updateTask`, `recordViewEvent` e `partialize`. SHA256 `3943448479E186A2D1FEEA51027D8BB49A00F3092C8EFB3D1F82D49B5B6A5E07`.
- `src/lib/behaviorEngine.ts`: presente; motor comportamental atual. SHA256 `67A504665EBD1DB26A362C06CB3F4302E7668708315FE7840EADC74FFC52CE48`.
- `src/components/DashboardView.tsx`: presente; dashboard analítico atual. SHA256 `81F58BC89F7A90424EA7DD4206814D940ED57B2F5D9A6FABF55DDD99797F39A6`.
- `src/components/BehavioralSuggestion.tsx`: presente; sugestão comportamental ativa. SHA256 `023E88E23EAC6AF94A34B8A862DF52EA7E11FDA5E7375F1286E82910E5DC8BBE`.
- `src/types/index.ts`: presente; tipos centrais de tarefa/contexto. SHA256 `7ABD65275CBE18E629F6682F90D25905AA30D15A797380C8BB63E08FB7575CC7`.
- `supabase/migrations`: presente com migrations `0001` a `0013`; nenhuma migration `0014` criada neste sprint.

## Pontos atuais de `updated_at` como conclusão
- `src/lib/behaviorEngine.ts`: `analyzeBehavior` filtra tarefas `status === 'done'` e usa `new Date(t.updated_at).getHours()` para calcular picos de energia.
- `src/components/DashboardView.tsx`: `peakHourData` usa `updated_at` para "Horário de pico".
- `src/components/DashboardView.tsx`: `dailyData` usa `updated_at` para distribuir tarefas nos últimos 7 dias.
- `src/components/DashboardView.tsx`: `weekTotal` e `todayCount` derivam de `dailyData`, portanto herdando `updated_at` como aproximação de conclusão.

## Próximo sprint recomendado
Sprint 1 — Fase 0: Contenção imediata do coach atual, sem schema e sem migration.

## Observação
Todos os épicos de refinamento de PWA e melhorias críticas de UX Mobile-First foram concluídos com sucesso absoluto. O app está consolidado nas melhores práticas de interfaces móveis e pronto para produção robusta.

---

# Progresso dentro do sprint atual

A auditoria de UX Mobile-First e o hardening do Progressive Web App (PWA) foram executados perfeitamente, resolvendo problemas de safe-area, auto-zoom no iOS Safari, compactação de telas menores de 384px, e hierarquias visuais da agenda e do Foco do Dia.
Foi aplicado também o ajuste operacional do Foco/TOP 3 para comportamento reativo em tempo real, com briefing sob demanda baseado no TOP 3 vigente no clique.
Foi implementado também o registro e a exibição discreta de `created_at`/`updated_at` nas experiências de edição e expansão de tarefas, com sync blindado para não enviar esses campos em `UPDATE`.
Foi corrigida a criação duplicada de tarefas recorrentes com guard idempotente por `recurrence_origin_id` e deduplicação funcional no merge remoto.
Foi corrigido o briefing para excluir tarefas concluídas, deletadas ou com horário anterior ao momento atual, incluindo reforço do contexto temporal no prompt inteligente.
Foi removida a duplicação da regra de tarefa acionável para briefing, centralizando o filtro em helper compartilhado.
Foi ajustada a barra de captura para expandir automaticamente com textos longos e preservar espaço inferior proporcional na tela.
Foi removido o drag-and-drop por toque dos cards da Agenda para priorizar a rolagem vertical natural em mobile.
Foi corrigida a hierarquia visual mobile para impedir que cards da Agenda cubram a barra de captura expandida.
Foi corrigida uma regressão de sync pós-auditoria: falha ao buscar `profiles` não bloqueia mais o ciclo de tarefas, e conflitos `23505` de recorrência removem a ocorrência local rejeitada pelo banco antes do novo pull remoto.
Foi implementado o refinamento mobile hard-level solicitado a partir da auditoria de design: login em Direction B, linguagem operacional sem emojis, toasts no lugar de alerts, EmptyState padronizado, aba Hoje com bloco Agora/Top 1, concluídas colapsadas, checkbox concluindo diretamente, swipe concluir/adiar, captura restrita ao Hoje e ancorada ao teclado virtual.
Foram aplicados ajustes de paleta semântica, contraste, alvos de toque, tipografia, Painel sem duplicação de gráfico de distribuição, Agenda com scroll calculado no contêiner e limpeza de lint em código-fonte.
Foi refinada a Agenda mobile para abandonar a parede de botões: bolinha de conclusão no card, lápis discreto para edição/ações completas, swipe para a direita adiando para amanhã e swipe para a esquerda abrindo confirmação de exclusão.
Foi corrigida a regressão visual no desktop da Agenda: o card desktop não herda mais a bolinha/layer de gesto do mobile e mantém os botões em fluxo estável, sem corte.
Foi aplicada a primeira etapa do design system premium de cores: tokens CSS globais claro/escuro, Tailwind referenciando variáveis, Agenda sem faixas laterais coloridas, tab bar em acento e slider de energia tokenizado.
Foi corrigido o corte visual de cards na Agenda mobile: slots agora reservam altura proporcional ao conteúdo real, incluindo títulos longos e badges, e o card não corta mais a própria borda/conteúdo.
Foi recalibrada a altura dos slots da Agenda para reduzir espaços vazios excessivos após a correção de corte dos cards.
Foi migrado o Dashboard para o design system neutro: cards, textos e bordas usam tokens diretos; gráficos Recharts leem tokens CSS no runtime; contextos mantêm uma paleta categórica controlada.
Foi corrigido novo corte de bordas dos cards na Agenda: slots com tarefa agora crescem pelo conteúdo real, o contêiner ganhou respiro interno e o auto-scroll preserva margem visual no topo.

## Checklist
- [x] Pré-requisitos críticos (Viewport fit cover & PWA event listener cleanup).
- [x] Estilização de Safe areas dinâmicas em todos os elementos fixed e overlays de modais.
- [x] Prevenção de auto-zoom indesejado no iOS Safari com textarea ajustado para 16px (text-base).
- [x] Header super-compacto de 44px com data local e ciclos síncronos de contexto por toque.
- [x] Tab Bar inferior standalone fixa com safe-areas e ícones Lucide vetoriais (Kanban, Agenda, Stats).
- [x] Barra de digitação sticky no rodapé acima da Tab Bar e botão de gravação por voz com tap-target de 44x44px.
- [x] Hierarquia visual do Foco do Dia (Top 1 de 64px in destaque, Top 2/3 de 48px e metadados de tempo/duração).
- [x] Grade de 30min da Agenda otimizada com indicador de "agora" síncrono vermelho e compactação de slots vazios para 24px.
- [x] Definição de tokens de cores semânticas centralizados in tailwind.config.ts.
- [x] Substituição do Drag-and-Drop nativo do HTML5 por @dnd-kit em TimelineView.tsx para touch móvel.
- [x] Adicionado feedback visual linear de drag-and-drop (Estilo C - Trello/Linear) e contraste nos slots inativos na Agenda.
- [x] Implementado bloqueio nativo (useDroppable disabled) e esmaecimento para slots passados na Agenda.
- [x] Aplicado hardening de sync: tombstones, zero-row updates, lock da fila, Realtime, profiles, postponed_count e API key fora do localStorage. BUG-010 adiado por solicitacao explicita.
- [x] Migrations 0005 e 0006 aplicadas no Supabase.
- [x] Senha do banco rotacionada.
- [x] BUG-010 encerrado como won't fix — autenticação por e-mail e senha mantida intencionalmente (decisão registrada em DECISIONS.md).
- [x] Documentação alinhada com o código real (magic link → e-mail e senha).
- [x] Correção do Foco/TOP 3: tarefas sem `due_at` passam a entrar no Top 3; briefing permanece estático até clique e gera com o Top 3 atual.
- [x] Registro e exibição discreta de criação/última edição das tarefas com `created_at`/`updated_at`.
- [x] Correção visual da Agenda: cards de tarefas renderizam acima da linha vermelha de "agora".
- [x] Reposicionamento em tempo real de tarefas atrasadas na Agenda (tick de 30s) e encapsulamento em useAgendaPositions.
- [x] Correção temporal do briefing: tarefas concluídas e tarefas com horário passado não entram no Top 3 nem no briefing inteligente.
- [x] Centralização da regra de tarefa acionável para briefing em helper compartilhado.
- [x] Autoexpansão da barra de captura para visualizar textos longos antes de cadastrar tarefas.
- [x] Remoção do arraste por toque na Agenda para permitir rolagem vertical sobre cards e laterais.
- [x] Ajuste de z-index da barra de captura para ficar acima dos cards da Agenda.
- [x] Correção de UX: scroll automático para o horário atual ao abrir a Agenda (duplo requestAnimationFrame).
- [x] Todos os overlays corrigidos para mobile com `createPortal` + `z-[9999]`: modal de edição (Agenda), FocoSheet (Briefing/TOP 3), MultiTaskConfirmModal, SettingsModal e CalendarWidget — todos escapam do stacking context do `<main overflowX: clip>`.
- [x] Seletor visual de recorrência adicionado ao modal de edição da Agenda (TimelineView): pills de dias da semana + atalhos rápidos (Diario, Dias uteis, Semanal, Mensal, Impares, Pares).
- [x] Tipo `RecurrenceRule` criado em `src/types/index.ts` como tipo auxiliar de UI (distinto de `Task.recurrence_rule: string | null` para compatibilidade com o parser).
- [x] Lógica de recorrência extraída para `src/lib/recurrence.ts`: WEEKDAY_PILLS, RECURRENCE_PRESETS, toggleWeekday (com promoção automática para `daily` ao selecionar 7 dias), togglePreset, getNextOccurrenceFromNow.
- [x] Seletor de recorrência replicado no editor inline do Kanban (TaskBoard) importando de `recurrence.ts`.
- [x] `getNextOccurrence` no taskStore atualizado para suportar `odd_days` e `even_days`.
- [x] Reagendamento automático de `due_at` ao mudar regra de recorrência no modal da Agenda.
- [x] Bug 1 (sync): LWW update → loop infinito corrigido — mutation descartada silenciosamente quando servidor mais novo que `baseUpdatedAt`.
- [x] Bug 2 (sync): race condition em `fetchRemoteTasks` paralelos corrigido com flag module-level `isFetchingRemote`.
- [x] Bug 3 (sync): Realtime não reconectava após background — corrigido com callback de status correto no `.subscribe()` da API Supabase JS v2 (substituiu `.on('system', ...)` inválido).
- [x] Bug 4 (sync): clock skew no INSERT corrigido — `stripReadonlyTaskFields` aplicado também no INSERT + migration `0009` com trigger `BEFORE INSERT` aplicada no Supabase em produção (06/06/2026).
- [x] Bug 5 (sync): delete LWW → loop infinito corrigido — zero rows num delete descarta mutation silenciosamente com `removeMutation + continue`.
- [x] Recorrência server-authoritative: índice único parcial `idx_unique_live_recurrence(user_id, recurrence_origin_id)` bloqueia duplicatas no banco; `recurrence_origin_id` aponta sempre para a raiz estável (self-reference); `23505` tratado como conflito esperado sem retry; `deduplicateFunctionalTasks` removido. Migrations `0010`, `0011`, `0012` aplicadas em produção (07/06/2026).
- [x] Energia sincronizada: colunas `current_energy`, `active_context`, `energy_updated_at` adicionadas a `profiles`; `contextStore` persiste `energyUpdatedAt`; `fetchProfileFromCloud` e `pushEnergyToCloud` com LWW estrito; debounce 800ms no push; trigger `trg_profiles_energy_lww` fecha janela de corrida de rede.
- [x] Diagnóstico e correção de regressão de sync: `profiles` isolado do ciclo de tasks; conflito `23505` de recorrência limpa a cópia local rejeitada e refaz pull remoto.
- [x] Bug tarefa-zumbi corrigido: `fetchRemoteTasks` agora usa `pendingTaskIds` para decidir merge — tasks com mutation pendente mantêm a versão local (evita ressurreição por clock skew); tasks sem mutation pendente aceitam sempre o servidor; tasks locais ausentes no remoto sem mutation são descartadas (deletadas em outro device).
- [x] Optimistic locking por `version` no push: coluna `version integer NOT NULL DEFAULT 1` adicionada a `tasks`; `set_updated_at()` estendida com `NEW.version = OLD.version + 1`; `set_timestamps_on_insert()` fixa `version = 1`; guard `.eq('version', baseVersion)` substitui `.lte('updated_at')` em `processSyncQueue`; fallback para mutations órfãs sem `baseVersion`. Migration `0013` pronta para aplicar.
- [x] Auditoria de design hard-level implementada: login Direction B, linguagem operacional, remoção de emojis, toasts, EmptyState, aba Hoje orientada por Agora/Top 1, concluídas colapsadas, checkbox concluir, swipe concluir/adiar, capture bar no Hoje com `visualViewport`.
- [x] Ajustes P1/P2 aplicados: captura direta para tarefa única, estimativas em paralelo, Painel em PT-BR, cores semânticas quentes, Saúde afastado de CCB, Dashboard sem gráfico duplicado, Agenda com scroll em contêiner, lint limpo.
- [x] Agenda mobile refinada com card compacto, conclusão por bolinha, edição por lápis e gestos laterais para adiar/excluir com confirmação.
- [x] Desktop da Agenda ajustado para separar o layout operacional dos cards do padrão mobile por gestos.
- [x] Design system de cores premium aplicado no escopo da rodada: tokens globais, Agenda, tab bar e slider de energia.
- [x] Agenda mobile ajustada para renderizar cards completos em slots com múltiplas tarefas e títulos longos.
- [x] Folga vertical da Agenda mobile reduzida mantendo proteção contra corte de cards.
- [x] Dashboard migrado para tokens neutros com paleta categórica controlada nos contextos.
- [x] Bordas dos cards da Agenda preservadas em desktop e mobile com altura natural dos slots.

---

# Próximo passo concreto

Aplicar `0013` no SQL Editor, se ainda não foi aplicada → publicar (`vercel --prod`) → validar em celular real:
1. Concluir uma tarefa no celular → no PC ela deve sumir (não ressuscitar) dentro de 30s.
2. Editar a mesma tarefa nos dois devices quase ao mesmo tempo → segundo push descartado silenciosamente (log: "LWW conflict … version/updated_at divergente"), sem híbrido nem loop de retry.
3. Concluir tarefa recorrente em dois devices → sobra uma próxima ocorrência (não duas).
4. Mudar energia num device → o outro reflete em até 30s.
5. Criar tarefa offline → aparece no outro device após reconectar, sem duplicata.
6. Abrir Hoje em viewport pequena → ver bloco Agora, captura acima do teclado, checkbox concluindo e swipe funcionando.
7. Abrir Agenda/Painel → confirmar ausência da capture bar fixa e navegação inferior sem sobreposição.

---

# Bloqueios em aberto

Nenhum bloqueio em aberto.

---

# Histórico de sprints concluídos

- Sprint 1 — Fundação (concluído em 2026-05-23)
- Sprint 2 — CRUD + Parser (concluído em 2026-05-24)
- Sprint 3 — Ranking Engine (concluído em 2026-05-24)
- Sprint 4 — Briefing + UX (concluído em 2026-05-24)
- Sprint 5 — Sync + Hardening (concluído em 2026-05-24)
- Sprint 6 — Uso Real (encurtado, concluído em 2026-05-24)
- Sprint 7 — Trilha da Inteligência v1.1+ (concluído em 2026-05-24)
- Sprint 8 — Uso Real IA (concluído em 2026-05-24)
- Sprint 11 — Transformação em PWA Instalável (concluído em 2026-05-24)
- Sprint 14 — Dashboard Analítico Avançado (concluído em 2026-05-24)
- Sprint 15 — Automações de Recorrência (concluído em 2026-05-24)
- Sprint 16 — Calendário Mensal e Agenda (concluído em 2026-05-24)
- Sprint 17 — Mega-Refinamento de UX, Parser Offline e Grid Diário (concluído em 2026-05-24)
- Sprint 18 — Auditoria e Hardening UX Mobile-First (concluído em 2026-05-25)
