-- Enum de Contexto
CREATE TYPE context_type AS ENUM (
  'PM',
  'Esdra',
  'Pessoal',
  'Familia',
  'CCB',
  'Estudo',
  'Saude'
);

-- Enum de Status
CREATE TYPE task_status AS ENUM (
  'todo',
  'doing',
  'done'
);

-- Tabela `tasks`
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  context context_type NOT NULL,
  priority INTEGER DEFAULT 0 CHECK (priority BETWEEN 0 AND 10),
  energy INTEGER DEFAULT 0 CHECK (energy BETWEEN 0 AND 10),
  status task_status DEFAULT 'todo',
  due_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger para `updated_at`
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Índices recomendados para tasks
CREATE INDEX idx_tasks_user_context_status
ON tasks (user_id, context, status)
WHERE deleted_at IS NULL;

CREATE INDEX idx_tasks_user_due
ON tasks (user_id, due_at)
WHERE deleted_at IS NULL AND due_at IS NOT NULL;


-- Tabela `task_events`
CREATE TABLE task_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('created','updated','completed','viewed')),
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices recomendados para task_events
CREATE INDEX idx_task_events_user_task
ON task_events (user_id, task_id);

CREATE INDEX idx_task_events_type_created
ON task_events (type, created_at DESC);


-- Tabela `sync_log`
CREATE TABLE sync_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('insert','update','delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','synced','failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  synced_at TIMESTAMPTZ
);

-- Trigger de imutabilidade para sync_log
CREATE OR REPLACE FUNCTION sync_log_protect_immutable()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id     IS DISTINCT FROM OLD.user_id     OR
     NEW.entity_type IS DISTINCT FROM OLD.entity_type OR
     NEW.entity_id   IS DISTINCT FROM OLD.entity_id   OR
     NEW.operation   IS DISTINCT FROM OLD.operation   OR
     NEW.created_at  IS DISTINCT FROM OLD.created_at  THEN
    RAISE EXCEPTION 'Campos imutáveis de sync_log não podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sync_log_protect_immutable_trigger
BEFORE UPDATE ON sync_log
FOR EACH ROW
EXECUTE FUNCTION sync_log_protect_immutable();

-- Índice recomendado para sync_log
CREATE INDEX idx_sync_log_user_status
ON sync_log (user_id, status);


-- Row Level Security (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Políticas — `tasks`
CREATE POLICY "users_select_own_tasks" ON tasks
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_tasks" ON tasks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_tasks" ON tasks
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_delete_own_tasks" ON tasks
  FOR DELETE USING (auth.uid() = user_id);

-- Políticas — `task_events`
CREATE POLICY "users_select_own_events" ON task_events
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_events" ON task_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Políticas — `sync_log`
CREATE POLICY "users_select_own_sync_log" ON sync_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "users_insert_own_sync_log" ON sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_update_own_sync_log" ON sync_log
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
