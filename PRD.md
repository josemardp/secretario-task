# PRD.md — SecretárioTask

Última revisão: 2026-05-12
Status: Documento consolidado e alinhado ao MVP enxuto, com correções da auditoria de 2026-05-12

---

# Visão Geral

SecretárioTask é um sistema operacional pessoal focado em:
- captura rápida
- organização operacional
- priorização determinística
- execução diária
- baixo atrito operacional

O produto NÃO é:
- chatbot
- assistente emocional
- plataforma genérica de produtividade
- rede social
- sistema gamificado

---

# Objetivo do MVP

Entregar um sistema:
- simples
- confiável
- previsível
- barato de manter
- utilizável diariamente

## Prioridades do MVP
1. captura rápida
2. organização funcional
3. ranking previsível
4. estabilidade
5. baixo custo operacional

---

# Stack Oficial

## Frontend
- React 19
- Vite 6
- TypeScript 5
- Tailwind CSS 3
- React Router 7

## Estado global
- Zustand 5

## Backend
- Supabase (Supabase JS 2)

## Banco de dados
- PostgreSQL (gerenciado pelo Supabase)

## Deploy
- Vercel

## Observação
Detalhes técnicos completos da stack, incluindo justificativa para versões pinadas, em `ARCHITECTURE.md`.

---

# Autenticação

## Método oficial
Magic link (email OTP) via Supabase Auth.

## Fluxo
1. usuário insere e-mail
2. recebe link único por e-mail
3. clica no link → sessão estabelecida

## Justificativa
- usuário único do MVP é o próprio dev
- sem senha, sem tela de recuperação
- baixa fricção operacional
- migração para multi-usuário no pós-MVP é trivial

---

# Contextos Oficiais

## Enum oficial

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
- utilizar `Estudo` no singular
- todos os documentos devem seguir exatamente este padrão
- não criar novos contextos no MVP sem decisão registrada em `DECISIONS.md`

---

# Funcionalidades do MVP

## Inclusas no MVP
- autenticação (magic link)
- CRUD de tarefas
- soft delete (via `deleted_at`)
- board simples
- parser local determinístico
- ranking determinístico (com `due_at` e energia compatível com usuário)
- briefing determinístico
- persistência local
- fila offline de mutações
- sync simples (LWW)
- offline básico
- RLS
- observabilidade mínima via `task_events` (com throttling de `viewed`)

---

## Fora do MVP (v1.1+)
- LLM
- embeddings
- pgvector
- busca semântica
- integração Gemini
- integração Claude
- integração OpenAI
- notificações push
- geofencing
- voice capture
- recorrência
- subtarefas
- anexos
- notas avançadas
- outbox avançada
- conflict resolution avançado
- CRDT
- briefing inteligente
- análise comportamental
- automações inteligentes
- tabelas `profiles` e `user_settings`
- migração para Tailwind 4 (CSS-first)

---

# Arquitetura do MVP

```text
Frontend SPA
↓
Zustand (com persist em localStorage)
↓
Supabase Client
↓
PostgreSQL + Auth + RLS
```

## Objetivos arquiteturais
- simplicidade
- previsibilidade
- baixo custo
- debugging rápido
- evolução incremental

---

# Banco de Dados

## Observação
O schema SQL oficial, completo, com enums, CHECK constraints, índices, triggers, foreign keys, políticas RLS, soft delete e tipos de evento está definido em `ARCHITECTURE.md`.

O conteúdo abaixo é apenas um resumo operacional.

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
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

## Geração de IDs
- IDs gerados no cliente via `crypto.randomUUID()` (estratégia offline-first)
- `DEFAULT gen_random_uuid()` permanece como fallback para inserts via dashboard

## Escala dos campos
- `priority`: 0–10 (CHECK constraint)
  - 0 = sem prioridade
  - 10 = prioridade máxima

- `energy`: 0–10 (CHECK constraint)
  - 0 = sem exigência de energia
  - 10 = máxima exigência de energia

