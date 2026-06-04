ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS recurrence_origin_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recurrence_origin
  ON public.tasks(recurrence_origin_id)
  WHERE recurrence_origin_id IS NOT NULL;
