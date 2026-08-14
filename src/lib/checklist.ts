import type { ChecklistItem } from '../types';

/** Mesmo teto do CHECK da migration 0022. Existe pela quota do localStorage
 * no celular, não por limite conceitual. */
export const CHECKLIST_MAX_ITEMS = 30;

/** Teto de caracteres por item. Item é passo de uma tarefa, não observação —
 * texto longo pertence ao campo Observações. */
export const CHECKLIST_MAX_TEXT = 200;

/** Converte o que veio do servidor (jsonb) ou do localStorage em uma lista
 * confiável. O CHECK da migration 0022 garante array no banco, mas linhas
 * gravadas por versões futuras/antigas do app podem trazer item torto — aqui
 * item inválido é descartado em vez de derrubar a renderização da Agenda. */
export function normalizeChecklist(raw: unknown): ChecklistItem[] {
  if (!Array.isArray(raw)) return [];

  const items: ChecklistItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;

    const candidate = entry as Record<string, unknown>;
    const id = typeof candidate.id === 'string' ? candidate.id : null;
    const text = typeof candidate.text === 'string' ? candidate.text.trim() : '';
    if (!id || !text) continue;

    items.push({
      id,
      text: text.slice(0, CHECKLIST_MAX_TEXT),
      done: candidate.done === true,
      done_at: typeof candidate.done_at === 'string' ? candidate.done_at : null,
    });

    if (items.length >= CHECKLIST_MAX_ITEMS) break;
  }

  return items;
}

/** Acrescenta um item no fim. Texto vazio e lista cheia são no-op: quem chama
 * não precisa validar antes. */
export function addChecklistItem(
  list: ChecklistItem[],
  text: string,
  id: string = crypto.randomUUID(),
): ChecklistItem[] {
  const cleanText = text.trim().slice(0, CHECKLIST_MAX_TEXT);
  if (!cleanText) return list;
  if (list.length >= CHECKLIST_MAX_ITEMS) return list;

  return [...list, { id, text: cleanText, done: false, done_at: null }];
}

export function toggleChecklistItem(
  list: ChecklistItem[],
  id: string,
  nowIso: string = new Date().toISOString(),
): ChecklistItem[] {
  return list.map((item) => (
    item.id === id
      ? { ...item, done: !item.done, done_at: item.done ? null : nowIso }
      : item
  ));
}

export function removeChecklistItem(list: ChecklistItem[], id: string): ChecklistItem[] {
  return list.filter((item) => item.id !== id);
}

export function countChecklist(list: ChecklistItem[]): { done: number; total: number } {
  return {
    done: list.filter((item) => item.done).length,
    total: list.length,
  };
}

/** Lista não vazia com todos os itens marcados. Lista vazia não conta como
 * completa — senão toda tarefa sem checklist ofereceria "concluir". */
export function isChecklistComplete(list: ChecklistItem[]): boolean {
  return list.length > 0 && list.every((item) => item.done);
}

/** Próxima ocorrência de uma tarefa recorrente herda os mesmos passos, todos
 * por fazer: a checklist descreve o rito, não o histórico da ocorrência.
 * IDs novos porque os itens são registros distintos dos da ocorrência anterior. */
export function resetChecklistForRecurrence(
  list: ChecklistItem[],
  nextId: () => string = () => crypto.randomUUID(),
): ChecklistItem[] | null {
  if (list.length === 0) return null;

  return list.map((item) => ({
    id: nextId(),
    text: item.text,
    done: false,
    done_at: null,
  }));
}

/** Forma de persistência: lista vazia vira NULL para não gravar `[]` em toda
 * tarefa que nunca teve checklist. */
export function checklistForPersist(list: ChecklistItem[]): ChecklistItem[] | null {
  return list.length > 0 ? list : null;
}
