-- Migration 0016: eventos confiaveis com carimbo server-side.
SET search_path = public;

DO $$
DECLARE
  existing_constraint_name text;
BEGIN
  SELECT conname
  INTO existing_constraint_name
  FROM pg_constraint
  WHERE conrelid = 'public.task_events'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%type%'
    AND pg_get_constraintdef(oid) LIKE '%created%'
    AND pg_get_constraintdef(oid) LIKE '%updated%'
    AND pg_get_constraintdef(oid) LIKE '%completed%'
    AND pg_get_constraintdef(oid) LIKE '%viewed%'
  ORDER BY conname
  LIMIT 1;

  IF existing_constraint_name IS NULL THEN
    RAISE EXCEPTION 'Constraint CHECK de public.task_events.type nao encontrada';
  END IF;

  EXECUTE format('ALTER TABLE public.task_events DROP CONSTRAINT %I', existing_constraint_name);
END;
$$;

ALTER TABLE public.task_events
  ADD CONSTRAINT task_events_type_check
  CHECK (
    type IN (
      'created',
      'updated',
      'completed',
      'viewed',
      'started',
      'reopened',
      'postponed',
      'resolved'
    )
  );

CREATE OR REPLACE FUNCTION public.set_task_event_created_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.created_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS task_events_set_created_at ON public.task_events;

CREATE TRIGGER task_events_set_created_at
  BEFORE INSERT ON public.task_events
  FOR EACH ROW
  EXECUTE FUNCTION public.set_task_event_created_at();
