import type { BlockerType, EstimatedMinutesSource, Task, TaskEventType } from '../types';

export type CoachSignalSeverity = 'info' | 'warning' | 'critical';
export type CoachSignalConfidence = 'low' | 'medium' | 'high';

export type CoachSignalId =
  | 'insufficient_confirmed_completions'
  | 'legacy_history_present'
  | 'postponed_without_reason'
  | 'unknown_actual_minutes'
  | 'default_estimate_overuse'
  | 'closed_without_execution_ratio'
  | 'recurring_blocker_type'
  | 'trusted_estimate_actual_drift'
  | 'reopened_tasks_present'
  | 'low_data_quality';

export interface CoachSignal {
  signal_id: CoachSignalId;
  severity: CoachSignalSeverity;
  title: string;
  description: string;
  evidence: Record<string, number | string | string[]>;
  confidence: CoachSignalConfidence;
  recommendation: string;
  weak_fields: string[];
}

export interface CoachTaskEvent {
  task_id: string;
  type: TaskEventType;
  created_at: string;
  payload?: Record<string, unknown> | null;
}

export interface CoachSignalReport {
  generated_at: string;
  total_tasks: number;
  active_tasks: number;
  confirmed_completions: number;
  legacy_completions: number;
  closed_without_execution: number;
  signals: CoachSignal[];
}

export interface AnalyzeCoachSignalsInput {
  tasks: Task[];
  events?: CoachTaskEvent[];
  now: Date;
}

const MIN_CONFIRMED_COMPLETIONS = 3;
const POSTPONED_WITHOUT_REASON_THRESHOLD = 2;
const DEFAULT_ESTIMATE_RATIO_THRESHOLD = 0.5;
const CLOSED_WITHOUT_EXECUTION_RATIO_THRESHOLD = 0.3;
const ESTIMATE_DRIFT_RATIO_THRESHOLD = 0.5;
const REOPENED_EVENT_THRESHOLD = 1;
const LOW_QUALITY_WEAK_FIELD_THRESHOLD = 3;

const ESTIMATE_SOURCE_LABELS: Record<EstimatedMinutesSource, string> = {
  default_30: 'default_30',
  manual: 'manual',
  ai: 'ai',
  parser: 'parser',
};

const CLOSED_WITHOUT_EXECUTION = ['cancelled', 'delegated', 'obsolete'];

export function analyzeCoachSignals({ tasks, events = [], now }: AnalyzeCoachSignalsInput): CoachSignalReport {
  const generatedAt = now.toISOString();
  const liveTasks = tasks.filter((task) => !task.deleted_at);
  const completedTasks = liveTasks.filter((task) => task.resolution_type === 'completed' && !!task.completed_at);
  const confirmedCompletions = completedTasks.filter((task) => task.completed_at_confidence === 'confirmed');
  const legacyCompletions = completedTasks.filter((task) => task.completed_at_confidence === 'legacy_approx');
  const openTasks = liveTasks.filter((task) => !isClosedWithoutExecution(task) && task.status !== 'done');
  const closedWithoutExecution = liveTasks.filter(isClosedWithoutExecution);

  const signals: CoachSignal[] = [];

  addInsufficientConfirmedCompletions(signals, confirmedCompletions.length);
  addLegacyHistorySignal(signals, legacyCompletions.length);
  addPostponedWithoutReasonSignal(signals, openTasks);
  addUnknownActualMinutesSignal(signals, completedTasks);
  addDefaultEstimateSignal(signals, completedTasks);
  addClosedWithoutExecutionSignal(signals, completedTasks.length, closedWithoutExecution);
  addRecurringBlockerSignal(signals, openTasks);
  addEstimateDriftSignal(signals, completedTasks);
  addReopenedSignal(signals, events);
  addLowDataQualitySignal(signals, completedTasks, openTasks);

  return {
    generated_at: generatedAt,
    total_tasks: liveTasks.length,
    active_tasks: openTasks.length,
    confirmed_completions: confirmedCompletions.length,
    legacy_completions: legacyCompletions.length,
    closed_without_execution: closedWithoutExecution.length,
    signals,
  };
}

function addInsufficientConfirmedCompletions(signals: CoachSignal[], confirmedCount: number) {
  if (confirmedCount >= MIN_CONFIRMED_COMPLETIONS) return;

  signals.push({
    signal_id: 'insufficient_confirmed_completions',
    severity: 'info',
    title: 'Baixa quantidade de conclusões confirmadas',
    description: 'Ainda há poucos registros confirmados para afirmar padrões de horário ou execução.',
    evidence: { confirmed_count: confirmedCount, minimum_expected: MIN_CONFIRMED_COMPLETIONS },
    confidence: 'high',
    recommendation: 'Use as métricas como leitura inicial até acumular mais conclusões confirmadas.',
    weak_fields: ['completed_at_confidence'],
  });
}

