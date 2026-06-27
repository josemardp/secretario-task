# ARCHITECTURE.md — SecretárioTask

Última revisão: 2026-05-12
Status: MVP enxuto alinhado ao PRD, com correções da auditoria de 2026-05-12

---

# Nota arquitetural — Agenda/Timeline only (2026-06-27)

- A lógica compartilhada de ciclo de vida de tarefa vive em `src/lib/taskLifecycle.ts`.
- `buildCompleteUpdates` centraliza conclusão confirmada, `resolution_type='completed'`, `resolved_at` e compatibilidade defensiva com `started_at` legado.
- `buildResolutionUpdates` centraliza encerramentos sem execução (`cancelled`, `delegated`, `obsolete`) sem usar `deleted_at` e sem preencher `completed_at`.
- Reabertura continua em `src/lib/timeTracking.ts` via `buildReopenUpdates`.
- A Agenda/Timeline é a única view operacional; o Painel/Dashboard permanece como view analítica.
- A timeline principal da Agenda mostra somente tarefas abertas/executáveis.
- Tarefas concluídas, canceladas, delegadas e obsoletas aparecem na seção secundária "Resolvidas neste dia", calculada por `getResolvedTasksForDate` em `src/lib/taskFilters.ts`.
- Resolvidas do dia usam `completed_at` para concluídas e `resolved_at` para encerradas sem execução; `updated_at` não é usado para conclusão.
- A seção de resolvidas abre o mesmo modal da Agenda e mantém a ação "Reabrir" acessível via `buildReopenUpdates`.
- A captura rápida fica no `Home.tsx` e aparece na Agenda, preservando parser, IA opcional e `estimated_minutes_source`.
- O FocoSheet permanece como orientação/briefing/top tarefas, mas não oferece ação nova de iniciar timer, não escreve `started_at` nem emite evento `started`.
- O Dashboard preserva histórico de tempo real, mas apresenta "Qualidade dos registros de tempo" em contadores agregados, sem comparar estimado vs. real como métrica ativa.
- Os campos `started_at`, `actual_minutes` e `actual_minutes_source` permanecem no schema para histórico e compatibilidade; timer não deve voltar como entrada nova sem decisão explícita.
- `@dnd-kit` foi removido porque não há uso em `src` após a retirada do Kanban.

---

# Objetivo

Definir a arquitetura oficial do MVP do SecretárioTask.

## Princípios arquiteturais
- simplicidade
- previsibilidade
- baixo custo operacional
- stack dominada
- evolução incremental
- debugging rápido

---

# Stack Oficial

## Frontend
- React 19
- Vite 6
- TypeScript 5
- Tailwind CSS 3 (com `tailwind.config.ts`)
- React Router 7

## Gerenciamento de estado
- Zustand 5

## Backend
- Supabase (Supabase JS 2)

## Banco de dados
- PostgreSQL (gerenciado pelo Supabase)

## Deploy
- Vercel

## Observação sobre versões
Versões fixadas para preservar previsibilidade. Tailwind 4 mudou drasticamente o paradigma de configuração (CSS-first) e fica reservado para revisão pós-MVP. Atualizações de versão devem ser registradas em `DECISIONS.md`.

---

# Estratégia do MVP

O MVP deve:
- funcionar parcialmente offline
- capturar tarefas rapidamente
- priorizar tarefas de forma determinística
- sincronizar de forma simples
- manter baixo custo operacional

O MVP NÃO deve:
- depender de LLM
- utilizar embeddings
- possuir busca semântica
- implementar automações complexas
- introduzir infraestrutura distribuída desnecessária

---

# Estrutura Geral

Frontend SPA
↓
Stores Zustand (com persist em localStorage)
↓
Supabase Client
↓
PostgreSQL + Auth + RLS

---

# Autenticação

## Método oficial
E-mail e senha via Supabase Auth: `supabase.auth.signInWithPassword({ email, password })`.

## Fluxo
1. Usuário insere e-mail e senha na tela de login
2. Supabase valida as credenciais e estabelece a sessão
3. Sessão é gerenciada exclusivamente pelo Supabase Client

## Regras
- não copiar tokens manualmente para `localStorage`
- não copiar tokens manualmente para `sessionStorage`
- não expor tokens em logs
- `authStore` não é persistida (sessão vive em memória, gerenciada pelo Supabase Client)

## Justificativa
- usuário único do MVP é o próprio dev
- senha é mais ágil: não depende de chegada de e-mail, alinhado com P1 (execução acima de tudo)
- Supabase configurado: Email provider habilitado, Confirm email ON
- migração para multi-usuário no pós-MVP é trivial

