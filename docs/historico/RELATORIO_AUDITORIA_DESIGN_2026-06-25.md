# Relatorio de Auditoria de Design — SecretarioTask

Data: 2026-06-25

Escopo: auditoria visual, pratica e de experiencia do app, com foco em layout, paleta de cores, alinhamentos, cards, navegacao, clareza operacional e aderencia a logica do produto.

---

## 1. Resumo executivo

O SecretarioTask ja possui uma direcao visual clara nas telas internas: fundo quente, superficies brancas, texto escuro, navegacao inferior mobile-first, cards compactos e cores por contexto. A experiencia principal tambem esta bem definida: capturar tarefas rapidamente, organizar o dia, consultar Agenda, abrir Foco/Top 3 e acompanhar dados no painel.

O principal problema encontrado nao e ausencia de design, mas inconsistencia. A tela de login ainda parece um scaffold inicial, enquanto a area autenticada ja possui uma identidade visual propria. Alem disso, algumas escolhas de linguagem e elementos visuais aproximam o produto de um "assistente inteligente" ou app motivacional, quando os documentos do projeto definem o SecretarioTask como uma ferramenta operacional previsivel.

O app funciona como PWA e o build de producao passou. O alerta relevante e o bundle JavaScript grande, que pode prejudicar carregamento em celulares.

---

## 2. Metodologia

Foram inspecionados:

- `STATUS.md` e sprint atual.
- Documentos anteriores de auditoria UX/mobile.
- Componentes principais de interface:
  - `src/pages/Login.tsx`
  - `src/pages/Home.tsx`
  - `src/components/TaskBoard.tsx`
  - `src/components/TimelineView.tsx`
  - `src/components/DashboardView.tsx`
  - `src/components/FocoSheet.tsx`
  - `src/components/SettingsModal.tsx`
  - `src/components/MultiTaskConfirmModal.tsx`
  - `src/components/RecurrenceModal.tsx`
  - `src/components/CalendarWidget.tsx`
- Tokens visuais em `tailwind.config.ts` e `src/index.css`.
- Logica de produto em ranking, briefing, parser e stores.
- Tela de login em viewport mobile e desktop.
- Build de producao via `npm run build`.

Limitacao: a area autenticada depende de sessao real do Supabase. Nao foi criada conta nem enviado dado ao backend sem autorizacao explicita. As telas internas foram avaliadas por codigo, estrutura visual e consistencia de componentes.

---

## 3. Diagnostico de produto

### 3.1 Logica central

A logica do produto esta clara:

- Captura rapida de tarefa pelo rodape.
- Parser local com uso opcional de IA quando houver chave configurada.
- Organizacao por tarefas do dia.
- Ranking deterministico por prioridade, prazo, energia, idade e contexto.
- Foco/Top 3 para execucao imediata.
- Agenda diaria com blocos por horario.
- Painel de estatisticas.

Essa estrutura combina bem com a promessa de "chefe de gabinete digital": o app ajuda a decidir o que executar agora, sem exigir planejamento manual pesado.

### 3.2 Risco de posicionamento

Algumas areas usam linguagem de IA, comportamento e motivacao:

- "IA destrinchou"
- "Pensando..."
- "Estimativa da IA vs tempo real"
- "Conclua algumas tarefas no quadro para a inteligencia gerar suas estatisticas"
- "Analise comportamental"
- botao "IA"

Isso enfraquece o posicionamento operacional. A recomendacao e tratar IA como recurso auxiliar e opcional, nao como identidade central do produto.

---

## 4. Diagnostico visual

### 4.1 Identidade visual

Ponto forte: a paleta interna tem personalidade. O conjunto `canvas`, `paper`, `paper2`, `ink` cria uma experiencia mais sofisticada que o padrao Tailwind cinza/indigo.

Problema: a tela de login ainda usa cinza claro, indigo e layout generico. Isso cria uma quebra forte entre entrada e produto real.

Recomendacao:

- Migrar login para a mesma paleta do app.
- Usar `bg-canvas`, `bg-paper`, `text-ink`, `border-line`.
- Trocar botao indigo por `bg-ink`.
- Aplicar a tipografia de display usada nas telas internas.
- Remover visual de scaffold SaaS generico.

### 4.2 Paleta de cores

Paleta atual interna:

