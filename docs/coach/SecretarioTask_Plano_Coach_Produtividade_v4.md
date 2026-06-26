# SecretárioTask → Coach de Produtividade
### Plano Mestre de Evolução — v4.0

> **O que mudou da v3 para a v4:**
> 1. A v4 parte do **código real auditado**, não de hipóteses. Todos os achados da v3 foram revalidados linha a linha. Onde a v3 supôs, a v4 confirma ou corrige.
> 2. A v4 corrige a **stack documentada**: o `package.json` real usa Vite 8, TypeScript ~6.0 e React 19.2 — não "Vite 6 + TS 5". Documentos antigos perdem para o `package.json`.
> 3. A v4 expande o diagnóstico de `updated_at`: o uso indevido está em **dois** módulos (`behaviorEngine.ts` e `DashboardView.tsx`), atingindo os blocos "Esta semana", "hoje" e "Horário de pico" do dashboard, além da sugestão comportamental.
> 4. A v4 acrescenta **três riscos concretos que a v3 não mapeou**: (a) `estimateTaskTime` roda com `temperature: 0.3` e já grava `estimated_minutes` sem origem — IA não-determinística contaminando dado em produção; (b) `partialize` persiste apenas 100 tasks no localStorage, então o motor de diagnóstico local opera sobre amostra parcial; (c) a reabertura (`handleStatusRevert`) recompleta a tarefa recalculando `actual_minutes` a partir do `started_at` antigo, inflando o tempo.
> 5. A v4 redefine a **fonte de verdade do horário de conclusão**: em vez de inventar só um `completed_at` client-side (sujeito ao mesmo clock skew que motivou as migrations 0009/0013), adota um modelo de duas camadas — evento `completed` server-stamped como verdade temporal + `completed_at` denormalizado na `tasks` como cache de query.
> 6. A v4 **fragmenta a Fase 1** em 1A–1D com gates próprios, reduzindo o risco de migration grande demais.
> 7. A v4 define **semântica exata, política de backfill e regras de recorrência/sync** com nível operacional suficiente para gerar prompts Codex fase a fase.

---

## 1. Diagnóstico real do app

Validado contra `secretario-task-main` (estado de 2026-06-26).

### 1.1 Stack real (fonte: `package.json`)

| Item | Documentado antes | Real no `package.json` |
|---|---|---|
| React | 19 | `^19.2.6` |
| Vite | 6 | `^8.0.12` |
| TypeScript | 5 | `~6.0.2` |
| Tailwind | 3 | `^3.4.19` |
| Zustand | 5 | `^5.0.13` |
| Supabase JS | 2 | `^2.106.1` |
| React Router | 7 | `^7.15.1` |
| Recharts | — | `^3.8.1` |
| DnD Kit | — | `^6.3.1` |
| Lucide React | — | `^1.16.0` |

Scripts confirmados: `dev`, `build` (`tsc -b && vite build`), `lint` (`eslint .`), `preview`. Sem framework de teste instalado (sem Vitest/Jest). PWA via `vite-plugin-pwa`. Há `pg` e `dotenv` em dependências (scripts de migration locais).

Implicação para o plano: qualquer fixture de `diagnostics.ts` que dependa de um runner de teste **introduz uma dependência nova** (ver Fase 4). Isso precisa de decisão explícita, não pode ser assumido.

### 1.2 O coach já existe (confirmado)

Estão ativos e em produção: `DashboardView` (gráficos), `BehavioralSuggestion` (sugestão ativa), `ranking.ts` (determinístico), `briefing.ts` + `ai.ts` (briefing IA), `smartParser.ts` (parser IA com fallback determinístico), busca semântica (`match_tasks` + pgvector), estimativa de tempo (`estimateTaskTime`), botão Iniciar (`startTask`), e os campos `started_at`, `actual_minutes`, `estimated_minutes`, `postponed_count`, `version`.

Conclusão idêntica à v3: a v4 **saneia e governa um coach existente**, não constrói um do zero.

### 1.3 O problema central, com endereço exato

`updated_at` é tratado como data/hora de conclusão em:

- **`src/lib/behaviorEngine.ts`** — `analyzeBehavior` filtra `status === 'done'` e usa `new Date(t.updated_at).getHours()` para montar picos de energia. `getSuggestion` consome isso e gera a frase exibida em `BehavioralSuggestion`.
- **`src/components/DashboardView.tsx`** — três derivações:
  - `peakHourData`: `new Date(t.updated_at).getHours()` → bloco "Horário de pico / Maior conclusão".
  - `dailyData`: `new Date(t.updated_at)` para alocar conclusões nos últimos 7 dias → alimenta `weekTotal`, `todayCount`, as barras da semana e o donut "Esta semana".
  - Por consequência, "hoje: N" e "Esta semana: N concluídas" são derivados de horário de **edição**, não de execução.

O servidor agrava: a trigger `set_updated_at()` (migration 0013) força `NEW.updated_at = now()` e `NEW.version = OLD.version + 1` em **todo** UPDATE. Ou seja, qualquer edição posterior (mudar prioridade, adiar, corrigir título) reescreve o `updated_at` de uma tarefa já concluída. O dado é estruturalmente incapaz de representar conclusão.

### 1.4 Sugestão comportamental: confirmada como o vetor mais perigoso