---

# Banco de Dados

## Enum de Contexto

Padrão oficial:

```sql
CREATE TYPE context_type AS ENUM (
  'PM',
  'Esdra',
  'Pessoal',
  'Familia',
  'CCB',
  'Estudo',
  'Saude'
);
```

## Regras obrigatórias
- utilizar sempre `Estudo` no singular
- todos os documentos devem seguir exatamente este padrão
- não criar novos contextos no MVP sem decisão registrada em `DECISIONS.md`

---

## Enum de Status

Padrão oficial:

```sql
CREATE TYPE task_status AS ENUM (
  'todo',
  'doing',
  'done'
);
```

---

## Tabela `tasks`

```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  context context_type NOT NULL,
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  energy INTEGER DEFAULT 0 CHECK (energy BETWEEN 0 AND 10),
  status task_status DEFAULT 'todo',
  due_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  completed_at_confidence TEXT CHECK (
    completed_at_confidence IN ('confirmed', 'legacy_approx')
  ),
  resolution_type TEXT CHECK (
    resolution_type IN ('completed', 'cancelled', 'delegated', 'obsolete')
  ),
  resolved_at TIMESTAMPTZ,
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  estimated_minutes_source TEXT CHECK (
    estimated_minutes_source IN ('default_30', 'manual', 'ai', 'parser')
  ),
  actual_minutes_source TEXT CHECK (
    actual_minutes_source IN ('timer', 'manual', 'retroactive', 'unknown')
  ),
  blocker_type TEXT CHECK (
    blocker_type IN ('waiting_third_party', 'no_time', 'priority_changed', 'needs_split', 'dependency')
  ),
  started_at TIMESTAMPTZ,
  recurrence_rule TEXT,
  recurrence_origin_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  postponed_count INTEGER DEFAULT 0,
  version INTEGER NOT NULL DEFAULT 1
);
```

## Geração de IDs
- IDs são gerados no cliente via `crypto.randomUUID()` antes de inserir
- o `DEFAULT gen_random_uuid()` permanece como fallback apenas para inserts via dashboard Supabase
- justificativa: estratégia offline-first exige ID estável antes do sync (ver `DECISIONS.md`)

## Escala dos campos numéricos
- `priority`: 0–10 (CHECK constraint aplicada)
  - 0 = sem prioridade
  - 10 = prioridade máxima

- `energy`: 0–10 (CHECK constraint aplicada)
  - 0 = sem exigência de energia
  - 10 = máxima exigência de energia

## Campo `due_at`
- TIMESTAMPTZ nullable
- preenchido pelo parser quando expressões temporais forem detectadas ("amanhã", "hoje", "14h", etc)
- usado pelo `f_urgency` no ranking e pelo briefing diário

## Campo `deleted_at`
- TIMESTAMPTZ nullable
- soft delete: exclusões marcam este campo em vez de remover o registro
- todas as queries do MVP devem filtrar `WHERE deleted_at IS NULL`
- previne "ressurreição" de registros em conflitos LWW (delete em um device + edit em outro)

## Campos `created_at` e `updated_at`

`created_at` registra a criação original da tarefa e é imutável. `updated_at` é atualizado automaticamente pelo banco a cada `UPDATE`. O cliente pode preencher ambos ao criar tarefa localmente para suportar offline imediato, mas nunca envia `created_at` nem `updated_at` em payloads de `UPDATE`.

## Campos `completed_at` e `completed_at_confidence`

`completed_at` registra a conclusão da tarefa e é preenchido somente na primeira transição real para `status='done'`. Edições posteriores não alteram esse campo.

`completed_at_confidence` indica a qualidade do timestamp:
- `confirmed`: conclusão nova gravada no momento da transição para `done`.
- `legacy_approx`: dado legado criado por backfill usando `updated_at` como aproximação explícita.

O backfill da migration `0014_completed_at.sql` marca tarefas antigas `status='done'` como `legacy_approx`. Esse dado pode apoiar contagens históricas, mas não deve alimentar métricas finas de horário ou padrão comportamental.

`updated_at` permanece apenas como timestamp técnico de edição/sync, nunca como conclusão.

## Campos `resolution_type` e `resolved_at`

`resolution_type` descreve por que uma tarefa deixou de estar aberta:
- `completed`: a tarefa foi executada.
- `cancelled`: a tarefa foi cancelada sem execução.
- `delegated`: a tarefa foi delegada sem execução.
- `obsolete`: a tarefa ficou obsoleta sem execução.

