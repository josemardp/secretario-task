import type { User, Session } from '@supabase/supabase-js';
import type { Task } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';

export const DEMO_USER_ID = 'demo-recruiter-user';

export function getMockDemoTasks(): Task[] {
  const now = new Date();
  const todayAt = (h: number, m: number = 0) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };
  const daysFromNow = (days: number, h: number = 10, m: number = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + days);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: 'demo-task-1',
      user_id: DEMO_USER_ID,
      title: 'Mapear fluxo de aprovação e governança de processos',
      description: 'Documentar matriz RACI e critérios de corte por gates para o novo ciclo operacional.',
      context: 'PM',
      priority: 3,
      energy: 2,
      status: 'todo',
      due_at: todayAt(14, 0),
      deleted_at: null,
      created_at: daysFromNow(-1, 9, 0),
      updated_at: now.toISOString(),
      estimated_minutes: 45,
      estimated_minutes_source: 'manual',
      checklist: [
        { id: 'c1', text: 'Desenhar diagrama BPMN do processo', done: true, done_at: now.toISOString() },
        { id: 'c2', text: 'Validar limites de alçada com gestores', done: false, done_at: null },
        { id: 'c3', text: 'Publicar matriz de responsabilidades', done: false, done_at: null },
      ],
    },
    {
      id: 'demo-task-2',
      user_id: DEMO_USER_ID,
      title: 'Benchmarking de embeddings vetoriais com pgvector',
      description: 'Comparar precisão semântica de text-embedding-3-small versus busca textual BM25 no PostgreSQL.',
      context: 'Estudo',
      priority: 3,
      energy: 3,
      status: 'doing',
      due_at: todayAt(16, 30),
      deleted_at: null,
      created_at: daysFromNow(-2, 10, 0),
      updated_at: now.toISOString(),
      estimated_minutes: 60,
      estimated_minutes_source: 'manual',
      started_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
      checklist: [
        { id: 'c4', text: 'Gerar embeddings de 50 tarefas de teste', done: true, done_at: now.toISOString() },
        { id: 'c5', text: 'Indexar via HNSW com cosine distance', done: true, done_at: now.toISOString() },
        { id: 'c6', text: 'Medir latência e relevância de top-5 resultados', done: false, done_at: null },
      ],
    },
    {
      id: 'demo-task-3',
      user_id: DEMO_USER_ID,
      title: 'Reunião de alinhamento de roadmap e backlog',
      description: 'Priorizar épicos do próximo trimestre com base em impacto e esforço estimado.',
      context: 'PM',
      priority: 2,
      energy: 1,
      status: 'todo',
      due_at: todayAt(11, 0),
      deleted_at: null,
      created_at: daysFromNow(-1, 14, 0),
      updated_at: now.toISOString(),
      estimated_minutes: 30,
      estimated_minutes_source: 'parser',
    },
    {
      id: 'demo-task-4',
      user_id: DEMO_USER_ID,
      title: 'Auditoria de segurança e revisão de RLS no Supabase',
      description: 'Garantir que todas as tabelas possuem políticas de isolamento por auth.uid() e sem vazamento em roles públicas.',
      context: 'Estudo',
      priority: 3,
      energy: 2,
      status: 'done',
      due_at: todayAt(9, 30),
      deleted_at: null,
      created_at: daysFromNow(-3, 8, 0),
      updated_at: now.toISOString(),
      completed_at: new Date(now.getTime() - 3600 * 1000).toISOString(),
      completed_at_confidence: 'confirmed',
      resolution_type: 'completed',
      estimated_minutes: 40,
      actual_minutes: 35,
      actual_minutes_source: 'timer',
    },
    {
      id: 'demo-task-5',
      user_id: DEMO_USER_ID,
      title: 'Revisar conciliação e indicadores mensais',
      description: 'Conferir extratos, categorização de lançamentos e cálculo de margem operacional.',
      context: 'Pessoal',
      priority: 2,
      energy: 2,
      status: 'todo',
      due_at: daysFromNow(1, 10, 0),
      deleted_at: null,
      created_at: daysFromNow(-1, 11, 0),
      updated_at: now.toISOString(),
      estimated_minutes: 25,
    },
    {
      id: 'demo-task-6',
      user_id: DEMO_USER_ID,
      title: 'Treino cardiovascular e alongamento',
      description: 'Sessão matinal de 40 minutos para manutenção de rotina de saúde e bem-estar.',
      context: 'Saude',
      priority: 1,
      energy: 2,
      status: 'todo',
      due_at: daysFromNow(2, 8, 0),
      deleted_at: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      estimated_minutes: 40,
    },
  ];
}

export const MOCK_DEMO_TASKS: Task[] = getMockDemoTasks();

export function isDemoMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('secretario_demo_mode') === 'true';
}

export function activateDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('secretario_demo_mode', 'true');
  
  // Atualiza auth store com sessão demo fictícia
  useAuthStore.getState().setUser({
    id: DEMO_USER_ID,
    email: 'recrutador@portfolio-demo.local',
    app_metadata: {},
    user_metadata: { name: 'Recrutador (Modo Demo)' },
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User);

  useAuthStore.getState().setSession({
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 3600,
    token_type: 'bearer',
    user: {
      id: DEMO_USER_ID,
      email: 'recrutador@portfolio-demo.local',
      app_metadata: {},
      user_metadata: { name: 'Recrutador (Modo Demo)' },
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    },
  } as unknown as Session);

  useAuthStore.getState().setIsLoading(false);

  // Injeta tarefas fictícias dinâmicas
  useTaskStore.setState({
    tasks: getMockDemoTasks(),
    mutations: [],
  });
}

export function exitDemoMode(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('secretario_demo_mode');
  useAuthStore.getState().setUser(null);
  useAuthStore.getState().setSession(null);
  useTaskStore.setState({ tasks: [], mutations: [] });
}