## Valores válidos para status
- `todo`
- `doing`
- `done`

## Campo `due_at`
- TIMESTAMPTZ nullable
- preenchido pelo parser quando expressões temporais forem detectadas
- usado pelo ranking e pelo briefing

## Campo `deleted_at`
- TIMESTAMPTZ nullable (soft delete)
- queries do MVP filtram `WHERE deleted_at IS NULL`

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
- `created`
- `updated`
- `completed`
- `viewed`

## Throttling de `viewed`
Eventos `viewed` são registrados no máximo uma vez por tarefa por dia.

---

## Tabela `sync_log`

Aplicada já no Sprint 1, junto com `tasks` e `task_events`. O Sprint 5 trata do uso operacional. Schema completo em `ARCHITECTURE.md`.

---

# Ranking Engine

## Objetivos
O ranking deve ser:
- determinístico
- previsível
- transparente
- auditável
- fácil de debugar

## Fatores considerados
- urgência (combinação de `priority` e proximidade de `due_at`)
- compatibilidade entre energia da tarefa e energia disponível do usuário
- idade da tarefa
- contexto ativo

## Restrições do MVP
- o MVP não possui `task_dependencies`
- `f_dep` foi removido da fórmula
- não utilizar inferência semântica

## Fórmula oficial

```text
score =
  (f_urgency * 0.4)
+ (f_energy  * 0.2)
+ (f_age     * 0.2)
+ (f_context * 0.2)
```

Pesos somam 1.0. Todos os fatores normalizados para 0–1.

## Cálculo dos fatores (resumo)

- `f_urgency`: combina `priority` (peso 0.6) e proximidade de `due_at` (peso 0.4). Para tarefas sem `due_at`, reduz-se a `priority / 10`.

- `f_energy`: `1 - |energy_tarefa/10 - energy_usuario/10|`. Mede proximidade entre a exigência da tarefa e a energia disponível do usuário (do `contextStore.energiaAtual`). Tarefas exigentes não sobem no ranking quando o usuário está cansado.

- `f_age`: idade da tarefa em dias, limitada a 30, normalizada para 0–1.

- `f_context`: 1 quando contexto da tarefa = contexto ativo; 0 caso contrário.

## Detalhes completos
Fórmulas detalhadas e justificativas em `ARCHITECTURE.md`.

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
- rule-based
- regex-based
- determinístico

## Responsabilidades
- identificar `priority`
- identificar `context`
- identificar `due_at` (datas relativas e horários)
- preencher `title` com o texto restante

## Datas relativas suportadas
Expressões como:
- "hoje"
- "amanhã"
- "depois de amanhã"
- horários ("14h", "às 9h")
- dias da semana ("segunda", "terça", etc.)

Todas com lógica explícita baseada em regras fixas.

Não utilizar:
- NLP
- semantic parsing
- embeddings
- LLM parsing
- modelos probabilísticos

---

# Offline e Sync

## Permitido
- persistência local
- fila persistida de mutações pendentes (`PendingMutation[]`)
- retry simples
- sync básico
- cache simples

## Estratégia oficial
- Last Write Wins (LWW) em nível de registro inteiro

## NÃO implementar
- CRDT
- rollback visual
- outbox sofisticada
- reversão temporal
- merge inteligente de campos

## Risco aceito
Conflitos concorrentes podem sobrescrever alterações em campos diferentes.

Esse comportamento é aceitável para o MVP.

## Mitigação para deletes
Soft delete via `deleted_at` previne "ressurreição" de registros em conflitos de delete-vs-update entre devices.

---

# Segurança

## Obrigatório
- RLS por `auth.uid()` em todas as tabelas
- validação no cliente antes do insert
- sanitização de entrada
- segregação básica de dados

## Regras adicionais
- tokens devem ser gerenciados exclusivamente pelo cliente Supabase
- evitar exposição de tokens em logs
- evitar circulação desnecessária de sessão

---

# Filosofia do Produto

