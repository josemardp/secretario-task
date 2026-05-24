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

Sprint 3 — Ranking Engine

## Observação
Implementar priorização determinística transparente e auditável, consumindo o `due_at` e a energia disponível do usuário.

---

# Progresso dentro do sprint atual

Apenas iniciando.

## Checklist do Sprint 3 — Ranking Engine
- [ ] Implementação de `src/lib/ranking.ts`
- [ ] Cálculo de `f_urgency` = `(priority/10) * 0.6 + f_due * 0.4`
- [ ] Cálculo de `f_energy` (consumindo `contextStore.energiaAtual`)
- [ ] Cálculo de `f_age`
- [ ] Cálculo de `f_context`
- [ ] Score final entre 0 e 1 e ordenação na listagem

---

# Próximo passo concreto

Adicionar o estado `energiaAtual` (0 a 10) no `contextStore.ts` com um seletor visual na UI para que o Ranking Engine possa consumir.

---

# Bloqueios em aberto

Nenhum.

---

# Histórico de sprints concluídos

- Sprint 1 — Fundação (concluído em 2026-05-23)
- Sprint 2 — CRUD + Parser (concluído em 2026-05-24)
