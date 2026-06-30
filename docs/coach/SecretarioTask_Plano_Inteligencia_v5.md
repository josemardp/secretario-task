# SecretárioTask — Da Métrica ao Sentido
## Plano de Inteligência v5 (Fases A → D)

> Baseline: coach-v4.3-hardening (main 7add939), Agenda como única view, Supabase alinhado até 0020. Este plano NÃO é sobre mais engenharia de dados — a fundação honesta já existe. É sobre o que fazer com ela: transformar registro em entendimento, sem violar nenhum princípio da v4 (determinismo no caminho crítico; IA narra, nunca origina diagnóstico; sem score; dado frágil rebaixa confiança, não vira afirmação forte).

---

## Diagnóstico que define a ordem

Estado real hoje (painel de 2026-06-27): 7 conclusões CONFIRMADAS, 510 legado de horário frágil, 91 tarefas paradas (45 abertas + 46 adiadas) SEM motivo informado, blocker_type zerado, estimativas majoritariamente sem origem ou legado.

Conclusão central: **o app ainda não tem o que aconselhar.** Qualquer inteligência construída sobre 7 pontos inventaria padrão — o pecado que a v4 inteira foi feita para evitar. Portanto a inteligência se constrói na ordem em que o DADO amadurece, não na ordem do desejo. Cada fase produz o combustível da próxima.

Princípio condutor: **registrar o motivo (A) → poder exportar a verdade (B) → espelhar padrões determinísticos (C) → opcionalmente narrar (D).** A IA é o último elo, opcional, e só verbaliza o que o determinístico já decidiu.

---

## Visão geral das fases

| Fase | Nome | Entrega | IA? | Depende de |
|---|---|---|---|---|
| A | Revisão Semanal | Ritual de 2-3 min que preenche blocker_type das paradas | Não | dado que já existe |
| B | Retrato Exportável | Export CSV + relatório textual dos campos honestos | Não | A rodando há ~2-4 semanas |
| C | Espelho Determinístico | coachSignals exibe padrões descritivos (não prescritivos) | Não | massa de dado confirmado + motivos (A+B) |
| D | Narração (opcional) | IA verbaliza os sinais de C; nunca origina | Sim, narrativa | C maduro e sentido de falta real |

Gate global: nenhuma fase usa updated_at como conclusão; nenhuma cria score; nenhuma coloca IA no caminho crítico; toda métrica declara confiabilidade.

---

## FASE A — Revisão Semanal (o coração de tudo)

### Objetivo
Um ritual curto e opcional em que o app mostra as tarefas que pararam (abertas há tempo / adiadas) e o usuário marca o blocker_type de cada uma: waiting_third_party, no_time, priority_changed, needs_split, dependency — ou "ainda relevante, só não fiz". Determinístico, zero IA.

### Justificativa
O campo blocker_type já existe no schema (migration 0018) e está zerado porque nada pede para preenchê-lo. As 91 paradas sem motivo não são problema de análise; são problema de captura de causa. Em ~4 semanas, este ritual converte "91 paradas misteriosas" em "91 paradas com causa" — o dado comportamental que nenhum analista externo consegue inventar, porque só o usuário sabe por que parou. O perfil do usuário (gosta de preencher/refletir) torna este o caminho de menor atrito, não o de maior.

### Escopo incluído
- Uma tela/visão "Revisão" acessível por ação discreta (não polui a Agenda nem a captura).
- Lista determinística das tarefas elegíveis: abertas sem resolução terminal e sem blocker_type, priorizando as mais adiadas / mais antigas. Reusar isOpenTask/isActiveTask de taskFilters; reusar postponed_count.
- Para cada tarefa: marcar blocker_type (um toque, 44x44), ou marcar "concluir/cancelar/delegar/obsoletar" ali mesmo reusando buildResolutionUpdates/buildCompleteUpdates de taskLifecycle.ts, ou "manter aberta".
- Opcional: emitir evento (ex.: 'reviewed' — exige ampliar CHECK de task_events por migration, best-effort) para datar a revisão. Avaliar se vale; pode ficar fora do MVP da fase.
- Frequência sugerida (semanal) é convite, não imposição: sem push, sem cobrança, sem streak/gamificação.

