import { readFileSync } from 'node:fs';
import type { BlockerType, ResolutionType, Task } from '../src/types/index.js';
import {
  buildCoachAIInputHash,
  clearCoachAICacheForTests,
  resolveCachedCoachNarrative,
} from '../src/lib/coachAICache.js';
import {
  buildDeterministicCoachNarrative,
  buildGovernedCoachAIPayload,
  parseGovernedCoachAIResponseResult,
} from '../src/lib/coachAIGuardrails.js';
import { analyzeCoachSignals } from '../src/lib/coachSignals.js';
import { estimateTaskTime } from '../src/lib/ai.js';
import { parseTaskInput } from '../src/lib/parser.js';
import { computeNextRuleAndDate } from '../src/lib/recurrence.js';
import { getResolvedTasksForDate, isActiveTask, isOpenTask } from '../src/lib/taskFilters.js';
import { buildCompleteUpdates, buildResolutionUpdates } from '../src/lib/taskLifecycle.js';
import { buildReopenUpdates } from '../src/lib/timeTracking.js';

type TaskStoreModule = typeof import('../src/stores/taskStore.js');

const NOW = new Date('2026-06-27T12:00:00.000Z');
const USER_ID = 'user-flow';
const memoryStorage = new Map<string, string>();

Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => memoryStorage.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memoryStorage.set(key, value);
    },
    removeItem: (key: string) => {
      memoryStorage.delete(key);
    },
  },
  configurable: true,
});

const { useTaskStore }: TaskStoreModule = await import('../src/stores/taskStore.js');

type FlowResult = {
  flow: string;
  coverage: 'sim' | 'parcial' | 'nao';
  result: 'pass' | 'achado';
  evidence: string;
};

const results: FlowResult[] = [];

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}. Esperado: ${String(expected)}; obtido: ${String(actual)}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message: string) {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`${message}. Esperado: ${expectedJson}; obtido: ${actualJson}`);
  }
}

function runFlow(flow: string, coverage: FlowResult['coverage'], fixture: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fixture)
    .then(() => {
      results.push({ flow, coverage, result: 'pass', evidence: 'scripts/coachV41Flows.fixtures.ts' });
      console.log(`ok - ${flow}`);
    });
}

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    id: overrides.id,
    user_id: USER_ID,
    title: overrides.title ?? overrides.id,
    description: overrides.description ?? null,
    context: overrides.context ?? 'PM',
    priority: overrides.priority ?? 5,
    energy: overrides.energy ?? 5,
    status: overrides.status ?? 'todo',
    due_at: overrides.due_at ?? null,
    deleted_at: overrides.deleted_at ?? null,
    created_at: overrides.created_at ?? '2026-06-20T08:00:00.000Z',
    updated_at: overrides.updated_at ?? '2026-06-20T08:00:00.000Z',
    completed_at: overrides.completed_at ?? null,
    completed_at_confidence: overrides.completed_at_confidence ?? null,
    resolution_type: overrides.resolution_type ?? null,
    resolved_at: overrides.resolved_at ?? null,
    estimated_minutes: overrides.estimated_minutes ?? null,
    actual_minutes: overrides.actual_minutes ?? null,
    estimated_minutes_source: overrides.estimated_minutes_source ?? null,
    actual_minutes_source: overrides.actual_minutes_source ?? null,
    blocker_type: overrides.blocker_type ?? null,
    started_at: overrides.started_at ?? null,
    recurrence_rule: overrides.recurrence_rule ?? null,
    recurrence_origin_id: overrides.recurrence_origin_id ?? null,
    postponed_count: overrides.postponed_count ?? 0,
    version: overrides.version ?? 1,
  };
}

function completed(id: string, overrides: Partial<Task> = {}): Task {
  const completedAt = overrides.completed_at ?? '2026-06-25T10:00:00.000Z';
  return task({
    id,
    status: 'done',
    completed_at: completedAt,
    completed_at_confidence: 'confirmed',
    resolution_type: 'completed',
    resolved_at: completedAt,
    estimated_minutes: 30,
    estimated_minutes_source: 'manual',
    actual_minutes: 30,
    actual_minutes_source: 'timer',
    ...overrides,
  });
}

