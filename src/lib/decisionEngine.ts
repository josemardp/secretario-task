import type {
  ContextType,
  DecisionLocation,
  PreferredPeriod,
  Task,
} from '../types';
import { isClosedWithoutExecution, isOpenTask } from './taskFilters';

export type DecisionContext = {
  now: Date;
  activeContext: ContextType;
  currentLocation: DecisionLocation;
  energy: number;
  availableMinutes: number;
  dailyCapacityMinutes: number;
  skippedTaskIds?: string[];
};

export type DecisionFactorKey =
  | 'urgency'
  | 'impact'
  | 'context'
  | 'energy'
  | 'duration'
  | 'age'
  | 'location'
  | 'period';

export type DecisionCandidate = {
  task: Task;
  score: number;
  factors: Record<DecisionFactorKey, number>;
  reasons: string[];
  warnings: string[];
  eligibleNow: boolean;
  eligibleForMission: boolean;
  dependencyTaskIds: string[];
  unresolvedDependencyIds: string[];
  inferredLocation: DecisionLocation;
  locationIsExplicit: boolean;
  estimatedMinutes: number;
};

export type DecisionPlan = {
  generatedAt: string;
  nextAction: DecisionCandidate | null;
  mission: DecisionCandidate[];
  candidates: DecisionCandidate[];
  deferredCount: number;
  blockedCount: number;
  totalMissionMinutes: number;
};

export type DecisionInsight = {
  id: string;
  title: string;
  detail: string;
  tone: 'neutral' | 'positive' | 'attention';
};

export type DailyReview = {
  completedToday: number;
  closedWithoutExecutionToday: number;
  pendingFromToday: number;
  postponedOpen: number;
  plannedToday: number;
  completionRate: number | null;
  tomorrowPreview: DecisionCandidate[];
  summary: string;
};

const LOCATION_LABELS: Record<DecisionLocation, string> = {
  anywhere: 'qualquer local',
  home: 'casa',
  company: 'Companhia',
  center: 'centro',
  car: 'carro',
  forum: 'Fórum',
  church: 'igreja',
  remote: 'remoto',
};

const CONTEXT_DEFAULT_LOCATION: Record<ContextType, DecisionLocation> = {
  PM: 'company',
  Esdra: 'remote',
  Pessoal: 'home',
  Familia: 'home',
  CCB: 'church',
  Estudo: 'home',
  Saude: 'anywhere',
};

const PERIOD_LABELS: Record<PreferredPeriod, string> = {
  any: 'qualquer horário',
  morning: 'manhã',
  afternoon: 'tarde',
  evening: 'noite',
};

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function safeTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function startOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfLocalDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function isSameLocalDay(value: string | null | undefined, date: Date): boolean {
  const time = safeTime(value);
  if (time == null) return false;
  const parsed = new Date(time);
  return parsed.getFullYear() === date.getFullYear()
    && parsed.getMonth() === date.getMonth()
    && parsed.getDate() === date.getDate();
}