### Escopo excluído
- IA de qualquer tipo. Score. Push notification. Streak/gamificação. Diagnóstico. Nada que cobre o usuário.

### Arquivos prováveis
- Nova visão (ex.: src/components/WeeklyReview.tsx) acessível via Home; src/lib/taskFilters.ts (seletor de elegíveis); src/lib/taskLifecycle.ts (reuso de resolução/conclusão); src/stores/taskStore.ts (gravar blocker_type); possível migration 0021 se 'reviewed' event for adotado; docs.

### Riscos e mitigação
- Risco: virar fricção/cobrança (contra princípio 8). Mitigação: ritual opcional, sem push, encerrável a qualquer momento; "manter aberta" é resposta válida.
- Risco: lista grande demais desmotivar (91 itens). Mitigação: paginar / mostrar top N por prioridade de revisão; permitir parar no meio com progresso salvo.
- Risco: blocker_type sair do schema/contrato. Mitigação: já existe em 0018; garantir em TASK_COLUMNS e tipos.

### Critérios de aceite
- Marcar motivo de uma parada grava blocker_type e ela sai da fila de "sem motivo".
- Dashboard "Adiadas com motivo" deixa de ser 0 conforme o uso.
- Nenhuma fricção introduzida na captura/Agenda; lint/build/test verdes.

### Gate para a Fase B
Revisão usada por ~2 a 4 semanas, gerando massa mínima de blocker_type preenchido e de conclusões confirmadas reais (não ruído de teste). Sem isso, o export exporta vazio/ruído.

---

## FASE B — Retrato Exportável

### Objetivo
Botão de exportar o histórico honesto em formatos analisáveis fora do app: CSV (linha por tarefa) + um relatório em texto (markdown) com agregados já calculados deterministicamente. O usuário leva isso para terapeuta, mentor, ou cola numa IA externa de sua escolha.

### Justificativa
Mantém o app no papel que ele faz bem — fonte da verdade — e tira a IA do caminho crítico. É barato, respeita todos os princípios da v4, e dá ao usuário controle total sobre quando/como/por quem a análise é feita. Atende diretamente ao desejo "ter um retrato pra refletir sozinho/com terapeuta/mentor".

### Escopo incluído
- Export CSV dos campos honestos: id, title, context, status, resolution_type, completed_at, completed_at_confidence, resolved_at, blocker_type, postponed_count, estimated_minutes, estimated_minutes_source, actual_minutes, actual_minutes_source, created_at, recurrence_origin_id. (Sem dados sensíveis além do que o próprio usuário já vê.)
- Relatório textual (markdown) com agregados determinísticos: conclusões confirmadas por período/contexto/horário; paradas por blocker_type; adiamentos; qualidade do dado (confirmado vs legado vs sem origem). Os MESMOS números do Dashboard, em texto portável.
- Seletor de janela (ex.: últimos 30/90 dias / tudo) e opção de excluir legacy_approx do recorte.
- Tudo client-side, a partir do store/Supabase já carregado; sem servidor novo.
- Um "prompt de análise" pronto, gerado junto, que o usuário pode colar numa IA externa — instruindo a IA externa a tratar o dado com as MESMAS regras (legado é frágil, sem score, etc.).

### Escopo excluído
- IA dentro do app. Envio automático para terceiros. Telemetria. Qualquer coisa que saia do dispositivo sem ação explícita do usuário.

### Arquivos prováveis
- src/lib/reportExport.ts (geração CSV + markdown determinístico, função pura testável); ponto de UI no Dashboard/Settings para baixar; reuso das mesmas funções de agregação do DashboardView/coachSignals para garantir paridade de números; docs.