function resetStore(tasks: Task[] = []) {
  useTaskStore.setState({ tasks, mutations: [], viewedRecords: {} });
}

function currentTask(id: string): Task {
  const found = useTaskStore.getState().tasks.find((item) => item.id === id);
  assert(found, `tarefa ${id} deveria existir no store`);
  return found;
}

function source(path: string): string {
  return readFileSync(path, 'utf8');
}

function withDateNow<T>(iso: string, fn: () => T): T {
  const original = Date.now;
  Date.now = () => new Date(iso).getTime();
  try {
    return fn();
  } finally {
    Date.now = original;
  }
}

function mockFetchWithResponse(body: unknown, ok = true) {
  const original = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify(body), { status: ok ? 200 : 500 });
  return () => {
    globalThis.fetch = original;
  };
}

function applyResolution(id: string, resolutionType: Exclude<ResolutionType, 'completed'>) {
  useTaskStore.getState().updateTask(id, buildResolutionUpdates(resolutionType));
}

function applyPostpone(id: string, blockerType: BlockerType | null) {
  const item = currentTask(id);
  useTaskStore.getState().updateTask(id, {
    due_at: '2026-06-28T09:00:00.000Z',
    postponed_count: (item.postponed_count || 0) + 1,
    blocker_type: blockerType,
  });
}

