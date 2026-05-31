// src/lib/datetime.ts
// Helpers determinísticos de horário-padrão (P2/P13).
// Todas as funções recebem `now` por parâmetro (default new Date())
// para garantir que mesma entrada = mesma saída, sem relógio escondido.

/**
 * Próximo slot de 30 minutos a partir de `from`.
 * Arredonda para cima até a próxima marca de :00 ou :30.
 * Se `from` já estiver exatamente em :00 ou :30, avança para o slot seguinte,
 * para nunca marcar a tarefa no instante presente.
 * Rola corretamente a hora/data na virada (ex.: 23h45 -> 00h00 do dia seguinte).
 */
export function nextDefaultDueTime(from: Date = new Date()): Date {
  const d = new Date(from);
  d.setSeconds(0, 0);
  const m = d.getMinutes();
  if (m < 30) {
    d.setMinutes(30);
  } else {
    d.setHours(d.getHours() + 1, 0, 0, 0);
  }
  return d;
}

/**
 * Aplica apenas a HORA-padrão (próximo slot de 30 min de `now`)
 * a `targetDate`, preservando o DIA de `targetDate`.
 * Usado quando há data detectada mas nenhuma hora informada.
 */
export function applyDefaultTimeToDate(targetDate: Date, now: Date = new Date()): Date {
  const slot = nextDefaultDueTime(now);
  const d = new Date(targetDate);
  d.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
  return d;
}

/**
 * Combina a HORA original da tarefa com uma nova DATA (yyyy-mm-dd, local).
 * Regra de adiar/mudar data: preserva a hora já cadastrada na tarefa.
 * Se a tarefa não tiver hora (due_at null), usa a hora-padrão (próximo slot).
 */
export function rescheduleToDate(
  dateString: string,
  originalDueAt: string | null,
  now: Date = new Date()
): string {
  const base = new Date(dateString + 'T00:00:00');
  applyTimeFromOriginalOrDefault(base, originalDueAt, now);
  return base.toISOString();
}

/**
 * Adia para o dia seguinte preservando a HORA original da tarefa.
 * Se a tarefa não tiver hora, usa a hora-padrão (próximo slot).
 */
export function postponeToTomorrow(
  originalDueAt: string | null,
  now: Date = new Date()
): string {
  const d = new Date(now);
  d.setDate(d.getDate() + 1);
  applyTimeFromOriginalOrDefault(d, originalDueAt, now);
  return d.toISOString();
}

/** Mutaciona `target` aplicando a hora original (se houver) ou a hora-padrão. */
function applyTimeFromOriginalOrDefault(
  target: Date,
  originalDueAt: string | null,
  now: Date
): void {
  if (originalDueAt) {
    const orig = new Date(originalDueAt);
    if (!isNaN(orig.getTime())) {
      target.setHours(orig.getHours(), orig.getMinutes(), 0, 0);
      return;
    }
  }
  const slot = nextDefaultDueTime(now);
  target.setHours(slot.getHours(), slot.getMinutes(), 0, 0);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return (
    d.toLocaleDateString('pt-BR') +
    ' às ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  );
}

export function wasEdited(created_at: string, updated_at: string): boolean {
  return Math.abs(new Date(updated_at).getTime() - new Date(created_at).getTime()) > 60_000;
}
