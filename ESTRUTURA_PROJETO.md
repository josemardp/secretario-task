# ESTRUTURA_PROJETO.md — SecretárioTask

Última revisão: 2026-05-12
Status: Estrutura oficial do MVP enxuto

---

# Objetivo

Definir a estrutura oficial de diretórios e arquivos do projeto SecretárioTask.

## Princípios
- simplicidade
- previsibilidade
- baixo acoplamento
- crescimento incremental
- manutenção simples
- debugging rápido

---

# Estrutura do Sprint 1 (mínima funcional)

```text
secretario-task/
│
├── public/
│
├── src/
│   ├── components/
│   │   └── layout/
│   │
│   ├── hooks/
│   │
│   ├── lib/
│   │   └── supabase.ts
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   └── Login.tsx
│   │
│   ├── stores/
│   │   ├── taskStore.ts
│   │   ├── contextStore.ts
│   │   └── authStore.ts
│   │
│   ├── types/
│   │   ├── task.ts
│   │   ├── context.ts
│   │   └── supabase.ts        ← gerado via Supabase CLI
│   │
│   ├── utils/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── migrations/
│   └── policies/
│
├── .env                       ← não versionado (no .gitignore)
├── .env.example               ← versionado, com estrutura das variáveis
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── vercel.json                ← rewrite SPA obrigatório
```

---

# Estrutura completa do MVP (a partir do Sprint 4)

```text
secretario-task/
│
├── public/
│
├── src/
│   ├── components/
│   │   ├── layout/
│   │   ├── board/
│   │   ├── briefing/
│   │   └── tasks/
│   │
│   ├── hooks/
│   │
│   ├── lib/
│   │   ├── supabase.ts
│   │   ├── parser.ts          ← Sprint 2
│   │   ├── ranking.ts         ← Sprint 3
│   │   └── briefing.ts        ← Sprint 4
│   │
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   └── Board.tsx
│   │
│   ├── stores/
│   │   ├── taskStore.ts
│   │   ├── contextStore.ts
│   │   └── authStore.ts
│   │
│   ├── types/
│   │   ├── task.ts
│   │   ├── context.ts
│   │   └── supabase.ts
│   │
│   ├── utils/
│   │
│   ├── App.tsx
│   └── main.tsx
│
├── supabase/
│   ├── migrations/
│   └── policies/
│
├── .env
├── .env.example
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── vercel.json
```

---

# Objetivos da Estrutura

A estrutura do MVP deve favorecer:
- leitura rápida
- organização funcional
- baixo custo cognitivo
- manutenção simples
- crescimento incremental previsível

Evitar:
- arquitetura enterprise prematura
- modularização excessiva
- abstrações genéricas sem necessidade operacional

---

# Arquivos Oficiais do MVP

## `vercel.json`

