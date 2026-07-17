import type { PreferredPeriod, TaskDecisionMetadata } from '../types';

export type DecisionCaptureHints = {
  cleanedText: string;
  estimatedMinutes?: number;
  priority?: number;
  metadata?: TaskDecisionMetadata;
};

const LOCATION_ALIASES: Array<[RegExp, NonNullable<TaskDecisionMetadata['location']>]> = [
  [/casa/i, 'home'],
  [/companhia|quartel/i, 'company'],
  [/centro/i, 'center'],
  [/carro|ve[ií]culo/i, 'car'],
  [/f[oó]rum/i, 'forum'],
  [/igreja|ccb/i, 'church'],
  [/remoto|online/i, 'remote'],
  [/qualquer(?:\s+local)?/i, 'anywhere'],
];

const PERIOD_ALIASES: Array<[RegExp, PreferredPeriod]> = [
  [/manh[aã]/i, 'morning'],
  [/tarde/i, 'afternoon'],
  [/noite/i, 'evening'],
  [/qualquer(?:\s+hor[aá]rio)?/i, 'any'],
];

function compact(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/\s+([,.;])/g, '$1').trim();
}

/** Extrai apenas pistas explícitas. A função é pura e não depende de IA;
 * qualquer texto não reconhecido permanece intacto para o parser principal. */
export function extractDecisionCaptureHints(rawText: string): DecisionCaptureHints {
  let cleanedText = rawText;
  const metadata: TaskDecisionMetadata = {};
  let estimatedMinutes: number | undefined;
  let priority: number | undefined;

  const dependencyMatch = cleanedText.match(/\b(?:depende\s+de|ap[oó]s\s+concluir)\s*[:-]?\s*["“]?(.+?)["”]?\s*$/i);
  if (dependencyMatch?.[1]) {
    metadata.dependency_titles = dependencyMatch[1]
      .split(/\s*(?:,|\+|\be\b)\s*/i)
      .map((value) => compact(value.replace(/["“”]/g, '')))
      .filter((value) => value.length > 0);
    cleanedText = cleanedText.replace(dependencyMatch[0], ' ');
  }

  const explicitDurationHours = cleanedText.match(/(?:~|dura[cç][aã]o\s*:?\s*)(\d+(?:[.,]\d+)?)\s*(?:h|hora|horas)\b/i);
  const wordDurationHours = cleanedText.match(/\b(\d+(?:[.,]\d+)?)\s*(?:hora|horas)\b/i);
  const shortDurationHours = cleanedText.match(/\b([1-4](?:[.,]\d+)?)\s*h\b/i);
  const shortDurationPrefix = shortDurationHours?.index == null
    ? ''
    : cleanedText.slice(0, shortDurationHours.index);
  const shortLooksLikeClock = /(?:\bàs|\bas)\s*$/i.test(shortDurationPrefix);
  const durationHours = explicitDurationHours
    ?? wordDurationHours
    ?? (shortLooksLikeClock ? null : shortDurationHours);
  const durationMinutes = cleanedText.match(/(?:~|dura[cç][aã]o\s*:?\s*)?(\d{1,3})\s*(?:min|mins|minuto|minutos)\b/i);
  if (durationHours) {
    estimatedMinutes = Math.max(5, Math.round(Number(durationHours[1].replace(',', '.')) * 60));
    cleanedText = cleanedText.replace(durationHours[0], ' ');
  } else if (durationMinutes) {
    estimatedMinutes = Math.max(5, Number(durationMinutes[1]));
    cleanedText = cleanedText.replace(durationMinutes[0], ' ');
  }

  const locationMatch = cleanedText.match(/(?:^|\s)(?:@|local\s*:?\s*)(casa|companhia|quartel|centro|carro|ve[ií]culo|f[oó]rum|igreja|ccb|remoto|online|qualquer(?:\s+local)?)(?=\s|$)/i);
  if (locationMatch?.[1]) {
    const matchedLocation = LOCATION_ALIASES.find(([pattern]) => pattern.test(locationMatch[1]));
    if (matchedLocation) metadata.location = matchedLocation[1];
    cleanedText = cleanedText.replace(locationMatch[0], ' ');
  }

  const periodMatch = cleanedText.match(/(?:^|\s)(?:@|per[ií]odo\s*:?\s*|pela?\s+)(manh[aã]|tarde|noite|qualquer(?:\s+hor[aá]rio)?)(?=\s|$)/i);
  if (periodMatch?.[1]) {
    const matchedPeriod = PERIOD_ALIASES.find(([pattern]) => pattern.test(periodMatch[1]));
    if (matchedPeriod) metadata.preferred_period = matchedPeriod[1];
    cleanedText = cleanedText.replace(periodMatch[0], ' ');
  }

  const impactMatch = cleanedText.match(/\bimpacto\s+(cr[ií]tico|alto|m[eé]dio|baixo)\b/i);
  if (impactMatch?.[1]) {
    const level = impactMatch[1].toLocaleLowerCase('pt-BR');
    priority = level.startsWith('cr') ? 10 : level === 'alto' ? 8 : level.startsWith('m') ? 5 : 2;
    cleanedText = cleanedText.replace(impactMatch[0], ' ');
  }

  const hasMetadata = Object.keys(metadata).length > 0;
  return {
    cleanedText: compact(cleanedText),
    ...(estimatedMinutes != null ? { estimatedMinutes } : {}),
    ...(priority != null ? { priority } : {}),
    ...(hasMetadata ? { metadata } : {}),
  };
}
