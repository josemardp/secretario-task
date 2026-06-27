import { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
} from 'recharts';
import { ChevronUp } from 'lucide-react';
import type { Task, ContextType } from '../types';
import { EmptyState } from './EmptyState';
import { isClosedWithoutExecution, isOpenTask } from '../lib/taskFilters';

interface DashboardViewProps {
  tasks: Task[];
}

// Excecao categorica deliberada do design system: contextos precisam manter distincao visual.
const CTX_COLORS: Record<ContextType, string> = {
  PM: '#6366F1',
  Esdra: '#DB5A9D',
  Pessoal: '#C98A22',
  Familia: '#1CA39A',
  CCB: '#5FA052',
  Estudo: '#9B6BEF',
  Saude: '#2E8FD4',
};

type ChartTheme = {
  border: string;
  inkSecondary: string;
  inkTertiary: string;
  surface: string;
  surfaceSunken: string;
  accent: string;
};

const DEFAULT_CHART_THEME: ChartTheme = {
  border: 'var(--border)',
  inkSecondary: 'var(--ink-secondary)',
  inkTertiary: 'var(--ink-tertiary)',
  surface: 'var(--surface)',
  surfaceSunken: 'var(--surface-sunken)',
  accent: 'var(--accent)',
};

function readChartTheme(): ChartTheme {
  if (typeof document === 'undefined') return DEFAULT_CHART_THEME;

  const styles = getComputedStyle(document.documentElement);
  const readToken = (token: string, fallback: string) => styles.getPropertyValue(token).trim() || fallback;

  return {
    border: readToken('--border', DEFAULT_CHART_THEME.border),
    inkSecondary: readToken('--ink-secondary', DEFAULT_CHART_THEME.inkSecondary),
    inkTertiary: readToken('--ink-tertiary', DEFAULT_CHART_THEME.inkTertiary),
    surface: readToken('--surface', DEFAULT_CHART_THEME.surface),
    surfaceSunken: readToken('--surface-sunken', DEFAULT_CHART_THEME.surfaceSunken),
    accent: readToken('--accent', DEFAULT_CHART_THEME.accent),
  };
}

function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState<ChartTheme>(() => readChartTheme());

  useEffect(() => {
    const updateTheme = () => setTheme(readChartTheme());
    updateTheme();

    if (typeof window === 'undefined') return undefined;

    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    darkModeQuery.addEventListener('change', updateTheme);

    return () => {
      darkModeQuery.removeEventListener('change', updateTheme);
    };
  }, []);

  return theme;
}

