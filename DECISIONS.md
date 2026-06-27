# DECISIONS.md — SecretárioTask

Última atualização: 2026-06-27
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

## 2026-05-12 — Método de autenticação: magic link (email OTP) ⚠️ REVISADO em 2026-05-26
~~Decisão: autenticação via magic link do Supabase (`supabase.auth.signInWithOtp`). Usuário insere e-mail, recebe link, clica e está logado. Sem senha.~~
Esta decisão foi revogada. Ver entrada de 2026-05-26 abaixo.
Contexto original: pré-Sprint 1. Bloqueante identificado na auditoria de 2026-05-12.

## 2026-05-26 — Método de autenticação revisado: e-mail e senha

Contexto: a decisão original (2026-05-12) especificava magic link,
mas a implementação real (Sprint 1) usou signInWithPassword.
O código nunca implementou signInWithOtp em nenhum momento.

Decisão: manter e-mail e senha como método oficial.
Motivo: uso pessoal de app operacional — senha é mais ágil,
sem dependência de chegada de e-mail, alinhado com P1 (execução
acima de tudo). Magic link aumentaria fricção no uso diário.
Supabase configurado: Email provider Enabled, Confirm email ON.

Impacto: nenhum no código. Apenas documentação atualizada.
BUG-010 encerrado como won't fix — decisão de produto intencional.

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

## 2026-06-27 — Sprint 12-B: encerramento do congelamento do behaviorEngine

Decisão: remover `src/lib/behaviorEngine.ts` e retirar a renderização de `BehavioralSuggestion` em `Home.tsx`.
Motivo: o módulo cumpriu o papel de rede de segurança durante a migração; o motor real agora é `src/lib/coachSignals.ts`, puro e coberto por fixtures no `npm run test`.
Alternativas descartadas: manter o arquivo congelado indefinidamente — descartada por confundir manutenção futura; reativar `BehavioralSuggestion` — descartada porque exigiria novo gate de produto e qualidade de dado.
Contexto: Coach de Produtividade, Sprint 12-B — BUG-03.

## 2026-06-27 — Sprint 12-B: idempotência por migration aditiva 0019

Decisão: criar `0019_idempotent_source_constraints.sql` para adicionar as constraints de `estimated_minutes_source` e `actual_minutes_source` somente quando não existirem em `pg_constraint`.
Motivo: a migration `0017` já foi aplicada e não deve ser editada; uma migration aditiva preserva o histórico e melhora a robustez em ambientes reconstruídos.
Alternativas descartadas: editar a `0017` já aplicada — descartada por quebrar rastreabilidade; remover e recriar constraints — descartada por ser desnecessário e mais arriscado.
Contexto: Coach de Produtividade, Sprint 12-B — BUG-04.

## 2026-06-27 — Sprint 12-B: dívida conhecida da migration 0016

Decisão: documentar que a `0016_task_events_expand_stamp.sql` descobre a constraint de `task_events.type` por substring da definição, o que é frágil.
Motivo: a `0016` já está aplicada e não deve ser reaberta; a correção futura desejada é localizar a constraint por nome/padrão mais robusto, como `conname LIKE 'task_events_%check%'`, ou por uma convenção explícita em nova migration.
Alternativas descartadas: editar a `0016` já aplicada — descartada por preservar histórico; criar correção agora sem necessidade operacional — descartada para manter o sprint focado.
Contexto: Coach de Produtividade, Sprint 12-B — BUG-07.

## 2026-06-27 — Sprint 12-B: cache de IA apenas por sessão

Decisão: manter o cache de IA governada como `Map` em memória, apenas por sessão do navegador, sem persistência em `localStorage` ou Supabase.
Motivo: o cache evita rechamada idêntica durante a sessão sem criar novo dado persistido, sem privacidade adicional a governar e sem migration.
Alternativas descartadas: persistir cache no browser — descartada por ser feature nova de privacidade/dados; persistir no Supabase — descartada por exigir schema e política de retenção.
Contexto: Coach de Produtividade, Sprint 12-B — P-03.

## 2026-06-27 — Sprint 12-A: legado rotulado em conclusões por área

Decisão: manter conclusões `legacy_approx` no agregado "Conclusões por área" e adicionar rótulo curto informando que a seção inclui histórico aproximado anterior ao saneamento.
Motivo: conforme v4 §4.2, métricas de volume podem incluir legado porque a contagem total não depende do horário fino; o problema é tratar esse histórico frágil como padrão temporal ou conclusão confirmada sem aviso.
Alternativas descartadas: trocar `completedTasks` por `confirmedCompletedTasks` — descartada por remover dado real de volume; ocultar todo o histórico legado — descartada por empobrecer a leitura histórica; deixar sem aviso — descartada por manter ambiguidade visual apontada pela auditoria.
Contexto: Coach de Produtividade, Sprint 12-A — hotfix pós-auditoria BUG-01.

## 2026-06-26 — Sprint 1 Coach: updated_at não é conclusão

Decisão: `updated_at` não deve ser tratado como data/hora de conclusão. A sugestão comportamental foi desativada temporariamente e os blocos do Dashboard que ainda dependem de `status='done' + updated_at` passaram a ser rotulados como aproximação por edição.
Motivo: `updated_at` muda em qualquer edição posterior da tarefa e, portanto, não representa execução concluída. Enquanto `completed_at` não existir, recomendações baseadas nesse campo podem orientar ação com dado falso.
Alternativas descartadas: manter a sugestão ativa com aviso textual — descartada porque ela recomenda uma tarefa específica; esconder todo o Dashboard — descartada porque métricas que não dependem de horário de conclusão continuam úteis; criar `completed_at` já neste sprint — descartada porque schema entra somente no Sprint 2.
Contexto: Coach de Produtividade, Sprint 1 — Fase 0: Contenção imediata.

## 2026-06-26 — Sprint 2 Coach: completed_at e legado legacy_approx