function addLegacyHistorySignal(signals: CoachSignal[], legacyCount: number) {
  if (legacyCount === 0) return;

  signals.push({
    signal_id: 'legacy_history_present',
    severity: 'info',
    title: 'Histórico aproximado presente',
    description: 'Há conclusões antigas marcadas como aproximação; elas não devem alimentar padrões de horário.',
    evidence: { legacy_approx_count: legacyCount },
    confidence: 'high',
    recommendation: 'Mantenha o histórico separado de conclusões confirmadas nas leituras operacionais.',
    weak_fields: ['completed_at_confidence'],
  });
}

function addPostponedWithoutReasonSignal(signals: CoachSignal[], openTasks: Task[]) {
  const tasks = openTasks.filter((task) => (task.postponed_count ?? 0) > 0 && !task.blocker_type);
  const maxPostponedCount = tasks.reduce((max, task) => Math.max(max, task.postponed_count ?? 0), 0);
  if (tasks.length < POSTPONED_WITHOUT_REASON_THRESHOLD && maxPostponedCount < 3) return;

  signals.push({
    signal_id: 'postponed_without_reason',
    severity: maxPostponedCount >= 3 ? 'warning' : 'info',
    title: 'Adiamentos sem motivo informado',
    description: 'Há tarefas abertas adiadas sem motivo. Isso é dívida de dado, não diagnóstico comportamental.',
    evidence: {
      open_tasks_without_blocker_type: tasks.length,
      max_postponed_count: maxPostponedCount,
      task_ids: stableIds(tasks),
    },
    confidence: 'high',
    recommendation: 'Ao adiar de novo, informe um motivo quando ele existir.',
    weak_fields: ['blocker_type'],
  });
}

function addUnknownActualMinutesSignal(signals: CoachSignal[], completedTasks: Task[]) {
  const unknownTasks = completedTasks.filter((task) => task.actual_minutes != null && task.actual_minutes_source === 'unknown');
  if (unknownTasks.length === 0) return;

  signals.push({
    signal_id: 'unknown_actual_minutes',
    severity: 'warning',
    title: 'Tempo real com baixa confiança',
    description: 'Há tempo real marcado como origem desconhecida; ele não deve ser tratado como medição confiável.',
    evidence: { unknown_actual_minutes_count: unknownTasks.length, task_ids: stableIds(unknownTasks) },
    confidence: 'high',
    recommendation: 'Separe esses itens das comparações de estimado vs. real.',
    weak_fields: ['actual_minutes_source'],
  });
}

function addDefaultEstimateSignal(signals: CoachSignal[], completedTasks: Task[]) {
  const estimatedTasks = completedTasks.filter((task) => task.estimated_minutes != null);
  const defaultEstimateTasks = estimatedTasks.filter((task) => task.estimated_minutes_source === 'default_30');
  if (estimatedTasks.length === 0) return;

  const ratio = defaultEstimateTasks.length / estimatedTasks.length;
  if (defaultEstimateTasks.length < 2 && ratio < DEFAULT_ESTIMATE_RATIO_THRESHOLD) return;

  signals.push({
    signal_id: 'default_estimate_overuse',
    severity: ratio >= DEFAULT_ESTIMATE_RATIO_THRESHOLD ? 'warning' : 'info',
    title: 'Muitas estimativas default',
    description: 'O fallback de 30 minutos está presente em parte relevante das estimativas.',
    evidence: {
      default_30_count: defaultEstimateTasks.length,
      estimated_count: estimatedTasks.length,
      default_30_ratio_percent: Math.round(ratio * 100),
    },
    confidence: 'high',
    recommendation: 'Prefira ajuste manual quando a duração real for conhecida.',
    weak_fields: ['estimated_minutes_source'],
  });
}

function addClosedWithoutExecutionSignal(signals: CoachSignal[], completedCount: number, closedWithoutExecution: Task[]) {
  const totalResolved = completedCount + closedWithoutExecution.length;
  if (totalResolved === 0 || closedWithoutExecution.length === 0) return;

  const ratio = closedWithoutExecution.length / totalResolved;
  if (ratio < CLOSED_WITHOUT_EXECUTION_RATIO_THRESHOLD) return;

  signals.push({
    signal_id: 'closed_without_execution_ratio',
    severity: ratio >= 0.5 ? 'warning' : 'info',
    title: 'Encerramentos sem execução em proporção relevante',
    description: 'Canceladas, delegadas e obsoletas aparecem separadas de conclusões feitas.',
    evidence: {
      closed_without_execution_count: closedWithoutExecution.length,
      completed_count: completedCount,
      closed_without_execution_ratio_percent: Math.round(ratio * 100),
    },
    confidence: 'high',
    recommendation: 'Leia esse sinal como vazão de encerramento, não como produtividade.',
    weak_fields: [],
  });
}