- Fundo: `#F7F6F2`
- Superficie principal: `#FFFFFF`
- Superficie secundaria: `#EFEEE8`
- Texto principal: `#1A1814`
- Texto secundario: `#6B6760`
- Linhas: `#E5E3DB`
- Contextos: azul, roxo, dourado, teal, verde, rosa, verde saude

Diagnostico:

- A base quente e boa.
- O produto pode ficar monocromatico demais se preto/bege dominarem todas as decisoes.
- As cores de contexto existem, mas poderiam comunicar mais.

Recomendacoes:

- Reservar `ink` para acoes primarias e cards de destaque.
- Usar contexto como informacao funcional, nao decoracao: barra lateral, chip pequeno, ponto no calendario e legenda no painel.
- Evitar que todo destaque vire preto; usar cor de contexto quando o destaque for sobre area de vida/projeto.
- Manter danger/warning/success apenas para estado: atrasada, atencao, concluida.

### 4.3 Tipografia

Ponto forte: o uso de serif italic em titulos cria assinatura visual.

Problemas:

- Muitos metadados usam 10px ou 11px.
- Em mobile real, esses tamanhos ficam elegantes mas cansativos.
- Algumas telas misturam titulos expressivos com labels muito comprimidas.

Recomendacoes:

- Labels auxiliares: 11-12px.
- Metadados: 12px.
- Titulos de tarefas: 14-15px.
- Headers de secao: 16px.
- Titulos expressivos: 22-28px apenas em headers, Foco e Dashboard.
- Evitar letter spacing negativo em componentes compactos.

### 4.4 Cards

Ponto forte: os cards internos sao bem organizados e possuem boa leitura por camadas.

Problemas:

- Uso excessivo de `rounded-2xl` e `rounded-3xl`.
- Cards, botoes, inputs, modais e chips ficam todos com a mesma linguagem muito arredondada.
- Para uma ferramenta operacional, isso reduz densidade e seriedade.

Recomendacoes:

- Cards de tarefa: 8-12px.
- Inputs e botoes: 10-12px.
- Bottom sheets e modais: 18-22px.
- Chips pequenos: 999px quando forem pills reais.
- Evitar card dentro de card quando a area nao for uma unidade independente.

### 4.5 Alinhamentos e espacamento

O layout interno usa bem `px-4`, gaps curtos e estruturas fixas. A barra de captura e a tab bar respeitam melhor o mobile do que a maior parte dos apps pequenos.

Pontos de atencao:

- Alguns modais usam grids de duas colunas com campos de texto/data que podem ficar apertados em telas menores.
- No Dashboard, graficos com labels podem ficar comprimidos em telas estreitas.
- A Agenda pode gerar densidade alta quando ha muitos cards longos.

Recomendacoes:

- Para formularios mobile, usar uma coluna quando o campo tiver data/hora ou texto longo.
- Manter duas colunas apenas para numeros curtos, como prioridade e energia.
- Em cards de agenda, esconder acoes secundarias ate expandir ou tocar.
- Usar alinhamento consistente de metadados: hora, duracao, prioridade, contexto sempre na mesma ordem.

---

## 5. Avaliacao por tela

### 5.1 Login

Estado atual: funcional, responsivo, mas visualmente desconectado do app.

Problemas:

- Paleta cinza/indigo nao conversa com o produto.
- Campos agrupados parecem formulario de template.
- O titulo usa fonte sans generica, diferente da assinatura interna.
- Nao ha sensacao de PWA premium/mobile-first.

Melhorias propostas:

- Fundo `bg-canvas`.
- Card ou bloco central com superficie `paper`, sem excesso de sombra.
- Titulo "SecretarioTask" em `font-display`.
- Subtitulo mais operacional: "Organizacao diaria e execucao".
- Inputs com altura minima 44px e borda `line`.
- Botao primario `Entrar` em `bg-ink`.
- Botao secundario discreto.
- Mensagens de erro com linguagem mais curta e humana.

Prioridade: P0.

### 5.2 Home / Hoje

Pontos fortes:

- Header compacto.
- Energia visivel sem ocupar uma tela inteira.
- Captura fixa no rodape.
- Navegacao inferior clara.
- Foco acessivel por botao dedicado.

Problemas:

- A busca com "IA" no header pode criar expectativa errada.
- A energia talvez esteja mais proeminente do que precisa para usuarios que raramente ajustam isso.
- O botao de envio da captura tem bom contraste, mas poderia garantir 44x44px.

