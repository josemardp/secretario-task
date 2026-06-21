import type { Task, ContextType } from '../types';
import { parseTaskInput } from './parser';

const OPENAI_API_URL = 'https://api.openai.com/v1';
const CONTEXTS = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];

// Extrai horário no formato brasileiro "09h05" ou "09:05" de um texto
function extractBrazilianTime(text: string): { hour: number; minute: number } | null {
  // Formato "09h05", "9h5", "9h00"
  const hMatch = text.match(/\b(\d{1,2})h(\d{2})\b/i);
  if (hMatch) return { hour: parseInt(hMatch[1]), minute: parseInt(hMatch[2]) };
  // Formato "às 09:05", "as 9:05"
  const colonMatch = text.match(/\b(?:às?|as)\s+(\d{1,2}):(\d{2})\b/i);
  if (colonMatch) return { hour: parseInt(colonMatch[1]), minute: parseInt(colonMatch[2]) };
  return null;
}

// Extrai regra de recorrência de um texto em português — retorna string legada ou JSON V2
function extractRecurrenceRule(text: string): string | null {
  const t = text.toLowerCase();

  // ── Padrões legados simples (sem intervalo, sem ordinal) ──────────────
  if (/segunda[- ]a[- ]sexta|dias?\s+út(?:e|ei)is?|todo\s+dia\s+út(?:e|ei)l/i.test(t))
    return 'monday,tuesday,wednesday,thursday,friday';
  if (/toda\s+segunda/i.test(t)) return 'monday';
  if (/toda\s+ter[cç]a/i.test(t)) return 'tuesday';
  if (/toda\s+quarta/i.test(t)) return 'wednesday';
  if (/toda\s+quinta/i.test(t)) return 'thursday';
  if (/toda\s+sexta/i.test(t)) return 'friday';
  if (/todo\s+s[aá]bado/i.test(t)) return 'saturday';
  if (/todo\s+domingo/i.test(t)) return 'sunday';

  // ── Detecta intervalo numérico ─────────────────────────────────────────
  const intervalMatch =
    t.match(/a\s+cada\s+(\d+)\s+(dia|semana|m[eê]s|ano)s?/i) ??
    t.match(/(todo|toda)\s+(dia|semana|m[eê]s|ano)/i);

  let freq: 'daily' | 'weekly' | 'monthly' | 'yearly' | null = null;
  let interval = 1;

  if (intervalMatch) {
    if (intervalMatch[0].toLowerCase().startsWith('a cada')) {
      interval = parseInt(intervalMatch[1], 10);
    }
    const unit = intervalMatch[2].toLowerCase();
    if (unit.startsWith('dia')) freq = 'daily';
    else if (unit.startsWith('semana')) freq = 'weekly';
    else if (unit.startsWith('m')) freq = 'monthly';
    else if (unit.startsWith('ano')) freq = 'yearly';
  } else {
    if (/todo\s+dia|diariamente|todos\s+os\s+dias/i.test(t)) freq = 'daily';
    else if (/toda\s+semana|semanalmente/i.test(t)) freq = 'weekly';
    else if (/todo\s+m[eê]s|mensalmente/i.test(t)) freq = 'monthly';
    else if (/todo\s+ano|anualmente/i.test(t)) freq = 'yearly';
  }

  if (!freq) return null;

  // ── Detecta ordinal + dia da semana (apenas para monthly) ─────────────
  type DayCode = 'SU' | 'MO' | 'TU' | 'WE' | 'TH' | 'FR' | 'SA';
  type SetPos = 1 | 2 | 3 | 4 | -1;

  let byDay: DayCode | undefined;
  let bySetPos: SetPos | undefined;
  let byMonthDay: number | 'last' | undefined;

  if (freq === 'monthly') {
    const ordinalMap: Record<string, number> = {
      'primeiro': 1, 'primeira': 1, '1o': 1, '1º': 1,
      'segundo': 2, 'segunda': 2, '2o': 2, '2º': 2,
      'terceiro': 3, 'terceira': 3, '3o': 3, '3º': 3,
      'quarto': 4, 'quarta': 4, '4o': 4, '4º': 4,
      'último': -1, 'ultima': -1,
    };
    const dowMap: Record<string, DayCode> = {
      'domingo': 'SU', 'segunda': 'MO', 'terca': 'TU', 'terça': 'TU',
      'quarta': 'WE', 'quinta': 'TH', 'sexta': 'FR',
      'sabado': 'SA', 'sábado': 'SA',
    };

    const ordinalRegex = new RegExp(
      `(${Object.keys(ordinalMap).join('|')})[a-z()]*\\s+(${Object.keys(dowMap).join('|')})`,
      'i',
    );
    const ordinalMatch = t.match(ordinalRegex);
    if (ordinalMatch) {
      const posVal = ordinalMap[ordinalMatch[1].toLowerCase().replace(/[()]/g, '')];
      const dayVal = dowMap[ordinalMatch[2].toLowerCase().replace(/[()]/g, '')];
      if (posVal !== undefined && dayVal !== undefined) {
        bySetPos = posVal as SetPos;
        byDay = dayVal;
      }
    } else if (/[uú]ltimo\s+dia/i.test(t)) {
      byMonthDay = 'last';
    } else {
      const dayNumMatch = t.match(/\bdia\s+(\d{1,2})\b/i);
      if (dayNumMatch) byMonthDay = parseInt(dayNumMatch[1], 10);
    }
  }

  // ── Detecta término ───────────────────────────────────────────────────
  type EndRule = { type: 'count'; value: number } | { type: 'date'; value: string } | null;
  let end: EndRule = null;

  const countMatch =
    t.match(/ap[oó]s\s+(\d+)\s+ocorr[eê]ncia/i) ??
    t.match(/(\d+)\s+vezes/i) ??
    t.match(/(\d+)\s+repeti[cç][oõ]es/i);
  if (countMatch) {
    end = { type: 'count', value: parseInt(countMatch[1], 10) };
  }

  if (!end) {
    const dateEndMatch = t.match(/at[eé]\s+(\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (dateEndMatch) {
      const [d, m, y] = dateEndMatch[1].split('/');
      const year = y.length === 2 ? `20${y}` : y;
      end = { type: 'date', value: `${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}` };
    }
  }

  // ── Monta regra V2 ou retorna legada se não há nada V2-específico ──────
  const isSimple =
    interval === 1 &&
    byDay === undefined &&
    bySetPos === undefined &&
    byMonthDay === undefined &&
    !end;
  if (isSimple) {
    const legacyMap: Record<string, string> = {
      daily: 'daily', weekly: 'weekly', monthly: 'monthly', yearly: 'yearly',
    };
    return legacyMap[freq] ?? null;
  }

  return JSON.stringify({
    freq,
    interval,
    ...(byDay !== undefined && bySetPos !== undefined ? { byDay, bySetPos } : {}),
    ...(byMonthDay !== undefined ? { byMonthDay } : {}),
    end,
  });
}

// Dado um due_at retornado pela AI e o tempo correto, reaplica hora e minuto locais em UTC
function applyLocalTimeToDate(dueAt: string | null | undefined, time: { hour: number; minute: number }): string {
  const tzOffsetMin = new Date().getTimezoneOffset(); // ex: 180 para UTC-3
  const base = dueAt ? new Date(dueAt) : new Date();
  if (isNaN(base.getTime())) {
    const fallback = new Date();
    fallback.setUTCHours(time.hour + tzOffsetMin / 60, time.minute, 0, 0);
    return fallback.toISOString();
  }
  // Mantém a DATA que a AI escolheu, apenas substitui o horário
  const utcHour = time.hour + tzOffsetMin / 60;
  base.setUTCHours(Math.floor(utcHour) % 24, time.minute, 0, 0);
  return base.toISOString();
}

export async function parseMultipleTasks(rawText: string, defaultContext: ContextType, apiKey?: string | null): Promise<Partial<Task>[]> {
  if (!apiKey) {
    const lines = rawText.split(/\r?\n/);
    const tasks: Partial<Task>[] = [];
    for (const line of lines) {
      const cleanLine = line.trim().replace(/^-/, '').trim();
      if (cleanLine.length < 3) continue;
      if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
        tasks.push(parseTaskInput(cleanLine, defaultContext));
      } else {
        const parts = cleanLine.split(/(?:,|\be\b|\bdepois\b|\blogo\b)/i).filter(p => p.trim().length > 3);
        if (parts.length === 0) parts.push(cleanLine);
        tasks.push(...parts.map(p => parseTaskInput(p.trim(), defaultContext)));
      }
    }
    return tasks;
  }

  const now = new Date();
  const tzOffset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(Date.now() - tzOffset)).toISOString().slice(0, -1);

  // Linhas originais para pós-processamento determinístico
  const originalLines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);

  // Recorrência do texto inteiro (se todas as tarefas compartilharem o mesmo padrão)
  const globalRecurrence = extractRecurrenceRule(rawText);

  const systemPrompt = `Você é um extrator de tarefas em português brasileiro. Extraia CADA TAREFA e devolva APENAS JSON com array "tasks". Não pule nenhuma.

Para cada tarefa extraia:
- title: string (limpo, sem datas/horas/bullets)
- context: "PM"|"Esdra"|"Pessoal"|"Familia"|"CCB"|"Estudo"|"Saude"
- priority: 0-10 (urgente=10, alta=8, média=5, baixa=2, padrão=0)
- energy: 0-10 (alta=8, média=5, baixa=2, padrão=0)
- due_at: ISO 8601 UTC ou null (data/hora local atual: ${localISOTime}, UTC-3)
- recurrence_rule: string | null. Use strings legadas simples ("daily","weekly","monthly","monday,tuesday,...") para recorrências simples. Para recorrências avançadas (intervalo N, ordinal, término), use JSON compacto: {"freq":"monthly","interval":3,"byDay":"SA","bySetPos":3,"end":{"type":"count","value":12}}. bySetPos: 1=primeiro, 2=segundo, 3=terceiro, 4=quarto, -1=último. byDay: SU MO TU WE TH FR SA.

Responda APENAS com JSON válido com array "tasks".`;

  try {
    const response = await fetch(`${OPENAI_API_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: rawText }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error('API Falhou');

    const data = await response.json();
    const content = JSON.parse(data.choices[0].message.content);

    if (content.tasks && Array.isArray(content.tasks)) {
      return content.tasks.map((t: any, idx: number) => {
        // Linha original correspondente (melhor esforço: por índice)
        const originalLine = originalLines[idx] ?? rawText;

        // ── Pós-processamento determinístico de HORÁRIO ──────────────────
        // A AI erra sistematicamente o formato "09h05". Corrigimos no cliente.
        const timeFromText = extractBrazilianTime(originalLine) ?? extractBrazilianTime(rawText);
        let finalDueAt: string | undefined = t.due_at ?? undefined;

        // Normaliza formato DD/MM/YYYY retornado pela AI
        if (finalDueAt?.match(/^\d{2}\/\d{2}\/\d{4}/)) {
          const [datePart, timePart] = finalDueAt.split(' ');
          const [d, m, y] = datePart.split('/');
          const [h, min] = timePart ? timePart.split(':') : ['09', '00'];
          finalDueAt = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min)).toISOString();
        }

        if (finalDueAt && isNaN(new Date(finalDueAt).getTime())) finalDueAt = undefined;

        // Se encontrou horário no texto original, sobrescreve o horário da AI
        if (timeFromText) {
          finalDueAt = applyLocalTimeToDate(finalDueAt, timeFromText);
        }

        // ── Pós-processamento determinístico de RECORRÊNCIA ───────────────
        const recurrence = t.recurrence_rule
          || extractRecurrenceRule(originalLine)
          || globalRecurrence
          || undefined;

        return {
          title: String(t.title || rawText),
          context: CONTEXTS.includes(t.context) ? t.context as ContextType : defaultContext,
          priority: Number(t.priority) || 0,
          energy: Number(t.energy) || 0,
          due_at: finalDueAt,
          recurrence_rule: recurrence,
        };
      });
    }
  } catch (e) {
    console.error('Fallback ativado. Erro no parse:', e);
  }

  // Fallback sem API
  const lines = rawText.split(/\r?\n/);
  const tasks: Partial<Task>[] = [];
  for (const line of lines) {
    const cleanLine = line.trim().replace(/^-/, '').trim();
    if (cleanLine.length < 3) continue;
    if (line.trim().startsWith('-') || line.trim().match(/^\d+\./)) {
      tasks.push(parseTaskInput(cleanLine, defaultContext));
    } else {
      const parts = cleanLine.split(/(?:,|\be\b|\bdepois\b|\blogo\b)/i).filter(p => p.trim().length > 3);
      if (parts.length === 0) parts.push(cleanLine);
      tasks.push(...parts.map(p => parseTaskInput(p.trim(), defaultContext)));
    }
  }
  return tasks;
}
