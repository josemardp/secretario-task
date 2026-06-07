-- Migration 0010: Make recurrence series server-authoritative.
-- Guarantees at most one live (non-done, non-deleted) occurrence per series
-- and stabilises recurrence_origin_id to always point at the root task.

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 1: Backfill recurrence_origin_id to the stable root.
--
-- Before this migration, the client wrote recurrence_origin_id = parent.id
-- (the immediate predecessor), causing chains A→B→C where B and C both
-- pointed to their parent rather than the root A.
--
-- After this migration every member of a series has recurrence_origin_id = A.id,
-- and A itself is self-referencing (recurrence_origin_id = A.id).
--
-- The CTE base case identifies roots: tasks with recurrence_rule but without
-- a parent (NULL) OR already self-referencing (idempotent re-run).
-- The recursive case walks down to every descendant, propagating root_id.
-- ─────────────────────────────────────────────────────────────────────────────
WITH RECURSIVE series(root_id, member_id) AS (
  SELECT id AS root_id, id AS member_id
  FROM   public.tasks
  WHERE  recurrence_rule IS NOT NULL
    AND  (recurrence_origin_id IS NULL OR recurrence_origin_id = id)

  UNION ALL

  SELECT s.root_id, t.id AS member_id
  FROM   public.tasks t
  JOIN   series s ON t.recurrence_origin_id = s.member_id
  WHERE  t.id <> s.member_id   -- guard against self-reference loop
)
UPDATE public.tasks
SET
  recurrence_origin_id = series.root_id,
  updated_at           = now()
FROM series
WHERE public.tasks.id  = series.member_id
  AND public.tasks.recurrence_origin_id IS DISTINCT FROM series.root_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 2: Soft-delete duplicate live occurrences per series.
--
-- For each (user_id, recurrence_origin_id) group, keep the task with the
-- highest updated_at (tie-break: highest id). Soft-delete the rest.
-- Completed tasks (status = 'done') and already-deleted tasks are excluded
-- from both the ranking and the delete.
-- ─────────────────────────────────────────────────────────────────────────────
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, recurrence_origin_id
      ORDER BY updated_at DESC NULLS LAST, id DESC
    ) AS rn
  FROM public.tasks
  WHERE deleted_at         IS NULL
    AND status             <> 'done'
    AND recurrence_origin_id IS NOT NULL
)
UPDATE public.tasks
SET deleted_at = now(),
    updated_at = now()
FROM ranked
WHERE public.tasks.id = ranked.id
  AND ranked.rn > 1;

-- ─────────────────────────────────────────────────────────────────────────────
-- Step 3: Create the unique partial index (only after the cleanup above,
-- to avoid conflicts on existing duplicate rows).
--
-- NULL values in recurrence_origin_id are excluded by the WHERE clause:
-- non-recurring tasks are never affected by this constraint.
-- Done tasks are also excluded so completing a task never blocks inserting
-- the next occurrence.
-- ─────────────────────────────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_live_recurrence
  ON public.tasks (user_id, recurrence_origin_id)
  WHERE deleted_at         IS NULL
    AND status             <> 'done'
    AND recurrence_origin_id IS NOT NULL;
