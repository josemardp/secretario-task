import type { RecurrenceRule, RecurrenceRuleV2 } from '../types';

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

// ─── Parser V2 ───────────────────────────────────────────────────

/** Tenta interpretar uma regra como RecurrenceRuleV2.
 * Retorna null para regras legadas que não mapeiam limpo para V2
 * (odd_days, even_days, listas de dias da semana). */
export function parseRecurrenceRule(raw: string | null): RecurrenceRuleV2 | null {
  if (!raw) return null;

  // V2 = JSON compacto (identificado pelo prefixo '{')
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as RecurrenceRuleV2;
      if (parsed.freq && typeof parsed.interval === 'number') return parsed;
    } catch {
      // JSON malformado
    }
    return null;
  }

  // Mapeamento legado → V2 (apenas regras com equivalência direta)
  switch (raw) {
    case 'daily':   return { freq: 'daily',   interval: 1, end: null };
    case 'weekly':  return { freq: 'weekly',  interval: 1, end: null };
    case 'monthly': return { freq: 'monthly', interval: 1, end: null };
    default:        return null; // odd_days, even_days, listas: não mapeiam
  }
}

// ─── Descrição legível em PT-BR ──────────────────────────────────

const DOW_SHORT: Record<string, string> = {
  SU: 'Dom', MO: 'Seg', TU: 'Ter', WE: 'Qua', TH: 'Qui', FR: 'Sex', SA: 'Sab',
};
const ORDINAL_LABEL: Record<number, string> = {
  1: '1o', 2: '2o', 3: '3o', 4: '4o', [-1]: 'Ult',
};
const LEGACY_LABELS: Record<string, string> = {
  daily: 'Todo dia',
  'monday,tuesday,wednesday,thursday,friday': 'Dias uteis',
  weekly: 'Toda semana',
  monthly: 'Todo mes',
  odd_days: 'Dias impares',
  even_days: 'Dias pares',
};
const DAY_LABELS: Record<string, string> = {
  sunday: 'Dom', monday: 'Seg', tuesday: 'Ter', wednesday: 'Qua',
  thursday: 'Qui', friday: 'Sex', saturday: 'Sab',
};
const FREQ_SING: Record<string, string> = { daily: 'dia', weekly: 'semana', monthly: 'mes', yearly: 'ano' };
const FREQ_PLUR: Record<string, string> = { daily: 'dias', weekly: 'semanas', monthly: 'meses', yearly: 'anos' };

function describeV2(rule: RecurrenceRuleV2): string {
  const unit = rule.interval === 1 ? FREQ_SING[rule.freq] : FREQ_PLUR[rule.freq];
  let base = rule.interval === 1 ? `Todo ${unit}` : `A cada ${rule.interval} ${unit}`;

  if (rule.freq === 'monthly') {
    if (rule.byMonthDay != null) {
      base += rule.byMonthDay === 'last' ? ' · Ult dia' : ` · Dia ${rule.byMonthDay}`;
    } else if (rule.byDay != null && rule.bySetPos != null) {
      base += ` · ${ORDINAL_LABEL[rule.bySetPos]} ${DOW_SHORT[rule.byDay]}`;
    }
  }

  if (rule.end?.type === 'count') {
    base += ` · ${rule.end.value}x`;
  } else if (rule.end?.type === 'date') {
    const d = new Date(rule.end.value);
    base += ` · ate ${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`;
  }

  return base;
}

/** Retorna descrição legível da regra em PT-BR. */
export function describeRecurrenceRule(raw: string | null): string {
  if (!raw) return 'Nenhuma';

  if (raw.startsWith('{')) {
    try {
      const v2 = JSON.parse(raw) as RecurrenceRuleV2;
      if (v2.freq) return describeV2(v2);
    } catch {
      // JSON inválido
    }
  }

  if (LEGACY_LABELS[raw]) return LEGACY_LABELS[raw];

  const days = raw.split(',').map(r => DAY_LABELS[r.trim()]).filter(Boolean);
  if (days.length > 0) return days.join(', ');

  return raw;
}

// ─── Motor V2 ────────────────────────────────────────────────────

const DOW_CODE_MAP: Record<string, number> = {
  SU: 0, MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6,
};

function getNthWeekdayOfMonth(
  year: number,
  month: number,
  dayCode: string,
  pos: 1 | 2 | 3 | 4 | -1,
): Date | null {
  const targetDow = DOW_CODE_MAP[dayCode];
  if (targetDow === undefined) return null;

  if (pos === -1) {
    const lastDay = new Date(year, month + 1, 0);
    while (lastDay.getDay() !== targetDow) lastDay.setDate(lastDay.getDate() - 1);
    return lastDay;
  }

  const first = new Date(year, month, 1);
  while (first.getDay() !== targetDow) first.setDate(first.getDate() + 1);
  first.setDate(first.getDate() + (pos - 1) * 7);
  if (first.getMonth() !== month) return null;
  return first;
}

