-- Migration 0022: checklist de itens dentro da tarefa.
SET search_path = public;

ALTER TABLE public.tasks
  ADD COLUMN checklist jsonb;

-- Sem os CHECKs, um payload malformado do cliente (objeto em vez de array)
-- entraria no banco e quebraria a leitura em todos os aparelhos.
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_checklist_is_array
  CHECK (checklist IS NULL OR jsonb_typeof(checklist) = 'array');

-- Teto de 30 itens: o store local persiste 100 tarefas no localStorage do
-- celular e ja tem tratamento de quota excedida (safeStorage em taskStore.ts).
ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_checklist_max_items
  CHECK (checklist IS NULL OR jsonb_array_length(checklist) <= 30);

COMMENT ON COLUMN public.tasks.checklist
  IS 'Itens da checklist da tarefa: [{id, text, done, done_at}]. NULL = tarefa sem checklist.';
