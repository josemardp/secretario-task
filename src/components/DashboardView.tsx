import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from 'recharts';
import { ChevronUp } from 'lucide-react';
import type { Task, ContextType } from '../types';

interface DashboardViewProps {
  tasks: Task[];
}

const CTX_COLORS: Record<ContextType, string> = {
  PM:      '#3F58D9',
  Esdra:   '#7C3AED',
  Pessoal: '#C88E2A',
  Familia: '#1E8590',
  CCB:     '#5C8A2C',
  Estudo:  '#C53580',
  Saude:   '#2E8B4F',
};

const INK         = '#1A1814';
const INK_3       = '#A09B91';
const PAPER2      = '#EFEEE8';
const PAPER3      = '#E5E3DB';
const LINE        = '#E5E3DB';

function StatCard({ label, value, sub, dark = false, big = false }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode;
  dark?: boolean; big?: boolean;
}) {
  return (
    <div
      className={
        'rounded-2xl px-4 py-3.5 border ' +
        (dark
          ? 'bg-ink text-white border-ink'
          : 'bg-paper border-line')
      }
    >
      <div className={'text-[10px] font-extrabold uppercase tracking-[0.06em] ' + (dark ? 'text-amber-soft' : 'text-ink-3')}>
        {label}
      </div>
      <div
        className={
          'mt-0.5 tnum ' +
          (big
            ? 'font-display text-[40px] leading-[1] tracking-[-0.04em] ' + (dark ? 'text-white' : 'text-ink')
            : 'font-extrabold text-[24px] leading-[1.05] tracking-[-0.02em] ' + (dark ? 'text-white' : 'text-ink'))
        }
      >
        {value}
      </div>
      {sub && (
        <div className={'text-[11px] mt-1 ' + (dark ? 'text-white/60' : 'text-ink-2')}>
          {sub}
        </div>
      )}
    </div>
  );
}

