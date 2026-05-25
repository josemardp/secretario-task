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

// Extrai regra de recorrência de um texto em português
function extractRecurrenceRule(text: string): string | null {
  if (/segunda[- ]a[- ]sexta|dias?\s+út(?:e|ei)is?|todo\s+dia\s+út(?:e|ei)l/i.test(text))
    return 'monday,tuesday,wednesday,thursday,friday';
  if (/todo\s+dia|diariamente|todos\s+os\s+dias/i.test(text))
    return 'daily';
  if (/toda\s+semana|semanalmente/i.test(text))
    return 'weekly';
  if (/todo\s+m[eê]s|mensalmente/i.test(text))
    return 'monthly';
  if (/toda(?:s)?\s+segunda/i.test(text)) return 'monday';
  if (/toda(?:s)?\s+ter[cç]a/i.test(text)) return 'tuesday';
  if (/toda(?:s)?\s+quarta/i.test(text)) return 'wednesday';
  if (/toda(?:s)?\s+quinta/i.test(text)) return 'thursday';
  if (/toda(?:s)?\s+sexta/i.test(text)) return 'friday';
  return null;
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
- recurrence_rule: "daily"|"weekly"|"monthly"|"monday,tuesday,..."|null

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
