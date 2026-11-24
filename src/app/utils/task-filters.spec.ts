import { Task } from '../models/task.model';
import { emptyListMessage, matchesEnergy, matchesFilters, TaskFilters } from './task-filters';

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

const base: TaskFilters = { categoryId: null, todayOnly: false };
const visible = (tasks: Task[], filters: TaskFilters, now = NOW) =>
  tasks.filter((x) => matchesFilters(x, filters, now)).map((x) => x.id);

describe('task-filters: "Do przejrzenia" (US-03, B-4)', () => {
  it('pokazuje tylko nieukończone zadania z flagą', () => {
    const tasks = [
      t('flag', { needsReview: true }),
      t('plain'),
      t('done-flag', { needsReview: true, completed: true }),
    ];
    expect(visible(tasks, { ...base, reviewOnly: true })).toEqual(['flag']);
  });

  it('łączy się z kategorią przez AND', () => {
    const tasks = [
      t('i1', { needsReview: true, categoryId: 'inne' }),
      t('i2', { needsReview: true, categoryId: 'inne' }),
      t('d1', { needsReview: true, categoryId: 'dom' }),
      t('d2', { categoryId: 'dom' }),
    ];
    expect(visible(tasks, { ...base, reviewOnly: true, categoryId: 'dom' })).toEqual(['d1']);
  });

  it('wyłączony filtr nie zawęża listy', () => {
    const tasks = [t('a', { needsReview: true }), t('b')];
    expect(visible(tasks, { ...base, reviewOnly: false })).toEqual(['a', 'b']);
  });
});

describe('task-filters: tryb energii (US-07, US-08, US-09)', () => {
  const abc = [t('A', { difficulty: 'heavy' }), t('B', { difficulty: 'light' }), t('C')];

  it('"Jestem wypruty" ukrywa ciężkie, nieoznaczone zostają', () => {
    expect(visible(abc, { ...base, energy: 'tired' })).toEqual(['B', 'C']);
  });

  it('"Mam siłę" ukrywa lekkie, nieoznaczone zostają', () => {
    expect(visible(abc, { ...base, energy: 'rested' })).toEqual(['A', 'C']);
  });

  it('"Bez trybu" (domyślnie) i brak pola energy pokazują wszystko', () => {
    expect(visible(abc, { ...base, energy: 'off' })).toEqual(['A', 'B', 'C']);
    expect(visible(abc, base)).toEqual(['A', 'B', 'C']);
  });

  it('zaległe ciężkie zadanie jest widoczne w trybie "Jestem wypruty"', () => {
    const task = t('x', { difficulty: 'heavy', dueDate: '2026-11-23' });
    expect(matchesEnergy(task, 'tired', NOW)).toBe(true);
  });

  it('dzisiejsze lekkie zadanie jest widoczne w trybie "Mam siłę"', () => {
    const task = t('x', { difficulty: 'light', dueDate: '2026-11-24' });
    expect(matchesEnergy(task, 'rested', NOW)).toBe(true);
  });

  it('negatywny: przyszły termin nie chroni przed ukryciem', () => {
    const task = t('x', { difficulty: 'heavy', dueDate: '2026-11-25' });
    expect(matchesEnergy(task, 'tired', NOW)).toBe(false);
  });

  it('ukończone ciężkie z terminem w przeszłości nie jest chronione (definicja jak "Dziś")', () => {
    const task = t('x', { difficulty: 'heavy', dueDate: '2026-11-23', completed: true });
    expect(matchesEnergy(task, 'tired', NOW)).toBe(false);
  });

  it('po północy zadanie z terminem "jutro" staje się dzisiejsze i wraca na listę', () => {
    const task = t('x', { difficulty: 'heavy', dueDate: '2026-11-25' });
    expect(matchesFilters(task, { ...base, energy: 'tired' }, NOW)).toBe(false);
    const afterMidnight = new Date(2026, 10, 25, 0, 1);
    expect(matchesFilters(task, { ...base, energy: 'tired' }, afterMidnight)).toBe(true);
  });

  it('tryb + kategoria: tylko "Dom" bez ciężkich (poza zaległymi)', () => {
    const tasks = [
      t('dom-heavy', { categoryId: 'dom', difficulty: 'heavy' }),
      t('dom-light', { categoryId: 'dom', difficulty: 'light' }),
      t('dom-plain', { categoryId: 'dom' }),
      t('dom-heavy-overdue', { categoryId: 'dom', difficulty: 'heavy', dueDate: '2026-11-20' }),
      t('praca-light', { difficulty: 'light' }),
    ];
    expect(visible(tasks, { ...base, categoryId: 'dom', energy: 'tired' })).toEqual([
      'dom-light',
      'dom-plain',
      'dom-heavy-overdue',
    ]);
  });

  it('tryb łączy się z "Dziś" i "Do przejrzenia"', () => {
    const tasks = [
      t('a', { needsReview: true, difficulty: 'heavy' }),
      t('b', { needsReview: true, difficulty: 'light' }),
      t('c', { difficulty: 'light' }),
    ];
    expect(visible(tasks, { ...base, reviewOnly: true, energy: 'tired' })).toEqual(['b']);
    expect(visible(tasks, { ...base, todayOnly: true, energy: 'tired' })).toEqual([]);
  });

  it('toast "poza filtrem": ciężkie zadanie bez terminu nie pasuje do trybu "Jestem wypruty"', () => {
    // Ta sama funkcja decyduje w app.ts (onAdded) o pokazaniu toasta.
    expect(matchesFilters(t('n', { difficulty: 'heavy' }), { ...base, energy: 'tired' }, NOW)).toBe(
      false,
    );
  });

  it('toast "poza filtrem": wrzut do "Inne" przy filtrze "Praca"', () => {
    const quick = t('q', { categoryId: 'inne', needsReview: true });
    expect(matchesFilters(quick, { ...base, categoryId: 'praca' }, NOW)).toBe(false);
  });
});

