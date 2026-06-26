import type { BlockerType, EstimatedMinutesSource, Task } from '../src/types';
import { analyzeCoachSignals, type CoachSignalId, type CoachTaskEvent } from '../src/lib/coachSignals.js';

const NOW = new Date('2026-06-26T12:00:00.000Z');
const USER_ID = 'user-1';

function task(overrides: Partial<Task> & { id: string }): Task {
  return {
    user_id: USER_ID,
    title: overrides.id,
    description: null,
    context: 'Pessoal',
    priority: 0,
    energy: 5,
    status: 'todo',
    due_at: null,
    deleted_at: null,
    created_at: '2026-06-20T08:00:00.000Z',
    updated_at: '2026-06-20T08:00:00.000Z',
    ...overrides,
  };
}

function completed(
  id: string,
  overrides: Partial<Task> = {},
): Task {
  return task({
    id,
    title: id,
    status: 'done',
    resolution_type: 'completed',
    completed_at: '2026-06-25T10:00:00.000Z',
    completed_at_confidence: 'confirmed',
    resolved_at: '2026-06-25T10:00:00.000Z',
    estimated_minutes: 30,
    estimated_minutes_source: 'manual',
    actual_minutes: 35,
    actual_minutes_source: 'timer',
    ...overrides,
  });
}

function openPostponed(
  id: string,
  postponedCount: number,
  blockerType?: BlockerType | null,
): Task {
  return task({
    id,
    status: 'todo',
    postponed_count: postponedCount,
    blocker_type: blockerType ?? null,
  });
}

