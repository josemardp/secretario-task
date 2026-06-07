-- Migration 0013: coluna version para optimistic locking no UPDATE.
--
-- Motivação: o guard .lte('updated_at', baseUpdatedAt) deixava uma janela de
-- clock skew na fase de PUSH — dois devices editando a mesma tarefa quase
-- simultaneamente podiam passar os dois pela cláusula se seus relógios
-- divergissem. Substituímos por .eq('version', baseVersion): version é
-- incrementada atomicamente pelo servidor, sem dependência de relógio de cliente.
--
-- Backfill: DEFAULT 1 preenche as linhas existentes automaticamente.
-- Incremento: set_updated_at() (BEFORE UPDATE) estendida — o trigger
--   tasks_set_updated_at já está ligado, não é recriado.
-- Blindagem no INSERT: set_timestamps_on_insert() (BEFORE INSERT) estendida
--   para forçar version=1, impedindo injeção de valor arbitrário pelo cliente.

SET search_path = public;

ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

-- Estende BEFORE UPDATE: incrementa version junto do updated_at.
-- O trigger tasks_set_updated_at já existe e continua ligado.
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_at = OLD.created_at;
  NEW.updated_at = now();
  NEW.version    = OLD.version + 1;
  RETURN NEW;
END;
$$;

-- Estende BEFORE INSERT: fixa version=1 independente do valor enviado pelo cliente.
-- O trigger tasks_set_timestamps_on_insert já existe e continua ligado.
CREATE OR REPLACE FUNCTION public.set_timestamps_on_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.created_at = now();
  NEW.updated_at = now();
  NEW.version    = 1;
  RETURN NEW;
END;
$$;
