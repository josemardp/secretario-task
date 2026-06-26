import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { RecurrenceRuleV2 } from '../types';
import { parseRecurrenceRule } from '../lib/recurrence';

type DayCode = NonNullable<RecurrenceRuleV2['byDay']>;
type SetPos = NonNullable<RecurrenceRuleV2['bySetPos']>;
type Freq = RecurrenceRuleV2['freq'];

interface FormState {
  freq: Freq;
  interval: number;
  monthType: 'day' | 'ordinal';
  byMonthDay: number | 'last';
  byDay: DayCode;
  bySetPos: SetPos;
  endType: 'never' | 'date' | 'count';
  endDate: string;
  endCount: number;
  time: string;
}

export interface RecurrenceModalProps {
  dueAt: string | null;
  currentRule: string | null;
  onSave: (rule: string | null, newDueAt?: string) => void;
  onClose: () => void;
}

const BYDAY_OPTIONS: { value: DayCode; label: string }[] = [
  { value: 'SU', label: 'Domingo' },
  { value: 'MO', label: 'Segunda' },
  { value: 'TU', label: 'Terça' },
  { value: 'WE', label: 'Quarta' },
  { value: 'TH', label: 'Quinta' },
  { value: 'FR', label: 'Sexta' },
  { value: 'SA', label: 'Sábado' },
];

const BYSETPOS_OPTIONS: { value: SetPos; label: string }[] = [
  { value: 1,  label: 'Primeiro(a)' },
  { value: 2,  label: 'Segundo(a)' },
  { value: 3,  label: 'Terceiro(a)' },
  { value: 4,  label: 'Quarto(a)' },
  { value: -1, label: 'Último(a)' },
];

const MONTH_DAY_OPTIONS: { value: number | 'last'; label: string }[] = [
  ...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `Dia ${i + 1}` })),
  { value: 'last', label: 'Último dia' },
];

