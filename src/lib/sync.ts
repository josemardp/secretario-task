import { supabase } from './supabase';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { generateEmbedding } from './ai';
import type { Task } from '../types';

export async function fetchRemoteTasks() {
  if (!navigator.onLine) return;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { data: remoteTasks, error } = await supabase
    .from('tasks')
    .select('*')
    .is('deleted_at', null);

  if (error || !remoteTasks) {
    console.error('Failed to fetch remote tasks', error);
    return;
  }

  const { tasks: localTasks, mutations, setTasks } = useTaskStore.getState();

  // LWW approach: Build a map of the most recent version of each task.
  const taskMap = new Map<string, Task>();

  // 1. Initialize map with local tasks
  localTasks.forEach(t => taskMap.set(t.id, t));

  // 2. Override with remote tasks if remote is newer
  remoteTasks.forEach((remote: any) => {
    const local = taskMap.get(remote.id);
    if (!local) {
      taskMap.set(remote.id, remote as Task);
    } else {
      const localTime = new Date(local.updated_at).getTime();
      const remoteTime = new Date(remote.updated_at).getTime();
      if (remoteTime > localTime) {
        taskMap.set(remote.id, remote as Task);
      }
    }
  });

  // 3. Re-apply any local pending mutations so they are not lost before sync
  mutations.forEach(m => {
    if (m.entity === 'task') {
      if (m.operation === 'insert' || m.operation === 'update') {
        const existing = taskMap.get(m.entityId);
        taskMap.set(m.entityId, { ...(existing as Task), ...(m.payload as Partial<Task>) });
      } else if (m.operation === 'delete') {
        const existing = taskMap.get(m.entityId);
        if (existing) {
          taskMap.set(m.entityId, { ...existing, deleted_at: (m.payload as any).deleted_at });
        }
      }
    }
  });

  // Keep only non-deleted tasks in the store
  const finalTasks = Array.from(taskMap.values()).filter(t => !t.deleted_at);
  setTasks(finalTasks);
}

export async function fetchApiKeyFromCloud(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;
  const { data } = await supabase
    .from('profiles')
    .select('openai_api_key')
    .eq('id', sessionData.session.user.id)
    .single();
  return (data as any)?.openai_api_key ?? null;
}

export async function saveApiKeyToCloud(apiKey: string | null): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;
  await supabase.from('profiles').upsert({
    id: sessionData.session.user.id,
    openai_api_key: apiKey,
    updated_at: new Date().toISOString()
  });
}

export async function processSyncQueue() {
  if (!navigator.onLine) return;

  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const userId = sessionData.session.user.id;
  const store = useTaskStore.getState();
  const pendingMutations = store.mutations;

  if (pendingMutations.length === 0) return;

  for (const mutation of pendingMutations) {
    try {
      if (mutation.entity === 'task') {
        let payloadToSync = { ...mutation.payload } as any;

        // Gerar embedding se a chave da API estiver presente e houver texto
        const apiKey = useContextStore.getState().aiApiKey;
        if (apiKey && (mutation.operation === 'insert' || mutation.operation === 'update')) {
          const taskData = mutation.payload as Partial<Task>;
          const textToEmbed = `${taskData.title || ''} ${taskData.description || ''}`.trim();
          if (textToEmbed) {
            try {
              const embedding = await generateEmbedding(textToEmbed, apiKey);
              payloadToSync.embedding = embedding;
            } catch (embedErr) {
              console.warn('Falha não-crítica ao gerar embedding:', embedErr);
            }
          }
        }

        if (mutation.operation === 'insert') {
          const { error } = await supabase.from('tasks').insert({
            ...payloadToSync,
            user_id: userId
          });
          if (error) throw error;
        } else if (mutation.operation === 'update' || mutation.operation === 'delete') {
          const { error } = await supabase.from('tasks')
            .update(payloadToSync)
            .eq('id', mutation.entityId)
            .eq('user_id', userId);
          if (error) throw error;
        }
      } else if (mutation.entity === 'task_event') {
        if (mutation.operation === 'insert') {
          const { error } = await supabase.from('task_events').insert({
            ...(mutation.payload as any),
            user_id: userId
          });
          if (error) throw error;
        }
      }

      // Remove da fila imediatamente após sucesso no Supabase
      store.removeMutation(mutation.id);

      // Log de auditoria — não-bloqueante (falha aqui não desfaz o sync)
      supabase.from('sync_log').insert({
        user_id: userId,
        entity_type: mutation.entity,
        entity_id: mutation.entityId,
        operation: mutation.operation,
        status: 'synced',
        synced_at: new Date().toISOString()
      }).catch(() => {});

    } catch (err: any) {
      console.error(`Mutation failed: ${mutation.id}`, err);
      
      const newRetryCount = mutation.retryCount + 1;
      store.updateMutation(mutation.id, { retryCount: newRetryCount });

      // Log failure in sync_log (we can still try to log the failure)
      await supabase.from('sync_log').insert({
        user_id: userId,
        entity_type: mutation.entity,
        entity_id: mutation.entityId,
        operation: mutation.operation,
        status: 'failed',
        retry_count: newRetryCount,
        last_error: err?.message || 'Unknown error'
      });

      // Simple backoff / ignore logic for MVP: just keep trying next sync
    }
  }
}
