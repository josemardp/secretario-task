-- Migration 0015: semantica de resolucao sem usar deleted_at.
SET search_path = public;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS resolution_type text;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tasks_resolution_type_check'
      AND conrelid = 'public.tasks'::regclass
  ) THEN
    ALTER TABLE public.tasks
      ADD CONSTRAINT tasks_resolution_type_check
      CHECK (
        resolution_type IS NULL
        OR resolution_type IN ('completed', 'cancelled', 'delegated', 'obsolete')
      );
  END IF;
END;
$$;

UPDATE public.tasks
SET
  resolution_type = 'completed',
  resolved_at = completed_at
WHERE status = 'done'
  AND resolution_type IS NULL;

DROP INDEX IF EXISTS public.idx_unique_live_recurrence;

CREATE UNIQUE INDEX idx_unique_live_recurrence
  ON public.tasks (user_id, recurrence_origin_id)
  WHERE deleted_at IS NULL
    AND status <> 'done'
    AND recurrence_origin_id IS NOT NULL
    AND (
      resolution_type IS NULL
      OR resolution_type NOT IN ('cancelled', 'delegated', 'obsolete')
    );