Decisão: adicionar `tasks.completed_at` e `tasks.completed_at_confidence` como timestamp honesto mínimo de conclusão. Tarefas antigas `status='done'` recebem backfill com `completed_at=updated_at` marcado como `legacy_approx`; novas conclusões gravam `completed_at_confidence='confirmed'`.
Motivo: métricas de horário precisam de um campo semanticamente estável. O legado ainda pode preservar volume histórico, mas não deve alimentar padrão de horário porque nasceu da mesma aproximação por edição que originou o problema.
Alternativas descartadas: marcar backfill como `confirmed` — descartada por transformar aproximação em verdade; criar evento retroativo `completed` — descartada por fabricar histórico auditável falso; implementar `resolution_type` junto — descartada porque pertence ao Sprint 3.
Contexto: Coach de Produtividade, Sprint 2 — Fase 1A: Timestamp honesto mínimo.

## 2026-06-26 — Sprint 3 Coach: resolução sem deleted_at

Decisão: modelar encerramentos sem execução com `resolution_type IN ('cancelled','delegated','obsolete')` e `resolved_at`, mantendo `completed_at` nulo e preservando `deleted_at` exclusivamente para exclusão/remoção.
Motivo: cancelada, delegada e obsoleta precisam sair das listas operacionais sem desaparecer da análise. `deleted_at` remove a tarefa do store e do histórico local, portanto não serve para semântica de resolução.
Alternativas descartadas: ampliar `TaskStatus` — descartada por tocar Kanban, ranking, recorrência, sync e constraints; usar `deleted_at` para cancelamento — descartada por apagar o dado analítico; tratar cancelada como `done` — descartada por contaminar métricas de produtividade.
Contexto: Coach de Produtividade, Sprint 3 — Fase 1B: Semântica de resolução.

## 2026-06-26 — Sprint 3 Coach: recorrência viva exclui resoluções sem execução

Decisão: recriar o índice parcial `idx_unique_live_recurrence` para excluir tarefas com `resolution_type IN ('cancelled','delegated','obsolete')` da definição de ocorrência viva, e alinhar o helper local `isOpenTask` à mesma regra.
Motivo: como `TaskStatus` permanece `todo/doing` em resoluções sem execução, o índice antigo (`status <> 'done'`) bloquearia a próxima ocorrência recorrente após cancelar/delegar/obsoletar uma instância.
Alternativas descartadas: deixar a série bloqueada até ação manual — descartada por quebrar recorrência; marcar a instância resolvida como `done` — descartada por contaminar conclusão; usar `deleted_at` — descartada pela decisão acima.
Contexto: Coach de Produtividade, Sprint 3 — Fase 1B: Semântica de resolução.

## 2026-06-26 — Sprint 4 Coach: eventos server-stamped

Decisão: `task_events.created_at` passa a ser forçado no banco por trigger `BEFORE INSERT`, e o cliente deixa de enviar `created_at` em eventos.
Motivo: eventos auditáveis precisam de carimbo temporal independente do relógio do dispositivo. O padrão anterior enviava `created_at` do cliente para `viewed`, reintroduzindo clock skew.
Alternativas descartadas: confiar apenas em `DEFAULT now()` — descartada porque clientes antigos ou bugs futuros ainda poderiam enviar `created_at`; manter timestamp de cliente como fonte — descartada pelo mesmo problema que motivou o saneamento de `updated_at`.
Contexto: Coach de Produtividade, Sprint 4 — Fase 1C: Eventos confiáveis.

## 2026-06-26 — Sprint 4 Coach: eventos best-effort

Decisão: eventos operacionais (`started`, `completed`, `reopened`, `postponed`, `resolved`, além de `viewed`) são enfileirados como mutations separadas e nunca bloqueiam a operação principal da tarefa.
Motivo: captura, iniciar, concluir, adiar, resolver e sync de tarefas são caminho crítico. Observabilidade é importante, mas não pode impedir execução diária.
Alternativas descartadas: gravar evento de forma síncrona antes da operação principal — descartada por criar fricção e dependência de rede; ignorar eventos em caso offline — descartada porque a fila local já permite sincronização posterior.
Contexto: Coach de Produtividade, Sprint 4 — Fase 1C: Eventos confiáveis.

## 2026-06-26 — Sprint 5 Coach: origem obrigatória para novos tempos

Decisão: toda nova escrita de `estimated_minutes` ou `actual_minutes` deve acompanhar a origem em `estimated_minutes_source` ou `actual_minutes_source`.
Motivo: estimativas por IA, fallback fixo, parser, edição manual e timer têm confiabilidades diferentes. Misturar esses dados sem origem impediria qualquer métrica honesta no Dashboard e qualquer diagnóstico futuro.
Alternativas descartadas: confiar no valor bruto de minutos — descartada porque 30 minutos podem significar fallback, retorno de IA ou decisão manual; adiar a origem para o diagnóstico — descartada porque o dado já estaria contaminado antes da análise.
Contexto: Coach de Produtividade, Sprint 5 — Fase 1D: Origem dos dados.

## 2026-06-26 — Sprint 5 Coach: legado sem inferência artificial de estimativa

Decisão: `estimated_minutes_source` de estimativas antigas permanece `NULL` quando não há evidência da origem. `actual_minutes_source` legado é `timer` quando há `started_at`, e `unknown` quando há `actual_minutes` sem `started_at`.
Motivo: estimativas antigas podem ter vindo de IA, default ou ajuste manual, e o valor em si não prova a origem. Tempo real antigo, por outro lado, só era calculado pelo app a partir de `started_at` quando essa âncora existe.
Alternativas descartadas: marcar todo `estimated_minutes=30` como `default_30` — descartada porque a IA também pode retornar 30; marcar todo tempo real antigo como `timer` — descartada quando falta `started_at`; apagar ou recalcular tempos antigos — descartada por reescrever histórico fora do escopo.
Contexto: Coach de Produtividade, Sprint 5 — Fase 1D: Origem dos dados.

