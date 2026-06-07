-- Migration 0011: Add energy / context columns to profiles.
-- RLS policy already exists ("users can manage own profile" FOR ALL) — not recreated.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS current_energy    integer     CHECK (current_energy BETWEEN 0 AND 10),
  ADD COLUMN IF NOT EXISTS active_context    text,
  ADD COLUMN IF NOT EXISTS energy_updated_at timestamptz DEFAULT now();
