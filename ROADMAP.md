# ROADMAP.md — SecretárioTask

Última revisão: 2026-06-27
Linha de base oficial: MVP enxuto
Duração sugerida por sprint: 1–2 semanas

---

# Objetivo do Roadmap

Definir a evolução oficial do MVP do SecretárioTask de forma:
- incremental
- previsível
- operacionalmente sustentável
- alinhada à filosofia de simplicidade do produto

O roadmap prioriza:
- estabilidade
- uso diário real
- baixo custo operacional
- previsibilidade arquitetural

---

# Evolução Coach de Produtividade

## Sprint 0 — Baseline e congelamento de referência
Status: concluído em 2026-06-26.

## Sprint 1 — Fase 0: Contenção imediata
Status: concluído em 2026-06-26.

Entregas:
- Sugestão comportamental desativada enquanto depender de `updated_at`.
- Dashboard rotulado para deixar explícitas as aproximações por data de edição.
- `behaviorEngine.ts` congelado até a introdução de `completed_at`.
- Nenhuma migration, schema, sync ou `TaskStatus` alterado.

## Sprint 2 — Fase 1A: Timestamp honesto mínimo
Status: concluído em 2026-06-26.

Entregas:
- Migration `0014_completed_at.sql` com `completed_at` e `completed_at_confidence`.
- Backfill de tarefas antigas `done` como `legacy_approx`.
- Novas conclusões gravam `completed_at_confidence='confirmed'`.
- Dashboard temporal usa `completed_at` confirmado, não `updated_at`.
- `TASK_COLUMNS` e tipos TypeScript atualizados.

## Sprint 3 — Fase 1B: Semântica de resolução
Status: concluído em 2026-06-26.

Entregas:
- Migration `0015_resolution_semantics.sql` com `resolution_type` e `resolved_at`.
- Backfill de tarefas `done` como `resolution_type='completed'`.
- Cancelada, delegada e obsoleta modeladas sem `deleted_at` e sem `completed_at`.
- Helper compartilhado para tarefa ativa/aberta aplicado em listas operacionais.
- Ações mínimas de resolução no Kanban e na Agenda.
- Recorrência preservada: resoluções sem execução não bloqueiam próxima ocorrência viva.

## Sprint 4 — Fase 1C: Eventos confiáveis server-stamped
Status: concluído em 2026-06-26.

Entregas:
- Migration `0016_task_events_expand_stamp.sql`.
- CHECK de `task_events.type` ampliado para eventos operacionais.
- Trigger server-side força `task_events.created_at=now()`.
- Cliente não envia mais `created_at` em eventos.
- Eventos `started`, `completed`, `reopened`, `postponed` e `resolved` emitidos como best-effort.
- Fluxos principais permanecem não-bloqueados por falha de evento.

## Sprint 5 — Fase 1D: Origem dos dados e governança de campos
Status: concluído em 2026-06-26.

Entregas:
- Migration `0017_data_source_fields.sql`.
- Campos `estimated_minutes_source` e `actual_minutes_source` adicionados a `tasks`.
- Estimativas novas passam a identificar origem `ai`, `default_30`, `parser` ou `manual`.
- Tempos reais derivados de `started_at` passam a identificar origem `timer`.
- Backfill preserva tempos existentes: estimativas legadas ficam sem inferência artificial; tempos reais legados são `timer` quando há `started_at`, ou `unknown` sem âncora.
- `TASK_COLUMNS` e tipos TypeScript atualizados.
- Nenhum diagnóstico comportamental foi criado.

## Sprint 6 — Fase 2: Ajustes nos fluxos existentes
Status: concluído em 2026-06-26.

Entregas:
- Migration `0018_postpone_blocker_type.sql`.
- Campo opcional `blocker_type` adicionado a `tasks`.
- Reabertura limpa remove conclusão/resolução/timer atuais e emite `reopened` best-effort.
- Timer aberto por mais de 8 horas deixa de ser tratado como tempo confiável e passa a receber `actual_minutes_source='unknown'`.
- Adiamento continua sem fricção, mas pode receber motivo opcional.
- Eventos de adiamento carregam `blocker_type` no payload quando informado.
- Nenhum diagnóstico comportamental foi criado.

