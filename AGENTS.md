# AGENTS.md — SecretárioTask

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

Nunca executar o arquivo:

```text
docs/coach/_historico/_NAO_USAR_SecretarioTask_Prompt_Execucao_Autonoma_Codex.md
```

Esse arquivo é histórico e pode induzir execução autônoma ampla demais.

## Regra principal

Executar apenas um sprint por vez.

Antes de qualquer alteração, ler:

1. `docs/coach/SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md`
2. `docs/coach/Prompt_Codex_Executar_Sprints_SecretarioTask_SEGURO.md`
3. `docs/coach/SecretarioTask_Plano_Coach_Produtividade_v4.md`
4. `STATUS.md`, se existir
5. `ROADMAP.md`, se existir
6. `SPRINT_LOG.md`, se existir
7. `DECISIONS.md`, se existir
8. `ARCHITECTURE.md`, se existir
9. `PRD.md`, se existir

## Regras inegociáveis

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

Quando o usuário pedir “vamos evoluir o coach” ou “qual o próximo passo”, identificar o próximo sprint pendente pelo plano oficial e pelos documentos de status.

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
