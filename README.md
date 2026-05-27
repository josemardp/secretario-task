# SecretárioTask — Documentação do Projeto

Conjunto de 10 arquivos de documentação para o desenvolvimento do MVP.

Última consolidação: 2026-05-12

---

# Por onde começar

Se você é uma IA ou um novo colaborador chegando ao projeto:

1. Leia `STATUS.md` PRIMEIRO — diz onde o projeto parou
2. Leia o protocolo no topo do `STATUS.md` — diz o que fazer nesta sessão
3. Em sessão normal de desenvolvimento, leia também a seção do sprint atual em `SPRINT_LOG.md`
4. Para o contrato completo de trabalho, consulte `AGENTS.md`
5. Os demais documentos são consultados sob demanda

---

# Índice dos documentos

## Documentos vivos (atualizados durante o desenvolvimento)

| Arquivo | Função | Quando atualizar |
|---------|--------|------------------|
| `STATUS.md` | Marcador de página: sprint atual, progresso, próximo passo | Toda sessão |
| `DECISIONS.md` | Registro de decisões técnicas não-triviais | Quando decisão importante for tomada |

## Documentos estáticos (referência)

| Arquivo | Função |
|---------|--------|
| `README.md` | Este arquivo: índice e protocolo resumido |
| `AGENTS.md` | Contrato de trabalho com IAs e colaboradores |
| `PRD.md` | Visão geral do produto e restrições |
| `ARCHITECTURE.md` | Schemas SQL, foreign keys, índices, triggers, políticas RLS, persistência |
| `PHILOSOPHY.md` | Princípios P1–P8 e critérios CDP1–CDP9 |
| `ROADMAP.md` | Entregas por sprint |
| `SPRINT_LOG.md` | Detalhamento operacional dos sprints |
| `ESTRUTURA_PROJETO.md` | Estrutura de arquivos e diretórios |

---

# Protocolo de trabalho resumido

Detalhes completos no `AGENTS.md`, seção "Protocolo de Trabalho".

## Modo 1 — Sessão normal (90% dos casos)
- Início: ler `STATUS.md` + sprint atual em `SPRINT_LOG.md`
- Trabalhar
- Fim: marcar `[x]` no `STATUS.md`, atualizar próximo passo, commit
- Overhead: ~3 minutos por sessão

## Modo 2 — Início de sprint (6 vezes no projeto)
- Ritual completo no `AGENTS.md`
- Tempo: 15–20 minutos

## Modo 3 — Encerramento de sprint (6 vezes no projeto)
- Validação + consolidação de decisões
- Tempo: 20–30 minutos

---

# Stack oficial

- Frontend: React 19 + Vite 6 + TypeScript 5 + Tailwind CSS 3 + React Router 7
- Estado: Zustand 5 (com `persist` em localStorage)
- Backend: Supabase (Supabase JS 2 + PostgreSQL + Auth + RLS)
- Deploy: Vercel (com `vercel.json` rewrite SPA)
- Auth: e-mail e senha (signInWithPassword)

Versões pinadas para preservar previsibilidade. Detalhes em `ARCHITECTURE.md`.

---

# Sprints do MVP

1. **Sprint 1 — Fundação:** scaffold, auth (e-mail e senha), banco completo (`tasks`, `task_events`, `sync_log` com constraints e triggers), captura offline básica, fila offline (`PendingMutation[]`), `vercel.json`
2. **Sprint 2 — CRUD + Parser:** CRUD com soft delete, parser determinístico (interpreta `due_at`), board
3. **Sprint 3 — Ranking Engine:** priorização determinística (com `due_at` e energia compatível com usuário)
4. **Sprint 4 — Briefing + UX:** briefing determinístico (com throttling de `viewed`), refinos de UX
5. **Sprint 5 — Sync + Hardening:** uso operacional da `sync_log`, LWW, retry, observabilidade
6. **Sprint 6 — Uso Real:** estabilização, performance, uso diário contínuo

---

# Princípios não-negociáveis

- MVP enxuto — sem IA, sem embeddings, sem busca semântica
- Parser e ranking 100% determinísticos
- Last Write Wins (LWW) para sincronização
- Soft delete via `deleted_at` (nunca DELETE físico)
- UUID gerado no cliente (`crypto.randomUUID()`)
- RLS obrigatório em todas as tabelas
- CHECK constraints em campos numéricos e enums textuais
- Sem testes automatizados no MVP (validação manual diária)
- ESLint default do Vite, sem Prettier

---

# Como atualizar a documentação

- `STATUS.md` e `DECISIONS.md` são vivos — atualize conforme o trabalho avança
- Documentos estáticos só mudam em casos específicos:
  - `ARCHITECTURE.md`: quando schema SQL muda ou nova tabela é criada
  - Demais: praticamente nunca durante o MVP
- Em caso de conflito entre documentos, ordem de prevalência:
  `STATUS.md` → `DECISIONS.md` → `ARCHITECTURE.md` → `PRD.md` → demais

A ordem de prevalência é fixa e não pode ser alterada sem decisão explícita em `DECISIONS.md`.

---

# Padrões operacionais

- Datas: `YYYY-MM-DD` (ISO 8601)
- Commits: `feat:`, `fix:`, `chore:`, `docs:`
- Chaves de localStorage: prefixo `secretario-task:`
- Vocabulário de operações: `'insert' | 'update' | 'delete'` (alinhado entre `sync_log.operation` e `PendingMutation.operation`)