`resolved_at` registra quando a resolução foi definida.

Toda conclusão é uma resolução: quando `resolution_type='completed'`, `resolved_at` deve acompanhar `completed_at`.

Nem toda resolução é conclusão: quando `resolution_type` é `cancelled`, `delegated` ou `obsolete`, `completed_at` permanece `NULL` e a tarefa sai das listas operacionais por filtro semântico, não por `deleted_at`.

`deleted_at` continua reservado exclusivamente para exclusão/remoção. Ele não deve ser usado para cancelar, delegar ou marcar uma tarefa como obsoleta.

## Campos `estimated_minutes_source` e `actual_minutes_source`

`estimated_minutes_source` registra a procedência de `estimated_minutes`:
- `default_30`: fallback determinístico fixo de 30 minutos.
- `manual`: alteração manual feita pelo usuário em UI existente.
- `ai`: estimativa retornada por `estimateTaskTime`.
- `parser`: estimativa extraída por parser determinístico, quando houver fluxo para isso.

`actual_minutes_source` registra a procedência de `actual_minutes`:
- `timer`: cálculo derivado de `started_at`.
- `manual`: lançamento manual de tempo real, quando houver fluxo para isso.
- `retroactive`: lançamento posterior de tempo real, quando houver fluxo para isso.
- `unknown`: dado existente ou futuro cuja origem não é confiável.

Dados legados de `estimated_minutes` permanecem com origem `NULL` quando não é possível distinguir IA, default ou edição manual. Dados legados de `actual_minutes` são marcados como `timer` quando possuem `started_at`, ou `unknown` quando não há âncora suficiente.

Esses campos são metadados de confiabilidade. Eles não alteram `TaskStatus`, não acionam diagnóstico comportamental e não devem ser exibidos como score.

Ao concluir uma tarefa com `started_at`, o cliente calcula `actual_minutes`. Se o timer aberto ultrapassar 8 horas, o valor é preservado, mas `actual_minutes_source` passa a ser `unknown`, sinalizando dado suspeito para leituras futuras.

## Campo `blocker_type`

`blocker_type` registra o motivo opcional do adiamento:
- `waiting_third_party`: aguardando terceiro.
- `no_time`: sem tempo.
- `priority_changed`: prioridade mudou.
- `needs_split`: precisa dividir.
- `dependency`: depende de outra ação.

Adiamentos sem motivo continuam válidos e ficam com `blocker_type=NULL`. Isso preserva baixo atrito e permite identificar dado incompleto sem bloquear captura ou reagendamento.

## Reabertura limpa

Reabrir tarefa concluída ou encerrada sem execução limpa a resolução corrente:
- `completed_at=NULL`
- `completed_at_confidence=NULL`
- `resolution_type=NULL`
- `resolved_at=NULL`
- `started_at=NULL`
- `actual_minutes=NULL`
- `actual_minutes_source=NULL`

Eventos antigos em `task_events` permanecem preservados; a reabertura adiciona um novo evento `reopened` best-effort.

A regra única de reabertura vive em `src/lib/timeTracking.ts` como `buildReopenUpdates`. Na Agenda, o modal de edição de tarefas `done` reabre para `todo` e emite `reopened` como evento best-effort com origem `timeline`.

## Regimes de dado no Dashboard

O Dashboard separa leitura operacional de qualidade do dado:
- Conclusões confirmadas: `resolution_type='completed'`, `completed_at` preenchido e `completed_at_confidence='confirmed'`. Alimentam semana, hoje e horário de pico.
- Histórico aproximado: `completed_at_confidence='legacy_approx'`. Pode aparecer em contagem agregada rotulada, mas não alimenta métricas de horário.
- Encerradas sem execução: `resolution_type IN ('cancelled','delegated','obsolete')`. São vazão de encerramento, não conclusão.
- Fila ativa executável: tarefas abertas por `isOpenTask` sem bloqueio ou adiamento informado.
- Aguardando/bloqueadas/adiadas: tarefas abertas com `blocker_type` ou `postponed_count > 0`.
- Qualidade do dado: contagens textuais de fontes de estimativa e tempo real, incluindo tempo real `unknown` como baixa confiança.

Esses blocos não formam score de produtividade. Eles apenas declaram a confiabilidade e a composição dos dados exibidos.

## Motor determinístico do Coach

O motor determinístico fica em `src/lib/coachSignals.ts`.

Contrato principal:

```ts
analyzeCoachSignals({ tasks, events, now })
```