Configuração de rewrite SPA obrigatória para React Router em produção. Conteúdo mínimo:

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/" }
  ]
}
```

## Justificativa
Sem `vercel.json`, rotas profundas (`/board`, `/login`, etc.) retornam 404 em recarregamento direto. Tropeço operacional clássico, previsível, e barato de resolver no Sprint 1.

---

## `src/lib/supabase.ts`

Responsável por:
- conexão Supabase
- autenticação via magic link
- exportação do client único
- configuração base do Supabase Client

## Regras
- utilizar instância única do client
- evitar múltiplos clients paralelos
- autenticação gerenciada pelo SDK oficial

---

## `src/lib/parser.ts` (Sprint 2)

Parser determinístico local.

## Responsabilidades
- identificar `priority`
- identificar `context`
- identificar `due_at` (datas relativas e horários)
- preencher `title` com o texto restante

## Tecnologia permitida
- regex
- regras explícitas
- lógica determinística

## Datas relativas
Expressões interpretadas com lógica explícita baseada em regras fixas:
- "hoje"
- "amanhã"
- "depois de amanhã"
- horários ("14h", "às 9h")
- dias da semana ("segunda", "terça", etc.)

O resultado da interpretação temporal é gravado no campo `tasks.due_at` (TIMESTAMPTZ).

## NÃO utilizar
- LLM
- embeddings
- parsing semântico
- NLP
- inferência probabilística

---

## `src/lib/ranking.ts` (Sprint 3)

Motor determinístico de priorização.

## Responsabilidades
- cálculo de score
- ordenação previsível
- priorização auditável

## Fatores permitidos
- urgência (combinação de `priority` e proximidade de `due_at`)
- compatibilidade entre energia da tarefa e energia disponível do usuário (do `contextStore.energiaAtual`)
- idade da tarefa
- contexto ativo

## Restrições do MVP
- não utilizar `f_dep`
- MVP não possui `task_dependencies`
- não utilizar inferência semântica

## Fórmula completa
Documentada em `ARCHITECTURE.md`.

---

## `src/lib/briefing.ts` (Sprint 4)

Gerador determinístico do briefing diário.

## Responsabilidades
- aplicar `ranking.ts` sobre tarefas ativas (`deleted_at IS NULL`)
- gerar resumo operacional do contexto ativo
- selecionar tarefas relevantes para o dia
- registrar evento `viewed` em `task_events` para tarefas exibidas, **respeitando throttling de no máximo 1 por tarefa por dia**

## Regras
- lógica pura, sem efeitos colaterais não documentados
- determinismo total: mesma entrada → mesma saída
- não utilizar inferência semântica
- não utilizar LLM ou modelos probabilísticos
- antes de inserir `viewed`, verificar se já existe para a `task_id` no dia atual

## Observação
Este arquivo é entregue no Sprint 4 (Briefing + UX).

---

## `src/stores/taskStore.ts`

Responsável por:
- CRUD de tarefas (incluindo soft delete via `deleted_at`)
- geração de UUID no cliente para inserts (`crypto.randomUUID()`)
- persistência local
- fila offline de mutações (`PendingMutation[]`)
- sync simples
- gerenciamento operacional de tarefas

## Estrutura da fila offline

```ts
type PendingMutation = {
  id: string                                  // UUID da mutação
  entity: 'task'                              // único valor no MVP
  operation: 'insert' | 'update' | 'delete'   // alinhado com sync_log.operation
  entityId: string                            // ID da tarefa afetada
  payload: unknown                            // snapshot do estado pretendido
  createdAt: string                           // ISO 8601
  retryCount: number                          // contador de tentativas
}
```

## Regras
- manter store simples
- evitar lógica excessiva dentro da store
- lógica crítica deve permanecer em `lib/`
- store persistida via `zustand/middleware/persist` em localStorage
- todas as listagens filtram `WHERE deleted_at IS NULL`
- IDs novos são gerados localmente antes do insert
- chave de storage da fila: `secretario-task:mutations`

---

## `src/stores/contextStore.ts`

Responsável por:
- contexto ativo
- energia atual do usuário (`energiaAtual`, escala 0–10)
- preferências locais mínimas

## Objetivo
Centralizar estado operacional relacionado ao contexto atual do usuário. O valor de `energiaAtual` é consumido pelo `ranking.ts` para calcular `f_energy`.

## Regras
- store persistida via `zustand/middleware/persist` em localStorage
- chave de storage: `secretario-task:context`

---

## `src/stores/authStore.ts`

Responsável por:
- estado de autenticação
- sessão
- usuário atual
- estado de login

## Método oficial
Magic link (email OTP) via `supabase.auth.signInWithOtp({ email })`.

## Regras
- evitar armazenamento manual de tokens
- sessão deve ser gerenciada pelo Supabase Client
- store NÃO persistida (sessão vive apenas em memória durante a execução)

---

## `src/types/supabase.ts`

Tipos TypeScript derivados automaticamente do schema, gerados via Supabase CLI:

```bash
supabase gen types typescript --project-id <id> > src/types/supabase.ts
```

## Regras
- arquivo é fonte oficial de tipos derivados do schema
- não editar manualmente
- regenerar quando o schema mudar

---

## `src/types/task.ts` e `src/types/context.ts`

Tipos derivados ou agregados usados na UI (composições, tipos parciais, enums simplificados). Construídos a partir dos tipos de `supabase.ts` quando aplicável.

---

# Persistência Local

## Mecanismo oficial
- `zustand/middleware/persist` com storage `localStorage`

## Stores persistidas
- `taskStore` (tarefas locais + fila `PendingMutation[]`)
- `contextStore` (contexto ativo + `energiaAtual`)

## Stores NÃO persistidas
- `authStore` (sessão gerenciada exclusivamente pelo Supabase Client)

## Regras obrigatórias
- nunca persistir tokens de autenticação
- chaves de storage devem usar prefixo `secretario-task:`

## Chaves oficiais
- `secretario-task:tasks` — tarefas locais
- `secretario-task:mutations` — fila offline
- `secretario-task:context` — contexto e energia

## Referência
Detalhes técnicos completos em `ARCHITECTURE.md`.

---

# Segurança e Sanitização

## Não existe no MVP
- `src/lib/sanitize.ts`

## A sanitização é responsabilidade de
- RLS (Row Level Security) em todas as tabelas
- CHECK constraints em `priority`, `energy`, `task_events.type`, `sync_log.operation`, `sync_log.status`
- validação de tipos no frontend
- validação de formulários
- Supabase Client (escape de SQL/HTML)
- validação backend quando necessário

## Regras obrigatórias
- não armazenar tokens manualmente em `localStorage`
- não armazenar tokens manualmente em `sessionStorage`
- evitar logs com dados sensíveis
- minimizar circulação de sessão em stores globais

---

# Arquivos NÃO incluídos no MVP

Os seguintes arquivos NÃO devem existir no MVP:

```text
src/lib/embeddings.ts
src/lib/vectorSearch.ts
src/lib/semanticParser.ts
src/lib/llm.ts
src/lib/gemini.ts
src/lib/openai.ts
src/lib/claude.ts
src/lib/sanitize.ts
src/workers/embeddingWorker.ts
```

## Motivo
- pertencem ao backlog pós-MVP
- adicionam complexidade prematura
- aumentam custo operacional
- aumentam dificuldade de debugging

---

# Tabelas NÃO incluídas no MVP

As seguintes tabelas Supabase NÃO devem ser criadas no MVP:

```text
profiles
user_settings
llm_call_log
behavior_patterns
```

## Motivo
- O Supabase já fornece `auth.users` com dados básicos do usuário
- Preferências locais são gerenciadas via `contextStore` em localStorage
- Criar essas tabelas antecipadamente viola P2 (Simplicidade vence sofisticação)

## Observação
Caso, no futuro, surja necessidade de dados de perfil compartilhados entre dispositivos, essas tabelas podem ser introduzidas no v1.1+.

---

# Estrutura Pós-MVP (v1.1+)

Somente após estabilização do MVP:

```text
src/
├── ai/
├── embeddings/
├── semantic/
├── notifications/
├── automations/
└── voice/
```

## Regra
Nenhuma dessas estruturas deve ser criada antes da necessidade operacional real.

---

# Testes e Qualidade de Código

## Decisão oficial do MVP
- MVP NÃO inclui testes automatizados
- validação é manual e diária, alinhada ao P8 (utilizável diariamente)
- usuário único do MVP é também o desenvolvedor

## Lint
- utilizar configuração padrão do ESLint que vem com o Vite
- não adicionar regras customizadas no MVP

## Prettier
- NÃO incluído no MVP
- evita divergência de configuração para dev solo

## Justificativa
- coerência com P2 (Simplicidade vence sofisticação)
- coerência com CDP1 (Clareza antes de abstração)
- testes automatizados e configurações elaboradas entram no v1.1+ junto com features de maior risco (LLM, sync avançado)

## Backlog pós-MVP
- Vitest + Testing Library
- ESLint com regras customizadas
- Prettier
- testes E2E quando justificáveis

---

# Organização Recomendada

## Regras
- componentes pequenos
- stores simples
- lógica crítica em `lib/`
- baixo acoplamento
- arquivos com responsabilidade clara

## Preferir
- clareza
- previsibilidade
- manutenção simples
- debugging rápido
- organização funcional

## Evitar
- arquitetura enterprise prematura
- genericismo excessivo
- sistemas mágicos
- abstrações prematuras
- acoplamento desnecessário

---

# Convenções

## Arquivos
- camelCase para utilitários
- PascalCase para componentes React

## Pastas
- nomes curtos
- organização funcional
- evitar profundidade excessiva

## Configuração
- `tailwind.config.ts` deve permanecer em TypeScript (compatível com Tailwind 3)
- configurações devem seguir padrão do restante do projeto

## Datas em código e documentação
- formato oficial: `YYYY-MM-DD` (ISO 8601)
- timestamps em colunas SQL: `TIMESTAMPTZ`

## Variáveis de ambiente
`.env.example` deve listar todas as variáveis obrigatórias com a estrutura (sem valores reais).

## Exemplos mínimos do `.env.example`

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## Regras de versionamento
- `.env` no `.gitignore`
- `.env.example` versionado
- chaves reais nunca no Git

## Padrão de commits
Prefixos mínimos:
- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `chore:` — manutenção, configuração, build
- `docs:` — alterações em documentação

---

# Objetivo Final do MVP

O MVP deve entregar:
- captura rápida
- organização funcional
- priorização determinística
- uso diário estável
- baixo atrito operacional

Sem:
- IA
- embeddings
- semântica avançada
- infraestrutura complexa
- automações
