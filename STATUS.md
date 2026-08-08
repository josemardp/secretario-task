# STATUS.md — SecretárioTask

Última atualização: 2026-08-08

> Estado atual e próximo passo. Nada mais entra aqui.
> Histórico completo (hotfixes, sprints, causas-raiz, validações): [`docs/HISTORICO.md`](docs/HISTORICO.md)

## Protocolo de sessão

- **Início:** ler este arquivo.
- **Fim:** atualizar "Próximo passo" e a data acima.
- **Decisão técnica não-trivial:** registrar em `DECISIONS.md`.
- **Início/fim de sprint:** rituais no `AGENTS.md` (Modos 2 e 3).

## Onde estamos

App em produção e em uso diário. Último trabalho: **hotfix do sync de tarefas criadas no celular** (07/08) — tarefa cadastrada no celular não subia ao servidor; a fila de mutations agora sobe na hora, não só no tick de 120s. Adicionado marcador discreto de tarefa ainda não sincronizada na Agenda.

## Próximo passo

**Validar o hotfix no app real:** cadastrar uma tarefa pelo celular, **bloquear a tela em seguida** e conferir no PC (sem tocar mais no celular) que ela aparece em segundos. Esse era exatamente o caminho que falhava.

Para ver o marcador de não-sincronizada: ligar o modo avião, cadastrar uma tarefa, esperar um minuto — o ícone aparece; ao voltar a rede, some sozinho quando a fila sobe.

## Pendências conhecidas (sem urgência)

- **Janela de 90 dias:** só começa a encolher o `full` quando o histórico passar de 90 dias (novembro/2026). Até lá o ganho está todo no delta.
- **Navegação para trás no calendário:** dia anterior à janela aparece vazio. Hoje é impossível (app tem 71 dias); quando o histórico passar de 90 dias, vale um carregamento sob demanda.
- **Limpeza anual do banco:** já cadastrada como tarefa recorrente anual dentro do próprio app, com passo a passo nas observações. `pg_cron` **não** foi ligado por decisão — uma execução manual por ano basta e não deixa rotina destrutiva rodando sozinha.

## Armadilhas que já custaram caro

- **Teto de 1000 linhas do Supabase.** `fetchRemoteTasks` fazia `.select()` sem `range` e sem `order`; o PostgREST corta em 1000 linhas por padrão. Com 1112 tarefas no banco, 27 abertas nunca chegavam ao app — e sem `ORDER BY` as linhas mais novas (as ocorrências recorrentes) eram justamente as cortadas. Explicou retroativamente uma novela inteira de sumiço de tarefas recorrentes. **Sempre usar `range` e `order` em select que pode crescer.**
- **Plano do Supabase é Pro (8 GB), não free.** Projeções feitas assumindo 500 MB superestimam a urgência de limpeza. No ritmo medido (~40 MB/ano), espaço nunca será o limite. **Conferir o plano antes de projetar custo de storage.**
- **Acento em texto JSX cru quebra sempre** neste repo, porque acentos são gravados como escape unicode. Usar `{'...'}` em vez de texto solto.
