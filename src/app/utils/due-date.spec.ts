import {
  compareByDue,
  formatDue,
  isInTodayFilter,
  isOverdue,
  isToday,
  isValidDueDate,
  isValidDueTime,
  normalizeTask,
  toLocalDateKey,
} from './due-date';
import { matchesFilters } from './task-filters';

/** Lokalna chwila (nie UTC!) – tak jak zegar przeglądarki. */
const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min);
const NOW = at(2026, 11, 24, 15, 0); // wtorek 2026-11-24, 15:00

describe('due-date: walidacja (K-07, US-01, EC-02)', () => {
  it.each([
    ['2026-12-01', true],
    ['1900-01-01', true],
    ['2100-12-31', true],
    ['2028-02-29', true],
    ['1899-12-31', false],
    ['2101-01-01', false],
    ['275760-09-13', false],
    ['2026-02-31', false],
    ['2027-02-29', false],
    ['2026-13-01', false],
    ['abc', false],
    ['', false],
    [12345, false],
    [null, false],
    [{}, false],
  ])('isValidDueDate(%j) = %s', (value, expected) => {
    expect(isValidDueDate(value)).toBe(expected);
  });

  it.each([
    ['00:00', true],
    ['23:59', true],
    ['09:30', true],
    ['24:00', false],
    ['25:99', false],
    ['9:30', false],
    ['', false],
  ])('isValidDueTime(%j) = %s', (value, expected) => {
    expect(isValidDueTime(value)).toBe(expected);
  });
});

describe('due-date: dziś i po terminie (US-04, US-06)', () => {
  it.each([
    ['2026-11-24', undefined, true, false],
    ['2026-11-24', '00:01', true, false],
    ['2026-11-24', '08:00', true, false], // godzina minęła, ale to nadal "dziś" (nie zaległe)
    ['2026-11-23', '23:59', false, true],
    ['2026-11-25', undefined, false, false],
  ])('termin %s %s → isToday=%s, isOverdue=%s', (dueDate, dueTime, today, overdue) => {
    const task = { dueDate, dueTime, completed: false };
    expect(isToday(task, NOW)).toBe(today);
    expect(isOverdue(task, NOW)).toBe(overdue);
  });

  it('brak lub uszkodzony termin: isToday i isOverdue = false', () => {
    for (const dueDate of [undefined, 'abc', '2026-02-31']) {
      expect(isToday({ dueDate }, NOW)).toBe(false);
      expect(isOverdue({ dueDate, completed: false }, NOW)).toBe(false);
    }
  });

  it('ukończone zadanie nigdy nie jest po terminie', () => {
    expect(isOverdue({ dueDate: '2026-11-17', completed: true }, NOW)).toBe(false);
  });

  it('przejście północy zmienia status (sztuczny zegar)', () => {
    const task = { dueDate: '2026-11-24', completed: false };
    expect(isOverdue(task, at(2026, 11, 24, 23, 59))).toBe(false);
    expect(isOverdue(task, at(2026, 11, 25, 0, 0))).toBe(true);
  });

  it('toLocalDateKey używa lokalnej daty', () => {
    expect(toLocalDateKey(at(2026, 1, 5, 0, 5))).toBe('2026-01-05');
  });
});

describe('due-date: format terminu (US-07, EC-10)', () => {
  it.each([
    ['2026-11-24', undefined, 'dziś'],
    ['2026-11-24', '14:00', 'dziś 14:00'],
    ['2026-11-25', undefined, 'jutro'],
    ['2026-11-23', undefined, 'wczoraj'],
    ['2026-11-28', undefined, 'sb 28.11'],
    ['2026-11-28', '09:30', 'sb 28.11 09:30'],
    ['2027-01-15', undefined, 'pt 15.01.2027'],
    ['2026-11-22', undefined, 'nd 22.11'],
    ['2026-12-31', undefined, 'cz 31.12'],
    ['2025-12-31', undefined, 'śr 31.12.2025'],
    ['2026-01-05', undefined, 'pn 05.01'],
    ['2027-01-01', undefined, 'pt 01.01.2027'],
    ['1900-01-01', undefined, 'pn 01.01.1900'],
  ])('%s %s → "%s"', (dueDate, dueTime, text) => {
    expect(formatDue({ dueDate, dueTime }, NOW)).toBe(text);
  });

  it('bez terminu – pusty tekst', () => {
    expect(formatDue({}, NOW)).toBe('');
  });

  it('"wczoraj" działa na przełomie roku', () => {
    expect(formatDue({ dueDate: '2026-12-31' }, at(2027, 1, 1, 10))).toBe('wczoraj');
  });

  it('zmiana dnia: "jutro" staje się "dziś"', () => {
    const task = { dueDate: '2026-11-25' };
    expect(formatDue(task, NOW)).toBe('jutro');
    expect(formatDue(task, at(2026, 11, 25, 0, 1))).toBe('dziś');
  });
});