## Sprint 7 — Fase 3A: Dashboard confiável mínimo
Status: concluído em 2026-06-26.

Entregas:
- Dashboard separado por conclusões confirmadas, histórico aproximado e dados incompletos.
- Semana, hoje e horário de pico usam somente `completed_at` confirmado.
- Encerradas sem execução aparecem fora de produtividade/conclusão.
- Fila ativa separa abertas executáveis de aguardando/bloqueadas/adiadas.
- Adiamentos com motivo e sem motivo informado aparecem como qualidade de dado.
- Estimado vs. real exclui tempo real de baixa confiança do gráfico e o rotula separadamente.
- Qualidade do dado é textual e segmentada, sem score único.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Sprint 8 — Fase 4: Motor determinístico testável
Status: concluído em 2026-06-26.

Entregas:
- Motor puro `src/lib/coachSignals.ts`.
- Entrada explícita por `tasks`, `events` e `now`.
- Sinais objetivos de qualidade do dado, adiamentos, bloqueios, encerramentos sem execução, reaberturas e diferença estimado vs. real confiável.
- Fixtures pequenas e determinísticas em `scripts/coachSignals.fixtures.ts`.
- Script `npm run test` sem dependência nova.
- Nenhum diagnóstico psicológico, score único, IA, rede, Supabase ou localStorage no motor.
- Nenhuma migration foi criada.

## Sprint 9 — Fase 5A: Governança da IA existente
Status: concluído em 2026-06-26.

Entregas:
- Inventário das rotas de IA existentes: estimativa, parser inteligente, embedding, briefing e transcrição.
- Camada `src/lib/coachAIGuardrails.ts` com payload governado, prompt seguro, contrato de saída e sanitização.
- Briefing passa a consumir sinais determinísticos do Sprint 8 por payload mínimo, sem histórico bruto completo.
- `updated_at` não é enviado como evidência de conclusão.
- `legacy_approx`, `actual_minutes_source='unknown'` e encerradas sem execução aparecem como limitações de confiança.
- Termos proibidos e linguagem diagnóstica são bloqueados com fallback determinístico.
- `BehavioralSuggestion` permanece desativado.
- Nenhuma migration foi criada.

## Sprint 10 — Fase 5B: IA narrativa cacheada e segura
Status: concluído em 2026-06-26.

Entregas:
- Cache local em memória para briefing com IA governada.
- `input_hash` determinístico baseado em versões, energia, janela temporal, top tasks governadas, sinais e limitações.
- Prompt versionado por `COACH_AI_PROMPT_VERSION`.
- Guardrails versionados por `COACH_AI_GUARDRAILS_VERSION`.
- Cache hit evita rechamar a IA para a mesma entrada semântica.
- Cache miss chama IA, valida a resposta e armazena apenas narrativa final segura.
- Fallback seguro não é cacheado como resposta válida.
- `updated_at` não influencia conclusão nem hash semântico.
- Nenhuma migration foi criada.

## Sprint 11 — Auditoria final, hardening e documentação de fechamento
Status: concluído em 2026-06-26.

Entregas:
- Varreduras finais por `updated_at`, `deleted_at`, IA diagnóstica, contratos de sync, eventos, tempos, Dashboard, motor determinístico e cache.
- Checklist global de aceitação marcado em `SPRINT_LOG.md`.
- Documentação final alinhada em `STATUS.md`, `SPRINT_LOG.md`, `ROADMAP.md`, `DECISIONS.md`, `ARCHITECTURE.md` e `PRD.md`.
- Nenhuma violação estrutural encontrada.
- Nenhuma migration foi criada.

## Sprint 12-A — Hotfix pós-auditoria
Status: concluído em 2026-06-27.

Entregas:
- "Conclusões por área" mantém histórico aproximado no agregado de volume, com rótulo explícito abaixo do título.
- `npm audit fix` aplicado; audit final sem vulnerabilidades.
- Log de PWA em produção trocado de `console.log` para `console.debug`.
- Nenhuma migration e nenhum comando Supabase.

## Próximo passo
Sprint 12-B — Housekeeping pós-auditoria, sem adiantar novas features.

---