function addRecurringBlockerSignal(signals: CoachSignal[], openTasks: Task[]) {
  const counts: Partial<Record<BlockerType, number>> = {};
  openTasks.forEach((task) => {
    if (!task.blocker_type) return;
    counts[task.blocker_type] = (counts[task.blocker_type] ?? 0) + 1;
  });

  const recurring = Object.entries(counts)
    .filter(([, count]) => count >= 2)
    .sort(([a], [b]) => a.localeCompare(b));
  if (recurring.length === 0) return;

  signals.push({
    signal_id: 'recurring_blocker_type',
    severity: 'info',
    title: 'Bloqueios recorrentes por tipo',
    description: 'Alguns motivos de bloqueio aparecem repetidos em tarefas abertas.',
    evidence: {
      blocker_types: recurring.map(([type]) => type),
      blocker_counts: recurring.map(([type, count]) => `${type}:${count}`),
    },
    confidence: 'high',
    recommendation: 'Agrupe tarefas com o mesmo bloqueio para decidir a próxima ação operacional.',
    weak_fields: [],
  });
}

function addEstimateDriftSignal(signals: CoachSignal[], completedTasks: Task[]) {
  const comparableTasks = completedTasks.filter((task) =>
    task.estimated_minutes != null &&
    task.estimated_minutes > 0 &&
    task.actual_minutes != null &&
    task.actual_minutes_source !== 'unknown' &&
    !!task.actual_minutes_source &&
    task.estimated_minutes_source !== 'default_30'
  );

  if (comparableTasks.length < 2) return;

  const averageDrift = comparableTasks.reduce((sum, task) => {
    const estimated = task.estimated_minutes ?? 1;
    const actual = task.actual_minutes ?? estimated;
    return sum + Math.abs(actual - estimated) / estimated;
  }, 0) / comparableTasks.length;

  if (averageDrift < ESTIMATE_DRIFT_RATIO_THRESHOLD) return;

  signals.push({
    signal_id: 'trusted_estimate_actual_drift',
    severity: 'warning',
    title: 'Diferença relevante entre estimado e real',
    description: 'A diferença foi calculada somente em tarefas com estimativa e tempo real de origem confiável.',
    evidence: {
      comparable_tasks: comparableTasks.length,
      average_drift_percent: Math.round(averageDrift * 100),
      task_ids: stableIds(comparableTasks),
    },
    confidence: 'medium',
    recommendation: 'Revise estimativas manuais ou do parser para tarefas parecidas.',
    weak_fields: [],
  });
}

function addReopenedSignal(signals: CoachSignal[], events: CoachTaskEvent[]) {
  const reopenedEvents = events.filter((event) => event.type === 'reopened');
  if (reopenedEvents.length < REOPENED_EVENT_THRESHOLD) return;

  signals.push({
    signal_id: 'reopened_tasks_present',
    severity: 'info',
    title: 'Reaberturas registradas',
    description: 'Há eventos de reabertura preservados no histórico auditável.',
    evidence: { reopened_events: reopenedEvents.length, task_ids: stableEventTaskIds(reopenedEvents) },
    confidence: 'high',
    recommendation: 'Use reaberturas como sinal operacional de escopo ou definição incompleta.',
    weak_fields: [],
  });
}

function addLowDataQualitySignal(signals: CoachSignal[], completedTasks: Task[], openTasks: Task[]) {
  const weakFields = new Set<string>();

  if (completedTasks.some((task) => task.completed_at_confidence === 'legacy_approx')) weakFields.add('completed_at_confidence');
  if (completedTasks.some((task) => task.actual_minutes != null && task.actual_minutes_source === 'unknown')) weakFields.add('actual_minutes_source');
  if (completedTasks.some((task) => task.estimated_minutes_source === 'ai')) weakFields.add('estimated_minutes_source:ai');
  if (completedTasks.some((task) => task.estimated_minutes_source === 'default_30')) weakFields.add('estimated_minutes_source:default_30');
  if (openTasks.some((task) => (task.postponed_count ?? 0) > 0 && !task.blocker_type)) weakFields.add('blocker_type');

  if (weakFields.size < LOW_QUALITY_WEAK_FIELD_THRESHOLD) return;

  signals.push({
    signal_id: 'low_data_quality',
    severity: 'warning',
    title: 'Baixa confiabilidade agregada dos dados',
    description: 'Vários campos indicam dado frágil ou incompleto. O sinal não afirma padrão comportamental forte.',
    evidence: { weak_field_count: weakFields.size, weak_fields: Array.from(weakFields).sort() },
    confidence: 'medium',
    recommendation: 'Trate leituras agregadas como orientação inicial até melhorar a origem dos dados.',
    weak_fields: Array.from(weakFields).sort(),
  });
}

function stableIds(tasks: Task[]): string[] {
  return tasks.map((task) => task.id).sort();
}

function stableEventTaskIds(events: CoachTaskEvent[]): string[] {
  return Array.from(new Set(events.map((event) => event.task_id))).sort();
}

function isClosedWithoutExecution(task: Task): boolean {
  return !!task.resolution_type && CLOSED_WITHOUT_EXECUTION.includes(task.resolution_type);
}

export function estimateSourceLabel(source: EstimatedMinutesSource | null | undefined): string {
  return source ? ESTIMATE_SOURCE_LABELS[source] : 'unknown';
}