### Riscos e mitigação
- Risco: relatório e Dashboard divergirem nos números. Mitigação: extrair a agregação para uma fonte única reusada pelos dois (não recalcular à parte).
- Risco: exportar legado como se fosse confirmado. Mitigação: marcar confidence em cada linha; recorte opcional sem legado; o relatório declara a fração frágil.
- Risco: dado sensível. Mitigação: export local, sob ação explícita; nada sai sozinho.

### Critérios de aceite
- CSV e markdown gerados batem exatamente com os números do Dashboard.
- Legado claramente marcado; recorte sem legado disponível.
- Função de agregação compartilhada com o Dashboard (fonte única); testável; lint/build/test verdes.

### Gate para a Fase C
Export rodando e o usuário tendo, na prática, levado um retrato para análise externa pelo menos uma vez — confirmando que o ciclo "registrar → exportar → refletir" fecha antes de internalizar a análise no app.

---

## FASE C — Espelho Determinístico

### Objetivo
O coachSignals.ts (que já existe, puro e determinístico) passa a EXIBIR padrões DESCRITIVOS no app, agora que tem combustível: conclusões confirmadas suficientes + motivos preenchidos. Espelho, não conselho.

### Justificativa
É o desejo "entender meu comportamento" atendido da forma honesta. Padrões descritivos ("você conclui mais entre 14h-16h"; "contexto Esdra concentra 'aguardando terceiro'"; "tarefas sem prazo são as mais adiadas") são leitura de fato, não prescrição. A maioria dos usuários para felizmente aqui — um espelho honesto é mais raro e mais útil que um conselheiro tagarela.

### Escopo incluído
- coachSignals computa e o app exibe sinais descritivos rotulados com confiança: distribuição horária de conclusões confirmadas; blocker_type dominante por contexto; relação adiamento × ausência de prazo; contexto com mais encerramento-sem-execução.
- Cada sinal declara sua base de dados e confiança (princípio 10/14); sinais com base fraca aparecem como "dado insuficiente", não como afirmação.
- Gate de exibição por QUALIDADE do dado (não por tempo): um sinal só aparece com massa mínima de dado confirmado para aquela dimensão.

### Escopo excluído
- Prescrição ("você deveria..."). Score. Ranking de produtividade. IA. Comparação com outras pessoas.

### Arquivos prováveis
- src/lib/coachSignals.ts (novos sinais determinísticos + limiares de confiança); um componente de exibição (ex.: Insights na visão Painel); fixtures para cada novo sinal; docs.

### Riscos e mitigação
- Risco: descritivo escorregar para prescritivo. Mitigação: revisão de copy; sinais formulados como observação, nunca como ordem.
- Risco: inventar padrão com pouco dado. Mitigação: limiar de confiança por dimensão; "dado insuficiente" como estado de primeira classe.

### Critérios de aceite
- Cada sinal tem fixture; nenhum aparece abaixo do limiar de confiança; nenhuma frase prescritiva; lint/build/test verdes.

### Gate para a Fase D
O usuário conviveu com o Espelho e SENTIU FALTA de uma voz que o ajude a interpretar. Se não sentir, a Fase D não acontece — e está tudo bem.

### NOTA SOBRE O PROMPT DA FASE C
O prompt de implementação da Fase C é deliberadamente NÃO escrito agora. Motivo: os limiares de confiança e quais sinais valem a pena dependem de como o dado real se distribui após A+B. Escrever o prompt hoje seria projetar sobre 7 conclusões. Quando A+B tiverem rodado, o prompt da C se escreve sozinho a partir do dado observado.

---

## FASE D — Narração (opcional, talvez nunca)

### Objetivo
A IA (briefing já existente, com input_hash e guardrails) passa a VERBALIZAR os sinais determinísticos da Fase C. Lê o que coachSignals decidiu e narra. Nunca origina diagnóstico.

### Justificativa
Só se, depois de viver com o Espelho, o usuário sentir falta de interpretação em linguagem natural. É o fechamento do arco da v4: a IA narra a regra determinística ("pelos seus dados, suas tardes rendem mais"), com a procedência marcada, sem nunca decidir sozinha.

