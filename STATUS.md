# STATUS.md — SecretárioTask

Última atualização: 2026-06-07

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

Uso Real e Monitoramento Pós-Auditoria

## Observação
Todos os épicos de refinamento de PWA e melhorias críticas de UX Mobile-First foram concluídos com sucesso absoluto. O app está consolidado nas melhores práticas de interfaces móveis e pronto para produção robusta.

---

# Progresso dentro do sprint atual

A auditoria de UX Mobile-First e o hardening do Progressive Web App (PWA) foram executados perfeitamente, resolvendo problemas de safe-area, auto-zoom no iOS Safari, compactação de telas menores de 384px, e hierarquias visuais da agenda e do Foco do Dia.
Foi aplicado também o ajuste operacional do Foco/TOP 3 para comportamento reativo em tempo real, com briefing sob demanda baseado no TOP 3 vigente no clique.
Foi implementado também o registro e a exibição discreta de `created_at`/`updated_at` nas experiências de edição e expansão de tarefas, com sync blindado para não enviar esses campos em `UPDATE`.
Foi corrigida a criação duplicada de tarefas recorrentes com guard idempotente por `recurrence_origin_id` e deduplicação funcional no merge remoto.
Foi corrigido o briefing para excluir tarefas concluídas, deletadas ou com horário anterior ao momento atual, incluindo reforço do contexto temporal no prompt inteligente.
Foi removida a duplicação da regra de tarefa acionável para briefing, centralizando o filtro em helper compartilhado.
Foi ajustada a barra de captura para expandir automaticamente com textos longos e preservar espaço inferior proporcional na tela.
Foi removido o drag-and-drop por toque dos cards da Agenda para priorizar a rolagem vertical natural em mobile.
Foi corrigida a hierarquia visual mobile para impedir que cards da Agenda cubram a barra de captura expandida.
Foi corrigida uma regressão de sync pós-auditoria: falha ao buscar `profiles` não bloqueia mais o ciclo de tarefas, e conflitos `23505` de recorrência removem a ocorrência local rejeitada pelo banco antes do novo pull remoto.

