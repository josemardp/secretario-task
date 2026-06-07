-- Migration 0012: BEFORE UPDATE trigger on profiles that enforces server-side LWW
-- for the energy columns. If the incoming write carries an energy_updated_at older
-- than what is already stored, silently revert those three fields to the current
-- values — the rest of the row (e.g. openai_api_key) is updated normally.
--
-- This closes the race window left by pushEnergyToCloud using a plain .upsert():
-- whichever request reaches the DB last now cannot overwrite a newer timestamp.

CREATE OR REPLACE FUNCTION public.profiles_energy_lww()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.energy_updated_at IS NOT NULL
     AND OLD.energy_updated_at IS NOT NULL
     AND NEW.energy_updated_at < OLD.energy_updated_at THEN
    NEW.current_energy    := OLD.current_energy;
    NEW.active_context    := OLD.active_context;
    NEW.energy_updated_at := OLD.energy_updated_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_profiles_energy_lww ON public.profiles;

CREATE TRIGGER trg_profiles_energy_lww
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.profiles_energy_lww();