describe('due-date: zmiana czasu i strefy (EC-09)', () => {
  // Node pozwala zmienić strefę w trakcie działania przez process.env.TZ.
  const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } })
    .process.env;
  let originalTz: string | undefined;
  beforeEach(() => (originalTz = env['TZ']));
  afterEach(() => {
    if (originalTz === undefined) delete env['TZ'];
    else env['TZ'] = originalTz;
  });

  it.each([
    [[2026, 3, 29, 0, 30], '2026-03-28', true, 'wczoraj'],
    [[2026, 3, 29, 3, 30], '2026-03-29', false, 'dziś'],
    [[2026, 3, 28, 23, 30], '2026-03-29', false, 'jutro'],
    [[2026, 10, 25, 0, 30], '2026-10-24', true, 'wczoraj'],
    [[2026, 10, 26, 0, 0], '2026-10-25', true, 'wczoraj'],
  ] as const)('Europe/Warsaw, teraz %j, termin %s', ([y, m, d, h, min], dueDate, overdue, text) => {
    env['TZ'] = 'Europe/Warsaw';
    const now = at(y, m, d, h, min);
    expect(isOverdue({ dueDate, completed: false }, now)).toBe(overdue);
    expect(formatDue({ dueDate }, now)).toBe(text);
  });

  it('America/Los_Angeles: data nie jest czytana jako UTC', () => {
    env['TZ'] = 'America/Los_Angeles';
    const now = at(2026, 11, 24, 20, 0); // 20:00 lokalnie = już 25.11 w UTC
    expect(now.getTimezoneOffset()).toBe(480); // strefa naprawdę przełączona (PST)
    expect(now.toISOString().slice(0, 10)).toBe('2026-11-25');
    expect(formatDue({ dueDate: '2026-11-24' }, now)).toBe('dziś');
    expect(isOverdue({ dueDate: '2026-11-24', completed: false }, now)).toBe(false);
  });
});

describe('due-date: filtr "Dziś" (US-08, R-02)', () => {
  const t = (dueDate: string | undefined, completed = false, categoryId = 'praca') => ({
    id: 'x',
    title: 'x',
    categoryId,
    completed,
    createdAt: 0,
    dueDate,
  });

  it('nieukończone: wczoraj i dziś tak, jutro i bez terminu nie', () => {
    expect(isInTodayFilter(t('2026-11-23'), NOW)).toBe(true);
    expect(isInTodayFilter(t('2026-11-24'), NOW)).toBe(true);
    expect(isInTodayFilter(t('2026-11-25'), NOW)).toBe(false);
    expect(isInTodayFilter(t(undefined), NOW)).toBe(false);
  });

  it('ukończone: tylko z terminem dokładnie na dziś (nie z przeszłości)', () => {
    expect(isInTodayFilter(t('2026-11-24', true), NOW)).toBe(true);
    expect(isInTodayFilter(t('2026-11-23', true), NOW)).toBe(false);
    expect(isInTodayFilter(t('2025-01-01', true), NOW)).toBe(false);
  });

  it('łączy się z filtrem kategorii', () => {
    const filters = { categoryId: 'praca', todayOnly: true };
    expect(matchesFilters(t('2026-11-24', false, 'praca'), filters, NOW)).toBe(true);
    expect(matchesFilters(t('2026-11-24', false, 'dom'), filters, NOW)).toBe(false);
    expect(matchesFilters(t('2026-11-25', false, 'praca'), filters, NOW)).toBe(false);
    // Wyłączony filtr "Dziś" = sam filtr kategorii.
    const off = { categoryId: 'praca', todayOnly: false };
    expect(matchesFilters(t('2026-11-25', false, 'praca'), off, NOW)).toBe(true);
  });
});

