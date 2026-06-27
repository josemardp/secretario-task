-- Migration 0020: idempotencia da constraint tasks_blocker_type_check.
-- A migration 0018 criou a constraint sem IF NOT EXISTS, tornando-a nao
-- reaplicavel (ex.: supabase db reset em desenvolvimento). Esta migration
-- garante que a constraint exista com a mesma semantica, sem alterar dados
-- ou schema.
SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.tasks'::regclass
      AND conname = 'tasks_blocker_type_check'
  ) THEN
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
  END IF;
END $$;
