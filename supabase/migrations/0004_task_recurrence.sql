-- Adiciona suporte a recorrência na tabela de tarefas
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS recurrence_rule text;

-- Atualiza a função de log de sincronização para lidar com esse novo campo
-- (Isso não é estritamente necessário dependendo do trigger, mas garante conformidade se você auditar os campos)

-- Adiciona comentário para documentação
COMMENT ON COLUMN public.tasks.recurrence_rule IS 'Regra de recorrência (ex: daily, weekly, monthly, monday, tuesday, etc.)';
