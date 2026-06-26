# SPRINT_LOG.md — SecretárioTask

Última revisão: 2026-05-12
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
- Nenhum push ou commit foi feito.

## Arquivos alterados
- `STATUS.md`
- `SPRINT_LOG.md`

## Validações executadas
- `npm ci`: passou.
- `npm run lint`: passou.
- `npm run build`: passou.

## Bugs ou achados
- A árvore Git já estava suja antes das alterações deste sprint: `AGENTS.md` modificado e `docs/` não rastreado.
- `npm ci` reportou 2 vulnerabilidades no audit (1 low, 1 high). Correção não aplicada por estar fora do escopo do Sprint 0.
- `npm run build` reportou aviso de chunk maior que 500 kB. Build permaneceu verde.
- `updated_at` ainda alimenta conclusão em `behaviorEngine.ts` e em blocos do `DashboardView.tsx`, exatamente o alvo do Sprint 1.

## Decisões tomadas
- Nenhuma decisão nova de arquitetura/produto foi tomada neste sprint.
- A árvore suja pré-existente foi preservada e registrada como condição de baseline.

## Pendências
- Aplicar o Sprint 1 para conter imediatamente a sugestão comportamental e rotular métricas derivadas de `updated_at`.
- Avaliar vulnerabilidades de dependências em sprint próprio ou manutenção dedicada, sem `npm audit fix` automático.
- Confirmar operacionalmente se a migration `0013` já foi aplicada no Supabase remoto, conforme pendência anterior do `STATUS.md`.

## Resultado
Sprint 0 concluído com lint/build verdes e baseline registrada.

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