## 2026-06-26 — Sprint 6 Coach: teto plausível de timer em 8 horas

Decisão: timer aberto por mais de 8 horas é tratado como suspeito. O valor calculado de `actual_minutes` é preservado, mas `actual_minutes_source` passa a ser `unknown`.
Motivo: o plano oficial indicava um limite plausível com exemplo de 8 horas, sem fixar outro valor. Esse teto evita transformar um `started_at` esquecido em trabalho confiável e mantém o dado disponível para auditoria futura.
Alternativas descartadas: bloquear a conclusão — descartada por quebrar execução diária; truncar o tempo em 8 horas — descartada por reescrever o fato bruto; confiar em qualquer intervalo — descartada por contaminar métricas futuras.
Contexto: Coach de Produtividade, Sprint 6 — Fase 2: Ajustes nos fluxos existentes.

## 2026-06-26 — Sprint 6 Coach: reabertura limpa remove tempo do ciclo anterior

Decisão: reabrir uma tarefa limpa conclusão, resolução, `started_at`, `actual_minutes` e `actual_minutes_source`, preservando apenas o histórico em `task_events`.
Motivo: uma tarefa reaberta volta ao estado operacional aberto. Manter tempo real do ciclo anterior faria a tarefa aberta continuar influenciando leituras de tempo e poderia contaminar uma nova conclusão sem timer.
Alternativas descartadas: limpar apenas `completed_at`/`resolved_at` — descartada por deixar tempo antigo grudado na tarefa atual; apagar eventos antigos — descartada por destruir trilha auditável; criar um novo status — descartada por violar a regra de não alterar `TaskStatus`.
Contexto: Coach de Produtividade, Sprint 6 — Fase 2: Ajustes nos fluxos existentes.

## 2026-06-26 — Sprint 6 Coach: motivo de adiamento opcional

Decisão: `blocker_type` é opcional. Adiar sem motivo grava `NULL`; adiar com motivo grava um dos valores controlados.
Motivo: captura e reagendamento precisam continuar rápidos. A ausência de motivo é informação incompleta, não erro operacional.
Alternativas descartadas: exigir motivo para todo adiamento — descartada por aumentar fricção; texto livre sem constraint — descartada por prejudicar agregações futuras; criar tabela separada de motivos — descartada por complexidade desnecessária neste sprint.
Contexto: Coach de Produtividade, Sprint 6 — Fase 2: Ajustes nos fluxos existentes.

## 2026-06-26 — Sprint 7 Coach: Dashboard com qualidade textual, sem score

Decisão: o Dashboard exibe confiabilidade como blocos textuais e contagens segmentadas, nunca como nota ou score único.
Motivo: fontes como IA, fallback, legado aproximado e tempo real desconhecido têm confiabilidades diferentes. Agregar tudo em uma nota criaria falsa precisão e poderia virar gamificação de produtividade.
Alternativas descartadas: criar percentual único de qualidade — descartada por simplificar demais sinais distintos; esconder dados frágeis — descartada porque a incerteza precisa ficar visível; tratar `legacy_approx` como confirmado — descartada por repetir o problema de `updated_at`.
Contexto: Coach de Produtividade, Sprint 7 — Fase 3A: Dashboard confiável mínimo.

## 2026-06-26 — Sprint 7 Coach: BehavioralSuggestion permanece desativado

Decisão: manter `BehavioralSuggestion` retornando `null` no Sprint 7, mesmo com Dashboard corrigido.
Motivo: o pedido do sprint exige manter a sugestão desativada e não criar diagnóstico comportamental novo. A reativação depende de um gate futuro com massa suficiente de dados confirmados e motor determinístico próprio.
Alternativas descartadas: reativar com o `behaviorEngine` atual — descartada por antecipar Sprint 8; reativar com aviso textual — descartada porque ainda recomendaria ação antes do motor diagnóstico; remover o componente — descartada por manter compatibilidade e facilitar gate futuro.
Contexto: Coach de Produtividade, Sprint 7 — Fase 3A: Dashboard confiável mínimo.

## 2026-06-26 — Sprint 7 Coach: adiamento sem motivo é dívida de dado

Decisão: tarefas adiadas sem `blocker_type` aparecem no Dashboard como "Adiadas sem motivo informado".
Motivo: ausência de motivo não prova procrastinação, bloqueio ou falha comportamental; é apenas incompletude de dado.
Alternativas descartadas: classificar adiamento sem motivo como comportamento ruim — descartada por criar diagnóstico antes do Sprint 8; esconder adiamentos sem motivo — descartada por perder sinal operacional; exigir motivo retroativo — descartada por aumentar fricção.
Contexto: Coach de Produtividade, Sprint 7 — Fase 3A: Dashboard confiável mínimo.

## 2026-06-26 — Sprint 8 Coach: runner mínimo sem dependência nova

Decisão: criar `npm run test` para fixtures do motor usando apenas `tsc` e `node`, sem instalar Vitest/Jest ou qualquer dependência nova.
Motivo: o pedido do Sprint 8 autorizou o menor arranjo possível quando não houvesse script de testes e exigiu parar antes de adicionar dependência nova. O projeto não tinha runner instalado; usar TypeScript e Node atende ao gate sem expandir a stack.
Alternativas descartadas: instalar Vitest — descartada por exigir aprovação humana explícita; validar manualmente sem comando — descartada porque deixaria as fixtures menos reprodutíveis; reaproveitar build do Vite — descartada porque o motor deve ser testado separado da UI.
Contexto: Coach de Produtividade, Sprint 8 — Fase 4: Motor determinístico testável.

## 2026-06-26 — Sprint 8 Coach: motor puro com now injetável