function normalizeTitle(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function currentPeriod(date: Date): PreferredPeriod {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function getDecisionLocationLabel(location: DecisionLocation): string {
  return LOCATION_LABELS[location];
}

export function inferTaskLocation(task: Task): { location: DecisionLocation; explicit: boolean } {
  const explicit = task.decision_metadata?.location;
  if (explicit) return { location: explicit, explicit: true };

  const haystack = `${task.title} ${task.description ?? ''}`.toLocaleLowerCase('pt-BR');
  const keywordLocations: Array<[RegExp, DecisionLocation]> = [
    [/\bf[oó]rum\b/i, 'forum'],
    [/\bcentro\b/i, 'center'],
    [/\bcompanhia\b|\bquartel\b/i, 'company'],
    [/\bigreja\b|\bccb\b/i, 'church'],
    [/\bcarro\b|\bve[ií]culo\b/i, 'car'],
    [/\bonline\b|\bremot[oa]\b|\bvideochamada\b/i, 'remote'],
    [/\bem casa\b|\bcasa\b/i, 'home'],
  ];
  const matched = keywordLocations.find(([pattern]) => pattern.test(haystack));
  if (matched) return { location: matched[1], explicit: true };

  return { location: CONTEXT_DEFAULT_LOCATION[task.context], explicit: false };
}

function findDependencyTasks(task: Task, allTasks: Task[]): Task[] {
  const metadata = task.decision_metadata;
  const dependencies = new Map<string, Task>();

  for (const id of metadata?.dependency_ids ?? []) {
    const dependency = allTasks.find((candidate) => candidate.id === id && candidate.id !== task.id);
    if (dependency) dependencies.set(dependency.id, dependency);
  }

  for (const title of metadata?.dependency_titles ?? []) {
    const normalizedNeedle = normalizeTitle(title);
    if (!normalizedNeedle) continue;
    const dependency = allTasks.find((candidate) => {
      if (candidate.id === task.id || candidate.deleted_at) return false;
      const normalizedCandidate = normalizeTitle(candidate.title);
      return normalizedCandidate === normalizedNeedle
        || normalizedCandidate.includes(normalizedNeedle)
        || normalizedNeedle.includes(normalizedCandidate);
    });
    if (dependency) dependencies.set(dependency.id, dependency);
  }

  return [...dependencies.values()];
}

function isDependencySatisfied(task: Task): boolean {
  return task.status === 'done' || task.resolution_type === 'completed';
}

function calculateUrgency(task: Task, now: Date): number {
  const dueTime = safeTime(task.due_at);
  if (dueTime == null) return 25;
  const diffHours = (dueTime - now.getTime()) / 3_600_000;
  if (diffHours <= 0) return 100;
  if (diffHours <= 6) return 95;
  if (diffHours <= 24) return 85;
  if (diffHours <= 72) return 65;
  if (diffHours <= 168) return 45;
  if (diffHours <= 336) return 25;
  return 10;
}

function calculateAge(task: Task, now: Date): number {
  const createdTime = safeTime(task.created_at);
  if (createdTime == null) return 0;
  const ageDays = Math.max(0, (now.getTime() - createdTime) / 86_400_000);
  return clamp((ageDays / 30) * 100);
}

function calculatePeriodFit(task: Task, now: Date): number {
  const preferred = task.decision_metadata?.preferred_period ?? 'any';
  if (preferred === 'any') return 80;
  return preferred === currentPeriod(now) ? 100 : 25;
}

export function evaluateDecisionTask(
  task: Task,
  allTasks: Task[],
  context: DecisionContext,
): DecisionCandidate | null {
  if (!isOpenTask(task)) return null;

  const dependencies = findDependencyTasks(task, allTasks);
  const unresolvedDependencies = dependencies.filter((dependency) => !isDependencySatisfied(dependency));
  const metadataDependencyCount = (task.decision_metadata?.dependency_ids?.length ?? 0)
    + (task.decision_metadata?.dependency_titles?.length ?? 0);
  const hasUnmatchedDependency = metadataDependencyCount > dependencies.length;
  const blockerStopsExecution = task.blocker_type === 'waiting_third_party'
    || (task.blocker_type === 'dependency' && metadataDependencyCount === 0);

  const { location, explicit: locationIsExplicit } = inferTaskLocation(task);
  const locationMismatch = context.currentLocation !== 'anywhere'
    && location !== 'anywhere'
    && location !== context.currentLocation;
  const duration = Math.max(5, task.estimated_minutes ?? 30);
  const fitsWindow = duration <= context.availableMinutes;

  const urgency = calculateUrgency(task, context.now);
  const impact = clamp((task.priority ?? 0) * 10);
  const contextFit = task.context === context.activeContext ? 100 : 30;
  const requiredEnergy = task.energy > 0 ? task.energy : 5;
  const energyFit = clamp(100 - Math.abs(requiredEnergy - context.energy) * 12);
  const durationFit = fitsWindow
    ? clamp(100 - ((context.availableMinutes - duration) / Math.max(context.availableMinutes, 1)) * 25)
    : clamp(35 - ((duration - context.availableMinutes) / Math.max(duration, 1)) * 35);
  const age = calculateAge(task, context.now);
  const locationFit = context.currentLocation === 'anywhere' || location === 'anywhere'
    ? 80
    : location === context.currentLocation ? 100 : locationIsExplicit ? 0 : 35;
  const period = calculatePeriodFit(task, context.now);

  const factors: Record<DecisionFactorKey, number> = {
    urgency,
    impact,
    context: contextFit,
    energy: energyFit,
    duration: durationFit,
    age,
    location: locationFit,
    period,
  };

  const score = Math.round(
    urgency * 0.27
    + impact * 0.22
    + contextFit * 0.14
    + energyFit * 0.10
    + durationFit * 0.10
    + age * 0.07
    + locationFit * 0.06
    + period * 0.04,
  );

  const reasons: string[] = [];
  const warnings: string[] = [];
  const dueTime = safeTime(task.due_at);
  if (dueTime != null && dueTime <= context.now.getTime()) reasons.push('Prazo vencido ou chegou agora');
  else if (urgency >= 80) reasons.push('Prazo dentro das próximas 24 horas');
  if (impact >= 80) reasons.push('Impacto alto');
  if (contextFit === 100) reasons.push(`Contexto ${task.context} ativo`);
  if (energyFit >= 85) reasons.push('Energia compatível');
  if (fitsWindow) reasons.push(`Cabe nos ${context.availableMinutes} min disponíveis`);
  if (locationFit === 100) reasons.push(`Você está em ${LOCATION_LABELS[context.currentLocation]}`);
  if (period === 100) reasons.push(`Horário preferido: ${PERIOD_LABELS[task.decision_metadata?.preferred_period ?? 'any']}`);
  if (dependencies.length > 0 && unresolvedDependencies.length === 0 && !hasUnmatchedDependency) {
    reasons.push('Dependências concluídas');
  }
  if (reasons.length === 0) reasons.push('Melhor combinação entre impacto, prazo e contexto');

  if (!fitsWindow) warnings.push(`Precisa de cerca de ${duration} min`);
  if (locationMismatch) warnings.push(`Local indicado: ${LOCATION_LABELS[location]}`);
  if (unresolvedDependencies.length > 0) warnings.push(`${unresolvedDependencies.length} dependência(s) pendente(s)`);
  if (hasUnmatchedDependency) warnings.push('Dependência informada não encontrada');
  if (blockerStopsExecution) warnings.push(task.blocker_type === 'waiting_third_party' ? 'Aguardando terceiro' : 'Dependência não detalhada');
  if (task.blocker_type === 'no_time') warnings.push('Marcada anteriormente como sem tempo');
  if (task.blocker_type === 'needs_split') warnings.push('Pode precisar ser dividida antes');

  const eligibleForMission = !blockerStopsExecution
    && unresolvedDependencies.length === 0
    && !hasUnmatchedDependency
    && !(locationIsExplicit && locationMismatch);

  return {
    task,
    score,
    factors,
    reasons,
    warnings,
    eligibleNow: fitsWindow && eligibleForMission,
    eligibleForMission,
    dependencyTaskIds: dependencies.map((dependency) => dependency.id),
    unresolvedDependencyIds: unresolvedDependencies.map((dependency) => dependency.id),
    inferredLocation: location,
    locationIsExplicit,
    estimatedMinutes: duration,
  };
}

function compareCandidates(a: DecisionCandidate, b: DecisionCandidate): number {
  if (b.score !== a.score) return b.score - a.score;
  const aDue = safeTime(a.task.due_at) ?? Number.POSITIVE_INFINITY;
  const bDue = safeTime(b.task.due_at) ?? Number.POSITIVE_INFINITY;
  if (aDue !== bDue) return aDue - bDue;
  if (b.task.priority !== a.task.priority) return b.task.priority - a.task.priority;
  const aCreated = safeTime(a.task.created_at) ?? Number.POSITIVE_INFINITY;
  const bCreated = safeTime(b.task.created_at) ?? Number.POSITIVE_INFINITY;
  if (aCreated !== bCreated) return aCreated - bCreated;
  return a.task.id.localeCompare(b.task.id);
}

function isMissionCandidate(candidate: DecisionCandidate, now: Date): boolean {
  const dueTime = safeTime(candidate.task.due_at);
  return dueTime == null || dueTime <= endOfLocalDay(now).getTime();
}

export function buildDecisionPlan(tasks: Task[], context: DecisionContext): DecisionPlan {
  const skippedIds = new Set(context.skippedTaskIds ?? []);
  const candidates = tasks
    .map((task) => evaluateDecisionTask(task, tasks, context))
    .filter((candidate): candidate is DecisionCandidate => !!candidate)
    .sort(compareCandidates);

  const notSkipped = candidates.filter((candidate) => !skippedIds.has(candidate.task.id));
  const eligibleNow = notSkipped.filter((candidate) => candidate.eligibleNow);
  const nextAction = eligibleNow[0] ?? null;

  const dueMissionPool = notSkipped.filter((candidate) => {
    if (!candidate.eligibleForMission) return false;
    return isMissionCandidate(candidate, context.now);
  });
  const missionPool = dueMissionPool.length > 0
    ? dueMissionPool
    : notSkipped.filter((candidate) => candidate.eligibleForMission);
  const mission: DecisionCandidate[] = [];
  let missionMinutes = 0;
  for (const candidate of missionPool) {
    if (mission.length >= 5) break;
    const wouldExceedCapacity = missionMinutes + candidate.estimatedMinutes > context.dailyCapacityMinutes;
    if (wouldExceedCapacity && mission.length > 0) continue;
    mission.push(candidate);
    missionMinutes += candidate.estimatedMinutes;
  }

  return {
    generatedAt: context.now.toISOString(),
    nextAction,
    mission,
    candidates,
    deferredCount: candidates.filter((candidate) => !candidate.eligibleNow).length,
    blockedCount: candidates.filter((candidate) => candidate.unresolvedDependencyIds.length > 0 || candidate.warnings.some((warning) => warning.includes('Aguardando'))).length,
    totalMissionMinutes: missionMinutes,
  };
}

export function buildDecisionInsights(tasks: Task[], now: Date): DecisionInsight[] {
  const liveTasks = tasks.filter((task) => !task.deleted_at);
  const openTasks = liveTasks.filter(isOpenTask);
  const confirmed = liveTasks.filter((task) => task.resolution_type === 'completed'
    && task.completed_at_confidence === 'confirmed'
    && !!task.completed_at);
  const insights: DecisionInsight[] = [];

  const recentConfirmed = confirmed.filter((task) => {
    const completed = safeTime(task.completed_at);
    return completed != null && now.getTime() - completed <= 30 * 86_400_000;
  });
  if (recentConfirmed.length >= 3) {
    const hourCounts = new Map<number, number>();
    for (const task of recentConfirmed) {
      const hour = new Date(task.completed_at as string).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }
    const [peakHour, count] = [...hourCounts.entries()].sort((a, b) => b[1] - a[1] || a[0] - b[0])[0];
    insights.push({
      id: 'peak-hour',
      title: `Faixa mais concluída: ${String(peakHour).padStart(2, '0')}h–${String((peakHour + 1) % 24).padStart(2, '0')}h`,
      detail: `${count} de ${recentConfirmed.length} conclusões confirmadas dos últimos 30 dias ocorreram nessa faixa.`,
      tone: 'positive',
    });
  }

  const last7Start = now.getTime() - 7 * 86_400_000;
  const createdLast7 = liveTasks.filter((task) => (safeTime(task.created_at) ?? 0) >= last7Start).length;
  const completedLast7 = confirmed.filter((task) => (safeTime(task.completed_at) ?? 0) >= last7Start).length;
  if (createdLast7 > completedLast7) {
    insights.push({
      id: 'inflow',
      title: 'A fila cresceu nesta semana',
      detail: `${createdLast7} tarefas criadas e ${completedLast7} concluídas com registro confirmado nos últimos 7 dias.`,
      tone: 'attention',
    });
  } else if (completedLast7 > 0) {
    insights.push({
      id: 'flow-balanced',
      title: 'Fluxo semanal sob controle',
      detail: `${completedLast7} conclusões confirmadas para ${createdLast7} tarefas criadas nos últimos 7 dias.`,
      tone: 'positive',
    });
  }

  const repeatedlyPostponed = openTasks
    .filter((task) => (task.postponed_count ?? 0) >= 2)
    .sort((a, b) => (b.postponed_count ?? 0) - (a.postponed_count ?? 0));
  if (repeatedlyPostponed.length > 0) {
    const first = repeatedlyPostponed[0];
    insights.push({
      id: 'postponed',
      title: 'Uma próxima ação precisa ser esclarecida',
      detail: `“${first.title}” foi adiada ${first.postponed_count} vezes${first.blocker_type ? ' e já tem motivo registrado' : ' sem motivo registrado'}.`,
      tone: 'attention',
    });
  }

  if (openTasks.length > 0) {
    const byContext = new Map<ContextType, number>();
    for (const task of openTasks) byContext.set(task.context, (byContext.get(task.context) ?? 0) + 1);
    const [context, count] = [...byContext.entries()].sort((a, b) => b[1] - a[1])[0];
    insights.push({
      id: 'backlog-context',
      title: `Maior fila aberta: ${context}`,
      detail: `${count} de ${openTasks.length} tarefas abertas estão nesse contexto.`,
      tone: 'neutral',
    });
  }

  if (insights.length === 0) {
    insights.push({
      id: 'insufficient-data',
      title: 'Ainda há pouco histórico confirmado',
      detail: 'Conclua tarefas normalmente; os insights aparecem sem exigir preenchimento extra.',
      tone: 'neutral',
    });
  }

  return insights.slice(0, 4);
}

export function buildDailyReview(tasks: Task[], context: DecisionContext): DailyReview {
  const liveTasks = tasks.filter((task) => !task.deleted_at);
  const completedToday = liveTasks.filter((task) => task.resolution_type === 'completed'
    && task.completed_at_confidence === 'confirmed'
    && isSameLocalDay(task.completed_at, context.now)).length;
  const closedWithoutExecutionToday = liveTasks.filter((task) => isClosedWithoutExecution(task)
    && isSameLocalDay(task.resolved_at, context.now)).length;
  const pendingFromToday = liveTasks.filter((task) => isOpenTask(task)
    && task.due_at != null
    && safeTime(task.due_at)! >= startOfLocalDay(context.now).getTime()
    && safeTime(task.due_at)! <= endOfLocalDay(context.now).getTime()).length;
  const postponedOpen = liveTasks.filter((task) => isOpenTask(task) && (task.postponed_count ?? 0) > 0).length;
  const plannedToday = completedToday + pendingFromToday;
  const completionRate = plannedToday > 0 ? Math.round((completedToday / plannedToday) * 100) : null;

  const tomorrow = new Date(context.now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  const tomorrowPlan = buildDecisionPlan(tasks, {
    ...context,
    now: tomorrow,
    skippedTaskIds: [],
  });

  let summary = 'Dia revisado. A missão de amanhã já pode ser consultada.';
  if (pendingFromToday > 0) summary = `${pendingFromToday} tarefa(s) de hoje continuam abertas e serão reavaliadas automaticamente.`;
  else if (completedToday > 0) summary = 'As tarefas previstas para hoje foram encerradas; amanhã começa com uma missão limpa.';

  return {
    completedToday,
    closedWithoutExecutionToday,
    pendingFromToday,
    postponedOpen,
    plannedToday,
    completionRate,
    tomorrowPreview: tomorrowPlan.mission.slice(0, 3),
    summary,
  };
}
