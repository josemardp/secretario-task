import { useMemo } from 'react';
import { Clock } from 'lucide-react';
import type { DecisionPlan } from '../lib/decisionEngine';
import { isOpenTask } from '../lib/taskFilters';
import type { Task } from '../types';

/** Coluna auxiliar da Agenda, exclusiva do desktop (≥1024px).
 *
 * Não calcula nada: recebe o plano que o `Home` já monta para o Foco e filtra
 * a lista de tarefas com os mesmos helpers da Agenda. Existe para responder,
 * sem abrir modal, as duas perguntas que a timeline do dia não responde:
 * "o que eu faço agora" e "o que está aberto fora deste dia". */
interface AgendaRailProps {
  plan: DecisionPlan;
  tasks: Task[];
  onCompleteTask: (task: Task) => void;
  onPostponeTask: (task: Task) => void;
  onOpenTask: (task: Task) => void;
}

function contextLabel(context: Task['context']): string {
  if (context === 'Saude') return 'Saúde';
  if (context === 'Familia') return 'Família';
  return context;
}

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-[22px] border border-line bg-paper shadow-card">
      {children}
    </section>
  );
}

function Eyebrow({ label, count }: { label: string; count?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 px-4 pt-3.5 pb-2">
      <span className="text-[11px] font-bold uppercase tracking-[0.06em] text-ink-2">{label}</span>
      {count && <span className="text-[11px] font-bold tnum text-ink-tertiary">{count}</span>}
    </div>
  );
}

function dayKey(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(iso: string): string {
  const date = new Date(iso);
  const amanha = new Date();
  amanha.setDate(amanha.getDate() + 1);

  if (dayKey(iso) === dayKey(amanha.toISOString())) return 'Amanhã';

  const weekday = date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
  return `${weekday} ${date.getDate()}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function hourLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function TaskLine({ task, onOpen }: { task: Task; onOpen: (task: Task) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpen(task)}
      className="flex w-full items-baseline gap-2 border-t border-line px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken"
    >
      <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">{task.title}</span>
      <span className="shrink-0 text-[11px] font-semibold tnum text-ink-tertiary">
        {task.due_at ? hourLabel(task.due_at) : contextLabel(task.context)}
      </span>
    </button>
  );
}

export function AgendaRail({
  plan,
  tasks,
  onCompleteTask,
  onPostponeTask,
  onOpenTask,
}: AgendaRailProps) {
  const nextAction = plan.nextAction;

  // Próximos dias, não "atrasadas" nem "sem horário": quando o dia selecionado
  // é hoje, `calculateAgendaBlocks` já puxa as atrasadas e as sem horário para
  // dentro da timeline (useAgendaPositions.ts, linhas 34 e 68). Listá-las aqui
  // mostraria a mesma tarefa duas vezes na mesma tela. O que a timeline de hoje
  // não mostra é o que vem depois de hoje.
  const { proximos, proximosPorDia } = useMemo(() => {
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const lista = tasks
      .filter(isOpenTask)
      .filter((task) => task.due_at && new Date(task.due_at) > endOfToday)
      .sort((a, b) => (a.due_at ?? '').localeCompare(b.due_at ?? ''));

    // Agrupado por dia: uma lista corrida de dezenas de tarefas não se lê.
    // A coluna rola por dentro, então nada fica escondido atrás de um "e mais".
    const porDia: Array<{ key: string; label: string; tarefas: Task[] }> = [];
    for (const task of lista) {
      const key = dayKey(task.due_at!);
      const ultimo = porDia[porDia.length - 1];
      if (ultimo && ultimo.key === key) ultimo.tarefas.push(task);
      else porDia.push({ key, label: dayLabel(task.due_at!), tarefas: [task] });
    }

    return { proximos: lista, proximosPorDia: porDia };
  }, [tasks]);

  return (
    <div className="flex flex-col gap-3">
      <Panel>
        <Eyebrow label="Faça agora" />
        {nextAction ? (
          <div className="px-4 pb-3.5">
            <button
              type="button"
              onClick={() => onOpenTask(nextAction.task)}
              className="block w-full text-left"
            >
              <div className="font-display text-[23px] leading-[1.1] text-ink">
                {nextAction.task.title}
              </div>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-semibold text-ink-2">
                <span className="inline-flex items-center gap-1">
                  <Clock size={11} /> ~{nextAction.estimatedMinutes} min
                </span>
                <span>·</span>
                <span>{contextLabel(nextAction.task.context)}</span>
                <span>·</span>
                <span className="tnum">prioridade {nextAction.score}/100</span>
              </div>
            </button>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onCompleteTask(nextAction.task)}
                className="bg-metal h-10 rounded-full text-[12px] font-bold"
              >
                Concluir
              </button>
              <button
                type="button"
                onClick={() => onPostponeTask(nextAction.task)}
                className="h-10 rounded-full border border-border-strong bg-surface text-[12px] font-bold text-ink transition-colors hover:border-accent"
              >
                Amanhã
              </button>
            </div>
          </div>
        ) : (
          <p className="px-4 pb-3.5 text-[12px] leading-relaxed text-ink-2">
            Nenhuma ação elegível agora. Ajuste contexto, tempo ou energia no Foco.
          </p>
        )}

        {plan.mission.length > 0 && (
          <>
            <Eyebrow
              label="Missão de hoje"
              count={`${plan.mission.length} · ~${plan.totalMissionMinutes} min`}
            />
            {plan.mission.map((candidate, index) => (
              <button
                key={candidate.task.id}
                type="button"
                onClick={() => onOpenTask(candidate.task)}
                className="flex w-full items-baseline gap-2.5 border-t border-line px-4 py-2.5 text-left transition-colors hover:bg-surface-sunken"
              >
                <span className="shrink-0 text-[11px] font-bold tnum text-ink-tertiary">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
                  {candidate.task.title}
                </span>
                <span className="shrink-0 text-[11px] font-semibold tnum text-ink-tertiary">
                  ~{candidate.estimatedMinutes} min
                </span>
              </button>
            ))}
          </>
        )}
      </Panel>

      {proximos.length > 0 && (
        <Panel>
          <Eyebrow label="Próximos dias" count={String(proximos.length)} />
          {proximosPorDia.map((dia) => (
            <div key={dia.key}>
              <div className="flex items-baseline justify-between gap-2 border-t border-line bg-surface-sunken px-4 py-1.5">
                <span className="text-[11px] font-bold text-ink-2">{dia.label}</span>
                <span className="text-[11px] font-bold tnum text-ink-tertiary">{dia.tarefas.length}</span>
              </div>
              {dia.tarefas.map((task) => (
                <TaskLine key={task.id} task={task} onOpen={onOpenTask} />
              ))}
            </div>
          ))}
        </Panel>
      )}
    </div>
  );
}
