import {
  buildGovernedCoachAIPayload,
  buildGovernedCoachPrompt,
  hasProhibitedLanguage,
  parseGovernedCoachAIResponse,
} from '../src/lib/coachAIGuardrails.js';
import type { Task } from '../src/types/index.js';

const NOW = new Date('2026-06-26T12:00:00.000Z');

function assert(condition: unknown, message: string) {
  if (!condition) throw new Error(message);
}

function task(overrides: Partial<Task>): Task {
  return {
    id: overrides.id ?? 'task-1',
    user_id: 'user-1',
    title: overrides.title ?? 'Preparar relatorio',
    description: null,
    context: 'PM',
    priority: 5,
    energy: 5,
    status: overrides.status ?? 'todo',
    due_at: overrides.due_at ?? '2026-06-26T15:00:00.000Z',
    deleted_at: null,
    created_at: overrides.created_at ?? '2026-06-26T08:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-06-26T11:59:00.000Z',
    completed_at: overrides.completed_at ?? null,
    completed_at_confidence: overrides.completed_at_confidence ?? null,
    resolution_type: overrides.resolution_type ?? null,
    resolved_at: overrides.resolved_at ?? null,
    estimated_minutes: overrides.estimated_minutes ?? 30,
    actual_minutes: overrides.actual_minutes ?? null,
    estimated_minutes_source: overrides.estimated_minutes_source ?? 'manual',
    actual_minutes_source: overrides.actual_minutes_source ?? null,
    blocker_type: overrides.blocker_type ?? null,
    started_at: overrides.started_at ?? null,
    recurrence_rule: overrides.recurrence_rule ?? null,
    recurrence_origin_id: overrides.recurrence_origin_id ?? null,
    postponed_count: overrides.postponed_count ?? 0,
    version: overrides.version ?? 1,
  };
}

function completed(overrides: Partial<Task>): Task {
  return task({
    status: 'done',
    completed_at: '2026-06-25T12:00:00.000Z',
    completed_at_confidence: 'confirmed',
    resolution_type: 'completed',
    resolved_at: '2026-06-25T12:00:00.000Z',
    actual_minutes: 45,
    actual_minutes_source: 'timer',
    ...overrides,
  });
}

function buildPayload() {
  const tasks = [
    task({ id: 'open-1', estimated_minutes_source: 'ai' }),
    completed({ id: 'legacy-1', completed_at_confidence: 'legacy_approx' }),
    completed({ id: 'unknown-1', actual_minutes_source: 'unknown' }),
    task({
      id: 'cancelled-1',
      status: 'done',
      due_at: null,
      completed_at: null,
      resolution_type: 'cancelled',
      resolved_at: '2026-06-25T13:00:00.000Z',
    }),
  ];

  return buildGovernedCoachAIPayload({
    topTasks: tasks,
    allTasks: tasks,
    energy: 6,
    now: NOW,
  });
}

const payload = buildPayload();
const prompt = buildGovernedCoachPrompt(payload);

assert(
  !JSON.stringify(payload.top_tasks).includes('updated_at') &&
    !JSON.stringify(payload.coach_signals).includes('updated_at'),
  'payload governado nao deve conter updated_at como evidencia',
);
assert(!prompt.includes('updated_at":'), 'prompt nao deve enviar updated_at como dado');
assert(payload.limitations.some((item) => item.includes('legacy_approx')), 'legacy_approx deve aparecer como limitacao');
assert(
  payload.limitations.some((item) => item.includes("actual_minutes_source='unknown'")),
  'actual_minutes_source unknown deve aparecer como baixa confianca',
);
assert(
  !payload.top_tasks.some((item) => item.id === 'cancelled-1'),
  'encerradas sem execucao nao devem entrar como tarefa acionavel',
);
assert(hasProhibitedLanguage('Voce e procrastinador.'), 'termo proibido deve ser detectado');

const blocked = parseGovernedCoachAIResponse(
  '{"summary":"Voce e desorganizado.","evidence":[],"limitations":[],"recommendation":"mude","confidence":"high"}',
  payload,
);
assert(!hasProhibitedLanguage(blocked.summary), 'resposta com termo proibido deve ser substituida');

const first = JSON.stringify(buildPayload());
const second = JSON.stringify(buildPayload());
assert(first === second, 'mesma entrada deve gerar payload deterministico');

console.log('[coachAIGuardrails] 8 fixtures passaram');
