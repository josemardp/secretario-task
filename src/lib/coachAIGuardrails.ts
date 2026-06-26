import type { Task } from '../types';
import { COACH_AI_GUARDRAILS_VERSION, COACH_AI_PROMPT_VERSION } from './coachAICache.js';
import { analyzeCoachSignals, type CoachSignal, type CoachSignalReport } from './coachSignals.js';
import { isActionableBriefingTask } from './taskFilters.js';

export type GovernedCoachConfidence = 'low' | 'medium' | 'high';

export interface GovernedCoachAITask {
  id: string;
  title: string;
  context: string;
  status: string;
  due_at: string | null;
  priority: number;
  energy: number;
  estimated_minutes: number | null;
  estimated_minutes_source: string | null;
}

export interface GovernedCoachAISignal {
  signal_id: string;
  severity: string;
  title: string;
  description: string;
  evidence: Record<string, number | string | string[]>;
  confidence: GovernedCoachConfidence;
  recommendation: string;
  weak_fields: string[];
}

export interface GovernedCoachAIPayload {
  generated_at: string;
  current_energy: number;
  top_tasks: GovernedCoachAITask[];
  coach_signals: GovernedCoachAISignal[];
  limitations: string[];
  data_policy: {
    completion: string;
    legacy_approx: string;
    actual_minutes_unknown: string;
    closed_without_execution: string;
    semantic_fields: string;
  };
}

export interface GovernedCoachAIResponse {
  summary: string;
  evidence: string[];
  limitations: string[];
  recommendation: string;
  confidence: GovernedCoachConfidence;
}

export interface GovernedCoachAIParseResult {
  response: GovernedCoachAIResponse;
  source: 'ai' | 'fallback';
  fallback_reason?: string;
}

export interface BuildGovernedCoachAIPayloadInput {
  topTasks: Task[];
  allTasks: Task[];
  energy: number;
  now: Date;
}

const PROHIBITED_LANGUAGE_PATTERNS = [
  /\bprocrastinador(?:a|es|as)?\b/i,
  /\bdesorganizado(?:a|s)?\b/i,
  /\bimprodutivo(?:a|s)?\b/i,
  /\bperfil psicol[oó]gico\b/i,
  /\btend[eê]ncia comportamental\b/i,
  /\bdiagn[oó]stic/i,
  /\bvoc[eê]\s+(?:é|tem)\b/i,
];

const BLOCKED_AI_TEXT =
  'Leitura operacional indisponivel: a resposta foi substituida por cautela de linguagem.';

export function buildGovernedCoachAIPayload({
  topTasks,
  allTasks,
  energy,
  now,
}: BuildGovernedCoachAIPayloadInput): GovernedCoachAIPayload {
  const report = analyzeCoachSignals({ tasks: allTasks, events: [], now });
  const actionableTopTasks = topTasks
    .filter((task) => isActionableBriefingTask(task, now))
    .slice(0, 10)
    .map(toGovernedTask);

  return {
    generated_at: now.toISOString(),
    current_energy: energy,
    top_tasks: actionableTopTasks,
    coach_signals: report.signals.map(toGovernedSignal),
    limitations: buildLimitations(report),
    data_policy: {
      completion: 'Use apenas completed_at com completed_at_confidence=confirmed como conclusao confirmada; updated_at nao e evidencia de conclusao.',
      legacy_approx: 'completed_at_confidence=legacy_approx e historico aproximado e deve aparecer apenas como limitacao.',
      actual_minutes_unknown: "actual_minutes_source='unknown' indica baixa confianca; nao trate como tempo real confiavel.",
      closed_without_execution: 'resolution_type cancelled/delegated/obsolete e encerramento sem execucao, nao produtividade.',
      semantic_fields: 'IA nao escreve resolution_type, blocker_type ou diagnostico; ela apenas narra sinais deterministicos.',
    },
  };
}

