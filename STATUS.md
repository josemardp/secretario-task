# STATUS.md — SecretárioTask

Última atualização: 2026-08-21

> Estado atual e próximo passo. Nada mais entra aqui.
> Histórico completo (hotfixes, sprints, causas-raiz, validações): [`docs/HISTORICO.md`](docs/HISTORICO.md)

## Protocolo de sessão

- **Início:** ler este arquivo.
- **Fim:** atualizar "Próximo passo" e a data acima.
- **Decisão técnica não-trivial:** registrar em `DECISIONS.md`.
- **Início/fim de sprint:** rituais no `AGENTS.md` (Modos 2 e 3).

## Onde estamos

Ajuste vindo do uso real no notebook (21/08): o botão **Nova tarefa** saiu do topo da barra lateral e foi para o centro do cabeçalho, na mesma linha do "Bom dia". A barra de captura já abria centralizada em `lg:top-[104px]`, então agora ela nasce logo abaixo do próprio botão que a abriu. Só classes `lg:` (o cabeçalho vira grid de três colunas a partir de 1024px); o celular continua idêntico, com o botão redondo na barra inferior. Conferido no app real em 1440px, 1024px, 390px e tema escuro.

App em produção e em uso diário. Último trabalho: **layout de desktop** (14/08) — navegação lateral de 220px no lugar do rodapé, conteúdo contido em 1180px, Painel em duas colunas, Foco como diálogo centralizado e Busca contida em 900px. Na Agenda, a linha mostra contexto e duração à direita e as seis ações só aparecem sob o cursor; a coluna auxiliar traz a próxima melhor ação, a missão do dia e os próximos dias. Tudo entrou como classe `lg:` (≥1024px): o celular é byte por byte o mesmo, conferido em 400px. Contexto de design gravado em `PRODUCT.md`.

Duas correções feitas depois do uso real: os seis botões fixos ocupavam 64% da largura da linha, e a coluna de resolvidas não servia para nada. Ver `DECISIONS.md` (14/08).

Antes disso: **checklist dentro da tarefa** (14/08) — itens marcáveis no modal de edição e direto no card expandido da Agenda, badge `2/5` no card, faixa "Concluir tarefa" quando tudo é marcado, e ocorrência recorrente herdando os passos desmarcados. Código pronto, build e lint limpos, 80 asserções da suíte passando (8 novas para a checklist), visual conferido em claro, escuro, mobile e desktop.

Migration `0022_task_checklist.sql` aplicada e conferida no Supabase em 14/08 (coluna `checklist` jsonb nullable, os dois CHECKs no lugar, 1.304 tarefas intactas). Commit `dcac67d` na main, deploy da Vercel READY. **A ordem importava:** `checklist` entrou no `TASK_COLUMNS` do `sync.ts`, então o app não carregaria tarefa nenhuma se o deploy tivesse ido antes da coluna existir. **Smoke no app real aprovado pelo Josemar em 14/08** — a entrega está fechada.

## Próximo passo

**Usar o app no notebook e dizer o que incomoda.** O layout de desktop foi conferido em preview (claro, escuro, 1512px e 400px), mas ainda não em uso real com a base de tarefas cheia.

Ficou deliberadamente de fora do trabalho de desktop: modal de tarefa em duas colunas de formulário (hoje só ficou mais largo), e a Busca com metadados alinhados à direita.

Da checklist, ficou de fora: reordenar item arrastando, parser transformando texto em itens ("comprar pão, leite e ovos"), IA sugerindo subtarefas, e checklist na Home/Foco.

Pendente de antes: **validar o hotfix de sync do celular** (cadastrar tarefa no celular, bloquear a tela, conferir no PC que ela aparece em segundos).

## Pendências conhecidas (sem urgência)

- **Janela de 90 dias:** só começa a encolher o `full` quando o histórico passar de 90 dias (novembro/2026). Até lá o ganho está todo no delta.
- **Navegação para trás no calendário:** dia anterior à janela aparece vazio. Hoje é impossível (app tem 71 dias); quando o histórico passar de 90 dias, vale um carregamento sob demanda.
- **Limpeza anual do banco:** já cadastrada como tarefa recorrente anual dentro do próprio app, com passo a passo nas observações. `pg_cron` **não** foi ligado por decisão — uma execução manual por ano basta e não deixa rotina destrutiva rodando sozinha.

## Armadilhas que já custaram caro

- **Teto de 1000 linhas do Supabase.** `fetchRemoteTasks` fazia `.select()` sem `range` e sem `order`; o PostgREST corta em 1000 linhas por padrão. Com 1112 tarefas no banco, 27 abertas nunca chegavam ao app — e sem `ORDER BY` as linhas mais novas (as ocorrências recorrentes) eram justamente as cortadas. Explicou retroativamente uma novela inteira de sumiço de tarefas recorrentes. **Sempre usar `range` e `order` em select que pode crescer.**
- **Plano do Supabase é Pro (8 GB), não free.** Projeções feitas assumindo 500 MB superestimam a urgência de limpeza. No ritmo medido (~40 MB/ano), espaço nunca será o limite. **Conferir o plano antes de projetar custo de storage.**
- **Acento em texto JSX cru quebra sempre** neste repo, porque acentos são gravados como escape unicode. Usar `{'...'}` em vez de texto solto.
- **Coluna nova em `tasks` = migration ANTES do push.** O `TASK_COLUMNS` do `sync.ts` é uma lista explícita de colunas, não `select(*)`. Se o código subir para a Vercel citando uma coluna que ainda não existe no Supabase, o `select` falha e **o app não carrega tarefa nenhuma em nenhum aparelho** até a migration rodar. A ordem é sempre: aplicar migration, conferir a coluna, depois `git push`.