`BehavioralSuggestion` está renderizado e ativo. Diferente do dashboard (passivo), ele **recomenda uma tarefa específica** ("Sugestão: ...") com base em `updated_at`. Enquanto a base for `updated_at`, a recomendação é ruído apresentado como padrão.

### 1.5 Iniciar/tempo: frágil e sem origem (confirmado e ampliado)

- `startTask` → `updateTask(id, { status: 'doing', started_at: now })`. Não cria evento. Não grava origem.
- `buildCompleteUpdates(task)` → `{ status: 'done', actual_minutes: round((now - started_at)/60000) }` **se** houver `started_at`. Não grava `completed_at`. Não cria evento `completed`. Não valida limite superior.
- **Achado novo (reabertura):** `handleStatusRevert` permite `done → doing → todo`. Ao recompletar, `buildCompleteUpdates` recalcula `actual_minutes` a partir do **`started_at` original**, que nunca é limpo. Uma tarefa reaberta horas depois produz `actual_minutes` inflado.
- **Achado novo (timer aberto):** não há teto. Iniciar às 9h e concluir às 17h grava ~480 min como tempo real, sem suspeita.

### 1.6 `postponed_count`: contagem sem causa (confirmado)

Incrementado em `handlePostponeTomorrow`/`handlePostponeDate` (TaskBoard e TimelineView). Exibido como "Adiada N×" e contado no card "Adiadas". Não há campo de motivo. É contagem, não interpretação.

### 1.7 `task_events`: vocabulário restrito e subutilizado (confirmado e ampliado)

- CHECK: `type IN ('created','updated','completed','viewed')`. `started`, `postponed`, `blocked`, `resolved`, `reopened` não cabem.
- **Achado novo:** na prática o cliente só grava o evento **`viewed`** (`recordViewEvent`). `created`/`updated`/`completed` **nunca** são emitidos pelo app hoje. A tabela existe mas está quase vazia de sinal útil.
- **Achado novo (carimbo):** o evento `viewed` sobe com `created_at: now` **gerado pelo cliente**. Não há trigger `BEFORE INSERT` em `task_events` forçando `now()` do servidor. Logo, hoje os eventos têm timestamp de relógio de device — o mesmo problema de clock skew que as migrations 0009/0013 corrigiram em `tasks`, mas **não** corrigido em `task_events`.

### 1.8 `deleted_at` é caminho sem volta para análise (confirmado)

`fetchRemoteTasks` faz `.select(TASK_COLUMNS)` (tombstones incluídos) e no final aplica `.filter(t => !t.deleted_at)`. Toda tarefa com `deleted_at` desaparece do store local e de qualquer view/dashboard/diagnóstico. Usar `deleted_at` para "cancelada/delegada/obsoleta" apagaria exatamente os dados que se quer analisar.

### 1.9 Sync e contratos rígidos (confirmado)

- `TASK_COLUMNS` é uma **string literal** em `sync.ts`. Campo novo não entra em SELECT/INSERT/UPDATE sem editar essa constante.
- `stripReadonlyTaskFields` remove **apenas** `created_at` e `updated_at`. Campos novos passam normalmente no payload.
- Optimistic lock: UPDATE usa `.eq('version', baseVersion)`. Conflito (zero rows com guard) → mutation **descartada silenciosamente** + `fetchRemoteTasks`. É LWW por descarte: o lado perdedor perde a mutation inteira, não há merge campo a campo.
- `partialize` persiste `tasks.slice(0, 100)` + mutations. **Achado novo:** o store local nunca tem mais de 100 tarefas; o histórico completo vive no Supabase. Qualquer cálculo "no cliente" sobre histórico é amostra parcial.

### 1.10 IA já influencia dado, sem origem (confirmado e endereçado)

- `estimateTaskTime` (`gpt-4o-mini`, **`temperature: 0.3`**) grava `estimated_minutes` no `addTask` (via `handleConfirmMultiTasks`). Não-determinístico e **sem** `estimated_minutes_source`.
- `parseMultipleTasks` (`smartParser.ts`, `temperature: 0.1`) infere `title/context/priority/energy/due_at/recurrence_rule`. Tem fallback determinístico (`parseTaskInput`) quando não há `apiKey`. Os campos inferidos por IA não carregam marca de origem.
- `generateEmbedding` roda dentro de `processSyncQueue` (insert/update) quando há `apiKey` — IA no caminho de sync, porém isolada em try/catch não-bloqueante.
- `generateSmartBriefing` (`temperature: 0`) gera texto efêmero, não persistido, **sem cache/`input_hash`**. Cada clique em "Briefing" refaz a chamada.

---

## 2. Problemas que a v3 ainda não resolveu completamente

