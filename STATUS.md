# STATUS.md — SecretárioTask

Última atualização: 2026-06-05

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

---

# Próximo passo concreto

Validar manualmente no celular real a âncora de scroll da Agenda: 
1. Abrir a Agenda e ver se rola pro slot atual.
2. Navegar para amanhã e voltar para hoje para testar o re-cálculo da âncora.
3. Adiar uma tarefa e verificar se o scroll permanece estável.

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
