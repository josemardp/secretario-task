import { supabase } from './supabase';
import { useTaskStore } from '../stores/taskStore';
import { useContextStore } from '../stores/contextStore';
import { generateEmbedding } from './ai';
import type { Task, ContextType } from '../types';

// ─── Flags de lock ────────────────────────────────────────────────
// Bug 2: fetchRemoteTasks precisava de guard análogo ao isSyncing para
// evitar merges paralelos que sobrescrevem o resultado um do outro.
let isSyncing = false;
let isFetchingRemote = false;

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
  // Bug 2: guard para evitar merges paralelos.
  // Se já há um fetch em andamento, retorna early sem fazer nada.
  if (isFetchingRemote) return;
  isFetchingRemote = true;

  try {
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
  } finally {
    isFetchingRemote = false;
  }
}

export async function fetchProfileFromCloud(): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { data, error } = await supabase
    .from('profiles')
    .select('openai_api_key, current_energy, active_context, energy_updated_at')
    .eq('id', sessionData.session.user.id)
    .maybeSingle();

  if (error) throw error;

  const profile = data as {
    openai_api_key?: string | null;
    current_energy?: number | null;
    active_context?: string | null;
    energy_updated_at?: string | null;
  } | null;

  if (!profile) return;

  useContextStore.getState().setAiApiKey(profile.openai_api_key ?? null);

  // LWW: only overwrite local energy/context if the remote timestamp is strictly newer
  const contextStore = useContextStore.getState();
  const remoteEnergyTs = toTimestampOrZero(profile.energy_updated_at);
  const localEnergyTs  = toTimestampOrZero(contextStore.energyUpdatedAt);

  if (remoteEnergyTs > localEnergyTs && profile.current_energy != null) {
    contextStore.setEnergyFromRemote(
      profile.current_energy,
      (profile.active_context as ContextType) ?? contextStore.activeContext,
      profile.energy_updated_at!
    );
  }
}

export async function pushEnergyToCloud(energy: number, context: string, updatedAt: string): Promise<void> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return;

  const { error } = await supabase.from('profiles').upsert({
    id: sessionData.session.user.id,
    current_energy: energy,
    active_context: context,
    energy_updated_at: updatedAt,
  }, { onConflict: 'id' });

  if (error) throw error;
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

          // Bug 4: stripReadonlyTaskFields agora é aplicado também no INSERT,
          // removendo created_at/updated_at do payload para que o trigger do
          // banco (BEFORE INSERT) gere os timestamps corretos pelo servidor.
          // Antes, apenas o bloco de update chamava stripReadonlyTaskFields.
          const payloadToSync: Record<string, unknown> = stripReadonlyTaskFields(rawPayload);

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
            if (error) {
              if (error.code === '23505') {
                // Unique constraint violation = another device already inserted
                // the next recurrence occurrence. This is expected under the new
                // server-authoritative dedup model. Remove the local loser too,
                // otherwise it remains visible forever because the server never
                // gets a row with this client-generated id.
                console.warn(`[sync] recorrência duplicada bloqueada pelo banco: mutation ${mutation.id} descartada`);
                store.removeMutation(mutation.id);
                useTaskStore.getState().setTasks(
                  useTaskStore.getState().tasks.filter((task) => task.id !== mutation.entityId)
                );
                await fetchRemoteTasks();
                continue;
              }
              throw error;
            }
            // replaceLocalTask traz o updated_at/created_at gerado pelo servidor
            // de volta para o store, corrigindo o clock skew do cliente.
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

            if (!data) {
              // Bug 1: "zero rows" com a cláusula .lte ativa significa que o
              // servidor foi atualizado por outro device após o cliente ler a
              // tarefa (conflito LWW). A versão do servidor já prevaleceu.
              // O comportamento correto é descartar esta mutation silenciosamente
              // (o fetchRemoteTasks já trouxe o estado correto do servidor) e
              // NÃO fazer force-merge, pois isso violaria LWW.
              //
              // Se baseUpdatedAt não estava definido, aí sim é um erro real
              // (ex: tarefa deletada no servidor), e lançamos o erro normalmente.
              if (mutation.baseUpdatedAt) {
                console.warn(
                  `[sync] LWW conflict: mutation ${mutation.id} descartada — ` +
                  `servidor mais novo que baseUpdatedAt=${mutation.baseUpdatedAt}`
                );
                store.removeMutation(mutation.id);
                continue;
              }
              throw new Error(`Task ${mutation.entityId} nao foi atualizada - zero rows`);
            }

            replaceLocalTask(data as Task);
          } else if (mutation.operation === 'delete') {
            const { data, error } = await supabase.from('tasks')
              .update(payloadToSync)
              .eq('id', mutation.entityId)
              .eq('user_id', userId)
              .select('*')
              .maybeSingle();

            if (error) throw error;

            if (!data) {
              // Zero rows num delete significa que a tarefa já não existe no servidor
              // (deletada por outro device ou nunca existiu). O servidor já está no
              // estado correto — descartar a mutation silenciosamente, sem retry.
              console.warn(
                `[sync] delete ignorado: mutation ${mutation.id} — tarefa ${mutation.entityId} já inexistente no servidor`
              );
              store.removeMutation(mutation.id);
              continue;
            }

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