function timeFromISO(iso: string | null): string {
  if (!iso) return '08:00';
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function initForm(currentRule: string | null, dueAt: string | null): FormState {
  const base = dueAt ? new Date(dueAt) : new Date();
  const defaultTime = timeFromISO(dueAt);
  const v2 = parseRecurrenceRule(currentRule);

  if (v2) {
    return {
      freq: v2.freq,
      interval: v2.interval,
      monthType: v2.byDay != null ? 'ordinal' : 'day',
      byMonthDay: v2.byMonthDay ?? base.getDate(),
      byDay: v2.byDay ?? 'MO',
      bySetPos: v2.bySetPos ?? 1,
      endType: v2.end == null ? 'never' : v2.end.type,
      endDate: v2.end?.type === 'date' ? v2.end.value : '',
      endCount: v2.end?.type === 'count' ? v2.end.value : 1,
      time: defaultTime,
    };
  }

  return {
    freq: 'weekly',
    interval: 1,
    monthType: 'day',
    byMonthDay: base.getDate(),
    byDay: 'MO',
    bySetPos: 1,
    endType: 'never',
    endDate: '',
    endCount: 1,
    time: defaultTime,
  };
}

function serializeForm(form: FormState): string {
  const end: RecurrenceRuleV2['end'] =
    form.endType === 'never' ? null :
    form.endType === 'date'  ? { type: 'date',  value: form.endDate } :
                               { type: 'count', value: form.endCount };

  const rule: RecurrenceRuleV2 = { freq: form.freq, interval: form.interval, end };

  if (form.freq === 'monthly') {
    if (form.monthType === 'day') {
      rule.byMonthDay = form.byMonthDay;
    } else {
      rule.byDay    = form.byDay;
      rule.bySetPos = form.bySetPos;
    }
  }

  return JSON.stringify(rule);
}

function formatFirstDate(dueAt: string | null): string {
  if (!dueAt) return '';
  return new Date(dueAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

const INPUT_CLS = 'bg-paper2 rounded-lg px-3 text-ink border-0 outline-none h-11 font-semibold';
const SELECT_CLS = `${INPUT_CLS} w-full`;

export function RecurrenceModal({ dueAt, currentRule, onSave, onClose }: RecurrenceModalProps) {
  const [form, setForm] = useState<FormState>(() => initForm(currentRule, dueAt));

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    const rule = serializeForm(form);
    let newDueAt: string | undefined;
    if (dueAt && form.time) {
      const d = new Date(dueAt);
      const [h, m] = form.time.split(':').map(Number);
      d.setHours(h, m, 0, 0);
      newDueAt = d.toISOString();
    }
    onSave(rule, newDueAt);
  }

  const firstDate = formatFirstDate(dueAt);

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-sm bg-paper rounded-t-2xl sm:rounded-2xl shadow-xl flex flex-col max-h-[92vh]">

        {/* Cabeçalho */}
        <div className="px-4 pt-5 pb-3 border-b border-line shrink-0">
          <h2 className="text-[15px] font-bold text-ink tracking-tight">Recorrência</h2>
          {firstDate && (
            <p className="text-[12px] text-ink-2 mt-0.5">A primeira tarefa será em {firstDate}</p>
          )}
        </div>

        {/* Corpo com scroll */}
        <div className="px-4 py-4 space-y-5 overflow-y-auto flex-1">

          {/* Repetição a cada */}
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 block mb-2">
              Repetição a cada
            </span>
            <div className="flex gap-2">
              <input
                type="number"
                min={1}
                max={999}
                value={form.interval}
                onChange={(e) => set('interval', Math.max(1, Math.min(999, parseInt(e.target.value) || 1)))}
                className="w-20 bg-paper2 rounded-lg px-3 text-ink border-0 outline-none h-11 font-bold text-center"
                style={{ fontSize: '16px' }}
              />
              <select
                value={form.freq}
                onChange={(e) => set('freq', e.target.value as Freq)}
                className={`flex-1 ${INPUT_CLS}`}
                style={{ fontSize: '16px' }}
              >
                <option value="daily">Dias</option>
                <option value="weekly">Semanas</option>
                <option value="monthly">Meses</option>
                <option value="yearly">Anos</option>
              </select>
            </div>
          </div>

          {/* Opções mensais */}
          {form.freq === 'monthly' && (
            <div>
              <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 block mb-2">
                Dia do mês
              </span>
              <div className="space-y-1">
                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    checked={form.monthType === 'day'}
                    onChange={() => set('monthType', 'day')}
                    className="w-5 h-5 accent-ink shrink-0"
                  />
                  <span className="text-[13px] text-ink">Dia específico</span>
                  {form.monthType === 'day' && (
                    <select
                      value={form.byMonthDay}
                      onChange={(e) => {
                        const v = e.target.value === 'last' ? 'last' : parseInt(e.target.value);
                        set('byMonthDay', v as number | 'last');
                      }}
                      className="ml-auto bg-paper2 rounded-lg px-2 h-11 text-[13px] font-semibold text-ink border-0 outline-none"
                      style={{ fontSize: '16px' }}
                    >
                      {MONTH_DAY_OPTIONS.map(opt => (
                        <option key={String(opt.value)} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  )}
                </label>

                <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                  <input
                    type="radio"
                    checked={form.monthType === 'ordinal'}
                    onChange={() => set('monthType', 'ordinal')}
                    className="w-5 h-5 accent-ink shrink-0"
                  />
                  <span className="text-[13px] text-ink">Dia da semana</span>
                </label>

                {form.monthType === 'ordinal' && (
                  <div className="flex gap-2 pl-8 pt-1">
                    <select
                      value={form.bySetPos}
                      onChange={(e) => set('bySetPos', parseInt(e.target.value) as SetPos)}
                      className={`flex-1 ${INPUT_CLS}`}
                      style={{ fontSize: '16px' }}
                    >
                      {BYSETPOS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    <select
                      value={form.byDay}
                      onChange={(e) => set('byDay', e.target.value as DayCode)}
                      className={`flex-1 ${INPUT_CLS}`}
                      style={{ fontSize: '16px' }}
                    >
                      {BYDAY_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Horário */}
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 block mb-2">
              Horário
            </span>
            <input
              type="time"
              value={form.time}
              onChange={(e) => set('time', e.target.value)}
              className={SELECT_CLS}
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Término */}
          <div>
            <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-2 block mb-2">
              Término
            </span>
            <div className="space-y-1">
              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  checked={form.endType === 'never'}
                  onChange={() => set('endType', 'never')}
                  className="w-5 h-5 accent-ink shrink-0"
                />
                <span className="text-[13px] text-ink">Nunca</span>
              </label>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  checked={form.endType === 'date'}
                  onChange={() => set('endType', 'date')}
                  className="w-5 h-5 accent-ink shrink-0"
                />
                <span className="text-[13px] text-ink">Em</span>
                {form.endType === 'date' && (
                  <input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => set('endDate', e.target.value)}
                    className="ml-auto bg-paper2 rounded-lg px-2 h-11 text-[13px] text-ink border-0 outline-none"
                    style={{ fontSize: '16px' }}
                  />
                )}
              </label>

              <label className="flex items-center gap-3 min-h-[44px] cursor-pointer">
                <input
                  type="radio"
                  checked={form.endType === 'count'}
                  onChange={() => set('endType', 'count')}
                  className="w-5 h-5 accent-ink shrink-0"
                />
                <span className="text-[13px] text-ink">Após</span>
                {form.endType === 'count' && (
                  <>
                    <input
                      type="number"
                      min={1}
                      value={form.endCount}
                      onChange={(e) => set('endCount', Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 bg-paper2 rounded-lg px-2 h-11 text-[13px] font-bold text-ink border-0 outline-none text-center"
                      style={{ fontSize: '16px' }}
                    />
                    <span className="text-[13px] text-ink">ocorrências</span>
                  </>
                )}
              </label>
            </div>
          </div>
        </div>

        {/* Rodapé */}
        <div className="px-4 py-3 border-t border-line flex gap-2 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 h-11 rounded-xl text-[13px] font-bold text-ink bg-paper2 active:bg-line transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-11 rounded-xl text-[13px] font-bold text-white bg-ink active:opacity-75 transition-opacity"
          >
            Concluir
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