Regras:
- recebe dados por parâmetro;
- recebe `now` por parâmetro;
- não chama Supabase;
- não acessa localStorage;
- não depende de UI;
- não chama IA;
- não usa aleatoriedade;
- não usa `Date.now()` na lógica central;
- não lê `updated_at` como conclusão.

As saídas são sinais operacionais objetivos:
- `signal_id`;
- severidade simples (`info`, `warning`, `critical`);
- título;
- descrição;
- evidências;
- confiança do sinal;
- recomendação operacional;
- campos que reduzem a confiança.

O motor não produz score global de produtividade e não faz diagnóstico psicológico.

Sinais atuais:
- baixa quantidade de conclusões confirmadas;
- histórico aproximado presente;
- adiamentos sem motivo informado;
- tempo real com origem desconhecida;
- excesso de estimativas `default_30`;
- proporção relevante de encerradas sem execução;
- bloqueios recorrentes por tipo;
- diferença relevante entre estimado e real somente em dados confiáveis;
- reaberturas registradas em eventos;
- baixa qualidade agregada do dado.

Fixtures ficam em `scripts/coachSignals.fixtures.ts` e são executadas por `npm run test`, usando apenas `tsc` e `node`, sem runner externo.

## Governança da IA existente

A IA do Coach é opcional, não-bloqueante e não possui autoridade para originar diagnóstico, score, `resolution_type` ou `blocker_type`.

Camada principal:

```ts
buildGovernedCoachAIPayload({ topTasks, allTasks, energy, now })
buildGovernedCoachPrompt(payload)
parseGovernedCoachAIResponse(rawText, payload)
buildDeterministicCoachNarrative(payload)
resolveCachedCoachNarrative(payload, createNarrative)
buildCoachAIInputHash(payload)
```

O payload governado contém:
- tarefas acionáveis mínimas do ranking, sem histórico bruto completo;
- sinais determinísticos produzidos por `analyzeCoachSignals`;
- limitações explícitas de confiabilidade;
- política de dado que proíbe `updated_at` como conclusão.

O payload não envia `updated_at` como evidência. O termo pode aparecer apenas na política de proibição enviada ao modelo.

Inventário de rotas de IA:
- `estimateTaskTime`: pode influenciar `estimated_minutes`; retorna origem `ai` quando a API responde de forma válida, ou `default_30` em fallback.
- `parseMultipleTasks`: pode inferir campos de captura como título, contexto, prioridade, energia, data e recorrência; em falha ou ausência de chave cai no parser determinístico.
- `generateEmbedding`: gera vetor para busca/sync semântico; no sync fica dentro de `try/catch` e não bloqueia a mutation principal.
- `generateSmartBriefing`: não escreve dados; narra payload governado e cai em narrativa determinística quando a API falha ou retorna linguagem proibida.
- `transcribeAudio`: transforma áudio em texto de captura; falha retorna `null` e não cria tarefa automaticamente.

Guardrails:
- `legacy_approx` é apresentado como limitação, não conclusão confirmada.
- `actual_minutes_source='unknown'` reduz confiança e não é tratado como tempo real confiável.
- `resolution_type IN ('cancelled','delegated','obsolete')` é encerramento sem execução, não produtividade.
- linguagem como "procrastinador", "desorganizado", "improdutivo", "perfil psicológico", "tendência comportamental" ou "diagnóstico" bloqueia a resposta da IA.
- `BehavioralSuggestion` permanece desativado.

## Cache e versionamento da narrativa IA

O briefing governado usa cache local em memória, implementado como `Map`, sem migration, Supabase ou `localStorage`. O cache vale apenas para a sessão atual do navegador; recarregar a página limpa as entradas.

Constantes de versão:

```ts
COACH_AI_PROMPT_VERSION = 'coach-briefing-v1'
COACH_AI_GUARDRAILS_VERSION = 'coach-guardrails-v1'
```

O `input_hash` é calculado em `buildCoachAIInputHash(payload)` com serialização estável e hash determinístico.

Entram no hash:
- `prompt_version`;
- `guardrails_version`;
- energia atual;
- janela temporal horária derivada de `generated_at`;
- top tasks governadas em ordem de ranking;
- sinais determinísticos ordenados por `signal_id`;
- limitações ordenadas.

Não entram no hash:
- `updated_at`;
- resposta da IA;
- chave de API;
- payload bruto completo;
- campos fora do contrato governado.

Fluxo:
- cache hit: retorna a narrativa final segura sem chamar IA;
- cache miss: chama IA com prompt versionado, valida/sanitiza e armazena apenas texto final seguro quando a origem é `ai`;
- fallback: falha de API, erro de rede, JSON inválido ou linguagem proibida retorna narrativa determinística e não é armazenada como resposta válida.