1. **Stack desatualizada no plano.** A v3 herdou "Vite 6 + TS 5". O real é Vite 8 + TS 6. Corrigido aqui.
2. **`updated_at` mapeado de forma incompleta.** A v3 cita dashboard e behaviorEngine genericamente; a v4 nomeia as cinco derivações exatas (1.3).
3. **Reabertura tratada como detalhe.** A v3 lista "tarefas reabertas" como risco; a v4 mostra o mecanismo concreto (`handleStatusRevert` + `buildCompleteUpdates`) e o efeito (tempo inflado, resolução fantasma).
4. **`estimated_minutes` por IA não-determinística.** A v3 fala em governar IA; não aponta que o `estimated_minutes` em produção já é IA `temperature 0.3` sem origem. Isso é dívida de dado **existente**, não futura.
5. **Amostra parcial no cliente.** A v3 propõe `diagnostics.ts` "no cliente" sem notar o limite de 100 tasks do `partialize`. Diagnóstico de série/histórico precisa decidir entre rodar sobre amostra local ou puxar do Supabase.
6. **Carimbo de tempo dos eventos.** A v3 propõe eventos confiáveis, mas não trata que `task_events` aceita `created_at` do cliente sem trigger. Evento "confiável" exige carimbo server-side.
7. **`completed_at` client-side reintroduz clock skew.** A v3 sugere `completed_at` sem dizer quem carimba. Se for o cliente, herda o bug que 0009/0013 corrigiram. A v4 resolve com modelo de duas camadas (3.2).
8. **Conflito de conclusão sob LWW-por-descarte.** A v3 menciona "concluída num device, editada em outro" sem casar com o comportamento real do `sync.ts` (descarte total da mutation perdedora). A v4 trata isso explicitamente (5.4).
9. **Volume de campos.** A v3 propõe ~6 campos numa Fase 1. A v4 escalona em 1A–1D para não subir migration grande de uma vez.
10. **Mistura "qualidade do dado" com "produtividade".** A v3 alerta, mas não define a separação visual/estrutural. A v4 define o eixo de confiabilidade (3.4, Fase 3).

---

## 3. Modelo semântico v4

### 3.1 Princípio de divisão

Mantém-se a decisão da v3: **não** ampliar `TaskStatus`. `status` permanece `'todo' | 'doing' | 'done'` como estado operacional de Kanban/Timeline/ranking/recorrência. A semântica rica entra em **campos paralelos**, opcionais e majoritariamente invisíveis no início.

Justificativa reforçada pelo código: `TaskStatus` é consumido por DnD do Kanban, por `isActionableBriefingTask`, pelo ranking, pelo unique index de recorrência (`status <> 'done'`) e pela geração de clone recorrente (`updates.status === 'done'`). Ampliar o enum tocaria a migration 0010, o `taskStore`, o `sync` e três componentes. Custo desproporcional ao ganho.

### 3.2 Horário de conclusão — modelo de duas camadas

Este é o núcleo da v4.

- **Camada de verdade (auditável):** um evento `completed` em `task_events`, carimbado pelo **servidor** (`created_at DEFAULT now()`, com o cliente **não** enviando `created_at`). É a fonte temporal honesta da conclusão. Imutável por natureza (append-only).
- **Camada de cache (consulta rápida):** coluna `tasks.completed_at TIMESTAMPTZ NULL`, denormalização para dashboard/diagnóstico não precisarem agregar eventos a cada render.

Regra de preenchimento de `completed_at`:
- Preenchido **uma única vez**, na transição `status !== 'done' → 'done'`.
- Valor gravado pelo cliente no instante da conclusão (clock do device), **mas** tratado como aproximação reconciliável: o evento `completed` server-stamped é a referência canônica quando houver divergência relevante.
- **Não** é reescrito por edições subsequentes. Diferente de `updated_at`, é semanticamente estável.

Por que não só `completed_at` client-side: porque a conclusão pode ser gerada offline num device com relógio adiantado e sincronizar depois — exatamente o cenário que motivou as triggers de timestamp server-side. O evento server-stamped dá um âncora confiável; o `completed_at` na tabela dá performance.

### 3.3 Campos semânticos v4 (definição exata)

| Campo | Tipo | Obrigatório | Visível no início | Quando é preenchido |
|---|---|---|---|---|
| `completed_at` | `timestamptz null` | derivado | sim (substitui `updated_at` nas métricas) | na 1ª transição para `done` |
| `resolution_type` | `text null` CHECK in (`completed`,`cancelled`,`delegated`,`obsolete`) | opcional | não (fase posterior) | quando a tarefa sai de aberta por um caminho **não** de conclusão, ou junto da conclusão |
| `resolved_at` | `timestamptz null` | derivado | não | quando `resolution_type` é definido |
| `blocker_type` | `text null` CHECK in (`waiting_third_party`,`no_time`,`priority_changed`,`needs_split`,`dependency`) | opcional | não | opcionalmente, no ato de adiar |
| `actual_minutes_source` | `text null` CHECK in (`timer`,`manual`,`retroactive`,`unknown`) | opcional | não | sempre que `actual_minutes` for gravado |
| `estimated_minutes_source` | `text null` CHECK in (`default_30`,`manual`,`ai`,`parser`) | opcional | não | sempre que `estimated_minutes` for gravado |

#### Diferença exata `completed_at` × `resolved_at`

- `completed_at`: **só** existe se a tarefa foi efetivamente **feita**. É um subconjunto de `resolved_at`.
- `resolved_at`: instante em que a tarefa **deixou de estar aberta por qualquer motivo terminal** — concluída, cancelada, delegada ou obsoleta.
- Quando `resolution_type = 'completed'`: `resolved_at == completed_at` (mesmo instante). Conclusão é um tipo de resolução.
- Quando `resolution_type ∈ {cancelled, delegated, obsolete}`: `resolved_at` é preenchido, `completed_at` permanece **NULL**. A tarefa saiu do fluxo sem ter sido feita.

Regra mental: **toda** conclusão é uma resolução; nem toda resolução é conclusão. `completed_at` alimenta "produtividade"; `resolved_at` alimenta "vazão/encerramento".

