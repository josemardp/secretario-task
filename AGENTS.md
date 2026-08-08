# AGENTS.md — SecretárioTask

## Entrada obrigatória

Leia sempre `STATUS.md` primeiro. Ele é o marcador de página do projeto: estado atual,
próximo passo, protocolo de início/fim de sessão e quando registrar decisão.

Depois disso, leia somente o que a tarefa pedir. Não carregue todos os documentos por
padrão.

## Roteamento de leitura

| Tipo de tarefa | Ler além do `STATUS.md` |
|---|---|
| Correção pontual de UI, bug localizado, texto ou CSS | Apenas os arquivos diretamente afetados |
| Escolher, abrir ou executar sprint do Coach de Produtividade | Os 3 arquivos de `docs/coach/` listados abaixo |
| Início de sprint | Modo 2 deste arquivo + plano oficial do Coach quando a sprint for do Coach |
| Encerramento de sprint | Modo 3 deste arquivo + `SPRINT_LOG.md`/`ROADMAP.md` quando houver progresso de sprint a registrar |
| Schema, migration, RLS, enum, constraint ou Supabase remoto | `ARCHITECTURE.md` + seção "Supabase remoto" deste arquivo |
| Decisão técnica não-trivial | Consultar `DECISIONS.md` antes se houver precedente; registrar depois |
| Mudança perceptível de produto/escopo | `PRD.md`, com ressalva: `STATUS.md`, `DECISIONS.md` e `ARCHITECTURE.md` prevalecem quando houver conflito |

## Fonte oficial da evolução Coach de Produtividade

A fonte única de verdade para a evolução do Coach de Produtividade é:

```text
docs/coach/SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md
```

O arquivo abaixo é referência arquitetural da versão conceitual:

```text
docs/coach/SecretarioTask_Plano_Coach_Produtividade_v4.md
```

O prompt seguro de execução por sprint está em:

```text
docs/coach/Prompt_Codex_Executar_Sprints_SecretarioTask_SEGURO.md
```

## Arquivos antigos

Arquivos dentro de:

```text
docs/coach/_historico
```

são apenas histórico. Não devem ser usados como fonte principal de implementação.

## Regra principal

Executar apenas um sprint por vez.

## Regras inegociáveis

- Nunca executar `docs/coach/_historico/_NAO_USAR_SecretarioTask_Prompt_Execucao_Autonoma_Codex.md`. É histórico e induz execução autônoma ampla demais.
- Não usar `updated_at` como data de conclusão.
- Não usar `deleted_at` para cancelada, delegada ou obsoleta.
- Não alterar `TaskStatus` sem autorização humana explícita.
- Não executar vários sprints de uma vez.
- Aplicar migration no Supabase remoto fica autorizado por sprint quando houver migration, mas somente com `supabase db push --dry-run` verde, escopo esperado e `supabase db push --linked` controlado.
- Não tornar IA obrigatória.
- Não criar score de produtividade.
- Não quebrar captura rápida.
- Não quebrar sync/offline-first.
- Commit e push na `main` são autorizados somente ao final de cada sprint, depois de validações verdes e documentação atualizada.
- Se houver alteração fora do escopo do sprint, conflito, dúvida sobre migration/schema, falha de lint/build ou risco de dados, não commitar nem dar push; parar e reportar.


## Supabase remoto

Quando um sprint criar migration em `supabase/migrations/`, o agente está autorizado a aplicar no Supabase remoto, desde que siga exatamente esta ordem:

```bash
npm run lint
npm run build
supabase migration list --linked
supabase db push --dry-run
supabase db push --linked
supabase migration list --linked
```

Só aplicar se o `dry-run` listar apenas a(s) migration(s) esperada(s) do sprint.

Parar e reportar se:

- Supabase CLI não estiver instalada, autenticada ou linkada;
- o dry-run listar migration inesperada;
- houver dúvida de constraint, enum, RLS ou backfill;
- a migration tiver operação destrutiva não prevista;
- qualquer validação falhar.

Nunca rodar sem autorização humana explícita:

```bash
supabase db reset
supabase migration repair
supabase db pull
supabase db push --include-all
supabase db push --include-roles
supabase db push --include-seed
```

Nunca salvar tokens, senhas, connection strings ou segredos no repositório.

## Rotina de execução

Quando o usuário pedir “vamos evoluir o coach”, “abrir sprint”, “executar sprint” ou
equivalente, identificar o próximo sprint pendente pelo plano oficial do Coach e pelos
documentos de status aplicáveis.

Antes de implementar, informar:

1. sprint identificado;
2. objetivo;
3. arquivos prováveis;
4. validações;
5. documentação que será atualizada.

Depois executar apenas esse sprint.

Ao final, atualizar:

- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`, quando aplicável
- `DECISIONS.md`, quando houver decisão
- `ARCHITECTURE.md`, quando houver mudança arquitetural
- `PRD.md`, quando houver mudança perceptível no produto

Sempre rodar:

```bash
npm run lint
npm run build
```

Depois de validações verdes, se o sprint criou migration, aplicar o Supabase remoto com dry-run antes. Em seguida, rodar:

```bash
git status
git add -A
git commit -m "<mensagem do sprint>"
git push origin main
```

Antes de `git add -A`, conferir se `git status` mostra apenas alterações pertencentes ao sprint atual. Se houver arquivo fora do escopo, não commitar nem dar push.

No relatório final, informar:

1. sprint executado;
2. arquivos alterados;
3. migrations criadas/aplicadas remotamente;
4. decisões registradas;
5. validações executadas;
6. resultado de lint/build;
7. commit realizado e hash;
8. push realizado para `origin/main`;
9. confirmação de `supabase db push --linked`, se houve migration;
9. pendências;
10. riscos remanescentes;
11. próximo sprint recomendado.

## Modo 2 — Início de sprint

Use somente quando a tarefa for abrir ou executar uma sprint.

1. Ler `STATUS.md`.
2. Identificar se a sprint é do Coach de Produtividade. Se for, ler os 3 arquivos de
   `docs/coach/` listados no topo deste arquivo.
3. Conferir `ROADMAP.md` e `SPRINT_LOG.md` apenas para localizar a sprint e evitar
   duplicidade de execução.
4. Informar sprint identificado, objetivo, arquivos prováveis, validações e documentação
   que será atualizada.
5. Executar apenas uma sprint.

## Modo 3 — Encerramento de sprint

Use somente ao fechar sprint.

1. Rodar validações aplicáveis, no mínimo `npm run lint` e `npm run build`.
2. Se houve migration, seguir a ordem da seção "Supabase remoto".
3. Atualizar `STATUS.md`.
4. Atualizar `SPRINT_LOG.md` e `ROADMAP.md` quando houver progresso de sprint.
5. Atualizar `DECISIONS.md` quando houver decisão técnica não-trivial.
6. Atualizar `ARCHITECTURE.md` quando houver mudança de schema, RLS, sync ou infraestrutura.
7. Conferir `git status` antes de commitar.
