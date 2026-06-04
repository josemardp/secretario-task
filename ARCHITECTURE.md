# ARCHITECTURE.md — SecretárioTask

Última revisão: 2026-05-12
Status: MVP enxuto alinhado ao PRD, com correções da auditoria de 2026-05-12

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
  estimated_minutes INTEGER,
  actual_minutes INTEGER,
  started_at TIMESTAMPTZ,
  recurrence_rule TEXT,
  recurrence_origin_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
  postponed_count INTEGER DEFAULT 0
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
```

Os índices parciais (`WHERE deleted_at IS NULL`) mantêm performance sem custo de armazenar registros excluídos.

---

## Tabela `task_events`

```sql
CREATE TABLE task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created','updated','completed','viewed')),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

## Tipos de evento válidos no MVP
- `created` — tarefa criada
- `updated` — tarefa atualizada
- `completed` — tarefa concluída
- `viewed` — tarefa visualizada no briefing

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
- `entity_type`: tipo da entidade sincronizada (no MVP, apenas `'task'`)
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