## Princípios
- simplicidade
- previsibilidade
- baixo custo
- evolução incremental
- clareza operacional

## Evitar
- complexidade prematura
- arquitetura excessiva
- dependência precoce de IA
- abstrações desnecessárias

---

# Planejamento Oficial dos Sprints

## Sprint 1 — Fundação
- scaffold (React 19 + Vite 6 + TS 5 + Tailwind 3)
- auth (magic link)
- banco (`tasks`, `task_events`, `sync_log` aplicados, com CHECK constraints, `due_at`, `deleted_at`, triggers)
- `vercel.json` com rewrite SPA
- home mínima
- captura offline básica (input simples, sem parser)
- fila offline de mutações (`PendingMutation[]`) implementada no `taskStore`

## Observação
A captura neste sprint é apenas um input de texto com persistência local via `zustand/middleware/persist`.

O parser de linguagem natural é implementado somente no Sprint 2.

A fila `PendingMutation[]` é criada no Sprint 1 mas só passa a ser totalmente exercitada no Sprint 5 (Sync + Hardening).

---

## Sprint 2 — CRUD + Parser
- CRUD completo (soft delete via `deleted_at`)
- parser local (interpreta `priority`, `context`, `due_at`)
- board simples
- troca de contexto

---

## Sprint 3 — Ranking Engine
- ranking determinístico (com `f_urgency` combinando `priority` + `due_at`, `f_energy` por proximidade)
- priorização previsível
- consumo do `contextStore.energiaAtual` no cálculo de `f_energy`

## Observação
O termo "Ranking Engine" substitui "Recommendation Engine" para evitar associação com ML ou IA.

O algoritmo é 100% baseado em regras explícitas.

---

## Sprint 4 — Briefing + UX
- briefing determinístico
- throttling de eventos `viewed` (no máximo 1 por tarefa por dia)
- refinamento de experiência
- melhorias operacionais

---

## Sprint 5 — Sync + Hardening
- sync básico (LWW)
- retry simples (consumindo `PendingMutation[]` do `taskStore`)
- uso operacional da `sync_log` (registros, atualização de status)
- observabilidade mínima via `task_events`
- robustez operacional

## Entregas concretas
- consumo da `sync_log` (schema já aplicado no Sprint 1)
- estratégia LWW documentada e implementada
- retry de requisições falhas
- atualização de campos imutáveis bloqueada por trigger

---

## Sprint 6 — Uso Real
- estabilização
- performance
- correções finais
- uso diário contínuo

---

# Critério de Sucesso do MVP

O MVP será considerado bem-sucedido se:
- funcionar diariamente
- possuir baixa fricção
- for previsível
- possuir manutenção simples
- operar com baixo custo
- suportar uso contínuo sem instabilidade crítica

## KPIs técnicos mensuráveis
- tempo de captura de tarefa: < 5 segundos
- carregamento inicial da aplicação: < 2 segundos
- resposta visual às ações do usuário: < 300 ms
- uptime do serviço: > 99% durante uso diário

---

# Nota de Consolidação

Documento revisado em 2026-05-12 após auditoria técnica que identificou bloqueantes e refinamentos:
- método de autenticação definido (magic link)
- campo `due_at` adicionado a `tasks`
- soft delete via `deleted_at`
- CHECK constraints em `priority`, `energy`, `task_events.type`
- geração de UUID no cliente
- `f_energy` redefinido como proximidade (não magnitude)
- `f_urgency` redefinido para combinar `priority` + `due_at`
- migração de `sync_log` antecipada para o Sprint 1
- throttling de eventos `viewed`
- versões da stack pinadas

Todos os ajustes foram alinhados entre:
- `ROADMAP.md`
- `SPRINT_LOG.md`
- `AGENTS.md`
- `ARCHITECTURE.md`
- `PHILOSOPHY.md`
- `ESTRUTURA_PROJETO.md`
- `DECISIONS.md`

Todos os documentos seguem oficialmente o escopo enxuto do MVP.