#### Comportamento por evento

- **Reabrir** (`done → doing/todo`): `completed_at` e `resolved_at` são **zerados** (NULL) e o evento `reopened` é registrado. Justificativa: se a tarefa voltou a estar aberta, a conclusão anterior não é mais verdadeira; manter o carimbo produziria "concluída no passado, aberta no presente". O histórico da conclusão anterior **permanece** em `task_events` (append-only), então nada se perde para auditoria. Em paralelo, `started_at` deve ser **limpo** na reabertura para impedir o `actual_minutes` inflado (ver Fase 2).
- **Cancelar:** `resolution_type='cancelled'`, `resolved_at=now`, `completed_at=NULL`. `status` permanece `'todo'`/`'doing'` (a tarefa não foi feita) — a UI a remove das listas ativas por filtro semântico, não por `deleted_at`.
- **Delegar:** `resolution_type='delegated'`, `resolved_at=now`, `completed_at=NULL`. Opcionalmente um campo livre de "para quem" pode entrar **depois**; não é escopo de 1B.
- **Obsoleta:** `resolution_type='obsolete'`, `resolved_at=now`, `completed_at=NULL`.
- **Recorrente concluída:** ver seção 7. Resumo: cada instância tem seu próprio `completed_at`; a série não é "concluída".
- **Dados antigos (pré-migration):** ver seção 4.

#### Campos visíveis agora × invisíveis

- **Agora (Fase 1A/3):** apenas a troca de fonte das métricas para `completed_at`. Nenhum novo controle de UI.
- **Depois (Fase 1B+):** `resolution_type`/`blocker_type` entram como ações discretas, sem poluir a captura rápida. `*_source` são sempre invisíveis (telemetria interna de confiabilidade).

### 3.4 Eixo de confiabilidade (novo)

Toda métrica derivada carrega um nível de confiança computável e determinístico, baseado na origem do dado — não num "score". Exemplos de rebaixamento de confiança: `actual_minutes_source = 'unknown'`, `estimated_minutes_source = 'ai'`, `completed_at` ausente em tarefa `done` antiga (histórico frágil), `actual_minutes` acima de teto plausível. O dashboard exibe confiabilidade como rótulo textual, nunca como nota.

---

## 4. Estratégia de dados legados e backfill

Premissa: existem tarefas `status='done'` criadas antes dos novos campos. O `partialize` limita o cliente a 100 tasks, então o backfill **tem que rodar no banco** (migration/SQL), não no cliente.

### 4.1 Política de `completed_at` legado

- Tarefas `status='done'` e `deleted_at IS NULL` recebem `resolution_type='completed'`.
- `completed_at` legado é preenchido com `updated_at` **como aproximação explicitamente marcada**, nunca como verdade. Para isso a v4 adota `completed_at_confidence text` com valores `confirmed` (carimbado na conclusão real, pós-migration) e `legacy_approx` (derivado de `updated_at`).
- `resolved_at` legado = mesmo valor de `completed_at` (já que `resolution_type='completed'`).
- **Nenhum** evento `completed` retroativo é criado para legados. Eventos são append-only e server-stamped; fabricar evento histórico com timestamp falso contaminaria a camada de verdade. Legado vive só na tabela `tasks`, marcado como aproximação.

### 4.2 Exclusão de legado das métricas comportamentais

- O motor comportamental (picos de energia/horário) **ignora** linhas com `completed_at_confidence = 'legacy_approx'`. Horário aproximado por `updated_at` é justamente o dado que originou o bug; não pode alimentar sugestão de horário.
- Métricas de **volume** ("quantas concluídas") **podem** incluir legados, porque a contagem total não depende do horário fino — mas o dashboard separa visualmente "histórico" de "pós-saneamento" (Fase 3).

### 4.3 Separação no dashboard

Dois regimes de dado, rotulados:
- **Pós-saneamento** (`confidence='confirmed'`): alimenta horário de pico, padrão de execução, dias da semana.
- **Histórico frágil** (`confidence='legacy_approx'`): aparece apenas em contagens agregadas, com aviso textual de que o horário é aproximado.

### 4.4 Recorrentes antigas

Cada ocorrência concluída é uma **linha `done` independente** com `recurrence_origin_id` apontando para a raiz (garantido pela migration 0010). O backfill trata cada linha como tarefa individual — mesma regra de 4.1. Risco específico: não tentar "consolidar" a série; isso quebraria a contagem por instância. Ver seção 7.

---

## 5. Offline-first, sync e eventos

### 5.1 Entrada dos campos nos contratos

Ordem obrigatória para cada campo novo:
1. Migration SQL (coluna + CHECK + índice se necessário).
2. `TASK_COLUMNS` em `sync.ts` (a string literal) — sem isso o campo não é lido nem escrito.
3. `Task` e `TaskInput` em `src/types/index.ts`.
4. Conferir `stripReadonlyTaskFields`: hoje remove só `created_at`/`updated_at`. `completed_at`/`resolved_at`/`resolution_type` **devem passar** (são gravados pelo cliente). **Não** adicionar os novos campos à lista de strip.
5. Pontos de escrita (`taskStore.updateTask`, `buildCompleteUpdates`, handlers de postpone).

### 5.2 Pending mutations

