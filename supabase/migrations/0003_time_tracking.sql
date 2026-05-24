-- Adiciona campos de rastreamento de tempo para a tabela tasks
ALTER TABLE tasks
ADD COLUMN estimated_minutes INTEGER,
ADD COLUMN actual_minutes INTEGER,
ADD COLUMN started_at TIMESTAMPTZ;

-- Adiciona índice para buscas por tempo (opcional, útil para montar a linha do tempo)
CREATE INDEX IF NOT EXISTS idx_tasks_started_at ON tasks(started_at) WHERE deleted_at IS NULL;
