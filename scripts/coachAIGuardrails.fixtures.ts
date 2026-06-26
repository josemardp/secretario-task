import {
  buildGovernedCoachAIPayload,
  buildGovernedCoachPrompt,
  hasProhibitedLanguage,
  parseGovernedCoachAIResponse,
} from '../src/lib/coachAIGuardrails.js';
import {
  buildCoachAIInputHash,
  clearCoachAICacheForTests,
  resolveCachedCoachNarrative,
} from '../src/lib/coachAICache.js';
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

function buildPayload(overrides: Partial<Task>[] = []) {
  const tasks = [
    task({ id: 'open-1', estimated_minutes_source: 'ai', ...overrides[0] }),
    completed({ id: 'legacy-1', completed_at_confidence: 'legacy_approx', ...overrides[1] }),
    completed({ id: 'unknown-1', actual_minutes_source: 'unknown', ...overrides[2] }),
    task({
      id: 'cancelled-1',
      status: 'done',
      due_at: null,
      completed_at: null,
      resolution_type: 'cancelled',
      resolved_at: '2026-06-25T13:00:00.000Z',
      ...overrides[3],
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

const firstHash = buildCoachAIInputHash(buildPayload());
const secondHash = buildCoachAIInputHash(buildPayload());
assert(firstHash === secondHash, 'mesmo payload governado deve gerar mesmo input_hash');

const updatedAtHash = buildCoachAIInputHash(buildPayload([{ updated_at: '2026-06-26T23:59:00.000Z' }]));
assert(firstHash === updatedAtHash, 'updated_at nao deve alterar input_hash');

const noLegacyHash = buildCoachAIInputHash(buildPayload([
  {},
  { completed_at_confidence: 'confirmed' },
]));
assert(firstHash !== noLegacyHash, 'mudanca semantica de legacy_approx deve alterar input_hash');

const trustedActualHash = buildCoachAIInputHash(buildPayload([
  {},
  {},
  { actual_minutes_source: 'timer' },
]));
assert(firstHash !== trustedActualHash, 'mudanca semantica de unknown deve alterar input_hash');

const newPromptHash = buildCoachAIInputHash(buildPayload(), { promptVersion: 'coach-briefing-v2' });
assert(firstHash !== newPromptHash, 'mudanca de prompt_version deve invalidar cache');

clearCoachAICacheForTests();
let calls = 0;
const cachePayload = buildPayload();
const firstResult = await resolveCachedCoachNarrative(cachePayload, async () => {
  calls += 1;
  return { text: 'Pelo ranking deterministico, siga a primeira tarefa.', source: 'ai', cacheable: true };
}, NOW);
const secondResult = await resolveCachedCoachNarrative(cachePayload, async () => {
  calls += 1;
  return { text: 'nao deveria chamar', source: 'ai', cacheable: true };
}, NOW);
assert(calls === 1, 'cache hit deve evitar nova chamada de IA');
assert(firstResult.metadata.source === 'ai', 'primeiro resultado cacheavel vem da IA');
assert(secondResult.metadata.source === 'cache', 'segundo resultado deve vir do cache');

clearCoachAICacheForTests();
let fallbackCalls = 0;
await resolveCachedCoachNarrative(cachePayload, async () => {
  fallbackCalls += 1;
  return { text: 'fallback seguro', source: 'fallback', fallback_reason: 'prohibited_language', cacheable: false };
}, NOW);
await resolveCachedCoachNarrative(cachePayload, async () => {
  fallbackCalls += 1;
  return { text: 'fallback seguro', source: 'fallback', fallback_reason: 'prohibited_language', cacheable: false };
}, NOW);
assert(fallbackCalls === 2, 'fallback nao deve ser cacheado como resposta valida');

console.log('[coachAIGuardrails] 17 fixtures passaram');
