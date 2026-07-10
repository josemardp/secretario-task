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
