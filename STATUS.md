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

Migration `0022_task_checklist.sql` aplicada e conferida no Supabase em 14/08 (coluna `checklist` jsonb nullable, os dois CHECKs no lugar, 1.304 tarefas intactas). Commit `dcac67d` na main. **A ordem importava:** `checklist` entrou no `TASK_COLUMNS` do `sync.ts`, então o app não carregaria tarefa nenhuma se o deploy tivesse ido antes da coluna existir.

## Próximo passo

**Smoke da checklist no app real:** abrir uma tarefa, criar 2 itens, marcar 1, fechar o modal, conferir o badge `1/2` no card da Agenda, e conferir no celular que os itens chegaram. Depois abrir o card na Agenda (toque no card expande) e marcar o item por lá, sem entrar no modal.

Testar também a recorrência: numa tarefa que se repete, concluir uma ocorrência e conferir que a próxima nasceu com os mesmos itens, todos por marcar.

Pendente de antes: **validar o hotfix de sync do celular** (cadastrar tarefa no celular, bloquear a tela, conferir no PC que ela aparece em segundos).

## Pendências conhecidas (sem urgência)

- **Janela de 90 dias:** só começa a encolher o `full` quando o histórico passar de 90 dias (novembro/2026). Até lá o ganho está todo no delta.
- **Navegação para trás no calendário:** dia anterior à janela aparece vazio. Hoje é impossível (app tem 71 dias); quando o histórico passar de 90 dias, vale um carregamento sob demanda.
- **Limpeza anual do banco:** já cadastrada como tarefa recorrente anual dentro do próprio app, com passo a passo nas observações. `pg_cron` **não** foi ligado por decisão — uma execução manual por ano basta e não deixa rotina destrutiva rodando sozinha.

## Armadilhas que já custaram caro

- **Teto de 1000 linhas do Supabase.** `fetchRemoteTasks` fazia `.select()` sem `range` e sem `order`; o PostgREST corta em 1000 linhas por padrão. Com 1112 tarefas no banco, 27 abertas nunca chegavam ao app — e sem `ORDER BY` as linhas mais novas (as ocorrências recorrentes) eram justamente as cortadas. Explicou retroativamente uma novela inteira de sumiço de tarefas recorrentes. **Sempre usar `range` e `order` em select que pode crescer.**
- **Plano do Supabase é Pro (8 GB), não free.** Projeções feitas assumindo 500 MB superestimam a urgência de limpeza. No ritmo medido (~40 MB/ano), espaço nunca será o limite. **Conferir o plano antes de projetar custo de storage.**
- **Acento em texto JSX cru quebra sempre** neste repo, porque acentos são gravados como escape unicode. Usar `{'...'}` em vez de texto solto.