Decisão: o motor `analyzeCoachSignals` recebe `tasks`, `events` e `now` por parâmetro e não acessa UI, Supabase, localStorage, rede, IA ou relógio global.
Motivo: diagnósticos/sinais precisam ser reproduzíveis por fixtures. Dependência implícita de relógio, store ou rede tornaria o resultado instável e difícil de auditar.
Alternativas descartadas: ler direto do Zustand — descartada pela amostra parcial de 100 tasks; consultar Supabase dentro do motor — descartada por misturar coleta e regra; usar `Date.now()` internamente — descartada por quebrar determinismo.
Contexto: Coach de Produtividade, Sprint 8 — Fase 4: Motor determinístico testável.

## 2026-06-26 — Sprint 8 Coach: sinais, não julgamento psicológico

Decisão: o motor retorna sinais operacionais com evidências e confiança, sem score global, julgamento de personalidade ou narrativa motivacional.
Motivo: o objetivo é transformar dados honestos em sinais objetivos. Afirmações psicológicas exigiriam inferência que o dado atual não sustenta e pertencem a sprints/narrativas posteriores, com governança.
Alternativas descartadas: criar score de produtividade — descartada por falsa precisão e gamificação; emitir frases motivacionais — descartada por antecipar IA narrativa; classificar adiamento como procrastinação — descartada por confundir dívida de dado com comportamento.
Contexto: Coach de Produtividade, Sprint 8 — Fase 4: Motor determinístico testável.

## 2026-06-26 — Sprint 9 Coach: IA consome payload governado

Decisão: o briefing com IA passa a receber um payload governado com tarefas acionáveis mínimas, sinais determinísticos do motor local, limitações e política de dados, em vez de histórico bruto completo.
Motivo: a IA existente deve narrar sinais operacionais já calculados, sem ganhar autoridade para diagnosticar, usar `updated_at` como conclusão ou misturar dados frágeis como se fossem confiáveis.
Alternativas descartadas: enviar todas as tarefas brutas para o prompt — descartada por exposição desnecessária e risco de inferência indevida; deixar o prompt antigo apenas com top tasks — descartada por não carregar limitações de `legacy_approx`, `unknown` e encerramentos sem execução; implementar cache/input_hash agora — descartada por pertencer ao Sprint 10.
Contexto: Coach de Produtividade, Sprint 9 — Fase 5A: Governança da IA existente.

## 2026-06-26 — Sprint 9 Coach: linguagem proibida bloqueia resposta da IA

Decisão: respostas de IA com termos diagnósticos ou julgamentos pessoais são substituídas por fallback determinístico cauteloso.
Motivo: sanitizar palavra por palavra poderia preservar a estrutura de uma afirmação forte indevida. Substituir a resposta inteira reduz o risco de julgamento psicológico, score implícito ou conclusão forte sem evidência.
Alternativas descartadas: apenas instruir o prompt — descartada porque prompt não é garantia; remover só palavras proibidas — descartada porque a frase restante ainda poderia carregar julgamento; falhar com erro na UI — descartada porque IA deve ser opcional e não-bloqueante.
Contexto: Coach de Produtividade, Sprint 9 — Fase 5A: Governança da IA existente.

## 2026-06-26 — Sprint 10 Coach: cache local em memória para narrativa IA

Decisão: cachear a narrativa governada do briefing em memória no cliente, usando `input_hash` + versões de prompt e guardrails como chave.
Motivo: o plano oficial não prevê migration no Sprint 10. Cache em memória evita rechamadas repetidas na mesma sessão sem persistir payloads, respostas ou metadados sensíveis em banco ou `localStorage`.
Alternativas descartadas: cache remoto — descartado por exigir migration fora do plano; cache em `localStorage` — descartado por persistir narrativa e metadados além do necessário; não cachear fallback — adotado para não transformar falhas transitórias ou respostas bloqueadas em resposta válida.
Contexto: Coach de Produtividade, Sprint 10 — Fase 5B: IA narrativa cacheada e segura.

## 2026-06-26 — Sprint 10 Coach: input_hash versionado e sem updated_at

Decisão: o `input_hash` é derivado de versões, energia, janela temporal horária, top tasks governadas, sinais determinísticos e limitações, sem incluir `updated_at`.
Motivo: a entrada semântica do briefing deve mudar quando muda o conteúdo relevante ou o contrato de interpretação, mas não quando muda um campo técnico de edição que não é conclusão.
Alternativas descartadas: hash do payload JSON bruto — descartado porque incluiria `generated_at` minuto/segundo e poderia variar por ordem acidental; hash só das tasks — descartado porque ignoraria limitações, sinais e versões; hash da resposta da IA — descartado porque o cache deve evitar a chamada, não depender dela.
Contexto: Coach de Produtividade, Sprint 10 — Fase 5B: IA narrativa cacheada e segura.

## 2026-06-26 — Sprint 11 Coach: fechamento sem feature nova

Decisão: fechar a evolução Coach de Produtividade com ajustes documentais e checklist global, sem alterar código funcional nem criar migration.
Motivo: a auditoria final não encontrou violação estrutural nos invariantes do plano. Corrigir apenas a documentação desatualizada preserva o escopo do Sprint 11 e evita introduzir risco no fechamento.
Alternativas descartadas: reativar `BehavioralSuggestion` — descartada por exigir gate próprio de produto; persistir cache de IA — descartada por ser feature nova; criar sprint corretivo imediato — descartada porque não houve violação que justificasse.
Contexto: Coach de Produtividade, Sprint 11 — Auditoria final e fechamento.

## 2026-06-26 — Sprint 11 Coach: limitações aceitas no estado final

