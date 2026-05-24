# PHILOSOPHY.md — SecretárioTask

Última revisão: 2026-05-12
Status: Filosofia oficial do MVP enxuto

---

# Propósito

O SecretárioTask existe para:
- reduzir fricção operacional
- organizar execução pessoal
- transformar intenção em ação
- centralizar prioridades operacionais

O SecretárioTask NÃO existe para:
- conversar como chatbot
- substituir julgamento humano
- gerar dependência emocional
- funcionar como rede social ou entretenimento

---

# Identidade do Produto

O produto deve se comportar como:
- chefe de gabinete
- sistema operacional pessoal
- central de execução
- ferramenta operacional confiável

Nunca como:
- coach
- terapeuta
- mascote motivacional
- personagem com personalidade excessiva

## Tom do produto
- direto
- claro
- profissional
- previsível
- sem emojis por padrão
- sem antropomorfização exagerada
- sem linguagem emocional artificial

---

# Filosofia Central

## P1 — Execução acima de inspiração
O sistema deve incentivar execução prática acima de consumo passivo ou motivação artificial.

Toda funcionalidade deve priorizar:
- velocidade de ação
- redução de atrito
- clareza operacional

---

## P2 — Simplicidade vence sofisticação
Uma solução simples, estável e previsível é preferível a uma solução sofisticada porém frágil.

Evitar:
- complexidade desnecessária
- abstrações prematuras
- arquitetura excessiva

---

## P3 — Stack dominada
Toda tecnologia usada no MVP deve:
- possuir baixo custo operacional
- ser compreendida pela equipe
- possuir manutenção simples
- permitir debugging rápido

Evitar dependências que:
- aumentem lock-in desnecessário
- exijam infraestrutura complexa
- reduzam previsibilidade operacional

## Observação sobre versões
Versões da stack são pinadas (React 19, Vite 6, TypeScript 5, Tailwind 3, Zustand 5, React Router 7, Supabase JS 2) para preservar P3. Mudanças de versão major devem ser registradas em `DECISIONS.md`.

---

## P4 — IA é meio, não fim
IA só deve existir quando:
- reduzir atrito real
- aumentar clareza
- simplificar operação
- não aumentar dependência

IA não deve:
- substituir transparência
- criar comportamento imprevisível
- dificultar debugging

No MVP:
- IA está fora do escopo principal

---

## P5 — Previsibilidade é obrigatória
O usuário deve entender:
- por que uma tarefa foi priorizada
- por que algo apareceu no briefing
- como o sistema se comporta
- quais regras afetaram o resultado

Evitar:
- comportamento mágico
- inferências obscuras
- automações difíceis de explicar
- decisões impossíveis de auditar

## Aplicação direta no ranking
O ranking determinístico (`ARCHITECTURE.md`) deve produzir o mesmo score para a mesma entrada. Cada fator (`f_urgency`, `f_energy`, `f_age`, `f_context`) deve ser inspecionável separadamente.

---

## P6 — Offline primeiro
O sistema deve continuar útil mesmo:
- sem internet
- com conexão instável
- durante falhas temporárias de sincronização

Prioridades:
- captura rápida
- persistência local
- recuperação simples
- sincronização resiliente

## Observação
Quando offline, o sistema armazena alterações localmente em uma fila persistida (`PendingMutation[]`) e tenta sincronizar automaticamente ao reconectar.

IDs são gerados no cliente (`crypto.randomUUID()`) para que tarefas tenham identidade estável antes do sync.

O comportamento de sincronização é definido em CDP6.

---

## P7 — Complexidade incremental
Nada complexo deve entrar cedo demais.

Recursos avançados como:
- embeddings
- busca semântica
- notificações inteligentes
- automações avançadas
- análise comportamental
- IA contextual

Devem permanecer fora do MVP até que o produto esteja operacionalmente estável.

---

## P8 — O sistema deve ser utilizável diariamente
O foco principal é:
- uso real
- estabilidade
- velocidade
- baixo atrito
- previsibilidade operacional

Não:
- demonstrações tecnológicas
- arquitetura excessiva
- features impressionantes porém frágeis

## Indicadores proxy de usabilidade diária
- tempo de captura de tarefa: < 5 segundos
- carregamento inicial da aplicação: < 2 segundos
- resposta visual às ações do usuário: < 300 ms

---