Os campos novos viajam dentro de `payload` da `PendingMutation` como qualquer outro. `updateTask` já faz merge de mutation pendente existente; campos novos entram no merge sem alteração estrutural. Atenção: a lógica de merge preserva `baseVersion`/`baseUpdatedAt` da primeira mutation — isso continua correto.

### 5.3 Optimistic locking

`completed_at`/`resolved_at`/`resolution_type` são gravados via UPDATE comum, que dispara a trigger `set_updated_at()` (bump de `version`). Logo, concluir uma tarefa **incrementa version**. Consequência: uma conclusão e uma edição concorrente competem pelo mesmo `version`; o sync resolve por descarte do perdedor (5.4). Não há ação extra necessária no locking — o mecanismo existente cobre, desde que `completed_at` esteja em `TASK_COLUMNS`.

### 5.4 Conflito de conclusão entre devices

Cenário: device A conclui a tarefa (servidor vai de `version 5` para `6`, grava `completed_at`); device B, offline, editou o título com `baseVersion=5`.
- Comportamento atual do `sync.ts`: o UPDATE de B com `.eq('version', 5)` retorna zero rows (servidor já está em 6), a mutation de B é **descartada** e `fetchRemoteTasks` traz o estado reconciliado (concluída).
- Resultado: a conclusão de A vence; a edição de título de B se perde. Isso é aceitável para um app pessoal de um usuário em múltiplos devices (raramente edição concorrente real), mas precisa estar **documentado em DECISIONS.md** como comportamento esperado, não bug.
- Caso inverso (B conclui, A edita): simétrico. Quem sincronizar primeiro fixa `version`; o outro é descartado.
- `completed_at` gerado localmente: ao ser descartado o lado perdedor, o `completed_at` do vencedor (já no servidor) prevalece via `fetchRemoteTasks`. Não há "dois completed_at".

### 5.5 Eventos confiáveis (carimbo)

Para que `completed`/`started`/`reopened`/`postponed` sejam fonte temporal confiável:
- O cliente **não** envia `created_at` no payload do evento (corrigir o padrão atual do `viewed`, que envia `created_at: now`). Deixa o `DEFAULT now()` do servidor carimbar.
- Alternativa mais forte (recomendada como decisão): criar trigger `BEFORE INSERT` em `task_events` forçando `created_at = now()`, espelhando o que `tasks` já faz. Fecha a porta a clock skew de device de vez.
- Ordenação multi-device: como os eventos passam a ser server-stamped, `created_at` do servidor é suficiente para ordenar. Se no futuro houver necessidade de ordenação fina dentro do mesmo segundo, aí sim entram `client_event_at` (carimbo do device, informativo) e `device_id`/`local_sequence`. **Não** é escopo inicial — só registrar como extensão possível para evitar over-engineering agora.

### 5.6 Distinção de timestamps (vocabulário)

Para clareza nas próximas fases, fixa-se o vocabulário:
- `server_created_at`: `task_events.created_at` (DEFAULT now() do servidor) — verdade temporal.
- `client_event_at`: instante no device (hoje implícito, não persistido em coluna própria) — informativo, opcional.
- `completed_at` (tasks): cache denormalizado da conclusão, client-written, reconciliável.

---

## 6. Plano de evolução — fases revisadas

Cada fase tem entrada (o que tocar), saída (o que fica verdadeiro) e gate (critério de liberação em §9). Nenhuma fase mistura saneamento com novidade.

### FASE 0 — Contenção imediata do coach atual

Objetivo: parar a exibição de conclusões falsas **sem** migration, sem schema, sem campo novo. Reversível.

Tocar exatamente:
- **`src/components/BehavioralSuggestion.tsx`** — desativar a renderização (retornar `null` ou ocultar via flag), porque recomenda ação sobre `updated_at`. É o item mais perigoso.
- **`src/components/DashboardView.tsx`** — nos blocos que dependem de `updated_at` (peakHour, dailyData/weekTotal/todayCount), trocar o título/legenda para deixar explícito que é **aproximação por data de edição** enquanto `completed_at` não existe. Texto sugerido para o bloco de horário: "Horário de pico (aproximado por edição — em revisão)". Para "Esta semana": manter a contagem, mas rotular como "movimentações recentes", não "concluídas hoje".
- **`src/lib/behaviorEngine.ts`** — não apagar; deixar isolado e sem consumidor (já que `BehavioralSuggestion` desliga). Comentar no topo do arquivo que o módulo está congelado até `completed_at` (Fase 1A).

Manter visível (não mexer):
- Contagens que **não** dependem de `updated_at`: total de concluídas (filtro por `status='done'`), distribuição por contexto, "Estimado vs. real" (usa `estimated_minutes`/`actual_minutes`), prioridade média, card "Adiadas" (usa `postponed_count`).
- Kanban, Timeline, captura, ranking, briefing, busca, recorrência, sync — **nada** disso é tocado na Fase 0.

Registrar em `DECISIONS.md`: a decisão de tratar `updated_at` como não-conclusão, a desativação temporária da sugestão comportamental, e o rótulo de aproximação no dashboard. Referenciar este plano.

Validação: `npm run lint` e `npm run build` passam. Verificação manual: dashboard não exibe mais "concluídas hoje" derivado de edição como se fosse fato; sugestão comportamental não aparece.

Não fazer nesta fase: nenhuma migration, nenhuma coluna, nenhuma mudança em `TaskStatus`, nenhum evento novo, nenhum toque em sync.

### FASE 1A — Timestamp honesto mínimo

