# CLAUDE.md — SecretárioTask

## O que é
App pessoal de tarefas + coach de produtividade do Josemar. React 19 + TypeScript + Vite + Tailwind + Supabase. PWA mobile-first.

## Contas e deploy
- GitHub: `josemardp/secretario-task` (branch `main`).
- Deploy: Vercel. Supabase para dados/auth.

## Fonte de verdade dos rituais — NÃO duplicar aqui
- **`STATUS.md`** — protocolo de toda sessão (início: ler STATUS + sprint atual; fim: marcar `[x]`, atualizar "Próximo passo" e a data).
- **`AGENTS.md`** — rituais de início/fim de sprint e fontes oficiais do Coach de Produtividade (`docs/coach/...OFICIAL.md`).
- **`DECISIONS.md`** — decisões técnicas não-triviais.
- **`SPRINT_LOG.md`** — histórico de sprints.
Seguir o protocolo do `STATUS.md` em TODA sessão, sem exceção.

## Princípios não-negociáveis
- TypeScript estrito: sem `any`.
- Mobile-first: tap targets ≥ 44px.
- Tema escuro: todo ajuste visual é conferido também no dark mode (screenshot/preview) antes de entregar — já tivemos botão ilegível 2x.
- Mudanças cirúrgicas: não reescrever nem criar arquivos além do pedido.

## Fluxo com Codex
O Codex (VS Code) costuma ser o executor; o Claude gera prompts autocontidos (modelo seguro em `docs/coach/Prompt_Codex_Executar_Sprints_SecretarioTask_SEGURO.md`) e revisa os diffs que o Josemar cola de volta.

## Decisões registradas importantes
- Funcionalidade "energia" foi removida; o estado de remoção está registrado para eventual reversão (ver `DECISIONS.md`).

## Estado em 12/08/2026 (registro pré-CAO)

Josemar entra em CAO de 17/08/2026 a 22/01/2027; este registro existe para retomar o projeto depois.

- Último commit do repositório: 2026-08-08 19:32:07 -0300 `b682bee` `docs: torna leitura de contexto condicional`.
- Commits desde a última atualização deste documento: 20.
- Resumo dos commits, agrupado pelo que as mensagens do Git registram:
  - Tarefas e recorrência: observações em tarefas, V5 Decision Engine, correção de recorrência mensal com dia específico, exclusão de ocorrência recorrente sem encerrar a série, primeira ocorrência sem `due_at` e captura sem data/hora com atalhos rápidos.
  - Sincronização e histórico: busca de todas as tarefas do servidor, sincronização incremental por `updated_at`, política de retenção para `sync_log`, `purge_old_history`, fila de mutações no momento da alteração e marcador de tarefa não sincronizada na Agenda.
  - Interface mobile/agenda: recolhimento padrão de tarefas resolvidas do dia na agenda mobile e correção de calendário com escape literal/horário `9h`.
  - Documentação e configuração: validação no app real, números de volume do banco, limpeza de séries duplicadas, migration 0021, plano Pro, histórico movido para `docs/HISTORICO.md`, leitura de contexto condicional e correção do nome do `package.json`.

PRÓXIMO PASSO: [VERIFICAR: a confirmar pelo Josemar]
