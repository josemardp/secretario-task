# AGENTS.md — SecretárioTask

Última revisão: 2026-05-12
Status: Alinhado ao MVP enxuto do PRD, com correções da auditoria de 2026-05-12

---

# Objetivo deste arquivo

Este documento orienta agentes humanos e IAs durante o desenvolvimento do SecretárioTask.

Define:
- comportamento esperado
- limites técnicos
- prioridades do MVP
- regras de arquitetura
- restrições de escopo
- princípios de implementação

---

# Filosofia Operacional

O SecretárioTask NÃO é:
- um chatbot
- um assistente emocional
- uma plataforma genérica de produtividade
- uma rede social
- um sistema gamificado

O SecretárioTask É:
- um sistema operacional pessoal
- um chefe de gabinete digital
- um organizador de execução
- uma ferramenta operacional previsível

## Tom esperado
- direto
- profissional
- claro
- sem emojis por padrão
- sem linguagem motivacional artificial
- sem antropomorfização exagerada

---

# Regra Principal

O MVP deve permanecer ENXUTO.

Qualquer funcionalidade que:
- exija LLM
- exija embeddings
- exija infraestrutura complexa
- aumente significativamente custo operacional
- aumente drasticamente manutenção
- reduza previsibilidade do sistema

Deve ser movida para backlog pós-MVP (v1.1+).

## Exceção
Correções críticas de:
- segurança
- estabilidade
- bugs que comprometam uso diário

Podem ser aplicadas imediatamente, desde que documentadas em `DECISIONS.md`.

---

# Stack Oficial

## Frontend
- React 19
- Vite 6
- TypeScript 5
- Tailwind CSS 3 (com `tailwind.config.ts`)
- React Router 7

## Backend
- Supabase (Supabase JS 2)

## Banco de dados
- PostgreSQL (gerenciado pelo Supabase)

## Estado global
- Zustand 5 (com persist em localStorage via `zustand/middleware/persist`)

## Deploy
- Vercel (com `vercel.json` rewrite SPA)

## Observação
Versões pinadas para preservar previsibilidade. Mudança de versão major deve ser registrada em `DECISIONS.md`. Tailwind 4 (CSS-first) fica para v1.1+.

---

# Autenticação

## Método oficial
Magic link (email OTP) via Supabase Auth: `supabase.auth.signInWithOtp({ email })`.

## Regras
- não copiar tokens manualmente para `localStorage` ou `sessionStorage`
- sessão gerenciada exclusivamente pelo Supabase Client
- `authStore` não é persistida

---

# Restrições do MVP

## NÃO implementar no MVP
- LLM
- embeddings
- pgvector
- busca semântica
- integração Gemini
- integração Claude
- integração OpenAI
- push notifications
- geofencing
- captura por voz
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
- tabelas `profiles` ou `user_settings`
- migração para Tailwind 4

Tudo acima pertence ao backlog pós-MVP (v1.1+).

---

# Parser

## Requisitos obrigatórios
O parser do MVP deve ser:
- determinístico
- local
- baseado em regex
- baseado em regras explícitas
- previsível

## Datas relativas
Expressões como:
- "amanhã"
- "hoje"
- "depois de amanhã"
- horários ("14h", "às 9h")
- dias da semana

Exigem lógica explícita baseada em regras fixas. O resultado é gravado em `tasks.due_at` (TIMESTAMPTZ).

Não utilizar:
- NLP
- LLM
- inferência probabilística

## Exemplos válidos
- "amanhã reunião PM 14h"
- "comprar remédio prioridade alta"

## Exemplos inválidos no MVP
- inferência semântica avançada
- parsing por LLM
- embeddings semânticos
- interpretação contextual complexa

---

# Ranking Engine

## Objetivo
O ranking deve ser:
- determinístico
- transparente
- auditável
- fácil de debugar

## Fatores permitidos
- urgência (combinação de `priority` e proximidade de `due_at`)
- compatibilidade entre energia da tarefa e energia disponível do usuário
- idade da tarefa
- contexto ativo

## Restrições do MVP
- o MVP NÃO possui dependências entre tarefas
- `f_dep` NÃO deve existir
- qualquer referência a `task_dependencies` deve ser ignorada

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

- `f_urgency`: `(priority/10) * 0.6 + f_due * 0.4`. `f_due = 1` se vence hoje ou está atrasada; escala linearmente até 0 (limite 14 dias); 0 se `due_at` é NULL.

- `f_energy`: `1 - |energy_tarefa/10 - energy_usuario/10|`. Proximidade, não magnitude. `energy_usuario` vem do `contextStore.energiaAtual` (0–10).

- `f_age`: idade em dias, limitada a 30, normalizada para 0–1.

- `f_context`: 1 quando contexto da tarefa = contexto ativo, 0 caso contrário.

## Detalhes completos
Em `ARCHITECTURE.md`.

## Objetivos do algoritmo
- previsibilidade
- estabilidade
- facilidade de debug
- auditabilidade

---

# Offline e Sync

