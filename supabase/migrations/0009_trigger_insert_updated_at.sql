-- Migration 0009: trigger BEFORE INSERT em tasks para garantir que
-- created_at e updated_at sejam sempre gerados pelo servidor (now()),
-- eliminando o clock skew de clientes com relógio adiantado.
--
-- Antes desta migration, apenas o BEFORE UPDATE tinha trigger.
-- INSERTs preservavam o timestamp enviado pelo cliente, o que permitia
-- que tarefas criadas no mobile com relógio adiantado vencessem o LWW
-- contra edições legítimas feitas no PC.

CREATE OR REPLACE FUNCTION set_timestamps_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at = now();
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tasks_set_timestamps_on_insert ON tasks;

CREATE TRIGGER tasks_set_timestamps_on_insert
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_timestamps_on_insert();
