-- Migration 0017: origem dos dados de tempo e estimativa.
SET search_path = public;

ALTER TABLE public.tasks
  ADD COLUMN estimated_minutes_source text,
  ADD COLUMN actual_minutes_source text;

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_estimated_minutes_source_check
  CHECK (
    estimated_minutes_source IS NULL
    OR estimated_minutes_source IN ('default_30', 'manual', 'ai', 'parser')
  );

ALTER TABLE public.tasks
  ADD CONSTRAINT tasks_actual_minutes_source_check
  CHECK (
    actual_minutes_source IS NULL
    OR actual_minutes_source IN ('timer', 'manual', 'retroactive', 'unknown')
  );

-- Legado: estimativas antigas nao permitem distinguir AI/default/manual com
-- seguranca, entao permanecem NULL. Tempo real antigo nasceu do timer quando
-- havia started_at; sem started_at, a origem fica explicitamente desconhecida.
UPDATE public.tasks
SET actual_minutes_source = CASE
  WHEN started_at IS NOT NULL THEN 'timer'
  ELSE 'unknown'
END
WHERE actual_minutes IS NOT NULL
  AND actual_minutes_source IS NULL;

COMMENT ON COLUMN public.tasks.estimated_minutes_source
  IS 'Origem da estimativa: default_30, manual, ai ou parser.';

COMMENT ON COLUMN public.tasks.actual_minutes_source
  IS 'Origem do tempo real: timer, manual, retroactive ou unknown.';