await runFlow('1. captura rapida usa parser deterministico sem IA', 'sim', () => {
  let fetchCalled = false;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    fetchCalled = true;
    throw new Error('fetch nao deveria ser chamado pelo parser deterministico');
  };
  try {
    const parsed = parseTaskInput('Revisar proposta @Pessoal prioridade alta energia baixa amanha 10h', 'PM');
    assertEqual(parsed.title, 'Revisar proposta', 'titulo limpo');
    assertEqual(parsed.context, 'Pessoal', 'contexto extraido');
    assertEqual(parsed.priority, 8, 'prioridade alta');
    assertEqual(parsed.energy, 2, 'energia baixa');
    assert(parsed.due_at, 'due_at deve ser preenchido pelo parser');
    assertEqual(fetchCalled, false, 'parser nao pode depender de rede/IA');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

await runFlow('2. estimativa marca fontes ai, default_30, parser e manual', 'parcial', async () => {
  const aiSource = source('src/lib/ai.ts');
  const homeSource = source('src/pages/Home.tsx');
  const timelineSource = source('src/components/TimelineView.tsx');
  assert(aiSource.includes("source: 'ai'"), 'estimateTaskTime deve retornar source ai no caminho bem-sucedido');
  assert(aiSource.includes("source: 'default_30'"), 'estimateTaskTime deve retornar default_30 nos fallbacks');

  let restoreFetch = mockFetchWithResponse({ choices: [{ message: { content: '45' } }] });
  try {
    const aiEstimate = await estimateTaskTime('Escrever proposta', [], 'fake-key');
    assertDeepEqual(aiEstimate, { minutes: 45, source: 'ai' }, 'estimativa IA deve carregar source ai');
  } finally {
    restoreFetch();
  }

  restoreFetch = mockFetchWithResponse({}, false);
  try {
    const fallbackEstimate = await estimateTaskTime('Escrever proposta', [], 'fake-key');
    assertDeepEqual(fallbackEstimate, { minutes: 30, source: 'default_30' }, 'fallback deve carregar source default_30');
  } finally {
    restoreFetch();
  }

  assert(homeSource.includes("t.estimated_minutes_source ?? 'parser'"), 'Home deve preservar parser source');
  assert(homeSource.includes(": 'default_30'"), 'Home deve aplicar default_30 sem estimativa');
  assert(timelineSource.includes("updates.estimated_minutes_source = 'manual'"), 'edicao manual na Agenda deve marcar source manual');
});

await runFlow('3. concluir preserva campos semanticos e timer legado defensivo', 'parcial', () => {
  const startedAt = '2026-06-27T11:30:00.000Z';
  resetStore([task({ id: 'flow-3', status: 'doing', started_at: startedAt })]);
  const started = currentTask('flow-3');
  assertEqual(started.status, 'doing', 'fixture legado parte de doing');
  assertEqual(started.started_at, startedAt, 'fixture legado possui started_at');

  const updates = withDateNow(NOW.toISOString(), () => buildCompleteUpdates(started));
  useTaskStore.getState().updateTask('flow-3', updates);

  const done = currentTask('flow-3');
  assertEqual(done.status, 'done', 'conclusao deve colocar em done');
  assert(done.completed_at && Number.isFinite(Date.parse(done.completed_at)), 'completed_at confirmado');
  assertEqual(done.completed_at_confidence, 'confirmed', 'confidence confirmed');
  assertEqual(done.resolution_type, 'completed', 'resolution_type completed');
  assertEqual(done.resolved_at, done.completed_at, 'resolved_at igual ao completed_at');
  assertEqual(done.actual_minutes, 30, 'actual_minutes coerente com started_at');
  assertEqual(done.actual_minutes_source, 'timer', 'actual source timer abaixo do teto');
});

await runFlow('4. reabrir limpa campos e recompletar sem started_at nao infla timer', 'sim', () => {
  const reopened = buildReopenUpdates('todo');
  assertDeepEqual(reopened, {
    status: 'todo',
    completed_at: null,
    completed_at_confidence: null,
    resolution_type: null,
    resolved_at: null,
    started_at: null,
    actual_minutes: null,
    actual_minutes_source: null,
  }, 'buildReopenUpdates deve limpar todos os campos semanticos');

  resetStore([completed('flow-4')]);
  useTaskStore.getState().updateTask('flow-4', reopened);
  const afterReopen = currentTask('flow-4');
  assertEqual(afterReopen.started_at, null, 'reabertura limpa started_at');
  assertEqual(afterReopen.actual_minutes, null, 'reabertura limpa actual_minutes');
  assertEqual(afterReopen.actual_minutes_source, null, 'reabertura limpa actual_minutes_source');

  const recompleteUpdates = buildCompleteUpdates(afterReopen);
  useTaskStore.getState().updateTask('flow-4', recompleteUpdates);
  const recompleted = currentTask('flow-4');
  assertEqual(recompleted.actual_minutes, null, 'recompletar sem started_at nao infla actual_minutes');
  assertEqual(recompleted.actual_minutes_source, null, 'sem tempo real, origem tambem permanece null');
});

await runFlow('5. Agenda usa buildReopenUpdates para reabertura', 'sim', () => {
  const timelineSource = source('src/components/TimelineView.tsx');
  assert(timelineSource.includes("buildReopenUpdates('todo')"), 'Agenda deve chamar buildReopenUpdates(todo)');
  assert(timelineSource.includes('getResolvedTasksForDate'), 'Agenda deve expor resolvidas do dia fora da timeline ativa');

  const agendaDoneReopen = buildReopenUpdates('todo');
  assertDeepEqual(agendaDoneReopen, {
    status: 'todo',
    completed_at: null,
    completed_at_confidence: null,
    resolution_type: null,
    resolved_at: null,
    started_at: null,
    actual_minutes: null,
    actual_minutes_source: null,
  }, 'Agenda deve reabrir para todo e limpar os campos criticos');
});

await runFlow('5b. resolvidas do dia ficam fora da timeline ativa mas acessiveis para reabrir', 'sim', () => {
  const selectedDate = new Date('2026-06-27T12:00:00.000Z');
  const completedToday = completed('flow-5b-completed', {
    completed_at: '2026-06-27T10:00:00.000Z',
    resolved_at: '2026-06-27T10:00:00.000Z',
  });
  const cancelledToday = task({
    id: 'flow-5b-cancelled',
    resolution_type: 'cancelled',
    resolved_at: '2026-06-27T11:00:00.000Z',
  });
  const delegatedToday = task({
    id: 'flow-5b-delegated',
    resolution_type: 'delegated',
    resolved_at: '2026-06-27T11:30:00.000Z',
  });
  const obsoleteToday = task({
    id: 'flow-5b-obsolete',
    resolution_type: 'obsolete',
    resolved_at: '2026-06-27T11:45:00.000Z',
  });
  const completedOtherDay = completed('flow-5b-other-day', {
    completed_at: '2026-06-26T10:00:00.000Z',
    resolved_at: '2026-06-26T10:00:00.000Z',
  });
  const deletedCompleted = completed('flow-5b-deleted', {
    completed_at: '2026-06-27T09:00:00.000Z',
    resolved_at: '2026-06-27T09:00:00.000Z',
    deleted_at: '2026-06-27T09:05:00.000Z',
  });
  const open = task({ id: 'flow-5b-open', due_at: '2026-06-27T13:00:00.000Z' });
  const allTasks = [
    completedToday,
    cancelledToday,
    delegatedToday,
    obsoleteToday,
    completedOtherDay,
    deletedCompleted,
    open,
  ];

  assertEqual(isOpenTask(completedToday), false, 'concluida nao deve entrar em isOpenTask');
  assertEqual(isOpenTask(cancelledToday), false, 'cancelada nao deve entrar em isOpenTask');
  assertEqual(isOpenTask(open), true, 'aberta continua em isOpenTask');

  const resolvedIds = getResolvedTasksForDate(allTasks, selectedDate).map((item) => item.id);
  assertDeepEqual(
    resolvedIds,
    ['flow-5b-obsolete', 'flow-5b-delegated', 'flow-5b-cancelled', 'flow-5b-completed'],
    'helper deve recuperar resolvidas do dia, fora da timeline ativa, ordenadas por horario',
  );

  resetStore([completedToday]);
  useTaskStore.getState().updateTask('flow-5b-completed', buildReopenUpdates('todo'));
  const reopened = currentTask('flow-5b-completed');
  assertEqual(isOpenTask(reopened), true, 'apos reabrir, tarefa volta a ser aberta/executavel');
  assertEqual(
    getResolvedTasksForDate([reopened], selectedDate).length,
    0,
    'apos reabrir, tarefa sai da lista visual de resolvidas',
  );
});

await runFlow('6. adiar com motivo incrementa contador e grava blocker_type', 'sim', () => {
  resetStore([task({ id: 'flow-6', postponed_count: 1 })]);
  applyPostpone('flow-6', 'waiting_third_party');
  const postponed = currentTask('flow-6');
  assertEqual(postponed.postponed_count, 2, 'postpone incrementa contador');
  assertEqual(postponed.blocker_type, 'waiting_third_party', 'postpone grava motivo');
});

await runFlow('7. adiar sem motivo incrementa e nao bloqueia', 'sim', () => {
  resetStore([task({ id: 'flow-7', postponed_count: 0 })]);
  applyPostpone('flow-7', null);
  const postponed = currentTask('flow-7');
  assertEqual(postponed.postponed_count, 1, 'postpone sem motivo incrementa contador');
  assertEqual(postponed.blocker_type, null, 'postpone sem motivo grava blocker null');
});

await runFlow('8. cancelar delegar obsoletar fecham sem execucao e sem tombstone', 'sim', () => {
  (['cancelled', 'delegated', 'obsolete'] as const).forEach((resolutionType) => {
    const id = `flow-8-${resolutionType}`;
    resetStore([task({ id })]);
    applyResolution(id, resolutionType);
    const resolved = currentTask(id);
    assertEqual(resolved.resolution_type, resolutionType, `${resolutionType} deve ser semantico`);
    assert(resolved.resolved_at && Number.isFinite(Date.parse(resolved.resolved_at)), `${resolutionType} deve preencher resolved_at`);
    assertEqual(resolved.completed_at, null, `${resolutionType} nao pode preencher completed_at`);
    assertEqual(resolved.status, 'todo', `${resolutionType} nao deve virar done`);
    assertEqual(resolved.deleted_at, null, `${resolutionType} nao deve tombstonar`);
    assertEqual(isActiveTask(resolved), false, `${resolutionType} deve sair das listas ativas`);
  });
});

await runFlow('9. Dashboard e sinais ignoram updated_at para horario e separam legacy', 'parcial', () => {
  const t1 = '2026-06-25T09:00:00.000Z';
  const t2 = '2026-06-27T11:59:00.000Z';
  const tasks = [
    completed('flow-9-confirmed', { completed_at: t1, resolved_at: t1, updated_at: t2 }),
    completed('flow-9-legacy', {
      completed_at: '2026-06-26T18:00:00.000Z',
      completed_at_confidence: 'legacy_approx',
      context: 'Pessoal',
      updated_at: t2,
    }),
  ];
  const report = analyzeCoachSignals({ tasks, now: NOW });
  assertEqual(report.confirmed_completions, 1, 'somente confirmed conta como confirmado');
  assertEqual(report.legacy_completions, 1, 'legacy fica separado');

  const mutated = tasks.map((item) => ({ ...item, updated_at: '2026-06-27T23:59:00.000Z' }));
  assertDeepEqual(
    analyzeCoachSignals({ tasks: mutated, now: NOW }).signals,
    report.signals,
    'alterar updated_at nao deve alterar sinais',
  );

  const dashboardSource = source('src/components/DashboardView.tsx');
  assert(dashboardSource.includes('confirmedCompletedTasks.forEach'), 'daily/peak devem partir de confirmedCompletedTasks');
  assert(dashboardSource.includes('completedTasks.forEach(t => { counts[t.context]'), 'conclusoes por area devem incluir completedTasks');
  assert(dashboardSource.includes('Inclui histórico aproximado'), 'rotulo de legacy deve existir na UI');
});

await runFlow('10. Briefing IA tem hash sem updated_at, cache e guardrails', 'sim', async () => {
  clearCoachAICacheForTests();
  const baseTask = task({
    id: 'flow-10',
    title: 'Preparar briefing',
    due_at: '2026-06-27T15:00:00.000Z',
    estimated_minutes: 30,
    estimated_minutes_source: 'manual',
    updated_at: '2026-06-27T10:00:00.000Z',
  });
  const payload = buildGovernedCoachAIPayload({
    topTasks: [baseTask],
    allTasks: [baseTask],
    energy: 5,
    now: NOW,
  });
  const updatedAtPayload = buildGovernedCoachAIPayload({
    topTasks: [{ ...baseTask, updated_at: '2026-06-27T11:00:00.000Z' }],
    allTasks: [{ ...baseTask, updated_at: '2026-06-27T11:00:00.000Z' }],
    energy: 5,
    now: NOW,
  });
  assertEqual(buildCoachAIInputHash(payload), buildCoachAIInputHash(updatedAtPayload), 'updated_at nao entra no input_hash');

  let calls = 0;
  const first = await resolveCachedCoachNarrative(payload, async () => {
    calls += 1;
    return { text: 'Pelo ranking deterministico, siga a primeira tarefa.', source: 'ai', cacheable: true };
  }, NOW);
  const second = await resolveCachedCoachNarrative(payload, async () => {
    calls += 1;
    return { text: 'nao deveria chamar', source: 'ai', cacheable: true };
  }, NOW);
  assertEqual(calls, 1, 'entrada identica deve bater cache');
  assertEqual(first.metadata.source, 'ai', 'primeira resposta vem da IA');
  assertEqual(second.metadata.source, 'cache', 'segunda resposta vem do cache');

  const differentPayload = buildGovernedCoachAIPayload({
    topTasks: [{ ...baseTask, priority: 9 }],
    allTasks: [{ ...baseTask, priority: 9 }],
    energy: 5,
    now: NOW,
  });
  assert(buildCoachAIInputHash(payload) !== buildCoachAIInputHash(differentPayload), 'entrada semantica diferente invalida hash');

  let fallbackCalls = 0;
  await resolveCachedCoachNarrative(differentPayload, async () => {
    fallbackCalls += 1;
    return { text: buildDeterministicCoachNarrative(differentPayload), source: 'fallback', cacheable: false };
  }, NOW);
  await resolveCachedCoachNarrative(differentPayload, async () => {
    fallbackCalls += 1;
    return { text: buildDeterministicCoachNarrative(differentPayload), source: 'fallback', cacheable: false };
  }, NOW);
  assertEqual(fallbackCalls, 2, 'fallback deterministico nao deve ser cacheado como IA valida');

  const guarded = parseGovernedCoachAIResponseResult(
    '{"summary":"Voce e procrastinador.","evidence":[],"limitations":[],"recommendation":"mude","confidence":"high"}',
    payload,
  );
  assertEqual(guarded.source, 'fallback', 'linguagem proibida deve cair em fallback');
  assertEqual(guarded.fallback_reason, 'prohibited_language', 'motivo de fallback deve ser proibicao de linguagem');
});

await runFlow('extra. completed_at vence updated_at em coachSignals', 'sim', () => {
  const completedAt = '2026-06-24T09:00:00.000Z';
  const editedAt = '2026-06-27T20:00:00.000Z';
  const before = analyzeCoachSignals({
    tasks: [completed('flow-extra', { completed_at: completedAt, resolved_at: completedAt, updated_at: completedAt })],
    now: NOW,
  });
  const after = analyzeCoachSignals({
    tasks: [completed('flow-extra', { completed_at: completedAt, resolved_at: completedAt, updated_at: editedAt })],
    now: NOW,
  });
  assertDeepEqual(after, before, 'editar updated_at depois da conclusao nao pode alterar classificacao');
});

await runFlow('recorrencia. encerramento gera nova instancia sem herdar postponed_count', 'sim', () => {
  const recurring = task({
    id: 'flow-recurring',
    due_at: '2026-06-27T09:00:00.000Z',
    recurrence_rule: 'daily',
    recurrence_origin_id: 'flow-recurring',
    postponed_count: 3,
  });
  const { nextDueAt } = computeNextRuleAndDate(recurring.due_at, 'daily');
  assert(nextDueAt, 'daily deve produzir proxima data');

  resetStore([recurring]);
  useTaskStore.getState().updateTask('flow-recurring', {
    status: 'done',
    completed_at: NOW.toISOString(),
    completed_at_confidence: 'confirmed',
    resolution_type: 'completed',
    resolved_at: NOW.toISOString(),
  });
  const afterCompletion = useTaskStore.getState().tasks;
  const clone = afterCompletion.find((item) => item.id !== 'flow-recurring');
  assert(clone, 'conclusao recorrente deve criar nova instancia');
  assertEqual(clone.recurrence_origin_id, 'flow-recurring', 'clone preserva origem da serie');
  assertEqual(clone.postponed_count ?? null, null, 'clone nao herda postponed_count');
  assertEqual(isOpenTask(clone), true, 'clone nasce aberta');

  const report = analyzeCoachSignals({
    tasks: [
      completed('rec-instance-1', { recurrence_origin_id: 'series-1' }),
      completed('rec-instance-2', { recurrence_origin_id: 'series-1' }),
    ],
    now: NOW,
  });
  assertEqual(report.confirmed_completions, 2, 'cada instancia recorrente conta individualmente');

  resetStore([task({
    id: 'flow-recurring-cancel',
    due_at: '2026-06-27T09:00:00.000Z',
    recurrence_rule: 'daily',
    recurrence_origin_id: 'flow-recurring-cancel',
    postponed_count: 2,
  })]);
  applyResolution('flow-recurring-cancel', 'cancelled');
  const cancelClone = useTaskStore.getState().tasks.find((item) => item.id !== 'flow-recurring-cancel');
  assert(cancelClone, 'encerramento sem execucao recorrente deve criar nova instancia');
  assertEqual(cancelClone.postponed_count ?? null, null, 'clone de encerramento sem execucao nao herda postponed_count');
});

await runFlow('partialize. slice(-100) preserva tarefa mais recente com 101+ tasks', 'sim', () => {
  // 101 tarefas; addTask insere no fim — task-101 fica no índice 100.
  // Com slice(-100) o partialize deve descartar task-001 e manter task-101.
  const tasks101: Task[] = Array.from({ length: 101 }, (_, i) => task({
    id: `task-${String(i + 1).padStart(3, '0')}`,
    title: `Task ${i + 1}`,
  }));
  resetStore(tasks101);

  const raw = memoryStorage.get('secretario-task:task-store');
  assert(raw, 'localStorage deve ter estado persistido');
  const persisted = JSON.parse(raw) as { state: { tasks: Task[] } };
  const persistedIds = persisted.state.tasks.map((t: Task) => t.id);

  assertEqual(persistedIds.length, 100, 'deve persistir exatamente 100 tarefas');
  assert(persistedIds.includes('task-101'), 'tarefa mais recente (task-101) deve estar no estado persistido');
  assert(!persistedIds.includes('task-001'), 'tarefa mais antiga (task-001) deve ser descartada');
});

console.log('[coachV41Flows] cobertura');
for (const result of results) {
  console.log(`${result.flow} | ${result.coverage} | ${result.result} | ${result.evidence}`);
}