Alterar `COACH_AI_PROMPT_VERSION` ou `COACH_AI_GUARDRAILS_VERSION` invalida o cache anterior por mudar a chave.

## Estado final do Coach de Produtividade

Após o Sprint 11, o Coach de Produtividade fica fechado como uma camada honesta e auditável:
- conclusão usa `completed_at`, nunca `updated_at`;
- resolução sem execução usa `resolution_type`, nunca `deleted_at`;
- eventos operacionais são server-stamped e best-effort;
- origem de estimativa e tempo real fica marcada;
- Dashboard separa métricas confirmadas, histórico frágil e qualidade do dado;
- motor do Coach é determinístico, puro e testado por fixtures;
- IA é opcional, governada, cacheada por `input_hash` versionado e sem autoridade diagnóstica;
- `TaskStatus` permanece `todo | doing | done`;
- sync mantém `version` como guard principal de optimistic locking.

## Plano de manutenção futura

Antes de qualquer novo ciclo do Coach:
- rodar `npm run lint`, `npm run build` e `npm run test`;
- repetir as varreduras por `updated_at`, `deleted_at`, `resolution_type`, `actual_minutes_source`, `estimated_minutes_source`, `BehavioralSuggestion` e termos diagnósticos;
- não reativar `BehavioralSuggestion` sem gate explícito de qualidade de dado;
- não persistir cache/diagnóstico de IA sem decisão nova de produto e privacidade;
- abrir sprint dedicado para qualquer mudança de schema, sync, RLS ou semântica de diagnóstico.

## Campo `recurrence_origin_id`

- UUID nullable referenciando `tasks(id)` com `ON DELETE SET NULL`
- preenchido pelo cliente ao criar o clone da próxima ocorrência recorrente
- usado como guard local de idempotência para impedir clones repetidos da mesma tarefa-pai

## Trigger para `updated_at`

```sql
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER tasks_set_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

**Observação:** em bancos criados antes da migration `0007`, o trigger antigo `tasks_updated_at` é removido e substituído por `tasks_set_updated_at`.

## Índices recomendados

```sql
CREATE INDEX idx_tasks_user_context_status
ON tasks (user_id, context, status)
WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_user_due
ON tasks (user_id, due_at)
WHERE deleted_at IS NULL AND due_at IS NOT NULL;

CREATE INDEX idx_recurrence_origin
ON tasks (recurrence_origin_id)
WHERE recurrence_origin_id IS NOT NULL;

CREATE UNIQUE INDEX idx_unique_live_recurrence
ON tasks (user_id, recurrence_origin_id)
WHERE deleted_at IS NULL
  AND status <> 'done'
  AND recurrence_origin_id IS NOT NULL
  AND (
    resolution_type IS NULL
    OR resolution_type NOT IN ('cancelled', 'delegated', 'obsolete')
  );
```

Os índices parciais (`WHERE deleted_at IS NULL`) mantêm performance sem custo de armazenar registros excluídos.

O índice de recorrência considera "viva" apenas a ocorrência aberta de fato. Tarefas canceladas, delegadas ou obsoletas continuam no histórico, mas não bloqueiam a próxima ocorrência recorrente.

---

## Tabela `task_events`

```sql
CREATE TABLE task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (
    type IN (
      'created',
      'updated',
      'completed',
      'viewed',
      'started',
      'reopened',
      'postponed',
      'resolved'
    )
  ),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Tipos de evento válidos no MVP
- `created` — tarefa criada
- `updated` — tarefa atualizada
- `completed` — tarefa concluída
- `viewed` — tarefa visualizada no briefing
- `started` — tarefa iniciada
- `reopened` — tarefa reaberta por fluxo existente
- `postponed` — tarefa adiada
- `resolved` — tarefa encerrada sem execução

## Carimbo server-side

`task_events.created_at` é carimbado pelo servidor. A migration `0016_task_events_expand_stamp.sql` recria o CHECK de `type` como `task_events_type_check` e instala o trigger `task_events_set_created_at`, que executa `set_task_event_created_at()` em `BEFORE INSERT` para forçar `NEW.created_at = now()`.

O cliente não envia `created_at` para `task_events`. A camada de sync também remove esse campo de eventos antigos que ainda estejam na fila local, e o trigger protege contra clientes legados ou bugs futuros.

## Emissão best-effort