## Permitido no MVP
- offline básico
- persistência local via `zustand/middleware/persist`
- fila persistida de mutações (`PendingMutation[]`)
- cache simples
- retry simples
- sincronização ao reconectar

## NÃO implementar
- outbox sofisticada
- CRDT
- sync distribuído complexo
- rollback visual
- reversão temporal
- toast de conflito
- merge inteligente de campos

## Estratégia oficial
- Last Write Wins (LWW) em nível de registro inteiro

## Risco aceito
Conflitos concorrentes em campos diferentes podem resultar em sobrescrita parcial. Esse comportamento é aceitável no MVP.

## Mitigação para deletes
Soft delete via `deleted_at` em `tasks` previne "ressurreição" de registros em conflitos de delete-vs-update entre devices.

## Vocabulário de operações
- `sync_log.operation`: `'insert' | 'update' | 'delete'`
- `PendingMutation.operation`: `'insert' | 'update' | 'delete'`

Manter o mesmo vocabulário em todas as camadas. Não traduzir para `'create'`.

---

# Segurança

## Obrigatório
- RLS por `auth.uid()` em todas as tabelas
- CHECK constraints em `priority` (0–10), `energy` (0–10), `task_events.type` (enum textual), `sync_log.operation`, `sync_log.status`
- validação no cliente antes do insert
- sanitização de entrada
- logs mínimos
- segregação básica de dados

## PII
- evitar exposição desnecessária
- mascarar quando necessário
- não expor tokens em logs
- evitar circulação desnecessária de sessão

---

# Organização de Código

## Prioridades
1. clareza
2. previsibilidade
3. simplicidade
4. baixo acoplamento
5. debugging rápido

## Evitar
- abstrações prematuras
- arquitetura excessiva
- sistemas genéricos demais
- acoplamento desnecessário
- padrões complexos sem necessidade operacional

---

# Estrutura Esperada

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

Na raiz: `vercel.json` (rewrite SPA), `.env.example`, `tailwind.config.ts`, `vite.config.ts`, `tsconfig.json`.

## Observações
- `pages/` utiliza React Router
- `hooks/` é reservado para hooks customizados
- `utils/` deve permanecer simples no MVP
- políticas RLS podem ser aplicadas via Supabase CLI ou dashboard
- `src/types/supabase.ts` é gerado automaticamente via Supabase CLI e não deve ser editado manualmente

---

# Documentos do projeto

São 10 arquivos de documentação no total.

## Documentos vivos (atualizados durante o desenvolvimento)
- `STATUS.md` — marcador de página: sprint atual, progresso, próximo passo, bloqueios
- `DECISIONS.md` — registro de decisões técnicas não-triviais

## Documentos estáticos (referência, raramente alterados)
- `README.md` — índice e protocolo resumido
- `AGENTS.md` — este arquivo: contrato de trabalho com IAs e colaboradores
- `PRD.md` — visão geral do produto e restrições
- `ARCHITECTURE.md` — schemas SQL, FKs, índices, triggers, políticas RLS, persistência
- `PHILOSOPHY.md` — princípios P1–P8 e critérios CDP1–CDP9
- `ROADMAP.md` — entregas por sprint
- `SPRINT_LOG.md` — detalhamento operacional dos sprints
- `ESTRUTURA_PROJETO.md` — estrutura de arquivos e diretórios

---

# Protocolo de Trabalho

O protocolo é proporcional ao tipo da sessão. Existem três modos.

---

## Modo 1 — Sessão normal de desenvolvimento (90% dos casos)

Use este modo quando: o sprint atual já está iniciado e você está implementando um item do checklist.

### No início da sessão
1. ler `STATUS.md`
2. ler a seção do sprint atual em `SPRINT_LOG.md`

### Durante o trabalho
- consultar outros documentos SOB DEMANDA quando precisar:
  - vai mexer em schema SQL? → consulta `ARCHITECTURE.md`
  - vai criar/mover arquivo? → consulta `ESTRUTURA_PROJETO.md`
  - dúvida sobre escopo do MVP? → consulta `PRD.md`
- não há obrigação de ler todos os documentos a cada sessão

### No fim da sessão
1. atualizar o checklist em `STATUS.md` (marcar `[x]` o que foi concluído)
2. atualizar o campo "Próximo passo concreto" em `STATUS.md`
3. atualizar a data de "Última atualização" em `STATUS.md` (formato `YYYY-MM-DD`)
4. registrar decisão em `DECISIONS.md` SOMENTE se for não-trivial (ver critério abaixo)
5. commit (prefixos: `feat:`, `fix:`, `chore:`, `docs:`)

### Tempo esperado de overhead
- Início: 1–2 minutos
- Fim: 1 minuto
- Total fora do trabalho real: ~3 minutos

---

## Modo 2 — Início de sprint (6 vezes no projeto inteiro)

Use este modo quando: o sprint anterior foi concluído e o próximo vai começar.