function StatCard({ label, value, sub, big = false }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode;
  big?: boolean;
}) {
  return (
    <div className="rounded-2xl px-4 py-3.5 border bg-surface border-border">
      <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-secondary">
        {label}
      </div>
      <div
        className={
          'mt-0.5 tnum ' +
          (big
            ? 'font-display text-[40px] leading-[1] tracking-[-0.04em] text-ink'
            : 'font-bold text-[24px] leading-[1.05] tracking-[-0.02em] text-ink')
        }
      >
        {value}
      </div>
      {sub && (
        <div className="text-[12px] mt-1 text-ink-secondary">
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, eyebrow, children }: { title?: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      {eyebrow && (
        <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-secondary mb-1">
          {eyebrow}
        </div>
      )}
      {title && (
        <div className="font-display text-[20px] tracking-[-0.02em] text-ink mb-3">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function DataLine({ label, value, detail }: { label: string; value: React.ReactNode; detail?: string }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2 border-b border-border last:border-b-0">
      <div className="min-w-0">
        <div className="text-[13px] font-bold text-ink">{label}</div>
        {detail && <div className="mt-0.5 text-[11px] text-ink-secondary">{detail}</div>}
      </div>
      <div className="text-[13px] font-bold text-ink tnum shrink-0">{value}</div>
    </div>
  );
}

function isConfirmedCompletion(task: Task): boolean {
  return task.resolution_type === 'completed' &&
    !!task.completed_at &&
    task.completed_at_confidence === 'confirmed';
}

function isLegacyCompletion(task: Task): boolean {
  return task.resolution_type === 'completed' &&
    !!task.completed_at &&
    task.completed_at_confidence === 'legacy_approx';
}

function isTrustedActualMinutes(task: Task): boolean {
  return task.actual_minutes != null &&
    task.actual_minutes_source !== 'unknown' &&
    !!task.actual_minutes_source;
}

function blockerLabel(type: Task['blocker_type']): string {
  if (type === 'waiting_third_party') return 'Aguardando terceiro';
  if (type === 'no_time') return 'Sem tempo';
  if (type === 'priority_changed') return 'Prioridade mudou';
  if (type === 'needs_split') return 'Precisa dividir';
  if (type === 'dependency') return 'Dependência';
  return 'Sem motivo informado';
}

export function DashboardView({ tasks }: DashboardViewProps) {
  const chartTheme = useChartTheme();

  const liveTasks = useMemo(
    () => tasks.filter(t => !t.deleted_at),
    [tasks]
  );

  const completedTasks = useMemo(
    () => liveTasks.filter(t => t.resolution_type === 'completed' && !!t.completed_at),
    [liveTasks]
  );

  const confirmedCompletedTasks = useMemo(
    () => completedTasks.filter(isConfirmedCompletion),
    [completedTasks]
  );

  const legacyCompletedTasks = useMemo(
    () => completedTasks.filter(isLegacyCompletion),
    [completedTasks]
  );

  const completedWithWeakTimestamp = useMemo(
    () => completedTasks.filter(t => !isConfirmedCompletion(t) && !isLegacyCompletion(t)),
    [completedTasks]
  );

  const closedWithoutExecutionTasks = useMemo(
    () => liveTasks.filter(isClosedWithoutExecution),
    [liveTasks]
  );

  const openTasks = useMemo(
    () => liveTasks.filter(isOpenTask),
    [liveTasks]
  );

  const waitingTasks = useMemo(
    () => openTasks.filter(t => !!t.blocker_type || (t.postponed_count ?? 0) > 0),
    [openTasks]
  );

  const executableOpenTasks = useMemo(
    () => openTasks.filter(t => !waitingTasks.includes(t)),
    [openTasks, waitingTasks]
  );

  // contexts pie
  const contextData = useMemo(() => {
    const counts: Record<string, number> = {};
    completedTasks.forEach(t => { counts[t.context] = (counts[t.context] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [completedTasks]);

  // estimated vs real
  const timeData = useMemo(() => completedTasks
    .filter(t => t.estimated_minutes && isTrustedActualMinutes(t))
    .slice(-15)
    .map(t => ({
      name: t.title.length > 14 ? t.title.slice(0, 14) + '…' : t.title,
      estimado: t.estimated_minutes,
      real: Math.round(t.actual_minutes || 0),
      estimativa: t.estimated_minutes_source ?? 'sem origem',
      origemReal: t.actual_minutes_source ?? 'sem origem',
    })),
  [completedTasks]);

  // peak hour
  const peakHourData = useMemo(() => {
    const hourCounts: Record<string, number> = {};
    for (let i = 6; i <= 23; i++) hourCounts[`${i}h`] = 0;
    confirmedCompletedTasks.forEach(t => {
      if (!t.completed_at) return;
      const hour = new Date(t.completed_at).getHours();
      const key = `${hour}h`;
      if (hourCounts[key] !== undefined) hourCounts[key]++;
    });
    return Object.entries(hourCounts).map(([hora, concluídas]) => ({ hora, concluídas }));
  }, [confirmedCompletedTasks]);

  // avg priority
  const avgPriority = useMemo(() => {
    if (completedTasks.length === 0) return '0';
    const sum = completedTasks.reduce((acc, t) => acc + t.priority, 0);
    return (sum / completedTasks.length).toFixed(1);
  }, [completedTasks]);

  // last 7 days
  const dailyData = useMemo(() => {
    const data: { dia: string; tarefas: number; key: string }[] = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      data.push({ dia: key.slice(0, 1).toUpperCase(), tarefas: 0, key });
    }
    confirmedCompletedTasks.forEach(t => {
      if (!t.completed_at) return;
      const d = new Date(t.completed_at);
      const diffDays = Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 6) {
        const k = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        const row = data.find(r => r.key === k);
        if (row) row.tarefas++;
      }
    });
    return data;
  }, [confirmedCompletedTasks]);

  const weekTotal = dailyData.reduce((a, r) => a + r.tarefas, 0);
  const todayCount = dailyData[dailyData.length - 1]?.tarefas ?? 0;

  const recentConfirmedContextData = useMemo(() => {
    const counts: Record<string, number> = {};
    const today = new Date();
    confirmedCompletedTasks.forEach(t => {
      if (!t.completed_at) return;
      const completedAt = new Date(t.completed_at);
      const diffDays = Math.floor((today.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0 && diffDays <= 6) counts[t.context] = (counts[t.context] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [confirmedCompletedTasks]);

  const closedCounts = useMemo(() => ({
    cancelled: closedWithoutExecutionTasks.filter(t => t.resolution_type === 'cancelled').length,
    delegated: closedWithoutExecutionTasks.filter(t => t.resolution_type === 'delegated').length,
    obsolete: closedWithoutExecutionTasks.filter(t => t.resolution_type === 'obsolete').length,
  }), [closedWithoutExecutionTasks]);

  const postponedOpenTasks = useMemo(
    () => openTasks.filter(t => (t.postponed_count ?? 0) > 0),
    [openTasks]
  );

  const postponedWithReason = postponedOpenTasks.filter(t => !!t.blocker_type).length;
  const postponedWithoutReason = postponedOpenTasks.length - postponedWithReason;

  const blockerCounts = useMemo(() => {
    const counts: Partial<Record<NonNullable<Task['blocker_type']>, number>> = {};
    waitingTasks.forEach((task) => {
      if (!task.blocker_type) return;
      counts[task.blocker_type] = (counts[task.blocker_type] ?? 0) + 1;
    });
    return Object.entries(counts).map(([type, value]) => ({ type: type as Task['blocker_type'], value }));
  }, [waitingTasks]);

  const trustedActualCount = completedTasks.filter(isTrustedActualMinutes).length;
  const lowConfidenceActualCount = completedTasks.filter(t => t.actual_minutes != null && t.actual_minutes_source === 'unknown').length;
  const actualWithoutSourceCount = completedTasks.filter(t => t.actual_minutes != null && !t.actual_minutes_source).length;

  const estimateSourceCounts = {
    manual: completedTasks.filter(t => t.estimated_minutes_source === 'manual').length,
    parser: completedTasks.filter(t => t.estimated_minutes_source === 'parser').length,
    ai: completedTasks.filter(t => t.estimated_minutes_source === 'ai').length,
    default_30: completedTasks.filter(t => t.estimated_minutes_source === 'default_30').length,
    unknown: completedTasks.filter(t => t.estimated_minutes != null && !t.estimated_minutes_source).length,
  };

  const confirmedShareText = completedTasks.length > 0
    ? `${confirmedCompletedTasks.length}/${completedTasks.length} conclusões com timestamp confirmado`
    : 'Nenhuma conclusão com timestamp próprio ainda';

  if (liveTasks.length === 0) {
    return (
      <EmptyState title="Sem dados ainda" hint="Capture ou conclua tarefas para ver a higiene da fila." />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top hero */}
      <div className="bg-surface border border-border rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[12px] font-bold uppercase tracking-[0.06em] text-ink-secondary">
              Esta semana
            </div>
            <div className="font-display text-[44px] leading-[1] tracking-[-0.04em] text-ink mt-1 tnum">
              {weekTotal}
              <span className="text-ink-secondary text-[22px] font-sans not-italic font-normal"> confirmadas</span>
            </div>
            <div className="mt-1.5 text-[11px] text-success font-bold inline-flex items-center gap-1">
              <ChevronUp size={11} strokeWidth={2.6} /> hoje: {todayCount}
            </div>
            <div className="mt-1 text-[11px] text-ink-secondary">
              Usa apenas conclusões confirmadas. Histórico aproximado fica separado.
            </div>
          </div>

          {/* donut */}
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center shrink-0"
            style={{
              background: recentConfirmedContextData.length > 0 && weekTotal > 0
                ? `conic-gradient(${recentConfirmedContextData.map((c, i) => {
                    const pct = (c.value / weekTotal) * 100;
                    const start = recentConfirmedContextData.slice(0, i).reduce((a, b) => a + (b.value / weekTotal) * 100, 0);
                    return `${CTX_COLORS[c.name as ContextType] || chartTheme.border} ${start}% ${start + pct}%`;
                  }).join(', ')})`
                : chartTheme.border,
            }}
          >
            <div
              className="w-[60px] h-[60px] rounded-full bg-surface flex flex-col items-center justify-center"
              style={{ boxShadow: `inset 0 0 0 1px ${chartTheme.border}` }}
            >
              <span className="font-display text-[20px] leading-[1] text-ink tnum">{weekTotal}</span>
              <span className="text-[11px] text-ink-secondary font-semibold mt-0.5">conf.</span>
            </div>
          </div>
        </div>

        {/* week bars */}
        <div className="h-20 mt-3 flex items-end gap-1.5">
          {dailyData.map((d, i) => {
            const max = Math.max(...dailyData.map(x => x.tarefas), 1);
            const h = (d.tarefas / max) * 100;
            const isToday = i === dailyData.length - 1;
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div
                  className="w-full rounded-md"
                  style={{
                    height: `${Math.max(h, 4)}%`,
                    background: isToday ? chartTheme.accent : chartTheme.surfaceSunken,
                    minHeight: 4,
                  }}
                />
                <span className={(isToday ? 'text-accent font-bold' : 'text-ink-secondary font-semibold') + ' text-[11px]'}>
                  {d.dia}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Concluídas confirmadas" value={confirmedCompletedTasks.length} sub="pós-saneamento" />
        <StatCard label="Histórico aproximado" value={legacyCompletedTasks.length} sub="legado, horário frágil" />
        <StatCard
          label="Abertas executáveis"
          value={executableOpenTasks.length}
          sub="sem resolução terminal nem bloqueio informado"
        />
        <StatCard
          label="Aguardando/bloqueadas"
          value={waitingTasks.length}
          sub={`${postponedWithoutReason} adiadas sem motivo informado`}
        />
        <StatCard label="Prioridade média" value={avgPriority} sub="das conclusões registradas" />
      </div>

      <SectionCard eyebrow="Fluxo" title="Concluídas e encerradas sem execução">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            <DataLine label="Concluídas confirmadas" value={confirmedCompletedTasks.length} detail="Contam como execução feita." />
            <DataLine label="Histórico aproximado" value={legacyCompletedTasks.length} detail="Conta agregada; horário não alimenta padrões." />
            <DataLine label="Conclusões com dado incompleto" value={completedWithWeakTimestamp.length} detail="Exigem cuidado até saneamento futuro." />
          </div>
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            <DataLine label="Canceladas" value={closedCounts.cancelled} detail="Encerradas sem execução." />
            <DataLine label="Delegadas" value={closedCounts.delegated} detail="Não contam como conclusão." />
            <DataLine label="Obsoletas" value={closedCounts.obsolete} detail="Preservadas para histórico." />
          </div>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Fila ativa" title="Abertas, bloqueadas e adiadas">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            <DataLine label="Abertas executáveis" value={executableOpenTasks.length} detail="Tarefas abertas sem motivo de bloqueio informado." />
            <DataLine label="Aguardando/bloqueadas" value={waitingTasks.length} detail="Inclui tarefas adiadas ou com motivo de bloqueio." />
            <DataLine label="Adiadas sem motivo informado" value={postponedWithoutReason} detail="Dívida de dado, não diagnóstico comportamental." />
            <DataLine label="Adiadas com motivo" value={postponedWithReason} detail="Motivo de bloqueio preenchido." />
          </div>
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            {blockerCounts.length === 0 ? (
              <div className="text-[12px] text-ink-secondary">Nenhum motivo de bloqueio informado em tarefas abertas.</div>
            ) : (
              blockerCounts.map((item) => (
                <DataLine
                  key={item.type ?? 'unknown'}
                  label={blockerLabel(item.type)}
                  value={item.value}
                />
              ))
            )}
          </div>
        </div>
      </SectionCard>

      {/* Contexts */}
      {contextData.length > 0 && (
        <SectionCard eyebrow="Por contexto" title="Conclusões por área">
          <div className="text-[12px] text-ink-secondary -mt-1 mb-3">
            Inclui histórico aproximado (anterior ao saneamento).
          </div>
          <div className="flex flex-wrap gap-2">
            {contextData
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((c) => {
                const pct = ((c.value / completedTasks.length) * 100).toFixed(0);
                return (
                  <div
                    key={c.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                    style={{ background: chartTheme.surfaceSunken }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: CTX_COLORS[c.name as ContextType] || chartTheme.border }} />
                    <span className="text-[11px] font-bold text-ink">{c.name}</span>
                    <span className="text-[12px] font-bold text-ink-secondary tnum">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      )}

      {/* Time est vs real */}
      {timeData.length > 0 && (
        <SectionCard eyebrow="Estimativa" title="Estimado vs. real">
          <div className="text-[12px] text-ink-secondary -mt-1 mb-3">
            O gráfico usa tempo real com origem conhecida. Itens `unknown` ficam fora e aparecem em qualidade do dado.
          </div>
          <div className="h-56 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.border} />
                <XAxis
                  dataKey="name"
                  stroke={chartTheme.inkTertiary}
                  tick={{ fontSize: 10, fill: chartTheme.inkSecondary }}
                  interval="preserveStartEnd"
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  stroke={chartTheme.inkTertiary}
                  tick={{ fontSize: 10, fill: chartTheme.inkSecondary }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ stroke: chartTheme.surfaceSunken }}
                  contentStyle={{
                    backgroundColor: chartTheme.surface,
                    border: `1px solid ${chartTheme.border}`,
                    borderRadius: 12,
                    color: chartTheme.inkSecondary,
                    fontSize: 12,
                  }}
                  itemStyle={{ color: chartTheme.inkSecondary }}
                  labelStyle={{ color: chartTheme.inkSecondary }}
                />
                <Legend wrapperStyle={{ color: chartTheme.inkSecondary, fontSize: 11 }} iconType="circle" />
                <Line type="monotone" dataKey="estimado" name="Estimado" stroke={chartTheme.inkTertiary} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="real" name="Real" stroke={chartTheme.accent} strokeWidth={3} activeDot={{ r: 5 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Peak hour */}
      <SectionCard eyebrow="Horário de pico" title="Maior conclusão confirmada">
        <div className="text-[12px] text-ink-secondary -mt-1 mb-3">
          Usa somente conclusões confirmadas; histórico anterior fica fora desta métrica.
        </div>
        <div className="h-48 -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakHourData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartTheme.border} />
              <XAxis
                dataKey="hora"
                stroke={chartTheme.inkTertiary}
                tick={{ fontSize: 10, fill: chartTheme.inkSecondary }}
                interval="preserveStartEnd"
                tickFormatter={(v) => v.replace('h', '')}
                axisLine={false} tickLine={false}
              />
              <YAxis
                stroke={chartTheme.inkTertiary}
                tick={{ fontSize: 10, fill: chartTheme.inkSecondary }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip
                cursor={{ fill: chartTheme.surfaceSunken }}
                contentStyle={{
                  backgroundColor: chartTheme.surface,
                  border: `1px solid ${chartTheme.border}`,
                  borderRadius: 12,
                  color: chartTheme.inkSecondary,
                  fontSize: 12,
                }}
                itemStyle={{ color: chartTheme.inkSecondary }}
                labelStyle={{ color: chartTheme.inkSecondary }}
              />
              <Bar dataKey="concluídas" name="Concluídas confirmadas" fill={chartTheme.accent} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      <SectionCard eyebrow="Qualidade do dado" title="Leitura confiável, sem score">
        <div className="text-[12px] text-ink-secondary -mt-1 mb-3">
          {confirmedShareText}. Estes sinais orientam a confiança das métricas, sem virar nota de produtividade.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            <DataLine label="Conclusões confirmadas" value={confirmedCompletedTasks.length} detail="Podem alimentar métricas de horário." />
            <DataLine label="Conclusões legadas aproximadas" value={legacyCompletedTasks.length} detail="Apenas contagem agregada rotulada." />
            <DataLine label="Tempo real com origem conhecida" value={trustedActualCount} detail="Timer, manual ou retroativo com origem marcada." />
            <DataLine label="Tempo real com baixa confiança" value={lowConfidenceActualCount + actualWithoutSourceCount} detail="Origem desconhecida ou ausente." />
          </div>
          <div className="rounded-xl bg-surface-sunken px-3 py-2.5">
            <DataLine label="Estimativas manuais" value={estimateSourceCounts.manual} />
            <DataLine label="Estimativas do parser" value={estimateSourceCounts.parser} />
            <DataLine label="Estimativas por IA" value={estimateSourceCounts.ai} detail="Marcadas como IA, sem precisão forte." />
            <DataLine label="Estimativas default" value={estimateSourceCounts.default_30} detail="Fallback operacional de 30 minutos." />
            <DataLine label="Estimativas sem origem" value={estimateSourceCounts.unknown} detail="Legado ou dado incompleto." />
          </div>
        </div>
      </SectionCard>

    </div>
  );
}