function signalIds(tasks: Task[], events: CoachTaskEvent[] = []): CoachSignalId[] {
  return analyzeCoachSignals({ tasks, events, now: NOW }).signals.map((signal) => signal.signal_id);
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(ids: CoachSignalId[], expected: CoachSignalId, message: string) {
  assert(ids.includes(expected), message);
}

function assertExcludes(ids: CoachSignalId[], unexpected: CoachSignalId, message: string) {
  assert(!ids.includes(unexpected), message);
}

function runFixture(name: string, fixture: () => void) {
  fixture();
  console.log(`ok - ${name}`);
}

runFixture('conclusão confirmada usa completed_at e ignora updated_at', () => {
  const base = [
    completed('done-1', { completed_at: '2026-06-25T09:00:00.000Z', updated_at: '2026-06-25T23:00:00.000Z' }),
    completed('done-2', { completed_at: '2026-06-25T09:30:00.000Z', updated_at: '2026-06-24T01:00:00.000Z' }),
    completed('done-3', { completed_at: '2026-06-25T10:00:00.000Z', updated_at: '2026-06-23T01:00:00.000Z' }),
  ];
  const mutatedUpdatedAt = base.map((item, index) => ({
    ...item,
    updated_at: `2026-01-0${index + 1}T00:00:00.000Z`,
  }));

  const first = analyzeCoachSignals({ tasks: base, now: NOW });
  const second = analyzeCoachSignals({ tasks: mutatedUpdatedAt, now: NOW });

  assert(first.confirmed_completions === 3, 'deveria contar conclusões confirmadas');
  assert(JSON.stringify(first.signals) === JSON.stringify(second.signals), 'alterar updated_at não deve mudar sinais');
});

runFixture('histórico legacy_approx é sinal frágil, não confirmado', () => {
  const report = analyzeCoachSignals({
    tasks: [
      completed('legacy-1', {
        completed_at_confidence: 'legacy_approx',
        updated_at: '2026-06-26T11:00:00.000Z',
      }),
    ],
    now: NOW,
  });

  assert(report.confirmed_completions === 0, 'legacy não pode virar confirmed');
  assert(report.legacy_completions === 1, 'legacy deve ser contado separado');
  assertIncludes(report.signals.map((signal) => signal.signal_id), 'legacy_history_present', 'legacy deve gerar sinal');
});

runFixture('encerradas sem execução não contam como conclusão', () => {
  const report = analyzeCoachSignals({
    tasks: [
      completed('done-1'),
      task({ id: 'cancelled-1', resolution_type: 'cancelled', resolved_at: '2026-06-24T10:00:00.000Z' }),
      task({ id: 'delegated-1', resolution_type: 'delegated', resolved_at: '2026-06-24T11:00:00.000Z' }),
    ],
    now: NOW,
  });

  assert(report.confirmed_completions === 1, 'encerradas sem execução não contam como done');
  assert(report.closed_without_execution === 2, 'deveria contar encerradas sem execução');
  assertIncludes(report.signals.map((signal) => signal.signal_id), 'closed_without_execution_ratio', 'proporção deve gerar sinal');
});

runFixture('deleted_at não é usado como resolução semântica', () => {
  const report = analyzeCoachSignals({
    tasks: [
      task({ id: 'deleted-only', deleted_at: '2026-06-25T10:00:00.000Z' }),
      task({ id: 'cancelled-live', resolution_type: 'cancelled', resolved_at: '2026-06-24T10:00:00.000Z' }),
    ],
    now: NOW,
  });

  assert(report.total_tasks === 1, 'tombstone deve ser ignorada como registro vivo');
  assert(report.closed_without_execution === 1, 'somente resolution_type fecha sem execução');
});

runFixture('aguardando terceiro não vira adiamento sem motivo', () => {
  const ids = signalIds([
    openPostponed('waiting-1', 3, 'waiting_third_party'),
    openPostponed('waiting-2', 1, 'waiting_third_party'),
  ]);

  assertExcludes(ids, 'postponed_without_reason', 'blocker_type informado não deve virar dívida de dado');
  assertIncludes(ids, 'recurring_blocker_type', 'bloqueio recorrente deve aparecer como sinal operacional');
});

runFixture('adiada 3 vezes sem motivo vira dívida de dado', () => {
  const ids = signalIds([openPostponed('postponed-1', 3, null)]);
  assertIncludes(ids, 'postponed_without_reason', 'adiamento repetido sem blocker_type deve gerar sinal');
});

runFixture('actual_minutes_source unknown rebaixa confiança do tempo real', () => {
  const ids = signalIds([
    completed('unknown-time-1', {
      actual_minutes: 540,
      actual_minutes_source: 'unknown',
    }),
  ]);

  assertIncludes(ids, 'unknown_actual_minutes', 'tempo real unknown deve gerar sinal');
});

runFixture('estimativa default_30 em excesso gera sinal', () => {
  const defaultEstimate = (id: string, source: EstimatedMinutesSource): Task => completed(id, {
    estimated_minutes: 30,
    estimated_minutes_source: source,
  });
  const ids = signalIds([
    defaultEstimate('default-1', 'default_30'),
    defaultEstimate('default-2', 'default_30'),
    defaultEstimate('manual-1', 'manual'),
  ]);

  assertIncludes(ids, 'default_estimate_overuse', 'excesso de default_30 deve gerar sinal');
});

runFixture('recorrentes concluídas contam por instância', () => {
  const report = analyzeCoachSignals({
    tasks: [
      completed('recurring-1', { recurrence_origin_id: 'series-1' }),
      completed('recurring-2', { recurrence_origin_id: 'series-1' }),
    ],
    now: NOW,
  });

  assert(report.confirmed_completions === 2, 'duas instâncias recorrentes concluídas devem contar como duas');
});

runFixture('reaberta limpa não conta como concluída e preserva evento', () => {
  const events: CoachTaskEvent[] = [
    { task_id: 'reopened-1', type: 'completed', created_at: '2026-06-24T10:00:00.000Z' },
    { task_id: 'reopened-1', type: 'reopened', created_at: '2026-06-25T10:00:00.000Z' },
  ];
  const report = analyzeCoachSignals({
    tasks: [
      task({
        id: 'reopened-1',
        status: 'doing',
        completed_at: null,
        completed_at_confidence: null,
        resolution_type: null,
        resolved_at: null,
      }),
    ],
    events,
    now: NOW,
  });

  assert(report.confirmed_completions === 0, 'tarefa reaberta limpa não deve contar como conclusão atual');
  assertIncludes(report.signals.map((signal) => signal.signal_id), 'reopened_tasks_present', 'evento reopened preservado deve gerar sinal');
});

runFixture('baixa qualidade agregada gera sinal sem afirmação forte', () => {
  const ids = signalIds([
    completed('legacy-1', { completed_at_confidence: 'legacy_approx' }),
    completed('unknown-1', { actual_minutes_source: 'unknown', estimated_minutes_source: 'ai' }),
    completed('default-1', { estimated_minutes_source: 'default_30' }),
    openPostponed('postponed-weak-1', 3, null),
  ]);

  assertIncludes(ids, 'low_data_quality', 'vários campos frágeis devem gerar sinal de baixa qualidade');
});

runFixture('mesma entrada gera exatamente a mesma saída', () => {
  const tasks = [
    completed('stable-1'),
    openPostponed('stable-2', 3, null),
  ];
  const first = analyzeCoachSignals({ tasks, now: NOW });
  const second = analyzeCoachSignals({ tasks, now: NOW });

  assert(JSON.stringify(first) === JSON.stringify(second), 'motor deve ser determinístico para mesma entrada');
});