Melhorias propostas:

- Trocar label/botao "IA" por "Avancada" ou icone sem texto.
- Colocar recursos de IA sob uma camada secundaria nas configuracoes.
- Aumentar area de toque do envio.
- Manter captura como principal acao sempre visivel.

Prioridade: P1.

### 5.3 TaskBoard / Hoje

Pontos fortes:

- Colunas simples: A fazer, Em andamento, Concluido.
- Cards compactos com boa informacao essencial.
- Expansao revela controles sem poluir demais.
- Barra lateral por contexto ajuda leitura rapida.

Problemas:

- Muito texto pequeno.
- Uso de emoji para adiamento.
- Score tecnico aparece no card expandido, mas pode nao ser util para usuario comum.
- "Voltar" e "Excluir" ficam proximos, o que exige cuidado visual.

Melhorias propostas:

- Substituir emoji de adiamento por icone Lucide ou texto "Adiada 2x".
- Mostrar score apenas em modo debug ou configuracao avancada.
- Aumentar metadados para 12px.
- Reforcar diferenca entre acao destrutiva e acao operacional.

Prioridade: P1.

### 5.4 Agenda

Pontos fortes:

- Linha de agora.
- Scroll automatico para horario atual.
- Slots compactos quando vazios.
- Cards com acoes diretas.
- Calendario mensal acessivel.

Problemas:

- Cards podem ficar densos quando ha muitas tarefas.
- Acoes permanentes dentro do card competem com leitura.
- Modais de edicao com muitos campos podem parecer pesados em mobile.

Melhorias propostas:

- Estado compacto por padrao: titulo, horario, duracao, prioridade.
- Acoes aparecem ao expandir.
- Separar tarefas atrasadas em uma faixa "Atrasadas" antes da timeline.
- Reduzir raio dos cards para aumentar densidade.
- Manter linha do agora acima dos elementos, como ja foi corrigido.

Prioridade: P1.

### 5.5 Foco / Top 3

Pontos fortes:

- A hierarquia Top 1 vs Top 2/3 esta correta.
- O card escuro do Top 1 cria uma acao primaria clara.
- Bottom sheet e adequado para mobile.

Problemas:

- Visual do Top 1 e bom, mas pode ficar dramático demais se usado muitas vezes ao dia.
- Briefing depende de chave e IA, mas aparece como recurso central.

Melhorias propostas:

- Manter Top 1 destacado.
- Tornar "Briefing" secundario se nao houver chave configurada.
- Exibir ranking de forma operacional: "Prioridade agora" em vez de linguagem motivacional.
- Evitar frases com tom emocional/artificial.

Prioridade: P1.

### 5.6 Dashboard / Painel

Pontos fortes:

- Visual rico.
- Graficos claros.
- Cards numericos bem desenhados.
- Cores de contexto aparecem bem.

Problemas:

- Linguagem de algumas secoes foge do tom operacional.
- A palavra "Stats" na tab bar nao esta alinhada ao portugues do resto do app.
- O dashboard pode parecer mais produto de produtividade analitica do que "execucao do dia".

Melhorias propostas:

- Renomear tab para "Painel" ou "Dados".
- Trocar "Voce acerta bem?" por "Estimado vs. real".
- Trocar "Quando voce flui?" por "Horario de maior conclusao".
- Trocar "Onde gastei energia" por "Distribuicao por contexto".
- Reduzir textos interpretativos.

Prioridade: P1.

### 5.7 Configuracoes

Pontos fortes:

- Bottom sheet consistente.
- Secoes bem separadas.
- Logout esta no lugar certo, fora do header principal.

Problemas:

- Chave OpenAI aparece muito central.
- Texto "parser inteligente, briefings e busca semantica" reforca uma identidade de IA.

Melhorias propostas:

- Criar secao "Recursos avancados".
- Explicar IA como opcional.
- Usar linguagem direta: "Chave usada apenas para recursos avancados".
- Separar notificacoes de recursos de IA.

Prioridade: P2.

---

## 6. Componentes e padronizacao recomendada

### 6.1 Botao primario

Uso:

- Entrar
- Salvar
- Iniciar agora
- Confirmar criacao de tarefas

Estilo:

- Fundo `ink`
- Texto branco
- Altura 44px
- Raio 10-12px
- Fonte 13-14px bold