Objetivo: introduzir a verdade da conclusão com o menor schema possível.

- Migration: `ALTER TABLE tasks ADD COLUMN completed_at timestamptz NULL` + `completed_at_confidence text NULL CHECK (completed_at_confidence IN ('confirmed','legacy_approx'))`.
- Backfill (mesma migration ou subsequente): tarefas `status='done'` → `completed_at = updated_at`, `completed_at_confidence='legacy_approx'`. (Detalhe em §4.)
- `TASK_COLUMNS` += `completed_at, completed_at_confidence`. `Task`/`TaskInput` atualizados. Confirmar que não entram no strip.
- Escrita: `buildCompleteUpdates` passa a setar `completed_at = now()` e `completed_at_confidence='confirmed'` na 1ª transição para `done`.
- Leitura: `DashboardView` e (quando reativado) `behaviorEngine` passam a usar `completed_at` no lugar de `updated_at`, ignorando `legacy_approx` nas métricas de horário.

Gate: §9.

### FASE 1B — Semântica de resolução

Objetivo: distinguir feito de encerrado-sem-fazer.

- Migration: `resolution_type` (CHECK), `resolved_at timestamptz`. Backfill: `done` → `resolution_type='completed'`, `resolved_at=completed_at`.
- `TASK_COLUMNS`/tipos atualizados.
- Filtros: introduzir helper para "tarefa ativa" que exclui `resolution_type IN ('cancelled','delegated','obsolete')` das listas operacionais — **sem** usar `deleted_at`. Garantir que cancelada/delegada continue buscável e contável.
- UI mínima: ações "Cancelar/Delegar/Obsoleta" como itens discretos (não na captura). Tap target 44×44.

Gate: §9.

### FASE 1C — Eventos confiáveis

Objetivo: tornar `task_events` fonte temporal auditável.

- Migration: ampliar CHECK de `task_events.type` para incluir `started`, `completed`, `reopened`, `postponed` (e opcionalmente `resolved`). Adicionar trigger `BEFORE INSERT` carimbando `created_at = now()`.
- Cliente: parar de enviar `created_at` em eventos; emitir `completed` na conclusão, `started` no iniciar, `reopened` na reabertura, `postponed` no adiar. Eventos são best-effort (não bloqueiam a operação principal — P2).
- Conciliação: `completed_at` (cache) continua sendo a coluna de query; o evento `completed` é a verdade de auditoria.

Gate: §9.

### FASE 1D — Origem dos dados e governança de campos

Objetivo: marcar a procedência de todo dado influenciável por IA/timer.

- Migration: `actual_minutes_source` (CHECK), `estimated_minutes_source` (CHECK).
- Escrita:
  - `estimateTaskTime` → grava `estimated_minutes_source='ai'`. Fallback determinístico → `'default_30'` ou `'parser'`. Edição manual do stepper (`TaskBoard` ±15) → `'manual'`.
  - `buildCompleteUpdates` com `started_at` válido → `actual_minutes_source='timer'`. Sem `started_at` → não grava `actual_minutes` (ou `'unknown'` se houver entrada manual futura).
- Sem isso, o eixo de confiabilidade (§3.4) não tem base.

Gate: §9.

### FASE 2 — Ajustes nos fluxos existentes

Objetivo: corrigir os pontos de escrita que produzem dado frágil.

- **Reabertura:** em `handleStatusRevert`, ao sair de `done`, limpar `completed_at`, `resolved_at`, `resolution_type` **e** `started_at`; emitir evento `reopened`. Isso elimina o `actual_minutes` inflado e a resolução fantasma.
- **Teto de timer:** em `buildCompleteUpdates`, se `(now - started_at)` exceder limite plausível (decisão: ex. > 8h), gravar `actual_minutes` mas marcar suspeita (via `actual_minutes_source='unknown'` ou flag), para o diagnóstico rebaixar confiança em vez de tratar como real.
- **Adiar com motivo (opcional):** ao incrementar `postponed_count`, oferecer (sem obrigar) `blocker_type`. Captura rápida nunca é bloqueada.

Gate: §9.

### FASE 3 — Dashboard corrigido e qualidade do dado

Objetivo: dashboard honesto, com separação entre produtividade e qualidade do dado.

- Migrar todas as métricas de horário de `updated_at` → `completed_at` (`confidence='confirmed'`).
- Separar visualmente "pós-saneamento" de "histórico frágil" (§4.3).
- Reativar `BehavioralSuggestion` **apenas** se houver dado `confirmed` suficiente (gate de qualidade, não de tempo — §9), e rotulando explicitamente que é narração de regra determinística.
- Não criar "score de produtividade". Exibir confiabilidade como texto.

Gate: §9.

### FASE 4 — Motor determinístico testável

Objetivo: `src/lib/diagnostics.ts` puro, determinístico, com `now` injetável (padrão já usado em `datetime.ts`).

- Entrada: lista de tarefas + eventos; saída: diagnósticos rotulados com confiança. Sem IA, sem aleatoriedade (P2/P13).
- Decisão de teste a registrar em DECISIONS.md: a stack **não tem** runner de teste. Opções: (a) introduzir Vitest só para `diagnostics` (viola "sem teste no MVP" das regras críticas — exige justificativa forte); (b) fixtures como módulo `.ts` executável via `npm run` script ad-hoc; (c) validação manual com dataset fixo. A v4 recomenda (a) **restrito a `diagnostics.ts`**, porque é o único módulo cujo erro é silencioso e cuja correção depende de regressão — mas isso é decisão de Josemar, marcada como **A validar/decidir**.