### Escopo incluído
- generateSmartBriefing (ou função irmã) recebe os SINAIS já computados por coachSignals e os verbaliza; o prompt declara que está narrando regra determinística; guardrails bloqueiam linguagem prescritiva/diagnóstica não respaldada; fallback determinístico intacto; cacheado por input_hash.

### Escopo excluído
- IA originar qualquer sinal/diagnóstico/número. IA decidir prioridade. Qualquer dependência: a narração é camada opcional sobre o Espelho, que funciona sem ela.

### Riscos e mitigação
- Risco: IA "alucinar" um padrão não presente nos sinais. Mitigação: a IA só recebe os sinais já decididos; guardrails + fallback; o número sempre vem do determinístico.
- Risco: virar conselheiro tagarela/viciante. Mitigação: narração sob demanda, não empurrada; sem push.

### Critérios de aceite
- A IA nunca emite número/sinal que não veio de coachSignals; guardrails ativos; fallback intacto; cacheado.

### NOTA SOBRE O PROMPT DA FASE D
Também não escrito agora, pelo mesmo motivo da C: depende de quais sinais a C produziu e de o usuário ter sentido falta real. Pode nunca ser necessário.

---

## Sequência recomendada e ritmo

1. Construir e USAR a Fase A. Deixar rodar 2-4 semanas. (O valor já aparece aqui.)
2. Construir a Fase B. Levar um retrato para análise externa ao menos uma vez.
3. Reavaliar com dado real: escrever então o prompt da Fase C a partir do que o dado mostrou.
4. Só considerar a Fase D se o Espelho deixar você com vontade de uma voz.

Regra de ouro do plano: **não construir inteligência sobre dado que ainda não existe.** Cada fase espera seu combustível. O app já é honesto; agora ele aprende a ser útil, na velocidade em que você o alimenta.

---

## Prompt de abertura — FASE A (colar no Codex / Claude Code)

```text
Você é o agente executor do projeto SecretárioTask (Agenda como única view, baseline coach-v4.3-hardening). Implemente a FASE A — Revisão Semanal. Determinística, sem IA, sem score, sem push, sem gamificação, opcional e sem fricção.

LEIA: SecretarioTask_Plano_Inteligencia_v5.md (Fase A); SecretarioTask_Plano_Coach_Produtividade_v4.md (princípios); STATUS.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e src/pages/Home.tsx, src/components/TimelineView.tsx, src/lib/taskFilters.ts, src/lib/taskLifecycle.ts, src/stores/taskStore.ts, src/types/index.ts (blocker_type), supabase/migrations (blocker_type em 0018).

OBJETIVO: uma visão "Revisão" que mostra tarefas paradas sem motivo e permite marcar blocker_type (ou resolver/manter) em poucos toques.

ESCOPO:
1. Seletor determinístico em taskFilters: tarefas abertas (isOpenTask), sem resolution_type terminal, sem blocker_type, ordenadas por mais adiadas (postponed_count) e mais antigas. Permitir limitar a um top N e paginar.
2. Componente de Revisão (ex.: src/components/WeeklyReview.tsx) acessível por ação discreta a partir de Home/Painel (não na captura nem poluindo a Agenda). Para cada tarefa: marcar blocker_type (waiting_third_party | no_time | priority_changed | needs_split | dependency) com tap targets 44x44; OU resolver ali reusando buildResolutionUpdates/buildCompleteUpdates de taskLifecycle.ts; OU "manter aberta" (resposta válida, sem cobrança). Progresso salvável; encerrável a qualquer momento.
3. Gravar blocker_type via store; garantir blocker_type em TASK_COLUMNS e tipos.
4. NÃO adotar evento 'reviewed' neste MVP (evita migration agora); deixar como possibilidade documentada.

INVARIANTES: determinístico; sem IA; sem score/streak/push; opcional; sem fricção na captura/Agenda; deleted_at não usado para semântica; updated_at não vira conclusão; TaskStatus inalterado; RLS/soft delete intactos.

VALIDAÇÃO: npm run lint && npm run build && npm run test. Verifique que marcar motivo remove a tarefa da fila "sem motivo" e que o Dashboard "Adiadas com motivo" passa a contar.

DOCS: PRD.md (nova visão Revisão), ARCHITECTURE.md (fluxo de revisão), DECISIONS.md (ritual opcional, sem push/score; evento 'reviewed' adiado), STATUS.md, SPRINT_LOG.md, ROADMAP.md (Fase A).

COMMIT atômico: "feat: revisão semanal determinística (preenche blocker_type) — Fase A". Mostre diff e validações; push após verdes (ou aguarde confirmação conforme seu fluxo).

RELATÓRIO: arquivos criados/alterados; como a fila de elegíveis é montada; confirmação de zero fricção e zero IA; validações; próximo passo (usar 2-4 semanas antes da Fase B).
```