export function buildGovernedCoachPrompt(payload: GovernedCoachAIPayload): string {
  return `Voce e a narrativa segura do Coach de Produtividade do SecretarioTask.
Versao do prompt: ${COACH_AI_PROMPT_VERSION}.
Versao dos guardrails: ${COACH_AI_GUARDRAILS_VERSION}.
Use somente o payload governado abaixo. Nao use conhecimento externo nem inferencias psicologicas.
O payload ja contem sinais deterministicos do motor local; a IA apenas verbaliza esses sinais com cautela operacional.
Comece deixando claro que a narrativa segue o ranking deterministico, por exemplo: "Pelo ranking deterministico, ...".

Regras obrigatorias:
- Nao use updated_at como conclusao; esse campo nem deve aparecer no payload.
- Nao trate legacy_approx como conclusao confirmada.
- Nao trate actual_minutes_source='unknown' como tempo real confiavel.
- Nao misture conclusoes com tarefas encerradas sem execucao.
- Nao escreva ou sugira resolution_type ou blocker_type.
- Nao use termos como procrastinador, desorganizado, improdutivo, perfil psicologico, tendencia comportamental ou diagnostico.
- Nao produza score global.
- Seja breve, operacional e cauteloso.

Contrato de saida: responda APENAS JSON valido neste formato:
{
  "summary": "uma frase operacional",
  "evidence": ["ate 3 evidencias do payload"],
  "limitations": ["ate 3 limitacoes do payload"],
  "recommendation": "uma acao simples",
  "confidence": "low" | "medium" | "high"
}

Payload governado:
${JSON.stringify(payload, null, 2)}`;
}

export function parseGovernedCoachAIResponse(rawText: string, payload: GovernedCoachAIPayload): GovernedCoachAIResponse {
  return parseGovernedCoachAIResponseResult(rawText, payload).response;
}

export function parseGovernedCoachAIResponseResult(
  rawText: string,
  payload: GovernedCoachAIPayload,
): GovernedCoachAIParseResult {
  if (hasProhibitedLanguage(rawText)) {
    return {
      response: buildDeterministicCoachResponse(payload, BLOCKED_AI_TEXT),
      source: 'fallback',
      fallback_reason: 'prohibited_language',
    };
  }

  try {
    const parsed = JSON.parse(rawText) as Partial<GovernedCoachAIResponse>;
    const response: GovernedCoachAIResponse = {
      summary: sanitizeCoachNarrative(String(parsed.summary ?? '')),
      evidence: sanitizeStringList(parsed.evidence),
      limitations: sanitizeStringList(parsed.limitations),
      recommendation: sanitizeCoachNarrative(String(parsed.recommendation ?? '')),
      confidence: normalizeConfidence(parsed.confidence),
    };

    if (!response.summary || !response.recommendation) {
      return {
        response: buildDeterministicCoachResponse(payload),
        source: 'fallback',
        fallback_reason: 'invalid_contract',
      };
    }

    return {
      response: {
        ...response,
        evidence: response.evidence.length > 0 ? response.evidence.slice(0, 3) : fallbackEvidence(payload),
        limitations: response.limitations.length > 0 ? response.limitations.slice(0, 3) : payload.limitations.slice(0, 3),
      },
      source: 'ai',
    };
  } catch {
    return {
      response: buildDeterministicCoachResponse(payload),
      source: 'fallback',
      fallback_reason: 'invalid_json',
    };
  }
}

export function formatGovernedCoachNarrative(response: GovernedCoachAIResponse): string {
  const evidence = response.evidence[0] ? ` Evidencia: ${response.evidence[0]}.` : '';
  const limitation = response.limitations[0] ? ` Limitacao: ${response.limitations[0]}.` : '';
  return `${response.summary} ${response.recommendation}.${evidence}${limitation}`.replace(/\s+/g, ' ').trim();
}

export function buildDeterministicCoachNarrative(payload: GovernedCoachAIPayload): string {
  return formatGovernedCoachNarrative(buildDeterministicCoachResponse(payload));
}