Gate: §9.

### FASE 5 — IA governada e narrativa

Objetivo: a IA narra regra determinística; nunca origina diagnóstico.

- `generateSmartBriefing`: adicionar `input_hash` (hash do conjunto de top tasks + energia + janela temporal) para cachear e evitar rechamada idêntica; versionar o prompt; manter fallback determinístico (briefing já tem ordenação determinística em `getDailyBriefing`).
- A IA **não** ganha acesso a gerar `resolution_type`, `blocker_type` ou qualquer diagnóstico. Ela só verbaliza o que `ranking.ts`/`diagnostics.ts` já decidiram.
- `estimated_minutes` por IA permanece com `source='ai'` e confiança rebaixada; nunca vira verdade.
- Texto da IA deve declarar que está narrando a regra ("pelo ranking determinístico, ...").

Gate: §9.

---

## 7. Recorrência

Base confirmada no código: `recurrence_rule` (text, simples ou JSON V2), `recurrence_origin_id` (aponta para a **raiz** após migration 0010), unique partial index garantindo no máximo 1 ocorrência viva (`deleted_at IS NULL AND status <> 'done'`) por série, `computeNextRuleAndDate` + clone em `taskStore.updateTask`, modal de recorrência.

Regras v4:

- **Conclusão gera nova instância:** ao concluir uma recorrente (`status='done'`), o `taskStore` já cria um clone `todo` com `due_at` seguinte e `recurrence_origin_id` = raiz. A instância concluída vira uma **linha `done` própria**, com seu próprio `completed_at`. A série não é "concluída"; instâncias são.
- **Métrica por instância, não por série:** contagens de conclusão e horário de pico contam **cada instância** `done` individualmente. Nunca somar a série como uma unidade. Isso é natural no schema (cada instância é uma linha).
- **`postponed_count` por instância:** o adiamento é da instância corrente. **Não** carregar histórico da série para a nova instância — o clone nasce com `postponed_count` zerado (o clone em `updateTask` não copia `postponed_count`, confirmado). Diagnóstico de "tarefa cronicamente adiada" deve, se quiser visão de série, agregar via `recurrence_origin_id` no `diagnostics.ts`, marcando como métrica de série.
- **`resolution_type` da instância não afeta a série:** cancelar/delegar **uma instância** marca só aquela linha. Encerrar a série inteira é operação separada (não escopo de 1B; tratar como decisão futura sobre "parar recorrência").
- **Backfill de recorrentes antigas:** cada instância `done` legada recebe `completed_at=updated_at`/`legacy_approx` como qualquer tarefa (§4.4). Risco a evitar: não consolidar instâncias numa só; isso destruiria a contagem por ocorrência. O unique index só vale para vivas (`status <> 'done'`), então múltiplas `done` na mesma série coexistem corretamente.

---

## 8. Testes e fixtures obrigatórias

Cenários mínimos que `diagnostics.ts` deve cobrir (independente do mecanismo de execução decidido na Fase 4). Cada fixture é determinística com `now` fixo.

1. **Conclusão estável:** tarefa concluída e depois editada não muda `completed_at` (só `updated_at`/`version` mudam). Diagnóstico de horário usa `completed_at`.
2. **Cancelada fora da produtividade:** `resolution_type='cancelled'`, `completed_at=NULL` → não entra em "concluídas".
3. **Delegada não é conclusão:** `resolution_type='delegated'`, `completed_at=NULL` → fora de produtividade; pode entrar em "vazão/encerramento".
4. **Aguardando terceiro não é procrastinação:** adiada com `blocker_type='waiting_third_party'` → não classificada como dívida comportamental.
5. **Adiada 3× sem motivo:** `postponed_count>=3` e `blocker_type` NULL → sinaliza **dívida de dado** (falta de motivo), não diagnóstico comportamental.
6. **Timer aberto 8h:** `actual_minutes` > teto → confiança rebaixada (`source='unknown'`/suspeita), não entra como tempo real confiável.
7. **Recorrente não contamina série:** N instâncias `done` da mesma `recurrence_origin_id` contam como N conclusões individuais; nenhuma agrega a série como unidade.
8. **Reaberta limpa resolução:** tarefa reaberta tem `completed_at`/`resolved_at` NULL; evento `completed` antigo permanece em `task_events` (auditoria intacta), mas a tarefa não conta como concluída no presente.
9. **Legado é histórico frágil:** `completed_at_confidence='legacy_approx'` → fora das métricas de horário; só em contagem agregada rotulada.
10. **Baixa qualidade reduz confiança:** dataset com maioria `source='ai'`/`unknown`/`legacy_approx` → diagnóstico retorna confiança baixa, com aviso textual, sem produzir afirmação forte.

Nota operacional: como o cliente só persiste 100 tasks (`partialize`), fixtures que simulam "histórico longo" devem ser construídas como dados de entrada do próprio `diagnostics.ts` (função pura recebendo array), não dependendo do store. Diagnóstico de série/histórico que precise de todo o passado deve buscar do Supabase, não do localStorage — decisão a registrar.

---

## 9. Critérios de liberação por fase