---

## Prompt de abertura — FASE B (colar no Codex / Claude Code, após A rodar ~2-4 semanas)

```text
Você é o agente executor do projeto SecretárioTask. Implemente a FASE B — Retrato Exportável. Determinística, client-side, sem IA, sem envio automático.

LEIA: SecretarioTask_Plano_Inteligencia_v5.md (Fase B); STATUS.md, DECISIONS.md, ARCHITECTURE.md, PRD.md; e src/components/DashboardView.tsx (funções de agregação), src/lib/coachSignals.ts, src/lib/taskFilters.ts, src/stores/taskStore.ts, src/types/index.ts.

OBJETIVO: exportar o histórico honesto em CSV + relatório markdown, com os MESMOS números do Dashboard, mais um prompt de análise pronto para IA externa.

ESCOPO:
1. src/lib/reportExport.ts (funções PURAS e testáveis): gerar CSV (uma linha por tarefa) com os campos honestos (id, title, context, status, resolution_type, completed_at, completed_at_confidence, resolved_at, blocker_type, postponed_count, estimated_minutes, estimated_minutes_source, actual_minutes, actual_minutes_source, created_at, recurrence_origin_id); e gerar relatório markdown com agregados determinísticos.
2. FONTE ÚNICA: extrair/reusar a MESMA agregação que o DashboardView usa, de modo que relatório e Dashboard nunca divirjam. Não recalcular à parte.
3. Seletor de janela (30/90 dias/tudo) e opção de EXCLUIR legacy_approx do recorte. Cada linha/sumário marca confidence.
4. Gerar junto um "prompt de análise externa" em markdown, instruindo a IA externa a respeitar as regras (legado é frágil; sem score; horário só de confirmadas; etc.).
5. UI: ponto de download em Painel/Settings, sob ação explícita do usuário. Tudo local; nada sai sozinho.

INVARIANTES: client-side; nenhum envio automático/telemetria; legado marcado; números idênticos ao Dashboard (fonte única); sem IA no caminho.

VALIDAÇÃO: npm run lint && npm run build && npm run test, incluindo testes de reportExport que comparam os agregados com a fonte do Dashboard. Confirme paridade de números.

DOCS: PRD.md (export), ARCHITECTURE.md (fonte única de agregação), DECISIONS.md (export local, sem envio automático; recorte sem legado), STATUS.md, SPRINT_LOG.md, ROADMAP.md (Fase B).

COMMIT atômico: "feat: retrato exportável (CSV + relatório determinístico) — Fase B". Mostre diff e validações; push após verdes (ou aguarde confirmação).

RELATÓRIO: arquivos criados; confirmação de fonte única de agregação (relatório == Dashboard); como o legado é marcado/recortado; validações; próximo passo (levar um retrato à análise externa antes de pensar na Fase C).
```

---

## O que este plano deliberadamente NÃO faz agora

- Não escreve os prompts de C e D: dependem do dado real que A+B vão gerar. Escrevê-los hoje seria projetar sobre 7 conclusões.
- Não coloca IA no caminho crítico em nenhuma fase.
- Não cria score, streak, push ou qualquer mecânica de cobrança.
- Não constrói "conselheiro" antes de existir o que aconselhar.
- Não assume que D vai acontecer. Pode parar com honra na C — ou até na B.
