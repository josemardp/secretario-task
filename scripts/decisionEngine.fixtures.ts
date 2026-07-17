import { extractDecisionCaptureHints } from '../src/lib/decisionCapture.js';
import {
  buildDailyReview,
  buildDecisionInsights,
  buildDecisionPlan,
  evaluateDecisionTask,
} from '../src/lib/decisionEngine.js';
import type { DecisionContext } from '../src/lib/decisionEngine.js';
import { parseTaskInput } from '../src/lib/parser.js';
import type { Task } from '../src/types/index.js';

const NOW = new Date('2026-07-17T12:00:00.000Z');

function task(id: string, overrides: Partial<Task> = {}): Task {
  return {
    id,
    user_id: 'user-v5',
    title: `Tarefa ${id}`,
    description: null,
    context: 'PM',
    priority: 5,
    energy: 5,
    status: 'todo',
    due_at: '2026-07-17T15:00:00.000Z',
    deleted_at: null,
    created_at: '2026-07-10T12:00:00.000Z',
    updated_at: '2026-07-10T12:00:00.000Z',
    estimated_minutes: 30,
    estimated_minutes_source: 'manual',
    ...overrides,
  };
}

function context(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    now: NOW,
    activeContext: 'PM',
    currentLocation: 'company',
    energy: 5,
    availableMinutes: 30,
    dailyCapacityMinutes: 180,
    skippedTaskIds: [],
    ...overrides,
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}. Esperado: ${String(expected)}; obtido: ${String(actual)}`);
}

function run(name: string, fixture: () => void): void {
  fixture();
  console.log(`ok - ${name}`);
}

run('V5 prioriza prazo, impacto e contexto de forma determinística', () => {
  const urgent = task('urgent', { priority: 9, due_at: '2026-07-17T11:00:00.000Z' });
  const later = task('later', { priority: 2, due_at: '2026-07-24T12:00:00.000Z' });
  const first = buildDecisionPlan([later, urgent], context());
  const second = buildDecisionPlan([later, urgent], context());
  equal(first.nextAction?.task.id, 'urgent', 'tarefa urgente deveria ser a próxima ação');
  equal(JSON.stringify(first), JSON.stringify(second), 'mesma entrada deveria gerar o mesmo plano');
});

run('tempo disponível e energia mudam a próxima melhor ação', () => {
  const deep = task('deep', { priority: 8, energy: 8, estimated_minutes: 60 });
  const quick = task('quick', { priority: 6, energy: 2, estimated_minutes: 10 });
  const lowWindow = buildDecisionPlan([deep, quick], context({ energy: 2, availableMinutes: 15 }));
  const highWindow = buildDecisionPlan([deep, quick], context({ energy: 8, availableMinutes: 60 }));
  equal(lowWindow.nextAction?.task.id, 'quick', 'janela curta deveria escolher tarefa curta');
  equal(highWindow.nextAction?.task.id, 'deep', 'janela e energia altas deveriam liberar tarefa profunda');
});

run('local explícito incompatível retira tarefa da próxima ação', () => {
  const centerTask = task('center', { decision_metadata: { location: 'center' } });
  const candidate = evaluateDecisionTask(centerTask, [centerTask], context({ currentLocation: 'home' }));
  assert(candidate, 'candidata deveria existir');
  equal(candidate.eligibleNow, false, 'local incompatível deveria impedir execução agora');
  equal(candidate.eligibleForMission, false, 'local explícito incompatível deveria sair da missão atual');
  assert(candidate.warnings.some((warning) => warning.includes('centro')), 'deveria explicar o local necessário');
});

run('dependência bloqueia e conclusão desbloqueia automaticamente', () => {
  const prerequisite = task('buy', { title: 'Comprar tinta' });
  const dependent = task('paint', {
    title: 'Pintar muro',
    priority: 10,
    decision_metadata: { dependency_ids: ['buy'] },
  });
  const blocked = buildDecisionPlan([prerequisite, dependent], context());
  assert(blocked.nextAction?.task.id !== 'paint', 'dependente não poderia vencer antes da prévia');
  const donePrerequisite = task('buy', {
    title: 'Comprar tinta',
    status: 'done',
    resolution_type: 'completed',
    completed_at: '2026-07-17T11:00:00.000Z',
    completed_at_confidence: 'confirmed',
  });
  const unlocked = buildDecisionPlan([donePrerequisite, dependent], context());
  equal(unlocked.nextAction?.task.id, 'paint', 'dependente deveria ser liberada após conclusão');
});

run('missão respeita limite de cinco ações e capacidade diária', () => {
  const tasks = Array.from({ length: 8 }, (_, index) => task(String(index), {
    estimated_minutes: 30,
    priority: 10 - index,
  }));
  const plan = buildDecisionPlan(tasks, context({ dailyCapacityMinutes: 90 }));
  equal(plan.mission.length, 3, 'capacidade de 90 minutos deveria selecionar três tarefas de 30');
  equal(plan.totalMissionMinutes, 90, 'tempo total da missão deveria respeitar capacidade');
});

run('pular uma ação replaneja sem alterar a tarefa', () => {
  const first = task('first', { priority: 10 });
  const second = task('second', { priority: 8 });
  const plan = buildDecisionPlan([first, second], context({ skippedTaskIds: ['first'] }));
  equal(plan.nextAction?.task.id, 'second', 'ação pulada deveria sair da decisão do dia');
  equal(first.status, 'todo', 'pulo local não deveria mudar ciclo de vida');
});

run('captura determinística extrai duração, local, período, impacto e dependência', () => {
  const hints = extractDecisionCaptureHints('Pintar muro 45 min @centro @manhã impacto alto depende de Comprar tinta');
  equal(hints.estimatedMinutes, 45, 'deveria extrair duração');
  equal(hints.priority, 8, 'deveria mapear impacto alto');
  equal(hints.metadata?.location, 'center', 'deveria extrair local');
  equal(hints.metadata?.preferred_period, 'morning', 'deveria extrair período');
  equal(hints.metadata?.dependency_titles?.[0], 'Comprar tinta', 'deveria extrair dependência por título');
  equal(hints.cleanedText, 'Pintar muro', 'deveria preservar apenas o título limpo');

  const clock = extractDecisionCaptureHints('Reunião amanhã às 9h');
  equal(clock.estimatedMinutes, undefined, 'horário com às não deveria virar duração');
  assert(clock.cleanedText.includes('9h'), 'horário deveria permanecer para o parser de agenda');

  const oneHour = extractDecisionCaptureHints('Preparar relatório duração 1h');
  equal(oneHour.estimatedMinutes, 60, 'duração explícita em horas deveria ser aceita');
});

run('parser local grava metadados V5 sem IA', () => {
  const parsed = parseTaskInput('Despachar processo 20 min @companhia impacto crítico', 'PM');
  equal(parsed.estimated_minutes, 20, 'parser deveria gravar duração');
  equal(parsed.estimated_minutes_source, 'parser', 'origem deveria ser parser');
  equal(parsed.priority, 10, 'impacto crítico deveria virar prioridade 10');
  equal(parsed.decision_metadata?.location, 'company', 'local deveria ser extraído deterministicamente');
});

run('revisão diária usa completed_at e antecipa missão de amanhã', () => {
  const completed = task('done', {
    status: 'done',
    resolution_type: 'completed',
    completed_at: '2026-07-17T13:00:00.000Z',
    completed_at_confidence: 'confirmed',
    updated_at: '2026-07-01T10:00:00.000Z',
  });
  const tomorrow = task('tomorrow', { due_at: '2026-07-18T12:00:00.000Z' });
  const review = buildDailyReview([completed, tomorrow], context());
  equal(review.completedToday, 1, 'deveria contar conclusão confirmada de hoje');
  assert(review.tomorrowPreview.some((candidate) => candidate.task.id === 'tomorrow'), 'deveria antecipar tarefa de amanhã');
});

run('insights não usam updated_at como conclusão', () => {
  const editedOnly = task('edited', {
    updated_at: '2026-07-17T13:00:00.000Z',
    created_at: '2026-07-17T10:00:00.000Z',
  });
  const insights = buildDecisionInsights([editedOnly], NOW);
  assert(!insights.some((insight) => insight.id === 'peak-hour'), 'edição não poderia criar horário produtivo');
});

console.log('[decisionEngine] 10 fixtures passaram');