Decisão: manter como limitações documentadas, não bugs de fechamento, o `completed_at` escrito pelo cliente, o LWW por registro, a amostra parcial do store local, o cache de IA apenas por sessão e a baixa confiabilidade quando campos opcionais não forem preenchidos.
Motivo: essas limitações já estavam previstas no plano v4 ou nas decisões anteriores e não violam os invariantes do Coach honesto. Resolver qualquer uma delas exigiria novo ciclo de produto/schema/sync, fora do Sprint 11.
Alternativas descartadas: tentar reconciliar `completed_at` por evento neste sprint — descartada por exigir desenho de backfill/consulta; trocar LWW por merge campo-a-campo — descartada por complexidade pós-MVP; persistir diagnóstico/cache — descartada por risco de privacidade e nova semântica.
Contexto: Coach de Produtividade, Sprint 11 — Auditoria final e fechamento.

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

## 2026-05-25 — Feedback visual de drag-and-drop na Agenda (Estilo C)
Decisão: Implementar o feedback de inserção visual linear (Estilo C — Linha de inserção destacada azul no topo com rótulo de horário do slot) e contraste de sobreposição cinza nos demais slots não-ativos durante o arrasto. O estado local `overSlotId` foi colocado em `Home.tsx` para sincronização, e o hook `useDndMonitor` do `@dnd-kit` foi colocado em `TimelineSlot` para identificar o status do drag sem re-renderizar todo o grid de horários.
Motivo: Fornecer excelente rastreabilidade e indicação visual precisa de onde a tarefa cairá ao soltar o mouse ou dedo no mobile. O uso de `useDndMonitor` dentro do subcomponente evita renders desnecessários no componente pai `TimelineView`, mantendo o desempenho excelente (tempo de resposta inferior a 16ms).
Alternativas descartadas:
- Estilo A (Borda Pontilhada) e Estilo B (Fundo Completo) — descartadas pois a linha horizontal no topo de inserção (Estilo C) é muito mais precisa e resolve melhor o problema de oclusão do dedo durante interações por toque no mobile.
- Colocar o estado de `isDragging` no componente pai — descartada por causar re-renderizações desnecessárias de todo o grid do dia durante as interações de drag.
Contexto: Hardening pós-auditoria de UX Mobile-First e melhorias críticas de usabilidade móvel.

## 2026-05-25 — Bloqueio de reagendamento em horários passados na Agenda
Decisão: Bloquear de forma síncrona o reagendamento de tarefas para slots que já venceram no dia de hoje, desabilitando o droppable nativamente no `@dnd-kit/core` (`useDroppable({ id, disabled: isPast })`). O horário de referência é capturado apenas uma vez no `onDragStart` (Zustand/local `dragStartTime` em `Home.tsx`) para garantir que os estados dos slots permaneçam estáveis durante o arrasto.
Motivo: Evitar erros de usabilidade onde o usuário acidentalmente agenda tarefas no passado histórico. O uso da propriedade `disabled` no `useDroppable` garante que o `@dnd-kit` nem sequer registre eventos de hover ou drop sob o slot vencido, forçando o card a retornar à origem ao soltá-lo. Capturar o tempo no início do drag impede re-avaliações dinâmicas e inconsistências visuais enquanto a tarefa está no ar.
Alternativas descartadas:
- Validar apenas no `handleDragEnd` final — descartada por não fornecer feedback estético prévio (o usuário continuaria visualizando a linha azul em slots passados, dando a entender que o drop seria aceito, para só depois receber um aviso ou ter a ação barrada).
- Recalcular a data a cada segundo (com `setInterval`) — descartada por causar re-renderizações e flutuações de estados de slots perto do limiar atual enquanto o usuário arrasta o card.
Contexto: Hardening pós-auditoria de UX Mobile-First e melhorias críticas de usabilidade móvel.

## 2026-05-26 — Hardening de sync e tabela `profiles`
Decisão: aplicar correções de sincronização para tombstones, zero-row updates, lock de processamento da fila, precondição de `updated_at` para updates offline e Realtime como complemento ao polling. Criar `profiles` para persistir a chave OpenAI na nuvem, removendo `aiApiKey` da persistência em localStorage.
Motivo: a auditoria de sync identificou perda silenciosa de deletes entre dispositivos, mutações tratadas como sucesso sem linha afetada e exposição local da chave OpenAI. A tabela `profiles` já era usada pelo código, mas não existia em migration.
Alternativas descartadas: manter a chave apenas em localStorage — descartada por exposição de segredo no browser; remover imediatamente todas as features de IA — descartada por fugir do escopo desta correção pontual.
Contexto: correções BUG-001, BUG-003, BUG-004, BUG-005, BUG-006, BUG-007, BUG-008, BUG-009, BUG-011. BUG-010 foi adiado por solicitação explícita do usuário.

## 2026-05-31 — Imutabilidade de `tasks.created_at` no trigger
Decisão: o trigger de atualização de tarefas força `NEW.created_at = OLD.created_at` antes de gravar qualquer `UPDATE`.
Motivo: `created_at` representa a criação original da tarefa e deve permanecer imutável mesmo se um cliente antigo, uma mutação offline ou uma operação manual enviar esse campo no payload. O banco é a última barreira de proteção para preservar a auditoria temporal.
Alternativas descartadas: confiar apenas na sanitização do cliente — descartada por não cobrir clientes desatualizados, bugs futuros ou operações diretas no banco; negar updates que enviem `created_at` — descartada por ser mais frágil operacionalmente e poder quebrar sync legado sem necessidade.
Contexto: implementação da migration `0007_created_updated_at_tasks.sql` e exibição discreta de criação/última edição das tarefas.

## 2026-06-05 — Duplo requestAnimationFrame para scroll âncora da Agenda
Decisão: Utilizar duplo `requestAnimationFrame` aninhado no lugar de `setTimeout` com tempo predeterminado (ex: 100ms) para disparar o `scrollIntoView` na montagem da view de Agenda (timeline).
Motivo: Um `setTimeout` com valor mágico resolve a race condition entre a hidratação da timeline e a atribuição da `ref` na maioria dos aparelhos rápidos, mas pode falhar (anchor falho) em devices lentos (Android de entrada) onde a pintura completa do layout demora. O duplo `rAF` não usa valor mágico, garantindo estritamente dois frames de renderização para que o alvo de scroll esteja 100% pronto na árvore DOM antes de repuxar a tela.
Alternativas descartadas: `setTimeout(..., 100)` — descartada para evitar valores temporais arbitrários que variam de aparelho para aparelho e que causam falhas de scroll intermitentes.
Contexto: Resolução do bug de "scroll/exibição da Agenda fixado no passado em vez de no presente".