Eventos são observabilidade, não caminho crítico. A emissão deve ocorrer como mutação separada e não pode impedir captura, edição, conclusão, adiamento, resolução ou sync de tarefas. Falhas de enqueue/sync são registradas de forma segura e permanecem elegíveis a retry pela fila.

## Throttling de `viewed`
Eventos `viewed` devem ser registrados no máximo **uma vez por tarefa por dia**. Antes do insert, o cliente verifica se já existe `viewed` para essa `task_id` com `created_at >= início do dia atual`. Sem throttling, abrir o app várias vezes ao dia poluiria a tabela.

## Índices recomendados

```sql
CREATE INDEX idx_task_events_user_task
ON task_events (user_id, task_id);

CREATE INDEX idx_task_events_type_created
ON task_events (type, created_at DESC);
```

## Observação
A coluna `type` é `TEXT` com `CHECK` (em vez de ENUM PostgreSQL) para permitir adicionar novos tipos no pós-MVP via `ALTER TABLE ... DROP CONSTRAINT ... ADD CONSTRAINT` sem migração de ENUM. Novos tipos devem ser documentados neste arquivo antes de adicionados ao CHECK.

---

## Tabela `sync_log`

Aplicada no Sprint 1 junto com `tasks` e `task_events`. O uso operacional (LWW, retry, observabilidade) é implementado no Sprint 5.

```sql
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);
```

## Campos
- `entity_type`: tipo da entidade sincronizada (`'task'` ou `'task_event'` no MVP)
- `entity_id`: id da entidade referenciada
- `operation`: `'insert'`, `'update'`, `'delete'`
- `status`: `'pending'`, `'synced'`, `'failed'`
- `retry_count`: contador de tentativas de sincronização
- `last_error`: mensagem do último erro de sincronização
- `synced_at`: timestamp da sincronização bem-sucedida

## Ausência intencional de `updated_at`
A tabela não possui `updated_at`. O campo `synced_at` cumpre esse papel para o caso de uso real (saber quando o registro foi finalizado).

## Trigger de imutabilidade

Garante que apenas os campos operacionais (`status`, `retry_count`, `last_error`, `synced_at`) possam ser modificados após o insert:

```sql
CREATE OR REPLACE FUNCTION sync_log_protect_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id     IS DISTINCT FROM OLD.user_id     OR
     NEW.entity_type IS DISTINCT FROM OLD.entity_type OR
     NEW.entity_id   IS DISTINCT FROM OLD.entity_id   OR
     NEW.operation   IS DISTINCT FROM OLD.operation   OR
     NEW.created_at  IS DISTINCT FROM OLD.created_at  THEN
    RAISE EXCEPTION 'Campos imutáveis de sync_log não podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_log_protect_immutable_trigger
BEFORE UPDATE ON sync_log
FOR EACH ROW
EXECUTE FUNCTION sync_log_protect_immutable();
```

## Índice recomendado

```sql
CREATE INDEX idx_sync_log_user_status
ON sync_log (user_id, status);
```

## Observação
O `entity_type` permanece como `TEXT` no MVP por simplicidade. Pode ser convertido em enum quando outras entidades passarem a sincronizar (v1.1+).

---

## Tabela `profiles`

Adicionada no hardening de sync de 2026-05-26 para suportar a chave OpenAI compartilhada entre dispositivos sem persisti-la em localStorage.

```sql
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  openai_api_key text,
  updated_at timestamptz DEFAULT now()
);
```

## Observacao de seguranca
`profiles.openai_api_key` existe para compatibilidade com as funcionalidades de IA ja presentes no app. O cliente nao deve persistir esse valor em localStorage.

---

## Vocabulário de `operation`

O vocabulário `'insert' | 'update' | 'delete'` é compartilhado entre:
- `sync_log.operation` (banco)
- `PendingMutation.operation` (fila offline no `taskStore`)

Esse alinhamento evita tradução entre camadas. Ver detalhes em `DECISIONS.md`.

---

## Observabilidade mínima

A observabilidade do MVP é feita exclusivamente via tabela `task_events`.

Não existem tabelas dedicadas de telemetria avançada no MVP.

## Backlog técnico pós-MVP
- `llm_call_log` — reservada para futura integração com LLM
- `behavior_patterns` — reservada para futura análise comportamental

---

# Row Level Security (RLS)

## Habilitação obrigatória

```sql
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;
```

## Políticas — `tasks`

```sql
CREATE POLICY "users_select_own_tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);
```

**Observação:** mesmo com policy de DELETE definida, o cliente nunca executa DELETE no MVP. Exclusões são feitas via UPDATE em `deleted_at` (soft delete). A policy existe apenas como segurança em caso de operação administrativa.

