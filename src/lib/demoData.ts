import type { User, Session } from '@supabase/supabase-js';
import type { Task } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useTaskStore } from '../stores/taskStore';

export const DEMO_USER_ID = 'demo-recruiter-user';

export const MOCK_DEMO_TASKS: Task[] = [
  {
    id: 'demo-task-1',
    user_id: DEMO_USER_ID,
    title: 'Mapear fluxo de aprovação e governança de processos',
    description: 'Documentar matriz RACI e critérios de corte por gates para o novo ciclo operacional.',
    context: 'PM',
    priority: 3,
    energy: 2,
    status: 'todo',
    due_at: new Date(Date.now() + 4 * 3600 * 1000).toISOString(),
    deleted_at: null,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    estimated_minutes: 45,
    estimated_minutes_source: 'manual',
    checklist: [
      { id: 'c1', text: 'Desenhar diagrama BPMN do processo', done: true, done_at: new Date().toISOString() },
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
    due_at: new Date(Date.now() + 8 * 3600 * 1000).toISOString(),
    deleted_at: null,
    created_at: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    estimated_minutes: 60,
    estimated_minutes_source: 'manual',
    started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    checklist: [
      { id: 'c4', text: 'Gerar embeddings de 50 tarefas de teste', done: true, done_at: new Date().toISOString() },
      { id: 'c5', text: 'Indexar via HNSW com cosine distance', done: true, done_at: new Date().toISOString() },
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
    due_at: new Date(Date.now() + 2 * 3600 * 1000).toISOString(),
    deleted_at: null,
    created_at: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
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
    due_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    deleted_at: null,
    created_at: new Date(Date.now() - 72 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    completed_at: new Date(Date.now() - 1 * 3600 * 1000).toISOString(),
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
    due_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    deleted_at: null,
    created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
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
    due_at: new Date(Date.now() + 18 * 3600 * 1000).toISOString(),
    deleted_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    estimated_minutes: 40,
  }
];

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

  // Injeta tarefas fictícias
  useTaskStore.setState({
    tasks: [...MOCK_DEMO_TASKS],
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
