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

Sprint 2 — CRUD + Parser

## Observação
Iniciando a implementação do fluxo principal operacional de tarefas com parser determinístico local.

---

# Progresso dentro do sprint atual

Apenas iniciando.

## Checklist do Sprint 2 — CRUD + Parser
- [ ] CRUD completo de tarefas
- [ ] Edição de tarefas
- [ ] Exclusão de tarefas via soft delete (`deleted_at`)
- [ ] Todas as queries do app filtrando `WHERE deleted_at IS NULL`
- [ ] Parser local determinístico (`src/lib/parser.ts`) baseado em regras (priority, context, due_at)
- [ ] Board simples de visualização
- [ ] Context switch operacional
- [ ] Interpretação básica de prioridade e contexto

---

# Próximo passo concreto

Criar o `src/lib/parser.ts` com expressões regulares básicas para interpretar contexto, prioridade e `due_at` (hoje, amanhã, horários).

---

# Bloqueios em aberto

Nenhum.

---

# Histórico de sprints concluídos

- Sprint 1 — Fundação (concluído em 2026-05-23)
