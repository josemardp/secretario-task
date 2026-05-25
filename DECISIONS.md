# DECISIONS.md — SecretárioTask

Última atualização: 2026-05-12
Status: registro vivo de decisões técnicas e operacionais

---

# Objetivo deste arquivo

Registrar decisões técnicas e operacionais tomadas durante o desenvolvimento que NÃO estão cobertas pelos demais documentos preparatórios.

Cada entrada deve responder:
- **O que** foi decidido
- **Por que** foi decidido (motivo)
- **Quais alternativas** foram consideradas e descartadas
- **Quando** a decisão foi tomada

---

# Como usar

## Registre uma decisão quando
- escolher uma biblioteca ou abordagem não prevista nos documentos
- desviar deliberadamente de algo escrito (com motivo)
- resolver um trade-off técnico não trivial
- adotar um padrão de código novo

## NÃO registre
- bugs corrigidos (use `git log` ou STATUS.md)
- progresso de sprint (use STATUS.md)
- definições já presentes nos demais documentos preparatórios

## Formato de cada entrada

```
## YYYY-MM-DD — Título curto da decisão
Decisão: o que foi decidido, de forma direta.
Motivo: por que essa escolha foi feita.
Alternativas descartadas: o que foi considerado e por que não foi escolhido.
Contexto: sprint atual ou situação que motivou.
```

---

# Decisões consolidadas durante a preparação (2026-05-11 e 2026-05-12)

As decisões abaixo foram tomadas durante a auditoria e consolidação dos documentos preparatórios. Estão registradas aqui para rastreabilidade futura.

## 2026-05-11 — Remoção de `profiles` e `user_settings` do Sprint 1
Decisão: remover as tabelas `profiles` e `user_settings` do escopo do Sprint 1.
Motivo: o Supabase já fornece `auth.users` com dados básicos. Preferências locais cabem em `localStorage` via Zustand. Criar essas tabelas antecipadamente viola P2 (Simplicidade vence sofisticação).
Alternativas descartadas: manter as tabelas e adicionar schemas em ARCHITECTURE — descartada por adicionar complexidade sem necessidade operacional clara.
Contexto: pré-Sprint 1.

## 2026-05-11 — Mecanismo de persistência local
Decisão: usar `zustand/middleware/persist` com storage `localStorage`.
Motivo: alinhado com a stack já decidida (Zustand), zero dependência adicional, debugging trivial via DevTools, suficiente para o volume do MVP (~5MB limite confortável).
Alternativas descartadas:
- IndexedDB direto (idb-keyval, Dexie) — descartada por adicionar dependência sem necessidade no volume do MVP. Reservada para v1.1+ caso volume cresça.
- Decidir depois — descartada por deixar a primeira IA que tocar no projeto escolher por conta própria.
Contexto: pré-Sprint 1.

## 2026-05-11 — Sem testes automatizados no MVP
Decisão: MVP não inclui testes automatizados. ESLint apenas no default do Vite. Sem Prettier.
Motivo: validação manual diária é coerente com P8 (utilizável diariamente). Dev é solo, usuário único é o próprio dev. Adicionar testes agora vira manutenção sem retorno proporcional.
Alternativas descartadas:
- Vitest + Testing Library desde o Sprint 1 — descartada por antecipação prematura.
- ESLint + Prettier configurados sem testes — descartada para evitar configuração elaborada para dev solo.
Contexto: pré-Sprint 1. Testes entram no v1.1+ junto com features de maior risco (LLM, sync avançado).

## 2026-05-11 — Schema oficial de `sync_log` definido antes do Sprint 5
Decisão: especificar o schema de `sync_log` no ARCHITECTURE.md já na fase preparatória, antes do Sprint 5 começar.
Motivo: três documentos prometiam `sync_log` como entrega do Sprint 5 sem schema oficial, o que forçaria improviso durante a execução — violação direta de P5 (Previsibilidade obrigatória).
Alternativas descartadas: definir só quando chegar no Sprint 5 — descartada por já gerar dívida documental.
Contexto: auditoria pré-Sprint 1.

## 2026-05-11 — Foreign keys explícitas em todas as tabelas
Decisão: `tasks.user_id` referencia `auth.users(id) ON DELETE CASCADE`. `task_events` ganha `user_id` próprio + FKs para `tasks` e `auth.users`. `sync_log` segue mesmo padrão.
Motivo: RLS funciona sem FK, mas integridade referencial em nível de banco protege contra registros órfãos e simplifica políticas RLS (sem JOIN com `tasks` para verificar ownership de eventos).
Alternativas descartadas: deixar `user_id` solto em `task_events` e fazer JOIN no RLS — descartada por custo de consulta e fragilidade.
Contexto: auditoria pré-Sprint 1.

---

# Decisões da segunda auditoria (2026-05-12)

