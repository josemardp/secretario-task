# SecretárioTask Coach de Produtividade
## Prompt Único de Execução Autônoma — Codex (VS Code)

> Cole o bloco abaixo no Codex. Ele implementa os 12 sprints em sequência, commita, dá push na `main` e aplica/deploya no Supabase. Operador humano: Josemar (reverte via `git revert` / restore do Supabase se necessário).

```text
Você é o agente executor do projeto SecretárioTask (PWA pessoal, offline-first, mobile-first, dono único: Josemar). Você tem AUTORIZAÇÃO EXPLÍCITA para implementar, commitar, dar push na branch main e aplicar/deployar migrations no Supabase. Execute a evolução "Coach de Produtividade" inteira, sprint por sprint, do Sprint 1 ao Sprint 11.

═══════════════════════════════════════════════
LEITURA OBRIGATÓRIA ANTES DE COMEÇAR
═══════════════════════════════════════════════
- SecretarioTask_Plano_Coach_Produtividade_v4.md  (modelo conceitual — fonte da verdade arquitetural)
- SecretarioTask_Plano_Executor_Completo.md       (sprints, escopos, critérios, fixtures, prompts)
- STATUS.md, ROADMAP.md, SPRINT_LOG.md, DECISIONS.md, ARCHITECTURE.md, PRD.md, AGENTS.md, PHILOSOPHY.md
- package.json (stack real vence o documento), src/lib/sync.ts, src/stores/taskStore.ts,
  src/lib/behaviorEngine.ts, src/components/DashboardView.tsx, src/components/BehavioralSuggestion.tsx,
  src/components/TaskBoard.tsx, src/types/index.ts, supabase/migrations/ (última atual: 0013)

═══════════════════════════════════════════════
MODO DE EXECUÇÃO
═══════════════════════════════════════════════
- Implemente UM sprint por vez, na ordem 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11.
- O escopo, arquivos, migrations, riscos e critérios de aceite de cada sprint estão em SecretarioTask_Plano_Executor_Completo.md (seção 4 e os prompts da seção 5). Siga-os à risca; não invente escopo.
- Ao FIM de cada sprint, antes de passar ao próximo:
  1. Rode: npm run lint && npm run build. Os DOIS precisam passar. Se qualquer um falhar, CORRIJA dentro do escopo do sprint até passar; não avance com build quebrado.
  2. Se o sprint tem migration: aplique no Supabase (ordem abaixo) e rode o backfill descrito.
  3. Atualize a documentação do sprint (STATUS.md, SPRINT_LOG.md, ROADMAP.md, e DECISIONS/ARCHITECTURE/PRD conforme a tabela da seção 3 do plano executor).
  4. Commit com a mensagem sugerida do sprint (prefixos feat:/fix:/chore:/docs: do AGENTS.md).
  5. git push origin main.
  6. Só então inicie o próximo sprint.
- Faça UM commit por sprint (commits atômicos), para que cada sprint seja revertível isoladamente via git revert.

═══════════════════════════════════════════════
APLICAÇÃO DE MIGRATIONS NO SUPABASE
═══════════════════════════════════════════════
- Use a Supabase CLI se o projeto estiver linkado (supabase db push) OU o MCP do Supabase, o que estiver disponível e funcional.
- Crie as migrations numeradas sequencialmente a partir de 0014:
  • Sprint 2  → 0014_completed_at.sql            (completed_at + completed_at_confidence + backfill legacy_approx)
  • Sprint 3  → 0015_resolution_semantics.sql    (resolution_type + resolved_at + backfill completed)
  • Sprint 4  → 0016_task_events_expand_stamp.sql(CHECK ampliado + trigger BEFORE INSERT now())
  • Sprint 5  → 0017_data_source_fields.sql      (actual_minutes_source + estimated_minutes_source)
  • Sprint 6  → 0018_blocker_type.sql            (SE decidir persistir blocker_type; senão registre a decisão e pule)
- REGRA DE SEGURANÇA DE DADOS (inegociável mesmo com autonomia):
  • Backfill SOMENTE com os UPDATEs descritos no plano. Tarefas status='done' recebem completed_at=updated_at com completed_at_confidence='legacy_approx' (NUNCA 'confirmed'). Resolução legada: resolution_type='completed', resolved_at=completed_at.
  • Nenhum DROP COLUMN, nenhum DELETE físico, nenhuma reescrita de linha além do backfill especificado.
  • Toda tabela permanece com RLS habilitada. Não desabilite RLS.
  • Antes de aplicar 0014 (primeira que toca dados), gere um dump/snapshot de tasks se a CLI/MCP permitir, e registre em STATUS.md como ponto de restauração.

═══════════════════════════════════════════════
INVARIANTES QUE VOCÊ NÃO PODE VIOLAR (em nenhum sprint)
═══════════════════════════════════════════════
1. updated_at NUNCA é tratado como conclusão.
2. deleted_at NUNCA representa cancelada/delegada/obsoleta (só soft delete).
3. TaskStatus permanece 'todo'|'doing'|'done'. Não amplie o enum.
4. Captura rápida sem fricção; tap targets 44x44.
5. Sync, offline-first e optimistic locking por version preservados. Todo campo novo entra em TASK_COLUMNS (string literal em sync.ts) e NÃO entra em stripReadonlyTaskFields (que segue removendo só created_at/updated_at).
6. IA é opcional e não-bloqueante; fallback determinístico em toda rota; IA nunca origina diagnóstico nem escreve resolution_type/blocker_type.
7. Determinismo no caminho crítico (parser, ranking, diagnostics).
8. Sem score de produtividade; confiabilidade só como texto.
9. completed_at nunca é reescrito por edição; só na 1ª transição para done.
10. Recorrência intacta: concluir gera nova instância; métrica por instância; unique index respeitado.
11. Nenhum sprint pode deixar o app sem build.

═══════════════════════════════════════════════
DOIS PONTOS DE PARADA (pergunte a Josemar e aguarde resposta)
═══════════════════════════════════════════════
- SPRINT 8: instalar um runner de teste (Vitest) contraria a regra "sem teste no MVP". PARE, explique o trade-off e pergunte se pode instalar Vitest restrito a diagnostics.ts. Se Josemar não responder ou disser não, implemente as 10 fixtures como dataset .ts validável por um script ad-hoc (sem novo runner) e siga.
- Se em QUALQUER sprint o plano divergir do código real (arquivo inexistente, assinatura mudada) de forma que mude o escopo: pare, relate a divergência e pergunte. O código vence o documento, mas a divergência precisa ser registrada em DECISIONS.md.
Fora esses dois casos, NÃO pare entre sprints — execute a esteira inteira.

═══════════════════════════════════════════════
SE UM SPRINT FALHAR
═══════════════════════════════════════════════
- Se lint/build não passar e a correção sair do escopo do sprint: NÃO faça push desse sprint. Pare, relate o que travou e proponha um sprint de correção. Os sprints já commitados/pushados permanecem (são atômicos e revertíveis por Josemar).
- Se uma migration falhar ao aplicar: NÃO prossiga para o sprint seguinte (o código novo assume o schema novo). Relate o erro do Supabase e pare.

═══════════════════════════════════════════════
RELATÓRIO (a cada sprint e no fim)
═══════════════════════════════════════════════
Por sprint: arquivos alterados; SQL aplicado e resultado; saída de lint/build; commit hash; push confirmado; decisões registradas; riscos remanescentes.
No fim do Sprint 11: rode as varreduras da auditoria final (seção 6 do plano executor — updated_at-como-conclusão, deleted_at-como-semântica, IA-como-diagnóstico, contratos de sync), percorra o Checklist de aceitação global (seção 7) e entregue o parecer final com o estado do projeto.

Comece agora pelo Sprint 1.
```
