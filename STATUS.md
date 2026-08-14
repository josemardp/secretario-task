# STATUS.md — SecretárioTask

Última atualização: 2026-08-14

> Estado atual e próximo passo. Nada mais entra aqui.
> Histórico completo (hotfixes, sprints, causas-raiz, validações): [`docs/HISTORICO.md`](docs/HISTORICO.md)

## Protocolo de sessão

- **Início:** ler este arquivo.
- **Fim:** atualizar "Próximo passo" e a data acima.
- **Decisão técnica não-trivial:** registrar em `DECISIONS.md`.
- **Início/fim de sprint:** rituais no `AGENTS.md` (Modos 2 e 3).

## Onde estamos

App em produção e em uso diário. Último trabalho: **checklist dentro da tarefa** (14/08) — itens marcáveis no modal de edição e direto no card expandido da Agenda, badge `2/5` no card, faixa "Concluir tarefa" quando tudo é marcado, e ocorrência recorrente herdando os passos desmarcados. Código pronto, build e lint limpos, 80 asserções da suíte passando (8 novas para a checklist), visual conferido em claro, escuro, mobile e desktop.

**Bloqueio de ordem:** a migration `0022_task_checklist.sql` **ainda não foi aplicada** no Supabase. Como `checklist` entrou no `TASK_COLUMNS` do `sync.ts`, o app só volta a carregar tarefas depois que a coluna existir. Por isso o commit **não foi enviado** — push antes da migration derruba o app em produção via deploy da Vercel.

## Próximo passo

**Aplicar a migration 0022 e só então dar push.** Nessa ordem, sem exceção:

1. Aplicar `supabase/migrations/0022_task_checklist.sql` no projeto `Secretario Task` (`uwqupggkfjqbkfdshzef`). `ADD COLUMN` nullable não reescreve a tabela — instantâneo, sem downtime, sem backfill.
2. Conferir a coluna: `select column_name from information_schema.columns where table_name='tasks' and column_name='checklist'`.
3. `git push` na main.
4. Smoke no app real: abrir uma tarefa, criar 2 itens, marcar 1, fechar o modal, conferir o badge na Agenda, e conferir no celular que os itens chegaram.

Pendente de antes: **validar o hotfix de sync do celular** (cadastrar tarefa no celular, bloquear a tela, conferir no PC que ela aparece em segundos).

## Pendências conhecidas (sem urgência)

- **Janela de 90 dias:** só começa a encolher o `full` quando o histórico passar de 90 dias (novembro/2026). Até lá o ganho está todo no delta.
- **Navegação para trás no calendário:** dia anterior à janela aparece vazio. Hoje é impossível (app tem 71 dias); quando o histórico passar de 90 dias, vale um carregamento sob demanda.
- **Limpeza anual do banco:** já cadastrada como tarefa recorrente anual dentro do próprio app, com passo a passo nas observações. `pg_cron` **não** foi ligado por decisão — uma execução manual por ano basta e não deixa rotina destrutiva rodando sozinha.

## Armadilhas que já custaram caro

- **Teto de 1000 linhas do Supabase.** `fetchRemoteTasks` fazia `.select()` sem `range` e sem `order`; o PostgREST corta em 1000 linhas por padrão. Com 1112 tarefas no banco, 27 abertas nunca chegavam ao app — e sem `ORDER BY` as linhas mais novas (as ocorrências recorrentes) eram justamente as cortadas. Explicou retroativamente uma novela inteira de sumiço de tarefas recorrentes. **Sempre usar `range` e `order` em select que pode crescer.**
- **Plano do Supabase é Pro (8 GB), não free.** Projeções feitas assumindo 500 MB superestimam a urgência de limpeza. No ritmo medido (~40 MB/ano), espaço nunca será o limite. **Conferir o plano antes de projetar custo de storage.**
- **Acento em texto JSX cru quebra sempre** neste repo, porque acentos são gravados como escape unicode. Usar `{'...'}` em vez de texto solto.
