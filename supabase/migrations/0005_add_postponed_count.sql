ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS postponed_count integer DEFAULT 0
  CHECK (postponed_count >= 0);