### Ritual completo
1. ler `STATUS.md`
2. ler a seção do novo sprint em `ROADMAP.md` e `SPRINT_LOG.md`
3. ler `ARCHITECTURE.md` se o sprint envolve mudanças de schema ou novas tabelas
4. ler `DECISIONS.md` para revisar decisões anteriores que possam afetar o sprint
5. atualizar `STATUS.md`:
   - mover o sprint anterior para "Histórico de sprints concluídos" com data
   - substituir "Sprint atual" pelo novo
   - substituir o checklist pelo do novo sprint (copiar do SPRINT_LOG.md)
   - definir o primeiro "Próximo passo concreto"
6. commit com mensagem `chore: início do Sprint N`

### Tempo esperado
- 15–20 minutos, uma vez por sprint

---

## Modo 3 — Encerramento de sprint (6 vezes no projeto inteiro)

Use este modo quando: o último item do checklist do sprint foi concluído.

### Ritual completo
1. confirmar que TODOS os itens do checklist estão marcados `[x]` em `STATUS.md`
2. validar os "Critérios de conclusão" do sprint no `SPRINT_LOG.md`
3. revisar o que foi feito e identificar decisões importantes que ainda não estão em `DECISIONS.md`
4. registrar essas decisões consolidadas em `DECISIONS.md`
5. fazer commit final do sprint com mensagem `chore: conclusão do Sprint N`
6. seguir para o Modo 2 (Início de sprint)

### Tempo esperado
- 20–30 minutos, uma vez por sprint

---

# Quando registrar em DECISIONS.md

## Registrar quando
- precisou escolher uma biblioteca não prevista nos documentos (ex.: `react-hook-form`, `date-fns`)
- desviou deliberadamente de algo escrito nos documentos (com motivo)
- resolveu um trade-off técnico não óbvio (ex.: estratégia de IDs offline, soft delete)
- adotou um padrão de código novo que vai se repetir
- decidiu não implementar algo que estava no escopo (com motivo)
- atualizou versão major de alguma biblioteca da stack pinada

## NÃO registrar
- bugs corrigidos (commit message resolve)
- implementação trivial alinhada com os documentos
- formatação ou ajustes cosméticos
- decisões já cobertas pelos documentos estáticos

## Em caso de dúvida
- a decisão vai voltar à tona daqui a 3 meses e eu vou esquecer o porquê? → registrar
- é algo que alguém olhando o código entenderia sozinho? → não registrar

---

# Em caso de conflito entre documentos

Ordem de prevalência (não pode ser alterada):
1. `STATUS.md` — autoridade sobre estado atual do projeto
2. `DECISIONS.md` — autoridade sobre decisões que substituem padrões
3. `ARCHITECTURE.md` — autoridade técnica sobre schemas e infraestrutura
4. `PRD.md` — autoridade sobre escopo e funcionalidades
5. demais documentos estáticos

## Regra de imutabilidade
A ordem de precedência documental acima é fixa e NÃO pode ser alterada sem decisão explícita em `DECISIONS.md`.

---

# Padronizações operacionais

## Formato de datas
- `YYYY-MM-DD` (ISO 8601) em toda documentação
- `TIMESTAMPTZ` em colunas SQL

## Prefixos de commit (mínimo)
- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `chore:` — manutenção, configuração, build
- `docs:` — alterações em documentação

## Chaves de localStorage
- prefixo obrigatório `secretario-task:`
- chaves oficiais documentadas em `ESTRUTURA_PROJETO.md`

---

# Nunca

- adicionar IA fora do sprint
- criar infraestrutura não planejada
- expandir escopo sem solicitação explícita
- introduzir abstrações prematuras
- adicionar dependências desnecessárias
- criar tabelas não definidas em `ARCHITECTURE.md`
- alterar schemas SQL sem atualizar `ARCHITECTURE.md`
- encerrar a sessão sem atualizar `STATUS.md`
- copiar tokens de autenticação para localStorage ou sessionStorage
- usar DELETE físico em `tasks` (sempre soft delete via `deleted_at`)
- gerar UUID no banco para inserts de `tasks` (sempre `crypto.randomUUID()` no cliente)
- alterar a ordem de precedência documental sem registrar em `DECISIONS.md`

## Exceção
Correções críticas de:
- segurança
- estabilidade
- bugs que impeçam uso diário

Podem ser aplicadas fora do sprint, desde que documentadas em `DECISIONS.md`.

---

# Critério Geral de Aceitação

Uma feature só é aceita se:
- funcionar localmente
- possuir comportamento previsível
- for simples de manter
- não aumentar drasticamente complexidade
- possuir debugging simples
- respeitar o escopo do sprint atual

---

# Backlog Pós-MVP (v1.1+)

Reservado para:
- LLM
- embeddings
- briefing inteligente
- análise comportamental
- busca semântica
- notificações
- automações avançadas
- voice capture
- geofencing
- outbox avançada
- sync avançado
- resolução sofisticada de conflitos
- migração de persistência local para IndexedDB
- migração para Tailwind 4 (CSS-first)
- testes automatizados (Vitest + Testing Library)
- tabelas `profiles` e `user_settings`
- conversão de `task_events.type` para ENUM PostgreSQL
- conversão de `sync_log.entity_type` para ENUM