function SectionCard({ title, eyebrow, children }: { title?: string; eyebrow?: string; children: React.ReactNode }) {
  return (
    <div className="bg-paper border border-line rounded-2xl p-4">
      {eyebrow && (
        <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-3 mb-1">
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

export function DashboardView({ tasks }: DashboardViewProps) {
  const doneTasks = useMemo(
    () => tasks.filter(t => t.status === 'done' && !t.deleted_at),
    [tasks]
  );

  // contexts pie
  const contextData = useMemo(() => {
    const counts: Record<string, number> = {};
    doneTasks.forEach(t => { counts[t.context] = (counts[t.context] || 0) + 1; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [doneTasks]);

  // estimated vs real
  const timeData = useMemo(() => doneTasks
    .filter(t => t.estimated_minutes && t.actual_minutes)
    .slice(-15)
    .map(t => ({
      name: t.title.length > 14 ? t.title.slice(0, 14) + '…' : t.title,
      estimado: t.estimated_minutes,
      real: Math.round(t.actual_minutes || 0),
    })),
  [doneTasks]);

  // peak hour
  const peakHourData = useMemo(() => {
    const hourCounts: Record<string, number> = {};
    for (let i = 6; i <= 23; i++) hourCounts[`${i}h`] = 0;
    doneTasks.forEach(t => {
      if (t.updated_at) {
        const hour = new Date(t.updated_at).getHours();
        const key = `${hour}h`;
        if (hourCounts[key] !== undefined) hourCounts[key]++;
      }
    });
    return Object.entries(hourCounts).map(([hora, concluídas]) => ({ hora, concluídas }));
  }, [doneTasks]);

  // avg priority
  const avgPriority = useMemo(() => {
    if (doneTasks.length === 0) return '0';
    const sum = doneTasks.reduce((acc, t) => acc + t.priority, 0);
    return (sum / doneTasks.length).toFixed(1);
  }, [doneTasks]);

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
    doneTasks.forEach(t => {
      if (!t.updated_at) return;
      const d = new Date(t.updated_at);
      const diffDays = Math.ceil(Math.abs(today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays <= 7) {
        const k = d.toLocaleDateString('pt-BR', { weekday: 'short' });
        const row = data.find(r => r.key === k);
        if (row) row.tarefas++;
      }
    });
    return data;
  }, [doneTasks]);

  const weekTotal = dailyData.reduce((a, r) => a + r.tarefas, 0);
  const todayCount = dailyData[dailyData.length - 1]?.tarefas ?? 0;

  if (doneTasks.length === 0) {
    return (
      <div className="bg-paper border border-line rounded-2xl px-6 py-12 text-center">
        <div className="font-display text-[28px] tracking-[-0.02em] text-ink">
          Sem dados ainda.
        </div>
        <p className="text-[13px] text-ink-2 mt-2 leading-snug max-w-xs mx-auto">
          Conclua algumas tarefas no quadro para a inteligência gerar suas
          estatísticas.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Top hero */}
      <div className="bg-paper border border-line rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-extrabold uppercase tracking-[0.06em] text-ink-3">
              Esta semana
            </div>
            <div className="font-display text-[44px] leading-[1] tracking-[-0.04em] text-ink mt-1 tnum">
              {weekTotal}
              <span className="text-ink-3 text-[22px] font-sans not-italic font-normal"> concluídas</span>
            </div>
            <div className="mt-1.5 text-[11px] text-success font-bold inline-flex items-center gap-1">
              <ChevronUp size={11} strokeWidth={2.6} /> hoje: {todayCount}
            </div>
          </div>

          {/* donut */}
          <div
            className="w-[88px] h-[88px] rounded-full flex items-center justify-center shrink-0"
            style={{
              background: contextData.length > 0
                ? `conic-gradient(${contextData.map((c, i) => {
                    const pct = (c.value / weekTotal) * 100;
                    const start = contextData.slice(0, i).reduce((a, b) => a + (b.value / weekTotal) * 100, 0);
                    return `${CTX_COLORS[c.name as ContextType] || INK_3} ${start}% ${start + pct}%`;
                  }).join(', ')})`
                : PAPER3,
            }}
          >
            <div className="w-[60px] h-[60px] rounded-full bg-paper flex flex-col items-center justify-center" style={{ boxShadow: 'inset 0 0 0 1px ' + LINE }}>
              <span className="font-display text-[20px] leading-[1] text-ink tnum">{weekTotal}</span>
              <span className="text-[9px] text-ink-3 font-semibold mt-0.5">conc.</span>
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
                    background: isToday ? INK : PAPER3,
                    minHeight: 4,
                  }}
                />
                <span className={(isToday ? 'text-ink font-extrabold' : 'text-ink-3 font-semibold') + ' text-[9px]'}>
                  {d.dia}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mini cards */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Total" value={doneTasks.length} sub="concluídas no histórico" />
        <StatCard
          dark
          label="Streak"
          value={<>{todayCount}<span className="text-white/60 font-normal text-[14px]"> hoje</span></>}
          sub={`média semana ${(weekTotal / 7).toFixed(1)}/dia`}
        />
        <StatCard label="Prioridade média" value={avgPriority} sub="das concluídas" />
        <StatCard
          label="Adiadas"
          value={tasks.filter(t => (t.postponed_count ?? 0) > 0 && !t.deleted_at).length}
          sub="tarefas com adiamento"
        />
      </div>

      {/* Contexts */}
      {contextData.length > 0 && (
        <SectionCard eyebrow="Por contexto">
          <div className="flex flex-wrap gap-2">
            {contextData
              .slice()
              .sort((a, b) => b.value - a.value)
              .map((c) => {
                const pct = ((c.value / weekTotal) * 100).toFixed(0);
                return (
                  <div
                    key={c.name}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                    style={{ background: PAPER2 }}
                  >
                    <span className="w-2 h-2 rounded-full" style={{ background: CTX_COLORS[c.name as ContextType] || INK_3 }} />
                    <span className="text-[11px] font-bold text-ink">{c.name}</span>
                    <span className="text-[11px] font-extrabold text-ink-2 tnum">{pct}%</span>
                  </div>
                );
              })}
          </div>
        </SectionCard>
      )}

      {/* Time est vs real */}
      {timeData.length > 0 && (
        <SectionCard eyebrow="Estimativa da IA vs tempo real" title="Você acerta bem?">
          <div className="h-56 -ml-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={LINE} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: INK_3 }} interval="preserveStartEnd" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: INK_3 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={{ background: 'white', border: `1px solid ${LINE}`, borderRadius: 12, fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                <Line type="monotone" dataKey="estimado" name="Estimado (IA)" stroke={INK_3} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="real"     name="Real"          stroke={INK}    strokeWidth={3} activeDot={{ r: 5 }} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Peak hour */}
      <SectionCard eyebrow="Horário de pico" title="Quando você flui?">
        <div className="h-48 -ml-3">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={peakHourData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={LINE} />
              <XAxis
                dataKey="hora"
                tick={{ fontSize: 10, fill: INK_3 }}
                interval="preserveStartEnd"
                tickFormatter={(v) => v.replace('h', '')}
                axisLine={false} tickLine={false}
              />
              <YAxis tick={{ fontSize: 10, fill: INK_3 }} axisLine={false} tickLine={false} width={24} />
              <Tooltip cursor={{ fill: PAPER2 }} contentStyle={{ background: 'white', border: `1px solid ${LINE}`, borderRadius: 12, fontSize: 12 }} />
              <Bar dataKey="concluídas" name="Tarefas concluídas" fill={INK} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </SectionCard>

      {/* Pie (compact) */}
      {contextData.length > 0 && (
        <SectionCard eyebrow="Distribuição" title="Onde gastei energia">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contextData}
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="white"
                  strokeWidth={2}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={{ stroke: INK_3 }}
                  style={{ fontSize: 11, fontWeight: 700 }}
                >
                  {contextData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CTX_COLORS[entry.name as ContextType] || INK_3} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'white', border: `1px solid ${LINE}`, borderRadius: 12, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