## 2026-06-06 — createPortal para todos os overlays do app

Decisão: todos os modais, sheets e drawers do app (modal de edição da Agenda em `TimelineView`, `FocoSheet`, `MultiTaskConfirmModal`, `SettingsModal`, `CalendarWidget`) são montados via `createPortal(jsx, document.body)` com `z-[9999]`.
Motivo: o `<main>` do layout raiz tem `overflowX: clip` no estilo inline, o que cria um stacking context CSS independente. Qualquer overlay com `position: fixed` dentro desse contexto fica confinado a ele — a tab bar de navegação, que está no stacking context raiz com `z-50`, sempre ficava por cima do rodapé dos modais, cortando botões e conteúdo. O `createPortal` monta o overlay diretamente no `<body>`, escapando de qualquer stacking context intermediário.
Alternativas descartadas: remover `overflowX: clip` do `<main>` — descartada pois causaria overflow horizontal visível em mobile; usar `z-index` ainda mais alto sem portal — descartada pois o stacking context confina o z-index independentemente do valor.
Contexto: correção do problema crônico de modais cortados na parte inferior no mobile (06/06/2026).

## 2026-06-06 — RecurrenceRule como tipo auxiliar de UI, distinto de Task.recurrence_rule

Decisão: o tipo `RecurrenceRule` em `src/types/index.ts` é um union type auxiliar usado exclusivamente no estado do formulário de edição. O campo `Task.recurrence_rule` permanece tipado como `string | null` para compatibilidade com o `parser.ts`, que produz strings compostas dinâmicas (ex: `foundDays.join(',')`) que não fazem parte do union.
Motivo: tipar `Task.recurrence_rule` diretamente com o union causava erros `TS2322` no build da Vercel porque o parser atribui valores de dias individuais (`'monday'`, `'tuesday'`, etc.) e strings dinâmicas que não estão no union. A separação preserva a segurança de tipos na UI sem quebrar o parser existente.
Alternativas descartadas: ampliar o union para incluir todos os dias individuais — descartada por criar um union excessivamente longo e fraco semanticamente; usar `as RecurrenceRule` no parser — descartada por introduzir cast inseguro em código de produção.
Contexto: implementação do seletor visual de recorrência no modal de edição (06/06/2026).

## 2026-06-06 — Extração de lógica de recorrência para src/lib/recurrence.ts

Decisão: as constantes `WEEKDAY_PILLS`, `RECURRENCE_PRESETS` e as funções `toggleWeekday`, `togglePreset` e `getNextOccurrenceFromNow` foram extraídas de `TimelineView.tsx` para `src/lib/recurrence.ts` e importadas em ambos `TimelineView.tsx` e `TaskBoard.tsx`.
Motivo: evitar duplicação de lógica entre os dois editores de tarefa (Agenda e Kanban). A função `toggleWeekday` inclui promoção automática bidirecional: selecionar os 7 dias individualmente promove para `daily`; qualquer correção futura é herdada automaticamente pelos dois componentes.
Alternativas descartadas: copiar o bloco de UI sem extrair a lógica — descartada por criar dois pontos de manutenção divergentes.
Contexto: replicação do seletor de recorrência no Kanban (06/06/2026).

## 2026-06-06 — Sem reagendamento automático de due_at no Kanban ao mudar recorrência

Decisão: no editor inline do Kanban (`TaskBoard`), mudar a regra de recorrência não recomputa `due_at` automaticamente. O usuário ajusta o campo "Quando" manualmente se necessário.
Motivo: no Kanban, a edição é inline e imediata (sem botão Salvar explícito). Reagendar `due_at` automaticamente ao clicar numa pill seria inesperado e poderia sobrescrever um horário intencional. Na Agenda, o reagendamento é feito apenas ao clicar em "Salvar", onde a intenção é explícita.
Alternativas descartadas: reagendar automaticamente em ambos os editores — descartada pelo risco de sobrescrever horários intencionais no fluxo inline do Kanban.
Contexto: replicação do seletor de recorrência no Kanban (06/06/2026).

## 2026-06-07 — Recorrência server-authoritative: no máximo uma ocorrência viva por série

Decisão: o banco passa a ser a autoridade final sobre duplicação de tarefas recorrentes. Um índice único parcial `idx_unique_live_recurrence ON tasks(user_id, recurrence_origin_id) WHERE deleted_at IS NULL AND status <> 'done' AND recurrence_origin_id IS NOT NULL` garante que nunca haja mais de uma ocorrência viva da mesma série por usuário. Ao concluir uma tarefa recorrente, o cliente gera o clone e o insere — se outro dispositivo já inseriu primeiro, o banco retorna código `23505`, e o cliente descarta a mutation silenciosamente sem retry. O `recurrence_origin_id` agora aponta sempre para a raiz estável da série (self-reference na raiz), nunca para o pai imediato.
Motivo: antes, cada dispositivo gerava clones com UUIDs distintos ao concluir a mesma tarefa recorrente. O banco aceitava ambos porque não havia constraint de unicidade, e a deduplicação era feita apenas em memória local por uma heurística frágil (`deduplicateFunctionalTasks`) que produzia tombstones que nunca subiam ao servidor — cada device escondia um subconjunto diferente, causando contagens de blocos divergentes e badges "2x".
Alternativas descartadas: deduplicar no cliente após o merge remoto (abordagem anterior) — descartada por ser a causa ativa da divergência; unique constraint sem backfill — descartada por falhar em dados legados já duplicados.
Contexto: migrations `0010_recurrence_unique_series.sql` + correções em `taskStore.ts` e `sync.ts` (07/06/2026).