## Checklist
- [x] Pré-requisitos críticos (Viewport fit cover & PWA event listener cleanup).
- [x] Estilização de Safe areas dinâmicas em todos os elementos fixed e overlays de modais.
- [x] Prevenção de auto-zoom indesejado no iOS Safari com textarea ajustado para 16px (text-base).
- [x] Header super-compacto de 44px com data local e ciclos síncronos de contexto por toque.
- [x] Tab Bar inferior standalone fixa com safe-areas e ícones Lucide vetoriais (Kanban, Agenda, Stats).
- [x] Barra de digitação sticky no rodapé acima da Tab Bar e botão de gravação por voz com tap-target de 44x44px.
- [x] Hierarquia visual do Foco do Dia (Top 1 de 64px in destaque, Top 2/3 de 48px e metadados de tempo/duração).
- [x] Grade de 30min da Agenda otimizada com indicador de "agora" síncrono vermelho e compactação de slots vazios para 24px.
- [x] Definição de tokens de cores semânticas centralizados in tailwind.config.ts.
- [x] Substituição do Drag-and-Drop nativo do HTML5 por @dnd-kit em TimelineView.tsx para touch móvel.
- [x] Adicionado feedback visual linear de drag-and-drop (Estilo C - Trello/Linear) e contraste nos slots inativos na Agenda.
- [x] Implementado bloqueio nativo (useDroppable disabled) e esmaecimento para slots passados na Agenda.
- [x] Aplicado hardening de sync: tombstones, zero-row updates, lock da fila, Realtime, profiles, postponed_count e API key fora do localStorage. BUG-010 adiado por solicitacao explicita.
- [x] Migrations 0005 e 0006 aplicadas no Supabase.
- [x] Senha do banco rotacionada.
- [x] BUG-010 encerrado como won't fix — autenticação por e-mail e senha mantida intencionalmente (decisão registrada em DECISIONS.md).
- [x] Documentação alinhada com o código real (magic link → e-mail e senha).
- [x] Correção do Foco/TOP 3: tarefas sem `due_at` passam a entrar no Top 3; briefing permanece estático até clique e gera com o Top 3 atual.
- [x] Registro e exibição discreta de criação/última edição das tarefas com `created_at`/`updated_at`.
- [x] Correção visual da Agenda: cards de tarefas renderizam acima da linha vermelha de "agora".
- [x] Reposicionamento em tempo real de tarefas atrasadas na Agenda (tick de 30s) e encapsulamento em useAgendaPositions.
- [x] Correção temporal do briefing: tarefas concluídas e tarefas com horário passado não entram no Top 3 nem no briefing inteligente.
- [x] Centralização da regra de tarefa acionável para briefing em helper compartilhado.
- [x] Autoexpansão da barra de captura para visualizar textos longos antes de cadastrar tarefas.
- [x] Remoção do arraste por toque na Agenda para permitir rolagem vertical sobre cards e laterais.
- [x] Ajuste de z-index da barra de captura para ficar acima dos cards da Agenda.
- [x] Correção de UX: scroll automático para o horário atual ao abrir a Agenda (duplo requestAnimationFrame).
- [x] Todos os overlays corrigidos para mobile com `createPortal` + `z-[9999]`: modal de edição (Agenda), FocoSheet (Briefing/TOP 3), MultiTaskConfirmModal, SettingsModal e CalendarWidget — todos escapam do stacking context do `<main overflowX: clip>`.
- [x] Seletor visual de recorrência adicionado ao modal de edição da Agenda (TimelineView): pills de dias da semana + atalhos rápidos (Diario, Dias uteis, Semanal, Mensal, Impares, Pares).
- [x] Tipo `RecurrenceRule` criado em `src/types/index.ts` como tipo auxiliar de UI (distinto de `Task.recurrence_rule: string | null` para compatibilidade com o parser).
- [x] Lógica de recorrência extraída para `src/lib/recurrence.ts`: WEEKDAY_PILLS, RECURRENCE_PRESETS, toggleWeekday (com promoção automática para `daily` ao selecionar 7 dias), togglePreset, getNextOccurrenceFromNow.
- [x] Seletor de recorrência replicado no editor inline do Kanban (TaskBoard) importando de `recurrence.ts`.
- [x] `getNextOccurrence` no taskStore atualizado para suportar `odd_days` e `even_days`.
- [x] Reagendamento automático de `due_at` ao mudar regra de recorrência no modal da Agenda.
- [x] Bug 1 (sync): LWW update → loop infinito corrigido — mutation descartada silenciosamente quando servidor mais novo que `baseUpdatedAt`.
- [x] Bug 2 (sync): race condition em `fetchRemoteTasks` paralelos corrigido com flag module-level `isFetchingRemote`.
- [x] Bug 3 (sync): Realtime não reconectava após background — corrigido com callback de status correto no `.subscribe()` da API Supabase JS v2 (substituiu `.on('system', ...)` inválido).
- [x] Bug 4 (sync): clock skew no INSERT corrigido — `stripReadonlyTaskFields` aplicado também no INSERT + migration `0009` com trigger `BEFORE INSERT` aplicada no Supabase em produção (06/06/2026).
- [x] Bug 5 (sync): delete LWW → loop infinito corrigido — zero rows num delete descarta mutation silenciosamente com `removeMutation + continue`.
- [x] Recorrência server-authoritative: índice único parcial `idx_unique_live_recurrence(user_id, recurrence_origin_id)` bloqueia duplicatas no banco; `recurrence_origin_id` aponta sempre para a raiz estável (self-reference); `23505` tratado como conflito esperado sem retry; `deduplicateFunctionalTasks` removido. Migrations `0010`, `0011`, `0012` aplicadas em produção (07/06/2026).
- [x] Energia sincronizada: colunas `current_energy`, `active_context`, `energy_updated_at` adicionadas a `profiles`; `contextStore` persiste `energyUpdatedAt`; `fetchProfileFromCloud` e `pushEnergyToCloud` com LWW estrito; debounce 800ms no push; trigger `trg_profiles_energy_lww` fecha janela de corrida de rede.
- [x] Diagnóstico e correção de regressão de sync: `profiles` isolado do ciclo de tasks; conflito `23505` de recorrência limpa a cópia local rejeitada e refaz pull remoto.

---

# Próximo passo concreto

Validar o trio após o deploy:
1. Publicar a correção de sync e abrir PC + celular.
2. Criar uma tarefa simples em cada device → ambas devem aparecer no outro em até 30s.
3. Concluir a mesma tarefa recorrente em dois devices quase simultaneamente → deve sobrar uma próxima ocorrência.
4. Mudar energia num device → o outro reflete em até 30s.
5. Contagem de blocos idêntica nos 3 devices após um ciclo de sync.

---

# Bloqueios em aberto

Nenhum bloqueio em aberto.

---

# Histórico de sprints concluídos

- Sprint 1 — Fundação (concluído em 2026-05-23)
- Sprint 2 — CRUD + Parser (concluído em 2026-05-24)
- Sprint 3 — Ranking Engine (concluído em 2026-05-24)
- Sprint 4 — Briefing + UX (concluído em 2026-05-24)
- Sprint 5 — Sync + Hardening (concluído em 2026-05-24)
- Sprint 6 — Uso Real (encurtado, concluído em 2026-05-24)
- Sprint 7 — Trilha da Inteligência v1.1+ (concluído em 2026-05-24)
- Sprint 8 — Uso Real IA (concluído em 2026-05-24)
- Sprint 11 — Transformação em PWA Instalável (concluído em 2026-05-24)
- Sprint 14 — Dashboard Analítico Avançado (concluído em 2026-05-24)
- Sprint 15 — Automações de Recorrência (concluído em 2026-05-24)
- Sprint 16 — Calendário Mensal e Agenda (concluído em 2026-05-24)
- Sprint 17 — Mega-Refinamento de UX, Parser Offline e Grid Diário (concluído em 2026-05-24)
- Sprint 18 — Auditoria e Hardening UX Mobile-First (concluído em 2026-05-25)
