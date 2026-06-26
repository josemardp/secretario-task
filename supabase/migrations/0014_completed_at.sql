-- Migration 0014: timestamp honesto minimo de conclusao.
--
-- completed_at e cache denormalizado para consultas de produtividade.
-- completed_at_confidence distingue conclusoes novas confirmadas de legado
-- aproximado por updated_at. Nenhum evento retroativo e criado aqui.

SET search_path = public;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS completed_at_confidence text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_completed_at_confidence_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_completed_at_confidence_check
      CHECK (
        completed_at_confidence IS NULL
        OR completed_at_confidence IN ('confirmed', 'legacy_approx')
      );
  END IF;
END;
$$;

UPDATE public.tasks
SET
  completed_at = updated_at,
  completed_at_confidence = 'legacy_approx'
WHERE status = 'done'
  AND completed_at IS NULL;