## 2026-06-21 — Formato estruturado JSON para regras de recorrência avançada (RecurrenceRuleV2)

Decisão: adotar JSON compacto serializado no campo TEXT existente `tasks.recurrence_rule` para suportar regras avançadas: intervalo customizável (a cada N dias/semanas/meses/anos), posição ordinal no mês (3o Sábado), horário, término por data ou contagem. O tipo `RecurrenceRuleV2` é detectado pelo prefixo `{` em `parseRecurrenceRule`. Strings sem esse prefixo continuam tratadas como regras legadas.
Motivo: colunas estruturadas exigiriam migration + down-time + retrocompatibilidade de schema em todos os dispositivos. O campo TEXT já existia e aceita JSON compacto sem mudança de schema. A serialização JSON é parseable e extensível sem migration futura.
Alternativas descartadas:
- Colunas separadas (`recurrence_interval`, `recurrence_byDay`, etc.) — descartada por exigir migration e reescrita do sync para novos campos.
- iCalendar RRULE como string (`RRULE:FREQ=MONTHLY;BYDAY=SA;BYSETPOS=3`) — descartada por exigir parser dedicado e adicionar lib de calendário.
- Substituir o tipo legado por V2 imediatamente — descartada por quebrar tarefas recorrentes ativas em produção.
Retrocompatibilidade: `parseRecurrenceRule()` detecta o formato. Regras legadas continuam no motor legado em `getNextLegacyOccurrence`. O modal mapeia `daily/weekly/monthly` para V2; `odd_days`, `even_days` e listas de dias abrem com defaults.
Contexto: modal de configuração avançada de recorrência (21/06/2026).

## 2026-06-07 — Optimistic locking por version no push (substitui guard updated_at)

Decisão: adicionada coluna `version integer NOT NULL DEFAULT 1` à tabela `tasks`. O `processSyncQueue` usa `.eq('version', baseVersion)` como árbitro de conflito no UPDATE, em substituição ao `.lte('updated_at', baseUpdatedAt)`. O `taskStore` grava `baseVersion: taskToUpdate?.version` em cada nova mutation de update; no merge de mutation existente, preserva a `baseVersion` da primeira leitura. O servidor incrementa `version` atomicamente via `set_updated_at()` (BEFORE UPDATE) — o trigger `tasks_set_updated_at` não foi recriado, apenas a função foi estendida com `NEW.version = OLD.version + 1`. O INSERT fixa `version = 1` via `set_timestamps_on_insert()` (BEFORE INSERT), impedindo injeção de valor arbitrário pelo cliente. Fallback de transição: mutations sem `baseVersion` (já estavam na fila antes do deploy) caem no comportamento antigo `.lte('updated_at')` — a janela fecha sozinha no primeiro `fetchRemoteTasks` pós-migration, que traz a coluna `version` via `.select('*')`.
Motivo: `updated_at` depende do relógio do cliente. Com clock skew entre devices, dois pushes da mesma tarefa podiam passar os dois pela cláusula `.lte`, causando sobrescrita silenciosa do estado mais recente. `version` é incrementada atomicamente pelo servidor e não tem relação com o relógio do cliente.
Alternativas descartadas: manter apenas o guard `updated_at` — descartada por não eliminar o resíduo de clock skew na janela de push; usar `xmin` do PostgreSQL — descartada por não ser exposto pelo Supabase JS client de forma confiável.
Contexto: migration `0013_task_version_optimistic_lock.sql` + tipos, `taskStore.ts` e `sync.ts` (07/06/2026).

## 2026-06-07 — Energia e contexto sincronizados via `profiles` com LWW por trigger

Decisão: `current_energy`, `active_context` e `energy_updated_at` foram adicionados à tabela `profiles`. O `contextStore` persiste `energyUpdatedAt` em localStorage. Em cada ciclo de sync (30s), `fetchProfileFromCloud` aplica o estado remoto por LWW estrito: só sobrescreve o local se `energy_updated_at` remoto for estritamente maior que o local. O push é feito por `pushEnergyToCloud` com debounce de 800ms após mudança de energia/contexto. Um trigger `BEFORE UPDATE` (`trg_profiles_energy_lww`) no banco descarta escritas com `energy_updated_at` mais antiga que a já gravada, fechando a janela de corrida de rede.
Motivo: `currentEnergy` vivia apenas no localStorage do `contextStore`, sem coluna no banco nem push/pull. Três dispositivos mostravam energias completamente diferentes (0/10 × 10/10) sem nenhum mecanismo de convergência.
Alternativas descartadas: `ON CONFLICT DO UPDATE WHERE energy_updated_at < excluded.energy_updated_at` via Supabase JS client — descartada porque o `.upsert()` do cliente não expõe a cláusula WHERE no conflito; delegar LWW apenas ao cliente — descartada por permitir regressão de energia em janela de corrida de rede.
Contexto: migrations `0011_profile_energy.sql` e `0012_profiles_energy_lww_trigger.sql` + correções em `contextStore.ts`, `sync.ts` e `App.tsx` (07/06/2026).

## 2026-06-06 — Correção dos 5 bugs de sincronização crônicos

