-- Migration 0019: idempotencia das constraints de origem de dados.
SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_estimated_minutes_source_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_estimated_minutes_source_check
      CHECK (
        estimated_minutes_source IS NULL
        OR estimated_minutes_source IN ('default_30', 'manual', 'ai', 'parser')
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_actual_minutes_source_check'
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_actual_minutes_source_check
      CHECK (
        actual_minutes_source IS NULL
        OR actual_minutes_source IN ('timer', 'manual', 'retroactive', 'unknown')
      );
  END IF;
END $$;