/** Calcula a próxima ocorrência avançando a partir de `baseDateStr` pelo intervalo da regra. */
export function getNextOccurrenceV2(
  baseDateStr: string | null,
  rule: RecurrenceRuleV2,
): string | null {
  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const endDate = rule.end?.type === 'date' ? new Date(rule.end.value + 'T23:59:59') : null;

  if (endDate && base >= endDate) return null;

  let next: Date | null = null;

  switch (rule.freq) {
    case 'daily':
      next = new Date(base);
      next.setDate(next.getDate() + rule.interval);
      break;

    case 'weekly':
      next = new Date(base);
      next.setDate(next.getDate() + rule.interval * 7);
      break;

    case 'yearly':
      next = new Date(base);
      next.setFullYear(next.getFullYear() + rule.interval);
      break;

    case 'monthly': {
      next = new Date(base);
      next.setMonth(next.getMonth() + rule.interval);

      if (rule.byMonthDay != null) {
        if (rule.byMonthDay === 'last') {
          next.setDate(1);
          next.setMonth(next.getMonth() + 1);
          next.setDate(0);
        } else {
          next.setDate(rule.byMonthDay);
        }
      } else if (rule.byDay != null && rule.bySetPos != null) {
        next = getNthWeekdayOfMonth(next.getFullYear(), next.getMonth(), rule.byDay, rule.bySetPos);
      }
      break;
    }
  }

  if (!next) return null;
  next.setHours(base.getHours(), base.getMinutes(), 0, 0);

  if (endDate && next > endDate) return null;

  return next.toISOString();
}

// ─── Motor legado (replica lógica do taskStore) ───────────────────

function getNextLegacyOccurrence(baseDateStr: string | null, rule: string): string | null {
  const d = baseDateStr ? new Date(baseDateStr) : new Date();
  const now = new Date();

  do {
    if (rule === 'daily') {
      d.setDate(d.getDate() + 1);
    } else if (rule === 'weekly') {
      d.setDate(d.getDate() + 7);
    } else if (rule === 'monthly') {
      d.setMonth(d.getMonth() + 1);
    } else if (rule === 'odd_days') {
      d.setDate(d.getDate() + 1);
      while (d.getDate() % 2 === 0) d.setDate(d.getDate() + 1);
    } else if (rule === 'even_days') {
      d.setDate(d.getDate() + 1);
      while (d.getDate() % 2 !== 0) d.setDate(d.getDate() + 1);
    } else {
      const daysMap: Record<string, number> = {
        sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
        thursday: 4, friday: 5, saturday: 6,
      };
      const validDays = rule.toLowerCase().split(',')
        .map(r => daysMap[r.trim()])
        .filter((n): n is number => n !== undefined);

      if (validDays.length > 0) {
        for (let i = 1; i <= 7; i++) {
          d.setDate(d.getDate() + 1);
          if (validDays.includes(d.getDay())) break;
        }
      } else {
        d.setDate(d.getDate() + 7);
      }
    }
  } while (d < now && rule !== 'monthly');

  return d.toISOString();
}

/** Calcula a próxima ocorrência e a regra atualizada (com contagem decrementada se aplicável).
 * Retorna `nextDueAt: null` quando não deve gerar mais ocorrências. */
export function computeNextRuleAndDate(
  baseDateStr: string | null,
  ruleRaw: string,
): { nextDueAt: string | null; nextRule: string } {
  const v2 = parseRecurrenceRule(ruleRaw);

  if (v2) {
    if (v2.end?.type === 'count') {
      if (v2.end.value <= 1) {
        return { nextDueAt: null, nextRule: ruleRaw };
      }
      const newV2: RecurrenceRuleV2 = { ...v2, end: { type: 'count', value: v2.end.value - 1 } };
      return { nextDueAt: getNextOccurrenceV2(baseDateStr, v2), nextRule: JSON.stringify(newV2) };
    }
    return { nextDueAt: getNextOccurrenceV2(baseDateStr, v2), nextRule: ruleRaw };
  }

  return { nextDueAt: getNextLegacyOccurrence(baseDateStr, ruleRaw), nextRule: ruleRaw };
}

// ─── Lógica de reagendamento (usado na Agenda) ───────────────────

/** Retorna a próxima data válida para a regra a partir de agora,
 * preservando o horário original da tarefa. */
export function getNextOccurrenceFromNow(
  baseDateStr: string | null,
  rule: string,
): string | null {
  // V2 JSON: delega diretamente ao motor V2
  if (rule.startsWith('{')) {
    try {
      const v2 = JSON.parse(rule) as RecurrenceRuleV2;
      if (v2.freq) return getNextOccurrenceV2(baseDateStr, v2);
    } catch {
      return null;
    }
  }

  const base = baseDateStr ? new Date(baseDateStr) : new Date();
  const now = new Date();

  const candidate = new Date(now);
  candidate.setHours(base.getHours(), base.getMinutes(), 0, 0);
  if (candidate <= now) candidate.setDate(candidate.getDate() + 1);

  if (rule === 'daily') return candidate.toISOString();

  if (rule === 'weekly') {
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
    const next = ALL_WEEKDAY_KEYS.filter(k => k !== key).join(',');
    return (next || null) as RecurrenceRule;
  }
  const days = typeof current === 'string'
    ? current.split(',').filter(Boolean)
    : [];
  const next = days.includes(key)
    ? days.filter(k => k !== key)
    : [...days, key];
  const ordered = ALL_WEEKDAY_KEYS.filter(k => next.includes(k));
  if (ordered.length === 7) return 'daily';
  return (ordered.length ? ordered.join(',') : null) as RecurrenceRule;
}

/** Alterna um preset: se já ativo, volta para null; senão, aplica o preset. */
export function togglePreset(current: RecurrenceRule, value: string): RecurrenceRule {
  return (current === value ? null : value) as RecurrenceRule;
}