Decisão: cinco bugs de sincronização foram corrigidos em `sync.ts` e `App.tsx`, com migration `0009` aplicada no banco em produção.
1. **Bug 1 — LWW update loop:** mutation descartada silenciosamente com `removeMutation + continue` quando `data` é null e `baseUpdatedAt` estava definido (servidor mais novo que o cliente).
2. **Bug 2 — Race condition fetchRemoteTasks:** flag module-level `isFetchingRemote` com guard no início da função e reset no `finally`.
3. **Bug 3 — Realtime sem reconexão:** `.on('system', { event: 'disconnect' }, ...)` (API inválida no Supabase JS v2) substituído por callback de status no `.subscribe((status) => {...})` com guard `visibilityState === 'visible'` e `setTimeout` de 2000ms.
4. **Bug 4 — Clock skew INSERT:** `stripReadonlyTaskFields` aplicado também no INSERT; trigger `BEFORE INSERT` (migration `0009_trigger_insert_updated_at.sql`) garante `created_at`/`updated_at` gerados pelo servidor.
5. **Bug 5 — Delete loop:** zero rows num delete descarta mutation silenciosamente (sem `baseUpdatedAt` condicional, pois zero rows num delete é sempre estado correto no servidor).
Motivo: esses bugs causavam perda de dados silenciosa, mutations zumbi na fila e falha de sincronização crônica entre PC e mobile.
Alternativas descartadas: force-merge no cliente quando servidor mais novo — descartada por sobrescrever dados mais recentes com dados obsoletos; throw no bloco delete — descartada por incrementar `retryCount` desnecessariamente e poluir o `sync_log`.
Contexto: diagnóstico profundo da camada de sync solicitado pelo usuário em 06/06/2026. Migration `0009` aplicada via SQL Editor do Supabase Dashboard em 06/06/2026.

## 2026-06-26 — Refinamento mobile hard-level orientado por auditoria de design

Decisão: aplicar a auditoria de design como refinamento operacional do app, preservando regras de dados/sync. A aba Hoje passa a priorizar execução com um bloco "Agora" baseado no Top 1 do ranking, concluídas ficam colapsadas por padrão, checkbox conclui diretamente, swipe à direita conclui e swipe à esquerda adia para amanhã. A barra de captura fica fixa apenas na aba Hoje e usa `visualViewport` para se manter acima do teclado virtual.
Motivo: reduzir competição visual no mobile, encurtar o fluxo da ação mais frequente (concluir/capturar) e evitar duas barras fixas empilhadas em Agenda/Painel. Isso mantém a captura rápida onde ela é central sem roubar altura de telas que são primariamente de consulta.
Padrões adotados: `ToastProvider` substitui `alert()` para feedback discreto; `EmptyState` padroniza vazios; linguagem de UI fica direta/profissional, sem emojis por padrão e com IA tratada como recurso avançado opcional; tokens Direction B continuam como base visual.
Alternativas descartadas: manter capture bar em todas as abas — descartada por ocupar espaço permanente em telas de consulta; transformar captura em FAB expansível nesta rodada — descartada por exigir mais estados/interações e aumentar risco de regressão; manter score/UUID na UI — descartada por expor telemetria interna ao usuário final.
Contexto: implementação do relatório de design mobile funcional solicitado em 26/06/2026.

## 2026-06-26 — Agenda mobile por gestos, não por parede de botões

Decisão: no mobile, os cards da Agenda exibem apenas a ação primária de concluir como círculo, um lápis discreto para abrir edição/ações completas e gestos laterais: swipe à direita adia para amanhã; swipe à esquerda solicita confirmação de exclusão. Ações secundárias completas ficam no modal de edição.
Motivo: a visualização anterior transformava cada tarefa em um bloco alto com muitos botões, reduzindo densidade, poluindo a hierarquia visual e destoando de referências maduras como Google Tasks. A nova direção prioriza leitura, escaneabilidade e ação principal imediata.
Alternativas descartadas: manter todos os botões sempre visíveis no mobile — descartada por aparência pesada e corte em telas estreitas; esconder tudo em menu de três pontos — descartada por tornar concluir e adiar lentos demais; excluir direto no swipe — descartada por risco de perda acidental.
Contexto: refinamento visual solicitado em 26/06/2026 após comparação direta com Google Tasks.

## 2026-06-26 — Design system premium de cores por tokens CSS

Decisão: centralizar a paleta visual em CSS variables (`--bg`, `--surface`, `--border`, `--ink`, `--accent`, `--success`, `--warning`, `--danger`) e fazer o Tailwind consumir esses tokens por `theme.extend.colors`. Os aliases legados (`canvas`, `paper`, `ink`, `line`, `ctx*`) permanecem por compatibilidade, mas passam a resolver para a nova paleta neutra. No escopo desta rodada, foram migrados Agenda, tab bar e slider de energia; Dashboard e demais telas ficam fora do escopo.
Motivo: reduzir o excesso de matizes e a sensação visual de template, removendo faixas laterais coloridas dos cards e concentrando cor forte apenas em acento, prioridades P6+ e estados reais de sucesso/perigo.
Alternativas descartadas: migrar todas as telas de uma vez — descartada por aumentar risco e fugir do escopo; manter cores de contexto por categoria — descartada por manter o efeito visual multicolorido; criar toggle manual de tema — descartada por ser feature nova fora da rodada.
Contexto: refinamento de paleta premium solicitado em 26/06/2026 após avaliação visual da Agenda mobile.

## 2026-06-26 — Dashboard migrado para tokens com exceção categórica controlada

Decisão: migrar o Dashboard para o design system tokenizado, lendo os tokens CSS no runtime para alimentar os gráficos Recharts. A única exceção deliberada de HEX fora de `src/index.css` fica concentrada em `CTX_COLORS`, com 7 cores categóricas para diferenciar contextos no donut e chips.
Motivo: eixos, grids, tooltips, barras e séries precisam acompanhar claro/escuro sem duplicar paletas hardcoded. Contextos, porém, são categorias nominais distintas; colapsar tudo em acento e cinza pioraria a leitura do donut.
Alternativas descartadas: manter as cores antigas hardcoded — descartada por quebrar o design system no dark mode; usar apenas `--accent` para todos os contextos — descartada por eliminar distinção visual entre categorias.
Contexto: migração final do Dashboard para o design system neutro em 26/06/2026.
