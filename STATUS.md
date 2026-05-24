# STATUS.md — SecretárioTask

Última atualização: 2026-05-23

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

Sprint 1 — Fundação

## Observação
Os 10 arquivos de documentação foram consolidados em 2026-05-12 após auditoria técnica que identificou 10 ajustes bloqueantes/críticos. Todos os ajustes foram aplicados na baseline. Próximo passo é iniciar o Sprint 1.

---

# Progresso dentro do sprint atual

Iniciamos as configurações base (Scaffold do Vite, Tailwind, .env e inicialização do Git).

## Checklist do Sprint 1 — Fundação
- [x] Scaffold React 19 + Vite 6 + TypeScript 5
- [x] Tailwind CSS 3 configurado (`tailwind.config.ts`)
- [x] Projeto Supabase criado
- [x] `.env.example` criado e versionado
- [x] `.env` preenchido localmente (e adicionado ao `.gitignore`)
- [x] `vercel.json` com rewrite SPA criado
- [x] Fluxo de login funcional (magic link via Supabase)
- [x] Estrutura inicial com Zustand 5
- [x] Persistência local via `zustand/middleware/persist`
- [x] `taskStore.ts` com geração de UUID no cliente (`crypto.randomUUID()`)
- [x] `contextStore.ts` com contexto ativo e energia atual
- [x] `authStore.ts` (não persistida)
- [x] Layout base da aplicação
- [x] Captura offline básica via input simples
- [x] Estrutura base de rotas (React Router 7)
- [x] Schema `tasks` aplicado no Supabase (com `due_at`, `deleted_at`, CHECK constraints)
- [x] Schema `task_events` aplicado no Supabase (com CHECK constraint em `type`)
- [x] Schema `sync_log` aplicado no Supabase
- [x] Trigger `updated_at` em `tasks`
- [x] Políticas RLS aplicadas nas três tabelas

---

# Próximo passo concreto

Executar o arquivo `supabase/migrations/0001_initial_schema.sql` no SQL Editor do dashboard do Supabase para criar as tabelas `tasks`, `task_events`, `sync_log`, habilitar o RLS e configurar as políticas e triggers.

---

# Bloqueios em aberto

Nenhum.

---

# Histórico de sprints concluídos

Nenhum sprint concluído ainda.
