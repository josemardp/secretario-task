import { supabase } from './supabase';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { generateEmbedding } from './ai';
import type { Task } from '../types';

let isSyncing = false;

function replaceLocalTask(task: Task) {
  const { tasks, setTasks } = useTaskStore.getState();
  setTasks(tasks.map((local) => local.id === task.id ? task : local));
}

function toTimestampOrZero(iso: string | null | undefined): number {
  if (!iso) return 0;

  const timestamp = new Date(iso).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function stripReadonlyTaskFields<T extends Record<string, unknown>>(payload: T): Omit<T, 'created_at' | 'updated_at'> {
  const { created_at: _createdAt, updated_at: _updatedAt, ...rest } = payload;
  return rest;
}

export async function fetchRemoteTasks() {
  const { data: remoteTasks, error } = await supabase
    .from('tasks')
    .select('*'); // fetch tombstones too

  if (error) throw error;
  if (!remoteTasks) return;

  const { tasks: localTasks, setTasks } = useTaskStore.getState();

  const taskMap = new Map<string, Task>();

  localTasks.forEach((t) => taskMap.set(t.id, t));

  remoteTasks.forEach((remote) => {
    const local = taskMap.get(remote.id);
    if (!local || toTimestampOrZero(remote.updated_at) >= toTimestampOrZero(local.updated_at)) {
      taskMap.set(remote.id, remote as Task);
    }
  });

  setTasks(Array.from(taskMap.values()).filter((t) => !t.deleted_at));
}

export async function fetchApiKeyFromCloud(): Promise<string | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('openai_api_key')
    .eq('id', sessionData.session.user.id)
    .maybeSingle();

  if (error) throw error;
  const profile = data as { openai_api_key?: string | null } | null;
  return profile?.openai_api_key ?? null;
}

export async function saveApiKeyToCloud(apiKey: string | null): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { error } = await supabase.from('profiles').upsert({
    id: sessionData.session.user.id,
    openai_api_key: apiKey,
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function processSyncQueue() {
  if (isSyncing) return;
  if (!navigator.onLine) return;

  isSyncing = true;

  try {
    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) return;

    const userId = sessionData.session.user.id;
    const store = useTaskStore.getState();
    const pendingMutations = store.mutations;

    if (pendingMutations.length === 0) return;

    for (const mutation of pendingMutations) {
      try {
        if (mutation.entity === 'task') {
          const rawPayload = { ...(mutation.payload as Record<string, unknown>) };
          const payloadToSync: Record<string, unknown> = mutation.operation === 'insert'
            ? rawPayload
            : stripReadonlyTaskFields(rawPayload);

          const apiKey = useContextStore.getState().aiApiKey;
          if (apiKey && (mutation.operation === 'insert' || mutation.operation === 'update')) {
            const taskData = mutation.payload as Partial<Task>;
            const textToEmbed = `${taskData.title || ''} ${taskData.description || ''}`.trim();
            if (textToEmbed) {
              try {
                const embedding = await generateEmbedding(textToEmbed, apiKey);
                payloadToSync.embedding = embedding;
              } catch (embedErr) {
                console.warn('Falha nao-critica ao gerar embedding:', embedErr);
              }
            }
          }

          if (mutation.operation === 'insert') {
            const { data, error } = await supabase.from('tasks').insert({
              ...payloadToSync,
              user_id: userId,
            }).select('*').single();
            if (error) throw error;
            if (data) replaceLocalTask(data as Task);
          } else if (mutation.operation === 'update') {
            let query = supabase.from('tasks')
              .update(payloadToSync)
              .eq('id', mutation.entityId)
              .eq('user_id', userId);

            if (mutation.baseUpdatedAt) {
              query = query.lte('updated_at', mutation.baseUpdatedAt);
            }

            const { data, error } = await query
              .select('*')
              .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error(`Task ${mutation.entityId} nao foi atualizada - zero rows`);
            replaceLocalTask(data as Task);
          } else if (mutation.operation === 'delete') {
            const { data, error } = await supabase.from('tasks')
              .update(payloadToSync)
              .eq('id', mutation.entityId)
              .eq('user_id', userId)
              .select('*')
              .maybeSingle();

            if (error) throw error;
            if (!data) throw new Error(`Task ${mutation.entityId} nao foi deletada - zero rows`);
            replaceLocalTask(data as Task);
          }
        } else if (mutation.entity === 'task_event') {
          if (mutation.operation === 'insert') {
            const { error } = await supabase.from('task_events').insert({
              ...(mutation.payload as Record<string, unknown>),
              user_id: userId,
            });
            if (error) throw error;
          }
        }

        store.removeMutation(mutation.id);

        void supabase.from('sync_log').insert({
          user_id: userId,
          entity_type: mutation.entity,
          entity_id: mutation.entityId,
          operation: mutation.operation,
          status: 'synced',
          synced_at: new Date().toISOString(),
        }).then(() => {}, () => {});
      } catch (err: unknown) {
        console.error(`Mutation failed: ${mutation.id}`, err);

        const newRetryCount = mutation.retryCount + 1;
        store.updateMutation(mutation.id, { retryCount: newRetryCount });
        const message = err instanceof Error ? err.message : 'Unknown error';

        try {
          await supabase.from('sync_log').insert({
            user_id: userId,
            entity_type: mutation.entity,
            entity_id: mutation.entityId,
            operation: mutation.operation,
            status: 'failed',
            retry_count: newRetryCount,
            last_error: message,
          });
        } catch (logErr) {
          console.error('Failed to log sync failure', logErr);
        }
      }
    }
  } finally {
    isSyncing = false;
  }
}