# Sprint 1 — Fundação

## Objetivo
Estabelecer a base técnica do projeto com autenticação, persistência inicial, gerenciamento de estado, captura offline simples e schema completo do banco.

## Entregas concretas
- Scaffold React 19 + Vite 6 + TypeScript 5
- Tailwind CSS 3 configurado (com `tailwind.config.ts`)
- Integração inicial com Supabase (Supabase JS 2)
- `.env.example` versionado, `.env` no `.gitignore`
- `vercel.json` na raiz com rewrite SPA
- Fluxo de autenticação via e-mail e senha (signInWithPassword)
- Estrutura inicial de stores com Zustand 5
- Persistência local via `zustand/middleware/persist` (localStorage)
- Fila offline de mutações (`PendingMutation[]`) implementada no `taskStore`
- Geração de UUID no cliente via `crypto.randomUUID()`
- Schema do MVP aplicado integralmente:
  - `tasks` (com `due_at`, `deleted_at`, CHECK constraints em `priority` e `energy`)
  - `task_events` (com CHECK constraint em `type`)
  - `sync_log` (com trigger de imutabilidade)
- Trigger `updated_at` em `tasks`
- Políticas RLS aplicadas nas três tabelas
- Captura offline básica baseada em input simples
- Estrutura base de rotas (React Router 7)

## Observação
Não há tabelas `profiles` ou `user_settings` no MVP. O Supabase já fornece `auth.users` com os dados básicos do usuário. Preferências locais (contexto ativo, energia atual) são persistidas via Zustand em localStorage.

A `sync_log` é criada já no Sprint 1, mas seu uso operacional (LWW, retry, observabilidade) só é implementado no Sprint 5.

## Fora do escopo
- CRUD avançado de tarefas
- Parser de linguagem natural
- IA ou LLM
- Embeddings
- Sincronização avançada
- Sistema de ranking
- Briefing automático

## Critério de conclusão
- Aplicação inicia corretamente
- Login funcional (e-mail e senha)
- Banco conectado, três tabelas aplicadas com constraints e triggers
- Persistência local funcional
- Estrutura base operacional pronta
- `vercel.json` em produção respondendo a rotas profundas

---

# Sprint 2 — CRUD + Parser

## Objetivo
Implementar o fluxo operacional principal de tarefas com parser determinístico local.

## Entregas concretas
- CRUD completo de tarefas
- Edição de tarefas
- Exclusão de tarefas via soft delete (marcando `deleted_at`)
- Todas as queries filtrando `WHERE deleted_at IS NULL`
- Parser local determinístico baseado em regras
  - identifica `priority`
  - identifica `context`
  - identifica `due_at` (datas relativas e horários)
- Board simples de visualização
- Troca de contexto operacional
- Interpretação básica de prioridade e contexto

## Fora do escopo
- IA generativa
- Embeddings
- Recomendação automática baseada em ML
- Parsing semântico

## Critério de conclusão
- Usuário consegue criar, editar e remover tarefas
- Soft delete funcional (tarefas excluídas não aparecem nas listagens)
- Parser interpreta entradas previsivelmente, incluindo `due_at`
- Board operacional funcional

---

# Sprint 3 — Ranking Engine

## Objetivo
Criar um sistema de priorização totalmente determinístico e transparente, integrando o `due_at` e a energia disponível do usuário.

## Entregas concretas
- Ranking determinístico baseado em regras explícitas
- `f_urgency` combinando `priority` e proximidade de `due_at`
- `f_energy` calculada por proximidade entre energia da tarefa e energia disponível (`contextStore.energiaAtual`)
- `f_age` limitada a 30 dias
- `f_context` binária (1 quando contexto da tarefa = contexto ativo)
- Score final entre 0 e 1
- Priorização previsível de tarefas
- Recomendações transparentes e auditáveis
- Critérios configuráveis de priorização
- Ordenação consistente de tarefas

## Observação
O termo "Ranking Engine" é utilizado no lugar de "Recommendation Engine" para evitar associação com machine learning ou IA.

Toda priorização desta etapa é baseada exclusivamente em regras determinísticas. A fórmula completa está em `ARCHITECTURE.md`.