- **Fase 0:** `lint`+`build` ok; sugestão comportamental não renderiza; rótulos de aproximação no dashboard; `DECISIONS.md` atualizado. Nenhuma migration aplicada.
- **Fase 1A:** migration aplica sem erro; backfill marca legados como `legacy_approx`; `completed_at` carimbado em novas conclusões; dashboard lê `completed_at`; `TASK_COLUMNS` inclui os campos; sync de uma conclusão volta com `completed_at` do servidor.
- **Fase 1B:** cancelar/delegar/obsoleta não usa `deleted_at`; tarefa resolvida some das listas ativas mas permanece buscável/contável; `completed_at` NULL para não-concluídas.
- **Fase 1C:** CHECK ampliado; trigger de carimbo ativo; eventos `completed`/`started`/`reopened`/`postponed` chegam ao servidor com `created_at` server-side; nenhuma operação principal bloqueia se o evento falhar.
- **Fase 1D:** todo `estimated_minutes`/`actual_minutes` novo carrega `*_source`; nenhuma escrita sem origem.
- **Fase 2:** reabertura limpa `completed_at`/`resolved_at`/`resolution_type`/`started_at`; timer acima do teto é marcado; adiar com motivo é opcional e não bloqueia captura.
- **Fase 3:** zero métrica de horário lê `updated_at`; "histórico frágil" separado de "pós-saneamento"; sugestão comportamental só reativa com massa de dado `confirmed` suficiente (definir limiar — ex. mínimo de conclusões `confirmed` por faixa horária), rotulada como narração de regra.
- **Fase 4:** `diagnostics.ts` puro, `now` injetável, sem IA; as 10 fixtures de §8 verdadeiras; decisão de runner registrada.
- **Fase 5:** briefing cacheado por `input_hash` e versionado; IA sem poder de originar diagnóstico/resolução; texto declara que narra regra determinística.

Gate transversal (vale para todas): nenhuma fase pode bloquear captura, edição, ranking, dashboard ou sync (P2). IA permanece opcional e não-crítica.

---

## 10. O que NÃO entra no plano

- Ampliação de `TaskStatus` (mantido `todo/doing/done`; semântica em campos paralelos).
- Uso de `deleted_at` para cancelada/delegada/obsoleta.
- `updated_at` como conclusão, em qualquer ponto.
- Score de produtividade ou gamificação.
- Push notification.
- Pomodoro.
- Time blocking automático.
- IA originando diagnóstico, resolução ou classificação comportamental.
- IA "consertando" dado ruim (dado frágil é rebaixado em confiança, não reescrito por IA).
- Eventos retroativos fabricados para legado (legado fica só na tabela `tasks`, marcado como aproximação).
- Múltiplos campos novos numa única migration grande (escalonado em 1A–1D).
- Ordenação fina por `device_id`/`local_sequence` agora (só registrada como extensão futura).

---

## 11. Limitações estruturais documentadas

1. **Amostra parcial no cliente.** `partialize` guarda 100 tasks. Diagnóstico de histórico longo/série depende de leitura do Supabase, não do store. Documentar para não produzir métrica enganosa "no cliente".
2. **LWW por descarte.** Conflito de conclusão entre devices descarta a mutation perdedora inteira; não há merge campo a campo. Aceitável para uso pessoal, mas é perda silenciosa — registrar em DECISIONS.md.
3. **`completed_at` client-written.** Mesmo com evento server-stamped como âncora, o cache `completed_at` nasce do relógio do device. Em offline com clock skew, há janela de aproximação até a reconciliação. O evento `completed` é o desempate.
4. **Sem runner de teste na stack.** Fixtures de `diagnostics.ts` exigem decisão sobre introduzir Vitest (contra "sem teste no MVP") ou validar por outro meio. Limitação real, não resolvível sem decisão de processo.
5. **IA não-determinística já em produção.** `estimateTaskTime` (`temp 0.3`) e `smartParser` (`temp 0.1`) produzem saída variável. A v4 contém o dano com `*_source` e confiança rebaixada, mas não torna a IA determinística — apenas a marca como tal.
6. **Eventos históricos inexistentes.** Como o app nunca emitiu `completed`, não há série temporal de conclusões antes da Fase 1C. Toda análise comportamental honesta começa do zero a partir do saneamento.
7. **Confiabilidade depende de adoção.** `resolution_type`/`blocker_type` são opcionais para não criar fricção. Se Josemar não usá-los, o diagnóstico permanece limitado a "feito/não feito/adiado" — por design, não por falha.

---

## 12. Próximo passo concreto

Executar a **Fase 0** (contenção sem schema):

1. Desativar a renderização de `BehavioralSuggestion`.
2. Em `DashboardView`, rotular como aproximação os blocos derivados de `updated_at` ("Horário de pico", "Esta semana"/"hoje"), mantendo intactas as métricas que não dependem de `updated_at` (total, contexto, estimado×real, prioridade, adiadas).
3. Congelar `behaviorEngine.ts` com comentário de bloqueio até a Fase 1A.
4. Registrar em `DECISIONS.md` a decisão sobre `updated_at`, a desativação da sugestão e os rótulos, referenciando este plano.
5. Validar com `npm run lint` e `npm run build`.

Fase 0 é reversível, não toca banco nem sync, e remove imediatamente a exibição de conclusões falsas — pré-condição para tudo o que vem depois. Só após o gate da Fase 0 abrir a migration de 1A.
