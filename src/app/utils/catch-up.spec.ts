import { Task } from '../models/task.model';
import { pickCatchUp } from './catch-up';

/** Lokalna chwila – wtorek 2026-11-24, 15:00. */
const NOW = new Date(2026, 10, 24, 15, 0);

const t = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  title: id,
  categoryId: 'praca',
  completed: false,
  createdAt: 0,
  ...extra,
});
const ids = (tasks: Task[]) => tasks.map((x) => x.id);

describe('catch-up: wybór zadań do panelu (US-11)', () => {
  it('3 pierwsze wg ręcznej kolejności, bez sortowania po terminie', () => {
    const tasks = [
      t('A', { dueDate: '2026-11-14' }), // zaległe 10 dni
      t('B', { dueDate: '2026-11-24' }), // dziś
      t('C', { dueDate: '2026-11-23' }), // zaległe wczoraj
      t('D', { dueDate: '2026-11-01' }), // zaległe
      t('E', { dueDate: '2026-11-25' }), // jutro
    ];
    const pick = pickCatchUp(tasks, null, NOW);
    expect(ids(pick.top)).toEqual(['A', 'B', 'C']);
    expect(ids(pick.rest)).toEqual(['D']);
  });

  it('po zaznaczeniu "zrobione" przy A na jego miejsce wchodzi D', () => {
    const tasks = [
      t('A', { dueDate: '2026-11-14', completed: true }),
      t('B', { dueDate: '2026-11-24' }),
      t('C', { dueDate: '2026-11-23' }),
      t('D', { dueDate: '2026-11-01' }),
    ];
    const pick = pickCatchUp(tasks, null, NOW);
    expect(ids(pick.top)).toEqual(['B', 'C', 'D']);
    expect(pick.rest).toEqual([]);
  });

  it('respektuje kategorię, ignoruje tryb energii (ciężkie zaległe jest w panelu)', () => {
    const tasks = [
      t('F', { categoryId: 'dom', difficulty: 'heavy', dueDate: '2026-11-20' }),
      t('G', { categoryId: 'praca', dueDate: '2026-11-20' }),
    ];
    const pick = pickCatchUp(tasks, 'dom', NOW);
    expect(ids(pick.top)).toEqual(['F']);
    expect(pick.elsewhere).toBe(1); // G jest w innej kategorii (EC-11)
  });

  it('ignoruje flagę "do przejrzenia"', () => {
    const tasks = [t('R', { needsReview: true, dueDate: '2026-11-24' })];
    expect(ids(pickCatchUp(tasks, null, NOW).top)).toEqual(['R']);
  });

  it('negatywny: bez terminu, jutro i ukończone zaległe nie wchodzą', () => {
    const tasks = [
      t('none'),
      t('tomorrow', { dueDate: '2026-11-25' }),
      t('done', { dueDate: '2026-11-20', completed: true }),
    ];
    const pick = pickCatchUp(tasks, null, NOW);
    expect(pick.top).toEqual([]);
    expect(pick.rest).toEqual([]);
    expect(pick.elsewhere).toBe(0);
  });

  it('mniej niż 3: tyle, ile jest, bez "+X więcej"', () => {
    const pick = pickCatchUp([t('only', { dueDate: '2026-11-24' })], null, NOW);
    expect(ids(pick.top)).toEqual(['only']);
    expect(pick.rest.length).toBe(0);
  });

  it('kategoria bez zaległych, a inne kategorie mają 2 (EC-11)', () => {
    const tasks = [
      t('p1', { dueDate: '2026-11-20' }),
      t('p2', { dueDate: '2026-11-24' }),
      t('d1', { categoryId: 'dom' }),
    ];
    const pick = pickCatchUp(tasks, 'dom', NOW);
    expect(pick.top).toEqual([]);
    expect(pick.elsewhere).toBe(2);
  });

  it('po północy zadanie z terminem "jutro" wchodzi do panelu (EC-12)', () => {
    const tasks = [t('x', { dueDate: '2026-11-25' })];
    expect(pickCatchUp(tasks, null, NOW).top).toEqual([]);
    expect(ids(pickCatchUp(tasks, null, new Date(2026, 10, 25, 0, 1)).top)).toEqual(['x']);
  });

  it('dzień zmiany czasu: wczoraj zaległe, dziś nie (EC-12)', () => {
    const dst = new Date(2026, 9, 25, 12, 0); // 25.10.2026 – w Europie 25-godzinny dzień
    const tasks = [t('y', { dueDate: '2026-10-24' }), t('d', { dueDate: '2026-10-25' })];
    expect(ids(pickCatchUp(tasks, null, dst).top)).toEqual(['y', 'd']);
  });

  it('czysta funkcja: nie zmienia przekazanej listy (US-10 "Dane bez zmian")', () => {
    const tasks = Object.freeze([
      Object.freeze(t('A', { dueDate: '2026-11-20' })),
      Object.freeze(t('B')),
    ]) as readonly Task[];
    const before = JSON.stringify(tasks);
    pickCatchUp(tasks, null, NOW);
    expect(JSON.stringify(tasks)).toBe(before);
  });
});

describe('catch-up: "+X więcej" (US-12)', () => {
  const overdue = (n: number) =>
    Array.from({ length: n }, (_, i) => t(`t${i}`, { dueDate: '2026-11-20' }));

  it('7 zadań: 3 + 4 w tej samej kolejności', () => {
    const tasks = overdue(7);
    const pick = pickCatchUp(tasks, null, NOW);
    expect(pick.top.length).toBe(3);
    expect(ids(pick.rest)).toEqual(['t3', 't4', 't5', 't6']);
  });

  it('negatywny: dokładnie 3 – brak "+X więcej"', () => {
    expect(pickCatchUp(overdue(3), null, NOW).rest.length).toBe(0);
  });

  it('303 zadania: "+300 więcej" i nic nie ginie (EC-14)', () => {
    const pick = pickCatchUp(overdue(303), null, NOW);
    expect(pick.rest.length).toBe(300);
    expect(pick.top.length + pick.rest.length).toBe(303);
  });
});
