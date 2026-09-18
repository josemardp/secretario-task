# Product

> Contexto estratégico para trabalho de design. Sintetizado de `PHILOSOPHY.md`,
> `CLAUDE.md` e `docs/historico/RELATORIO_AUDITORIA_DESIGN_2026-06-25.md`. Não substitui nenhum
> deles: em caso de divergência, o `PHILOSOPHY.md` manda.

## Register

product

## Users

Um único usuário: Josemar, Capitão da PMESP, comandante da 5ª Cia PM. Usa o app
todo dia, em três superfícies: celular Android (uso principal, em movimento,
entre compromissos), notebook e PC de mesa (blocos de trabalho sentado). Não é
desenvolvedor profissional.

O trabalho dele é dividido entre contextos que não se misturam (PM, Família,
Igreja, Estudo, Saúde, negócio da esposa). O app existe para responder uma
pergunta operacional: **o que eu faço agora?**

## Product Purpose

Chefe de gabinete digital. Captura tarefa em segundos, decide a próxima ação por
ranking determinístico, mostra o dia em agenda por horário e acompanha execução
no painel. Sucesso é execução: tarefa capturada vira tarefa feita, sem
planejamento manual pesado.

Não é: chatbot, coach, rede social, app de motivação.

## Brand Personality

Direto, previsível, profissional. Tom de ferramenta operacional confiável, não de
assistente simpático. Sem emojis por padrão no conteúdo, sem antropomorfização,
sem linguagem emocional artificial. A interface some dentro da tarefa.

## Anti-references

- **App motivacional / coach** (Fabulous, Finch): mascote, celebração, streak,
  linguagem emocional. Explicitamente rejeitado no `PHILOSOPHY.md`.
- **Chatbot com cara de IA**: "Pensando...", "a IA destrinchou", botão "IA" solto.
  Apontado como risco de posicionamento na auditoria de 25/06.
- **App de celular esticado no desktop**: layout de uma coluna ocupando 1500px,
  navegação de rodapé no notebook, texto correndo a largura inteira da tela.
- **Densidade de planilha**: o oposto também não serve. Não é Jira nem Redmine.

## Design Principles

1. **Execução acima de decoração.** Todo pixel serve a decidir ou executar. Nada
   entra por ser bonito.
2. **Mobile é a superfície principal e está resolvida.** Trabalho de desktop é
   adaptação estrutural (colunas, densidade, navegação), nunca reescrita do que
   já funciona no celular.
3. **Familiaridade ganha de originalidade.** Vocabulário de ferramenta que ele já
   conhece. Surpresa visual é custo, não valor.
4. **Previsibilidade.** Mesmo componente se comporta igual em toda tela. Nada se
   move sozinho, nada muda de lugar entre telas.
5. **Simplicidade vence sofisticação** (P2 do `PHILOSOPHY.md`): solução simples e
   estável ganha de sofisticada e frágil.

## Accessibility & Inclusion

- Alvos de toque ≥ 44px no mobile (regra do `CLAUDE.md`).
- Tema claro e escuro obrigatórios, ambos conferidos antes de entregar: já houve
  botão ilegível no escuro duas vezes.
- Contraste de texto de corpo ≥ 4.5:1 nos dois temas.
- `prefers-reduced-motion` respeitado em qualquer animação nova.
