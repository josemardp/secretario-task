import { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import type { Task } from '../types';

interface DashboardViewProps {
  tasks: Task[];
}

const COLORS = ['#4f46e5', '#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];

export function DashboardView({ tasks }: DashboardViewProps) {
  const doneTasks = useMemo(() => tasks.filter(t => t.status === 'done' && !t.deleted_at), [tasks]);

  // 1. Pizza de Contextos
  const contextData = useMemo(() => {
    const counts: Record<string, number> = {};
    doneTasks.forEach(t => {
      counts[t.context] = (counts[t.context] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [doneTasks]);

  // 2. Estimado vs Real (Últimas 10 tarefas que têm ambos)
  const timeData = useMemo(() => {
    return doneTasks
      .filter(t => t.estimated_minutes && t.actual_minutes)
      .slice(-15)
      .map(t => ({
        name: t.title.substring(0, 15) + '...',
        estimado: t.estimated_minutes,
        real: Math.round(t.actual_minutes || 0)
      }));
  }, [doneTasks]);

  // 3. Pico de Produtividade (Horário de conclusão)
  const peakHourData = useMemo(() => {
    const hourCounts: Record<string, number> = {};
    for (let i = 6; i <= 23; i++) hourCounts[`${i}h`] = 0; // Preencher de 6h as 23h

    doneTasks.forEach(t => {
      if (t.completed_at) {
        const hour = new Date(t.completed_at).getHours();
        const key = `${hour}h`;
        if (hourCounts[key] !== undefined) {
          hourCounts[key]++;
        }
      }
    });
    return Object.entries(hourCounts).map(([hora, concluídas]) => ({ hora, concluídas }));
  }, [doneTasks]);

  // 4. Média de Prioridade Real
  const avgPriority = useMemo(() => {
    if (doneTasks.length === 0) return 0;
    const sum = doneTasks.reduce((acc, t) => acc + t.priority, 0);
    return (sum / doneTasks.length).toFixed(1);
  }, [doneTasks]);

  // 5. Placar Diário da Semana (Últimos 7 dias)
  const dailyData = useMemo(() => {
    const data: Record<string, number> = {};
    const today = new Date();
    
    // Preparar os últimos 7 dias
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
      data[dateStr] = 0;
    }

    doneTasks.forEach(t => {
      if (t.completed_at) {
        const d = new Date(t.completed_at);
        // Só conta se foi nos últimos 7 dias
        const diffTime = Math.abs(today.getTime() - d.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (diffDays <= 7) {
          const dateStr = d.toLocaleDateString('pt-BR', { weekday: 'short' });
          if (data[dateStr] !== undefined) {
            data[dateStr]++;
          }
        }
      }
    });
    return Object.entries(data).map(([dia, tarefas]) => ({ dia, tarefas }));
  }, [doneTasks]);

  if (doneTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500">
        <span className="text-4xl mb-4">📊</span>
        <h3 className="text-lg font-medium">Poucos Dados Disponíveis</h3>
        <p>Conclua algumas tarefas no quadro para a inteligência gerar as suas estatísticas!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card Resumo */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Concluídas</span>
          <span className="text-5xl font-bold text-indigo-600">{doneTasks.length}</span>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100 flex flex-col items-center justify-center">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-2">Média de Prioridade</span>
          <span className="text-5xl font-bold text-pink-600">{avgPriority}</span>
          <span className="text-xs text-gray-400 mt-1">/ 10</span>
        </div>

        <div className="col-span-1 md:col-span-2 bg-white p-6 rounded-lg shadow border border-gray-100">
          <span className="text-gray-500 text-sm font-semibold uppercase tracking-wider mb-4 block">Volume por Dia (Últimos 7 dias)</span>
          <div className="h-24 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyData}>
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="tarefas" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Estimado vs Real */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-gray-700 font-semibold mb-6 flex items-center gap-2">
            <span>⏱️</span> Estimativa da IA vs Tempo Real (min)
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" tick={{fontSize: 10}} interval="preserveStartEnd" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="estimado" name="Tempo Estimado (IA)" stroke="#9ca3af" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="real" name="Tempo Real" stroke="#ec4899" strokeWidth={3} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pico de Produtividade */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-gray-700 font-semibold mb-6 flex items-center gap-2">
            <span>⚡</span> Horário de Pico de Foco
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={peakHourData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="hora" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip cursor={{fill: '#fdf2f8'}} />
                <Bar dataKey="concluídas" name="Tarefas Finalizadas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Pizza de Contextos */}
        <div className="bg-white p-6 rounded-lg shadow border border-gray-100">
          <h3 className="text-gray-700 font-semibold mb-2 flex items-center gap-2">
            <span>🧩</span> Distribuição de Contextos
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={contextData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {contextData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
