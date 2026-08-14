import {
  addChecklistItem,
  checklistForPersist,
  countChecklist,
  isChecklistComplete,
  normalizeChecklist,
  removeChecklistItem,
  resetChecklistForRecurrence,
  toggleChecklistItem,
  CHECKLIST_MAX_ITEMS,
  CHECKLIST_MAX_TEXT,
} from '../src/lib/checklist.js';
import type { ChecklistItem } from '../src/types/index.js';

const NOW = '2026-08-14T12:00:00.000Z';

function item(id: string, overrides: Partial<ChecklistItem> = {}): ChecklistItem {
  return { id, text: `item ${id}`, done: false, done_at: null, ...overrides };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function equal<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`${message}. Esperado: ${String(expected)}; obtido: ${String(actual)}`);
}

function run(name: string, fixture: () => void): void {
  fixture();
  console.log(`ok - ${name}`);
}

run('normalizeChecklist descarta lixo em vez de quebrar a tela', () => {
  equal(normalizeChecklist(null).length, 0, 'null deveria virar lista vazia');
  equal(normalizeChecklist({ a: 1 }).length, 0, 'objeto deveria virar lista vazia');

  const parsed = normalizeChecklist([
    { id: 'a', text: 'Levar ofício', done: true, done_at: NOW },
    { id: 'b', text: '   ' },
    { text: 'sem id' },
    { id: 'c', text: 'Assinar', done: 'sim' },
    'string solta',
  ]);

  equal(parsed.length, 2, 'só itens com id e texto deveriam sobreviver');
  equal(parsed[0].done, true, 'done booleano deveria ser preservado');
  equal(parsed[1].done, false, 'done não-booleano deveria virar false');
  equal(parsed[1].done_at, null, 'done_at inválido deveria virar null');
});

run('normalizeChecklist respeita o teto de itens do banco', () => {
  const raw = Array.from({ length: CHECKLIST_MAX_ITEMS + 5 }, (_, i) => item(String(i)));
  equal(normalizeChecklist(raw).length, CHECKLIST_MAX_ITEMS, 'deveria cortar no teto da migration 0022');
});

run('addChecklistItem ignora texto vazio e lista cheia', () => {
  const base: ChecklistItem[] = [];
  equal(addChecklistItem(base, '   ').length, 0, 'texto em branco não deveria criar item');

  const withOne = addChecklistItem(base, '  Levar ofício  ', 'id-1');
  equal(withOne.length, 1, 'deveria acrescentar o item');
  equal(withOne[0].text, 'Levar ofício', 'texto deveria ser aparado');
  equal(withOne[0].done, false, 'item novo nasce por fazer');
  equal(base.length, 0, 'a lista original não deveria ser mutada');

  const full = Array.from({ length: CHECKLIST_MAX_ITEMS }, (_, i) => item(String(i)));
  equal(addChecklistItem(full, 'excedente').length, CHECKLIST_MAX_ITEMS, 'não deveria passar do teto');

  const long = addChecklistItem([], 'x'.repeat(CHECKLIST_MAX_TEXT + 50), 'id-long');
  equal(long[0].text.length, CHECKLIST_MAX_TEXT, 'texto deveria ser cortado no teto');
});

run('toggleChecklistItem carimba e apaga done_at', () => {
  const list = [item('a'), item('b')];

  const marked = toggleChecklistItem(list, 'a', NOW);
  equal(marked[0].done, true, 'deveria marcar');
  equal(marked[0].done_at, NOW, 'deveria carimbar a hora');
  equal(marked[1].done, false, 'não deveria tocar no outro item');

  const unmarked = toggleChecklistItem(marked, 'a', NOW);
  equal(unmarked[0].done, false, 'deveria desmarcar');
  equal(unmarked[0].done_at, null, 'desmarcar deveria limpar o carimbo');
});

run('removeChecklistItem e countChecklist', () => {
  const list = [item('a', { done: true }), item('b'), item('c', { done: true })];

  const counted = countChecklist(list);
  equal(counted.done, 2, 'deveria contar os feitos');
  equal(counted.total, 3, 'deveria contar o total');

  const shorter = removeChecklistItem(list, 'b');
  equal(shorter.length, 2, 'deveria remover o item');
  assert(!shorter.some((entry) => entry.id === 'b'), 'o item removido não deveria sobrar');
});

run('isChecklistComplete exige lista não vazia', () => {
  equal(isChecklistComplete([]), false, 'lista vazia não é checklist completa');
  equal(isChecklistComplete([item('a', { done: true }), item('b')]), false, 'faltando item não é completa');
  equal(isChecklistComplete([item('a', { done: true })]), true, 'todos marcados é completa');
});

run('resetChecklistForRecurrence copia os passos desmarcados com ids novos', () => {
  equal(resetChecklistForRecurrence([]), null, 'sem checklist a próxima ocorrência nasce sem nada');

  let seq = 0;
  const next = resetChecklistForRecurrence(
    [item('a', { done: true, done_at: NOW }), item('b')],
    () => `novo-${++seq}`,
  );

  assert(next, 'deveria devolver a lista da próxima ocorrência');
  equal(next.length, 2, 'deveria manter a quantidade de passos');
  equal(next[0].text, 'item a', 'deveria preservar o texto');
  equal(next[0].done, false, 'a próxima ocorrência começa toda por fazer');
  equal(next[0].done_at, null, 'não deveria herdar carimbo da ocorrência anterior');
  equal(next[0].id, 'novo-1', 'itens da nova ocorrência são registros novos');
});

run('checklistForPersist grava NULL quando não há item', () => {
  equal(checklistForPersist([]), null, 'lista vazia deveria virar NULL na coluna');
  equal(checklistForPersist([item('a')])?.length, 1, 'lista com item deveria ser preservada');
});

console.log('[checklist] 8 fixtures passaram');
