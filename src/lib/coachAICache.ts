import type { GovernedCoachAIPayload } from './coachAIGuardrails.js';
import { stableHash } from './stableHash.js';

export const COACH_AI_PROMPT_VERSION = 'coach-briefing-v1';
export const COACH_AI_GUARDRAILS_VERSION = 'coach-guardrails-v1';

export type CoachAICacheSource = 'ai' | 'cache' | 'fallback';

export interface CoachAICacheMetadata {
  input_hash: string;
  prompt_version: string;
  guardrails_version: string;
  created_at: string;
  source: CoachAICacheSource;
  fallback_reason?: string;
}

export interface CoachAINarrativeResult {
  text: string;
  metadata: CoachAICacheMetadata;
}

export interface CoachAICacheCreateResult {
  text: string;
  source: 'ai' | 'fallback';
  fallback_reason?: string;
  cacheable: boolean;
}

interface CoachAICacheEntry {
  text: string;
  metadata: CoachAICacheMetadata;
}

interface CoachAIHashVersions {
  promptVersion?: string;
  guardrailsVersion?: string;
}

const coachNarrativeCache = new Map<string, CoachAICacheEntry>();

export function buildCoachAIInputHash(
  payload: GovernedCoachAIPayload,
  versions: CoachAIHashVersions = {},
): string {
  const promptVersion = versions.promptVersion ?? COACH_AI_PROMPT_VERSION;
  const guardrailsVersion = versions.guardrailsVersion ?? COACH_AI_GUARDRAILS_VERSION;

  return stableHash({
    prompt_version: promptVersion,
    guardrails_version: guardrailsVersion,
    current_energy: payload.current_energy,
    briefing_window: payload.generated_at.slice(0, 13),
    top_tasks: payload.top_tasks.map((task, index) => ({
      rank: index + 1,
      id: task.id,
      title: task.title,
      context: task.context,
      status: task.status,
      due_at: task.due_at,
      priority: task.priority,
      energy: task.energy,
      estimated_minutes: task.estimated_minutes,
      estimated_minutes_source: task.estimated_minutes_source,
    })),
    coach_signals: [...payload.coach_signals]
      .sort((a, b) => a.signal_id.localeCompare(b.signal_id))
      .map((signal) => ({
        signal_id: signal.signal_id,
        severity: signal.severity,
        title: signal.title,
        description: signal.description,
        evidence: signal.evidence,
        confidence: signal.confidence,
        recommendation: signal.recommendation,
        weak_fields: [...signal.weak_fields].sort(),
      })),
    limitations: [...payload.limitations].sort(),
  });
}

export async function resolveCachedCoachNarrative(
  payload: GovernedCoachAIPayload,
  createNarrative: (inputHash: string) => Promise<CoachAICacheCreateResult>,
  now: Date = new Date(),
): Promise<CoachAINarrativeResult> {
  const inputHash = buildCoachAIInputHash(payload);
  const cacheKey = buildCacheKey(inputHash);
  const cached = coachNarrativeCache.get(cacheKey);

  if (cached) {
    return {
      text: cached.text,
      metadata: {
        ...cached.metadata,
        source: 'cache',
      },
    };
  }

  const created = await createNarrative(inputHash);
  const metadata: CoachAICacheMetadata = {
    input_hash: inputHash,
    prompt_version: COACH_AI_PROMPT_VERSION,
    guardrails_version: COACH_AI_GUARDRAILS_VERSION,
    created_at: now.toISOString(),
    source: created.source,
    ...(created.fallback_reason ? { fallback_reason: created.fallback_reason } : {}),
  };

  if (created.cacheable && created.source === 'ai') {
    coachNarrativeCache.set(cacheKey, {
      text: created.text,
      metadata: {
        ...metadata,
        source: 'ai',
      },
    });
  }

  return {
    text: created.text,
    metadata,
  };
}

export function clearCoachAICacheForTests() {
  coachNarrativeCache.clear();
}

function buildCacheKey(inputHash: string): string {
  return `${COACH_AI_PROMPT_VERSION}:${COACH_AI_GUARDRAILS_VERSION}:${inputHash}`;
}