## Políticas — `task_events`

```sql
CREATE POLICY "users_select_own_events" ON task_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_events" ON task_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

`task_events` é estritamente append-only: sem políticas de UPDATE ou DELETE.

## Políticas — `sync_log`

```sql
CREATE POLICY "users_select_own_sync_log" ON sync_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_sync_log" ON sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_sync_log" ON sync_log
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
```

`sync_log` permite UPDATE pelo próprio usuário, mas o trigger `sync_log_protect_immutable_trigger` (definido acima) restringe quais campos podem ser alterados. Sem política de DELETE: registros permanecem para auditoria.

## Políticas — `profiles`

```sql
CREATE POLICY "users can manage own profile"
  ON public.profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
```

`profiles` é restrita ao proprio usuario via `auth.uid() = id`.

---

# Segurança

## Obrigatório
- RLS habilitado em todas as tabelas
- políticas baseadas em `auth.uid()`
- validação no cliente antes do insert
- sanitização de entrada (escape de HTML/SQL é responsabilidade do Supabase Client)
- segregação mínima de dados por usuário

## Regras de autenticação
- tokens devem ser gerenciados exclusivamente pelo cliente Supabase
- não copiar tokens manualmente para `localStorage`
- não copiar tokens manualmente para `sessionStorage`
- evitar exposição de tokens em logs
- evitar circulação desnecessária de sessão em estado global

---

# Persistência Local

## Mecanismo oficial
- `zustand/middleware/persist` com storage `localStorage`

## Justificativa
- alinhado com a stack já decidida (Zustand)
- zero dependência adicional
- debugging trivial via DevTools
- volume do MVP cabe confortavelmente no limite de ~5MB

## Stores persistidas
- `taskStore` — tarefas locais e fila offline (`PendingMutation[]`)
- `contextStore` — contexto ativo, energia atual, preferências locais

## Stores NÃO persistidas
- `authStore` — sessão é gerenciada exclusivamente pelo Supabase Client

## Regras obrigatórias
- nunca persistir tokens de autenticação
- nunca persistir dados sensíveis sem necessidade operacional clara
- chaves de storage devem usar prefixo `secretario-task:`

## Backlog pós-MVP
- migração para IndexedDB caso volume cresça (via `idb-keyval` ou Dexie)

---

# Offline

## Permitido
- persistência local via `zustand/persist`
- fila persistida de mutações pendentes (`PendingMutation[]`)
- cache simples
- retry básico
- sincronização simples ao reconectar

## NÃO permitido
- CRDT
- sincronização distribuída complexa
- rollback temporal
- resolução visual de conflitos
- merge inteligente de campos

## Estratégia oficial
- Last Write Wins (LWW) em nível de registro inteiro

## Risco aceito
LWW em nível de registro inteiro pode sobrescrever alterações concorrentes em campos distintos.

Esse comportamento é aceitável para o MVP.

## Mitigação para deletes
Soft delete via `deleted_at` previne "ressurreição" de registros em conflitos de delete-vs-update entre devices.

---

# Fila Offline de Mutações

## Estrutura do `PendingMutation`

```ts
type PendingMutation = {
  id: string                                  // UUID da mutação (gerado no cliente)
  entity: 'task'                              // único valor no MVP
  operation: 'insert' | 'update' | 'delete'   // alinhado com sync_log.operation
  entityId: string                            // ID da tarefa afetada
  payload: unknown                            // snapshot do estado pretendido
  createdAt: string                           // ISO 8601
  retryCount: number                          // contador de tentativas
}
```

## Localização
- mantida no `taskStore` (persistida via `zustand/persist`)
- key de storage: `secretario-task:mutations`

## Fluxo de sync
1. mutação local entra na fila com `status='pending'`
2. ao detectar conexão, cliente tenta aplicar cada mutação ao Supabase
3. sucesso → remove da fila + insere registro em `sync_log` com `status='synced'`
4. falha → incrementa `retryCount`, registra em `sync_log` com `status='failed'` e `last_error`
5. estratégia de retry detalhada no Sprint 5

---

# Ranking Engine

## Objetivo
Implementar priorização:
- determinística
- transparente
- auditável
- debuggável

## Fatores considerados
- urgência (combinação de `priority` e proximidade de `due_at`)
- idade da tarefa
- compatibilidade entre energia da tarefa e energia disponível do usuário
- contexto ativo

## Restrições do MVP
- não existem `task_dependencies`
- não utilizar `f_dep`
- não utilizar inferência semântica

## Fórmula oficial

```text
score =
  (f_urgency * 0.4)