# CDP — Critérios de Desenvolvimento do Produto

## CDP1 — Clareza antes de abstração
Priorizar:
- código explícito
- leitura simples
- debugging rápido

Evitar:
- engenharia excessiva
- abstrações genéricas prematuras
- padrões desnecessariamente complexos

---

## CDP2 — Menos infraestrutura
O MVP deve funcionar com:
- Vercel
- Supabase
- custo operacional mínimo
- setup simples

Evitar:
- microserviços prematuros
- infraestrutura distribuída desnecessária
- múltiplos provedores sem necessidade clara

---

## CDP3 — Determinismo
Parser e ranking devem ser:
- transparentes
- previsíveis
- debuggáveis
- auditáveis

Sem:
- embeddings
- inferência semântica
- LLM
- modelos opacos

## Aplicação direta
- parser local com regex e regras fixas
- ranking com fórmula explícita e pesos somando 1.0
- todos os fatores normalizados para 0–1 antes da aplicação dos pesos

---

## CDP4 — Segurança mínima obrigatória
Obrigatório:
- RLS em todas as tabelas (`tasks`, `task_events`, `sync_log`)
- `auth.uid()` nas policies
- CHECK constraints nos campos numéricos e enums textuais
- validação de entrada
- sanitização de entrada
- segregação básica de dados por usuário

Tokens e autenticação:
- devem ser gerenciados exclusivamente pelo cliente Supabase
- não devem ser copiados manualmente para `localStorage` ou `sessionStorage`
- não devem ser expostos em logs
- não devem circular em stores globais sem necessidade

Método oficial de autenticação:
- magic link (email OTP) via Supabase Auth
- sem gestão manual de senha
- sem token customizado

---

## CDP5 — UX operacional
O produto deve:
- reduzir passos
- reduzir fricção
- acelerar captura
- minimizar cliques desnecessários
- favorecer fluxo operacional contínuo

---

## CDP6 — Sync simples
No MVP:
- Last Write Wins (LWW) em nível de registro inteiro
- fila persistida de mutações (`PendingMutation[]`)
- retry básico
- sincronização simples

Não implementar:
- CRDT
- rollback visual
- resolução avançada de conflitos
- merge inteligente de campos

## Risco aceito
LWW em nível de registro inteiro pode causar perda de atualizações concorrentes em campos diferentes.

Exemplo:
- título alterado no celular
- descrição alterada no desktop

Esse comportamento é aceitável no MVP e deve permanecer documentado.

## Mitigação para deletes
Soft delete via `deleted_at` previne "ressurreição" de registros em conflitos de delete-vs-update entre devices.

---

## CDP7 — Código legível
Priorizar:
- manutenção simples
- leitura rápida
- organização clara
- baixo custo cognitivo

Código deve favorecer:
- onboarding rápido
- debugging previsível
- mudanças incrementais seguras

---

## CDP8 — Sem features emocionais artificiais
Evitar:
- gamificação exagerada
- frases motivacionais
- personalidade excessiva
- manipulação emocional
- elementos viciantes artificiais

---

## CDP9 — Evolução gradual
Após estabilização do MVP:
- IA
- embeddings
- busca semântica
- briefing inteligente
- automações
- notificações inteligentes
- migração para Tailwind 4 (CSS-first)

Podem ser introduzidos gradualmente.

Toda evolução futura deve preservar:
- previsibilidade
- transparência
- controle do usuário
- simplicidade operacional

---

# MVP Oficial

## O MVP inclui
- captura de tarefas
- CRUD funcional com soft delete
- parser local determinístico
- ranking determinístico (com `due_at` e energia compatível com usuário)
- briefing determinístico (com throttling de `viewed`)
- sync simples (LWW)
- offline básico
- fila offline de mutações
- persistência local
- autenticação por magic link

## O MVP NÃO inclui
- LLM
- embeddings
- pgvector
- busca semântica
- notificações push
- geofencing
- voice capture
- recorrência
- subtarefas
- anexos
- automações avançadas
- tabelas `profiles` e `user_settings`
- migração para Tailwind 4

---

# Objetivo Final

O SecretárioTask deve se tornar:
- confiável
- rápido
- previsível
- operacionalmente útil
- simples de manter

Antes de se tornar:
- inteligente
- automatizado
- altamente personalizado
- um "assistente de IA"
