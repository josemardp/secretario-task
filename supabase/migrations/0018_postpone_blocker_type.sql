-- Migration 0018: motivo opcional de adiamento.
SET search_path = public;

ALTER TABLE public.tasks
  ADD COLUMN blocker_type text;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_blocker_type_check
  CHECK (
    blocker_type IS NULL
    OR blocker_type IN (
      'waiting_third_party',
      'no_time',
      'priority_changed',
      'needs_split',
      'dependency'
    )
  );

COMMENT ON COLUMN public.tasks.blocker_type
  IS 'Motivo opcional do adiamento: waiting_third_party, no_time, priority_changed, needs_split ou dependency.';