## Critério de conclusão
- Ranking reproduzível (mesma entrada → mesmo score)
- Critérios auditáveis (cada fator inspecionável separadamente)
- Ordenação consistente entre execuções
- `f_energy` reflete corretamente o estado do usuário (testar com energiaAtual variando)

---

# Sprint 4 — Briefing + UX

## Objetivo
Melhorar a experiência operacional e consolidar os briefings automáticos determinísticos.

## Entregas concretas
- Briefing determinístico diário (aplicando `ranking.ts`)
- Throttling de eventos `viewed`: no máximo 1 por tarefa por dia
- Refinos de UX
- Melhorias operacionais
- Ajustes de navegação
- Feedback visual de prioridades
- Refinos de fluxo de captura

## Fora do escopo
- Assistente conversacional
- IA contextual
- Automação inteligente
- Briefing baseado em LLM

## Critério de conclusão
- Briefing previsível e funcional
- `task_events` não infla com `viewed` duplicado
- Fluxo operacional mais fluido
- Navegação consistente

---

# Sprint 5 — Sync + Hardening

## Objetivo
Adicionar sincronização básica, mecanismos mínimos de resiliência e endurecimento operacional. A tabela `sync_log` já existe desde o Sprint 1; este sprint trata do seu uso.

## Entregas concretas
- Estratégia de sincronização Last Write Wins (LWW) em nível de registro inteiro
- Consumo operacional da `sync_log`:
  - registrar entradas para cada mutação
  - atualizar `status`, `retry_count`, `last_error`, `synced_at`
  - confiar no trigger de imutabilidade
- Consumo da fila `PendingMutation[]` no `taskStore`
- Retry simples de requisições falhas
- Observabilidade mínima via `task_events`
- Tratamento básico de falhas offline/online
- Hardening operacional inicial
- Recuperação simples de sync

## Observação
A estratégia LWW deve ser documentada explicitamente para evitar ambiguidades futuras de sincronização. O risco aceito de perda de atualizações concorrentes em campos diferentes está descrito em `ARCHITECTURE.md` (CDP6).

Conflitos de delete-vs-update entre devices são mitigados pelo soft delete (`deleted_at`) já presente desde o Sprint 1.

## Critério de conclusão
- Sync básico funcional
- Retry operacional
- Sistema tolera falhas simples de conectividade
- Eventos mínimos auditáveis
- Trigger de imutabilidade protege campos não-operacionais de `sync_log`

---

# Sprint 6 — Uso Real

## Objetivo
Preparar o sistema para uso diário contínuo.

## Entregas concretas
- Correção de bugs
- Ajustes finais de UX
- Refinos de performance
- Estabilização operacional
- Uso real contínuo
- Validação prática do fluxo principal
- Ajustes baseados em uso diário

## Critério de conclusão
- Sistema utilizável diariamente
- Bugs críticos resolvidos
- Performance operacional aceitável
- Fluxo principal estável

---

# Pós-MVP (v1.1+)

## Possíveis evoluções futuras
- Integração com LLM
- Embeddings
- Busca semântica
- Notificações push
- Geofencing
- Voice capture
- Outbox avançada
- Automações
- Sync avançado (resolução fina de conflitos)
- Sugestões inteligentes
- Dashboard analítico
- Análise comportamental
- Briefing inteligente
- Tabelas `profiles` e `user_settings` (caso surja necessidade de dados de perfil compartilhados entre dispositivos)
- Migração de persistência local para IndexedDB
- Migração para Tailwind 4 (paradigma CSS-first)
- Conversão de `task_events.type` para ENUM PostgreSQL (caso a lista estabilize)
- Conversão de `sync_log.entity_type` para ENUM (quando outras entidades passarem a sincronizar)
- Remover estado `dismissedBreaks` e botão "Ignorar pausa" (legado inativo)

---

# Diretriz Oficial de Evolução

Nenhuma funcionalidade pós-MVP deve ser implementada antes que:
- o fluxo principal esteja estável
- o uso diário seja validado
- os custos operacionais estejam controlados
- o sistema seja previsível e simples de manter

A evolução do produto deve preservar:
- simplicidade
- previsibilidade
- baixo custo
- transparência operacional