As decisões abaixo foram tomadas durante a segunda rodada de auditoria, que identificou bloqueantes e refinamentos técnicos não cobertos pela consolidação anterior.

## 2026-05-12 — Método de autenticação: magic link (email OTP)
Decisão: autenticação via magic link do Supabase (`supabase.auth.signInWithOtp`). Usuário insere e-mail, recebe link, clica e está logado. Sem senha.
Motivo: usuário único do MVP é o próprio dev; gestão de senha adiciona fricção sem ganho; OAuth Google exige configuração adicional no Supabase e Google Cloud; auth anônima dificulta migração para multi-usuário no pós-MVP.
Alternativas descartadas:
- Email + senha — descartada por fricção e necessidade de tela de recuperação de senha.
- OAuth Google — descartada por overhead de configuração no MVP solo.
- Autenticação anônima — descartada por dificultar acesso multi-dispositivo.
Contexto: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-12 — Campo `due_at` adicionado em `tasks`
Decisão: adicionar `due_at TIMESTAMPTZ NULL` na tabela `tasks` desde o Sprint 1. Campo é opcional (nullable) e populado pelo parser quando expressões temporais forem detectadas ("amanhã", "hoje", "depois de amanhã", "14h", etc).
Motivo: o parser do Sprint 2 interpreta datas relativas, mas sem campo destino o resultado ficaria em texto livre, impossibilitando o cálculo de `f_urgency` baseado em proximidade de prazo e o briefing diário ("tarefas para hoje").
Alternativas descartadas:
- Adicionar o campo só no Sprint 2 — descartada por exigir nova migração e retrabalho do `taskStore`.
- Guardar a data como texto em `description` — descartada por inviabilizar consultas SQL por prazo.
Contexto: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-12 — Soft delete via `deleted_at` em `tasks`
Decisão: adicionar `deleted_at TIMESTAMPTZ NULL` na tabela `tasks`. Todas as queries do MVP filtram `WHERE deleted_at IS NULL`. Exclusões marcam o campo em vez de remover o registro.
Motivo: LWW em nível de registro não resolve corretamente o caso "tarefa deletada em um dispositivo enquanto editada em outro". Sem tombstone, o registro reapareceria ao sincronizar. Soft delete é a solução mais barata e dentro do escopo enxuto.
Alternativas descartadas:
- Hard delete com tabela `task_tombstones` — descartada por adicionar tabela.
- Hard delete sem tombstone — descartada por risco de "ressurreição" de registros.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — Geração de UUID no cliente
Decisão: IDs de `tasks` são gerados no cliente via `crypto.randomUUID()` antes do insert. O `DEFAULT gen_random_uuid()` no schema permanece apenas como fallback para inserts manuais via dashboard Supabase.
Motivo: estratégia offline-first exige que a tarefa exista localmente (com ID estável) antes do sync. Gerar ID no banco quebra esse fluxo: a tarefa fica sem ID até sincronizar, dificultando referências locais (eventos, fila de mutações).
Alternativas descartadas:
- IDs temporários no cliente + reconciliação após sync — descartada por complexidade e necessidade de reescrever referências em cascata.
- Gerar ID só no banco — descartada por incompatibilidade com offline-first.
Contexto: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-12 — CHECK constraints em `priority`, `energy` e `task_events.type`
Decisão: adicionar `CHECK (priority BETWEEN 0 AND 10)`, `CHECK (energy BETWEEN 0 AND 10)` em `tasks`, e `CHECK (type IN ('created','updated','completed','viewed'))` em `task_events`.
Motivo: sem constraints, o banco aceita valores fora da escala documentada, quebrando a normalização do ranking e poluindo a observabilidade. As listas de valores válidos existiam apenas como comentários, sem enforcement.
Alternativas descartadas:
- Validar apenas no frontend — descartada por não proteger contra bugs futuros ou inserts via SQL direto.
- Converter `task_events.type` em ENUM PostgreSQL — descartada por dificultar adição de novos tipos no pós-MVP (CHECK é mais flexível).
Contexto: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-12 — Semântica de `f_energy`: proximidade, não magnitude
Decisão: `f_energy = 1 - |energy_tarefa/10 - energy_usuario/10|`. Quanto mais próximas a exigência da tarefa e a energia disponível do usuário, maior o score. `energy_usuario` vem do `contextStore` (campo `energiaAtual`, 0–10).
Motivo: a semântica original ("mapeamento direto de `energy` da tarefa") fazia tarefas mais exigentes subirem no ranking independentemente do estado do usuário, ignorando o `contextStore.energiaAtual`. Às 22h, cansado, o sistema priorizaria a tarefa mais cansativa — inversão prática do propósito.
Alternativas descartadas:
- Mapeamento direto de `energy` da tarefa (original) — descartada por inverter a intenção operacional.
- Penalizar tarefas com `energy > energy_usuario` — descartada por excluir tarefas válidas em vez de só reordená-las.
Contexto: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-12 — `f_urgency` combina `priority` e proximidade de `due_at`
Decisão: `f_urgency = (priority/10) * 0.6 + f_due * 0.4`, onde `f_due = 1` se a tarefa vence hoje ou está atrasada, escala linearmente até 0 conforme `due_at` se afasta (limite de 14 dias). Tarefas sem `due_at` usam apenas `priority/10`.
Motivo: a fórmula original considerava apenas `priority`, ignorando completamente o `due_at` adicionado nesta auditoria. Uma tarefa com `priority=5` vencendo hoje deve estar acima de uma tarefa com `priority=5` sem prazo.
Alternativas descartadas:
- Manter `f_urgency` baseado apenas em `priority` — descartada por desperdiçar o campo `due_at`.
- Criar `f_due` separado com peso próprio — descartada por exigir reabrir a fórmula oficial (0.4 + 0.2 + 0.2 + 0.2).
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — RLS de `sync_log` resolve contradição interna
Decisão: `sync_log` permite UPDATE via RLS, mas apenas para os campos operacionais `status`, `retry_count`, `last_error`, `synced_at`. Campos `entity_type`, `entity_id`, `operation`, `user_id`, `created_at` são imutáveis após o insert. Restrição garantida via trigger `BEFORE UPDATE`.
Motivo: a versão anterior do `ARCHITECTURE.md` tinha contradição interna — definia política UPDATE para `sync_log` e ao mesmo tempo afirmava que a tabela era "append-only sem UPDATE". UPDATE é necessário para o cliente marcar registros como sincronizados.
Alternativas descartadas:
- Append-only puro (sem UPDATE) — descartada por exigir tabela paralela de status.
- UPDATE irrestrito — descartada por permitir adulteração da fila.
Contexto: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-12 — Throttling de eventos `viewed`
Decisão: o briefing registra evento `viewed` no máximo uma vez por tarefa por dia (verificação local antes do insert: existe `viewed` para essa `task_id` com `created_at >= início do dia atual`?).
Motivo: sem throttling, abrir o app várias vezes ao dia gera dezenas de eventos `viewed` por tarefa por dia, poluindo a `task_events` (única fonte de observabilidade do MVP) e inviabilizando análise futura.
Alternativas descartadas:
- Registrar todo `viewed` — descartada por explosão de volume.
- Não registrar `viewed` — descartada por perder sinal sobre quais tarefas aparecem no briefing.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — Migração de `sync_log` antecipada para o Sprint 1
Decisão: aplicar a migração da tabela `sync_log` no Sprint 1, junto com `tasks` e `task_events`. O Sprint 5 passa a tratar apenas do **uso** da tabela (LWW, retry, observabilidade), não da criação.
Motivo: deixar migração para o Sprint 5 cria ambiguidade documental e força uma migração isolada no meio do desenvolvimento. Aplicar todas as tabelas de uma vez é mais simples operacionalmente e elimina dívida.
Alternativas descartadas:
- Migrar `sync_log` só no Sprint 5 — descartada por ambiguidade e custo operacional adicional.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — Versões pinadas da stack
Decisão: stack oficial do MVP fixada em React 19, Vite 6, TypeScript 5, Tailwind CSS 3 (mantendo `tailwind.config.ts`), Zustand 5, React Router 7, Supabase JS 2.
Motivo: em 2026, Tailwind 4 abandonou `tailwind.config.ts` em favor de CSS-first; sem pinar versão, o scaffold pode pegar Tailwind 4 por padrão e quebrar a documentação. Pinar versões mantém previsibilidade.
Alternativas descartadas:
- Pegar a versão mais recente de cada lib — descartada por imprevisibilidade.
- Migrar para Tailwind 4 — descartada para o MVP por mudança brusca de paradigma; revisão fica para v1.1+.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — Estrutura da fila offline de mutações (`PendingMutation`)
Decisão: o `taskStore` mantém uma fila local persistida de mutações pendentes com o formato:

```ts
type PendingMutation = {
  id: string                                  // UUID da mutação (não da tarefa)
  entity: 'task'                              // único valor no MVP
  operation: 'insert' | 'update' | 'delete'   // alinhado com sync_log.operation
  entityId: string                            // ID da tarefa afetada
  payload: unknown                            // snapshot do estado pretendido
  createdAt: string                           // ISO 8601
  retryCount: number                          // contador de tentativas
}
```

Motivo: sem fila persistida, mutações feitas offline são perdidas ao recarregar o app antes do sync. O vocabulário `'insert' | 'update' | 'delete'` é mantido alinhado com `sync_log.operation` para evitar tradução entre camadas.
Alternativas descartadas:
- Usar `'create' | 'update' | 'delete'` — descartada por divergir do schema SQL.
- Fila em memória — descartada por perda em refresh.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — `vercel.json` previsto desde o Sprint 1
Decisão: incluir `vercel.json` na raiz do projeto desde o Sprint 1, com rewrite SPA:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/" }] }
```

Motivo: React Router em SPA hospedado no Vercel falha em rotas profundas sem rewrite. Histórico interno (FinanceiroJe) registrou exatamente este tropeço operacional; deixar para resolver depois é dívida garantida.
Alternativas descartadas:
- Resolver só quando o problema aparecer em produção — descartada por previsibilidade do problema.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — Padrão mínimo de commits e formato de datas
Decisão: prefixos mínimos de commit `feat:`, `fix:`, `chore:`, `docs:`. Datas em todos os documentos seguem o formato ISO `YYYY-MM-DD`.
Motivo: padronização barata que evita decisões ad-hoc em cada commit e elimina ambiguidade de datas (DD/MM vs MM/DD).
Alternativas descartadas:
- Conventional Commits completo — descartada por overhead para dev solo.
- Sem padrão — descartada por inconsistência ao longo de 6 sprints.
Contexto: pré-Sprint 1. Refinamento identificado na auditoria de 2026-05-12.

## 2026-05-12 — Baseline consolidada após segunda auditoria
Decisão: aprovar a baseline da documentação para início do Sprint 1 após resolver os 4 bloqueantes (método de auth, `due_at`, contradição RLS, semântica de `f_energy`) e aplicar os refinamentos identificados.
Motivo: a auditoria de 2026-05-12 identificou que a baseline anterior tinha aprovação prematura — três bloqueantes técnicos e uma inversão semântica que impediriam o Sprint 1 de avançar sem retrabalho documental.
Alternativas descartadas: iniciar Sprint 1 com a baseline anterior — descartada por dívida documental retroativa garantida.
Contexto: pré-Sprint 1.

---

# Decisões durante o desenvolvimento

## 2026-05-24 — Extração de "energia" no Parser
Decisão: O parser agora extrai o campo `energia` através de palavras-chave (`energia alta|media|baixa`) ou prefixos explícitos (`e8`, `e2`), assim como faz com prioridade.
Motivo: Durante testes de validação, constatamos que sem a definição da energia individual da tarefa, o algoritmo do Ranking Engine aplicava penalidades idênticas a todas as tarefas simultaneamente ao mudar a Energia Atual (já que todas as tarefas nasciam com energy=0). Isso alterava a nota, mas não reordenava as tarefas. Extrair a energia via texto resolve o problema matematicamente.
Alternativas descartadas: Adicionar UI com inputs avançados — descartado para manter a filosofia "capture via texto livre" do MVP.
Contexto: Sprint 4.

## 2026-05-24 — Throttling de eventos `viewed` simplificado
Decisão: O throttling dos eventos diários `viewed` usa um dicionário local `Record<string, string>` mapeando `taskId` para a string da data de hoje (`YYYY-MM-DD`).
Motivo: Evita complexidade de lidar com timestamps, expirações ou banco de dados para uma trava efêmera. Atende perfeitamente ao requisito "1 por dia por tarefa".
Alternativas descartadas: Consultar o Zustand para contar quantos eventos já foram despachados hoje — descartado por ser ineficiente e propenso a falhas no re-render.
Contexto: Sprint 4.

## 2026-05-25 — Substituição de HTML5 Drag-and-Drop por @dnd-kit para suporte touch móvel na Agenda
Decisão: Substituir a API de Drag-and-Drop nativa do HTML5 no componente `TimelineView.tsx` por `@dnd-kit/core`. Os slots do grid e os cards de tarefa foram divididos em componentes funcionais auxiliares internos (`TimelineSlot` e `DraggableTaskCard`) para seguir as regras de Hooks do React e aplicar comportamentos de Toque de forma determinística e suave.
Motivo: A API nativa do HTML5 Drag-and-Drop não é compatível com dispositivos de toque (iOS/Android) sem polyfills complexos de terceiros. O `@dnd-kit` fornece suporte nativo a eventos de ponteiro (PointerEvents) e toque com atraso ajustável, fornecendo a melhor experiência móvel de Agenda. A divisão em subcomponentes foi necessária pois Hooks do React não podem ser chamados em loops (`map`).
Alternativas descartadas:
- HTML5 Drag-and-Drop com Polyfill móvel (mobile-drag-drop) — descartada por inflar dependências secundárias de inicialização e adicionar complexidade na interceptação de cliques e rolagem da página.
- Não oferecer drag-and-drop no móvel — descartada por violar as diretrizes de experiência de uso mobile-first da auditoria UX de 2026-05-25.
Contexto: Hardening pós-auditoria de UX Mobile-First e melhorias críticas de usabilidade móvel.