+ (f_energy  * 0.2)
+ (f_age     * 0.2)
+ (f_context * 0.2)
```

Pesos somam 1.0. Todos os fatores são normalizados para escala 0–1 antes da aplicação dos pesos.

## Cálculo dos fatores

### `f_urgency` (0–1)
Combina `priority` e proximidade de `due_at`:

```text
f_urgency = (priority / 10) * 0.6 + f_due * 0.4
```

Onde `f_due`:
- `1` se a tarefa vence hoje ou está atrasada (`due_at <= now()`)
- escala linearmente até `0` conforme `due_at` se afasta (limite de 14 dias)
- `0` se `due_at` é `NULL` (tarefa sem prazo)

Para tarefas sem `due_at`, o cálculo reduz-se a `f_urgency = priority / 10`.

### `f_energy` (0–1) — proximidade, não magnitude
```text
f_energy = 1 - |energy_tarefa/10 - energy_usuario/10|
```

`energy_usuario` vem do `contextStore.energiaAtual` (0–10).

**Justificativa:** quanto mais próximas a exigência da tarefa e a energia disponível do usuário, maior o score. Tarefas exigentes não devem subir no ranking quando o usuário está cansado. Ver `DECISIONS.md` para o histórico desta decisão.

### `f_age` (0–1)
```text
f_age = min(idade_em_dias / 30, 1)
```

Idade calculada a partir de `created_at`. Limite de 30 dias.

### `f_context` (0 ou 1)
```text
f_context = 1 quando contexto_da_tarefa = contexto_ativo
f_context = 0 caso contrário
```

## Regra de normalização
Todos os fatores devem ser normalizados para escala 0–1 antes da aplicação dos pesos.

Objetivo:
- evitar dominância por diferença de escala
- manter previsibilidade do score
- garantir que o score final fique entre 0 e 1

---

# Parser

## Parser oficial
- local
- regex-based
- rule-based
- determinístico

## Responsabilidades
- identificar `priority` (mapeamento de "prioridade alta/média/baixa" ou números)
- identificar `context` (matching contra os 7 contextos oficiais)
- identificar `due_at` a partir de datas relativas e horários
- preencher `title` com o texto restante

## Datas relativas
Expressões interpretadas (mapeamento explícito, sem NLP):
- "hoje" → `due_at = hoje 23:59:59`
- "amanhã" → `due_at = amanhã 23:59:59`
- "depois de amanhã" → `due_at = +2 dias 23:59:59`
- "Xh", "X:YYh", "às Xh" → ajusta horário do `due_at` (mantém a data interpretada)
- "segunda", "terça", etc. → próximo dia da semana correspondente

## Não utilizar
- LLM parsing
- semantic parsing
- embeddings
- modelos probabilísticos
- NLP

---

# Estrutura de Pastas

```text
src/
├── components/
├── pages/
├── stores/
├── hooks/
├── lib/
├── types/
└── utils/

supabase/
├── migrations/
└── policies/
```

## Observações
- `pages/` é utilizado para rotas via React Router
- `hooks/` é reservado para hooks customizados
- `utils/` pode permanecer mínimo no MVP
- políticas RLS podem ser aplicadas via Supabase CLI ou dashboard
- `vercel.json` na raiz do projeto com rewrite SPA é obrigatório desde o Sprint 1

## Tipos derivados do schema (recomendado)
Gerar `src/types/supabase.ts` automaticamente via Supabase CLI:

```bash
supabase gen types typescript --project-id <id> > src/types/supabase.ts
```

Este arquivo é a fonte oficial de tipos derivados do schema e não deve ser editado manualmente. Os arquivos `src/types/task.ts` e `src/types/context.ts` permanecem para tipos derivados ou agregados usados na UI.

---

# Fluxo de Evolução

## MVP
- CRUD funcional
- ranking determinístico
- briefing determinístico
- sync simples
- offline básico

## Pós-MVP (v1.1+)
- embeddings
- busca semântica
- LLM
- notificações push
- automações
- voice capture
- geofencing
- outbox avançada
- migração de persistência local para IndexedDB
- migração para Tailwind 4 (CSS-first)

---

# Filosofia Técnica

## Preferir
- código explícito
- lógica previsível
- menos abstrações
- menos infraestrutura
- debugging simples
- manutenção rápida

## Evitar
- complexidade prematura
- microarquiteturas desnecessárias
- dependência precoce de IA
- abstrações genéricas sem necessidade operacional
- acoplamento excessivo