### 6.2 Botao secundario

Uso:

- Cancelar
- Adiar
- Hoje
- Abrir calendario

Estilo:

- Fundo `paper2`
- Texto `ink-2`
- Altura 40-44px
- Raio 10-12px

### 6.3 Acao destrutiva

Uso:

- Excluir
- Sair
- Remover recorrencia

Estilo:

- Texto danger
- Fundo danger-light apenas quando necessario
- Separar fisicamente de acoes primarias

### 6.4 Card de tarefa

Conteudo recomendado:

- Linha 1: titulo + indicadores essenciais.
- Linha 2: horario, duracao, contexto, prioridade.
- Barra lateral: contexto.
- Estado: concluida, atrasada, recorrente.

Evitar:

- Excesso de chips.
- Emojis.
- Metadados tecnicos como ID e score para usuario comum.

### 6.5 Bottom sheets

Recomendacao:

- Header fixo.
- Corpo rolavel.
- Footer fixo com acoes.
- Drag handle apenas em mobile.
- Altura maxima 90-92dvh.
- Safe area preservada.

O app ja segue boa parte disso.

---

## 7. Recomendacoes de linguagem

Substituicoes sugeridas:

| Atual | Sugerido |
| --- | --- |
| Stats | Painel ou Dados |
| IA | Avancada |
| IA destrinchou | Tarefas detectadas |
| Pensando... | Gerando... |
| Estimativa da IA vs tempo real | Estimado vs. real |
| Voce acerta bem? | Precisao das estimativas |
| Quando voce flui? | Horario de maior conclusao |
| Analise comportamental | Sugestao operacional |
| inteligencia gerar suas estatisticas | gerar seus dados |
| 🐌 2x | Adiada 2x |

Tambem recomendo corrigir acentos em textos visiveis:

- Recorrencia -> Recorrência
- sera -> será
- ocorrencias -> ocorrências
- Nao -> Não
- possivel -> possível

---

## 8. Priorizacao

### P0 — Corrigir antes de novos refinamentos

- Redesenhar `Login.tsx` para a identidade visual interna.
- Remover emojis de interface operacional.
- Corrigir textos sem acento visiveis.
- Renomear "Stats" para "Painel" ou "Dados".

### P1 — Melhorias de alto impacto

- Reduzir raio dos cards comuns.
- Aumentar legibilidade dos metadados.
- Padronizar botoes primarios/secundarios/destrutivos.
- Reorganizar acoes da Agenda para reduzir densidade.
- Trocar linguagem de IA por linguagem operacional.

### P2 — Melhorias de refinamento

- Mover recursos de IA para configuracao avancada.
- Esconder score tecnico do usuario comum.
- Criar guia visual de componentes no proprio codigo/design tokens.
- Fazer code splitting para reduzir bundle inicial.

---

## 9. Checklist pratico de implementacao

- [ ] Atualizar visual da tela de login.
- [ ] Trocar "Stats" por "Painel" ou "Dados".
- [ ] Remover emojis dos cards e botoes.
- [ ] Corrigir acentos nos textos visiveis.
- [ ] Padronizar raios: cards 8-12px, modais 18-22px.
- [ ] Aumentar metadados para 12px onde houver espaco.
- [ ] Reduzir protagonismo visual de recursos com IA.
- [ ] Revisar Dashboard para tom mais operacional.
- [ ] Revisar Agenda para cards compactos e acoes sob demanda.
- [ ] Avaliar split de bundle para reduzir carregamento inicial.

---

## 10. Verificacao tecnica

Comando executado:

```text
npm run build
```

Resultado: build concluido com sucesso.

Alerta observado:

```text
Some chunks are larger than 500 kB after minification.
```

Impacto: pode prejudicar tempo de carregamento inicial, especialmente em celulares e conexoes moveis. Recomenda-se avaliar `dynamic import` para telas pesadas como Dashboard, graficos e recursos de IA.

---

## 11. Conclusao

O SecretarioTask ja tem base visual e funcional forte. A experiencia interna parece muito mais madura que a tela de entrada. O proximo salto de qualidade nao exige uma reformulacao total; exige consistencia, reducao de ruido, linguagem mais operacional e padronizacao de componentes.

A direcao recomendada e manter o produto sobrio, rapido e previsivel: menos "assistente inteligente", mais "sistema de execucao pessoal".
