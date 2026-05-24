import type { ContextType, Task } from '../types';

const CONTEXTS: ContextType[] = ['PM', 'Esdra', 'Pessoal', 'Familia', 'CCB', 'Estudo', 'Saude'];

export function parseTaskInput(rawText: string, defaultContext: ContextType): Partial<Task> {
  let title = rawText;
  let context: ContextType = defaultContext;
  let priority = 0;
  let due_at: Date | null = null;
  
  // Parse Context
  const contextRegex = /@(PM|Esdra|Pessoal|Familia|CCB|Estudo|Saude)/i;
  const contextMatch = title.match(contextRegex);
  if (contextMatch) {
    const matched = contextMatch[1].toLowerCase();
    const foundContext = CONTEXTS.find(c => c.toLowerCase() === matched);
    if (foundContext) context = foundContext;
    title = title.replace(contextRegex, '');
  }

  // Parse Priority
  const priorityKeywordRegex = /prioridade\s+(alta|média|media|baixa|urgente)/i;
  const priorityKeywordMatch = title.match(priorityKeywordRegex);
  if (priorityKeywordMatch) {
    const keyword = priorityKeywordMatch[1].toLowerCase();
    if (keyword === 'baixa') priority = 2;
    if (keyword === 'media' || keyword === 'média') priority = 5;
    if (keyword === 'alta') priority = 8;
    if (keyword === 'urgente') priority = 10;
    title = title.replace(priorityKeywordRegex, '');
  } else {
    const pRegex = /\bp([0-9]|10)\b/i;
    const pMatch = title.match(pRegex);
    if (pMatch) {
      priority = parseInt(pMatch[1], 10);
      title = title.replace(pRegex, '');
    }
  }

  // Parse Date (Relative days)
  const today = new Date();
  let baseDate = new Date();
  let dateFound = false;

  const wordRegex = /(?:^|\s)(hoje|amanhã|amanha|depois\s+de\s+amanhã|depois\s+de\s+amanha|segunda(?:-feira)?|terça(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sábado|sabado|domingo)(?:\s|$)/i;
  const dateMatch = title.match(wordRegex);
  if (dateMatch) {
    dateFound = true;
    const word = dateMatch[1].toLowerCase();
    title = title.replace(new RegExp(`(?:^|\\s)${word}(?:\\s|$)`, 'i'), ' ');

    if (word === 'hoje') {
      // baseDate is already today
    } else if (word === 'amanhã' || word === 'amanha') {
      baseDate.setDate(today.getDate() + 1);
    } else if (word.includes('depois')) {
      baseDate.setDate(today.getDate() + 2);
    } else {
      // Days of the week
      const days = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
      const targetDay = days.findIndex(d => word.includes(d) || (word === 'terca' && d === 'terça') || (word === 'sabado' && d === 'sábado'));
      if (targetDay !== -1) {
        let diff = targetDay - today.getDay();
        if (diff <= 0) diff += 7; // Next occurrence
        baseDate.setDate(today.getDate() + diff);
      }
    }
  }

  // Parse Time
  let timeFound = false;
  // Matches formats like "às 14h", "14:30h", "14h"
  const timeRegex = /(?:às\s+)?([0-9]{1,2})(?::([0-9]{2}))?h?\b/i;
  const timeMatch = title.match(timeRegex);
  
  if (timeMatch) {
    timeFound = true;
    const hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    
    // Ensure valid time
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      baseDate.setHours(hours, minutes, 0, 0);
      title = title.replace(timeRegex, '');
      
      // If they specified a time but no date, assume today
      dateFound = true;
    }
  } else if (dateFound) {
    // If date was found but no time, set to end of day
    baseDate.setHours(23, 59, 59, 999);
  }

  if (dateFound) {
    due_at = baseDate;
  }

  // Cleanup title spaces
  title = title.replace(/\s+/g, ' ').trim();

  return {
    title,
    context,
    priority,
    ...(due_at ? { due_at: due_at.toISOString() } : {})
  };
}
