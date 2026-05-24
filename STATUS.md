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
- [ ] `vercel.json` com rewrite SPA criado
- [ ] Fluxo de login funcional (magic link via Supabase)
- [ ] Estrutura inicial com Zustand 5
- [ ] Persistência local via `zustand/middleware/persist`
- [ ] `taskStore.ts` com geração de UUID no cliente (`crypto.randomUUID()`)
- [ ] `contextStore.ts` com contexto ativo e energia atual
- [ ] `authStore.ts` (não persistida)
- [ ] Layout base da aplicação
- [ ] Captura offline básica via input simples
- [ ] Estrutura base de rotas (React Router 7)
- [ ] Schema `tasks` aplicado no Supabase (com `due_at`, `deleted_at`, CHECK constraints)
- [ ] Schema `task_events` aplicado no Supabase (com CHECK constraint em `type`)
- [ ] Schema `sync_log` aplicado no Supabase
- [ ] Trigger `updated_at` em `tasks`
- [ ] Políticas RLS aplicadas nas três tabelas

---

# Próximo passo concreto

Criar `vercel.json` com rewrite SPA, implementar a autenticação via magic link do Supabase e estruturar o estado base com Zustand (`authStore.ts`, `taskStore.ts`, `contextStore.ts`).

---

# Bloqueios em aberto

Nenhum.

---

# Histórico de sprints concluídos

Nenhum sprint concluído ainda.
