# Prompt para Codex/Claude Code — Execução por Sprint com Commit/Push e Supabase DB Push

Você está trabalhando no repositório local:

```text
C:\projetos\secretario-task
```

Existe uma pasta/ZIP de planejamento dentro do projeto, incluindo arquivos como:

```text
files.zip
SecretarioTask_Plano_Coach_Produtividade_v4.md
SecretarioTask_Plano_Executor_Completo.md
SecretarioTask_Prompt_Execucao_Autonoma_Codex.md
SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md
```

## Fonte oficial

A fonte única de verdade para implementação é:

```text
SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md
```

Se esse arquivo estiver dentro do ZIP, extraia/localize-o primeiro. Se houver versões antigas do plano ou o arquivo `SecretarioTask_Prompt_Execucao_Autonoma_Codex.md`, trate-os apenas como histórico/contexto. Não execute o prompt autônomo. Não implemente vários sprints em sequência.

## Sprint a executar

Execute somente o sprint que eu indicar na mensagem. Se eu não indicar o número, execute apenas o **Sprint 0**.

Sprint solicitado: **[PREENCHER: Sprint 0 / Sprint 1 / Sprint 2 / etc.]**

## Leitura obrigatória antes de mexer

Leia primeiro, nesta ordem:

1. `SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md`
2. O prompt específico do sprint dentro da seção `## 5. Prompts prontos para Codex ou Claude Code`
3. `SecretarioTask_Plano_Coach_Produtividade_v4.md`
4. `STATUS.md`
5. `ROADMAP.md`
6. `SPRINT_LOG.md`
7. `DECISIONS.md`
8. `ARCHITECTURE.md`
9. `PRD.md`
10. `AGENTS.md`, se existir
11. Os arquivos de código citados pelo sprint

## Regras inegociáveis

- Execute exatamente um sprint por vez.
- Não adiante fases.
- Não use `updated_at` como conclusão.
- Não use `deleted_at` para cancelada/delegada/obsoleta.
- Não altere `TaskStatus` salvo ordem humana explícita.
- Não quebre captura rápida.
- Não quebre sync/offline-first.
- Não torne IA obrigatória.
- Não crie score de produtividade.
- Faça commit e push na `main` ao final do sprint, somente se `npm run lint` e `npm run build` passarem e `git status` mostrar apenas alterações do sprint.
- Antes de commitar, rode `git status` e confira o escopo. Se houver alteração fora do sprint, pare e reporte.
- Em sprint com migration, aplique automaticamente no Supabase remoto de forma controlada: primeiro `supabase migration list --linked`, depois `supabase db push --dry-run`, revisar o output, então `supabase db push --linked`, e por fim `supabase migration list --linked` para confirmar. Se a CLI não estiver autenticada/linkada, se o dry-run mostrar escopo inesperado, se houver SQL destrutivo não previsto ou se houver dúvida sobre constraint/backfill, pare e reporte.
- Se encontrar divergência entre o plano oficial e o código real, o código real vence, mas registre a divergência e pare se isso mudar o escopo do sprint.
- Se o sprint exigir migration e houver dúvida sobre constraint, enum ou backfill, não chute: inspecione o schema/migrations; se não der para confirmar, pare e reporte.


## Supabase remoto — aplicação automática controlada

Sprints sem migration: não rode comandos de DB remoto.

Sprints com migration em `supabase/migrations/`:

1. Confirme que a Supabase CLI está disponível:

```bash
supabase --version
```

2. Confirme que o projeto está linkado e que o histórico remoto está acessível:

```bash
supabase migration list --linked
```

3. Depois de `npm run lint` e `npm run build` verdes, rode o dry-run:

```bash
supabase db push --dry-run
```

4. Só aplique se o dry-run listar exclusivamente a(s) migration(s) esperada(s) do sprint e se a migration for forward-compatible.

```bash
supabase db push --linked
supabase migration list --linked
```

5. Não rode `supabase db reset`, `supabase migration repair`, `supabase db pull`, `supabase db push --include-all`, `--include-roles` ou `--include-seed` sem autorização humana explícita.

6. Nunca grave tokens, senhas, connection strings, project-ref sensível ou qualquer segredo em arquivos versionados. Se faltar login/link/senha, pare e peça o setup local.

7. Se a migration contiver operação destrutiva não prevista (`DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, `DELETE` amplo, alteração de enum/constraint ambígua, backfill sem WHERE seguro), pare e reporte antes de aplicar.

## Validações obrigatórias

Ao final do sprint, rode:

```bash
npm run lint
npm run build
```

Se o sprint envolver instalação inicial ou baseline, rode também:

```bash
npm ci
```

Se alguma validação falhar, corrija dentro do escopo do sprint. Se a correção exigir sair do escopo, pare e reporte.

## Commit e push obrigatórios

Ao final do sprint, depois de documentação atualizada, validações verdes e, quando houver migration, Supabase remoto aplicado/confirmado:

```bash
git status
git add -A
git commit -m "<mensagem definida no prompt do sprint>"
git push origin main
```

Se `git status` mostrar arquivos fora do escopo do sprint, não commite nem dê push. Pare e explique.

## Documentação obrigatória

Ao final do sprint, atualize conforme o plano oficial:

- `STATUS.md`
- `SPRINT_LOG.md`
- `ROADMAP.md`, quando fase mudar
- `DECISIONS.md`, quando houver decisão arquitetural, schema, IA, sync/offline, teste ou dado legado
- `ARCHITECTURE.md`, quando houver mudança de arquitetura
- `PRD.md`, quando houver mudança perceptível de produto

## Relatório final obrigatório

Ao final, entregue um relatório com:

1. Sprint executado.
2. Arquivos alterados.
3. Migrations criadas e aplicadas no Supabase remoto, se houver.
4. Decisões registradas.
5. Validações executadas e resultados.
6. O que ficou pendente.
7. Riscos remanescentes.
8. Commit realizado e hash.
9. Push realizado para `origin/main`.
10. Próximo sprint recomendado.

Comece localizando o arquivo `SecretarioTask_Plano_Executor_Completo_v2_OFICIAL.md`, confirme que ele é a fonte oficial e execute somente o sprint solicitado, com aplicação remota controlada de migration quando houver, e commit/push na `main` ao final se o gate estiver verde.