describe('due-date: komparator (US-10, EC-06)', () => {
  const sortTitles = (items: { t: string; dueDate?: string; dueTime?: string }[]) =>
    [...items].sort(compareByDue).map((i) => i.t);

  it('C, D, B, A, E', () => {
    expect(
      sortTitles([
        { t: 'A' },
        { t: 'B', dueDate: '2026-12-05' },
        { t: 'C', dueDate: '2026-12-01', dueTime: '14:00' },
        { t: 'D', dueDate: '2026-12-01' },
        { t: 'E' },
      ]),
    ).toEqual(['C', 'D', 'B', 'A', 'E']);
  });

  it('00:00 to godzina, a nie brak godziny', () => {
    expect(
      sortTitles([
        { t: 'P', dueDate: '2026-12-01' },
        { t: 'Q', dueDate: '2026-12-01', dueTime: '00:00' },
        { t: 'R', dueDate: '2026-12-01', dueTime: '23:59' },
      ]),
    ).toEqual(['Q', 'R', 'P']);
  });

  it('zaległe przed dzisiejszymi, remisy stabilnie', () => {
    expect(
      sortTitles([
        { t: 'X', dueDate: '2026-11-24' },
        { t: 'Y', dueDate: '2026-11-22' },
        { t: 'Z' },
      ]),
    ).toEqual(['Y', 'X', 'Z']);
    expect(
      sortTitles([
        { t: 'X', dueDate: '2026-12-01' },
        { t: 'Y', dueDate: '2026-12-01' },
        { t: 'Z', dueDate: '2026-12-01' },
      ]),
    ).toEqual(['X', 'Y', 'Z']);
  });
});

describe('due-date: normalizeTask (US-03, EC-08)', () => {
  const base = { id: 'a', title: 'Raport', categoryId: 'praca', completed: false, createdAt: 1 };

  it.each(['abc', 12345, {}, '', '2026-02-31', null])('dueDate %j jest pomijane', (dueDate) => {
    const task = normalizeTask({ ...base, dueDate })!;
    expect(task).not.toBeNull();
    expect('dueDate' in task).toBe(false);
  });

  it('zła godzina przy dobrej dacie → sama data', () => {
    expect(normalizeTask({ ...base, dueDate: '2026-12-01', dueTime: '25:99' })).toEqual({
      ...base,
      dueDate: '2026-12-01',
    });
  });

  it('godzina bez daty jest ignorowana', () => {
    expect(normalizeTask({ ...base, dueTime: '10:00' })).toEqual(base);
  });

  it('odrzuca elementy niebędące zadaniami', () => {
    for (const raw of [
      null,
      5,
      'x',
      [],
      {},
      { id: 'a' },
      { title: 'x' },
      { ...base, title: 12345 },
    ]) {
      expect(normalizeTask(raw)).toBeNull();
    }
  });

  it('pola podstawowe o złym typie dostają wartości domyślne', () => {
    expect(normalizeTask({ ...base, completed: 'false', createdAt: 'wczoraj' })).toEqual({
      ...base,
      completed: false,
      createdAt: 0,
    });
  });
});

describe('due-date: normalizeTask – flaga i trudność (US-01)', () => {
  const base = { id: 'a', title: 'Raport', categoryId: 'praca', completed: false, createdAt: 1 };

  it('stare zadanie bez nowych pól: bez flagi i nieoznaczone', () => {
    const task = normalizeTask(base)!;
    expect('needsReview' in task).toBe(false);
    expect('difficulty' in task).toBe(false);
  });

  it('poprawne wartości są zachowane', () => {
    expect(normalizeTask({ ...base, needsReview: true, difficulty: 'heavy' })).toEqual({
      ...base,
      needsReview: true,
      difficulty: 'heavy',
    });
    expect(normalizeTask({ ...base, difficulty: 'light' })!.difficulty).toBe('light');
  });

  it.each(['średnie', 'HEAVY', 1, null, {}])(
    'nieprawidłowa trudność %j jest pomijana',
    (difficulty) => {
      expect('difficulty' in normalizeTask({ ...base, difficulty })!).toBe(false);
    },
  );

  it.each(['tak', 1, 'true', false, null])('needsReview %j nie daje flagi', (needsReview) => {
    expect('needsReview' in normalizeTask({ ...base, needsReview })!).toBe(false);
  });
});
