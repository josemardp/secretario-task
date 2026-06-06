import type { RecurrenceRule } from '../types';

// ─── Constantes de UI ────────────────────────────────────────────

export const WEEKDAY_PILLS: { label: string; key: string }[] = [
  { label: 'Dom', key: 'sunday' },
  { label: 'Seg', key: 'monday' },
  { label: 'Ter', key: 'tuesday' },
  { label: 'Qua', key: 'wednesday' },
  { label: 'Qui', key: 'thursday' },
  { label: 'Sex', key: 'friday' },
  { label: 'Sab', key: 'saturday' },
];

export const RECURRENCE_PRESETS: { label: string; value: string }[] = [
  { label: 'Diario',      value: 'daily' },
  { label: 'Dias uteis',  value: 'monday,tuesday,wednesday,thursday,friday' },
  { label: 'Semanal',     value: 'weekly' },
  { label: 'Mensal',      value: 'monthly' },
  { label: 'Impares',     value: 'odd_days' },
  { label: 'Pares',       value: 'even_days' },
];

// ─── Lógica de reagendamento ─────────────────────────────────────

/** Retorna a próxima data válida para a regra a partir de agora,
 * preservando o horário original da tarefa. */
export function getNextOccurrenceFromNow(
  baseDateStr: string | null,
  rule: string,
): string | null {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const now = new Date();

  // Candidato inicial = hoje (ou amanhã se já passou hoje)
  const candidate = new Date(now);
  candidate.setHours(base.getHours(), base.getMinutes(), 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);

  if (rule === 'daily') return candidate.toISOString();

  if (rule === 'weekly') {
    // Próxima ocorrência no mesmo dia da semana do base
    const targetDow = base.getDay();
    while (candidate.getDay() !== targetDow) candidate.setDate(candidate.getDate() + 1);
    return candidate.toISOString();
  }

  if (rule === 'monthly') {
    candidate.setDate(base.getDate());
    if (candidate <= now) candidate.setMonth(candidate.getMonth() + 1);
    return candidate.toISOString();
  }

  if (rule === 'odd_days') {
    while (candidate.getDate() % 2 === 0) candidate.setDate(candidate.getDate() + 1);
    return candidate.toISOString();
  }

  if (rule === 'even_days') {
    while (candidate.getDate() % 2 !== 0) candidate.setDate(candidate.getDate() + 1);
    return candidate.toISOString();
  }

  // Lista de dias da semana (ex: 'monday,friday')
  const daysMap: Record<string, number> = {
    sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
    thursday: 4, friday: 5, saturday: 6,
  };
  const validDows = rule.split(',').map(r => daysMap[r.trim()]).filter(n => n !== undefined);
  if (validDows.length > 0) {
    for (let i = 0; i < 7; i++) {
      if (validDows.includes(candidate.getDay())) return candidate.toISOString();
      candidate.setDate(candidate.getDate() + 1);
    }
  }

  return null;
}

// ─── Helpers de toggle para o seletor de dias ────────────────────

const ALL_WEEKDAY_KEYS = WEEKDAY_PILLS.map(d => d.key);

/** Alterna um dia da semana na regra atual. Retorna a nova RecurrenceRule.
 *
 * Promoção automática: quando todos os 7 dias ficam selecionados, a regra
 * é promovida para 'daily'. Ao remover qualquer dia de 'daily', a regra
 * passa para a lista dos 6 dias restantes. */
export function toggleWeekday(current: RecurrenceRule, key: string): RecurrenceRule {
  if (current === 'daily') {
    // daily → remove este dia (passa para lista com os 6 restantes)
    const next = ALL_WEEKDAY_KEYS.filter(k => k !== key).join(',');
    return (next || null) as RecurrenceRule;
  }
  const days = typeof current === 'string'
    ? current.split(',').filter(Boolean)
    : [];
  const next = days.includes(key)
    ? days.filter(k => k !== key)
    : [...days, key];
  // Ordena pela ordem canônica da semana
  const ordered = ALL_WEEKDAY_KEYS.filter(k => next.includes(k));
  // Promoção: 7 dias selecionados → 'daily'
  if (ordered.length === 7) return 'daily';
  return (ordered.length ? ordered.join(',') : null) as RecurrenceRule;
}

/** Alterna um preset: se já ativo, volta para null; senão, aplica o preset. */
export function togglePreset(current: RecurrenceRule, value: string): RecurrenceRule {
  return (current === value ? null : value) as RecurrenceRule;
}