export function sanitizeCoachNarrative(text: string): string {
  const trimmed = text.replace(/\s+/g, ' ').trim();
  if (!trimmed || hasProhibitedLanguage(trimmed)) return '';
  return trimmed;
}

export function hasProhibitedLanguage(text: string): boolean {
  return PROHIBITED_LANGUAGE_PATTERNS.some((pattern) => pattern.test(text));
}

function toGovernedTask(task: Task): GovernedCoachAITask {
  return {
    id: task.id,
    title: task.title,
    context: task.context,
    status: task.status,
    due_at: task.due_at,
    priority: task.priority,
    energy: task.energy,
    estimated_minutes: task.estimated_minutes ?? null,
    estimated_minutes_source: task.estimated_minutes_source ?? null,
  };
}

function toGovernedSignal(signal: CoachSignal): GovernedCoachAISignal {
  return {
    signal_id: signal.signal_id,
    severity: signal.severity,
    title: signal.title,
    description: signal.description,
    evidence: signal.evidence,
    confidence: signal.confidence,
    recommendation: signal.recommendation,
    weak_fields: signal.weak_fields,
  };
}

function buildLimitations(report: CoachSignalReport): string[] {
  const limitations = new Set<string>();

  if (report.confirmed_completions < 3) {
    limitations.add('Poucas conclusoes confirmadas; leitura deve permanecer cautelosa.');
  }

  if (report.legacy_completions > 0) {
    limitations.add('Historico legacy_approx existe e nao deve ser tratado como conclusao confirmada.');
  }

  if (report.closed_without_execution > 0) {
    limitations.add('Canceladas, delegadas e obsoletas sao encerramentos sem execucao.');
  }

  report.signals.forEach((signal) => {
    if (signal.weak_fields.includes('actual_minutes_source')) {
      limitations.add("actual_minutes_source='unknown' reduz confianca em tempo real.");
    }
    if (signal.weak_fields.some((field) => field.startsWith('estimated_minutes_source'))) {
      limitations.add('Estimativas com origem ai/default_30 tem confianca menor que dados manuais ou confirmados.');
    }
    if (signal.weak_fields.includes('blocker_type')) {
      limitations.add('Adiamentos sem blocker_type sao divida de dado, nao comportamento pessoal.');
    }
  });

  if (limitations.size === 0) {
    limitations.add('Sem limitacao forte detectada no payload governado.');
  }

  return [...limitations].sort();
}

function buildDeterministicCoachResponse(
  payload: GovernedCoachAIPayload,
  summaryOverride?: string,
): GovernedCoachAIResponse {
  const firstSignal = payload.coach_signals[0];
  const hasTasks = payload.top_tasks.length > 0;

  return {
    summary: summaryOverride || (hasTasks
      ? 'Pelo ranking deterministico, ha tarefas acionaveis para priorizar agora.'
      : 'Nao ha tarefas acionaveis no payload governado agora.'),
    evidence: fallbackEvidence(payload),
    limitations: payload.limitations.slice(0, 3),
    recommendation: firstSignal?.recommendation || (hasTasks
      ? 'Comece pela primeira tarefa do ranking e revise os dados frageis quando possivel'
      : 'Revise a fila quando novas tarefas entrarem'),
    confidence: firstSignal?.confidence || 'low',
  };
}

function fallbackEvidence(payload: GovernedCoachAIPayload): string[] {
  const evidences = payload.coach_signals
    .slice(0, 3)
    .map((signal) => `${signal.title}: ${signal.description}`);

  if (evidences.length > 0) return evidences;
  if (payload.top_tasks.length > 0) return [`${payload.top_tasks.length} tarefa(s) acionavel(is) no ranking governado.`];
  return ['Nenhuma tarefa acionavel no payload governado.'];
}

function sanitizeStringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => sanitizeCoachNarrative(String(item)))
    .filter((item) => item.length > 0)
    .slice(0, 3);
}

function normalizeConfidence(value: unknown): GovernedCoachConfidence {
  if (value === 'high' || value === 'medium' || value === 'low') return value;
  return 'low';
}