describe('task-filters: komunikat pustej listy (B-2, EC-02)', () => {
  it('bez filtrów: "Wszystko zrobione" albo "Dodaj pierwsze"', () => {
    expect(emptyListMessage(base, null, true).title).toBe('Wszystko zrobione 🎉');
    expect(emptyListMessage(base, null, false)).toEqual({
      title: 'Brak zadań',
      hint: 'Dodaj pierwsze zadanie powyżej.',
    });
  });

  it('tryb ukrywa wszystkie aktywne, a są ukończone: NIE "Wszystko zrobione"', () => {
    const msg = emptyListMessage({ ...base, energy: 'tired' }, null, true);
    expect(msg.title).toBe('Brak zadań pasujących do filtrów');
    expect(msg.hint).toContain('Jestem wypruty');
  });

  it('sama kategoria bez wyników: NIE "Dodaj pierwsze zadanie"', () => {
    const msg = emptyListMessage({ ...base, categoryId: 'dom' }, 'Dom', false);
    expect(msg.title).toBe('Brak zadań pasujących do filtrów');
    expect(msg.hint).not.toContain('Dodaj');
    expect(msg.hint).toContain('Dom');
  });

  it('tylko "Dziś" (także z kategorią): dotychczasowy komunikat', () => {
    expect(emptyListMessage({ ...base, todayOnly: true }, null, true).title).toBe(
      'Brak zadań na dziś ani zaległych',
    );
    expect(
      emptyListMessage({ ...base, todayOnly: true, categoryId: 'dom' }, 'Dom', false).title,
    ).toBe('Brak zadań na dziś ani zaległych w kategorii „Dom”');
  });

  it('tylko "Do przejrzenia": "Brak zadań do przejrzenia"', () => {
    expect(emptyListMessage({ ...base, reviewOnly: true }, null, true).title).toBe(
      'Brak zadań do przejrzenia',
    );
  });

  it('"Dziś" + "Do przejrzenia": jeden komunikat wymieniający oba filtry', () => {
    const msg = emptyListMessage({ ...base, todayOnly: true, reviewOnly: true }, null, false);
    expect(msg.title).toBe('Brak zadań pasujących do filtrów');
    expect(msg.hint).toBe('Aktywne filtry: Dziś, Do przejrzenia');
  });
});
