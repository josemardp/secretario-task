-- Migration 0021: marco de retenção — o que envelhece e o que fica para sempre.
--
-- Diagnóstico de 04/08/2026 (71 dias de uso real):
--   tasks        1.114 linhas  (~380/mês) — 1.059 com embedding vector(1536), ~6 KB cada
--   task_events  5.993 linhas  (~2.500/mês)
--   sync_log    44.645 linhas  (~19.000/mês) — nada no app lê essa tabela
--
-- Escala: o projeto está no plano Pro (8 GB). No ritmo medido, ~40 MB/ano sem
-- limpeza nenhuma, então espaço nunca vai ser o limite. Esta migration é
-- higiene, não emergência: mantém o banco enxuto e cobre um eventual retorno
-- ao plano free (500 MB).
--
-- Regra adotada:
--   • tarefa NUNCA é apagada. O histórico é o ativo do app (alimenta Painel e
--     coach) e custa ~1 KB por linha: 10 anos dariam ~46 MB, irrelevante.
--   • embedding de tarefa resolvida há mais de 12 meses é zerado. Ele pesa 6x
--     mais que a tarefa inteira e só serve para busca semântica, que ninguém
--     faz em tarefa fechada há um ano. É reversível: dá para regerar.
--   • sync_log é log de depuração, retenção de 30 dias. A partir do commit que
--     acompanha esta migration o app só grava falha, então o volume novo cai
--     para quase zero; esta limpeza resolve o passivo acumulado.
--   • task_events fica inteiro: é a matéria-prima do coach e é pequeno.

SET search_path = public;

CREATE OR REPLACE FUNCTION public.purge_old_history(
  sync_log_days      integer DEFAULT 30,
  embedding_months   integer DEFAULT 12
)
RETURNS TABLE (sync_log_apagados bigint, embeddings_zerados bigint)
LANGUAGE plpgsql
-- Sem SECURITY DEFINER: roda com os direitos de quem chama, que é sempre o
-- dono do banco (SQL Editor ou pg_cron). Definer aqui só abriria superfície.
SET search_path = public
AS $$
DECLARE
  v_logs       bigint;
  v_embeddings bigint;
BEGIN
  DELETE FROM public.sync_log
  WHERE created_at < now() - (sync_log_days || ' days')::interval;
  GET DIAGNOSTICS v_logs = ROW_COUNT;

  UPDATE public.tasks
  SET embedding = NULL
  WHERE embedding IS NOT NULL
    AND COALESCE(resolved_at, completed_at, deleted_at)
        < now() - (embedding_months || ' months')::interval;
  GET DIAGNOSTICS v_embeddings = ROW_COUNT;

  RETURN QUERY SELECT v_logs, v_embeddings;
END;
$$;

-- Índice para o DELETE não varrer a tabela inteira toda vez.
CREATE INDEX IF NOT EXISTS idx_sync_log_created_at
  ON public.sync_log (created_at);

-- Primeira execução: limpa o passivo acumulado.
SELECT * FROM public.purge_old_history();

-- ─────────────────────────────────────────────────────────────────────────────
-- Agendamento mensal (opcional).
--
-- Exige habilitar a extensão pg_cron no painel do Supabase
-- (Database → Extensions → pg_cron). Sem isso, rodar a função à mão de tempos
-- em tempos resolve: o volume só volta a incomodar depois de meses.
--
-- CREATE EXTENSION IF NOT EXISTS pg_cron;
-- SELECT cron.schedule(
--   'purge-old-history',
--   '0 4 1 * *',                       -- todo dia 1, 04:00 UTC
--   $$SELECT public.purge_old_history();$$
-- );
-- ─────────────────────────────────────────────────────────────────────────────
